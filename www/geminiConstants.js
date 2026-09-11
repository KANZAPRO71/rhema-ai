/** Konstanta Gemini — model AI tunggal BYOK (browser / Capacitor). */

import { getBundledGoogleKey } from "./bundledProviderKeys.js";

/** Model generate gambar — Gemini 3.1 Flash Image (Nano Banana 2). */
export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

export function geminiImageGenerateContentUrl(modelId = GEMINI_IMAGE_MODEL) {
  const id = String(modelId || GEMINI_IMAGE_MODEL).replace(/^models\//, "");
  return `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`;
}

/** Model tunggal untuk voice live, chat, vision, JSON, dan gambar. */
export const GEMINI_MODEL = "gemini-3.1-flash-live-preview";

/** @deprecated Alias — gunakan GEMINI_MODEL */
export const GEMINI_BROWSER_CHAT_MODEL = GEMINI_MODEL;

/** Tidak ada fallback — satu model untuk semua fungsi. */
export const GEMINI_CHAT_FALLBACK_MODELS = [GEMINI_MODEL];

export const RHEMA_VOICE_LOCKED = {
  voiceName: "Puck",
  liveModel: GEMINI_MODEL,
  profileId: "rhema-ide",
};

let lastGoodGeminiModel;

export function noteGeminiModelSuccess(modelId) {
  lastGoodGeminiModel = GEMINI_MODEL;
}

export function geminiChatModelCandidates(_preferred) {
  return [GEMINI_MODEL];
}

export function resolveGeminiLiveModel() {
  return GEMINI_MODEL;
}

export function geminiModelResource(modelId = GEMINI_MODEL) {
  const id = String(modelId || GEMINI_MODEL).replace(/^models\//, "");
  return id.startsWith("models/") ? id : `models/${id}`;
}

export function geminiGenerateContentUrl(modelId = GEMINI_MODEL) {
  return `https://generativelanguage.googleapis.com/v1beta/${geminiModelResource(modelId)}:generateContent`;
}

export function geminiLiveWsUrl(apiKey) {
  const q = encodeURIComponent(String(apiKey || "").trim());
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${q}`;
}

export const GOOGLE_KEY_STORAGE = "rhema-google-key";
export const GOOGLE_KEY_FLAG = "rhema-ai-google-key-configured";

export function getStoredGoogleKey() {
  const stored = (localStorage.getItem(GOOGLE_KEY_STORAGE) || "").trim();
  if (stored) return stored;
  return getBundledGoogleKey();
}

export function setStoredGoogleKey(key) {
  const t = String(key || "").trim();
  if (t) {
    localStorage.setItem(GOOGLE_KEY_STORAGE, t);
    localStorage.setItem(GOOGLE_KEY_FLAG, "1");
  } else {
    localStorage.removeItem(GOOGLE_KEY_STORAGE);
    localStorage.removeItem(GOOGLE_KEY_FLAG);
  }
}

export function googleKeyConfigured() {
  return Boolean(getStoredGoogleKey()) || localStorage.getItem(GOOGLE_KEY_FLAG) === "1";
}

/** Cek cepat apakah key valid sebelum buka Gemini Live WS. */
export async function validateGoogleKeyForVoice() {
  const key = getStoredGoogleKey();
  if (!key) {
    return { ok: false, error: "Gemini API key belum diset. Buka Akun → ⚙ Pengaturan & API Key → Simpan." };
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    );
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    const msg = data?.error?.message || `HTTP ${res.status}`;
    return {
      ok: false,
      error: /API key|PERMISSION|authentication/i.test(msg)
        ? "API key tidak valid — buka Pengaturan & API Key, isi key baru, lalu Simpan."
        : msg,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
