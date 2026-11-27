'use strict';

const MAX_CONTEXT_TOKENS = 512000;

const GEMINI_SPARK_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12.7 7.1 16.9 11.3 22 12C16.9 12.7 12.7 16.9 12 22C11.3 16.9 7.1 12.7 2 12C7.1 11.3 11.3 7.1 12 2Z" fill="url(#gSpark)"/><defs><linearGradient id="gSpark" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#5CC6FC"/><stop offset="0.52" stop-color="#669DF6"/><stop offset="1" stop-color="#9B72CB"/></linearGradient></defs></svg>`;
const CLAUDE_SPARK_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" stroke="#D97757" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const ORCH_CRYSTAL_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="12,2 21,9 17,21 7,21 3,9" fill="url(#oCrys)" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/><defs><linearGradient id="oCrys" x1="3" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#F8FAFC"/><stop offset="0.45" stop-color="#94A3B8"/><stop offset="1" stop-color="#669DF6"/></linearGradient></defs></svg>`;

const MODEL_FAMILIES = [
  {
    id: 'gemini-4-neon',
    name: 'Gemini 4 Neon',
    desc: 'Máxima profundidade de raciocínio · 512K',
    camp: 'gemini',
    icon: GEMINI_SPARK_SVG,
    efforts: ['low', 'medium', 'high', 'xhigh'],
    defaultEffort: 'xhigh',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon',
    desc: 'Equilíbrio entre planejamento e execução',
    camp: 'gemini',
    icon: GEMINI_SPARK_SVG,
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'high',
  },
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    desc: 'Ultra-rápido para tarefas cotidianas',
    camp: 'gemini',
    icon: GEMINI_SPARK_SVG,
    efforts: ['low', 'medium', 'high', 'xhigh'],
    defaultEffort: 'high',
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    desc: 'Planejador + Executor em dupla automática',
    camp: 'gemini',
    icon: ORCH_CRYSTAL_SVG,
    isOrchestrator: true,
    efforts: [],
    defaultModelId: 'gemini-pro-orchestrator-neon',
  },
  {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5',
    desc: 'Análise profunda e arquitetura complexa',
    camp: 'claude',
    icon: CLAUDE_SPARK_SVG,
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'high',
  },
  {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    desc: 'Implementação ágil com raciocínio',
    camp: 'claude',
    icon: CLAUDE_SPARK_SVG,
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'high',
  },
];

const PROMPT_TEMPLATES = [
  {
    id: 'default',
    name: 'Padrão Neon',
    desc: 'Assistente geral direto em PT-BR',
    body: `# System Prompt\n\nVocê é o **Neon Agent**, um assistente pessoal de engenharia, pesquisa e produtividade operando com raciocínio profundo.\n\n## Como você deve agir\n- Responda em português do Brasil por padrão (ou no idioma em que o usuário falar).\n- Seja direto, prático e técnico quando necessário, sem enrolação.\n- Antes de modificar arquivos ou executar comandos destrutivos, verifique o contexto com cuidado.`,
  },
  {
    id: 'engineer',
    name: 'Engenheiro Staff',
    desc: 'Pragmático, lê código e valida no terminal',
    body: `# System Prompt\n\nVocê é um **Engenheiro de Software Staff** extremamente pragmático, preciso e autônomo.\n\n## Diretrizes\n- Leia o código existente antes de propor ou editar qualquer arquivo.\n- Prefira soluções simples, limpas, testáveis e sem dependências desnecessárias.\n- Sempre valide suas alterações rodando testes ou verificações reais no terminal.`,
  },
  {
    id: 'architect',
    name: 'Arquiteto & Reviewer',
    desc: 'Foco em bugs, segurança e edge cases',
    body: `# System Prompt\n\nVocê é um **Arquiteto de Sistemas e Code Reviewer Rigoroso**.\n\n## Foco da análise\n1. Corretude, edge cases, concorrência e tratamento de erros.\n2. Segurança (injeção, vazamento de segredos, permissões).\n3. Simplicidade arquitetural e performance real.\n\nPriorize achados por severidade: Crítico, Alto, Médio, Sugestão.`,
  },
  {
    id: 'researcher',
    name: 'Pesquisador Técnico',
    desc: 'Fontes primárias, comparação e síntese',
    body: `# System Prompt\n\nVocê é um **Pesquisador Técnico e Analista Crítico**.\n\n- Busque fontes primárias e documentação oficial usando busca na web quando necessário.\n- Nunca invente APIs, números ou citações.\n- Estruture respostas longas com resumo executivo, comparação objetiva e recomendação final.`,
  },
];

const SLASH_COMMANDS = [
  { cmd: '/goal', desc: 'Execução autônoma até verificar objetivo completo', needsArg: true, tag: 'agy' },
  { cmd: '/boost', desc: 'Raciocínio profundo (Extra High + verificação rigorosa)', needsArg: true, tag: 'agy' },
  { cmd: '/btw', desc: 'Pergunta paralela sem interromper o chat principal', needsArg: true, tag: 'agy' },
  { cmd: '/plan', desc: 'Explorar e montar plano estruturado antes de agir', needsArg: true, tag: 'acp' },
  { cmd: '/grill-me', desc: 'Entrevista rápida 1 pergunta por vez p/ alinhar plano', needsArg: true, tag: 'acp' },
  { cmd: '/learn', desc: 'Capturar correção da sessão como regra/skill persistente', needsArg: true, tag: 'acp' },
  { cmd: '/compact', desc: 'Compactar histórico da conversa e liberar contexto', needsArg: false, tag: 'agy' },
  { cmd: '/fork', desc: 'Clonar esta conversa em um novo ramo na barra lateral', needsArg: false, tag: 'agy' },
  { cmd: '/rewind', desc: 'Voltar o último turno e editar o prompt (/undo)', needsArg: false, tag: 'agy' },
  { cmd: '/rename', desc: 'Renomear esta conversa na barra lateral', needsArg: true, tag: 'agy' },
  { cmd: '/copy', desc: 'Copiar última resposta (/copy 2 ou /copy btw)', needsArg: false, tag: 'agy' },
  { cmd: '/model', desc: 'Abrir picker ou trocar modelo ao vivo (ex: /model opus)', needsArg: false, tag: 'acp' },
  { cmd: '/effort', desc: 'Trocar esforço ao vivo (low|medium|high|xhigh)', needsArg: true, tag: 'acp' },
  { cmd: '/permissions', desc: 'Trocar permissões ao vivo (full|ask|accept-edits|plan)', needsArg: false, tag: 'acp' },
  { cmd: '/skills', desc: 'Abrir seletor de skills instaladas (/skills reload)', needsArg: false, tag: 'acp' },
  { cmd: '/agents', desc: 'Abrir seletor de agentes nativos e .md', needsArg: false, tag: 'studio' },
  { cmd: '/context', desc: 'Abrir 512K/1M Physical Water Vial (/vial, /usage)', needsArg: false, tag: 'studio' },
  { cmd: '/accounts', desc: 'Gerenciar contas Antigravity (/login, /logout)', needsArg: false, tag: 'studio' },
  { cmd: '/prompt', desc: 'Abrir / focar editor de System Prompt', needsArg: false, tag: 'studio' },
  { cmd: '/clear', desc: 'Iniciar nova conversa limpa (/new)', needsArg: false, tag: 'agy' },
  { cmd: '/export', desc: 'Baixar esta conversa em Markdown (.md)', needsArg: false, tag: 'studio' },
  { cmd: '/voice', desc: 'Gravar e transcrever voz em tempo real (Alt+R / /record)', needsArg: false, tag: 'agy' },
  { cmd: '/help', desc: 'Ver todos os comandos e atalhos de teclado (Alt+H)', needsArg: false, tag: 'agy' },
];

const PREFS_KEY = 'neon_obsidian_prism_prefs_v2';

function loadPrefs() {
  const defaults = {
    palette: 'obsidian',
    accent: 'follow',
    petMode: 'quad', // 'quad' (4) | 'crab' (2) | 'off' (0)
    aura: '1',
    viewMode: 'studio',
  };
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    const merged = { ...defaults, ...saved };
    if (!['quad', 'crab', 'off'].includes(merged.petMode)) merged.petMode = 'quad';
    return merged;
  } catch {
    return defaults;
  }
}

function savePrefs(p) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

const state = {
  prefs: loadPrefs(),
  meta: null,
  telemetry: null,
  agents: [],
  conversations: [],
  currentConvId: null,
  agyConversationId: null,
  currentSlug: null,
  currentAgent: null,
  history: [],
  dirty: false,
  sessionId: null,
  sessionStarted: false,
  promptStale: false,
  streaming: false,
  needsContextSeed: false,
  messages: [],
  queuedMessages: [],
  queueCollapsed: false,
  manualAbort: false,
  steeringNext: null,
  pendingAttachments: [],
  activeModel: 'gemini-4-neon-xhigh',
  activeCwd: '',
  activeMode: 'full',
  contextSize: MAX_CONTEXT_TOKENS,
  lastBtwAnswer: '',
  skills: [],
  skillsFilter: 'all',
  pinnedSkillsByAgent: (() => {
    try { return JSON.parse(localStorage.getItem('obsidian_studio_pinned_skills_v1') || '{}') || {}; }
    catch { return {}; }
  })(),
  acpCommands: [],
  acpTier: null,
  lastUsage: null,
  lastTps: 0,
  lastTtft: 0,
  abortController: null,
  slashIndex: 0,
  activeTurnDom: null,
  thinkingTimer: 0,
};

let prism = null;

// Contenteditable Composer Helpers (paired with real Obsidian Prism smooth-caret.js!)
function getChatInputText() {
  if (!el.chatInput) return '';
  return (el.chatInput.innerText || '').replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ');
}

function syncChatInputEmpty() {
  if (!el.chatInput) return;
  const txt = getChatInputText().replace(/\n$/, '');
  const empty = txt.trim().length === 0 && !txt.includes('\n');
  el.chatInput.setAttribute('data-empty', empty ? '1' : '0');
  if (empty && el.chatInput.innerHTML === '<br>') {
    el.chatInput.innerHTML = '';
  }
}

function setChatInputText(str) {
  if (!el.chatInput) return;
  el.chatInput.textContent = str || '';
  syncChatInputEmpty();
  // Move caret to end
  if (str) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el.chatInput);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  prism?.queueCaret({ typing: false, refreshMetrics: true });
}

const el = {
  brandLogoSlot: document.getElementById('brandLogoSlot'),
  sidebar: document.getElementById('sidebar'),
  collapseSidebarBtn: document.getElementById('collapseSidebarBtn'),
  expandSidebarBtn: document.getElementById('expandSidebarBtn'),
  modeSwitch: document.querySelector('.mode-switch'),
  viewStudioBtn: document.getElementById('viewStudioBtn'),
  viewChatBtn: document.getElementById('viewChatBtn'),
  sidebarNewChatBtn: document.getElementById('sidebarNewChatBtn'),
  convSearchInput: document.getElementById('convSearchInput'),
  convCountBadge: document.getElementById('convCountBadge'),
  convList: document.getElementById('convList'),
  openAppearanceBtn: document.getElementById('openAppearanceBtn'),
  paletteTag: document.getElementById('paletteTag'),
  exportConvBtn: document.getElementById('exportConvBtn'),
  agentTriggerBtn: document.getElementById('agentTriggerBtn'),
  agentTriggerLabel: document.getElementById('agentTriggerLabel'),
  agentPopover: document.getElementById('agentPopover'),
  agentSearchInput: document.getElementById('agentSearchInput'),
  agentPopoverList: document.getElementById('agentPopoverList'),
  popoverNewAgentBtn: document.getElementById('popoverNewAgentBtn'),
  sessionStatusChip: document.getElementById('sessionStatusChip'),
  staleChip: document.getElementById('staleChip'),
  copyCliBtn: document.getElementById('copyCliBtn'),
  toggleEditorBtn: document.getElementById('toggleEditorBtn'),
  editorPane: document.getElementById('editorPane'),
  resizer: document.getElementById('resizer'),
  dirtyBadge: document.getElementById('dirtyBadge'),
  savedBadge: document.getElementById('savedBadge'),
  templateTriggerBtn: document.getElementById('templateTriggerBtn'),
  templatePopover: document.getElementById('templatePopover'),
  historyTriggerBtn: document.getElementById('historyTriggerBtn'),
  historyPopover: document.getElementById('historyPopover'),
  toggleConfigBtn: document.getElementById('toggleConfigBtn'),
  configDrawer: document.getElementById('configDrawer'),
  agentFilePath: document.getElementById('agentFilePath'),
  deleteAgentBtn: document.getElementById('deleteAgentBtn'),
  agentDescInput: document.getElementById('agentDescInput'),
  cwdInput: document.getElementById('cwdInput'),
  toolToggles: document.getElementById('toolToggles'),
  systemPromptEditor: document.getElementById('systemPromptEditor'),
  editorStats: document.getElementById('editorStats'),
  savePromptBtn: document.getElementById('savePromptBtn'),
  saveRestartBtn: document.getElementById('saveRestartBtn'),
  chatSeat: document.getElementById('chatSeat'),
  chatMessages: document.getElementById('chatMessages'),
  composerStage: document.getElementById('composerStage'),
  composerCard: document.getElementById('composerCard'),
  mascotStage: document.getElementById('mascotStage'),
  slashMenu: document.getElementById('slashMenu'),
  modelTriggerBtn: document.getElementById('modelTriggerBtn'),
  modelTriggerGlyph: document.getElementById('modelTriggerGlyph'),
  modelTriggerName: document.getElementById('modelTriggerName'),
  effortBadge: document.getElementById('effortBadge'),
  modelPopover: document.getElementById('modelPopover'),
  modelFamilyList: document.getElementById('modelFamilyList'),
  orchPlannerRow: document.getElementById('orchPlannerRow'),
  orchPlannerPills: document.getElementById('orchPlannerPills'),
  effortValueLabel: document.getElementById('effortValueLabel'),
  effortRow: document.getElementById('effortRow'),
  effortSliderHost: document.getElementById('effortSliderHost'),
  crystalTrack: document.getElementById('crystalTrack'),
  headerAccountBtn: document.getElementById('headerAccountBtn'),
  headerAccountLabel: document.getElementById('headerAccountLabel'),
  accountsModal: document.getElementById('accountsModal'),
  openAccountsBtn: document.getElementById('openAccountsBtn'),
  closeAccountsBtn: document.getElementById('closeAccountsBtn'),
  accountsList: document.getElementById('accountsList'),
  accountTag: document.getElementById('accountTag'),
  reconnectAccountBtn: document.getElementById('reconnectAccountBtn'),
  googleSwitchBtn: document.getElementById('googleSwitchBtn'),
  acctTypePills: document.getElementById('acctTypePills'),
  acctName: document.getElementById('acctName'),
  acctKey: document.getElementById('acctKey'),
  acctBaseUrl: document.getElementById('acctBaseUrl'),
  acctProject: document.getElementById('acctProject'),
  acctLocation: document.getElementById('acctLocation'),
  acctSaveBtn: document.getElementById('acctSaveBtn'),
  acctAddDetails: document.getElementById('acctAddDetails'),
  crystalSliderWrap: document.getElementById('crystalSliderWrap'),
  crystalBarCanvas: document.getElementById('crystalBarCanvas'),
  modeTriggerBtn: document.getElementById('modeTriggerBtn'),
  modeTriggerDot: document.getElementById('modeTriggerDot'),
  modeTriggerLabel: document.getElementById('modeTriggerLabel'),
  modePopover: document.getElementById('modePopover'),
  skillsTriggerBtn: document.getElementById('skillsTriggerBtn'),
  skillsCountBadge: document.getElementById('skillsCountBadge'),
  skillsPopover: document.getElementById('skillsPopover'),
  skillsTotalBadge: document.getElementById('skillsTotalBadge'),
  skillsSearchInput: document.getElementById('skillsSearchInput'),
  skillsFilterPills: document.getElementById('skillsFilterPills'),
  skillsPopoverList: document.getElementById('skillsPopoverList'),
  clearPinnedSkillsBtn: document.getElementById('clearPinnedSkillsBtn'),
  activeSkillsStrip: document.getElementById('activeSkillsStrip'),
  btwCard: document.getElementById('btwCard'),
  btwQuestionLabel: document.getElementById('btwQuestionLabel'),
  btwMetaLabel: document.getElementById('btwMetaLabel'),
  btwBody: document.getElementById('btwBody'),
  btwCopyBtn: document.getElementById('btwCopyBtn'),
  btwCloseBtn: document.getElementById('btwCloseBtn'),
  helpModal: document.getElementById('helpModal'),
  closeHelpBtn: document.getElementById('closeHelpBtn'),
  voiceMicBtn: document.getElementById('voiceMicBtn'),
  voiceLiveBar: document.getElementById('voiceLiveBar'),
  voiceLangLabel: document.getElementById('voiceLangLabel'),
  voiceLangBtn: document.getElementById('voiceLangBtn'),
  voiceTimerLabel: document.getElementById('voiceTimerLabel'),
  voiceEqBars: document.getElementById('voiceEqBars'),
  voiceInterimLabel: document.getElementById('voiceInterimLabel'),
  voiceCancelBtn: document.getElementById('voiceCancelBtn'),
  voiceStopBtn: document.getElementById('voiceStopBtn'),
  voiceSendBtn: document.getElementById('voiceSendBtn'),
  telemetryTrigger: document.getElementById('telemetryTrigger'),
  liveTpsLabel: document.getElementById('liveTpsLabel'),
  liveCacheLabel: document.getElementById('liveCacheLabel'),
  ctxRingFg: document.getElementById('ctxRingFg'),
  liveCtxPct: document.getElementById('liveCtxPct'),
  vialPopover: document.getElementById('vialPopover'),
  vialCanvas: document.getElementById('vialCanvas'),
  vialDragHandle: document.getElementById('vialDragHandle'),
  vialCapLabel: document.getElementById('vialCapLabel'),
  vialPctLabel: document.getElementById('vialPctLabel'),
  vialStateLabel: document.getElementById('vialStateLabel'),
  vialModelRoute: document.getElementById('vialModelRoute'),
  vialTtft: document.getElementById('vialTtft'),
  vialTps: document.getElementById('vialTps'),
  vialUsedSummary: document.getElementById('vialUsedSummary'),
  segSys: document.getElementById('segSys'),
  segConv: document.getElementById('segConv'),
  segThink: document.getElementById('segThink'),
  vialSysTok: document.getElementById('vialSysTok'),
  vialInTok: document.getElementById('vialInTok'),
  vialThinkTok: document.getElementById('vialThinkTok'),
  vialCacheTok: document.getElementById('vialCacheTok'),
  vialTotalSaved: document.getElementById('vialTotalSaved'),
  vialResetBtn: document.getElementById('vialResetBtn'),
  pendingAttachments: document.getElementById('pendingAttachments'),
  fileInput: document.getElementById('fileInput'),
  attachBtn: document.getElementById('attachBtn'),
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('sendBtn'),
  stopBtn: document.getElementById('stopBtn'),
  queueAddBtn: document.getElementById('queueAddBtn'),
  sendNowBtn: document.getElementById('sendNowBtn'),
  queuedMessagesCard: document.getElementById('queuedMessagesCard'),
  queuedHead: document.getElementById('queuedHead'),
  queuedCountBadge: document.getElementById('queuedCountBadge'),
  queuedSubtitle: document.getElementById('queuedSubtitle'),
  queuedToggleBtn: document.getElementById('queuedToggleBtn'),
  queuedList: document.getElementById('queuedList'),
  newAgentModal: document.getElementById('newAgentModal'),
  newAgentForm: document.getElementById('newAgentForm'),
  newAgentName: document.getElementById('newAgentName'),
  newAgentDesc: document.getElementById('newAgentDesc'),
  newAgentPrompt: document.getElementById('newAgentPrompt'),
  closeNewAgentBtn: document.getElementById('closeNewAgentBtn'),
  cancelNewAgentBtn: document.getElementById('cancelNewAgentBtn'),
  appearanceModal: document.getElementById('appearanceModal'),
  closeAppearanceBtn: document.getElementById('closeAppearanceBtn'),
  doneAppearanceBtn: document.getElementById('doneAppearanceBtn'),
  paletteSwatches: document.getElementById('paletteSwatches'),
  accentPills: document.getElementById('accentPills'),
  petModePills: document.getElementById('petModePills'),
  auraPills: document.getElementById('auraPills'),
  toastContainer: document.getElementById('toastContainer'),
};

function toast(message, type = 'ok') {
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.textContent = message;
  el.toastContainer.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transition = 'opacity 180ms ease';
    setTimeout(() => div.remove(), 200);
  }, 2800);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro HTTP ${res.status}`);
  return data;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtCompact(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}

// ── Model Family & Effort Resolution ──────────────────────────────────────────
function resolveModelInfo(modelId) {
  const id = String(modelId || 'gemini-4-neon-xhigh');
  if (id.startsWith('gemini-pro-orchestrator')) {
    const fam = MODEL_FAMILIES.find((f) => f.id === 'orchestrator');
    const planner = id.endsWith('-neon') ? 'Neon' : id.endsWith('-argon') ? 'Argon' : 'Carbon';
    return { family: fam, effort: 'auto', planner, label: `Orchestrator (${planner})`, camp: 'gemini', isOrchestrator: true };
  }
  const m = id.match(/^(.*?)-(low|medium|high|xhigh)$/);
  const base = m ? m[1] : id;
  const effort = m ? m[2] : 'medium';
  const fam = MODEL_FAMILIES.find((f) => f.id === base) || {
    id: base,
    name: base,
    desc: '',
    camp: base.includes('claude') ? 'claude' : 'gemini',
    icon: base.includes('claude') ? CLAUDE_SPARK_SVG : GEMINI_SPARK_SVG,
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'high',
  };
  return { family: fam, effort, label: fam.name, camp: fam.camp, isOrchestrator: false };
}

function syncModelUI() {
  const info = resolveModelInfo(state.activeModel);
  el.modelTriggerGlyph.innerHTML = info.family.icon;
  el.modelTriggerName.textContent = info.label;

  const badgeMap = { low: 'LOW', medium: 'MED', high: 'HIGH', xhigh: 'EXTRA', auto: 'AUTO' };
  const labelMap = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra', auto: 'Auto' };
  el.effortBadge.textContent = badgeMap[info.effort] || 'EXTRA';
  el.effortBadge.dataset.tier = info.effort || 'xhigh';
  el.effortValueLabel.textContent = labelMap[info.effort] || 'Extra';
  el.effortValueLabel.dataset.tier = info.effort || 'xhigh';

  // Render family list inside Model Popover
  el.modelFamilyList.innerHTML = MODEL_FAMILIES.map((fam) => {
    const active = fam.id === info.family.id;
    const pill = fam.isOrchestrator
      ? 'AUTO'
      : fam.efforts.includes('xhigh')
      ? 'EXTRA'
      : 'HIGH';
    return `
      <button type="button" class="model-fam-row ${active ? 'active' : ''}" data-family="${fam.id}">
        <span class="model-fam-left">
          <span class="model-fam-icon">${fam.icon}</span>
          <span class="model-fam-text">
            <span class="model-fam-name">${escapeHtml(fam.name)}</span>
            <span class="model-fam-desc">${escapeHtml(fam.desc)}</span>
          </span>
        </span>
        <span class="model-fam-badge mono">${pill}</span>
      </button>
    `;
  }).join('');

  el.modelFamilyList.querySelectorAll('[data-family]').forEach((btn) => {
    btn.addEventListener('click', () => selectModelFamily(btn.dataset.family));
  });

  // Toggle Orchestrator Cut-Crystal bar vs REAL Obsidian Prism Effort Slider
  const isOrch = info.isOrchestrator;
  const menuOpen = !el.modelPopover.classList.contains('hidden');
  el.orchPlannerRow.classList.toggle('hidden', !isOrch);
  el.effortRow.classList.toggle('hidden', isOrch);
  el.crystalSliderWrap.classList.toggle('hidden', !isOrch);

  if (isOrch) {
    unmountEffortSlider();
    el.orchPlannerPills.querySelectorAll('[data-orch]').forEach((b) => {
      b.classList.toggle('active', b.dataset.orch === state.activeModel);
    });
    if (menuOpen) {
      prism?.mountCrystalBar(el.crystalBarCanvas);
    }
  } else {
    prism?.disposeCrystalBar();
    el.effortValueLabel.dataset.tier = info.effort;
    if (menuOpen) {
      if (!effortSliderMount) mountEffortSlider();
      else notifyEffortSeat();
    }
  }

  syncMascotsNow();
  updateOpticsReadout();
}

// ── REAL Obsidian Prism Effort Slider (mountCodexEffortSlider from vendor/effort-slider) ──
const EFFORT_LABELS = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra', max: 'Max' };
const effortSeatListeners = new Set();
let effortSliderMount = null;
let sliderDragging = false;
let sliderDragGuardUntil = 0;

const effortSeat = {
  _read() {
    const info = resolveModelInfo(state.activeModel);
    const efforts = info.isOrchestrator ? [] : (info.family.efforts || ['low', 'medium', 'high']);
    return {
      effortLevels: efforts.map((e) => ({ effort: e, label: EFFORT_LABELS[e] || e })),
      currentEffort: info.effort,
      baseName: info.family?.name || '',
      isClaude: info.camp === 'claude',
      locked: info.isOrchestrator || efforts.length <= 1,
    };
  },
  subscribe(fn) {
    effortSeatListeners.add(fn);
    return () => effortSeatListeners.delete(fn);
  },
  selectEffort(raw) {
    const key = typeof raw === 'object' && raw ? raw.effort : raw;
    selectEffort(String(key || ''), true).catch((err) => toast(err.message, 'error'));
  },
  formatEffortLabel: (k) => EFFORT_LABELS[k] || k,
};

function notifyEffortSeat() {
  effortSeatListeners.forEach((fn) => { try { fn(); } catch {} });
}

function unmountEffortSlider() {
  if (!effortSliderMount) return;
  try { effortSliderMount.unmount?.(); } catch {}
  effortSliderMount = null;
}

function mountEffortSlider() {
  const lib = window.AntigravityCodexEffortSlider;
  if (!lib?.mountCodexEffortSlider || !el.effortSliderHost) {
    console.warn('[Studio] Obsidian Prism effort slider not available');
    return;
  }
  unmountEffortSlider();
  effortSliderMount = lib.mountCodexEffortSlider({
    container: el.effortSliderHost,
    row: el.effortRow,
    valueElement: el.effortValueLabel,
    seat: effortSeat,
    document,
    window,
    onVisualChange: (v) => {
      try { prism?.notifyMascot?.('activity', {}); } catch {}
      if (v && !v.dragging && v.effort) el.effortValueLabel.dataset.tier = String(v.effort).toLowerCase();
    },
  });
}

function refreshEffortSlider() {
  try { effortSliderMount?.refresh?.(); } catch {}
}

async function syncLiveSessionConfig() {
  if (!state.sessionId) return;
  try {
    await api(`/api/sessions/${encodeURIComponent(state.sessionId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        model: state.activeModel,
        permissionMode: state.activeMode,
        enabledSkills: getPinnedSkills(),
      }),
    });
  } catch {
    // Session will pick up updated model/mode/skills on next turn if not yet created
  }
}

function getPinnedSkills(slug = state.currentSlug) {
  const key = slug || 'neon-agent';
  const arr = state.pinnedSkillsByAgent[key];
  return Array.isArray(arr) ? arr : [];
}

function savePinnedSkills(nextList, slug = state.currentSlug) {
  const key = slug || 'neon-agent';
  state.pinnedSkillsByAgent[key] = Array.from(new Set(nextList)).slice(0, 12);
  try {
    localStorage.setItem('obsidian_studio_pinned_skills_v1', JSON.stringify(state.pinnedSkillsByAgent));
  } catch {}
  renderActiveSkillsStrip();
  renderSkillsPopover();
  syncLiveSessionConfig();
}

function togglePinSkill(skillName) {
  const cur = getPinnedSkills();
  const exists = cur.includes(skillName);
  const next = exists ? cur.filter((s) => s !== skillName) : [...cur, skillName];
  savePinnedSkills(next);
  toast(exists ? `Skill removida: ${skillName}` : `Skill fixada na sessão ACP: ${skillName}`, 'ok');
}

function renderActiveSkillsStrip() {
  const pinned = getPinnedSkills();
  if (el.skillsCountBadge) {
    el.skillsCountBadge.textContent = String(pinned.length);
    el.skillsCountBadge.classList.toggle('hidden', pinned.length === 0);
  }
  if (el.clearPinnedSkillsBtn) {
    el.clearPinnedSkillsBtn.classList.toggle('hidden', pinned.length === 0);
  }
  if (!el.activeSkillsStrip) return;
  el.activeSkillsStrip.classList.toggle('hidden', pinned.length === 0);
  el.activeSkillsStrip.innerHTML = pinned
    .map(
      (name) => `
      <span class="active-skill-chip mono">
        <span>⚡ ${escapeHtml(name)}</span>
        <button type="button" data-unpin-skill="${escapeHtml(name)}" title="Remover skill da sessão">✕</button>
      </span>`
    )
    .join('');
  el.activeSkillsStrip.querySelectorAll('[data-unpin-skill]').forEach((btn) => {
    btn.addEventListener('click', () => togglePinSkill(btn.dataset.unpinSkill));
  });
}

async function loadInstalledSkills() {
  try {
    const q = state.activeCwd ? `?cwd=${encodeURIComponent(state.activeCwd)}` : '';
    const data = await api(`/api/skills${q}`);
    state.skills = data.skills || [];
    if (el.skillsTotalBadge) el.skillsTotalBadge.textContent = `${state.skills.length} skills`;
    renderActiveSkillsStrip();
    if (!el.skillsPopover?.classList.contains('hidden')) renderSkillsPopover();
  } catch {}
}

function renderSkillsPopover() {
  if (!el.skillsPopoverList) return;
  const q = (el.skillsSearchInput?.value || '').trim().toLowerCase();
  const pinned = new Set(getPinnedSkills());
  const filter = state.skillsFilter || 'all';
  const sourceLabel = { user: 'minha', workspace: 'workspace', plugin: 'plugin', builtin: 'builtin' };

  const filtered = (state.skills || []).filter((s) => {
    if (filter === 'pinned' && !pinned.has(s.name)) return false;
    if (filter !== 'all' && filter !== 'pinned' && s.source !== filter) return false;
    if (q && !s.name.toLowerCase().includes(q) && !String(s.description || '').toLowerCase().includes(q)) return false;
    return true;
  });

  if (el.skillsTotalBadge) el.skillsTotalBadge.textContent = `${filtered.length} / ${state.skills.length}`;
  if (!filtered.length) {
    el.skillsPopoverList.innerHTML = '<div class="conv-empty">Nenhuma skill encontrada.</div>';
    return;
  }

  el.skillsPopoverList.innerHTML = filtered
    .map((s) => {
      const isPinned = pinned.has(s.name);
      return `
        <div class="skill-row ${isPinned ? 'pinned' : ''}" data-skill-row="${escapeHtml(s.name)}">
          <button type="button" class="skill-main-btn" data-toggle-skill="${escapeHtml(s.name)}" title="${isPinned ? 'Desafixar da sessão' : 'Fixar skill na sessão ACP'}">
            <span class="skill-check">${isPinned ? '✓' : ''}</span>
            <span class="skill-meta">
              <span class="skill-title-line">
                <strong class="mono">${escapeHtml(s.name)}</strong>
                <span class="skill-src-tag mono src-${escapeHtml(s.source)}">${escapeHtml(sourceLabel[s.source] || s.source)}</span>
              </span>
              <small>${escapeHtml(s.description || s.filePath || 'Skill do Antigravity')}</small>
            </span>
          </button>
          <button type="button" class="skill-invoke-btn mono" data-invoke-skill="${escapeHtml(s.name)}" title="Inserir /${escapeHtml(s.name)} no chat">/ Usar</button>
        </div>`;
    })
    .join('');

  el.skillsPopoverList.querySelectorAll('[data-toggle-skill]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePinSkill(btn.dataset.toggleSkill);
    });
  });
  el.skillsPopoverList.querySelectorAll('[data-invoke-skill]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.invokeSkill;
      closeAllPopovers();
      const cur = getChatInputText().trim();
      setChatInputText(cur ? `/${name} ${cur}` : `/${name} `);
      el.chatInput.focus();
      syncComposerActionButtons();
      prism?.queueCaret({ typing: false, refreshMetrics: true });
    });
  });
}

async function selectModelFamily(familyId) {
  const fam = MODEL_FAMILIES.find((f) => f.id === familyId);
  if (!fam) return;
  let nextModel;
  if (fam.isOrchestrator) {
    nextModel = fam.defaultModelId;
  } else {
    const curEffort = resolveModelInfo(state.activeModel).effort;
    const eff = fam.efforts.includes(curEffort) ? curEffort : fam.defaultEffort;
    nextModel = `${fam.id}-${eff}`;
  }
  state.activeModel = nextModel;
  syncModelUI();
  await syncLiveSessionConfig();
  toast(`Modelo ativo (ACP ao vivo): ${resolveModelInfo(nextModel).label}`, 'ok');
}

async function selectEffort(effort, notify = false) {
  const info = resolveModelInfo(state.activeModel);
  if (info.isOrchestrator) return;
  const fam = info.family;
  if (!fam.efforts.includes(effort)) return;
  const nextModel = `${fam.id}-${effort}`;
  const changed = nextModel !== state.activeModel;
  state.activeModel = nextModel;
  syncModelUI();
  if (changed) {
    await syncLiveSessionConfig();
    if (notify) {
      const lbl = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra' }[effort] || effort;
      toast(`Raciocínio (ACP ao vivo): ${fam.name} · ${lbl}`, 'ok');
    }
  }
}

// ── Popover Orchestration (With Real Motion Engine Spring!) ───────────────────
const ALL_POPOVERS = ['modelPopover', 'modePopover', 'skillsPopover', 'vialPopover', 'agentPopover', 'templatePopover', 'historyPopover'];

function closeAllPopovers(exceptKey = null) {
  for (const key of ALL_POPOVERS) {
    if (key === exceptKey) continue;
    el[key]?.classList.add('hidden');
  }
  el.modelTriggerBtn.classList.toggle('open', exceptKey === 'modelPopover');
  el.modeTriggerBtn.classList.toggle('open', exceptKey === 'modePopover');
  el.skillsTriggerBtn?.classList.toggle('open', exceptKey === 'skillsPopover');
  el.telemetryTrigger.classList.toggle('open', exceptKey === 'vialPopover');
  document.documentElement.toggleAttribute('data-ag-cs-model-menu', exceptKey === 'modelPopover');
  document.documentElement.toggleAttribute('data-ag-pp-open', exceptKey === 'vialPopover');
  if (exceptKey !== 'modelPopover') {
    unmountEffortSlider();
    prism?.disposeCrystalBar();
  }
  if (exceptKey !== 'vialPopover') prism?.setVialOpen?.(false);
}

function togglePopover(key) {
  const pop = el[key];
  if (!pop) return;
  const opening = pop.classList.contains('hidden');
  closeAllPopovers(opening ? key : null);
  if (!opening) return;

  pop.classList.remove('hidden');
  prism?.animatePopoverIn(pop);

  if (key === 'modelPopover') {
    syncModelUI();
    const info = resolveModelInfo(state.activeModel);
    if (info.isOrchestrator) {
      requestAnimationFrame(() => prism?.mountCrystalBar(el.crystalBarCanvas));
    } else {
      requestAnimationFrame(() => {
        if (!el.modelPopover.classList.contains('hidden')) {
          mountEffortSlider();
          refreshEffortSlider();
        }
      });
    }
  } else if (key === 'vialPopover') {
    prism?.mountVial(el.vialCanvas);
    prism?.setVialOpen?.(true);
    updateOpticsReadout();
    prism?.getVial()?.impulse?.(1.55);
    prism?.getVial()?.tilt?.(0.18);
  } else if (key === 'skillsPopover') {
    if (el.skillsSearchInput) el.skillsSearchInput.value = '';
    renderSkillsPopover();
    setTimeout(() => el.skillsSearchInput?.focus(), 20);
  } else if (key === 'agentPopover') {
    el.agentSearchInput.value = '';
    renderAgentPopover();
    setTimeout(() => el.agentSearchInput.focus(), 20);
  } else if (key === 'templatePopover') {
    renderTemplatePopover();
  } else if (key === 'historyPopover') {
    renderHistoryPopover();
  }
}

// ── Real Prefs, Palettes, & Mascots Sync ──────────────────────────────────────
function syncMascotsNow() {
  const info = resolveModelInfo(state.activeModel);
  const qVis = el.queuedMessagesCard && !el.queuedMessagesCard.classList.contains('hidden');
  const bVis = el.btwCard && !el.btwCard.classList.contains('hidden');
  let stackH = 0;
  if (qVis) stackH += (el.queuedMessagesCard.offsetHeight || 0) + 8;
  if (bVis) stackH += (el.btwCard.offsetHeight || 0) + 8;
  const leapY = stackH > 0 ? Math.max(44, stackH) : 0;
  prism?.syncMascots({
    camp: info.camp,
    mascot: state.prefs.petMode, // 'quad' (4) | 'crab' (2) | 'off' (0)
    streaming: state.streaming,
    streamTier: info.effort === 'xhigh' || info.effort === 'high' || info.isOrchestrator ? 3 : 2,
    hasError: false,
    yieldMode: stackH > 0 ? 'leap' : 'none',
    leapOffsetY: leapY,
    orchestrator: info.isOrchestrator,
  });
}

function applyPrefs() {
  const p = state.prefs;
  const isLight = p.palette === 'crystal' || p.palette === 'alabaster';
  document.documentElement.dataset.palette = p.palette;
  document.documentElement.dataset.theme = isLight ? 'light' : 'dark';

  const palLabels = { obsidian: 'Obsidian', warm: 'Warm', crystal: 'Crystal', alabaster: 'Alabaster' };
  const petCount = p.petMode === 'quad' ? '4' : p.petMode === 'crab' ? '2' : 'Off';
  el.paletteTag.textContent = `${palLabels[p.palette] || 'Obsidian'} · ${petCount}`;

  const showEditor = p.viewMode !== 'chat';
  el.editorPane.classList.toggle('hidden-pane', !showEditor);
  el.resizer.classList.toggle('hidden', !showEditor);
  el.modeSwitch.classList.toggle('chat-mode', !showEditor);
  el.viewStudioBtn.classList.toggle('active', showEditor);
  el.viewChatBtn.classList.toggle('active', !showEditor);
  el.toggleEditorBtn.classList.toggle('active', showEditor);

  el.paletteSwatches.querySelectorAll('[data-palette]').forEach((b) => {
    b.classList.toggle('active', b.dataset.palette === p.palette);
  });
  el.accentPills.querySelectorAll('[data-accent]').forEach((b) => {
    b.classList.toggle('active', b.dataset.accent === p.accent);
  });
  el.petModePills.querySelectorAll('[data-pet-mode]').forEach((b) => {
    b.classList.toggle('active', b.dataset.petMode === p.petMode);
  });
  el.auraPills.querySelectorAll('[data-aura]').forEach((b) => {
    b.classList.toggle('active', b.dataset.aura === String(p.aura));
  });

  savePrefs(p);
  prism?.syncVisuals();
  syncMascotsNow();
  requestAnimationFrame(() => prism?.markRimDirty());
}

// ── Telemetry & 512K Physical Vial Sync ───────────────────────────────────────
function updateOpticsReadout() {
  const sysTok = Math.ceil((el.systemPromptEditor.value || '').length / 4);
  const u = state.lastUsage || {};
  const inTok = Number(u.input_tokens || 0);
  const outTok = Number(u.output_tokens || 0);
  const thinkTok = Number(u.thinking_tokens || 0);
  const cacheTok = Number(u.cache_read_tokens || 0);
  const ctxMax = Math.max(64000, Number(u.context_size || state.contextSize || MAX_CONTEXT_TOKENS));
  const capLabel = ctxMax >= 1_000_000 ? `${Math.round(ctxMax / 1_000_000)}M` : `${Math.round(ctxMax / 1000)}K`;
  if (el.vialCapLabel) el.vialCapLabel.textContent = capLabel;
  const usedTotal = Math.max(sysTok, inTok + outTok);
  const ratio = Math.min(1, usedTotal / ctxMax);
  const pctStr = ratio < 0.1 ? (ratio * 100).toFixed(1) : String(Math.round(ratio * 100));
  const cacheHit = inTok + cacheTok > 0 ? Math.round((cacheTok / (inTok + cacheTok)) * 100) : 0;

  // Composer inline telemetry strip
  const circ = 46.5;
  el.ctxRingFg.style.strokeDashoffset = String(circ * (1 - Math.max(0.03, ratio)));
  el.liveCtxPct.textContent = `${pctStr}%`;
  el.liveTpsLabel.textContent = state.lastTps > 0 ? `${state.lastTps} tok/s` : '— tok/s';
  el.liveCacheLabel.textContent = cacheTok > 0 ? `Cache ${cacheHit}%` : 'ACP';

  // Physical Water Vial Popover
  el.vialPctLabel.textContent = `${pctStr}%`;
  el.vialStateLabel.textContent = state.streaming ? 'STREAMING' : 'IDLE';
  const info = resolveModelInfo(state.activeModel);
  el.vialModelRoute.textContent = `${info.label} → ${state.activeModel}`;
  el.vialTtft.textContent = state.lastTtft > 0 ? `TTFT ${state.lastTtft.toFixed(2)}s` : 'TTFT —';
  el.vialTps.textContent = state.lastTps > 0 ? `TPS ${state.lastTps} tok/s` : 'TPS —';
  el.vialUsedSummary.textContent = `${fmtCompact(usedTotal)} / ${capLabel.toLowerCase()}`;
  el.vialSysTok.textContent = `~${fmtCompact(sysTok)}`;
  el.vialInTok.textContent = fmtCompact(inTok);
  el.vialThinkTok.textContent = fmtCompact(thinkTok);
  el.vialCacheTok.textContent = cacheTok > 0 ? `${cacheHit}% (${fmtCompact(cacheTok)})` : 'ACP Live';
  el.vialTotalSaved.textContent = `${state.telemetry?.totalTurns || 0} turnos acumulados`;

  // 3-segment mini bar widths
  const sysPct = Math.max(2, Math.min(60, (sysTok / ctxMax) * 100 * 6));
  const convPct = Math.max(inTok > 0 ? 2 : 0, Math.min(70, (Math.max(0, inTok - sysTok) / ctxMax) * 100 * 6));
  const thinkPct = Math.max(thinkTok > 0 ? 2 : 0, Math.min(40, (thinkTok / ctxMax) * 100 * 6));
  el.segSys.style.width = `${sysPct}%`;
  el.segConv.style.width = `${convPct}%`;
  el.segThink.style.width = `${thinkPct}%`;

  const convTok = Math.max(0, inTok - sysTok);
  const segSum = Math.max(1, sysTok + convTok + thinkTok);
  prism?.updateVialState({
    fill: Math.max(0.08, ratio),
    maxTokens: ctxMax,
    streaming: state.streaming,
    camp: info.camp,
    ratios: [sysTok / segSum, convTok / segSum, thinkTok / segSum],
  });
}

// ── Enhanced Markdown Renderer (Tables + Foldable Code Blocks) ────────────────
function renderMarkdown(md) {
  const text = String(md ?? '').replace(/\r\n/g, '\n');
  const codeBlocks = [];

  const withPlaceholders = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || 'text', code: code.replace(/\n$/, '') });
    return `\u0000CODEBLOCK_${idx}\u0000`;
  });

  const lines = withPlaceholders.split('\n');
  const htmlParts = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
  };

  const inlineFmt = (raw) => {
    let s = escapeHtml(raw);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  };

  const renderCodeCard = (idx) => {
    const cb = codeBlocks[idx];
    const lc = cb.code.split('\n').length;
    const foldBtn = lc >= 22 ? `<button class="code-btn" type="button" data-fold-code="${idx}">Dobrar (${lc}L)</button>` : '';
    return `<div class="code-card" data-code-card="${idx}"><div class="code-card-head"><span class="mono">${escapeHtml(cb.lang)}</span><div class="code-head-btns">${foldBtn}<button class="code-btn" type="button" data-copy-code="${idx}">Copiar</button></div></div><pre><code>${escapeHtml(cb.code)}</code></pre></div>`;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cbMatch = line.match(/^\u0000CODEBLOCK_(\d+)\u0000$/);
    if (cbMatch) { closeLists(); htmlParts.push(renderCodeCard(Number(cbMatch[1]))); continue; }

    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s|:-]+\s*$/.test(lines[i + 1])) {
      closeLists();
      const parseRow = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inlineFmt(c.trim()));
      const headers = parseRow(line);
      i += 1;
      const rows = [];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) { i += 1; rows.push(parseRow(lines[i])); }
      htmlParts.push(`<div class="md-table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }

    if (!line.trim()) { closeLists(); continue; }
    const hMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) { closeLists(); htmlParts.push(`<h${hMatch[1].length}>${inlineFmt(hMatch[2])}</h${hMatch[1].length}>`); continue; }
    const bqMatch = line.match(/^>\s?(.*)$/);
    if (bqMatch) { closeLists(); htmlParts.push(`<blockquote>${inlineFmt(bqMatch[1])}</blockquote>`); continue; }
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (!inUl) { htmlParts.push('<ul>'); inUl = true; }
      htmlParts.push(`<li>${inlineFmt(ulMatch[1])}</li>`);
      continue;
    }
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (!inOl) { htmlParts.push('<ol>'); inOl = true; }
      htmlParts.push(`<li>${inlineFmt(olMatch[1])}</li>`);
      continue;
    }
    closeLists();
    htmlParts.push(`<p>${inlineFmt(line).replace(/\u0000CODEBLOCK_(\d+)\u0000/g, (_, idxStr) => renderCodeCard(Number(idxStr)))}</p>`);
  }
  closeLists();
  return { html: htmlParts.join('\n'), codeBlocks };
}

// ── Studio Home Panel & Chat Rendering ────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function renderStudioHome() {
  el.chatSeat.classList.add('agy-home');
  el.chatMessages.removeAttribute('data-testid');
  prism?.syncConvAura(null);
  prism?.syncRipple();

  const t = state.telemetry || { totalTokens: 0, totalTurns: 0, totalThinkingTokens: 0, totalCacheReadTokens: 0, totalInputTokens: 0, daily: {} };
  const daily = t.daily || {};
  const cells = [];
  const today = new Date();
  for (let offset = 41; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const rec = daily[key];
    let lv = '';
    if (rec && rec.turns > 0) {
      if (rec.turns >= 10 || rec.tokens > 200000) lv = 'lv4';
      else if (rec.turns >= 5 || rec.tokens > 80000) lv = 'lv3';
      else if (rec.turns >= 2 || rec.tokens > 25000) lv = 'lv2';
      else lv = 'lv1';
    }
    const tip = rec ? `${key}: ${rec.turns} turno(s) · ${fmtCompact(rec.tokens)} tokens` : `${key}: sem atividade`;
    cells.push(`<div class="hm-cell ${lv}" title="${escapeHtml(tip)}"></div>`);
  }

  const cacheDenom = (t.totalInputTokens || 0) + (t.totalCacheReadTokens || 0);
  const avgCache = cacheDenom > 0 ? Math.round((t.totalCacheReadTokens / cacheDenom) * 100) : 0;
  const toolsCount = (state.currentAgent?.tools || []).length;
  const userName = state.meta?.userName || 'Operator';

  el.chatMessages.innerHTML = `
    <div class="studio-home">
      <div class="home-greeting-row">
        <h1 class="home-greeting">${getGreeting()}, ${escapeHtml(userName)} — o que vamos construir?</h1>
        <div class="ready-badge mono">
          <span class="prism-dots">
            <i style="background:#4285F4;"></i>
            <i style="background:#9B72CB;"></i>
            <i style="background:#EA4335;"></i>
            <i style="background:#FBBC04;"></i>
          </span>
          WORKSPACE READY
        </div>
      </div>

      <div class="studio-card" data-ag-cs-prism-box="1" data-ag-cs-prism-mirror="1">
        <div>
          <div class="studio-col-title">
            <span>Trajetória de Atividade</span>
            <span class="mono">42 dias</span>
          </div>
          <div class="heatmap-grid">${cells.join('')}</div>
          <div class="studio-big-metric">${fmtCompact(t.totalTokens)} tokens processados</div>
          <div class="studio-sub-metric mono">
            ${t.totalTurns || 0} turnos · ${fmtCompact(t.totalThinkingTokens)} think · ${state.conversations.length} conversas
          </div>
        </div>

        <div>
          <div class="studio-col-title">
            <span>Telemetria do Agente</span>
            <span class="mono" style="color:var(--success);">● ONLINE</span>
          </div>
          <div class="pool-bars">
            <div>
              <div class="pool-item-head">
                <span class="pool-item-name">✦ ${escapeHtml(state.currentSlug || 'neon-agent')}</span>
                <span class="pool-item-val mono">${escapeHtml(resolveModelInfo(state.activeModel).label)}</span>
              </div>
              <div class="pool-track"><div class="pool-fill neon" style="width:100%;"></div></div>
            </div>

            <div>
              <div class="pool-item-head">
                <span class="pool-item-name">Cache de Contexto</span>
                <span class="pool-item-val mono">${avgCache}%</span>
              </div>
              <div class="pool-track"><div class="pool-fill cache" style="width:${Math.max(8, avgCache)}%;"></div></div>
            </div>

            <div>
              <div class="pool-item-head">
                <span class="pool-item-name">Ferramentas Nativas</span>
                <span class="pool-item-val mono">${toolsCount} ativas</span>
              </div>
              <div class="pool-track"><div class="pool-fill tools" style="width:${Math.min(100, Math.max(12, toolsCount * 7))}%;"></div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <button type="button" class="quick-card" data-starter="Qual é o seu papel e quais regras do seu System Prompt você está seguindo agora?">
          <strong>Testar System Prompt</strong>
          <span>Confirma suas instruções ativas do agent.md</span>
        </button>
        <button type="button" class="quick-card" data-starter="Liste os projetos da pasta atual usando suas ferramentas e faça um resumo objetivo.">
          <strong>Testar Ferramentas</strong>
          <span>Executa leitura real na pasta de trabalho</span>
        </button>
        <button type="button" class="quick-card" data-starter="Analise meu System Prompt atual e sugira 3 melhorias concretas para raciocínio em Extra High.">
          <strong>Refinar Prompt</strong>
          <span>Usa Gemini 4 Neon para lapidar suas regras</span>
        </button>
      </div>
    </div>
  `;

  el.chatMessages.querySelectorAll('[data-starter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setChatInputText(btn.dataset.starter);
      sendMessage();
    });
  });

  requestAnimationFrame(() => prism?.markRimDirty());
}

function createToolCardHtml(tool) {
  const statusClass = tool.error ? 'err' : tool.state === 'DONE' ? 'ok' : 'active';
  const statusLabel = tool.error ? 'erro' : tool.state === 'DONE' ? 'ok' : 'rodando';
  const dur = typeof tool.duration_seconds === 'number' ? `${tool.duration_seconds.toFixed(2)}s` : '';
  const paramsStr = tool.parameters ? JSON.stringify(tool.parameters, null, 2) : '';
  const outputStr = tool.output ? String(tool.output).slice(0, 3500) : tool.error ? JSON.stringify(tool.error, null, 2) : '';

  return `
    <details class="tool-card">
      <summary>
        <span style="display:flex;align-items:center;gap:8px;">
          <span class="tool-badge ${statusClass}">${statusLabel}</span>
          <span class="mono">${escapeHtml(tool.name)}</span>
        </span>
        <span class="mono" style="color:var(--muted-foreground);font-size:11px;">${escapeHtml(dur)}</span>
      </summary>
      <div class="tool-body">
        ${paramsStr ? `<div><strong>Parâmetros</strong><pre class="mono">${escapeHtml(paramsStr)}</pre></div>` : ''}
        ${outputStr ? `<div><strong>Saída</strong><pre class="mono">${escapeHtml(outputStr)}</pre></div>` : ''}
      </div>
    </details>
  `;
}

function bindMarkdownInteractions(mdDiv, codeBlocks) {
  mdDiv.querySelectorAll('[data-copy-code]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cb = codeBlocks[Number(btn.dataset.copyCode)];
      if (cb) {
        await navigator.clipboard.writeText(cb.code);
        btn.textContent = 'Copiado!';
        setTimeout(() => (btn.textContent = 'Copiar'), 1400);
      }
    });
  });

  mdDiv.querySelectorAll('[data-fold-code]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = mdDiv.querySelector(`[data-code-card="${btn.dataset.foldCode}"]`);
      if (!card) return;
      const folded = card.classList.toggle('folded');
      btn.textContent = folded ? 'Expandir' : 'Dobrar';
    });
  });
}

function buildThoughtHeaderSummary(msg) {
  if (msg.pending) {
    const info = resolveModelInfo(msg.model || state.activeModel);
    const tierLbl = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra High', auto: 'Orchestrator' }[info.effort] || 'Extra High';
    const secs = msg.elapsedSec ? ` · ${msg.elapsedSec.toFixed(1)}s` : '';
    return msg.statusText && msg.statusText.startsWith('Executando')
      ? `${msg.statusText}${secs}`
      : `Pensando em ${tierLbl}${secs}…`;
  }
  const parts = [];
  if (msg.durationSec) parts.push(`Pensou por ${msg.durationSec.toFixed(1)}s`);
  else parts.push(msg.agentName || state.currentSlug);
  if (msg.thinkingTokens > 0) parts.push(`${fmtCompact(msg.thinkingTokens)} think`);
  if (msg.tools?.length) parts.push(`${msg.tools.length} ferramenta${msg.tools.length > 1 ? 's' : ''}`);
  return parts.join(' · ');
}

function buildAssistantNode(msg, idx, isLast) {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg msg-assistant';

  // Collapsible Obsidian Prism Thinking / Worked-For Header
  const details = document.createElement('details');
  details.className = 'thought-collapsible';
  if (msg.tools?.length && msg.pending) details.open = true;

  const summary = document.createElement('summary');
  summary.className = `thought-trigger ${msg.pending ? 'streaming' : ''}`;
  summary.innerHTML = `
    <span class="thought-spark">✦</span>
    <span class="thought-label">${escapeHtml(buildThoughtHeaderSummary(msg))}</span>
    <span class="chevron" style="opacity:0.55;">▾</span>
  `;
  details.appendChild(summary);

  const thoughtBody = document.createElement('div');
  thoughtBody.className = 'thought-body';
  const metaRow = document.createElement('div');
  metaRow.className = 'thought-meta-grid mono';
  metaRow.innerHTML = `
    <span>Agente: <strong>${escapeHtml(msg.agentName || state.currentSlug)}</strong></span>
    <span>Modelo: <strong>${escapeHtml(msg.model || state.activeModel)}</strong></span>
    ${msg.metaText ? `<span>${escapeHtml(msg.metaText)}</span>` : ''}
  `;
  thoughtBody.appendChild(metaRow);

  const thoughtTextEl = document.createElement('div');
  thoughtTextEl.className = `thought-stream-box ${msg.thoughtText ? '' : 'hidden'}`;
  thoughtTextEl.textContent = msg.thoughtText || '';
  thoughtBody.appendChild(thoughtTextEl);

  const toolStack = document.createElement('div');
  toolStack.className = 'tool-stack';
  if (msg.tools?.length) {
    toolStack.innerHTML = msg.tools.map(createToolCardHtml).join('');
    thoughtBody.appendChild(toolStack);
  }
  details.appendChild(thoughtBody);
  wrapper.appendChild(details);

  // Live ACP Plan Checklist (when agent emits `plan` updates)
  const planEl = document.createElement('div');
  planEl.className = `acp-plan-card ${msg.plan?.length ? '' : 'hidden'}`;
  if (msg.plan?.length) planEl.innerHTML = renderPlanHtml(msg.plan);
  wrapper.appendChild(planEl);

  // Live ACP Interactive Permission Prompt Host (`session/request_permission`)
  const permHost = document.createElement('div');
  permHost.className = 'acp-perm-host';
  wrapper.appendChild(permHost);

  // Pure Editorial Canvas Response (NO boxy card border!)
  const contentEl = document.createElement('div');
  contentEl.className = `msg-assistant-content md ${msg.error ? 'error-surface' : ''}`;
  if (msg.text) {
    const { html, codeBlocks } = renderMarkdown(msg.text);
    contentEl.innerHTML = html;
    bindMarkdownInteractions(contentEl, codeBlocks);
  }
  wrapper.appendChild(contentEl);

  // Quiet Editorial Footer Actions
  const footer = document.createElement('div');
  footer.className = `msg-footer ${msg.pending ? 'hidden' : ''}`;
  footer.innerHTML = `
    <span class="mono footer-meta-span">${escapeHtml(msg.metaText || '')}</span>
    <div class="msg-actions">
      <button type="button" class="msg-action-btn" data-copy-msg>Copiar</button>
      ${isLast ? '<button type="button" class="msg-action-btn" data-regen-msg>↻ Regenerar</button>' : ''}
    </div>
  `;
  footer.querySelector('[data-copy-msg]')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(msg.text || '');
    toast('Resposta copiada em Markdown!', 'ok');
  });
  footer.querySelector('[data-regen-msg]')?.addEventListener('click', () => regenerateLast());
  wrapper.appendChild(footer);

  return {
    wrapper,
    details,
    summary,
    thoughtLabelEl: summary.querySelector('.thought-label'),
    thoughtBody,
    thoughtTextEl,
    metaRow,
    toolStack,
    planEl,
    permHost,
    contentEl,
    footer,
    footerMetaEl: footer.querySelector('.footer-meta-span'),
  };
}

function renderPlanHtml(entries) {
  const iconFor = (st) => (st === 'completed' ? '✓' : st === 'in_progress' ? '◎' : '○');
  return `
    <div class="acp-plan-head mono">✦ PLANO DE EXECUÇÃO (ACP)</div>
    <div class="acp-plan-list">
      ${entries.map((e) => `
        <div class="acp-plan-row status-${escapeHtml(e.status || 'pending')}">
          <span class="acp-plan-ico mono">${iconFor(e.status)}</span>
          <span>${escapeHtml(e.content || e.title || '')}</span>
        </div>`).join('')}
    </div>`;
}

function renderPermissionPromptCard(permHost, data) {
  if (!permHost) return;
  const card = document.createElement('div');
  card.className = 'acp-perm-card';
  const inputStr = data.rawInput
    ? (typeof data.rawInput === 'string' ? data.rawInput : JSON.stringify(data.rawInput, null, 2)).slice(0, 600)
    : '';
  const btnsHtml = (data.options || [])
    .map((o) => {
      const cls = String(o.kind || '').startsWith('reject') ? 'perm-deny' : o.kind === 'allow_always' ? 'perm-always' : 'perm-allow';
      return `<button type="button" class="btn btn-xs ${cls}" data-opt-id="${escapeHtml(o.optionId)}">${escapeHtml(o.name)}</button>`;
    })
    .join('');
  card.innerHTML = `
    <div class="acp-perm-head">
      <span class="acp-perm-badge mono">PERMISSÃO ACP · ${escapeHtml(data.kind || 'ação')}</span>
      <strong>${escapeHtml(data.title || 'Ação solicitada')}</strong>
    </div>
    ${inputStr ? `<pre class="acp-perm-pre mono">${escapeHtml(inputStr)}</pre>` : ''}
    <div class="acp-perm-actions">
      ${btnsHtml}
      <button type="button" class="btn btn-ghost btn-xs" data-opt-cancel="1">Cancelar</button>
    </div>`;

  const respond = async (payload, label) => {
    card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      await api(`/api/sessions/${encodeURIComponent(state.sessionId)}/permission`, {
        method: 'POST',
        body: JSON.stringify({ requestId: data.requestId, ...payload }),
      });
      card.classList.add('resolved');
      card.querySelector('.acp-perm-actions').innerHTML = `<span class="mono" style="font-size:11px;color:var(--muted-foreground);">✓ ${escapeHtml(label)}</span>`;
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  card.querySelectorAll('[data-opt-id]').forEach((b) => {
    b.addEventListener('click', () => respond({ optionId: b.dataset.optId }, b.textContent));
  });
  card.querySelector('[data-opt-cancel]')?.addEventListener('click', () => respond({ cancelled: true }, 'Cancelado'));

  permHost.appendChild(card);
  prism?.animatePopoverIn(card);
  el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

function updateActiveAssistantDom(msg, addedChars = 0) {
  const dom = state.activeTurnDom;
  if (!dom || !dom.wrapper.isConnected) return;

  dom.summary.classList.toggle('streaming', Boolean(msg.pending));
  dom.thoughtLabelEl.textContent = buildThoughtHeaderSummary(msg);

  if (msg.thoughtText && dom.thoughtTextEl) {
    dom.thoughtTextEl.classList.remove('hidden');
    dom.thoughtTextEl.textContent = msg.thoughtText;
  }

  if (msg.tools?.length) {
    dom.toolStack.innerHTML = msg.tools.map(createToolCardHtml).join('');
    if (!dom.toolStack.parentElement) dom.thoughtBody.appendChild(dom.toolStack);
  }

  if (msg.plan?.length && dom.planEl) {
    dom.planEl.classList.remove('hidden');
    dom.planEl.innerHTML = renderPlanHtml(msg.plan);
  }

  dom.contentEl.classList.toggle('error-surface', Boolean(msg.error));
  if (msg.text) {
    const { html, codeBlocks } = renderMarkdown(msg.text);
    dom.contentEl.innerHTML = html;
    bindMarkdownInteractions(dom.contentEl, codeBlocks);
    if (addedChars > 0 && msg.pending) {
      prism?.featherInkTail(dom.contentEl, addedChars);
    }
  }

  if (!msg.pending) {
    dom.metaRow.innerHTML = `
      <span>Agente: <strong>${escapeHtml(msg.agentName || state.currentSlug)}</strong></span>
      <span>Modelo: <strong>${escapeHtml(msg.model || state.activeModel)}</strong></span>
      ${msg.metaText ? `<span>${escapeHtml(msg.metaText)}</span>` : ''}
    `;
    dom.footerMetaEl.textContent = msg.metaText || '';
    dom.footer.classList.remove('hidden');
  }

  el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

function renderChatMessages(animateLast = false) {
  if (state.messages.length === 0) {
    state.activeTurnDom = null;
    renderStudioHome();
    return;
  }

  el.chatSeat.classList.remove('agy-home');
  el.chatMessages.setAttribute('data-testid', 'conversation-view');
  prism?.syncRipple();
  prism?.syncConvAura(el.chatMessages);

  el.chatMessages.innerHTML = '';
  state.activeTurnDom = null;

  state.messages.forEach((msg, idx) => {
    const isLast = idx === state.messages.length - 1;
    let wrapper;

    if (msg.role === 'user') {
      wrapper = document.createElement('div');
      wrapper.className = 'msg msg-user';
      const attHtml = msg.attachments?.length
        ? `<div class="msg-attach-row">${msg.attachments.map((a) => `<span class="attach-pill mono">📎 ${escapeHtml(a.name)}</span>`).join('')}</div>`
        : '';
      wrapper.innerHTML = `<div class="msg-bubble">${attHtml}${escapeHtml(msg.text)}</div>`;
    } else {
      const built = buildAssistantNode(msg, idx, isLast);
      wrapper = built.wrapper;
      if (isLast && msg.pending) {
        state.activeTurnDom = built;
      }
    }

    el.chatMessages.appendChild(wrapper);
    if (animateLast && isLast) {
      prism?.animateMessageIn(wrapper);
    }
  });

  el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

// ── Custom Popovers Renderers (Agents, Templates, History, Mode) ──────────────
function renderAgentPopover() {
  const q = (el.agentSearchInput.value || '').trim().toLowerCase();
  const list = state.agents.filter((a) => !q || a.slug.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
  const dirs = list.filter((a) => a.format === 'dir');
  const flats = list.filter((a) => a.format !== 'dir');

  let html = '';
  const rowHtml = (a) => `
    <button type="button" class="popover-item ${a.slug === state.currentSlug ? 'active' : ''}" data-pick-agent="${escapeHtml(a.slug)}">
      <span class="popover-item-meta">
        <strong>${escapeHtml(a.slug)}</strong>
        <small>${escapeHtml(a.description || a.filePath)}</small>
      </span>
      <span class="mono" style="font-size:10.5px; color:var(--muted-foreground);">${a.slug === state.currentSlug ? '✓' : fmtCompact(a.promptLength || 0)}</span>
    </button>`;

  if (dirs.length) {
    html += `<div class="popover-group-title">Seus Agentes</div>${dirs.map(rowHtml).join('')}`;
  }
  if (flats.length) {
    html += `<div class="popover-group-title">Outros (.md)</div>${flats.map(rowHtml).join('')}`;
  }
  if (!html) html = '<div class="conv-empty">Nenhum agente encontrado.</div>';

  el.agentPopoverList.innerHTML = html;
  el.agentPopoverList.querySelectorAll('[data-pick-agent]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const target = btn.dataset.pickAgent;
      closeAllPopovers();
      if (!target || target === state.currentSlug) return;
      if (state.dirty && !confirm('Alterações não salvas no System Prompt serão perdidas. Trocar mesmo assim?')) return;
      try {
        await selectAgent(target, true);
        toast(`Agente ativo: ${target}`, 'ok');
      } catch (err) {
        toast(`Falha ao trocar agente: ${err.message}`, 'error');
      }
    });
  });
}

function renderTemplatePopover() {
  el.templatePopover.innerHTML = PROMPT_TEMPLATES.map(
    (t) => `
      <button type="button" class="popover-item" data-tpl="${t.id}">
        <span class="popover-item-meta">
          <strong>${escapeHtml(t.name)}</strong>
          <small>${escapeHtml(t.desc)}</small>
        </span>
      </button>`
  ).join('');
  el.templatePopover.querySelectorAll('[data-tpl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tpl = PROMPT_TEMPLATES.find((x) => x.id === btn.dataset.tpl);
      closeAllPopovers();
      if (!tpl) return;
      el.systemPromptEditor.value = tpl.body;
      updateEditorStats();
      setDirty(true);
      toast(`Template "${tpl.name}" carregado. Salve para gravar no agent.md.`, 'warn');
    });
  });
}

function renderHistoryPopover() {
  if (!state.history.length) {
    el.historyPopover.innerHTML = '<div class="conv-empty">Nenhuma versão salva ainda.</div>';
    return;
  }
  el.historyPopover.innerHTML = state.history
    .map((snap, idx) => {
      const t = new Date(snap.savedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const label = idx === 0 ? `Atual · ${t}` : `v${state.history.length - idx} · ${t}`;
      return `
        <button type="button" class="popover-item" data-snap="${snap.id}">
          <span class="popover-item-meta">
            <strong class="mono">${escapeHtml(label)}</strong>
            <small>${fmtCompact((snap.systemPrompt || '').length)} chars</small>
          </span>
        </button>`;
    })
    .join('');
  el.historyPopover.querySelectorAll('[data-snap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const snap = state.history.find((h) => h.id === btn.dataset.snap);
      closeAllPopovers();
      if (!snap) return;
      el.systemPromptEditor.value = snap.systemPrompt;
      updateEditorStats();
      setDirty(true);
      toast('Versão restaurada no editor. Clique em Salvar para aplicar.', 'warn');
    });
  });
}

function syncModeUI() {
  const map = {
    full: { label: 'Completo', color: 'var(--success)' },
    ask: { label: 'Perguntar', color: '#5CC6FC' },
    'accept-edits': { label: 'Editar', color: 'var(--primary)' },
    plan: { label: 'Planejar', color: 'var(--warning)' },
  };
  const m = map[state.activeMode] || map.full;
  el.modeTriggerLabel.textContent = m.label;
  el.modeTriggerDot.style.background = m.color;
  el.modePopover.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.activeMode);
  });
}

// ── Saved Conversations Sidebar ───────────────────────────────────────────────
function renderConversationsList() {
  const q = (el.convSearchInput.value || '').trim().toLowerCase();
  const filtered = state.conversations.filter((c) => !q || (c.title || '').toLowerCase().includes(q) || (c.agentName || '').toLowerCase().includes(q));
  el.convCountBadge.textContent = String(state.conversations.length);
  if (!filtered.length) {
    el.convList.innerHTML = `<div class="conv-empty">${q ? 'Nenhum resultado.' : 'Suas conversas aparecerão aqui.'}</div>`;
    return;
  }

  el.convList.innerHTML = '';
  for (const c of filtered) {
    const item = document.createElement('div');
    item.className = `conv-item ${c.id === state.currentConvId ? 'active' : ''}`;
    const t = new Date(c.updatedAt || c.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
      <div class="conv-item-info">
        <span class="conv-item-title">${escapeHtml(c.title || 'Conversa')}</span>
        <span class="conv-item-sub mono"><span>${escapeHtml(c.agentName || 'neon-agent')}</span><span>·</span><span>${t}</span></span>
      </div>
      <div class="conv-item-actions">
        <button type="button" class="icon-mini-btn" data-rename title="Renomear">✎</button>
        <button type="button" class="icon-mini-btn danger" data-delete title="Excluir">✕</button>
      </div>
    `;
    item.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openSavedConversation(c.id);
    });
    item.querySelector('[data-rename]').addEventListener('click', async (e) => {
      e.stopPropagation();
      const next = prompt('Novo título da conversa:', c.title);
      if (!next?.trim()) return;
      await api(`/api/conversations/${encodeURIComponent(c.id)}`, { method: 'PATCH', body: JSON.stringify({ title: next.trim() }) });
      await refreshConversations();
    });
    item.querySelector('[data-delete]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Excluir a conversa "${c.title}"?`)) return;
      await api(`/api/conversations/${encodeURIComponent(c.id)}`, { method: 'DELETE' });
      if (state.currentConvId === c.id) await startFreshSession({ clearMessages: true });
      await refreshConversations();
    });
    el.convList.appendChild(item);
  }
}

async function refreshConversations() {
  try {
    const data = await api('/api/conversations');
    state.conversations = data.conversations || [];
    renderConversationsList();
  } catch {}
}

async function persistCurrentConversation() {
  if (!state.messages.length) return;
  if (!state.currentConvId) state.currentConvId = crypto.randomUUID ? crypto.randomUUID() : `conv-${Date.now()}`;
  const firstUser = state.messages.find((m) => m.role === 'user');
  const existing = state.conversations.find((c) => c.id === state.currentConvId);
  const title = existing?.title || (firstUser ? firstUser.text.slice(0, 64) : 'Nova conversa');
  try {
    await api('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        id: state.currentConvId,
        title,
        agentName: state.currentSlug,
        model: state.activeModel,
        cwd: state.activeCwd,
        permissionMode: state.activeMode,
        agyConversationId: state.agyConversationId,
        messages: state.messages.map((m) => ({
          role: m.role,
          text: m.text,
          agentName: m.agentName,
          model: m.model,
          tools: m.tools || [],
          attachments: m.attachments || [],
          metaText: m.metaText || '',
          durationSec: m.durationSec || 0,
          thinkingTokens: m.thinkingTokens || 0,
          error: Boolean(m.error),
        })),
        lastUsage: state.lastUsage,
      }),
    });
    await refreshConversations();
  } catch {}
}

async function openSavedConversation(convId) {
  if (state.streaming) await abortCurrentTurn();
  await closeCurrentSession();
  try {
    const data = await api(`/api/conversations/${encodeURIComponent(convId)}`);
    const conv = data.conversation;
    state.currentConvId = conv.id;
    state.agyConversationId = conv.agyConversationId || null;
    state.messages = conv.messages || [];
    state.lastUsage = conv.lastUsage || null;

    if (conv.agentName && conv.agentName !== state.currentSlug) await selectAgent(conv.agentName, false);
    if (conv.model) state.activeModel = conv.model;
    if (conv.cwd) { state.activeCwd = conv.cwd; el.cwdInput.value = conv.cwd; }
    if (conv.permissionMode) state.activeMode = conv.permissionMode;

    syncModelUI();
    syncModeUI();
    setPromptStale(false);
    setStatus('Conversa carregada', 'idle');
    renderConversationsList();
    renderChatMessages();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function exportConversationMarkdown() {
  if (!state.messages.length) return toast('Nenhuma mensagem para exportar.', 'warn');
  const lines = [`# ${state.currentSlug} — ${state.activeModel}`, `_Exportado do Obsidian Studio em ${new Date().toLocaleString('pt-BR')}_`, ''];
  for (const m of state.messages) {
    lines.push(m.role === 'user' ? '## Usuário' : `## ${m.agentName || state.currentSlug}`, '', m.text || '', '');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.currentSlug}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Conversa exportada em Markdown!', 'ok');
}

// ── Agent Editor & CRUD ───────────────────────────────────────────────────────
function updateEditorStats() {
  const val = el.systemPromptEditor.value;
  const lines = val ? val.split('\n').length : 0;
  const chars = val.length;
  const tok = Math.ceil(chars / 4);
  el.editorStats.textContent = `${lines}L · ${fmtCompact(chars)} chars · ~${fmtCompact(tok)} tok`;
  updateOpticsReadout();
}

function setDirty(isDirty) {
  state.dirty = isDirty;
  el.dirtyBadge.classList.toggle('hidden', !isDirty);
  if (isDirty) el.savedBadge.classList.add('hidden');
}

function setStatus(label, variant = 'idle') {
  el.sessionStatusChip.textContent = label;
  el.sessionStatusChip.className = `status-chip ${variant === 'active' ? 'live' : ''}`;
}

function setPromptStale(isStale) {
  state.promptStale = isStale;
  el.staleChip.classList.toggle('hidden', !isStale);
}

function renderToolToggles(selectedTools) {
  const selected = new Set(selectedTools || []);
  el.toolToggles.innerHTML = '';
  for (const [key, group] of Object.entries(state.meta.toolGroups)) {
    const checked = group.tools.some((t) => selected.has(t));
    const label = document.createElement('label');
    label.className = `tool-tile ${checked ? 'active' : ''}`;
    label.innerHTML = `<input type="checkbox" data-group="${key}" ${checked ? 'checked' : ''} /><span><span class="tool-tile-title">${escapeHtml(group.label)}</span><span class="tool-tile-desc">${escapeHtml(group.description)}</span></span>`;
    const cb = label.querySelector('input');
    cb.addEventListener('change', () => { label.classList.toggle('active', cb.checked); setDirty(true); });
    el.toolToggles.appendChild(label);
  }
}

function collectSelectedTools() {
  const tools = [];
  el.toolToggles.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    if (cb.checked) {
      const g = state.meta.toolGroups[cb.dataset.group];
      if (g) tools.push(...g.tools);
    }
  });
  return tools;
}

async function selectAgent(slug, resetChat = true) {
  const data = await api(`/api/agents/${encodeURIComponent(slug)}`);
  state.currentSlug = slug;
  state.currentAgent = data.agent;
  state.history = data.history || [];

  el.agentTriggerLabel.textContent = slug;
  el.agentFilePath.textContent = data.agent.filePath;
  el.agentDescInput.value = data.agent.description || '';
  el.systemPromptEditor.value = data.agent.systemPrompt || '';
  el.deleteAgentBtn.classList.toggle('hidden', slug === 'neon-agent');

  renderToolToggles(data.agent.tools);
  renderActiveSkillsStrip();
  updateEditorStats();
  setDirty(false);

  if (resetChat) await startFreshSession({ clearMessages: true });
}

async function saveCurrentAgent({ restartSession = false } = {}) {
  if (!state.currentSlug) return false;
  try {
    const data = await api(`/api/agents/${encodeURIComponent(state.currentSlug)}`, {
      method: 'PUT',
      body: JSON.stringify({
        description: el.agentDescInput.value.trim(),
        tools: collectSelectedTools(),
        systemPrompt: el.systemPromptEditor.value,
      }),
    });
    state.currentAgent = data.agent;
    state.history = data.history || [];
    setDirty(false);
    el.savedBadge.classList.remove('hidden');
    setTimeout(() => el.savedBadge.classList.add('hidden'), 2000);

    if (restartSession) {
      await startFreshSession({ clearMessages: true });
      toast('System prompt salvo no agent.md e aplicado!', 'ok');
    } else if (state.sessionStarted) {
      setPromptStale(true);
      toast('Salvo no agent.md! Clique em "Prompt alterado · Aplicar" para reiniciar.', 'warn');
    } else {
      toast('System prompt salvo em agent.md!', 'ok');
    }
    return true;
  } catch (err) {
    toast(err.message, 'error');
    return false;
  }
}

// ── Attachments ───────────────────────────────────────────────────────────────
function renderPendingAttachments() {
  el.pendingAttachments.innerHTML = '';
  el.pendingAttachments.classList.toggle('hidden', state.pendingAttachments.length === 0);
  state.pendingAttachments.forEach((att, idx) => {
    const chip = document.createElement('span');
    chip.className = 'pending-attach-chip mono';
    chip.innerHTML = `<span>📎 ${escapeHtml(att.name)}</span><button type="button" title="Remover">✕</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      state.pendingAttachments.splice(idx, 1);
      renderPendingAttachments();
    });
    el.pendingAttachments.appendChild(chip);
  });
  syncComposerActionButtons();
}

async function handleFilesUpload(fileList) {
  for (const file of Array.from(fileList || [])) {
    if (file.size > 10 * 1024 * 1024) { toast(`"${file.name}" excede 10 MB.`, 'error'); continue; }
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { const r = String(reader.result || ''); resolve(r.includes(',') ? r.split(',')[1] : r); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    try {
      const data = await api('/api/uploads', { method: 'POST', body: JSON.stringify({ name: file.name, mime: file.type, base64 }) });
      state.pendingAttachments.push(data.attachment);
      renderPendingAttachments();
      toast(`Anexado: ${file.name}`, 'ok');
    } catch (err) {
      toast(err.message, 'error');
    }
  }
}

// ── Streaming Session Lifecycle ───────────────────────────────────────────────
async function closeCurrentSession() {
  if (!state.sessionId) return;
  const old = state.sessionId;
  state.sessionId = null;
  state.sessionStarted = false;
  try { await fetch(`/api/sessions/${encodeURIComponent(old)}`, { method: 'DELETE' }); } catch {}
}

async function startFreshSession({ clearMessages = true, preserveContext = false } = {}) {
  if (state.streaming) await abortCurrentTurn();
  await closeCurrentSession();
  if (clearMessages) {
    state.currentConvId = null;
    state.agyConversationId = null;
    state.needsContextSeed = false;
    state.messages = [];
    state.queuedMessages = [];
    state.steeringNext = null;
    state.lastUsage = null;
    state.lastTps = 0;
    state.lastTtft = 0;
    renderQueuedMessages();
    renderConversationsList();
  } else if (preserveContext) {
    // Switching account / reconnecting: do NOT try to resume old account's server conversation ID;
    // instead seed the new account's first turn with the full local transcript from this chat window.
    state.agyConversationId = null;
    state.needsContextSeed = state.messages.some((m) => !m.error && String(m.text || '').trim().length > 0);
  }
  setPromptStale(false);
  setStatus(state.needsContextSeed ? 'Contexto pronto' : 'Pronto', 'idle');
  syncMascotsNow();
  updateOpticsReadout();
  renderChatMessages();
}

function buildConversationContextSeed(messages, maxChars = 48000) {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  // Drop failed assistant turns and their immediately preceding user turn if it only led to an error
  const valid = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m) continue;
    if (m.role === 'assistant') {
      if (m.error || m.pending || !String(m.text || '').trim()) continue;
      valid.push(m);
    } else if (m.role === 'user') {
      const next = messages[i + 1];
      if (next && next.role === 'assistant' && next.error) continue;
      if (!String(m.text || '').trim()) continue;
      valid.push(m);
    }
  }
  if (valid.length === 0) return '';

  const formatted = valid.map((m) => {
    const who = m.role === 'user' ? 'USUÁRIO' : `ASSISTENTE (${m.agentName || state.currentSlug || 'agente'})`;
    const parts = [];
    if (m.attachments?.length) {
      parts.push(`[Anexos: ${m.attachments.map((a) => `${a.name} (${a.path})`).join(', ')}]`);
    }
    if (m.tools?.length) {
      const toolSummary = m.tools
        .slice(0, 12)
        .map((t) => {
          const out = String(t.output || '').trim().slice(0, 220).replace(/\s+/g, ' ');
          return `- ${t.name}${out ? `: ${out}` : ''}`;
        })
        .join('\n');
      parts.push(`[Ferramentas executadas:\n${toolSummary}]`);
    }
    parts.push(String(m.text || '').trim());
    return `### ${who}\n${parts.join('\n')}`;
  });

  // Keep the most recent turns within maxChars budget
  const kept = [];
  let total = 0;
  for (let i = formatted.length - 1; i >= 0; i--) {
    const block = formatted[i];
    if (total + block.length > maxChars && kept.length >= 2) {
      const rem = maxChars - total;
      if (rem > 500) kept.unshift(`...[trecho anterior truncado]...\n${block.slice(-rem)}`);
      break;
    }
    kept.unshift(block);
    total += block.length + 2;
  }

  return (
    `[CONTEXTO DA CONVERSA ANTERIOR — CONTINUAÇÃO DA MESMA JANELA DE CHAT APÓS TROCA DE CONTA / RECONEXÃO]\n` +
    `Abaixo está o histórico completo até agora nesta mesma janela. Continue exatamente de onde paramos, preservando todos os arquivos, logs, diagnósticos e objetivos do usuário. NÃO diga que perdeu o contexto nem pergunte informações que já foram fornecidas abaixo.\n\n` +
    `<historico_da_conversa>\n${kept.join('\n\n')}\n</historico_da_conversa>`
  );
}

const AUTH_OR_QUOTA_ERR_RE = /quota|resource_exhausted|429|401|403|unauth|credential|token|login|account|session|rate.?limit|expired/i;

async function ensureSession() {
  if (state.sessionId) return state.sessionId;
  const cwd = el.cwdInput.value.trim() || state.meta.defaultCwd;
  state.activeCwd = cwd;
  const data = await api('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      agentName: state.currentSlug,
      model: state.activeModel,
      cwd,
      permissionMode: state.activeMode,
      enabledSkills: getPinnedSkills(),
      resumeConversationId: state.agyConversationId || undefined,
    }),
  });
  state.sessionId = data.session.id;
  return state.sessionId;
}

const NORMAL_PLACEHOLDER = 'Descreva o que quer construir… (/ comandos, arraste arquivos ou Enter)';
const STREAMING_PLACEHOLDER = 'Digite enquanto trabalha… Enter enfileira · Ctrl+Enter envia agora';

function syncComposerActionButtons() {
  const hasDraft = getChatInputText().trim().length > 0 || state.pendingAttachments.length > 0;
  el.sendBtn.classList.toggle('hidden', state.streaming);
  el.stopBtn.classList.toggle('hidden', !state.streaming);
  el.queueAddBtn?.classList.toggle('hidden', !(state.streaming && hasDraft));
  el.sendNowBtn?.classList.toggle('hidden', !(state.streaming && hasDraft));
}

function setStreamingUI(isStreaming) {
  state.streaming = isStreaming;
  el.chatInput.setAttribute('contenteditable', 'true');
  el.chatInput.setAttribute('data-placeholder', isStreaming ? STREAMING_PLACEHOLDER : NORMAL_PLACEHOLDER);
  syncComposerActionButtons();
  renderQueuedMessages();
  syncMascotsNow();
  updateOpticsReadout();
}

function renderQueuedMessages() {
  if (!el.queuedMessagesCard) return;
  const count = state.queuedMessages.length;
  const wasHidden = el.queuedMessagesCard.classList.contains('hidden');
  el.queuedMessagesCard.classList.toggle('hidden', count === 0);
  el.queuedMessagesCard.classList.toggle('collapsed', state.queueCollapsed);
  if (el.queuedCountBadge) el.queuedCountBadge.textContent = String(count);
  if (el.queuedSubtitle) {
    el.queuedSubtitle.textContent = state.streaming
      ? 'Envia quando o agente terminar'
      : 'Aguardando · clique em → para enviar';
  }
  if (el.queuedToggleBtn) el.queuedToggleBtn.setAttribute('aria-expanded', state.queueCollapsed ? 'false' : 'true');

  if (count === 0) {
    el.queuedList.innerHTML = '';
    requestAnimationFrame(() => syncMascotsNow());
    return;
  }

  el.queuedList.innerHTML = state.queuedMessages.map((item) => {
    const attHtml = item.attachments?.length
      ? `<div class="queued-atts">${item.attachments.map((a) => `<span class="queued-att-chip mono">📎 ${escapeHtml(a.name)}</span>`).join('')}</div>`
      : '';
    return `
      <div class="queued-item" data-qid="${escapeHtml(item.id)}">
        <div class="queued-item-body">
          <div class="queued-item-text">${escapeHtml(item.text)}</div>
          ${attHtml}
        </div>
        <div class="queued-item-actions">
          <button type="button" class="q-act-btn q-act-send" data-q-send="${escapeHtml(item.id)}" title="${state.streaming ? 'Interromper e enviar agora' : 'Enviar agora'}">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </button>
          <button type="button" class="q-act-btn" data-q-edit="${escapeHtml(item.id)}" title="Editar mensagem">
            <svg viewBox="0 0 16 16" width="13.5" height="13.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5l2 2L5.5 12.5 3 13l.5-2.5 8-8z"/></svg>
          </button>
          <button type="button" class="q-act-btn q-act-del" data-q-del="${escapeHtml(item.id)}" title="Remover da fila">
            <svg viewBox="0 0 16 16" width="13.5" height="13.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10M6 4.5V3h4v1.5M5 4.5l.5 8.5h5l.5-8.5"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  el.queuedList.querySelectorAll('[data-q-send]').forEach((btn) => {
    btn.addEventListener('click', () => sendQueuedItemNow(btn.dataset.qSend));
  });
  el.queuedList.querySelectorAll('[data-q-edit]').forEach((btn) => {
    btn.addEventListener('click', () => editQueuedItem(btn.dataset.qEdit));
  });
  el.queuedList.querySelectorAll('[data-q-del]').forEach((btn) => {
    btn.addEventListener('click', () => removeQueuedItem(btn.dataset.qDel));
  });

  if (wasHidden) prism?.animatePopoverIn(el.queuedMessagesCard);
  requestAnimationFrame(() => {
    syncMascotsNow();
    prism?.markRimDirty?.();
  });
}

function enqueueFromComposer() {
  const rawContent = getChatInputText().trim();
  const attachments = [...state.pendingAttachments];
  if (!rawContent && !attachments.length) return;
  const text = rawContent || '(Arquivos anexados)';

  el.slashMenu.classList.add('hidden');
  state.pendingAttachments = [];
  renderPendingAttachments();
  setChatInputText('');
  syncComposerActionButtons();

  state.queuedMessages.push({
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text,
    attachments,
  });
  state.queueCollapsed = false;
  renderQueuedMessages();
  prism?.notifyMascot('activity', {});
  el.chatInput.focus();
}

async function steerSendFromComposer() {
  const rawContent = getChatInputText().trim();
  const attachments = [...state.pendingAttachments];
  if (!rawContent && !attachments.length) return;
  const text = rawContent || '(Arquivos anexados)';

  el.slashMenu.classList.add('hidden');
  state.pendingAttachments = [];
  renderPendingAttachments();
  setChatInputText('');
  syncComposerActionButtons();

  if (state.streaming) {
    state.steeringNext = { text, attachments };
    await abortCurrentTurn({ isSteer: true });
  } else {
    await sendMessage(text, attachments);
  }
}

async function sendQueuedItemNow(qid) {
  const idx = state.queuedMessages.findIndex((x) => x.id === qid);
  if (idx < 0) return;
  const [item] = state.queuedMessages.splice(idx, 1);
  renderQueuedMessages();
  if (state.streaming) {
    state.steeringNext = { text: item.text, attachments: item.attachments || [] };
    await abortCurrentTurn({ isSteer: true });
  } else {
    await sendMessage(item.text, item.attachments || []);
  }
}

function editQueuedItem(qid) {
  const idx = state.queuedMessages.findIndex((x) => x.id === qid);
  if (idx < 0) return;
  const [item] = state.queuedMessages.splice(idx, 1);
  const existing = getChatInputText().trim();
  setChatInputText(existing ? `${item.text}\n${existing}` : item.text);
  if (item.attachments?.length) {
    state.pendingAttachments.push(...item.attachments);
    renderPendingAttachments();
  }
  renderQueuedMessages();
  syncComposerActionButtons();
  el.chatInput.focus();
  prism?.queueCaret({ typing: false, refreshMetrics: true });
}

function removeQueuedItem(qid) {
  state.queuedMessages = state.queuedMessages.filter((x) => x.id !== qid);
  renderQueuedMessages();
}

async function abortCurrentTurn({ isSteer = false } = {}) {
  state.manualAbort = !isSteer;
  if (state.thinkingTimer) { clearInterval(state.thinkingTimer); state.thinkingTimer = 0; }
  if (state.abortController) { state.abortController.abort(); state.abortController = null; }
  if (state.sessionId) {
    try { await fetch(`/api/sessions/${encodeURIComponent(state.sessionId)}/abort`, { method: 'POST' }); } catch {}
  }
  prism?.clearInkTail();
  if (!isSteer) {
    prism?.convAuraComplete();
    setStreamingUI(false);
    setStatus('Interrompido', 'idle');
  }
}

function openHelpModal() {
  closeAllPopovers();
  el.helpModal?.classList.remove('hidden');
  prism?.animatePopoverIn(el.helpModal?.querySelector('.modal-card'));
}

async function runBtwSideQuery(question) {
  if (!question) {
    setChatInputText('/btw ');
    el.chatInput.focus();
    return;
  }
  el.btwCard.classList.remove('hidden');
  el.btwQuestionLabel.textContent = question;
  el.btwMetaLabel.textContent = 'pensando…';
  el.btwBody.innerHTML = '<p style="color:var(--muted-foreground);">Consultando em paralelo via ACP…</p>';
  prism?.animatePopoverIn(el.btwCard);
  requestAnimationFrame(() => syncMascotsNow());

  try {
    const recentCtx = state.messages
      .filter((m) => !m.error && m.text)
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.text).slice(0, 800)}`)
      .join('\n\n');
    const res = await api('/api/btw', {
      method: 'POST',
      body: JSON.stringify({
        question,
        context: recentCtx,
        model: state.activeModel,
        cwd: state.activeCwd,
        agentName: state.currentSlug,
      }),
    });
    state.lastBtwAnswer = res.answer || '';
    el.btwMetaLabel.textContent = `${res.durationSec || 0}s · ACP`;
    const { html, codeBlocks } = renderMarkdown(state.lastBtwAnswer);
    el.btwBody.innerHTML = html;
    bindMarkdownInteractions(el.btwBody, codeBlocks);
  } catch (err) {
    el.btwMetaLabel.textContent = 'erro';
    el.btwBody.innerHTML = `<p style="color:var(--error);">${escapeHtml(err.message)}</p>`;
  }
}

async function runCompactCommand(focusText = '') {
  if (!state.messages.some((m) => !m.error && m.text)) {
    toast('Ainda não há histórico para compactar.', 'warn');
    return;
  }
  await closeCurrentSession();
  state.agyConversationId = null;
  state.needsContextSeed = true;
  setStatus('Contexto compactado', 'idle');
  toast(
    focusText
      ? 'Sessão ACP reiniciada com checkpoint compactado — enviando sua continuação…'
      : 'Contexto compactado! Próxima mensagem abre sessão ACP limpa com resumo preservado.',
    'ok'
  );
  if (focusText) {
    await sendMessage(focusText);
  }
}

async function runForkCommand() {
  if (!state.messages.length) {
    toast('Nenhuma mensagem para bifurcar ainda.', 'warn');
    return;
  }
  await persistCurrentConversation();
  const prevTitle = state.conversations.find((c) => c.id === state.currentConvId)?.title || 'Conversa';
  state.currentConvId = crypto.randomUUID ? crypto.randomUUID() : `conv-${Date.now()}`;
  state.agyConversationId = null;
  state.needsContextSeed = true;
  await closeCurrentSession();
  await api('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({
      id: state.currentConvId,
      title: `${prevTitle} (fork)`.slice(0, 120),
      agentName: state.currentSlug,
      model: state.activeModel,
      cwd: state.activeCwd,
      permissionMode: state.activeMode,
      agyConversationId: null,
      messages: state.messages,
      lastUsage: state.lastUsage,
    }),
  });
  await refreshConversations();
  toast('Conversa clonada (fork) mantendo todo o histórico!', 'ok');
}

async function runRewindCommand(countRaw) {
  const n = Math.max(1, Math.min(10, parseInt(countRaw || '1', 10) || 1));
  let removed = 0;
  let restoredPrompt = '';
  while (removed < n && state.messages.length > 0) {
    if (state.messages[state.messages.length - 1].role === 'assistant') state.messages.pop();
    if (state.messages.length && state.messages[state.messages.length - 1].role === 'user') {
      restoredPrompt = state.messages.pop().text || restoredPrompt;
    }
    removed += 1;
  }
  await closeCurrentSession();
  state.agyConversationId = null;
  state.needsContextSeed = state.messages.some((m) => !m.error && m.text);
  renderChatMessages();
  await persistCurrentConversation();
  if (restoredPrompt) {
    setChatInputText(restoredPrompt);
    el.chatInput.focus();
  }
  toast(`Voltou ${removed} turno${removed > 1 ? 's' : ''} — edite e reenvie.`, 'ok');
}

async function runCopyCommand(arg = '') {
  const clean = arg.trim().toLowerCase();
  if (clean === 'btw') {
    if (!state.lastBtwAnswer) return toast('Nenhuma resposta /btw para copiar.', 'warn');
    await navigator.clipboard.writeText(state.lastBtwAnswer);
    return toast('Resposta /btw copiada!', 'ok');
  }
  const assistants = state.messages.filter((m) => m.role === 'assistant' && m.text);
  if (!assistants.length) return toast('Nenhuma resposta do agente para copiar.', 'warn');
  const nth = Math.max(1, parseInt(clean || '1', 10) || 1);
  const target = assistants[assistants.length - nth] || assistants[assistants.length - 1];
  await navigator.clipboard.writeText(target.text);
  toast(nth === 1 ? 'Última resposta copiada!' : `${nth}ª resposta mais recente copiada!`, 'ok');
}

async function runRenameCommand(newTitle) {
  const title = newTitle.trim().slice(0, 120);
  if (!title) {
    setChatInputText('/rename ');
    el.chatInput.focus();
    return;
  }
  if (!state.currentConvId) await persistCurrentConversation();
  if (!state.currentConvId) return toast('Envie uma mensagem antes de renomear.', 'warn');
  await api(`/api/conversations/${encodeURIComponent(state.currentConvId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
  await refreshConversations();
  toast(`Conversa renomeada para "${title}"`, 'ok');
}

function matchModelShorthand(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const aliases = [
    ['neon', 'gemini-4-neon'],
    ['carbon', 'gemini-4-carbon'],
    ['argon', 'gemini-4-argon'],
    ['hydrogen', 'gemini-4-hydrogen'],
    ['orch', 'orchestrator'],
    ['orchestrator', 'orchestrator'],
    ['flash', 'gemini-3.8-flash'],
    ['opus', 'claude-opus-5-5'],
    ['sonnet', 'claude-sonnet-5-5'],
  ];
  for (const [key, famId] of aliases) {
    if (q === key || q.includes(key)) return famId;
  }
  return null;
}

// Handles immediate UI/session slash commands (can even run while streaming!)
// Returns true if fully handled locally; returns false if it should be sent as a chat prompt.
function executeSlashCommand(raw) {
  const trimmed = raw.trim();
  const m = trimmed.match(/^\/([a-z0-9_-]+)(?:\s+([\s\S]*))?$/i);
  if (!m) return false;
  const name = m[1].toLowerCase();
  const arg = (m[2] || '').trim();

  if (name === 'prompt') { state.prefs.viewMode = 'studio'; applyPrefs(); el.systemPromptEditor.focus(); return true; }
  if (name === 'clear' || name === 'new') { startFreshSession({ clearMessages: true }); toast('Nova conversa iniciada!', 'ok'); return true; }
  if (name === 'vial' || name === 'context' || name === 'usage' || name === 'quota') { togglePopover('vialPopover'); return true; }
  if (name === 'agents') { togglePopover('agentPopover'); return true; }
  if (name === 'accounts' || name === 'login' || name === 'logout') { el.openAccountsBtn?.click(); return true; }
  if (name === 'export') { exportConversationMarkdown(); return true; }
  if (name === 'help') { openHelpModal(); return true; }
  if (name === 'voice' || name === 'record') {
    if (arg && /^(pt|en|es)/i.test(arg)) setVoiceLang(arg);
    toggleVoiceDictation();
    return true;
  }
  if (name === 'btw') { runBtwSideQuery(arg); return true; }
  if (name === 'copy') { runCopyCommand(arg); return true; }
  if (name === 'rename') { runRenameCommand(arg); return true; }
  if (name === 'fork' || name === 'branch') { runForkCommand(); return true; }
  if (name === 'rewind' || name === 'undo') { runRewindCommand(arg); return true; }
  if (name === 'compact') { runCompactCommand(arg); return true; }

  if (name === 'skills') {
    if (arg.toLowerCase() === 'reload') {
      loadInstalledSkills().then(() => toast(`Skills recarregadas (${state.skills.length})!`, 'ok'));
    } else {
      togglePopover('skillsPopover');
    }
    return true;
  }

  if (name === 'model' || name === 'models') {
    if (!arg) { togglePopover('modelPopover'); return true; }
    const famId = matchModelShorthand(arg);
    if (famId) { selectModelFamily(famId); return true; }
    toast(`Modelo "${arg}" não reconhecido. Abrindo seletor…`, 'warn');
    togglePopover('modelPopover');
    return true;
  }

  if (name === 'effort') {
    const norm = arg.toLowerCase() === 'extra' || arg.toLowerCase() === 'max' ? 'xhigh' : arg.toLowerCase();
    if (['low', 'medium', 'high', 'xhigh'].includes(norm)) {
      selectEffort(norm, true);
      return true;
    }
    togglePopover('modelPopover');
    return true;
  }

  if (name === 'permissions' || name === 'mode') {
    const modeMap = { full: 'full', completo: 'full', ask: 'ask', default: 'ask', perguntar: 'ask', 'accept-edits': 'accept-edits', editar: 'accept-edits', plan: 'plan', planejar: 'plan' };
    if (arg && modeMap[arg.toLowerCase()]) {
      state.activeMode = modeMap[arg.toLowerCase()];
      syncModeUI();
      syncLiveSessionConfig();
      toast(`Permissões (ACP ao vivo): ${el.modeTriggerLabel.textContent}`, 'ok');
      return true;
    }
    togglePopover('modePopover');
    return true;
  }

  if (name === 'plan' && !arg) {
    state.activeMode = 'plan';
    syncModeUI();
    syncLiveSessionConfig();
    toast('Modo Planejar (somente leitura) ativado via ACP!', 'ok');
    return true;
  }

  // Commands that require an argument to be sent as an enriched ACP turn
  if ((name === 'goal' || name === 'boost') && !arg) {
    setChatInputText(`/${name} `);
    el.chatInput.focus();
    toast(`Digite o objetivo após /${name}`, 'warn');
    return true;
  }

  return false;
}

// Transform `/goal <objective>` and `/boost <task>` into enriched ACP autonomous/deep instructions
async function expandPromptSlashWorkflow(rawContent) {
  const goalMatch = rawContent.match(/^\/goal\s+([\s\S]+)$/i);
  if (goalMatch) {
    const objective = goalMatch[1].trim();
    return {
      displayText: rawContent,
      workflowTag: 'GOAL',
      promptText:
        `[MODO /goal — EXECUÇÃO AUTÔNOMA ATÉ VERIFICAÇÃO COMPLETA]\n` +
        `Objetivo final: ${objective}\n\n` +
        `Diretrizes obrigatórias do modo /goal:\n` +
        `1. Trabalhe de ponta a ponta até o objetivo estar 100% concluído e verificado (não pare no meio pedindo confirmações desnecessárias).\n` +
        `2. Rode testes, builds e verificações reais após cada alteração; se algo falhar, diagnostique e corrija antes de concluir.\n` +
        `3. Só finalize quando puder comprovar objetivamente que todos os critérios do objetivo foram atendidos (ou relate claramente um bloqueio externo real).\n`,
    };
  }

  const boostMatch = rawContent.match(/^\/boost\s+([\s\S]+)$/i);
  if (boostMatch) {
    const task = boostMatch[1].trim();
    const info = resolveModelInfo(state.activeModel);
    if (!info.isOrchestrator && info.family?.efforts?.includes('xhigh') && info.effort !== 'xhigh') {
      await selectEffort('xhigh', false);
    }
    return {
      displayText: rawContent,
      workflowTag: 'BOOST',
      promptText:
        `[MODO /boost — RACIOCÍNIO PROFUNDO, MÚLTIPLAS PERSPECTIVAS E VERIFICAÇÃO RIGOROSA]\n` +
        `Tarefa: ${task}\n\n` +
        `Diretrizes obrigatórias do modo /boost:\n` +
        `1. Analise arquitetura, casos de borda, trade-offs e riscos antes de implementar.\n` +
        `2. Execute a melhor solução completa sem atalhos ou placeholders.\n` +
        `3. Revise criticamente a própria implementação e valide com testes/checagens reais.\n`,
    };
  }

  return { displayText: rawContent, workflowTag: null, promptText: rawContent };
}

function updateSlashMenu() {
  const val = getChatInputText();
  if (!val.startsWith('/') || val.includes('\n')) { el.slashMenu.classList.add('hidden'); return; }
  const q = val.toLowerCase();
  const skillCmds = (state.skills || []).map((s) => ({
    cmd: `/${s.name}`,
    desc: String(s.description || `Skill (${s.source})`).slice(0, 68),
    needsArg: true,
    tag: s.source,
  }));
  const acpCmds = (state.acpCommands || [])
    .filter((c) => c && c.name)
    .map((c) => ({ cmd: `/${c.name}`, desc: String(c.description || '').slice(0, 68), needsArg: true, tag: 'acp' }));
  const mergedMap = new Map();
  for (const item of [...SLASH_COMMANDS, ...skillCmds, ...acpCmds]) {
    const k = item.cmd.toLowerCase();
    if (!mergedMap.has(k)) mergedMap.set(k, item);
  }
  const matches = Array.from(mergedMap.values()).filter((c) => c.cmd.toLowerCase().startsWith(q)).slice(0, 18);
  if (!matches.length) { el.slashMenu.classList.add('hidden'); return; }
  state.slashIndex = Math.min(state.slashIndex, matches.length - 1);
  el.slashMenu.innerHTML = matches
    .map((c, i) => `<button type="button" class="slash-item ${i === state.slashIndex ? 'active' : ''}" data-cmd="${escapeHtml(c.cmd)}" data-needs-arg="${c.needsArg ? '1' : '0'}"><span class="slash-cmd mono">${escapeHtml(c.cmd)}</span><span class="slash-desc">${escapeHtml(c.desc)}</span></button>`)
    .join('');
  el.slashMenu.querySelectorAll('.slash-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      el.slashMenu.classList.add('hidden');
      if (btn.dataset.needsArg === '1') {
        setChatInputText(`${btn.dataset.cmd} `);
        el.chatInput.focus();
      } else {
        setChatInputText('');
        executeSlashCommand(btn.dataset.cmd);
      }
    });
  });
  if (el.slashMenu.classList.contains('hidden')) {
    el.slashMenu.classList.remove('hidden');
    prism?.animatePopoverIn(el.slashMenu);
  }
}

async function sendMessage(overrideText = null, overrideAttachments = null) {
  const rawContent = overrideText !== null ? overrideText : getChatInputText().trim();
  if (!rawContent) return;

  // Immediate local/parallel commands (like `/btw`, `/copy`, `/help`, `/model`, `/skills`) work even while streaming!
  if (rawContent.startsWith('/') && executeSlashCommand(rawContent)) {
    el.slashMenu.classList.add('hidden');
    if (overrideText === null) { setChatInputText(''); syncComposerActionButtons(); }
    return;
  }

  if (state.streaming) {
    if (overrideText === null) enqueueFromComposer();
    return;
  }

  el.slashMenu.classList.add('hidden');
  closeAllPopovers();

  if (state.dirty && !state.sessionStarted) {
    const ok = await saveCurrentAgent({ restartSession: false });
    if (!ok) return;
  }

  const expanded = await expandPromptSlashWorkflow(rawContent);

  let sessionId;
  try { sessionId = await ensureSession(); }
  catch (err) { toast(err.message, 'error'); return; }

  const attachments = overrideAttachments !== null ? [...overrideAttachments] : [...state.pendingAttachments];
  if (overrideAttachments === null) {
    state.pendingAttachments = [];
    renderPendingAttachments();
  }

  if (overrideText === null) { setChatInputText(''); syncComposerActionButtons(); }

  // Build context carryover if switching accounts / reconnecting / starting fresh agy session on an existing chat
  const priorMessagesSnapshot = state.messages.slice();
  const shouldSeedContext =
    state.needsContextSeed ||
    (!state.agyConversationId && priorMessagesSnapshot.some((m) => !m.error && String(m.text || '').trim().length > 0));
  const contextSeed = shouldSeedContext ? buildConversationContextSeed(priorMessagesSnapshot) : '';

  let payloadContent = expanded.promptText;
  const imageAttachments = attachments.filter((a) => String(a.mime || '').startsWith('image/'));
  const fileAttachments = attachments.filter((a) => !String(a.mime || '').startsWith('image/'));
  if (fileAttachments.length) {
    payloadContent = `${payloadContent}\n\n[Arquivos anexados pelo usuário — use view_file se precisar inspecioná-los:\n${fileAttachments.map((a) => `- ${a.name} (${a.path})`).join('\n')}]`;
  }
  if (contextSeed) {
    payloadContent = `${contextSeed}\n\n[NOVA MENSAGEM DO USUÁRIO]\n${payloadContent}`;
  }
  if (expanded.workflowTag === 'GOAL') {
    toast('🎯 Modo /goal ativo — executando autonomamente até verificar conclusão.', 'ok');
  } else if (expanded.workflowTag === 'BOOST') {
    toast('⚡ Modo /boost ativo — raciocínio profundo (Extra High).', 'ok');
  }

  // Trigger real Obsidian Prism liftoff burst + WebGL2 Conversation Neon Aura surge!
  prism?.triggerLiftoff(el.composerCard.getBoundingClientRect());
  prism?.notifyMascot('send', {});

  const startedAt = Date.now();
  state.messages.push({ role: 'user', text: rawContent, attachments });
  const assistantMsg = {
    role: 'assistant',
    agentName: state.currentSlug,
    model: state.activeModel,
    text: '',
    thoughtText: '',
    plan: [],
    tools: [],
    pending: true,
    elapsedSec: 0,
    durationSec: 0,
    thinkingTokens: 0,
    statusText: '',
    metaText: '',
    error: false,
  };
  state.messages.push(assistantMsg);
  renderChatMessages(true);
  prism?.convAuraStart();

  // Live smooth thinking timer ticking every 100ms
  if (state.thinkingTimer) clearInterval(state.thinkingTimer);
  state.thinkingTimer = setInterval(() => {
    if (!assistantMsg.pending) { clearInterval(state.thinkingTimer); state.thinkingTimer = 0; return; }
    assistantMsg.elapsedSec = (Date.now() - startedAt) / 1000;
    if (state.activeTurnDom?.thoughtLabelEl) {
      state.activeTurnDom.thoughtLabelEl.textContent = buildThoughtHeaderSummary(assistantMsg);
    }
  }, 100);

  setStreamingUI(true);
  setStatus('Pensando…', 'active');

  const controller = new AbortController();
  state.abortController = controller;

  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: payloadContent, images: imageAttachments }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erro HTTP ${res.status}`);
    }

    state.sessionStarted = true;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        processSseBlock(block, assistantMsg, startedAt);
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      assistantMsg.pending = false;
      if (!assistantMsg.text) assistantMsg.text = '_Geração interrompida._';
    } else {
      assistantMsg.pending = false;
      assistantMsg.error = true;
      assistantMsg.text = `Erro: ${err.message}`;
      setStatus('Erro', 'idle');
      prism?.convAuraError();
    }
  } finally {
    if (state.thinkingTimer) { clearInterval(state.thinkingTimer); state.thinkingTimer = 0; }
    assistantMsg.pending = false;
    assistantMsg.durationSec = assistantMsg.durationSec || (Date.now() - startedAt) / 1000;
    state.abortController = null;
    setStreamingUI(false);
    if (!assistantMsg.error) {
      if (contextSeed) {
        state.needsContextSeed = false;
        assistantMsg.metaText = assistantMsg.metaText
          ? `${assistantMsg.metaText} · ↻ contexto mantido`
          : '↻ contexto mantido';
      }
      setStatus('Pronto', 'idle');
      prism?.convAuraComplete();
      prism?.notifyMascot('complete', {});
    } else if (AUTH_OR_QUOTA_ERR_RE.test(String(assistantMsg.text || ''))) {
      // Auto-prepare seamless context carryover for the next account (even if switched externally!)
      await closeCurrentSession();
      state.agyConversationId = null;
      state.needsContextSeed = true;
      setStatus('Troque a conta · contexto preservado', 'idle');
      toast('Cota/autenticação atingida — ao trocar de conta e reenviar, o contexto deste chat será mantido.', 'warn');
    }
    updateActiveAssistantDom(assistantMsg, 0);
    await persistCurrentConversation();
    el.chatInput.focus();
    prism?.queueCaret({ typing: false, refreshMetrics: true });

    const wasManualAbort = state.manualAbort;
    state.manualAbort = false;
    if (state.steeringNext) {
      const next = state.steeringNext;
      state.steeringNext = null;
      setTimeout(() => sendMessage(next.text, next.attachments || []), 70);
    } else if (!wasManualAbort && !assistantMsg.error && state.queuedMessages.length > 0) {
      const next = state.queuedMessages.shift();
      renderQueuedMessages();
      setTimeout(() => sendMessage(next.text, next.attachments || []), 120);
    }
  }
}

async function regenerateLast() {
  if (state.streaming || state.messages.length < 2) return;
  const lastUserIdx = [...state.messages].map((m) => m.role).lastIndexOf('user');
  if (lastUserIdx < 0) return;
  const promptText = state.messages[lastUserIdx].text;
  state.messages = state.messages.slice(0, lastUserIdx);
  if (state.promptStale) {
    await closeCurrentSession();
    state.agyConversationId = null;
    setPromptStale(false);
  }
  await sendMessage(promptText);
}

function processSseBlock(block, assistantMsg, startedAt) {
  let eventName = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return;
  let data;
  try { data = JSON.parse(dataLines.join('\n')); } catch { return; }

  if (eventName === 'init') {
    if (data.conversation_id) state.agyConversationId = data.conversation_id;
    if (data.init?.model) assistantMsg.model = data.init.model;
    if (data.init?.tier) {
      state.acpTier = data.init.tier;
      if (el.headerAccountBtn && data.init.tier.name) {
        el.headerAccountBtn.title = `Conta ativa (${data.init.tier.name}) · Clique para gerenciar`;
      }
    }
    if (Array.isArray(data.commands) && data.commands.length) state.acpCommands = data.commands;
    return;
  }
  if (eventName === 'commands') {
    if (Array.isArray(data.commands)) state.acpCommands = data.commands;
    return;
  }
  if (eventName === 'usage') {
    if (data.size) state.contextSize = Number(data.size);
    if (data.usage) state.lastUsage = data.usage;
    updateOpticsReadout();
    return;
  }
  if (eventName === 'thought_delta') {
    const chunk = data.text_delta || '';
    assistantMsg.thoughtText = (assistantMsg.thoughtText || '') + chunk;
    if (data.thinking_tokens) assistantMsg.thinkingTokens = data.thinking_tokens;
    updateActiveAssistantDom(assistantMsg, 0);
    return;
  }
  if (eventName === 'plan') {
    if (Array.isArray(data.entries)) {
      assistantMsg.plan = data.entries;
      updateActiveAssistantDom(assistantMsg, 0);
    }
    return;
  }
  if (eventName === 'permission_request') {
    setStatus('Aguardando permissão…', 'active');
    renderPermissionPromptCard(state.activeTurnDom?.permHost, data);
    return;
  }
  if (eventName === 'delta') {
    const chunk = data.text_delta || '';
    assistantMsg.text += chunk;
    if (data.ttft) state.lastTtft = data.ttft;
    setStatus('Respondendo…', 'active');
    updateActiveAssistantDom(assistantMsg, chunk.length);
    return;
  }
  if (eventName === 'tool') {
    const info = data.tool_info || {};
    const toolObj = {
      step_index: data.step_index,
      name: data.tool_name || info.name || 'tool',
      state: data.state,
      duration_seconds: data.duration_seconds,
      parameters: info.parameters || null,
      output: info.output || '',
      error: info.error || null,
    };
    const idx = assistantMsg.tools.findIndex((t) => t.step_index === data.step_index);
    if (idx >= 0) assistantMsg.tools[idx] = toolObj;
    else assistantMsg.tools.push(toolObj);
    setStatus(`Ferramenta: ${toolObj.name}`, 'active');
    assistantMsg.statusText = `Executando ${toolObj.name}`;
    updateActiveAssistantDom(assistantMsg, 0);
    return;
  }
  if (eventName === 'result') {
    assistantMsg.pending = false;
    if (data.conversation_id) state.agyConversationId = data.conversation_id;
    if (!assistantMsg.text && data.response) assistantMsg.text = data.response;
    if (data.status && data.status !== 'SUCCESS') {
      assistantMsg.error = true;
      assistantMsg.text = data.error || `Status: ${data.status}`;
    }
    const secs = (Date.now() - startedAt) / 1000;
    assistantMsg.durationSec = secs;
    const u = data.turn_usage || data.usage || {};
    assistantMsg.thinkingTokens = Number(u.thinking_tokens || 0);
    state.lastUsage = data.usage || u;
    if (data.tps) state.lastTps = data.tps;
    if (data.ttft) state.lastTtft = data.ttft;
    if (data.telemetry) state.telemetry = data.telemetry;
    const parts = [`${secs.toFixed(1)}s`];
    if (data.tps) parts.push(`${data.tps} tok/s`);
    if (u.thinking_tokens) parts.push(`think ${fmtCompact(u.thinking_tokens)}`);
    if (u.output_tokens) parts.push(`out ${fmtCompact(u.output_tokens)}`);
    if (u.cache_read_tokens) parts.push(`cache ${fmtCompact(u.cache_read_tokens)}`);
    assistantMsg.metaText = parts.join(' · ');
    updateOpticsReadout();
    updateActiveAssistantDom(assistantMsg, 0);
    return;
  }
  if (eventName === 'error') {
    assistantMsg.pending = false;
    assistantMsg.error = true;
    assistantMsg.text = data.message || 'Erro no processo agy.';
    updateActiveAssistantDom(assistantMsg, 0);
  }
}

// ── Helpers & Event Bindings ──────────────────────────────────────────────────
function autoResizeChatInput() {
  el.chatInput.style.height = 'auto';
  const next = Math.min(el.chatInput.scrollHeight, 180);
  el.chatInput.style.height = `${next}px`;
  el.chatInput.style.overflowY = el.chatInput.scrollHeight > 180 ? 'auto' : 'hidden';
}

function setupResizer() {
  let dragging = false;
  el.resizer.addEventListener('mousedown', () => {
    dragging = true;
    el.resizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const sb = el.sidebar.classList.contains('collapsed') ? 0 : el.sidebar.offsetWidth;
    const avail = window.innerWidth - sb;
    const pct = Math.max(24, Math.min(62, ((e.clientX - sb) / avail) * 100));
    el.editorPane.style.width = `${pct}%`;
    prism?.markRimDirty();
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    el.resizer.classList.remove('dragging');
    document.body.style.userSelect = '';
    prism?.markRimDirty();
  });
}

function bindEvents() {
  // Sidebar & Layout
  el.collapseSidebarBtn.addEventListener('click', () => {
    el.sidebar.classList.add('collapsed');
    el.expandSidebarBtn.classList.remove('hidden');
    setTimeout(() => prism?.markRimDirty(), 260);
  });
  el.expandSidebarBtn.addEventListener('click', () => {
    el.sidebar.classList.remove('collapsed');
    el.expandSidebarBtn.classList.add('hidden');
    setTimeout(() => prism?.markRimDirty(), 260);
  });

  el.viewStudioBtn.addEventListener('click', () => { state.prefs.viewMode = 'studio'; applyPrefs(); });
  el.viewChatBtn.addEventListener('click', () => { state.prefs.viewMode = 'chat'; applyPrefs(); });
  el.toggleEditorBtn.addEventListener('click', () => {
    state.prefs.viewMode = state.prefs.viewMode === 'studio' ? 'chat' : 'studio';
    applyPrefs();
  });

  el.sidebarNewChatBtn.addEventListener('click', () => startFreshSession({ clearMessages: true }));
  el.convSearchInput.addEventListener('input', () => renderConversationsList());
  el.exportConvBtn.addEventListener('click', () => exportConversationMarkdown());

  // Custom Optical Popover Triggers
  el.agentTriggerBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopover('agentPopover'); });
  el.agentSearchInput.addEventListener('input', () => renderAgentPopover());
  el.templateTriggerBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopover('templatePopover'); });
  el.historyTriggerBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopover('historyPopover'); });
  el.modelTriggerBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopover('modelPopover'); });
  el.modeTriggerBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopover('modePopover'); });
  el.skillsTriggerBtn?.addEventListener('click', (e) => { e.stopPropagation(); togglePopover('skillsPopover'); });
  el.skillsSearchInput?.addEventListener('input', () => renderSkillsPopover());
  el.skillsFilterPills?.querySelectorAll('[data-sk-filter]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.skillsFilter = btn.dataset.skFilter;
      el.skillsFilterPills.querySelectorAll('[data-sk-filter]').forEach((b) => b.classList.toggle('active', b === btn));
      renderSkillsPopover();
    });
  });
  el.clearPinnedSkillsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    savePinnedSkills([]);
    toast('Skills fixadas limpas.', 'ok');
  });
  el.telemetryTrigger.addEventListener('click', (e) => { e.stopPropagation(); togglePopover('vialPopover'); });

  // Protect modelPopover from closing when finishing a slider drag outside its bounds
  el.effortSliderHost.addEventListener('pointerdown', () => { sliderDragging = true; }, true);
  window.addEventListener('pointerup', () => {
    if (sliderDragging) { sliderDragging = false; sliderDragGuardUntil = Date.now() + 200; }
  }, true);
  window.addEventListener('pointercancel', () => {
    if (sliderDragging) { sliderDragging = false; sliderDragGuardUntil = Date.now() + 200; }
  }, true);

  // Outside click closes popovers
  document.addEventListener('click', (e) => {
    if (Date.now() < sliderDragGuardUntil) return;
    const inside = ALL_POPOVERS.some((k) => el[k]?.contains(e.target));
    const onTrigger = [el.agentTriggerBtn, el.templateTriggerBtn, el.historyTriggerBtn, el.modelTriggerBtn, el.modeTriggerBtn, el.skillsTriggerBtn, el.telemetryTrigger].some((b) => b?.contains(e.target));
    if (!inside && !onTrigger) closeAllPopovers();
  });

  // Orchestrator Planner Pills (Live ACP switch — zero restart!)
  el.orchPlannerPills.querySelectorAll('[data-orch]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.activeModel = btn.dataset.orch;
      syncModelUI();
      await syncLiveSessionConfig();
      toast(`Orchestrator ativo (ACP ao vivo): ${resolveModelInfo(state.activeModel).label}`, 'ok');
    });
  });

  // Permissions options (Live ACP switch — zero restart!)
  el.modePopover.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.activeMode = btn.dataset.mode;
      syncModeUI();
      closeAllPopovers();
      await syncLiveSessionConfig();
      toast(`Permissões (ACP ao vivo): ${el.modeTriggerLabel.textContent}`, 'ok');
    });
  });

  // Vial interactive slice hover & drag-to-slosh!
  document.querySelectorAll('[data-slice], [data-slice-row]').forEach((node) => {
    const slice = Number(node.dataset.slice ?? node.dataset.sliceRow);
    node.addEventListener('pointerenter', () => prism?.updateVialState({ hoveredSlice: slice }));
    node.addEventListener('pointerleave', () => prism?.updateVialState({ hoveredSlice: -1 }));
  });

  let vialDrag = false;
  let vialLastX = 0;
  el.vialDragHandle.addEventListener('pointerdown', (e) => { vialDrag = true; vialLastX = e.clientX; });
  window.addEventListener('pointermove', (e) => {
    if (!vialDrag) return;
    const dx = e.clientX - vialLastX;
    vialLastX = e.clientX;
    if (Math.abs(dx) >= 1) {
      prism?.getVial()?.impulse?.(Math.max(-3.2, Math.min(3.2, dx * 0.16)));
      prism?.getVial()?.tilt?.(Math.max(-0.35, Math.min(0.35, dx * 0.025)));
    }
  }, { passive: true });
  window.addEventListener('pointerup', () => { vialDrag = false; });

  el.vialResetBtn.addEventListener('click', () => {
    closeAllPopovers();
    startFreshSession({ clearMessages: true });
    toast('Nova sessão iniciada!', 'ok');
  });

  // Global keyboard shortcuts (Obsidian Studio + agy CLI parity!)
  const PERM_CYCLE = ['full', 'ask', 'accept-edits', 'plan'];
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'Tab') {
      const inEditor = document.activeElement === el.systemPromptEditor;
      if (!inEditor) {
        e.preventDefault();
        const idx = PERM_CYCLE.indexOf(state.activeMode);
        state.activeMode = PERM_CYCLE[(idx + 1) % PERM_CYCLE.length];
        syncModeUI();
        syncLiveSessionConfig();
        toast(`Permissões (Shift+Tab): ${el.modeTriggerLabel.textContent}`, 'ok');
        return;
      }
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'm') { e.preventDefault(); togglePopover('modelPopover'); return; }
      if (k === 's') { e.preventDefault(); togglePopover('skillsPopover'); return; }
      if (k === 'v') { e.preventDefault(); togglePopover('vialPopover'); return; }
      if (k === 'p') { e.preventDefault(); state.prefs.viewMode = state.prefs.viewMode === 'studio' ? 'chat' : 'studio'; applyPrefs(); return; }
      if (k === 'r') { e.preventDefault(); toggleVoiceDictation(); return; }
      if (k === 'h') { e.preventDefault(); openHelpModal(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      startFreshSession({ clearMessages: true });
      el.chatInput.focus();
    }
    if (e.key === 'Escape') {
      if (voiceState.active) stopVoiceDictation({ keepText: true });
      closeAllPopovers();
      el.slashMenu.classList.add('hidden');
      el.appearanceModal.classList.add('hidden');
      el.newAgentModal.classList.add('hidden');
      el.accountsModal.classList.add('hidden');
      el.helpModal?.classList.add('hidden');
    }
  });

  // `/btw` card & `/help` modal buttons
  el.btwCopyBtn?.addEventListener('click', () => runCopyCommand('btw'));
  el.btwCloseBtn?.addEventListener('click', () => {
    el.btwCard.classList.add('hidden');
    requestAnimationFrame(() => syncMascotsNow());
  });
  el.closeHelpBtn?.addEventListener('click', () => el.helpModal?.classList.add('hidden'));
  el.helpModal?.addEventListener('click', (e) => { if (e.target === el.helpModal) el.helpModal.classList.add('hidden'); });

  // Live Voice Dictation Controls
  el.voiceMicBtn?.addEventListener('click', () => toggleVoiceDictation());
  el.voiceStopBtn?.addEventListener('click', () => stopVoiceDictation({ keepText: true }));
  el.voiceCancelBtn?.addEventListener('click', () => stopVoiceDictation({ keepText: false }));
  el.voiceSendBtn?.addEventListener('click', () => {
    stopVoiceDictation({ keepText: true });
    setTimeout(() => sendMessage(), 60);
  });
  el.voiceLangBtn?.addEventListener('click', () => {
    setVoiceLang(voiceState.lang === 'pt-BR' ? 'en-US' : 'pt-BR');
  });

  // System Prompt Editor
  el.systemPromptEditor.addEventListener('input', () => { updateEditorStats(); setDirty(true); });
  el.systemPromptEditor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveCurrentAgent({ restartSession: false });
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = el.systemPromptEditor.selectionStart;
      const en = el.systemPromptEditor.selectionEnd;
      const v = el.systemPromptEditor.value;
      el.systemPromptEditor.value = `${v.slice(0, s)}  ${v.slice(en)}`;
      el.systemPromptEditor.selectionStart = el.systemPromptEditor.selectionEnd = s + 2;
      updateEditorStats();
      setDirty(true);
    }
  });

  el.agentDescInput.addEventListener('input', () => setDirty(true));
  el.cwdInput.addEventListener('change', async () => {
    state.activeCwd = el.cwdInput.value.trim() || state.meta.defaultCwd;
    loadInstalledSkills();
    await startFreshSession({ clearMessages: false });
    toast('Pasta de trabalho atualizada!', 'ok');
  });

  el.toggleConfigBtn.addEventListener('click', () => el.configDrawer.classList.toggle('hidden'));
  el.savePromptBtn.addEventListener('click', () => saveCurrentAgent({ restartSession: false }));
  el.saveRestartBtn.addEventListener('click', () => saveCurrentAgent({ restartSession: true }));

  el.copyCliBtn.addEventListener('click', async () => {
    const cmd = `agy --agent ${state.currentSlug} --model ${state.activeModel}`;
    await navigator.clipboard.writeText(cmd);
    toast(`Copiado: ${cmd}`, 'ok');
  });

  el.staleChip.addEventListener('click', async () => {
    await startFreshSession({ clearMessages: true });
    toast('Nova sessão iniciada com o System Prompt atualizado!', 'ok');
  });

  // Attachments
  el.attachBtn.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', () => { handleFilesUpload(el.fileInput.files); el.fileInput.value = ''; });
  el.composerCard.addEventListener('dragover', (e) => { e.preventDefault(); el.composerCard.classList.add('drag-over'); });
  el.composerCard.addEventListener('dragleave', () => el.composerCard.classList.remove('drag-over'));
  el.composerCard.addEventListener('drop', (e) => {
    e.preventDefault();
    el.composerCard.classList.remove('drag-over');
    if (e.dataTransfer?.files?.length) handleFilesUpload(e.dataTransfer.files);
  });
  el.chatInput.addEventListener('paste', (e) => {
    const files = e.clipboardData?.files;
    if (files?.length) {
      e.preventDefault();
      handleFilesUpload(files);
      return;
    }
    // Always paste clean plain text into contenteditable composer
    e.preventDefault();
    const plain = e.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, plain);
    syncChatInputEmpty();
    syncComposerActionButtons();
    prism?.queueCaret({ typing: true });
  });

  // Composer Input, Real Smooth Gliding Caret & Slash Navigation
  el.chatInput.addEventListener('input', () => {
    syncChatInputEmpty();
    syncComposerActionButtons();
    updateSlashMenu();
    prism?.queueCaret({ typing: true });
  });
  el.chatInput.addEventListener('focus', () => prism?.queueCaret({ typing: false, refreshMetrics: true }));
  el.chatInput.addEventListener('blur', () => prism?.queueCaret({ typing: false }));
  el.chatInput.addEventListener('click', () => prism?.queueCaret({ typing: false }));
  el.chatInput.addEventListener('keyup', () => prism?.queueCaret({ typing: true }));
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === el.chatInput) prism?.queueCaret({ typing: false });
  });

  el.chatInput.addEventListener('keydown', (e) => {
    if (!el.slashMenu.classList.contains('hidden')) {
      const items = el.slashMenu.querySelectorAll('.slash-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); state.slashIndex = (state.slashIndex + 1) % items.length; updateSlashMenu(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); state.slashIndex = (state.slashIndex - 1 + items.length) % items.length; updateSlashMenu(); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); items[state.slashIndex]?.click(); return; }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (state.streaming) steerSendFromComposer();
      else sendMessage();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.streaming) enqueueFromComposer();
      else sendMessage();
    } else {
      prism?.queueCaret({ typing: true });
    }
  });

  el.sendBtn.addEventListener('click', () => sendMessage());
  el.stopBtn.addEventListener('click', () => abortCurrentTurn({ isSteer: false }));
  el.queueAddBtn?.addEventListener('click', () => enqueueFromComposer());
  el.sendNowBtn?.addEventListener('click', () => steerSendFromComposer());
  el.queuedHead?.addEventListener('click', () => {
    state.queueCollapsed = !state.queueCollapsed;
    renderQueuedMessages();
  });

  // New Agent Modal
  const openNewAgent = () => {
    closeAllPopovers();
    el.newAgentName.value = '';
    el.newAgentDesc.value = '';
    el.newAgentPrompt.value = PROMPT_TEMPLATES[0].body;
    el.newAgentModal.classList.remove('hidden');
    prism?.animatePopoverIn(el.newAgentModal.querySelector('.modal-card'));
    el.newAgentName.focus();
  };
  const closeNewAgent = () => el.newAgentModal.classList.add('hidden');
  el.popoverNewAgentBtn.addEventListener('click', openNewAgent);
  el.closeNewAgentBtn.addEventListener('click', closeNewAgent);
  el.cancelNewAgentBtn.addEventListener('click', closeNewAgent);
  el.newAgentModal.addEventListener('click', (e) => { if (e.target === el.newAgentModal) closeNewAgent(); });
  el.newAgentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawName = el.newAgentName.value.trim().toLowerCase().replace(/\s+/g, '-');
    try {
      const data = await api('/api/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: rawName,
          description: el.newAgentDesc.value.trim(),
          systemPrompt: el.newAgentPrompt.value,
        }),
      });
      closeNewAgent();
      const list = await api('/api/agents');
      state.agents = list.agents;
      await selectAgent(data.agent.slug, true);
      toast(`Agente "${data.agent.slug}" criado em ~/.gemini/config/agents/!`, 'ok');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  el.deleteAgentBtn.addEventListener('click', async () => {
    if (!state.currentSlug || state.currentSlug === 'neon-agent') return;
    if (!confirm(`Excluir permanentemente o agente "${state.currentSlug}"?`)) return;
    await api(`/api/agents/${encodeURIComponent(state.currentSlug)}`, { method: 'DELETE' });
    const list = await api('/api/agents');
    state.agents = list.agents;
    await selectAgent(state.agents[0]?.slug || 'neon-agent', true);
    toast('Agente excluído.', 'ok');
  });

  // Appearance & Pets Modal
  const closeApp = () => el.appearanceModal.classList.add('hidden');
  el.openAppearanceBtn.addEventListener('click', () => {
    closeAllPopovers();
    el.appearanceModal.classList.remove('hidden');
    prism?.animatePopoverIn(el.appearanceModal.querySelector('.modal-card'));
  });
  el.closeAppearanceBtn.addEventListener('click', closeApp);
  el.doneAppearanceBtn.addEventListener('click', closeApp);
  el.appearanceModal.addEventListener('click', (e) => { if (e.target === el.appearanceModal) closeApp(); });

  el.paletteSwatches.querySelectorAll('[data-palette]').forEach((b) => {
    b.addEventListener('click', () => { state.prefs.palette = b.dataset.palette; applyPrefs(); });
  });
  el.accentPills.querySelectorAll('[data-accent]').forEach((b) => {
    b.addEventListener('click', () => { state.prefs.accent = b.dataset.accent; applyPrefs(); });
  });
  el.petModePills.querySelectorAll('[data-pet-mode]').forEach((b) => {
    b.addEventListener('click', () => { state.prefs.petMode = b.dataset.petMode; applyPrefs(); });
  });
  el.auraPills.querySelectorAll('[data-aura]').forEach((b) => {
    b.addEventListener('click', () => { state.prefs.aura = b.dataset.aura; applyPrefs(); });
  });

  window.addEventListener('resize', () => prism?.markRimDirty());
  setupResizer();
  bindAccounts();
}

// ── Contas Antigravity (login Google / Gemini API key / ADC) ─────────────────
let acctNewType = 'apikey';
const ACCT_TYPE_META = {
  oauth: { icon: 'G', label: 'Login Google · keyring do agy' },
  apikey: { icon: '⚿', label: 'Gemini API key' },
  adc: { icon: '☁', label: 'Google Cloud ADC' },
};

async function loadAccounts() {
  const data = await api('/api/auth');
  state.auth = data;
  const active = data.profiles.find((p) => p.id === data.activeId);
  const shortLabel = active ? (active.type === 'oauth' ? 'Google' : active.name.slice(0, 14)) : 'Google';
  el.accountTag.textContent = shortLabel;
  if (el.headerAccountLabel) el.headerAccountLabel.textContent = shortLabel;
  if (el.headerAccountBtn) el.headerAccountBtn.dataset.acctType = active?.type || 'oauth';
  renderAccounts();
  return data;
}

function renderAccounts() {
  const data = state.auth;
  if (!data) return;
  el.accountsList.innerHTML = data.profiles.map((p) => {
    const meta = ACCT_TYPE_META[p.type] || ACCT_TYPE_META.oauth;
    const active = p.id === data.activeId;
    const sub = [meta.label, p.keyHint, p.baseUrl, p.project, p.location].filter(Boolean).join(' · ');
    const test = p.lastTest
      ? `<span class="acct-test ${p.lastTest.ok ? 'ok' : 'bad'}">${p.lastTest.ok ? '✓' : '✕'} ${escapeHtml(p.lastTest.message || '')}</span>`
      : '';
    return `
      <div class="acct-row ${active ? 'active' : ''}" data-acct-id="${escapeHtml(p.id)}">
        <span class="acct-icon">${meta.icon}</span>
        <span class="acct-text">
          <strong>${escapeHtml(p.name)}${active ? ' <em>ATIVA</em>' : ''}</strong>
          <small>${escapeHtml(sub)}</small>
          ${test}
        </span>
        <span class="acct-actions">
          <button type="button" class="btn btn-ghost btn-xs" data-acct-test="${escapeHtml(p.id)}">Verificar</button>
          ${active ? '' : `<button type="button" class="btn btn-prism btn-xs" data-acct-use="${escapeHtml(p.id)}">Usar</button>`}
          ${p.builtin ? '' : `<button type="button" class="icon-mini-btn" title="Remover" data-acct-del="${escapeHtml(p.id)}">✕</button>`}
        </span>
      </div>`;
  }).join('');

  el.accountsList.querySelectorAll('[data-acct-use]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await api('/api/auth/active', { method: 'POST', body: JSON.stringify({ id: b.dataset.acctUse }) });
      await loadAccounts();
      api('/api/meta?refresh=1').then((m) => { state.meta = m; }).catch(() => {});
      await startFreshSession({ clearMessages: false, preserveContext: true }).catch(() => {});
      toast('Conta trocada — próxima mensagem mantém o contexto completo deste chat.', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  }));
  el.accountsList.querySelectorAll('[data-acct-test]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    b.textContent = 'Testando…';
    try {
      const { result } = await api(`/api/auth/profiles/${encodeURIComponent(b.dataset.acctTest)}/test`, { method: 'POST' });
      toast(result.ok ? `OK · ${result.message}` : `Falhou: ${result.message}`, result.ok ? 'ok' : 'error');
      await loadAccounts();
    } catch (err) {
      toast(err.message, 'error');
      b.disabled = false;
      b.textContent = 'Verificar';
    }
  }));
  el.accountsList.querySelectorAll('[data-acct-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Remover este perfil?')) return;
    try {
      await api(`/api/auth/profiles/${encodeURIComponent(b.dataset.acctDel)}`, { method: 'DELETE' });
      await loadAccounts();
    } catch (err) { toast(err.message, 'error'); }
  }));
}

function bindAccounts() {
  const close = () => el.accountsModal.classList.add('hidden');
  const open = async () => {
    closeAllPopovers();
    el.accountsModal.classList.remove('hidden');
    prism?.animatePopoverIn(el.accountsModal.querySelector('.modal-card'));
    try { await loadAccounts(); } catch (err) { toast(err.message, 'error'); }
  };
  el.openAccountsBtn.addEventListener('click', open);
  el.headerAccountBtn?.addEventListener('click', open);
  el.closeAccountsBtn.addEventListener('click', close);
  el.accountsModal.addEventListener('click', (e) => { if (e.target === el.accountsModal) close(); });

  el.acctTypePills.querySelectorAll('[data-acct-type]').forEach((b) => b.addEventListener('click', () => {
    acctNewType = b.dataset.acctType;
    el.acctTypePills.querySelectorAll('[data-acct-type]').forEach((x) => x.classList.toggle('active', x === b));
    el.accountsModal.querySelectorAll('[data-acct-field]').forEach((f) => f.classList.toggle('hidden', f.dataset.acctField !== acctNewType));
  }));

  el.acctSaveBtn.addEventListener('click', async () => {
    try {
      await api('/api/auth/profiles', {
        method: 'POST',
        body: JSON.stringify({
          type: acctNewType,
          name: el.acctName.value,
          apiKey: el.acctKey.value,
          baseUrl: el.acctBaseUrl?.value || '',
          project: el.acctProject.value,
          location: el.acctLocation.value,
        }),
      });
      el.acctName.value = el.acctKey.value = el.acctProject.value = el.acctLocation.value = '';
      if (el.acctBaseUrl) el.acctBaseUrl.value = '';
      el.acctAddDetails.open = false;
      await loadAccounts();
      toast('Perfil salvo. Clique em "Usar" para ativar.', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  el.reconnectAccountBtn?.addEventListener('click', async () => {
    try {
      await api('/api/auth/reconnect', { method: 'POST' });
      await startFreshSession({ clearMessages: false, preserveContext: true });
      close();
      toast('Reconectado na conta ativa — sua próxima mensagem mantém todo o contexto deste chat.', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  el.googleSwitchBtn.addEventListener('click', async () => {
    try {
      await api('/api/auth/google-switch', { method: 'POST' });
      await startFreshSession({ clearMessages: false, preserveContext: true }).catch(() => {});
      toast('Terminal do agy aberto — após trocar a conta, sua próxima mensagem mantém todo o contexto deste chat.', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });

  loadAccounts().catch(() => {});
}

async function init() {
  // Mount true-vector Obsidian Prism brand logo SVG from local plugin
  if (window.__agPrismBrandLogoSvg) {
    el.brandLogoSlot.innerHTML = window.__agPrismBrandLogoSvg;
  } else {
    el.brandLogoSlot.innerHTML = GEMINI_SPARK_SVG;
  }

  prism = window.PrismBridge.createPrismBridge({
    getPrefs: () => state.prefs,
    isStreaming: () => state.streaming,
    getMascotStageEl: () => el.mascotStage,
    getCrystalTrackEl: () => (!el.crystalSliderWrap.classList.contains('hidden') ? el.crystalTrack : null),
  });

  bindEvents();
  applyPrefs();
  syncModeUI();

  try {
    const [meta, agentsData, convsData] = await Promise.all([
      api('/api/meta'),
      api('/api/agents'),
      api('/api/conversations'),
    ]);
    state.meta = meta;
    state.telemetry = meta.telemetry;
    if (Array.isArray(meta.acp?.availableCommands) && meta.acp.availableCommands.length) {
      state.acpCommands = meta.acp.availableCommands;
    }
    if (meta.acp?.tier) state.acpTier = meta.acp.tier;
    state.agents = agentsData.agents || [];
    state.conversations = convsData.conversations || [];
    state.activeModel = meta.defaultModel || 'gemini-4-neon-xhigh';
    state.activeCwd = meta.defaultCwd;
    el.cwdInput.value = state.activeCwd;

    syncModelUI();
    renderConversationsList();
    loadInstalledSkills();
    const initial = state.agents.find((a) => a.slug === 'neon-agent') || state.agents[0];
    if (initial) await selectAgent(initial.slug, true);
    prism.triggerTide();
  } catch (err) {
    toast(`Falha ao inicializar: ${err.message}`, 'error');
  }
}

// ── Live Real-Time Voice Dictation (Web Speech API + Web Audio Equalizer) ────
const voiceState = {
  active: false,
  lang: localStorage.getItem('obsidian_studio_voice_lang') || 'pt-BR',
  recognition: null,
  baseText: '',
  finalText: '',
  interimText: '',
  startedAt: 0,
  timerId: 0,
  stream: null,
  audioCtx: null,
  analyser: null,
  eqRaf: 0,
};

function setVoiceLang(raw) {
  const clean = String(raw || '').toLowerCase().startsWith('en') ? 'en-US' : 'pt-BR';
  voiceState.lang = clean;
  try { localStorage.setItem('obsidian_studio_voice_lang', clean); } catch {}
  if (el.voiceLangLabel) el.voiceLangLabel.textContent = clean;
  if (el.voiceLangBtn) el.voiceLangBtn.textContent = clean;
  if (voiceState.active) {
    stopVoiceDictation({ keepText: true, silent: true });
    setTimeout(() => startVoiceDictation(), 120);
  }
}

function composeVoiceDraft() {
  const joined = [voiceState.baseText, voiceState.finalText, voiceState.interimText]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(' ');
  setChatInputText(joined);
  syncComposerActionButtons();
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el.chatInput);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {}
  prism?.queueCaret({ typing: true });
}

async function startMicVisualizer() {
  if (!navigator.mediaDevices?.getUserMedia || !el.voiceEqBars) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) { stream.getTracks().forEach((t) => t.stop()); return; }
    const ctx = new AudioCtx();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.72;
    src.connect(analyser);

    voiceState.stream = stream;
    voiceState.audioCtx = ctx;
    voiceState.analyser = analyser;

    const bars = Array.from(el.voiceEqBars.querySelectorAll('i'));
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const step = () => {
      if (!voiceState.active || !voiceState.analyser) return;
      voiceState.analyser.getByteFrequencyData(bins);
      bars.forEach((bar, idx) => {
        const val = bins[Math.min(bins.length - 1, idx * 2 + 1)] || 0;
        const h = Math.max(4, Math.round((val / 255) * 18));
        bar.style.height = `${h}px`;
      });
      voiceState.eqRaf = requestAnimationFrame(step);
    };
    voiceState.eqRaf = requestAnimationFrame(step);
  } catch {
    // Visualizer is optional; SpeechRecognition continues independently
  }
}

function stopMicVisualizer() {
  if (voiceState.eqRaf) { cancelAnimationFrame(voiceState.eqRaf); voiceState.eqRaf = 0; }
  if (voiceState.stream) {
    try { voiceState.stream.getTracks().forEach((t) => t.stop()); } catch {}
    voiceState.stream = null;
  }
  if (voiceState.audioCtx) {
    try { voiceState.audioCtx.close(); } catch {}
    voiceState.audioCtx = null;
  }
  voiceState.analyser = null;
}

function startVoiceDictation() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('Seu navegador não suporta ditado ao vivo (use Chrome ou Edge).', 'error');
    return;
  }
  if (voiceState.active) return;

  voiceState.active = true;
  voiceState.baseText = getChatInputText().trim();
  voiceState.finalText = '';
  voiceState.interimText = '';
  voiceState.startedAt = Date.now();

  if (el.voiceLangLabel) el.voiceLangLabel.textContent = voiceState.lang;
  if (el.voiceLangBtn) el.voiceLangBtn.textContent = voiceState.lang;
  if (el.voiceInterimLabel) el.voiceInterimLabel.textContent = 'Pode falar…';
  if (el.voiceTimerLabel) el.voiceTimerLabel.textContent = '0:00';
  el.voiceLiveBar?.classList.remove('hidden');
  el.voiceMicBtn?.classList.add('recording');
  el.voiceMicBtn?.setAttribute('aria-pressed', 'true');
  prism?.notifyMascot('activity', {});

  if (voiceState.timerId) clearInterval(voiceState.timerId);
  voiceState.timerId = setInterval(() => {
    const secs = Math.floor((Date.now() - voiceState.startedAt) / 1000);
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, '0');
    if (el.voiceTimerLabel) el.voiceTimerLabel.textContent = `${m}:${s}`;
  }, 500);

  const rec = new SR();
  rec.lang = voiceState.lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    let finals = '';
    let interims = '';
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      const txt = res[0]?.transcript || '';
      if (res.isFinal) finals += `${txt} `;
      else interims += txt;
    }
    voiceState.finalText = finals.trim();
    voiceState.interimText = interims.trim();
    if (el.voiceInterimLabel) {
      el.voiceInterimLabel.textContent = voiceState.interimText ? `“…${voiceState.interimText.slice(-46)}”` : 'Transcrevendo…';
    }
    composeVoiceDraft();
  };

  rec.onerror = (event) => {
    const err = event?.error || 'unknown';
    if (err === 'no-speech' || err === 'aborted') return;
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      toast('Permissão de microfone negada no navegador.', 'error');
      stopVoiceDictation({ keepText: true, silent: true });
    } else if (err === 'audio-capture') {
      toast('Nenhum microfone detectado neste PC.', 'error');
      stopVoiceDictation({ keepText: true, silent: true });
    } else {
      toast(`Erro na transcrição de voz: ${err}`, 'warn');
    }
  };

  rec.onend = () => {
    if (voiceState.active) {
      voiceState.baseText = [voiceState.baseText, voiceState.finalText].filter(Boolean).join(' ').trim();
      voiceState.finalText = '';
      voiceState.interimText = '';
      try { rec.start(); } catch { stopVoiceDictation({ keepText: true, silent: true }); }
    }
  };

  voiceState.recognition = rec;
  try {
    rec.start();
    startMicVisualizer();
    toast(`🎙️ Ditado ao vivo ligado (${voiceState.lang}) — fale normalmente!`, 'ok');
  } catch (err) {
    stopVoiceDictation({ keepText: true, silent: true });
    toast(`Não foi possível iniciar o microfone: ${err.message}`, 'error');
  }
}

function stopVoiceDictation({ keepText = true, silent = false } = {}) {
  const wasActive = voiceState.active;
  voiceState.active = false;
  if (voiceState.timerId) { clearInterval(voiceState.timerId); voiceState.timerId = 0; }
  if (voiceState.recognition) {
    const rec = voiceState.recognition;
    voiceState.recognition = null;
    try { rec.onend = null; rec.stop(); } catch {}
  }
  stopMicVisualizer();

  el.voiceLiveBar?.classList.add('hidden');
  el.voiceMicBtn?.classList.remove('recording');
  el.voiceMicBtn?.setAttribute('aria-pressed', 'false');

  if (!keepText && wasActive) {
    setChatInputText(voiceState.baseText);
    syncComposerActionButtons();
    if (!silent) toast('Gravação descartada.', 'ok');
  } else if (wasActive) {
    voiceState.interimText = '';
    composeVoiceDraft();
    el.chatInput.focus();
    if (!silent) toast('Transcrição concluída.', 'ok');
  }
}

function toggleVoiceDictation() {
  if (voiceState.active) stopVoiceDictation({ keepText: true });
  else startVoiceDictation();
}

init();
