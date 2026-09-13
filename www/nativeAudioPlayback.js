/** Playback PCM Gemini Live — Web Audio gapless di Android WebView. */

import { isBrowserByokStandalone } from "./platform.js";

export function isCapacitorNative() {
  try {
    if (isBrowserByokStandalone()) return false;
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/** Silent WAV — unlock audio dalam user gesture. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAA==";

let unlockDone = false;
/** @type {AudioContext | null} */
let playbackCtx = null;
/** @type {GainNode | null} */
let gainNode = null;
/** @type {number} */
let playTime = 0;
/** @type {Promise<AudioContext | null> | null} */
let ctxInit = null;
/** Increment on stop — batalkan callback chunk yang masih antre. */
let playbackEpoch = 0;
let scheduledChunkCount = 0;
let firstChunkScheduled = false;

function pcmToFloat32(pcm) {
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    const s = pcm[i] / 32768;
    out[i] = Math.tanh(s * 0.92);
  }
  return out;
}

/** Hindari click/pop di ujung chunk kecil (~4 ms). */
function edgeFade(samples, sampleRate) {
  const n = Math.min(Math.floor(sampleRate * 0.004), Math.floor(samples.length / 3));
  if (n < 2) return;
  for (let i = 0; i < n; i++) {
    const g = i / n;
    samples[i] *= g;
    samples[samples.length - 1 - i] *= g;
  }
}

function unlockCtx(ctx) {
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

function ensurePlaybackCtx() {
  if (playbackCtx && playbackCtx.state !== "closed") {
    if (playbackCtx.state === "suspended") void playbackCtx.resume();
    return Promise.resolve(playbackCtx);
  }
  if (!ctxInit) {
    ctxInit = (async () => {
      try {
        playbackCtx = new AudioContext({ latencyHint: "playback", sampleRate: 24000 });
      } catch {
        playbackCtx = new AudioContext({ latencyHint: "playback" });
      }
      gainNode = playbackCtx.createGain();
      gainNode.gain.value = 0.88;
      gainNode.connect(playbackCtx.destination);
      playTime = playbackCtx.currentTime + 0.06;
      unlockCtx(playbackCtx);
      if (playbackCtx.state === "suspended") await playbackCtx.resume();
      return playbackCtx;
    })();
  }
  return ctxInit;
}

/** Panggil sync dari handler tap — sebelum await. */
export function unlockNativeElementAudio() {
  try {
    const a = new Audio(SILENT_WAV);
    a.volume = 0.001;
    void a.play().catch(() => {});
  } catch {
    /* ignore */
  }
  if (isCapacitorNative()) void ensurePlaybackCtx().catch(() => {});
}

/** Pre-warm AudioContext saat user tap mic — hindari chunk awal hilang. */
export async function warmupNativePlayback() {
  if (!isCapacitorNative()) return warmupVoicePlayback();
  unlockDone = true;
  const ctx = await ensurePlaybackCtx();
  if (ctx?.state === "suspended") await ctx.resume();
  return ctx;
}

/** Unlock + AudioContext — native & preview browser localhost. */
export async function warmupVoicePlayback() {
  try {
    const a = new Audio(SILENT_WAV);
    a.volume = 0.001;
    await a.play();
  } catch {
    /* ignore — gesture mungkin belum ada */
  }
  if (!isCapacitorNative()) return null;
  unlockDone = true;
  const ctx = await ensurePlaybackCtx();
  if (ctx?.state === "suspended") await ctx.resume();
  return ctx;
}

export function hasNativePlaybackScheduled() {
  return scheduledChunkCount > 0;
}

/** True while Gemini voice PCM masih terdengar — untuk ducking musik iringan. */
export function isNativeVoiceAudible() {
  if (!playbackCtx || scheduledChunkCount === 0) return false;
  return playbackCtx.currentTime < playTime - 0.045;
}

/**
 * @param {AudioContext} ctx
 * @param {string} b64
 * @param {number} sampleRate
 * @param {(b64: string) => Int16Array} b64ToPcm
 */
function schedulePcmChunk(ctx, b64, sampleRate, b64ToPcm) {
  if (!gainNode) return;
  const pcm = b64ToPcm(b64);
  if (pcm.length < 2) return;

  const rate = sampleRate > 0 ? sampleRate : 24000;
  const floats = pcmToFloat32(pcm);
  if (scheduledChunkCount > 0) {
    edgeFade(floats, rate);
  }

  const buf = ctx.createBuffer(1, floats.length, rate);
  buf.getChannelData(0).set(floats);

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(gainNode);

  const now = ctx.currentTime;
  const lead = firstChunkScheduled ? 0.04 : 0.18;
  if (playTime < now + 0.015) playTime = now + lead;
  src.start(playTime);
  playTime += buf.duration;
  scheduledChunkCount += 1;
  firstChunkScheduled = true;
}

/**
 * @param {string} b64
 * @param {number} sampleRate
 * @param {(b64: string) => Int16Array} b64ToPcm
 */
export function playPcmBase64Native(b64, sampleRate, b64ToPcm) {
  const epoch = playbackEpoch;
  void ensurePlaybackCtx()
    .then((ctx) => {
      if (epoch !== playbackEpoch || !ctx || !gainNode) return;
      schedulePcmChunk(ctx, b64, sampleRate, b64ToPcm);
    })
    .catch((err) => console.log("[rhema-voice] native audio play", err));
}

export function resetNativePlayback() {
  playbackEpoch++;
  scheduledChunkCount = 0;
  firstChunkScheduled = false;
  ctxInit = null;
  if (playbackCtx) {
    void playbackCtx.close().catch(() => {});
    playbackCtx = null;
    gainNode = null;
  }
  playTime = 0;
}

/** Hentikan playback native segera — dipakai saat user tap Stop. */
export function haltNativePlayback() {
  resetNativePlayback();
}

/** Potong suara AI segera — dipakai guardrail krisis / barge-in. */
export async function bargeInNativePlayback() {
  haltNativePlayback();
  try {
    document.dispatchEvent(
      new CustomEvent("rhema-audio-stop-all", { detail: { keepVoiceSession: false } }),
    );
  } catch {
    /* ignore */
  }
}

export async function waitNativePlaybackIdle(maxMs = 120000) {
  const ctx = playbackCtx;
  if (!ctx || scheduledChunkCount === 0) return;
  const started = Date.now();
  while (ctx.currentTime < playTime - 0.06) {
    if (Date.now() - started > maxMs) return;
    await new Promise((r) => setTimeout(r, 40));
  }
}

/** @deprecated dipakai hanya sebagai fallback lama */
export function pcm16ToWavBlob(pcm, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * numChannels * bitsPerSample) / 8, true);
  view.setUint16(32, (numChannels * bitsPerSample) / 8, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  const out = new Int16Array(buffer, 44);
  out.set(pcm);
  return new Blob([buffer], { type: "audio/wav" });
}
