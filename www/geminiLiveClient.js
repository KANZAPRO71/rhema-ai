/**
 * Browser client — koneksi langsung ke Gemini Live API (Speech-to-Speech).
 */

import { ensureNativeMicPermission, isNativeMicGranted } from "./nativeMicPermission.js";
import { t } from "./uiStrings.js";
import {
  isCapacitorNative,
  playPcmBase64Native,
  resetNativePlayback,
  unlockNativeElementAudio,
  waitNativePlaybackIdle,
  hasNativePlaybackScheduled,
  warmupNativePlayback,
} from "./nativeAudioPlayback.js";
import {
  isNativeGeminiWsAvailable,
  nativeGeminiWsConnect,
  nativeGeminiWsDisconnect,
  nativeGeminiWsSend,
} from "./nativeGeminiWs.js";
import { formatVoiceError } from "./byokUx.js";

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;

const MIC_WORKLET = `
class RhemaMicProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch?.length) this.port.postMessage(ch);
    return true;
  }
}
registerProcessor("rhema-mic-processor", RhemaMicProcessor);
`;

/**
 * @param {{
 *   fetchSessionConfig: () => Promise<{wsUrl:string,setup:object,audioInputRate?:number,audioOutputRate?:number,profile?:string,error?:string}>,
 *   executeTool: (call:{name:string,args?:object,id?:string}) => Promise<unknown>,
 *   emit: (event:object) => void,
 *   externalPlayback?: boolean,
 *   nativePlaybackOnly?: boolean,
 *   tryHandleLocalQuery?: (text: string) => boolean,
 * }} options
 */
export function createGeminiLiveSession(options) {
  /** @type {WebSocket | null} */
  let ws = null;
  let live = false;
  let connecting = false;
  /** @type {number} */
  let inputRate = INPUT_RATE;
  /** @type {number} */
  let pcmOutputRate = OUTPUT_RATE;
  /** @type {AudioContext | null} */
  let micCtx = null;
  /** @type {AudioContext | null} */
  let playbackCtx = null;
  /** @type {MediaStream | null} */
  let mediaStream = null;
  /** @type {AudioWorkletNode | null} */
  let workletNode = null;
  /** @type {ScriptProcessorNode | null} */
  let scriptProcessor = null;
  /** @type {AnalyserNode | null} */
  let analyserNode = null;
  /** @type {MediaStreamAudioSourceNode | null} */
  let sourceNode = null;
  /** @type {number} */
  let playTime = 0;
  /** @type {GainNode | null} */
  let gainNode = null;
  /** @type {Promise<void> | null} */
  let playChain = null;
  /** @type {string} */
  let micLabel = "";
  /** @type {string[]} */
  let pendingTexts = [];
  /** @type {string} */
  let sessionProfile = "rhema-ide";
  let wantMic = true;
  let pendingMicAfterFirstTurn = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let setupWatchdog = null;
  let connectStartedAt = 0;
  let useNativeWs = false;
  let suppressModelOutputUntil = 0;

  function clearSetupWatchdog() {
    if (setupWatchdog) {
      clearTimeout(setupWatchdog);
      setupWatchdog = null;
    }
  }

  function voiceLog(...args) {
    try {
      console.log("[rhema-voice]", ...args);
    } catch {
      /* ignore */
    }
  }

  function formatWsCloseError(code, reason) {
    const r = String(reason || "");
    if (code === 1008 || /invalid authentication|API key|PERMISSION_DENIED|credentials/i.test(r)) {
      return t("voice.conn.keyInvalid");
    }
    if (r) return r.length > 140 ? `${r.slice(0, 137)}…` : r;
    if (code && code !== 1000 && code !== 1005) return t("voice.conn.geminiFail", { code: String(code) });
    return "";
  }

  function emitMicStatus(active, detail) {
    options.emit({ type: "voiceMicStatus", active, label: micLabel, detail });
  }

  function micErrorMessage(err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return t("voice.mic.notFound");
    }
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      const native = Boolean(window.Capacitor?.isNativePlatform?.());
      return native
        ? t("voice.mic.deniedNative")
        : t("voice.mic.deniedWeb");
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return t("voice.mic.inUse");
    }
    if (name === "SecurityError") {
      return t("voice.mic.secureContext");
    }
    return err instanceof Error ? err.message : String(err);
  }

  async function ensureMicSupport() {
    if (!window.isSecureContext) {
      throw new Error(t("voice.mic.secureContext"));
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(t("voice.mic.noGetUserMedia"));
    }
  }

  function parseRate(mimeType) {
    const m = /rate=(\d+)/i.exec(mimeType || "");
    return m ? Number(m[1]) : null;
  }

  async function ensureMicCtx() {
    if (!micCtx) micCtx = new AudioContext();
    if (micCtx.state === "suspended") await micCtx.resume();
    return micCtx;
  }

  function unlockWebAudioContext(ctx) {
    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  }

  async function ensurePlaybackCtx(force = false) {
    if (!force && playbackCtx) {
      if (playbackCtx.state === "suspended") await playbackCtx.resume();
      return playbackCtx;
    }
    if (playbackCtx) await playbackCtx.close().catch(() => {});
    playbackCtx = new AudioContext({ latencyHint: "interactive" });
    gainNode = playbackCtx.createGain();
    gainNode.gain.value = isCapacitorNative() ? 0.9 : 1;
    gainNode.connect(playbackCtx.destination);
    playTime = playbackCtx.currentTime;
    unlockWebAudioContext(playbackCtx);
    if (playbackCtx.state === "suspended") await playbackCtx.resume();
    return playbackCtx;
  }

  function downsample(float32, inRate) {
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

  function pcmToB64(int16) {
    const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64ToPcm(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  }

  function pcmToFloat32(pcm) {
    const out = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      const s = pcm[i] / 32768;
      out[i] = Math.tanh(s * 0.92);
    }
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

  function applyEdgeFade(samples, sampleRate) {
    const n = Math.min(Math.floor(sampleRate * 0.004), Math.floor(samples.length / 3));
    if (n < 2) return;
    for (let i = 0; i < n; i++) {
      const g = i / n;
      samples[i] *= g;
      samples[samples.length - 1 - i] *= g;
    }
  }

  function isChannelOpen() {
    if (!live) return false;
    if (useNativeWs) return true;
    return ws?.readyState === WebSocket.OPEN;
  }

  function sendAudio(pcmBase64) {
    if (!isChannelOpen()) return;
    sendWsJson({
      realtimeInput: {
        audio: { data: pcmBase64, mimeType: `audio/pcm;rate=${inputRate}` },
      },
    });
  }

  function sendText(text) {
    const t = text.trim();
    if (!t) return false;
    if (!isChannelOpen()) {
      pendingTexts.push(t);
      return false;
    }
    sendWsJson({ realtimeInput: { text: t } });
    return true;
  }

  /** Setelah turn pertama model, Gemini 3.1 Live hanya menerima teks via realtimeInput. */
  let hasModelTurn = false;

  function sendPromptText(text, opts = {}) {
    const t = text.trim();
    if (!t) return false;
    if (!isChannelOpen()) {
      pendingTexts.push(t);
      return false;
    }
    if (live) {
      if (opts.mic === false) stopMic();
      voiceLog("prompt", hasModelTurn ? "realtime" : "live-pre-turn", t.slice(0, 72));
      return sendText(t);
    }
    if (opts.preferClientContent !== false && sendClientContent(t)) return true;
    return sendText(t);
  }

  function sendClientContent(text) {
    const t = text.trim();
    if (!t) return false;
    if (!isChannelOpen()) {
      pendingTexts.push(t);
      return false;
    }
    sendWsJson({
      clientContent: {
        turns: [{ role: "user", parts: [{ text: t }] }],
        turnComplete: true,
      },
    });
    return true;
  }

  function flushPendingTexts() {
    if (!isChannelOpen()) return;
    for (const t of pendingTexts) {
      sendPromptText(t, { preferClientContent: false, mic: false });
    }
    pendingTexts = [];
  }

  async function sendTextOrStart(text, opts = {}) {
    const t = text.trim();
    if (!t) return;
    if (live) {
      sendPromptText(t, opts);
      return;
    }
    if (connecting) {
      pendingTexts.push(t);
      return;
    }
    pendingTexts.push(t);
    await start({
      mic: opts.mic !== false,
      detail: opts.mic === false ? t("voice.conn.preparing") : undefined,
    });
  }

  function sendWsJson(payload) {
    const json = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (useNativeWs) {
      void nativeGeminiWsSend(json);
      return;
    }
    if (ws?.readyState === WebSocket.OPEN) ws.send(json);
  }

  function handleWsClose(code, reason) {
    clearSetupWatchdog();
    voiceLog("ws close", code, reason);
    live = false;
    connecting = false;
    useNativeWs = false;
    pendingTexts = [];
    stopMic();
    stopPlayback();
    const detail = formatWsCloseError(code, reason);
    if (detail) {
      options.emit({ type: "voiceStatus", status: "error", detail });
    } else {
      options.emit({ type: "voiceStatus", status: "off" });
    }
    ws = null;
  }

  function armSetupWatchdog() {
    clearSetupWatchdog();
    setupWatchdog = setTimeout(() => {
      if (!live && connecting) {
        voiceLog("setup timeout");
        connecting = false;
        useNativeWs = false;
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
        void nativeGeminiWsDisconnect().catch(() => {});
        options.emit({
          type: "voiceStatus",
          status: "error",
          detail: t("voice.conn.timeout"),
        });
      }
    }, 18000);
  }

  async function connectNativeWebSocket(config) {
    useNativeWs = true;
    armSetupWatchdog();
    try {
      await nativeGeminiWsConnect(config.wsUrl, config.setup, {
        onOpen: () => {
          voiceLog("native ws open");
          options.emit({ type: "voiceStatus", status: "connecting", detail: t("voice.conn.waitGemini") });
        },
        onMessage: (text) => {
          try {
            handleGeminiMessage(JSON.parse(text));
          } catch {
            /* ignore */
          }
        },
        onError: (message) => {
          connecting = false;
          clearSetupWatchdog();
          useNativeWs = false;
          voiceLog("native ws error", message);
          options.emit({
            type: "voiceStatus",
            status: "error",
            detail: formatVoiceError(message || t("voice.conn.wsFail")),
          });
        },
        onClose: (code, reason) => {
          void nativeGeminiWsDisconnect().catch(() => {});
          handleWsClose(code, reason);
        },
      });
    } catch (err) {
      connecting = false;
      useNativeWs = false;
      clearSetupWatchdog();
      options.emit({
        type: "voiceStatus",
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function connectWebSocket(config) {
    inputRate = config.audioInputRate ?? INPUT_RATE;
    pcmOutputRate = config.audioOutputRate ?? OUTPUT_RATE;
    sessionProfile = config.profile || "rhema-ide";
    const useNative = isNativeGeminiWsAvailable();
    voiceLog("connect", sessionProfile, config.model, useNative ? "native" : "webview");
    clearSetupWatchdog();

    if (useNative) {
      void connectNativeWebSocket(config);
      return;
    }

    ws = new WebSocket(config.wsUrl);
    ws.binaryType = "arraybuffer";
    armSetupWatchdog();
    ws.onopen = () => {
      voiceLog("ws open");
      options.emit({ type: "voiceStatus", status: "connecting", detail: t("voice.conn.waitGemini") });
      const payload = JSON.stringify({ setup: config.setup });
      voiceLog("setup bytes", payload.length);
      window.setTimeout(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(payload);
          voiceLog("setup sent");
        }
      }, 80);
    };
    ws.onmessage = (ev) => {
      try {
        const raw =
          typeof ev.data === "string"
            ? ev.data
            : ev.data instanceof ArrayBuffer
              ? new TextDecoder().decode(ev.data)
              : String(ev.data);
        voiceLog("ws msg", raw.slice(0, 80));
        handleGeminiMessage(JSON.parse(raw));
      } catch (err) {
        voiceLog("ws msg parse fail", err);
      }
    };
    ws.onerror = () => {
      connecting = false;
      clearSetupWatchdog();
      voiceLog("ws error");
      options.emit({ type: "voiceStatus", status: "error", detail: t("voice.conn.wsFail") });
    };
    ws.onclose = (ev) => {
      handleWsClose(ev.code, ev.reason);
    };
  }

  async function acquireMic() {
    if (mediaStream) return;
    await ensureMicSupport();
    await ensureNativeMicPermission();
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        },
        video: false,
      });
    } catch (err) {
      throw new Error(micErrorMessage(err));
    }
    const track = mediaStream.getAudioTracks()[0];
    micLabel = track?.label || t("voice.mic.defaultLabel");
    if (track?.muted) throw new Error(t("voice.mic.trackMuted"));
    emitMicStatus(true, micLabel);
  }

  function wireMicCapture(ctx) {
    sourceNode = ctx.createMediaStreamSource(mediaStream);
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.78;
    sourceNode.connect(analyserNode);
    emitMicStatus(true, micLabel);
  }

  function onMicSamples(float32, sampleRate) {
    if (!live) return;
    const pcm = downsample(float32, sampleRate);
    if (pcm.length) sendAudio(pcmToB64(pcm));
  }

  async function startMicWorklet(ctx) {
    const blob = new Blob([MIC_WORKLET], { type: "application/javascript" });
    const moduleUrl = URL.createObjectURL(blob);
    try {
      await ctx.audioWorklet.addModule(moduleUrl);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
    workletNode = new AudioWorkletNode(ctx, "rhema-mic-processor");
    workletNode.port.onmessage = (ev) => onMicSamples(ev.data, ctx.sampleRate);
    analyserNode.connect(workletNode);
    const silent = ctx.createGain();
    silent.gain.value = 0;
    workletNode.connect(silent);
    silent.connect(ctx.destination);
  }

  function startMicScriptProcessor(ctx) {
    scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);
    scriptProcessor.onaudioprocess = (ev) => {
      onMicSamples(ev.inputBuffer.getChannelData(0), ctx.sampleRate);
    };
    analyserNode.connect(scriptProcessor);
    const silent = ctx.createGain();
    silent.gain.value = 0;
    scriptProcessor.connect(silent);
    silent.connect(ctx.destination);
  }

  function isMicActive() {
    return Boolean(mediaStream && (workletNode || scriptProcessor));
  }

  async function waitForAssistantPlaybackStarted(maxMs = 20000) {
    const started = Date.now();
    while (live && !hasNativePlaybackScheduled() && Date.now() - started < maxMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async function enableMic(opts = {}) {
    const deferUntilIdle = opts.deferUntilIdle !== false;
    const maxWaitMs = Number(opts.maxWaitMs) > 0 ? Number(opts.maxWaitMs) : 120000;
    wantMic = true;
    if (!live) return;
    if (isMicActive()) {
      emitMicStatus(true, micLabel);
      return;
    }
    if (deferUntilIdle) {
      options.emit({
        type: "voiceMicStatus",
        active: false,
        detail: t("voice.conn.waitRhema"),
      });
      await waitForAssistantPlaybackStarted();
      await waitForPlaybackIdle(maxWaitMs);
    }
    if (!live || !wantMic || isMicActive()) return;
    await startMicPipeline();
  }

  async function startMicPipeline() {
    if ((workletNode || scriptProcessor) || !wantMic) return;
    if (isCapacitorNative()) {
      const granted = await isNativeMicGranted();
      if (!granted) {
        options.emit({ type: "voiceMicStatus", active: false, detail: t("voice.conn.requestMic") });
        await ensureNativeMicPermission();
      }
    }
    const ctx = await ensureMicCtx();
    if (!mediaStream) await acquireMic();
    wireMicCapture(ctx);

    if (isCapacitorNative()) {
      startMicScriptProcessor(ctx);
      voiceLog("mic pipeline: ScriptProcessor (native)");
      return;
    }

    try {
      if (ctx.audioWorklet?.addModule) {
        await startMicWorklet(ctx);
        voiceLog("mic pipeline: AudioWorklet");
        return;
      }
    } catch (err) {
      voiceLog("AudioWorklet gagal, fallback ScriptProcessor", err);
    }

    workletNode?.disconnect();
    workletNode = null;
    startMicScriptProcessor(ctx);
    voiceLog("mic pipeline: ScriptProcessor");
  }

  function stopMic() {
    workletNode?.disconnect();
    scriptProcessor?.disconnect();
    analyserNode?.disconnect();
    sourceNode?.disconnect();
    mediaStream?.getTracks().forEach((t) => t.stop());
    workletNode = null;
    scriptProcessor = null;
    analyserNode = null;
    sourceNode = null;
    mediaStream = null;
    emitMicStatus(false);
  }

  function stopPlayback() {
    playChain = null;
    resetNativePlayback();
    if (playbackCtx) playTime = playbackCtx.currentTime;
  }

  /** Potong suara Rhema tanpa menghentikan sesi live (barge-in / tap mic). */
  function interruptPlayback() {
    if (!live) return false;
    stopPlayback();
    options.emit({ type: "voiceInterrupt" });
    return true;
  }

  function playChunk(b64) {
    if (!live) return;
    if (options.nativePlaybackOnly || (isCapacitorNative() && options.externalPlayback !== true)) {
      unlockNativeElementAudio();
      playPcmBase64Native(b64, pcmOutputRate, b64ToPcm);
      return;
    }
    playChain = (playChain ?? Promise.resolve())
      .then(() => playChunkInternal(b64))
      .catch((err) => {
        voiceLog("WebAudio gagal, fallback HTMLAudio", err);
        if (isCapacitorNative()) playPcmBase64Native(b64, pcmOutputRate, b64ToPcm);
      });
  }

  async function playChunkInternal(b64) {
    const ctx = await ensurePlaybackCtx();
    if (!gainNode) return;
    if (ctx.state === "suspended") await ctx.resume();
    const pcm = b64ToPcm(b64);
    if (pcm.length < 2) return;
    const rate = pcmOutputRate > 0 ? pcmOutputRate : OUTPUT_RATE;
    let floats = pcmToFloat32(pcm);
    applyEdgeFade(floats, rate);
    const buf = ctx.createBuffer(1, floats.length, rate);
    buf.getChannelData(0).set(floats);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gainNode);
    const startAt = Math.max(playTime, ctx.currentTime + 0.015);
    src.start(startAt);
    playTime = startAt + buf.duration;
  }

  /** Tunggu antrian PCM selesai diputar (untuk auto-stop podcast/TTS live). */
  async function waitForPlaybackIdle(maxMs = 120000) {
    const started = Date.now();
    await (playChain ?? Promise.resolve()).catch(() => {});
    await waitNativePlaybackIdle().catch(() => {});
    while (true) {
      const ctx = playbackCtx;
      if (!ctx) return;
      if (ctx.currentTime >= playTime - 0.05) return;
      if (Date.now() - started > maxMs) return;
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  async function handleToolCall(toolCall) {
    const calls = toolCall?.functionCalls ?? [];
    const functionResponses = [];
    for (const fc of calls) {
      let response;
      try {
        response = { result: await options.executeTool({ name: fc.name, args: fc.args, id: fc.id }) };
      } catch (err) {
        response = { error: err instanceof Error ? err.message : String(err) };
      }
      functionResponses.push({ name: fc.name, id: fc.id, response });
    }
    if (functionResponses.length && isChannelOpen()) {
      sendWsJson({ toolResponse: { functionResponses } });
    }
  }

  function handleGeminiMessage(msg) {
    if (msg.setupComplete !== undefined) {
      live = true;
      connecting = false;
      clearSetupWatchdog();
      voiceLog("live", sessionProfile);
      if (options.nativePlaybackOnly || isCapacitorNative()) {
        void warmupNativePlayback();
      }
      options.emit({
        type: "voiceStatus",
        status: "live",
        profile: sessionProfile,
        audioInputRate: inputRate,
        audioOutputRate: pcmOutputRate,
      });
      flushPendingTexts();
      if (wantMic) {
        pendingMicAfterFirstTurn = true;
      }
      return;
    }
    if (msg.error?.message) {
      connecting = false;
      clearSetupWatchdog();
      options.emit({
        type: "voiceStatus",
        status: "error",
        detail: formatVoiceError(msg.error.message),
      });
      return;
    }
    if (msg.toolCall) {
      void handleToolCall(msg.toolCall);
      return;
    }
    const sc = msg.serverContent;
    if (!sc) return;

    if (Date.now() < suppressModelOutputUntil) {
      if (sc.interrupted) stopPlayback();
      if (sc.turnComplete) {
        suppressModelOutputUntil = 0;
        options.emit({ type: "voiceTurnComplete" });
      }
      return;
    }

    if (sc.interrupted) {
      stopPlayback();
      options.emit({ type: "voiceInterrupt" });
    }
    if (sc.inputTranscription?.text) {
      const text = String(sc.inputTranscription.text).trim();
      options.emit({
        type: "voiceTranscript",
        role: "user",
        delta: sc.inputTranscription.text,
        final: true,
      });
      if (text && options.tryHandleLocalQuery?.(text)) {
        suppressModelOutputUntil = Date.now() + 15000;
        stopPlayback();
        options.emit({ type: "voiceInterrupt" });
      }
    }
    if (sc.outputTranscription?.text) {
      options.emit({
        type: "voiceTranscript",
        role: "assistant",
        delta: sc.outputTranscription.text,
      });
    }
    for (const part of sc.modelTurn?.parts ?? []) {
      const inline = part.inlineData;
      if (inline?.data) {
        const rate = parseRate(inline.mimeType);
        if (rate) pcmOutputRate = rate;
        if (options.externalPlayback) {
          options.emit({
            type: "voiceAudioOut",
            pcmBase64: inline.data,
            mimeType: inline.mimeType,
          });
        } else if (live) {
          playChunk(inline.data);
        }
      }
    }
    if (sc.turnComplete) {
      hasModelTurn = true;
      options.emit({ type: "voiceTurnComplete" });
      if (wantMic && pendingMicAfterFirstTurn && !isMicActive()) {
        pendingMicAfterFirstTurn = false;
        void enableMic({ deferUntilIdle: true }).catch((e) =>
          options.emit({ type: "voiceStatus", status: "error", detail: String(e) }),
        );
      }
    }
  }

  async function start(opts = {}) {
    if (connecting && Date.now() - connectStartedAt > 25000) {
      stop();
    }
    if (live || connecting || ws || useNativeWs) return;
    connectStartedAt = Date.now();
    unlockNativeElementAudio();
    if (options.nativePlaybackOnly || (isCapacitorNative() && !options.externalPlayback)) {
      void warmupNativePlayback();
    }
    if (!options.externalPlayback && !options.nativePlaybackOnly) {
      try {
        if (!playbackCtx || playbackCtx.state === "closed") {
          playbackCtx = new AudioContext({ latencyHint: "interactive" });
          gainNode = playbackCtx.createGain();
          gainNode.gain.value = 1;
          gainNode.connect(playbackCtx.destination);
          playTime = playbackCtx.currentTime;
          unlockWebAudioContext(playbackCtx);
        }
        void playbackCtx.resume();
      } catch (err) {
        voiceLog("sync audio unlock", err);
      }
    }
    wantMic = opts.mic !== false;
    pendingMicAfterFirstTurn = wantMic;
    connecting = true;
    options.emit({
      type: "voiceStatus",
      status: "connecting",
      detail: opts.detail ?? t("voice.hint.connecting"),
    });

    try {
      if (!options.externalPlayback && !options.nativePlaybackOnly) {
        await ensurePlaybackCtx(true);
      }
      // Mic ditunda ke startMicPipeline setelah Gemini LIVE — jangan block koneksi.
    } catch (err) {
      connecting = false;
      stopMic();
      options.emit({ type: "voiceStatus", status: "error", detail: micErrorMessage(err) });
      return;
    }

    let config;
    try {
      config = await options.fetchSessionConfig();
    } catch (err) {
      connecting = false;
      stopMic();
      options.emit({
        type: "voiceStatus",
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    if (config.error) {
      connecting = false;
      stopMic();
      options.emit({
        type: "voiceStatus",
        status: "error",
        detail: formatVoiceError(config.error),
      });
      return;
    }

    connectWebSocket(config);
  }

  function stop() {
    live = false;
    connecting = false;
    hasModelTurn = false;
    clearSetupWatchdog();
    pendingTexts = [];
    pendingMicAfterFirstTurn = false;
    stopMic();
    stopPlayback();
    useNativeWs = false;
    void nativeGeminiWsDisconnect().catch(() => {});
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    ws = null;
    options.emit({ type: "voiceStatus", status: "off" });
  }

  return {
    start,
    stop,
    sendText,
    sendClientContent,
    sendPromptText,
    sendTextOrStart,
    sendAudioChunk: (pcmBase64) => sendAudio(pcmBase64),
    isLive: () => live,
    isActive: () => live || connecting,
    isMicActive,
    enableMic,
    interruptPlayback,
    waitForPlaybackIdle,
    getAnalyser: () => analyserNode,
  };
}
