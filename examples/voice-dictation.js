/**
 * VoiceDictation — Módulo standalone zero-dependência de ditado por voz ao vivo
 * Usa Web Speech API (Chrome / Edge / Electron) + Web Audio API (equalizador opcional).
 *
 * Recursos:
 *  - Transcrição em tempo real (interimResults + finais) sem travar a UI
 *  - Auto-reconexão transparente quando o navegador encerra a sessão após silêncio/tempo
 *  - Preserva texto que já existia no input (baseText) e permite cancelar sem perder nada
 *  - Equalizador de áudio opcional via Web Audio API (AnalyserNode)
 *  - Alternância de idioma em tempo real (ex: 'pt-BR', 'en-US')
 *
 * Exemplo de uso:
 *   import { createVoiceDictation } from './voice-dictation.js';
 *
 *   const voice = createVoiceDictation({
 *     lang: 'pt-BR',
 *     enableVisualizer: true,
 *     onText: ({ text, interimText }) => {
 *       textarea.value = text;
 *     },
 *     onLevel: (bands) => {
 *       // bands = array de 0..1 (ex: 7 barras de equalizador)
 *     },
 *     onStateChange: ({ active, lang, elapsedMs }) => {
 *       micBtn.classList.toggle('recording', active);
 *     },
 *     onError: ({ code, message }) => console.warn(code, message),
 *   });
 *
 *   micBtn.addEventListener('click', () => voice.toggle(textarea.value));
 */

export function isVoiceDictationSupported() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createVoiceDictation(options = {}) {
  const {
    lang: initialLang = 'pt-BR',
    enableVisualizer = true,
    visualizerBands = 7,
    fftSize = 64,
    smoothingTimeConstant = 0.72,
    onText = () => {},
    onLevel = () => {},
    onStateChange = () => {},
    onError = () => {},
    onEnd = () => {},
  } = options;

  const state = {
    active: false,
    lang: initialLang,
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

  const emitState = () => {
    onStateChange({
      active: state.active,
      lang: state.lang,
      elapsedMs: state.active ? Date.now() - state.startedAt : 0,
    });
  };

  const composeText = () =>
    [state.baseText, state.finalText, state.interimText]
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .join(' ');

  const emitText = () => {
    onText({
      text: composeText(),
      baseText: state.baseText,
      finalText: state.finalText,
      interimText: state.interimText,
    });
  };

  async function startVisualizer() {
    if (!enableVisualizer || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AudioCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      src.connect(analyser);

      state.stream = stream;
      state.audioCtx = ctx;
      state.analyser = analyser;

      const bins = new Uint8Array(analyser.frequencyBinCount);
      const step = () => {
        if (!state.active || !state.analyser) return;
        state.analyser.getByteFrequencyData(bins);
        const bands = [];
        for (let i = 0; i < visualizerBands; i++) {
          const val = bins[Math.min(bins.length - 1, i * 2 + 1)] || 0;
          bands.push(val / 255);
        }
        onLevel(bands);
        state.eqRaf = requestAnimationFrame(step);
      };
      state.eqRaf = requestAnimationFrame(step);
    } catch {
      // Visualizador é opcional — o reconhecimento de voz segue funcionando sem ele
    }
  }

  function stopVisualizer() {
    if (state.eqRaf) {
      cancelAnimationFrame(state.eqRaf);
      state.eqRaf = 0;
    }
    if (state.stream) {
      try { state.stream.getTracks().forEach((t) => t.stop()); } catch {}
      state.stream = null;
    }
    if (state.audioCtx) {
      try { state.audioCtx.close(); } catch {}
      state.audioCtx = null;
    }
    state.analyser = null;
  }

  function start(initialText = '') {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      onError({ code: 'unsupported', message: 'Navegador sem suporte à Web Speech API (use Chrome ou Edge).' });
      return false;
    }
    if (state.active) return true;

    state.active = true;
    state.baseText = String(initialText || '').trim();
    state.finalText = '';
    state.interimText = '';
    state.startedAt = Date.now();

    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(emitState, 500);
    emitState();

    const rec = new SR();
    rec.lang = state.lang;
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
      state.finalText = finals.trim();
      state.interimText = interims.trim();
      emitText();
    };

    rec.onerror = (event) => {
      const code = event?.error || 'unknown';
      if (code === 'no-speech' || code === 'aborted') return;
      const messages = {
        'not-allowed': 'Permissão de microfone negada no navegador.',
        'service-not-allowed': 'Serviço de reconhecimento de voz bloqueado pelo navegador.',
        'audio-capture': 'Nenhum microfone detectado.',
        network: 'Falha de rede ao conectar ao motor de reconhecimento de voz.',
      };
      onError({ code, message: messages[code] || `Erro na transcrição de voz: ${code}` });
      if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
        stop({ keepText: true });
      }
    };

    // Segredo para gravações longas: o navegador encerra após pausas;
    // consolidamos finalText em baseText e religamos automaticamente.
    rec.onend = () => {
      if (!state.active) return;
      state.baseText = [state.baseText, state.finalText].filter(Boolean).join(' ').trim();
      state.finalText = '';
      state.interimText = '';
      try {
        rec.start();
      } catch {
        stop({ keepText: true });
      }
    };

    state.recognition = rec;
    try {
      rec.start();
      startVisualizer();
      return true;
    } catch (err) {
      stop({ keepText: true });
      onError({ code: 'start-failed', message: err?.message || 'Falha ao iniciar microfone.' });
      return false;
    }
  }

  function stop({ keepText = true } = {}) {
    const wasActive = state.active;
    state.active = false;
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = 0;
    }
    if (state.recognition) {
      const rec = state.recognition;
      state.recognition = null;
      try {
        rec.onend = null;
        rec.stop();
      } catch {}
    }
    stopVisualizer();
    emitState();

    if (!wasActive) return composeText();

    if (!keepText) {
      state.finalText = '';
      state.interimText = '';
      emitText();
      onEnd({ kept: false, text: state.baseText });
      return state.baseText;
    }

    state.interimText = '';
    const finalMerged = composeText();
    emitText();
    onEnd({ kept: true, text: finalMerged });
    return finalMerged;
  }

  function toggle(initialText = '') {
    return state.active ? (stop({ keepText: true }), false) : start(initialText);
  }

  function setLang(nextLang) {
    if (!nextLang || nextLang === state.lang) return;
    state.lang = nextLang;
    if (state.active) {
      const current = stop({ keepText: true });
      setTimeout(() => start(current), 120);
    } else {
      emitState();
    }
  }

  function destroy() {
    stop({ keepText: true });
  }

  return {
    start,
    stop,
    toggle,
    setLang,
    destroy,
    isSupported: isVoiceDictationSupported,
    getState: () => ({ active: state.active, lang: state.lang, text: composeText() }),
  };
}
