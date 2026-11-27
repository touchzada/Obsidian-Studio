'use strict';

/**
 * Real Obsidian Prism Runtime Bridge for Neon Agent Studio
 * Mounts all real local Obsidian Prism optical engines:
 *   - __agDualMascotRig     (Whale + Dragon + Clawd + Cat — 4, 2, or 0)
 *   - __agPrismRimCanvas    (300Hz GPU cursor-reactive prismatic rim + pet bounce light)
 *   - __agCsRippleCore + __agPrismHomeRippleHost (WebGL2 ASCII Matrix + Silk Skimmer + Horizon Glow)
 *   - __agPrismConvAura     (WebGL2 Conversation Bottom Neon Aura with Start/Liftoff/Error surges)
 *   - __agPrismSmoothCaret  (FastDOM 55ms smooth-gliding luminous typing caret)
 *   - __agVialCore          (WebGL2 24-node physical shallow-water 512K glass vial)
 *   - __agCrystalPrismCore  (WebGL2 cut-crystal refracting diamond bar for Orchestrator)
 *   - __agMotionEngine      (4-tier spring choreography & micro-interactions)
 *   - VelvetInkStreamer     (5-step CSS.highlights ag-stream-f0..f4 liquid ink reveal)
 *   - PlasmaStarfieldEngine (Reactive draggable starfield + burst particles for Effort Slider)
 */

(function (G) {
  const doc = document;
  const html = doc.documentElement;

  const setAttrIfChanged = (el, k, v) => {
    if (!el || !el.setAttribute) return;
    const str = String(v);
    if (el.getAttribute(k) !== str) el.setAttribute(k, str);
  };
  const runGuardedMut = (fn) => {
    try { fn(); } catch {}
  };
  const canMountRealCanvas = (el) => Boolean(el && el.isConnected);

  // ── 1. Velvet 5-Step CSS.highlights Ink-Wash Streaming Reveal ──────────────
  function createVelvetInkStreamer() {
    const supported = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';
    const BUCKETS = 5;
    const STEP_MS = 58;
    const NAMES = [0, 1, 2, 3, 4].map((i) => `ag-stream-f${i}`);
    let entries = []; // { range, bornAt }
    let timer = 0;

    function clearAll() {
      entries = [];
      if (timer) { clearInterval(timer); timer = 0; }
      if (!supported) return;
      for (const n of NAMES) {
        try { CSS.highlights.delete(n); } catch {}
      }
    }

    function tick() {
      if (!supported) return;
      const now = performance.now();
      const buckets = Array.from({ length: BUCKETS }, () => []);
      const alive = [];

      for (const item of entries) {
        try {
          if (!item.range.startContainer?.isConnected) continue;
        } catch { continue; }
        const age = now - item.bornAt;
        const step = Math.floor(age / STEP_MS);
        if (step >= BUCKETS) continue;
        buckets[Math.max(0, step)].push(item.range);
        alive.push(item);
      }

      entries = alive;
      for (let i = 0; i < BUCKETS; i++) {
        if (buckets[i].length > 0) {
          try { CSS.highlights.set(NAMES[i], new Highlight(...buckets[i])); } catch {}
        } else {
          try { CSS.highlights.delete(NAMES[i]); } catch {}
        }
      }

      if (entries.length === 0 && timer) {
        clearInterval(timer);
        timer = 0;
      }
    }

    function featherTail(container, charCount) {
      if (!supported || !container || charCount <= 0) return;
      // Walk text nodes from the end and create ranges covering the newly streamed tail
      const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.length > 0) textNodes.push(node);
      }
      if (!textNodes.length) return;

      let remaining = Math.min(charCount, 120);
      const now = performance.now();
      for (let i = textNodes.length - 1; i >= 0 && remaining > 0; i--) {
        const tn = textNodes[i];
        const len = tn.nodeValue.length;
        const take = Math.min(len, remaining);
        try {
          const range = doc.createRange();
          range.setStart(tn, len - take);
          range.setEnd(tn, len);
          entries.push({ range, bornAt: now });
        } catch {}
        remaining -= take;
      }

      if (entries.length > 42) entries = entries.slice(-42);
      tick();
      if (!timer && entries.length > 0) {
        timer = setInterval(tick, STEP_MS);
      }
    }

    return { featherTail, clearAll };
  }

  // ── 2. Main Obsidian Prism Runtime Bridge ──────────────────────────────────
  function createPrismBridge(opts) {
    let destroyed = false;
    let msRig = null;
    let vialCtl = null;
    let crystalCtl = null;
    let crystalRaf = 0;
    let crystalLastMs = 0;
    let rimCtl = null;
    let rippleCtl = null;
    let convAuraCtl = null;
    let smoothCaretCtl = null;
    const inkStreamer = createVelvetInkStreamer();

    const getPrefs = opts.getPrefs;
    const isDarkTheme = () => {
      const pal = getPrefs().palette;
      return pal !== 'crystal' && pal !== 'alabaster';
    };
    const getAmbient = () => {
      const v = Number(getPrefs().aura);
      return Number.isFinite(v) ? v : 1;
    };
    const getAccent = () => getPrefs().accent || 'follow';

    // 1. Bind real Motion Engine micro-interactions
    const motion = G.__agMotionEngine || null;
    if (motion?.bindMicroInteractions) {
      motion.bindMicroInteractions(doc.body);
    }

    // 2. Mount real 300Hz GPU Prism Rim Canvas Controller
    const rimMod = G.__agPrismRimCanvas;
    if (rimMod?.createPrismRimCanvasController) {
      rimCtl = rimMod.createPrismRimCanvasController({
        isDestroyed: () => destroyed,
        isDarkTheme,
        motionReduced: () => false,
        getMinFrameGapMs: () => 5.5,
        getAmbientIntensity: getAmbient,
        getAccentTone: getAccent,
        canMountRealCanvas,
        setAttrIfChanged,
        runGuardedMut,
        getActiveCrystalTrack: () => opts.getCrystalTrackEl?.() || null,
        setCrystalPointerClient: (x, y) => {
          if (crystalCtl?.setPointerClient) {
            crystalCtl.setPointerClient(x, y);
            wakeCrystalLoop();
          }
        },
        onPointerActivity: () => {
          try { msRig?.notify?.('activity', {}); } catch {}
        },
        onComposerRimUpdate: (info) => {
          try { msRig?.setRimLight?.(info); } catch {}
        },
      });
      window.addEventListener('pointermove', (e) => rimCtl.onPointerMove(e), { passive: true });
    }

    // 3. Mount real WebGL2 ASCII Matrix + Silk Skimmer Ripple + Brand Horizon Glow
    const rippleCore = G.__agCsRippleCore;
    const homeRippleMod = G.__agPrismHomeRippleHost;
    if (rippleCore && homeRippleMod?.createHomeRippleController) {
      rippleCtl = homeRippleMod.createHomeRippleController({
        rippleCore,
        isDestroyed: () => destroyed,
        isAllowed: () => getAmbient() > 0.01,
        isConvAllowed: () => false, // In conversation mode, conv-aura.js owns the bottom neon glow!
        getConvLevel: () => 'off',
        isConvRunning: () => Boolean(opts.isStreaming?.()),
        isDarkTheme,
        motionReduced: () => false,
        getMinFrameGapMs: () => 8,
        getAmbientIntensity: getAmbient,
        getAccentTone: getAccent,
        setAttrIfChanged,
        onPointerPressMascot: () => {
          try { msRig?.notify?.('activity', {}); } catch {}
        },
      });
    }

    // 4. Mount real WebGL2 Conversation Bottom Neon Horizon Aura (conv-aura.js!)
    const convAuraMod = G.__agPrismConvAura;
    if (rippleCore && convAuraMod?.createConvAuraController) {
      convAuraCtl = convAuraMod.createConvAuraController({
        isDestroyed: () => destroyed,
        isHomeRippleEnabled: () => getAmbient() > 0.01,
        isMotionStandardOrUltra: () => true,
        isDarkTheme,
        getMinFrameGapMs: () => 16,
        getAmbientIntensity: getAmbient,
        getSpectrumMode: () => {
          const acc = getAccent();
          if (acc !== 'follow') return acc;
          return getPrefs().palette === 'warm' ? 'warm' : 'default';
        },
        isWindowFocused: () => !doc.hidden,
        rippleCore,
        setAttrIfChanged,
        runGuardedMut,
      });
    }

    // 5. Mount real FastDOM Smooth Gliding Caret (smooth-caret.js!)
    const caretMod = G.__agPrismSmoothCaret;
    if (caretMod?.createSmoothCaretController) {
      smoothCaretCtl = caretMod.createSmoothCaretController({
        isDestroyed: () => destroyed,
        isEnabled: () => true,
        setAttrIfChanged,
        runGuardedMut,
      });
    }

    // 6. Mount real Dual / Quad Mascot Stage (Whale + Dragon + Clawd + Cat — 4, 2, or 0)
    function syncMascots(stateObj) {
      const stageEl = opts.getMascotStageEl?.();
      const rigMod = G.__agDualMascotRig;
      if (!stageEl || !rigMod?.mountDualMascotStage) return;

      const mode = stateObj.mascot || 'quad';
      if (mode === 'off') {
        if (msRig) {
          try { (msRig.dispose || msRig.destroy)?.call(msRig); } catch {}
          msRig = null;
        }
        stageEl.textContent = '';
        stageEl.style.display = 'none';
        html.removeAttribute('data-ag-cs-has-crab');
        return;
      }

      stageEl.style.display = '';
      setAttrIfChanged(html, 'data-ag-cs-has-crab', '1');

      const nextState = {
        camp: stateObj.camp || 'gemini',
        mascot: mode,
        streaming: Boolean(stateObj.streaming),
        streamTier: stateObj.streamTier || 3,
        hasError: Boolean(stateObj.hasError),
        yieldMode: stateObj.yieldMode || 'none',
        leapOffsetY: Number(stateObj.leapOffsetY || 0),
        popoverRightWidth: 0,
        miniPileEnabled: false,
        orchestrator: Boolean(stateObj.orchestrator),
        reducedMotion: false,
      };

      if (!msRig) {
        try {
          msRig = rigMod.mountDualMascotStage(stageEl, nextState);
        } catch (err) {
          console.warn('[PrismBridge] mascot mount failed:', err);
          msRig = null;
        }
      } else {
        try { msRig.setState?.(nextState); } catch {}
      }
    }

    function notifyMascot(eventName, payload = {}) {
      try { msRig?.notify?.(eventName, payload); } catch {}
    }

    // 7. Mount real 512K Physical Water Vial (vial-core.js)
    const vialStateRef = {
      fill: 0.08,
      streaming: false,
      hoveredSlice: -1,
      ratios: [0.34, 0.33, 0.33],
      camp: 'gemini',
      maxTokens: 512000,
    };

    // Host-driven rAF loop (mirrors pulse-vial-bridge.js): vial-core never self-animates.
    let vialRaf = 0;
    let vialLastTs = 0;
    let vialOpen = false;
    const clampVialFill = (f) => Math.min(0.95, Math.max(0.06, Number(f) || 0));

    function scheduleVial() {
      if (vialRaf || !vialCtl || destroyed || !vialOpen) return;
      vialLastTs = 0;
      const tick = (ts) => {
        vialRaf = 0;
        if (!vialCtl || destroyed || !vialOpen) return;
        const dt = vialLastTs ? Math.min(0.05, Math.max(0.004, (ts - vialLastTs) / 1000)) : 0.016;
        vialLastTs = ts;
        try { vialCtl.step(dt); } catch (err) { console.warn('[PrismBridge] vial step failed', err); return; }
        if (vialStateRef.streaming || !vialCtl.isSettled?.()) {
          vialRaf = requestAnimationFrame(tick);
        }
      };
      vialRaf = requestAnimationFrame(tick);
    }

    function setVialOpen(open) {
      vialOpen = Boolean(open);
      if (!vialOpen && vialRaf) { cancelAnimationFrame(vialRaf); vialRaf = 0; }
      if (vialOpen && vialCtl) {
        try { vialCtl.step(0.016); } catch {}
        scheduleVial();
      }
    }

    function mountVial(canvas) {
      const vialMod = G.__agVialCore;
      if (!canvas || !vialMod?.mountPhysicalWaterVial) return null;
      if (vialCtl) return vialCtl;
      const baseState = () => ({
        isDark: isDarkTheme(),
        streaming: vialStateRef.streaming,
        fill: clampVialFill(vialStateRef.fill),
      });
      vialCtl = vialMod.mountPhysicalWaterVial(canvas, {
        ...baseState(),
        maxTokens: 512000,
        reduceMotion: false,
        onWake: () => scheduleVial(),
        getState: () => ({
          ...baseState(),
          camp: vialStateRef.camp,
          critical: vialStateRef.fill >= 0.85,
          maxTokens: vialStateRef.maxTokens,
          hoveredSlice: vialStateRef.hoveredSlice,
          ratios: vialStateRef.ratios,
          accentTone: getAccent(),
          palette: getPrefs().palette === 'warm' ? 'warm' : 'obsidian',
          lightPreset: getPrefs().palette === 'alabaster' ? 'alabaster' : 'crystal',
        }),
      });
      canvas.addEventListener('pointerenter', () => { try { vialCtl?.tilt?.(0.14); } catch {} });
      return vialCtl;
    }

    function updateVialState(patch) {
      Object.assign(vialStateRef, patch);
      if (vialCtl) {
        vialCtl.setTheme?.(isDarkTheme());
        if (typeof patch.fill === 'number') vialCtl.impulse?.(0.5);
        vialCtl.wake?.();
        scheduleVial();
      }
    }

    // 8. Mount real Cut-Crystal Prism Bar for Orchestrator (exact model-glyph-crystal.js params)
    function wakeCrystalLoop() {
      if (crystalRaf || !crystalCtl) return;
      crystalLastMs = performance.now();
      const step = (ts) => {
        crystalRaf = 0;
        if (!crystalCtl || destroyed) return;
        const dt = Math.min(0.05, Math.max(0.004, (ts - crystalLastMs) / 1000));
        crystalLastMs = ts;
        try { crystalCtl.step?.(dt); } catch {}
        if (!crystalCtl.isIdle?.()) {
          crystalRaf = requestAnimationFrame(step);
        }
      };
      crystalRaf = requestAnimationFrame(step);
    }

    function mountCrystalBar(canvas) {
      const cMod = G.__agCrystalPrismCore;
      if (!canvas || !cMod?.mountCrystalPrismBar) return;
      if (crystalCtl) {
        try { crystalCtl.dispose?.(); } catch {}
        crystalCtl = null;
      }
      crystalCtl = cMod.mountCrystalPrismBar(canvas, {
        reduceMotion: false,
        getState: () => ({
          isDark: isDarkTheme(),
          prismStrength: 1,
          accentTone: getAccent(),
          ambientIntensity: getAmbient(),
          fillRatio: -1,
          hideLock: false,
        }),
      });
      try {
        crystalCtl.wake?.();
        crystalCtl.step?.(0.016);
      } catch {}
      wakeCrystalLoop();
    }

    function disposeCrystalBar() {
      if (crystalRaf) { cancelAnimationFrame(crystalRaf); crystalRaf = 0; }
      if (crystalCtl) {
        try { crystalCtl.dispose?.(); } catch {}
        crystalCtl = null;
      }
    }

    function animatePopoverIn(el) {
      if (!el || typeof el.animate !== 'function') return;
      el.animate(
        [
          { opacity: 0, transform: 'translateY(6px) scale(0.96)' },
          { opacity: 1, transform: 'translateY(0px) scale(1)' },
        ],
        { duration: 200, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' }
      );
    }

    function animateMessageIn(el) {
      if (!el || typeof el.animate !== 'function') return;
      el.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0px)' },
        ],
        { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
    }

    function syncConvAura(activeViewEl) {
      if (!convAuraCtl) return;
      try {
        if (activeViewEl) {
          convAuraCtl.setActiveView?.(activeViewEl);
          convAuraCtl.sync?.();
        } else {
          convAuraCtl.unmount?.();
        }
      } catch {}
    }

    function syncVisuals() {
      const p = getPrefs();
      const dark = isDarkTheme();
      setAttrIfChanged(html, 'data-ag-cs-style', '1');
      setAttrIfChanged(html, 'data-ag-cs-palette', p.palette === 'warm' ? 'warm' : 'obsidian');
      setAttrIfChanged(html, 'data-ag-cs-light-preset', p.palette === 'alabaster' ? 'alabaster' : 'crystal');
      setAttrIfChanged(html, 'data-ag-cs-theme', dark ? 'dark' : 'light');
      setAttrIfChanged(html, 'data-ag-cs-accent', p.accent || 'follow');
      setAttrIfChanged(html, 'data-ag-cs-ambient', String(p.aura ?? '1'));
      setAttrIfChanged(html, 'data-ag-cs-motion', 'ultra');
      setAttrIfChanged(html, 'data-ag-cs-composer', 'on');
      setAttrIfChanged(html, 'data-ag-cs-dark-aura-style', 'neon');
      setAttrIfChanged(html, 'data-ag-cs-dark-aura', 'balanced');

      try { rippleCtl?.sync?.(); rippleCtl?.refreshTheme?.(); } catch {}
      try {
        convAuraCtl?.setAmbientIntensity?.(getAmbient());
        convAuraCtl?.refreshTheme?.();
      } catch {}
      try { rimCtl?.markDirty?.(); } catch {}
      try { vialCtl?.setTheme?.(dark); vialCtl?.wake?.(); scheduleVial(); } catch {}
      try { crystalCtl?.invalidate?.(); wakeCrystalLoop(); } catch {}
      try { smoothCaretCtl?.bumpMetricsEpoch?.(); smoothCaretCtl?.queue?.({ refreshMetrics: true }); } catch {}
    }

    return {
      syncVisuals,
      syncMascots,
      notifyMascot,
      mountVial,
      setVialOpen,
      updateVialState,
      getVial: () => vialCtl,
      mountCrystalBar,
      disposeCrystalBar,
      wakeCrystalLoop,
      syncRipple: () => { try { rippleCtl?.sync?.(); } catch {} },
      triggerLiftoff: (rect) => { try { rippleCtl?.triggerLiftoffBurst?.(rect); } catch {} },
      triggerTide: () => { try { rippleCtl?.triggerTideSwell?.(); } catch {} },
      syncConvAura,
      convAuraStart: () => { try { convAuraCtl?.triggerStart?.(); } catch {} },
      convAuraComplete: () => { try { convAuraCtl?.triggerLiftoffEbb?.(); } catch {} },
      convAuraError: () => { try { convAuraCtl?.triggerErrorHalted?.(); } catch {} },
      queueCaret: (flags) => { try { smoothCaretCtl?.queue?.(flags || {}); } catch {} },
      bumpCaretMetrics: () => { try { smoothCaretCtl?.bumpMetricsEpoch?.(); } catch {} },
      featherInkTail: (container, chars) => inkStreamer.featherTail(container, chars),
      clearInkTail: () => inkStreamer.clearAll(),
      markRimDirty: () => { try { rimCtl?.markDirty?.(); rimCtl?.invalidateMetrics?.(); } catch {} },
      animatePopoverIn,
      animateMessageIn,
      dispose() {
        destroyed = true;
        if (vialRaf) { cancelAnimationFrame(vialRaf); vialRaf = 0; }
        disposeCrystalBar();
        inkStreamer.clearAll();
        try { msRig?.dispose?.(); } catch {}
        try { vialCtl?.dispose?.(); } catch {}
        try { rimCtl?.teardown?.(); } catch {}
        try { rippleCtl?.unmount?.(); } catch {}
        try { convAuraCtl?.unmount?.(); } catch {}
        try { smoothCaretCtl?.teardown?.(); } catch {}
      },
    };
  }

  G.PrismBridge = { createPrismBridge };
})(window);
