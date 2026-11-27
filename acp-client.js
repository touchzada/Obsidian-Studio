'use strict';

const { spawn } = require('child_process');
const EventEmitter = require('events');

/**
 * Zero-dependency JSON-RPC 2.0 Client for Google Antigravity ACP Server (`agy acp`).
 * Manages persistent warm ACP subprocesses, session lifecycles, live model/mode updates,
 * instant turn cancellation (`session/cancel`), native image prompts, and interactive
 * permission prompts (`session/request_permission`).
 */
class AcpClient extends EventEmitter {
  constructor({ agyBin, agentName, agentFormat, cwd, env, authType }) {
    super();
    this.agyBin = agyBin;
    this.agentName = agentName || 'neon-agent';
    this.agentFormat = agentFormat || 'dir';
    this.cwd = cwd;
    this.env = env || { ...process.env };
    this.authType = authType || 'oauth';

    this.proc = null;
    this.stdoutBuffer = '';
    this.stderrBuffer = '';
    this.seq = 1;
    this.pending = new Map();
    this.readyPromise = null;
    this.initResult = null;
    this.tier = null;
    this.availableCommands = [];
    this.closed = false;

    // Map<acpSessionId, { onUpdate, onPermissionRequest }>
    this.sessionHandlers = new Map();
  }

  get alive() {
    return Boolean(this.proc && !this.proc.killed && this.proc.exitCode === null);
  }

  async ensureReady() {
    if (this.readyPromise && this.alive) return this.readyPromise;
    this.closed = false;
    this.readyPromise = this._boot();
    try {
      return await this.readyPromise;
    } catch (err) {
      this.readyPromise = null;
      throw err;
    }
  }

  async _boot() {
    const args = ['acp'];
    if (this.agentFormat === 'dir' && this.agentName) {
      args.push('--agent', this.agentName);
    }

    const proc = spawn(this.agyBin, args, {
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: this.env,
    });

    this.proc = proc;
    this.stdoutBuffer = '';
    this.stderrBuffer = '';

    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');

    proc.stdout.on('data', (chunk) => {
      this.stdoutBuffer += chunk;
      let idx;
      while ((idx = this.stdoutBuffer.indexOf('\n')) !== -1) {
        const line = this.stdoutBuffer.slice(0, idx).trim();
        this.stdoutBuffer = this.stdoutBuffer.slice(idx + 1);
        if (!line) continue;
        this._handleLine(line);
      }
    });

    proc.stderr.on('data', (chunk) => {
      this.stderrBuffer += chunk;
      if (this.stderrBuffer.length > 8000) {
        this.stderrBuffer = this.stderrBuffer.slice(-8000);
      }
    });

    proc.on('error', (err) => {
      this._rejectAllPending(new Error(`Falha no processo agy acp: ${err.message}`));
      this.emit('exit', { code: -1, error: err.message });
    });

    proc.on('exit', (code, signal) => {
      const detail = this.stderrBuffer.trim();
      const msg = detail || `Processo agy acp encerrado (code=${code}, signal=${signal || 'none'}).`;
      this._rejectAllPending(new Error(msg));
      this.proc = null;
      this.readyPromise = null;
      this.emit('exit', { code, signal, message: msg });
    });

    this.initResult = await this.request('initialize', {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: { name: 'obsidian-studio', version: '2.0.0' },
    }, 25000);

    // Explicit ACP auth for non-default auth profiles
    if (this.authType === 'apikey') {
      try {
        await this.request('authenticate', { methodId: 'gemini-api-key' }, 15000);
      } catch {
        // Some ACP versions auto-detect GEMINI_API_KEY via env/settings
      }
    } else if (this.authType === 'adc') {
      try {
        await this.request('authenticate', { methodId: 'agent-platform' }, 15000);
      } catch {
        // Auto-detected via AGY_ADC_AUTH=true
      }
    }

    return this.initResult;
  }

  _rejectAllPending(err) {
    for (const [id, entry] of this.pending.entries()) {
      clearTimeout(entry.timer);
      entry.reject(err);
      this.pending.delete(id);
    }
  }

  _writeJson(obj) {
    if (!this.alive || !this.proc?.stdin || this.proc.stdin.destroyed) {
      throw new Error('Conexão ACP não está ativa.');
    }
    this.proc.stdin.write(`${JSON.stringify(obj)}\n`);
  }

  request(method, params = {}, timeoutMs = 0) {
    const id = this.seq++;
    return new Promise((resolve, reject) => {
      let timer = null;
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`Timeout ACP em ${method} (${Math.round(timeoutMs / 1000)}s)`));
        }, timeoutMs);
      }
      this.pending.set(id, { resolve, reject, timer, method });
      try {
        this._writeJson({ jsonrpc: '2.0', id, method, params });
      } catch (err) {
        if (timer) clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  notify(method, params = {}) {
    if (!this.alive) return;
    try {
      this._writeJson({ jsonrpc: '2.0', method, params });
    } catch {
      // ignore closed pipe
    }
  }

  replyResult(id, result) {
    this._writeJson({ jsonrpc: '2.0', id, result });
  }

  replyError(id, code, message) {
    this._writeJson({ jsonrpc: '2.0', id, error: { code, message } });
  }

  _handleLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    // 1. Response to one of our outgoing JSON-RPC requests
    if (msg.id !== undefined && !msg.method && this.pending.has(msg.id)) {
      const entry = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (entry.timer) clearTimeout(entry.timer);
      if (msg.error) {
        const errMsg = msg.error.data?.message || msg.error.message || JSON.stringify(msg.error);
        const err = new Error(errMsg);
        err.code = msg.error.code;
        entry.reject(err);
      } else {
        entry.resolve(msg.result);
      }
      return;
    }

    // 2. Incoming Server -> Client JSON-RPC Request (e.g. session/request_permission)
    if (msg.id !== undefined && msg.method) {
      this._handleServerRequest(msg);
      return;
    }

    // 3. Incoming Notification (e.g. session/update)
    if (msg.method === 'session/update' && msg.params) {
      const { sessionId, update } = msg.params;
      if (update?.sessionUpdate === 'available_commands_update' && Array.isArray(update.availableCommands)) {
        this.availableCommands = update.availableCommands;
      }
      const handler = this.sessionHandlers.get(sessionId);
      if (handler?.onUpdate) {
        try {
          handler.onUpdate(update);
        } catch {
          // ignore listener errors
        }
      }
    }
  }

  _handleServerRequest(msg) {
    if (msg.method === 'session/request_permission') {
      const params = msg.params || {};
      const handler = this.sessionHandlers.get(params.sessionId);
      if (handler?.onPermissionRequest) {
        handler.onPermissionRequest(msg.id, params);
        return;
      }
      // Fallback if no handler attached: approve first allow option
      const options = Array.isArray(params.options) ? params.options : [];
      const allow =
        options.find((o) => o.kind === 'allow_once') ||
        options.find((o) => o.kind === 'allow_always') ||
        options[0];
      if (allow) {
        this.replyResult(msg.id, { outcome: { outcome: 'selected', optionId: allow.optionId } });
      } else {
        this.replyResult(msg.id, { outcome: { outcome: 'cancelled' } });
      }
      return;
    }

    // Unsupported client capability method
    this.replyError(msg.id, -32601, `Method not implemented: ${msg.method}`);
  }

  registerSession(acpSessionId, handlers) {
    this.sessionHandlers.set(acpSessionId, handlers);
  }

  unregisterSession(acpSessionId) {
    this.sessionHandlers.delete(acpSessionId);
  }

  async newSession({ cwd, systemPromptAppend = '' }) {
    await this.ensureReady();
    const params = { cwd: cwd || this.cwd, mcpServers: [] };
    if (systemPromptAppend && systemPromptAppend.trim()) {
      params._meta = {
        antigravity: {
          systemPrompt: { append: systemPromptAppend.trim() },
        },
      };
    }
    const res = await this.request('session/new', params, 30000);
    if (res?._meta?.antigravity?.tier) {
      this.tier = res._meta.antigravity.tier;
    }
    return res;
  }

  async loadSession({ sessionId, cwd }) {
    await this.ensureReady();
    try {
      return await this.request('session/resume', { sessionId, cwd: cwd || this.cwd, mcpServers: [] }, 25000);
    } catch {
      return await this.request('session/load', { sessionId, cwd: cwd || this.cwd, mcpServers: [] }, 25000);
    }
  }

  async setModel(acpSessionId, modelId) {
    await this.ensureReady();
    return this.request('session/set_model', { sessionId: acpSessionId, modelId }, 15000);
  }

  async setConfigOption(acpSessionId, configId, value) {
    await this.ensureReady();
    return this.request('session/set_config_option', { sessionId: acpSessionId, configId, value }, 15000);
  }

  async setMode(acpSessionId, modeId) {
    return this.setConfigOption(acpSessionId, 'mode', modeId);
  }

  async prompt(acpSessionId, promptBlocks) {
    await this.ensureReady();
    return this.request('session/prompt', { sessionId: acpSessionId, prompt: promptBlocks }, 0);
  }

  cancel(acpSessionId) {
    this.notify('session/cancel', { sessionId: acpSessionId });
  }

  async closeSession(acpSessionId) {
    this.unregisterSession(acpSessionId);
    if (!this.alive) return;
    try {
      await this.request('session/close', { sessionId: acpSessionId }, 5000);
    } catch {
      // ignore close errors
    }
  }

  async listSessions(cwd) {
    await this.ensureReady();
    return this.request('session/list', cwd ? { cwd } : {}, 15000);
  }

  destroy() {
    this.closed = true;
    this.sessionHandlers.clear();
    this._rejectAllPending(new Error('Cliente ACP encerrado.'));
    if (this.proc) {
      try {
        if (this.proc.stdin && !this.proc.stdin.destroyed) this.proc.stdin.end();
      } catch {}
      try {
        if (!this.proc.killed) this.proc.kill();
      } catch {}
      this.proc = null;
    }
    this.readyPromise = null;
  }
}

module.exports = { AcpClient };
