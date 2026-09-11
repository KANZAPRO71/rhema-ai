/** TTS fallback — di APK native pakai Gemini Live, browser pakai speechSynthesis. */
import { speakViaGeminiVoice, shouldPreferGeminiVoice, canUseBrowserSpeechSynthesis } from "./voiceTextSpeech.js";

/** @param {string} text @param {string} [locale] */
export function speakModuleReply(text, locale = "id-ID") {
  if (!text?.trim()) return;
  if (shouldPreferGeminiVoice() && speakViaGeminiVoice(text.trim())) return;
  if (!canUseBrowserSpeechSynthesis()) {
    speakViaGeminiVoice(text.trim());
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.trim());
  u.lang = locale.startsWith("id") ? "id-ID" : locale;
  const voices = speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang === "id-ID") ||
    voices.find((v) => v.lang.startsWith("id")) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  u.rate = 1;
  u.pitch = 1;
  speechSynthesis.speak(u);
}

export function stopModuleSpeech() {
  if (canUseBrowserSpeechSynthesis()) speechSynthesis.cancel();
}

/** Preload daftar suara (Chrome lazy-load). */
export function warmupModuleSpeech() {
  if (!canUseBrowserSpeechSynthesis()) return;
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}
