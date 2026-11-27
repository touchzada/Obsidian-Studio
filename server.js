'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4321;
const AGENTS_DIR = path.join(os.homedir(), '.gemini', 'config', 'agents');
const PRISM_PLUGIN_DIR = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'obsidian-prism');
const PRISM_VENDOR_WHITELIST = new Map([
  ['motion-engine.js', path.join(PRISM_PLUGIN_DIR, 'motion-engine.js')],
  ['ripple-core.js', path.join(PRISM_PLUGIN_DIR, 'ripple-core.js')],
  ['home-ripple-host.js', path.join(PRISM_PLUGIN_DIR, 'home-ripple-host.js')],
  ['conv-aura.js', path.join(PRISM_PLUGIN_DIR, 'conv-aura.js')],
  ['smooth-caret.js', path.join(PRISM_PLUGIN_DIR, 'smooth-caret.js')],
  ['prism-rim-canvas.js', path.join(PRISM_PLUGIN_DIR, 'prism-rim-canvas.js')],
  ['dual-mascot-rig.js', path.join(PRISM_PLUGIN_DIR, 'dual-mascot-rig.js')],
  ['vial-core.js', path.join(PRISM_PLUGIN_DIR, 'vial-core.js')],
  ['crystal-prism-core.js', path.join(PRISM_PLUGIN_DIR, 'crystal-prism-core.js')],
  ['brand-mark-svg.js', path.join(PRISM_PLUGIN_DIR, 'assets', 'brand-mark-svg.js')],
  ['effort-slider.js', path.join(PRISM_PLUGIN_DIR, 'vendor', 'effort-slider', 'upstream-client.js')],
]);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const HISTORY_FILE = path.join(DATA_DIR, 'prompt-history.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const TELEMETRY_FILE = path.join(DATA_DIR, 'telemetry.json');
const DEFAULT_MODEL = 'gemini-4-neon-xhigh';
const DEFAULT_CWD = path.join(os.homedir(), '.gemini', 'antigravity', 'scratch');
const LOCAL_AGY_EXE = path.join(os.homedir(), 'AppData', 'Local', 'agy', 'bin', 'agy.exe');
const AGY_BIN = fs.existsSync(LOCAL_AGY_EXE) ? LOCAL_AGY_EXE : 'agy';

const TOOL_GROUPS = {
  files: {
    label: 'Arquivos & Busca',
    description: 'Ler, criar, editar e buscar arquivos no workspace',
    tools: [
      'view_file',
      'write_to_file',
      'replace_file_content',
      'multi_replace_file_content',
      'list_dir',
      'find_by_name',
      'grep_search',
    ],
  },
  terminal: {
    label: 'Terminal',
    description: 'Executar comandos shell e acompanhar processos',
    tools: ['run_command', 'command_status', 'send_command_input', 'manage_task'],
  },
  web: {
    label: 'Web',
    description: 'Pesquisar na web e ler conteúdo de páginas',
    tools: ['search_web', 'read_url_content'],
  },
  subagents: {
    label: 'Subagentes',
    description: 'Criar e coordenar subagentes paralelos',
    tools: ['invoke_subagent', 'define_subagent', 'manage_subagents', 'send_message'],
  },
};

const ALL_KNOWN_TOOLS = new Set(
  Object.values(TOOL_GROUPS).flatMap((g) => g.tools)
);

const FALLBACK_MODELS = [
  { id: 'gemini-4-neon-xhigh', label: 'Gemini 4 Neon (XHigh)' },
  { id: 'gemini-4-neon-high', label: 'Gemini 4 Neon (High)' },
  { id: 'gemini-4-neon-medium', label: 'Gemini 4 Neon (Medium)' },
  { id: 'gemini-4-neon-low', label: 'Gemini 4 Neon (Low)' },
  { id: 'gemini-4-carbon-high', label: 'Gemini 4 Carbon (High)' },
  { id: 'gemini-4-carbon-medium', label: 'Gemini 4 Carbon (Medium)' },
  { id: 'gemini-4-hydrogen-xhigh', label: 'Gemini 4 Hydrogen (XHigh)' },
  { id: 'gemini-4-hydrogen-high', label: 'Gemini 4 Hydrogen (High)' },
  { id: 'gemini-pro-orchestrator-neon', label: 'Orchestrator (Neon)' },
  { id: 'claude-opus-5-5-high', label: 'Claude Opus 5.5 (High)' },
  { id: 'claude-sonnet-5-5-high', label: 'Claude Sonnet 5.5 (High)' },
];

fs.mkdirSync(AGENTS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let cachedModels = null;
const sessions = new Map();

// ── Antigravity Auth Profiles (documented methods only) ─────────────────────
// oauth : default `agy` sign-in (OS keyring). Switching Google account = /logout + new sign-in.
// apikey: per-session `--settings {"modelProvider":"gemini"}` + GEMINI_API_KEY env (never saved globally).
// adc   : per-session AGY_ADC_AUTH=true (+ optional GOOGLE_CLOUD_QUOTA_PROJECT / LOCATION).
const AUTH_FILE = path.join(__dirname, 'data', 'auth-profiles.json');
const CLI_SETTINGS_FILE = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json');
const DEFAULT_AUTH = {
  activeId: 'oauth',
  profiles: [{ id: 'oauth', type: 'oauth', name: 'Conta Google (Antigravity)', builtin: true }],
};

function loadAuth() {
  try {
    const raw = fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')) : null;
    if (!raw || !Array.isArray(raw.profiles)) return JSON.parse(JSON.stringify(DEFAULT_AUTH));
    if (!raw.profiles.some((p) => p.id === 'oauth')) raw.profiles.unshift(DEFAULT_AUTH.profiles[0]);
    if (!raw.profiles.some((p) => p.id === raw.activeId)) raw.activeId = 'oauth';
    return raw;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_AUTH));
  }
}

function saveAuth(auth) {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), 'utf8');
}

function publicProfile(p) {
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    builtin: Boolean(p.builtin),
    keyHint: p.apiKey ? `••••${String(p.apiKey).slice(-4)}` : undefined,
    baseUrl: p.baseUrl || undefined,
    project: p.project || undefined,
    location: p.location || undefined,
    createdAt: p.createdAt || undefined,
    lastTest: p.lastTest || undefined,
  };
}

function readCliSettingsSafe() {
  try {
    const s = JSON.parse(fs.readFileSync(CLI_SETTINGS_FILE, 'utf8'));
    return { modelProvider: s.modelProvider || null, model: s.model || null };
  } catch {
    return { modelProvider: null, model: null };
  }
}

function authLaunchFor(profile) {
  const env = { ...process.env };
  const extraArgs = [];
  if (!profile || profile.type === 'oauth') {
    delete env.AGY_ADC_AUTH;
    delete env.GOOGLE_GEMINI_BASE_URL;
  } else if (profile.type === 'apikey') {
    env.GEMINI_API_KEY = profile.apiKey || '';
    if (profile.baseUrl) env.GOOGLE_GEMINI_BASE_URL = profile.baseUrl;
    else delete env.GOOGLE_GEMINI_BASE_URL;
    delete env.AGY_ADC_AUTH;
    extraArgs.push('--settings', JSON.stringify({ modelProvider: 'gemini' }));
  } else if (profile.type === 'adc') {
    env.AGY_ADC_AUTH = 'true';
    delete env.GOOGLE_GEMINI_BASE_URL;
    if (profile.project) env.GOOGLE_CLOUD_QUOTA_PROJECT = profile.project;
    if (profile.location) env.GOOGLE_CLOUD_LOCATION = profile.location;
  }
  return { env, extraArgs };
}

function activeAuthLaunch() {
  const auth = loadAuth();
  return authLaunchFor(auth.profiles.find((p) => p.id === auth.activeId));
}

function restartAllSessionProcesses() {
  for (const s of sessions.values()) {
    try { closeSessionProcess(s); } catch {}
    s.resumeConversationId = null;
  }
}

function launchGoogleSwitchConsole() {
  const batPath = path.join(DATA_DIR, 'switch-google-account.bat');
  const bat = [
    '@echo off',
    'chcp 65001 >nul',
    'title Antigravity - Trocar conta Google',
    'echo.',
    'echo   ==== Trocar conta Google do Antigravity ====',
    'echo.',
    'echo   1) O agy vai abrir. Digite  /logout  e aperte Enter.',
    'echo   2) Se ele nao fechar sozinho, aperte Ctrl+C para sair.',
    'echo   3) O agy abre de novo e o navegador pede login: entre com a OUTRA conta.',
    'echo.',
    'echo   Obs: o login e compartilhado com o app Antigravity e a IDE.',
    'echo.',
    'pause',
    `"${AGY_BIN}"`,
    'echo.',
    'echo   Agora faca login com a nova conta...',
    `"${AGY_BIN}"`,
    'echo.',
    'echo   Pronto. Volte ao Obsidian Studio e clique em "Verificar".',
    'pause',
  ].join('\r\n');
  fs.writeFileSync(batPath, bat, 'utf8');
  const escaped = batPath.replace(/'/g, "''");
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', `Start-Process cmd.exe -ArgumentList '/k', '${escaped}'`],
    { detached: true, stdio: 'ignore', windowsHide: true }
  );
  child.unref();
}

function testAuthProfile(profile) {
  return new Promise((resolve) => {
    const { env, extraArgs } = authLaunchFor(profile);
    const started = Date.now();
    execFile(AGY_BIN, [...extraArgs, 'models'], { timeout: 30000, windowsHide: true, env }, (err, stdout, stderr) => {
      const out = String(stdout || '');
      const count = out.split(/\r?\n/).filter((l) => /^[a-z0-9][a-z0-9.\-]+\t/i.test(l.trim() + '\t')).filter((l) => !/^Fetching/i.test(l.trim()) && l.includes('\t')).length;
      const ok = !err && count > 0;
      resolve({
        ok,
        models: count,
        ms: Date.now() - started,
        at: new Date().toISOString(),
        message: ok ? `${count} modelos disponíveis` : String(stderr || err?.message || 'Falha ao autenticar').trim().slice(0, 400),
      });
    });
  });
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function sanitizeAgentName(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-_]{0,48}$/.test(trimmed)) return null;
  return trimmed;
}

function parseYamlScalar(raw) {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return value;
}

function parseAgentMarkdown(raw, fallbackName) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {
    name: fallbackName,
    description: '',
    mainAgent: true,
    subagent: true,
    model: 'inherit',
    commandExecutionPolicy: 'auto',
    tools: [],
  };
  let body = normalized;

  if (match) {
    const fmLines = match[1].split('\n');
    body = match[2].replace(/^\n+/, '');
    let currentListKey = null;

    for (const line of fmLines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const listMatch = line.match(/^\s+-\s+(.*)$/);
      if (listMatch && currentListKey) {
        if (!Array.isArray(meta[currentListKey])) meta[currentListKey] = [];
        const item = listMatch[1].trim().replace(/^["']|["']$/g, '');
        if (item) meta[currentListKey].push(item);
        continue;
      }
      const kvMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        const val = kvMatch[2].trim();
        if (val === '') {
          currentListKey = key;
          if (!Array.isArray(meta[key])) meta[key] = [];
        } else {
          currentListKey = null;
          if (key === 'tools') {
            const parsed = parseYamlScalar(val);
            meta.tools = Array.isArray(parsed)
              ? parsed
              : String(parsed)
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
          } else {
            meta[key] = parseYamlScalar(val);
          }
        }
      }
    }
  }

  return {
    name: String(meta.name || fallbackName),
    description: String(meta.description || ''),
    mainAgent: meta.mainAgent !== false,
    subagent: meta.subagent !== false,
    model: String(meta.model || 'inherit'),
    commandExecutionPolicy: String(meta.commandExecutionPolicy || 'auto'),
    tools: Array.isArray(meta.tools) ? meta.tools : [],
    systemPrompt: body,
  };
}

function yamlEscapeString(str) {
  const clean = String(str ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[:#\[\]{}&*!|>'"%@`]/.test(clean) || clean === '') {
    return JSON.stringify(clean);
  }
  return clean;
}

function serializeAgentMarkdown(agent) {
  const lines = [
    '---',
    `name: ${agent.name}`,
    `description: ${yamlEscapeString(agent.description || `Agente personalizado ${agent.name}`)}`,
    `mainAgent: ${agent.mainAgent !== false ? 'true' : 'false'}`,
    `subagent: ${agent.subagent !== false ? 'true' : 'false'}`,
    `model: ${agent.model || 'inherit'}`,
    `commandExecutionPolicy: ${agent.commandExecutionPolicy || 'auto'}`,
  ];

  const tools = Array.isArray(agent.tools) ? agent.tools.filter(Boolean) : [];
  if (tools.length > 0) {
    lines.push('tools:');
    for (const t of tools) {
      lines.push(`  - ${t}`);
    }
  } else {
    lines.push('tools: []');
  }
  lines.push('---', '');

  const promptBody = String(agent.systemPrompt ?? '').replace(/\r\n/g, '\n').trimEnd();
  return `${lines.join('\n')}${promptBody}\n`;
}

function resolveAgentPath(name) {
  const dirFile = path.join(AGENTS_DIR, name, 'agent.md');
  if (fs.existsSync(dirFile)) return { filePath: dirFile, format: 'dir' };
  const flatFile = path.join(AGENTS_DIR, `${name}.md`);
  if (fs.existsSync(flatFile)) return { filePath: flatFile, format: 'flat' };
  return null;
}

function listAgents() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidate = path.join(AGENTS_DIR, entry.name, 'agent.md');
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf8');
        const parsed = parseAgentMarkdown(raw, entry.name);
        const stat = fs.statSync(candidate);
        results.push({
          ...parsed,
          slug: entry.name,
          filePath: candidate,
          format: 'dir',
          updatedAt: stat.mtime.toISOString(),
        });
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const slug = entry.name.slice(0, -3);
      const candidate = path.join(AGENTS_DIR, entry.name);
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = parseAgentMarkdown(raw, slug);
      const stat = fs.statSync(candidate);
      results.push({
        ...parsed,
        slug,
        filePath: candidate,
        format: 'flat',
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }

  results.sort((a, b) => {
    if (a.slug === 'neon-agent') return -1;
    if (b.slug === 'neon-agent') return 1;
    if (a.format !== b.format) return a.format === 'dir' ? -1 : 1;
    return a.slug.localeCompare(b.slug);
  });

  return results;
}

function loadHistory() {
  return readJsonFile(HISTORY_FILE, {});
}

function saveHistorySnapshot(slug, systemPrompt, description) {
  const history = loadHistory();
  if (!Array.isArray(history[slug])) history[slug] = [];
  const latest = history[slug][0];
  if (latest && latest.systemPrompt === systemPrompt) return history[slug];

  history[slug].unshift({
    id: crypto.randomUUID().slice(0, 8),
    savedAt: new Date().toISOString(),
    description: description || '',
    systemPrompt,
  });
  history[slug] = history[slug].slice(0, 30);
  writeJsonFile(HISTORY_FILE, history);
  return history[slug];
}

// ── Persistent Conversations & Telemetry ──
function loadConversations() {
  return readJsonFile(CONVERSATIONS_FILE, []);
}

function saveConversations(list) {
  writeJsonFile(CONVERSATIONS_FILE, list.slice(0, 120));
}

function upsertConversation(record) {
  const list = loadConversations();
  const idx = list.findIndex((c) => c.id === record.id);
  const now = new Date().toISOString();
  const merged = {
    ...(idx >= 0 ? list[idx] : {}),
    ...record,
    updatedAt: now,
    createdAt: idx >= 0 ? list[idx].createdAt : record.createdAt || now,
  };
  if (idx >= 0) list[idx] = merged;
  else list.unshift(merged);
  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  saveConversations(list);
  return merged;
}

function loadTelemetry() {
  return readJsonFile(TELEMETRY_FILE, {
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalThinkingTokens: 0,
    totalCacheReadTokens: 0,
    totalTurns: 0,
    lastTps: 0,
    lastTtft: 0,
    daily: {},
  });
}

function recordTurnTelemetry(usage, tps, ttft) {
  const t = loadTelemetry();
  const day = new Date().toISOString().slice(0, 10);
  const inp = Number(usage?.input_tokens || 0);
  const out = Number(usage?.output_tokens || 0);
  const think = Number(usage?.thinking_tokens || 0);
  const cache = Number(usage?.cache_read_tokens || 0);
  const total = Number(usage?.total_tokens || inp + out);

  t.totalTokens += total;
  t.totalInputTokens += inp;
  t.totalOutputTokens += out;
  t.totalThinkingTokens += think;
  t.totalCacheReadTokens += cache;
  t.totalTurns += 1;
  if (tps > 0) t.lastTps = Number(tps.toFixed(1));
  if (ttft > 0) t.lastTtft = Number(ttft.toFixed(2));

  if (!t.daily[day]) t.daily[day] = { turns: 0, tokens: 0, thinking: 0 };
  t.daily[day].turns += 1;
  t.daily[day].tokens += total;
  t.daily[day].thinking += think;

  writeJsonFile(TELEMETRY_FILE, t);
  return t;
}

function getModels(forceRefresh = false) {
  return new Promise((resolve) => {
    if (cachedModels && !forceRefresh) {
      return resolve(cachedModels);
    }
    const { env, extraArgs } = activeAuthLaunch();
    execFile(AGY_BIN, [...extraArgs, 'models'], { timeout: 15000, windowsHide: true, env }, (err, stdout) => {
      if (err || !stdout) {
        return resolve(FALLBACK_MODELS);
      }
      const parsed = [];
      for (const line of stdout.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Fetching')) continue;
        const parts = trimmed.split(/\t+|\s{2,}/);
        if (parts.length >= 2) {
          parsed.push({ id: parts[0].trim(), label: parts.slice(1).join(' ').trim() });
        }
      }
      if (parsed.length === 0) {
        return resolve(FALLBACK_MODELS);
      }
      parsed.sort((a, b) => {
        if (a.id === DEFAULT_MODEL) return -1;
        if (b.id === DEFAULT_MODEL) return 1;
        return 0;
      });
      cachedModels = parsed;
      resolve(parsed);
    });
  });
}

function buildAgyArgs(session) {
  const args = [];
  if (session.agentFormat !== 'flat' && session.agentName) {
    args.push('--agent', session.agentName);
  }
  args.push(
    '--model',
    session.model || DEFAULT_MODEL,
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json'
  );

  if (session.resumeConversationId) {
    args.push('--conversation', session.resumeConversationId);
  }

  if (session.permissionMode === 'plan') {
    args.push('--mode', 'plan');
  } else if (session.permissionMode === 'accept-edits') {
    args.push('--mode', 'accept-edits');
  } else {
    args.push('--dangerously-skip-permissions');
  }

  return args;
}

function closeSessionProcess(session) {
  if (!session) return;
  session.flatPromptInjected = false;
  if (!session.proc) return;
  const proc = session.proc;
  session.proc = null;
  session.busy = false;
  try {
    if (proc.stdin && !proc.stdin.destroyed) {
      proc.stdin.end();
    }
  } catch {
    // ignore
  }
  try {
    if (!proc.killed) {
      proc.kill();
    }
  } catch {
    // ignore
  }
}

function startAgyProcess(session) {
  const cwd =
    session.cwd && fs.existsSync(session.cwd) && fs.statSync(session.cwd).isDirectory()
      ? session.cwd
      : DEFAULT_CWD;

  const authLaunch = activeAuthLaunch();
  const args = [...authLaunch.extraArgs, ...buildAgyArgs(session)];
  const proc = spawn(AGY_BIN, args, {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    env: authLaunch.env,
  });

  session.proc = proc;
  session.stdoutBuffer = '';
  session.stderrBuffer = '';

  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  proc.stdout.on('data', (chunk) => {
    session.stdoutBuffer += chunk;
    let idx;
    while ((idx = session.stdoutBuffer.indexOf('\n')) !== -1) {
      const line = session.stdoutBuffer.slice(0, idx).trim();
      session.stdoutBuffer = session.stdoutBuffer.slice(idx + 1);
      if (!line) continue;
      handleAgyLine(session, line);
    }
  });

  proc.stderr.on('data', (chunk) => {
    session.stderrBuffer += chunk;
    if (session.stderrBuffer.length > 8000) {
      session.stderrBuffer = session.stderrBuffer.slice(-8000);
    }
  });

  proc.on('error', (err) => {
    if (session.activeTurn) {
      sendSse(session.activeTurn.res, 'error', {
        message: `Falha ao iniciar agy: ${err.message}`,
      });
      finishActiveTurn(session);
    }
    session.proc = null;
  });

  proc.on('exit', (code, signal) => {
    if (session.stdoutBuffer.trim()) {
      handleAgyLine(session, session.stdoutBuffer.trim());
      session.stdoutBuffer = '';
    }
    if (session.activeTurn) {
      const detail = session.stderrBuffer.trim();
      sendSse(session.activeTurn.res, 'error', {
        message: detail || `Processo agy encerrado (code=${code}, signal=${signal || 'none'}).`,
      });
      finishActiveTurn(session);
    }
    if (session.proc === proc) {
      session.proc = null;
    }
  });

  return proc;
}

function sendSse(res, eventName, data) {
  if (!res || res.writableEnded || res.destroyed) return;
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

function finishActiveTurn(session) {
  const turn = session.activeTurn;
  session.activeTurn = null;
  session.busy = false;
  if (turn && turn.res && !turn.res.writableEnded) {
    turn.res.end();
  }
}

function handleAgyLine(session, line) {
  let payload;
  try {
    payload = JSON.parse(line);
  } catch {
    return;
  }

  const turn = session.activeTurn;

  if (payload.event === 'init') {
    session.conversationId = payload.conversation_id || session.conversationId;
    session.initInfo = payload.init || {};
    if (turn) {
      sendSse(turn.res, 'init', {
        conversation_id: session.conversationId,
        init: session.initInfo,
      });
    }
    return;
  }

  if (payload.event === 'step_update' && payload.step_update) {
    const step = payload.step_update;
    if (step.conversation_id) session.conversationId = step.conversation_id;
    if (!turn) return;

    if (step.step_type === 'agent_response') {
      if (typeof step.text_delta === 'string' && step.text_delta.length > 0) {
        if (!turn.firstDeltaAt) {
          turn.firstDeltaAt = Date.now();
          turn.ttft = (turn.firstDeltaAt - turn.startedAt) / 1000;
        }
        turn.charCount += step.text_delta.length;
        sendSse(turn.res, 'delta', {
          step_index: step.step_index,
          state: step.state,
          text_delta: step.text_delta,
          ttft: turn.ttft,
        });
      }
      if (step.state === 'DONE' && step.usage) {
        turn.lastStepUsage = step.usage;
        turn.lastStepDuration = step.duration_seconds || 0;
        sendSse(turn.res, 'step_usage', {
          step_index: step.step_index,
          duration_seconds: step.duration_seconds,
          usage: step.usage,
        });
      }
    } else if (step.step_type === 'tool') {
      sendSse(turn.res, 'tool', {
        step_index: step.step_index,
        state: step.state,
        tool_name: step.tool_name || step.tool_info?.name || 'tool',
        duration_seconds: step.duration_seconds,
        tool_info: step.tool_info || null,
      });
    } else if (step.step_type === 'subagent' || step.subagent_info) {
      sendSse(turn.res, 'subagent', {
        step_index: step.step_index,
        state: step.state,
        subagent_info: step.subagent_info || null,
      });
    }
    return;
  }

  if (payload.event === 'result' && payload.result) {
    const result = payload.result;
    if (result.conversation_id) session.conversationId = result.conversation_id;
    session.lastUsage = result.usage || null;
    session.numTurns = result.num_turns || session.numTurns + 1;

    let tps = 0;
    let ttft = 0;
    if (turn) {
      const elapsedSec = Math.max(0.1, (Date.now() - turn.startedAt) / 1000);
      ttft = turn.ttft || elapsedSec;
      const stepOut = Number(turn.lastStepUsage?.output_tokens || result.usage?.output_tokens || 0);
      const genSec = Math.max(0.15, turn.lastStepDuration || elapsedSec);
      tps = stepOut > 0 ? stepOut / genSec : 0;

      const turnUsage = turn.lastStepUsage || result.usage;
      const telemetry = recordTurnTelemetry(turnUsage, tps, ttft);

      sendSse(turn.res, 'result', {
        ...result,
        turn_usage: turnUsage,
        tps: Number(tps.toFixed(1)),
        ttft: Number(ttft.toFixed(2)),
        telemetry,
      });
      finishActiveTurn(session);
    }
  }
}

function readJsonBody(req, maxBytes = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        reject(new Error('Payload muito grande (máximo 12 MB).'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(PUBLIC_DIR, `.${rel}`);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const ext = path.extname(resolved).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(resolved).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = urlObj.pathname;

  try {
    // Health / meta + telemetry
    if (req.method === 'GET' && pathname === '/api/meta') {
      const models = await getModels(urlObj.searchParams.get('refresh') === '1');
      const auth = loadAuth();
      const activeProf = auth.profiles.find((p) => p.id === auth.activeId) || auth.profiles[0];
      return sendJson(res, 200, {
        agentsDir: AGENTS_DIR,
        defaultModel: DEFAULT_MODEL,
        defaultCwd: fs.existsSync(DEFAULT_CWD) ? DEFAULT_CWD : os.homedir(),
        models,
        toolGroups: TOOL_GROUPS,
        telemetry: loadTelemetry(),
        userName: os.userInfo().username || 'Operator',
        auth: {
          activeId: auth.activeId,
          activeName: activeProf?.name || 'Conta Google (Antigravity)',
          activeType: activeProf?.type || 'oauth',
        },
      });
    }

    // ── Auth / Account switcher ─────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/auth') {
      const auth = loadAuth();
      return sendJson(res, 200, {
        activeId: auth.activeId,
        profiles: auth.profiles.map(publicProfile),
        cliSettings: readCliSettingsSafe(),
        envAdc: Boolean(process.env.AGY_ADC_AUTH),
        envApiKey: Boolean(process.env.GEMINI_API_KEY),
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/profiles') {
      const body = await readJsonBody(req, 64 * 1024);
      const type = body.type === 'apikey' || body.type === 'adc' ? body.type : null;
      const name = String(body.name || '').trim().slice(0, 60);
      if (!type || !name) return sendJson(res, 400, { error: 'Informe nome e tipo (apikey ou adc).' });
      if (type === 'apikey' && !String(body.apiKey || '').trim()) {
        return sendJson(res, 400, { error: 'Cole a Gemini API key.' });
      }
      const auth = loadAuth();
      const profile = {
        id: `${type}-${crypto.randomBytes(4).toString('hex')}`,
        type,
        name,
        createdAt: new Date().toISOString(),
      };
      if (type === 'apikey') {
        profile.apiKey = String(body.apiKey).trim();
        const rawBase = String(body.baseUrl || '').trim();
        if (rawBase && /^https?:\/\//i.test(rawBase)) profile.baseUrl = rawBase.slice(0, 240);
      }
      if (type === 'adc') {
        profile.project = String(body.project || '').trim().slice(0, 120) || undefined;
        profile.location = String(body.location || '').trim().slice(0, 40) || undefined;
      }
      auth.profiles.push(profile);
      saveAuth(auth);
      return sendJson(res, 201, { profile: publicProfile(profile) });
    }

    const authProfileMatch = pathname.match(/^\/api\/auth\/profiles\/([a-z0-9-]+)(\/test)?$/i);
    if (authProfileMatch) {
      const auth = loadAuth();
      const profile = auth.profiles.find((p) => p.id === authProfileMatch[1]);
      if (!profile) return sendJson(res, 404, { error: 'Perfil não encontrado.' });
      if (req.method === 'POST' && authProfileMatch[2]) {
        const result = await testAuthProfile(profile);
        profile.lastTest = result;
        saveAuth(auth);
        return sendJson(res, 200, { result });
      }
      if (req.method === 'DELETE' && !authProfileMatch[2]) {
        if (profile.builtin) return sendJson(res, 400, { error: 'A conta Google principal não pode ser removida.' });
        auth.profiles = auth.profiles.filter((p) => p.id !== profile.id);
        if (auth.activeId === profile.id) {
          auth.activeId = 'oauth';
          restartAllSessionProcesses();
        }
        saveAuth(auth);
        return sendJson(res, 200, { ok: true, activeId: auth.activeId });
      }
    }

    if (req.method === 'POST' && pathname === '/api/auth/active') {
      const body = await readJsonBody(req, 16 * 1024);
      const auth = loadAuth();
      if (!auth.profiles.some((p) => p.id === body.id)) return sendJson(res, 404, { error: 'Perfil não encontrado.' });
      const changed = auth.activeId !== body.id;
      auth.activeId = body.id;
      saveAuth(auth);
      if (changed) {
        restartAllSessionProcesses();
        cachedModels = null;
      }
      return sendJson(res, 200, { ok: true, activeId: auth.activeId, changed });
    }

    if (req.method === 'POST' && pathname === '/api/auth/google-switch') {
      launchGoogleSwitchConsole();
      restartAllSessionProcesses();
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/auth/reconnect') {
      restartAllSessionProcesses();
      cachedModels = null;
      return sendJson(res, 200, { ok: true });
    }

    // Telemetry endpoint
    if (req.method === 'GET' && pathname === '/api/telemetry') {
      return sendJson(res, 200, { telemetry: loadTelemetry() });
    }

    // Upload attachment (base64 file or image) so agent can inspect it via view_file
    if (req.method === 'POST' && pathname === '/api/uploads') {
      const body = await readJsonBody(req, 12 * 1024 * 1024);
      const rawName = String(body.name || 'anexo.txt').replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeName = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${rawName.slice(-60)}`;
      const destPath = path.join(UPLOADS_DIR, safeName);
      if (typeof body.base64 !== 'string') {
        return sendJson(res, 400, { error: 'Arquivo base64 ausente.' });
      }
      const buf = Buffer.from(body.base64, 'base64');
      fs.writeFileSync(destPath, buf);
      return sendJson(res, 201, {
        attachment: {
          name: body.name || rawName,
          mime: body.mime || 'application/octet-stream',
          size: buf.length,
          path: destPath,
        },
      });
    }

    // Saved conversations CRUD
    if (req.method === 'GET' && pathname === '/api/conversations') {
      const list = loadConversations();
      return sendJson(res, 200, {
        conversations: list.map(({ messages, ...summary }) => ({
          ...summary,
          messageCount: Array.isArray(messages) ? messages.length : 0,
        })),
      });
    }

    if (req.method === 'POST' && pathname === '/api/conversations') {
      const body = await readJsonBody(req);
      const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : crypto.randomUUID();
      const saved = upsertConversation({
        id,
        title: String(body.title || 'Nova conversa').slice(0, 120),
        agentName: String(body.agentName || 'neon-agent'),
        model: String(body.model || DEFAULT_MODEL),
        cwd: String(body.cwd || DEFAULT_CWD),
        permissionMode: String(body.permissionMode || 'full'),
        agyConversationId: body.agyConversationId || null,
        messages: Array.isArray(body.messages) ? body.messages : [],
        lastUsage: body.lastUsage || null,
      });
      return sendJson(res, 200, { conversation: saved });
    }

    const convMatch = pathname.match(/^\/api\/conversations\/([^/]+)$/);
    if (convMatch) {
      const convId = decodeURIComponent(convMatch[1]);
      if (req.method === 'GET') {
        const found = loadConversations().find((c) => c.id === convId);
        if (!found) return sendJson(res, 404, { error: 'Conversa não encontrada.' });
        return sendJson(res, 200, { conversation: found });
      }
      if (req.method === 'PATCH') {
        const body = await readJsonBody(req);
        const list = loadConversations();
        const found = list.find((c) => c.id === convId);
        if (!found) return sendJson(res, 404, { error: 'Conversa não encontrada.' });
        if (typeof body.title === 'string' && body.title.trim()) {
          found.title = body.title.trim().slice(0, 120);
        }
        found.updatedAt = new Date().toISOString();
        saveConversations(list);
        return sendJson(res, 200, { conversation: found });
      }
      if (req.method === 'DELETE') {
        const list = loadConversations().filter((c) => c.id !== convId);
        saveConversations(list);
        return sendJson(res, 200, { deleted: convId });
      }
    }

    // List all native agents (lightweight summary)
    if (req.method === 'GET' && pathname === '/api/agents') {
      const agents = listAgents();
      const history = loadHistory();
      return sendJson(res, 200, {
        agents: agents.map(({ systemPrompt, ...meta }) => ({
          ...meta,
          promptLength: systemPrompt.length,
          historyCount: Array.isArray(history[meta.slug]) ? history[meta.slug].length : 0,
        })),
      });
    }

    // Create new native agent
    if (req.method === 'POST' && pathname === '/api/agents') {
      const body = await readJsonBody(req);
      const slug = sanitizeAgentName(body.name);
      if (!slug) {
        return sendJson(res, 400, {
          error: 'Nome inválido. Use letras minúsculas, números, hífen ou underscore (ex: meu-agente).',
        });
      }
      if (resolveAgentPath(slug)) {
        return sendJson(res, 409, { error: `Já existe um agente chamado "${slug}".` });
      }
      const agentDir = path.join(AGENTS_DIR, slug);
      fs.mkdirSync(agentDir, { recursive: true });
      const filePath = path.join(agentDir, 'agent.md');
      const tools = Array.isArray(body.tools)
        ? body.tools.filter((t) => ALL_KNOWN_TOOLS.has(t))
        : [...TOOL_GROUPS.files.tools, ...TOOL_GROUPS.terminal.tools, ...TOOL_GROUPS.web.tools];

      const agentData = {
        name: slug,
        description: body.description || `Agente personalizado ${slug} (Gemini 4 Neon XHigh).`,
        mainAgent: true,
        subagent: true,
        model: 'inherit',
        commandExecutionPolicy: body.commandExecutionPolicy || 'auto',
        tools,
        systemPrompt:
          body.systemPrompt ||
          `# System Prompt\n\nVocê é o agente **${slug}**.\n\n## Instruções\n- Responda em português do Brasil.\n- Seja objetivo, claro e preciso.`,
      };

      fs.writeFileSync(filePath, serializeAgentMarkdown(agentData), 'utf8');
      const snapshots = saveHistorySnapshot(slug, agentData.systemPrompt, agentData.description);
      return sendJson(res, 201, {
        agent: { ...agentData, slug, filePath, format: 'dir', updatedAt: new Date().toISOString() },
        history: snapshots,
      });
    }

    // Get / Update / Delete single agent
    const agentMatch = pathname.match(/^\/api\/agents\/([^/]+)$/);
    if (agentMatch) {
      const slug = sanitizeAgentName(decodeURIComponent(agentMatch[1]));
      if (!slug) return sendJson(res, 400, { error: 'Nome de agente inválido.' });

      if (req.method === 'GET') {
        const resolved = resolveAgentPath(slug);
        if (!resolved) return sendJson(res, 404, { error: 'Agente não encontrado.' });
        const raw = fs.readFileSync(resolved.filePath, 'utf8');
        const parsed = parseAgentMarkdown(raw, slug);
        const stat = fs.statSync(resolved.filePath);
        const history = loadHistory()[slug] || [];
        return sendJson(res, 200, {
          agent: {
            ...parsed,
            slug,
            filePath: resolved.filePath,
            format: resolved.format,
            updatedAt: stat.mtime.toISOString(),
          },
          history,
        });
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const resolved = resolveAgentPath(slug);
        const targetPath = resolved
          ? resolved.filePath
          : path.join(AGENTS_DIR, slug, 'agent.md');
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        const existing = resolved
          ? parseAgentMarkdown(fs.readFileSync(resolved.filePath, 'utf8'), slug)
          : {
              name: slug,
              description: '',
              mainAgent: true,
              subagent: true,
              model: 'inherit',
              commandExecutionPolicy: 'auto',
              tools: [...TOOL_GROUPS.files.tools, ...TOOL_GROUPS.terminal.tools, ...TOOL_GROUPS.web.tools],
              systemPrompt: '',
            };

        const updated = {
          name: slug,
          description:
            typeof body.description === 'string' ? body.description : existing.description,
          mainAgent: typeof body.mainAgent === 'boolean' ? body.mainAgent : existing.mainAgent,
          subagent: typeof body.subagent === 'boolean' ? body.subagent : existing.subagent,
          model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : existing.model,
          commandExecutionPolicy:
            typeof body.commandExecutionPolicy === 'string'
              ? body.commandExecutionPolicy
              : existing.commandExecutionPolicy,
          tools: Array.isArray(body.tools) ? body.tools.filter(Boolean) : existing.tools,
          systemPrompt:
            typeof body.systemPrompt === 'string' ? body.systemPrompt : existing.systemPrompt,
        };

        const content = serializeAgentMarkdown(updated);
        fs.writeFileSync(targetPath, content, 'utf8');
        const history = saveHistorySnapshot(slug, updated.systemPrompt, updated.description);

        for (const s of sessions.values()) {
          if (s.agentName === slug && s.proc) {
            s.promptStale = true;
          }
        }

        return sendJson(res, 200, {
          agent: {
            ...updated,
            slug,
            filePath: targetPath,
            format: resolved ? resolved.format : 'dir',
            updatedAt: new Date().toISOString(),
          },
          history,
        });
      }

      if (req.method === 'DELETE') {
        const resolved = resolveAgentPath(slug);
        if (!resolved) return sendJson(res, 404, { error: 'Agente não encontrado.' });
        if (resolved.format === 'dir') {
          fs.rmSync(path.dirname(resolved.filePath), { recursive: true, force: true });
        } else {
          fs.unlinkSync(resolved.filePath);
        }
        return sendJson(res, 200, { deleted: slug });
      }
    }

    // Create chat session (supports optional resumeConversationId)
    if (req.method === 'POST' && pathname === '/api/sessions') {
      const body = await readJsonBody(req);
      const agentName = sanitizeAgentName(body.agentName || 'neon-agent');
      const resolvedAgent = agentName ? resolveAgentPath(agentName) : null;
      if (!agentName || !resolvedAgent) {
        return sendJson(res, 400, { error: 'Agente inválido ou inexistente.' });
      }
      const cwd =
        typeof body.cwd === 'string' && body.cwd.trim()
          ? body.cwd.trim()
          : fs.existsSync(DEFAULT_CWD)
          ? DEFAULT_CWD
          : os.homedir();
      if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
        return sendJson(res, 400, { error: `Pasta de trabalho não encontrada: ${cwd}` });
      }

      const sessionId = crypto.randomUUID();
      const session = {
        id: sessionId,
        agentName,
        agentFormat: resolvedAgent.format,
        agentFilePath: resolvedAgent.filePath,
        flatPromptInjected: false,
        model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_MODEL,
        cwd,
        permissionMode: ['full', 'accept-edits', 'plan'].includes(body.permissionMode)
          ? body.permissionMode
          : 'full',
        resumeConversationId:
          typeof body.resumeConversationId === 'string' && body.resumeConversationId.trim()
            ? body.resumeConversationId.trim()
            : null,
        proc: null,
        busy: false,
        activeTurn: null,
        conversationId: body.resumeConversationId || null,
        initInfo: null,
        numTurns: 0,
        promptStale: false,
        createdAt: new Date().toISOString(),
      };
      sessions.set(sessionId, session);

      return sendJson(res, 201, {
        session: {
          id: session.id,
          agentName: session.agentName,
          agentFormat: session.agentFormat,
          model: session.model,
          cwd: session.cwd,
          permissionMode: session.permissionMode,
          conversationId: session.conversationId,
        },
      });
    }

    // Stream a message in a session
    const msgMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/message$/);
    if (req.method === 'POST' && msgMatch) {
      const sessionId = msgMatch[1];
      const session = sessions.get(sessionId);
      if (!session) return sendJson(res, 404, { error: 'Sessão não encontrada.' });
      if (session.busy) {
        return sendJson(res, 409, { error: 'O agente ainda está respondendo o turno anterior.' });
      }

      const body = await readJsonBody(req);
      const content = typeof body.content === 'string' ? body.content.trim() : '';
      if (!content) return sendJson(res, 400, { error: 'Mensagem vazia.' });

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      session.busy = true;
      session.activeTurn = {
        res,
        startedAt: Date.now(),
        firstDeltaAt: null,
        ttft: 0,
        charCount: 0,
        lastStepUsage: null,
        lastStepDuration: 0,
      };

      res.on('close', () => {
        if (session.activeTurn && session.activeTurn.res === res && !res.writableEnded) {
          session.activeTurn = null;
          closeSessionProcess(session);
        }
      });

      if (!session.proc) {
        session.promptStale = false;
        startAgyProcess(session);
      } else if (session.initInfo) {
        sendSse(res, 'init', {
          conversation_id: session.conversationId,
          init: session.initInfo,
          reused: true,
        });
      }

      let finalContent = content;
      if (session.agentFormat === 'flat' && !session.flatPromptInjected && session.agentFilePath) {
        try {
          const rawMd = fs.readFileSync(session.agentFilePath, 'utf8');
          const parsed = parseAgentMarkdown(rawMd, session.agentName);
          if (parsed.systemPrompt && parsed.systemPrompt.trim()) {
            finalContent = `[INSTRUÇÕES DO AGENTE ATIVO: ${session.agentName}]\nSiga rigorosamente o papel e as instruções abaixo durante toda esta conversa:\n\n${parsed.systemPrompt.trim()}\n\n[MENSAGEM DO USUÁRIO]\n${content}`;
          }
          session.flatPromptInjected = true;
        } catch {
          // fallback to raw content if file cannot be read
        }
      }

      const payload = JSON.stringify({
        event: 'user',
        message: { content: finalContent },
      });

      try {
        session.proc.stdin.write(`${payload}\n`);
      } catch (err) {
        sendSse(res, 'error', { message: `Erro ao enviar mensagem para o agy: ${err.message}` });
        finishActiveTurn(session);
      }
      return;
    }

    // Abort / stop active turn
    const abortMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/abort$/);
    if (req.method === 'POST' && abortMatch) {
      const session = sessions.get(abortMatch[1]);
      if (!session) return sendJson(res, 404, { error: 'Sessão não encontrada.' });
      if (session.activeTurn) {
        sendSse(session.activeTurn.res, 'aborted', { message: 'Geração interrompida pelo usuário.' });
        finishActiveTurn(session);
      }
      closeSessionProcess(session);
      return sendJson(res, 200, { aborted: true });
    }

    // Close/delete session
    const delSessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (req.method === 'DELETE' && delSessionMatch) {
      const session = sessions.get(delSessionMatch[1]);
      if (session) {
        closeSessionProcess(session);
        sessions.delete(delSessionMatch[1]);
      }
      return sendJson(res, 200, { closed: true });
    }

    // Serve whitelisted real Obsidian Prism engine modules directly from user's installed plugin
    if (req.method === 'GET' && pathname.startsWith('/prism-vendor/')) {
      const fileName = pathname.slice('/prism-vendor/'.length);
      const target = PRISM_VENDOR_WHITELIST.get(fileName);
      if (!target || !fs.existsSync(target)) {
        res.writeHead(404);
        return res.end('Prism module not found');
      }
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return fs.createReadStream(target).pipe(res);
    }

    // Static files
    if (req.method === 'GET') {
      return serveStatic(req, res, pathname);
    }

    sendJson(res, 404, { error: 'Rota não encontrada.' });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Erro interno no servidor.' });
  }
});

function cleanupAll() {
  for (const session of sessions.values()) {
    closeSessionProcess(session);
  }
  sessions.clear();
}

process.on('SIGINT', () => {
  cleanupAll();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupAll();
  process.exit(0);
});
process.on('exit', cleanupAll);

server.listen(PORT, HOST, () => {
  console.log(`Neon Agent Studio (Obsidian Prism) rodando em http://${HOST}:${PORT}`);
  console.log(`Agentes nativos do Antigravity: ${AGENTS_DIR}`);
});
