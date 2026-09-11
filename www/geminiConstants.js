/** Konstanta Gemini — model AI tunggal BYOK (browser / Capacitor). */

import { getBundledGoogleKey } from "./bundledProviderKeys.js";
import { validateGoogleKeyLiveWebSocket } from "./byokLiveValidate.js";
import {
  isSecureKeyStorageAvailable,
  migrateLegacyKeyToSecure,
  secureRemoveItem,
  secureSetItem,
} from "./secureKeyStorage.js";

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

/** Cache in-memory — sumber kebenaran di Android setelah migrasi dari localStorage. */
let memoryKeyCache = null;
let secureKeyBootstrapped = false;

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

/** Muat key dari EncryptedSharedPreferences (Android) sebelum BYOK/voice init. */
export async function initGoogleKeySecureStorage() {
  if (secureKeyBootstrapped) return;
  secureKeyBootstrapped = true;
  if (!isSecureKeyStorageAvailable()) return;
  const migrated = await migrateLegacyKeyToSecure(GOOGLE_KEY_STORAGE);
  if (migrated) {
    memoryKeyCache = migrated;
    try {
      localStorage.setItem(GOOGLE_KEY_FLAG, "1");
    } catch {
      /* ignore */
    }
  }
}

export function getStoredGoogleKey() {
  if (memoryKeyCache) return memoryKeyCache;
  const stored = (localStorage.getItem(GOOGLE_KEY_STORAGE) || "").trim();
  if (stored) return stored;
  return getBundledGoogleKey();
}

export function setStoredGoogleKey(key) {
  const t = String(key || "").trim();
  memoryKeyCache = t || null;
  if (t) {
    if (isSecureKeyStorageAvailable()) {
      void secureSetItem(GOOGLE_KEY_STORAGE, t);
      try {
        localStorage.removeItem(GOOGLE_KEY_STORAGE);
      } catch {
        /* ignore */
      }
    } else {
      localStorage.setItem(GOOGLE_KEY_STORAGE, t);
    }
    localStorage.setItem(GOOGLE_KEY_FLAG, "1");
  } else {
    memoryKeyCache = null;
    localStorage.removeItem(GOOGLE_KEY_STORAGE);
    localStorage.removeItem(GOOGLE_KEY_FLAG);
    if (isSecureKeyStorageAvailable()) {
      void secureRemoveItem(GOOGLE_KEY_STORAGE);
    }
  }
}

export function googleKeyConfigured() {
  return Boolean(getStoredGoogleKey()) || localStorage.getItem(GOOGLE_KEY_FLAG) === "1";
}

/**
 * Validasi BYOK untuk Gemini Live: REST list models + handshake WebSocket Live API.
 * Koneksi langsung HP → wss://generativelanguage.googleapis.com (tanpa server Rhema).
 */
export async function validateGoogleKeyForVoice() {
  const key = getStoredGoogleKey();
  if (!key) {
    return { ok: false, error: "no_key" };
  }
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    );
    if (!listRes.ok) {
      const data = await listRes.json().catch(() => ({}));
      const msg = data?.error?.message || `HTTP ${listRes.status}`;
      return { ok: false, error: msg, status: listRes.status, kind: "invalid" };
    }

    const liveCheck = await validateGoogleKeyLiveWebSocket(key);
    if (liveCheck.ok) {
      try {
        localStorage.setItem("rhema-google-key-validated-at", String(Date.now()));
        localStorage.setItem("rhema-google-key-live-validated", "1");
      } catch {
        /* ignore */
      }
      return { ok: true, mode: "live_ws" };
    }
    return {
      ok: false,
      error: liveCheck.error,
      status: liveCheck.status,
      kind: liveCheck.kind || "live_not_enabled",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      kind: "network",
    };
  }
}

export function clearStoredGoogleKey() {
  setStoredGoogleKey("");
  try {
    localStorage.removeItem("rhema-google-key-validated-at");
    localStorage.removeItem("rhema-google-key-live-validated");
  } catch {
    /* ignore */
  }
}

/** @returns {{ configured: boolean, validatedAt: number|null, liveValidated: boolean, label: string }} */
export function getGoogleKeyStatusMeta() {
  const configured = googleKeyConfigured();
  let validatedAt = null;
  let liveValidated = false;
  try {
    const raw = localStorage.getItem("rhema-google-key-validated-at");
    if (raw) validatedAt = Number(raw) || null;
    liveValidated = localStorage.getItem("rhema-google-key-live-validated") === "1";
  } catch {
    /* ignore */
  }
  return {
    configured,
    validatedAt,
    liveValidated,
    label: configured ? (liveValidated ? "live_active" : "active") : "missing",
  };
}
