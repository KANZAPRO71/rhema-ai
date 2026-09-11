/**
 * TTS di APK Android — WebView sering tanpa speechSynthesis.
 * Fallback: Gemini Live (suara Puck) via transport.voice.sendTextOrStart.
 */
import { isCapacitorNative } from "./nativeAudioPlayback.js";

/** @type {import("./chatCore.js").ChatTransport | null} */
let voiceTransport = null;

/** @type {Array<{ onEnd?: () => void, onError?: (err?: unknown) => void }>} */
const pendingSpeakCallbacks = [];

export function shouldPreferGeminiVoice() {
  return isCapacitorNative() || Boolean(typeof window !== "undefined" && window.__RHEMA_ANDROID_PARITY__);
}

/** Browser TTS — dimatikan di parity Android (WebView / preview localhost). */
export function canUseBrowserSpeechSynthesis() {
  if (typeof window !== "undefined" && window.__RHEMA_ANDROID_PARITY__) return false;
  return typeof speechSynthesis !== "undefined";
}

/** @param {import("./chatCore.js").ChatTransport} transport */
export function registerVoiceTextSpeech(transport) {
  if (voiceTransport) return;
  voiceTransport = transport;
  transport.onMessage?.((msg) => {
    const m = /** @type {{ type?: string, status?: string }} */ (msg);
    if (m.type === "voiceTurnComplete") {
      const cb = pendingSpeakCallbacks.shift();
      cb?.onEnd?.();
    }
    if (m.type === "voiceStatus" && m.status === "error") {
      const cb = pendingSpeakCallbacks.shift();
      cb?.onError?.();
    }
  });
}

/**
 * @param {string} text
 * @param {{ profile?: string, onEnd?: () => void, onError?: (err?: unknown) => void, voiceOpts?: object }} [options]
 * @returns {boolean}
 */
export function speakViaGeminiVoice(text, options = {}) {
  const t = String(text || "").trim();
  if (!t || !voiceTransport?.voice?.sendTextOrStart) return false;
  voiceTransport.voiceProfile = options.profile || "alkitab-voice";
  if (options.onEnd || options.onError) {
    pendingSpeakCallbacks.push({ onEnd: options.onEnd, onError: options.onError });
  }
  void voiceTransport.voice.sendTextOrStart(t, {
    mic: false,
    preferClientContent: false,
    ...(options.voiceOpts || {}),
  });
  return true;
}

export function isVoicePlaybackActive() {
  return Boolean(voiceTransport?.voice?.isActive?.());
}
