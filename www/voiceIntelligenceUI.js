/**
 * Apple Intelligence-style voice UI — luminous edge, orb pulse saat live, Dynamic Island.
 * Tidak mengubah arsitektur voice/WebSocket; hanya visual + analyser hook.
 */

/** @param {import("../shared/chatCore.js").ChatTransport & { voice?: { getAnalyser?: () => AnalyserNode | null, isActive?: () => boolean } }} transport */
export function initVoiceIntelligenceUI(transport) {
  const app = document.getElementById("app");
  const voiceOrb = document.getElementById("btn-alkitab-voice");
  const panel = document.getElementById("voice-transcript-panel");
  const panelToggle = document.getElementById("btn-voice-panel-toggle");

  if (!app) return;

  const waveformCanvas = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById("voice-waveform")
  );
  let waveformCtx = waveformCanvas?.getContext("2d") || null;

  function resizeWaveformCanvas() {
    if (!waveformCanvas) return;
    const rect = waveformCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    waveformCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    waveformCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    waveformCtx = waveformCanvas.getContext("2d");
    if (waveformCtx) waveformCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawWaveform(level) {
    if (!waveformCanvas || !waveformCtx) return;
    const w = waveformCanvas.clientWidth;
    const h = waveformCanvas.clientHeight;
    waveformCtx.clearRect(0, 0, w, h);
    if (!live && !connecting) return;

    const bars = 24;
    const gap = 3;
    const barW = (w - gap * (bars - 1)) / bars;
    for (let i = 0; i < bars; i++) {
      const t = performance.now() / 220 + i * 0.45;
      const wave = 0.25 + Math.sin(t) * 0.18 + level * 0.55;
      const barH = Math.max(4, h * wave);
      const x = i * (barW + gap);
      const y = (h - barH) / 2;
      waveformCtx.fillStyle = connecting ? "rgba(0,122,255,0.35)" : "rgba(0,122,255,0.75)";
      waveformCtx.beginPath();
      waveformCtx.roundRect(x, y, barW, barH, 3);
      waveformCtx.fill();
    }
  }

  resizeWaveformCanvas();
  window.addEventListener("resize", resizeWaveformCanvas);

  let raf = 0;
  let live = false;
  let connecting = false;
  let glowAngle = 0;

  function readMicLevel() {
    const analyser = transport.voice?.getAnalyser?.();
    if (!analyser) {
      if (!live) return 0;
      const t = performance.now() / 1000;
      return 0.12 + Math.sin(t * 3.2) * 0.06;
    }
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buf);
    let sum = 0;
    const n = Math.min(buf.length, 48);
    for (let i = 0; i < n; i++) sum += buf[i];
    return Math.min(1, (sum / n / 255) * 2.6);
  }

  function updateOrbPulse() {
    if (!voiceOrb) {
      drawWaveform(0);
      raf = requestAnimationFrame(updateOrbPulse);
      return;
    }

    if (!live && !connecting) {
      voiceOrb.classList.remove("voice-capturing");
      voiceOrb.style.removeProperty("--orb-pulse");
      drawWaveform(0);
      raf = requestAnimationFrame(updateOrbPulse);
      return;
    }

    const level = readMicLevel();
    drawWaveform(level);
    const scale = 1.02 + level * 0.14;
    voiceOrb.style.setProperty("--orb-pulse", scale.toFixed(3));
    voiceOrb.classList.toggle("voice-capturing", level > 0.07);
    raf = requestAnimationFrame(updateOrbPulse);
  }

  function setLiveState(status, profile) {
    if (profile && profile !== "alkitab-voice" && status === "live") return;
    live = status === "live";
    connecting = status === "connecting";
    app.classList.toggle("voice-live-active", live);
    app.classList.toggle("voice-connecting", connecting);
    document.querySelector(".nav-item-voice")?.classList.toggle("rhema-voice-on", live || connecting);
    if (!raf) raf = requestAnimationFrame(updateOrbPulse);
  }

  transport.onMessage?.((msg) => {
    const m = /** @type {{ type?: string, status?: string, profile?: string }} */ (msg);
    if (m.type === "voiceStatus") setLiveState(m.status || "off", m.profile);
  });

  panelToggle?.addEventListener("click", () => {
    const collapsed = panel?.classList.toggle("collapsed");
    panelToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    app.classList.toggle("voice-panel-collapsed", !!collapsed);
  });

  app.style.setProperty("--glow-angle", "0deg");
  setInterval(() => {
    glowAngle = (glowAngle + 1.2) % 360;
    app.style.setProperty("--glow-angle", `${glowAngle}deg`);
  }, 50);

  raf = requestAnimationFrame(updateOrbPulse);
}
