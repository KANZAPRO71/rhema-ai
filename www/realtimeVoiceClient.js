/**
 * Speech-to-Speech client — mode direct (browser → Gemini WS) atau proxy (extension).
 */

import { createGeminiLiveSession } from "./geminiLiveClient.js?v=20260819-1509";
import { speakModuleReply, stopModuleSpeech, warmupModuleSpeech } from "./voiceModuleSpeech.js";
import { speakIndonesianText } from "./ambientAudio.js";
import { loadLocalMemory } from "./memoryStore.js";
import { unlockNativeElementAudio, isCapacitorNative, playPcmBase64Native, resetNativePlayback, waitNativePlaybackIdle, warmupNativePlayback } from "./nativeAudioPlayback.js";
import { ensureNativeMicPermission } from "./nativeMicPermission.js";
import { getStoredGoogleKey } from "./geminiConstants.js";
import { buildSessionConfigResponse } from "./voiceProfiles.js";
import { getUiLocale, isIndonesiaProfile } from "./localeProfile.js";
import { handleVoiceLocalCommand } from "./voiceLocalCommands.js";

const DEFAULT_INPUT_RATE = 24000;
const DEFAULT_OUTPUT_RATE = 24000;

/** @param {import("./chatCore.js").ChatTransport & { voiceMode?: string, broadcast?: (msg:unknown)=>void, voiceProfile?: string, voiceTextReplies?: boolean, voice?: { isLive?:()=>boolean, isActive?:()=>boolean, sendTextOrStart?:(t:string)=>Promise<void>|void } }} transport */
export function initRealtimeVoiceClient(transport) {
  if (transport.voiceMode === "direct") {
    return initDirectGeminiVoice(transport);
  }
  return initProxyVoice(transport);
}

/** Browser: GET /api/session-config → WebSocket langsung ke Gemini Live */
function initDirectGeminiVoice(transport) {
  const btn = document.getElementById("btn-voice-live");
  const pill = document.getElementById("voice-live-pill");
  const micPill = document.getElementById("voice-mic-pill");
  const profile = transport.voiceProfile || "rhema-ide";

  function apiFetch(path, init) {
    if (typeof transport.apiFetch === "function") return transport.apiFetch(path, init);
    return fetch(path, init);
  }

  function emit(event) {
    if (transport.broadcast) transport.broadcast(event);
  }

  function setMicPill(active, label, detail) {
    if (!micPill) return;
    if (active) {
      micPill.classList.remove("hidden");
      micPill.classList.add("active");
      micPill.textContent = label ? `🎤 ${label.slice(0, 18)}` : "🎤 Aktif";
      micPill.title = detail || label || "Mikrofon aktif";
    } else {
      micPill.classList.add("hidden");
      micPill.classList.remove("active");
    }
  }

  function setPill(status, detail) {
    if (!pill) return;
    pill.classList.remove("hidden", "live", "error");
    if (status === "live") {
      pill.textContent = detail ? `LIVE · ${detail}` : "LIVE";
      pill.classList.add("live");
      btn?.classList.add("active");
    } else if (status === "connecting") {
      pill.textContent = detail || "Menghubungkan…";
      pill.classList.remove("hidden");
    } else if (status === "error") {
      pill.textContent = detail || "Error";
      pill.classList.add("error");
      btn?.classList.remove("active");
      setMicPill(false);
    } else {
      pill.classList.add("hidden");
      btn?.classList.remove("active");
      setMicPill(false);
    }
  }

  const session = createGeminiLiveSession({
    nativePlaybackOnly: isCapacitorNative(),
    fetchSessionConfig: async () => {
      const voiceName = (typeof localStorage !== "undefined" && localStorage.getItem("rhema-voice-name")) || "Puck";
      const personaId = (typeof localStorage !== "undefined" && localStorage.getItem("rhema-persona-id")) || "pastor";
      if (isCapacitorNative()) {
        const key = getStoredGoogleKey();
        if (!key) {
          return { error: "Gemini API key belum diset. Buka Akun → ⚙ Pengaturan & API Key → Simpan." };
        }
        return buildSessionConfigResponse({
          apiKey: key,
          profileId: profile,
          voiceName,
          personaId,
          mobileLean: true,
        });
      }
      const res = await apiFetch(
        `/api/session-config?profile=${encodeURIComponent(profile)}&voiceName=${encodeURIComponent(voiceName)}&personaId=${encodeURIComponent(personaId)}`
      );
      const data = await res.json();
      if (!res.ok) return { error: data.error || `HTTP ${res.status}` };
      return data;
    },
    executeTool: async (call) => {
      const res = await apiFetch("/api/voice/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(call),
      });
      return res.json();
    },
    emit: (event) => {
      if (event.type === "voiceModuleSpeak" && event.text) {
        haltNativePlayback();
        if (profile === "alkitab-voice") {
          if (isIndonesiaProfile()) {
            speakIndonesianText(String(event.text), { stopAmbientOnEnd: false });
          } else {
            speakModuleReply(String(event.text), getUiLocale());
          }
        } else {
          speakModuleReply(String(event.text), navigator.language || "id-ID");
        }
      }
      if (event.type === "voiceMicStatus") {
        setMicPill(!!event.active, event.label, event.detail);
      }
      if (event.type === "voiceStatus") {
        const s = event.status;
        if (s === "live") setPill("live", event.profile === "alkitab-voice" ? "Alkitab" : "Rhema");
        else if (s === "connecting") setPill("connecting", event.detail);
        else if (s === "error") setPill("error", event.detail);
        else if (s === "off") setPill("off");
      }
      emit(event);
    },
    tryHandleLocalQuery: (text) => handleVoiceLocalCommand(text, emit, { userAlreadyShown: true }).handled,
  });

  btn?.addEventListener("click", () => {
    if (session.isActive()) session.stop();
    else void session.start({ mic: true });
  });

  const voiceApi = {
    isLive: () => session.isLive(),
    isActive: () => session.isActive(),
    isMicActive: () => session.isMicActive?.() ?? false,
    enableMic: (opts) => session.enableMic?.(opts),
    interruptPlayback: () => session.interruptPlayback?.() ?? false,
    sendText: (text) => session.sendText(text),
    sendClientContent: (text) => session.sendClientContent?.(text) ?? session.sendText(text),
    sendTextOrStart: (text, opts) =>
      session.sendTextOrStart(text, { mic: false, preferClientContent: false, ...opts }),
    start: (opts) => session.start(opts),
    stop: () => session.stop(),
    waitForPlaybackIdle: () => session.waitForPlaybackIdle?.() ?? Promise.resolve(),
    getAnalyser: () => session.getAnalyser?.() ?? null,
  };
  transport.voice = voiceApi;
  return voiceApi;
}

/** Browser + extension: audio relay via postMessage / webServer WS → Gemini Live */
function initProxyVoice(transport) {
  let inputRate = 16000;
  let outputRate = 24000;
  let pcmOutputRate = 24000;
  let micCtx = null;
  let playbackCtx = null;
  let mediaStream = null;
  let processor = null;
  let sourceNode = null;
  let live = false;
  let connecting = false;
  let wantMic = false;
  let playTime = 0;
  let gainNode = null;
  let playChain = null;
  /** @type {string[]} */
  let pendingTexts = [];
  /** @type {ReturnType<typeof setTimeout> | null} */
  let moduleSpeechFallbackTimer = null;
  let moduleSpeechGotAudio = false;
  let liveAssistantTtsText = "";
  /** @type {ReturnType<typeof setTimeout> | null} */
  let connectWatchdog = null;

  function clearConnectWatchdog() {
    if (connectWatchdog) {
      clearTimeout(connectWatchdog);
      connectWatchdog = null;
    }
  }

  function armConnectWatchdog() {
    clearConnectWatchdog();
    connectWatchdog = setTimeout(() => {
      if (!connecting || live) return;
      connecting = false;
      stopMic();
      transport.post({ type: "voiceStop" });
      setPill("error", "Koneksi voice timeout — coba lagi.");
    }, 25000);
  }

  warmupModuleSpeech();

  function clearModuleSpeechFallback() {
    if (moduleSpeechFallbackTimer) {
      clearTimeout(moduleSpeechFallbackTimer);
      moduleSpeechFallbackTimer = null;
    }
  }

  /** @param {string} text */
  function scheduleModuleSpeechFallback(text) {
    // Alkitab Voice = Gemini Live full duplex saja — jangan TTS browser.
    if ((transport.voiceProfile || "rhema-ide") === "alkitab-voice") return;
    if (transport.voiceTtsFallback === false) return;
    clearModuleSpeechFallback();
    moduleSpeechGotAudio = false;
    moduleSpeechFallbackTimer = setTimeout(() => {
      moduleSpeechFallbackTimer = null;
      if (!moduleSpeechGotAudio && text?.trim()) {
        speakModuleReply(text, navigator.language || "id-ID");
      }
    }, 4500);
  }

  function collectVoiceClientMeta() {
    let timezone = "";
    const locale = navigator.language || "id-ID";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      timezone = "";
    }
    return { timezone, locale, utcOffsetMinutes: new Date().getTimezoneOffset() };
  }

  const btn = document.getElementById("btn-voice-live");
  const pill = document.getElementById("voice-live-pill");
  const micPill = document.getElementById("voice-mic-pill");

  function setMicPill(active, label) {
    if (!micPill) return;
    if (active) {
      micPill.classList.remove("hidden");
      micPill.classList.add("active");
      micPill.textContent = label ? `🎤 ${label.slice(0, 18)}` : "🎤 Aktif";
    } else {
      micPill.classList.add("hidden");
      micPill.classList.remove("active");
    }
  }

  function setPill(status, detail) {
    if (!pill) return;
    pill.classList.remove("hidden", "live", "error");
    if (status === "live") {
      pill.textContent = detail ? `LIVE · ${detail}` : "LIVE";
      pill.classList.add("live");
      btn?.classList.add("active");
    } else if (status === "connecting") {
      pill.textContent = detail || "Menghubungkan…";
      pill.classList.remove("hidden");
    } else if (status === "error") {
      pill.textContent = (detail || "Error").slice(0, 80);
      pill.classList.add("error");
      btn?.classList.remove("active");
      setMicPill(false);
    } else {
      pill.classList.add("hidden");
      btn?.classList.remove("active");
      setMicPill(false);
    }
  }

  async function ensureMicCtx() {
    if (!micCtx) micCtx = new AudioContext();
    if (micCtx.state === "suspended") await micCtx.resume();
    return micCtx;
  }

  async function ensurePlaybackCtx(force = false) {
    if (!force && playbackCtx) {
      if (playbackCtx.state === "suspended") await playbackCtx.resume();
      return playbackCtx;
    }
    if (playbackCtx) await playbackCtx.close().catch(() => {});
    playbackCtx = new AudioContext();
    gainNode = playbackCtx.createGain();
    gainNode.gain.value = 1;
    gainNode.connect(playbackCtx.destination);
    playTime = playbackCtx.currentTime;
    if (playbackCtx.state === "suspended") await playbackCtx.resume();
    return playbackCtx;
  }

  function downsampleToPcm16(float32, inRate) {
    const ratio = inRate / inputRate;
    const outLen = Math.floor(float32.length / ratio);
    const out = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const idx = Math.floor(i * ratio);
      const s = Math.max(-1, Math.min(1, float32[idx] ?? 0));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  function pcm16ToBase64(int16) {
    const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToPcm16(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  }

  function pcmToFloat32(pcm) {
    const out = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 32768;
    return out;
  }

  function resampleFloat32(input, fromRate, toRate) {
    if (fromRate === toRate) return input;
    const outLen = Math.max(1, Math.round((input.length * toRate) / fromRate));
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const src = (i * fromRate) / toRate;
      const idx = Math.floor(src);
      const frac = src - idx;
      const s0 = input[idx] ?? 0;
      const s1 = input[idx + 1] ?? s0;
      out[i] = s0 + frac * (s1 - s0);
    }
    return out;
  }

  let analyserNode = null;

  async function startMicDeferred() {
    if (!wantMic || processor) return;
    const started = Date.now();
    while (live && !moduleSpeechGotAudio && Date.now() - started < 20000) {
      await new Promise((r) => setTimeout(r, 50));
    }
    await waitForPlaybackIdle(120000);
    if (!live || !wantMic || processor) return;
    await startMic();
  }

  async function startMic() {
    if (!wantMic || processor) return;
    await ensureNativeMicPermission().catch(() => {});
    const ctx = await ensureMicCtx();
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    const track = mediaStream.getAudioTracks()[0];
    setMicPill(true, track?.label || "Mic");
    sourceNode = ctx.createMediaStreamSource(mediaStream);
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.82;
    processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (ev) => {
      if (!live) return;
      const pcm = downsampleToPcm16(ev.inputBuffer.getChannelData(0), ctx.sampleRate);
      if (!pcm.length) return;
      transport.post({ type: "voiceAudioChunk", pcmBase64: pcm16ToBase64(pcm) });
    };
    sourceNode.connect(analyserNode);
    analyserNode.connect(processor);
    processor.connect(ctx.destination);
  }

  function stopMic() {
    processor?.disconnect();
    analyserNode?.disconnect();
    sourceNode?.disconnect();
    mediaStream?.getTracks().forEach((t) => t.stop());
    processor = null;
    analyserNode = null;
    sourceNode = null;
    mediaStream = null;
    setMicPill(false);
  }

  function stopPlayback() {
    if (isCapacitorNative()) resetNativePlayback();
    playChain = null;
    if (playbackCtx) playTime = playbackCtx.currentTime;
    clearModuleSpeechFallback();
    stopModuleSpeech();
  }

  async function playChunkInternal(b64) {
    const ctx = await ensurePlaybackCtx();
    if (!gainNode) return;
    const pcm = base64ToPcm16(b64);
    if (pcm.length < 2) return;
    let floats = pcmToFloat32(pcm);
    floats = resampleFloat32(floats, pcmOutputRate, ctx.sampleRate);
    const buf = ctx.createBuffer(1, floats.length, ctx.sampleRate);
    buf.getChannelData(0).set(floats);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gainNode);
    const startAt = Math.max(playTime, ctx.currentTime + 0.02);
    src.start(startAt);
    playTime = startAt + buf.duration;
  }

  function playChunk(b64) {
    if (isCapacitorNative()) {
      moduleSpeechGotAudio = true;
      unlockNativeElementAudio();
      playPcmBase64Native(b64, pcmOutputRate, base64ToPcm16);
      return;
    }
    playChain = (playChain ?? Promise.resolve()).then(() => playChunkInternal(b64)).catch(() => {});
  }

  async function waitForPlaybackIdle(maxMs = 120000) {
    if (isCapacitorNative()) {
      await waitNativePlaybackIdle();
      return;
    }
    const started = Date.now();
    await (playChain ?? Promise.resolve()).catch(() => {});
    while (true) {
      const ctx = playbackCtx;
      if (!ctx) return;
      if (ctx.currentTime >= playTime - 0.05) return;
      if (Date.now() - started > maxMs) return;
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  function localMemoryPayload() {
    return loadLocalMemory(typeof localStorage !== "undefined" ? localStorage : null);
  }

  function voiceEnvelope(extra = {}) {
    return {
      profile: transport.voiceProfile || "rhema-ide",
      clientMeta: collectVoiceClientMeta(),
      localMemory: localMemoryPayload(),
      ...extra,
    };
  }

  function flushPendingTexts() {
    for (const t of pendingTexts) {
      transport.post({ type: "voiceSendText", text: t, ...voiceEnvelope() });
    }
    pendingTexts = [];
  }

  function sendText(text) {
    const t = text.trim();
    if (!t) return false;
    if (live) {
      transport.post({ type: "voiceSendText", text: t, ...voiceEnvelope() });
      return true;
    }
    pendingTexts.push(t);
    return false;
  }

  function sendClientContent(text) {
    return sendText(text);
  }

  function sendTextOrStart(text) {
    const t = text.trim();
    if (!t) return;
    unlockNativeElementAudio();
    if (live) {
      transport.post({ type: "voiceSendText", text: t, ...voiceEnvelope() });
      return;
    }
    pendingTexts.push(t);
    if (!connecting && !live) {
      wantMic = false;
      connecting = true;
      setPill("connecting", "Menyiapkan suara…");
      const prep = isCapacitorNative() ? warmupNativePlayback() : ensurePlaybackCtx(true);
      void prep.then(() => {
        transport.post({ type: "voiceStart", ...voiceEnvelope() });
      });
    }
  }

  transport.onMessage((msg) => {
    const m = /** @type {{type?:string,status?:string,detail?:string,profile?:string,audioInputRate?:number,audioOutputRate?:number,mimeType?:string,pcmBase64?:string,text?:string,moduleId?:string}} */ (msg);
    switch (m.type) {
      case "voiceModuleSpeak":
        if (m.text && (transport.voiceProfile || "") === "alkitab-voice") {
          haltNativePlayback();
          if (isIndonesiaProfile()) {
            speakIndonesianText(String(m.text), { stopAmbientOnEnd: false });
          } else {
            speakModuleReply(String(m.text), getUiLocale());
          }
        } else if (m.text) {
          scheduleModuleSpeechFallback(m.text);
        }
        break;
      case "voiceStatus":
        if (m.audioInputRate) inputRate = m.audioInputRate;
        if (m.audioOutputRate) {
          outputRate = m.audioOutputRate;
          pcmOutputRate = m.audioOutputRate;
        }
        if (m.status === "connecting") {
          connecting = true;
          setPill("connecting", m.detail || "Menghubungkan…");
        } else if (m.status === "live") {
          live = true;
          connecting = false;
          clearConnectWatchdog();
          moduleSpeechGotAudio = false;
          liveAssistantTtsText = "";
          unlockNativeElementAudio();
          const prep = isCapacitorNative() ? warmupNativePlayback() : ensurePlaybackCtx(true);
          void prep.then(() => {
            flushPendingTexts();
          });
          setPill("live", m.profile === "alkitab-voice" ? "Alkitab" : "Rhema");
        } else if (m.status === "error") {
          live = false;
          connecting = false;
          clearConnectWatchdog();
          pendingTexts = [];
          stopMic();
          setPill("error", m.detail);
        } else if (m.status === "off") {
          live = false;
          connecting = false;
          clearConnectWatchdog();
          pendingTexts = [];
          stopMic();
          stopPlayback();
          setPill("off");
        }
        break;
      case "voiceAudioOut": {
        moduleSpeechGotAudio = true;
        clearModuleSpeechFallback();
        if (m.mimeType) {
          const match = /rate=(\d+)/i.exec(m.mimeType);
          if (match) pcmOutputRate = Number(match[1]);
        }
        if (m.pcmBase64) playChunk(m.pcmBase64);
        break;
      }
      case "voiceInterrupt":
        stopPlayback();
        break;
      case "voiceTranscript":
        if (m.role === "assistant" && m.delta) {
          const d = String(m.delta);
          liveAssistantTtsText = d.startsWith(liveAssistantTtsText) ? d : liveAssistantTtsText + d;
        }
        break;
      case "voiceTurnComplete":
        if (isCapacitorNative() && !moduleSpeechGotAudio && liveAssistantTtsText.trim()) {
          speakModuleReply(liveAssistantTtsText.trim(), navigator.language || "id-ID");
        }
        if (wantMic && live && !processor) {
          void startMicDeferred().catch((e) => setPill("error", String(e)));
        }
        moduleSpeechGotAudio = false;
        liveAssistantTtsText = "";
        break;
      default:
        break;
    }
  });

  function startVoice(opts = {}) {
    if (live || connecting) {
      transport.post({ type: "voiceStop" });
      return;
    }
    unlockNativeElementAudio();
    wantMic = opts.mic !== false;
    connecting = true;
    setPill("connecting", "Menghubungkan…");
    armConnectWatchdog();
    void ensurePlaybackCtx(true)
      .then(() => {
        transport.post({ type: "voiceStart", ...voiceEnvelope() });
      })
      .catch((err) => {
        connecting = false;
        clearConnectWatchdog();
        setPill("error", err instanceof Error ? err.message : String(err));
      });
  }

  btn?.addEventListener("click", () => startVoice({ mic: true }));

  const voiceApi = {
    isLive: () => live,
    isActive: () => live || connecting,
    isMicActive: () => Boolean(mediaStream && processor),
    enableMic: async (opts = {}) => {
      wantMic = true;
      if (!live) return;
      if (processor) return;
      if (opts.deferUntilIdle !== false) await waitForPlaybackIdle(Number(opts.maxWaitMs) || 120000);
      if (live && wantMic && !processor) await startMic();
    },
    sendText,
    sendClientContent,
    sendTextOrStart,
    start: startVoice,
    stop: () => {
      live = false;
      connecting = false;
      clearConnectWatchdog();
      wantMic = false;
      pendingTexts = [];
      stopMic();
      stopPlayback();
      setPill("off");
      transport.post({ type: "voiceStop" });
    },
    waitForPlaybackIdle,
    getAnalyser: () => analyserNode,
  };
  transport.voice = voiceApi;
  return voiceApi;
}
