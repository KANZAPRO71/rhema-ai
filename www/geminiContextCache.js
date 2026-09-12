/**
 * Gemini Explicit Context Caching — BYOK, aman multibahasa.
 *
 * Google: jangan kirim systemInstruction di setup Live jika sudah dibake ke cachedContent.
 * Rhema default: cache = knowledge-only (KB konseling/teologi) — systemInstruction tetap dinamis per region.
 *
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-use
 */
const CACHE_NAME_KEY = "rhema-gemini-cached-content-name";
const CACHE_MODE_KEY = "rhema-gemini-cache-mode";

/** Cache hanya dokumen KB — persona/bahasa/krisis tetap di systemInstruction dinamis. */
export const CACHE_MODE_KNOWLEDGE_ONLY = "knowledge-only";

/** Cache sudah memuat systemInstruction statis — JANGAN kirim ulang di setup. */
export const CACHE_MODE_INCLUDES_SYSTEM = "includes-system-instruction";

/** @returns {string} */
export function getStoredCachedContentName() {
  try {
    return String(localStorage.getItem(CACHE_NAME_KEY) || "").trim();
  } catch {
    return "";
  }
}

/** @param {string} name */
export function setStoredCachedContentName(name) {
  try {
    const v = String(name || "").trim();
    if (v) localStorage.setItem(CACHE_NAME_KEY, v);
    else localStorage.removeItem(CACHE_NAME_KEY);
  } catch {
    /* ignore */
  }
}

/** @returns {string} */
export function getCacheMode() {
  try {
    const mode = String(localStorage.getItem(CACHE_MODE_KEY) || "").trim();
    if (mode === CACHE_MODE_INCLUDES_SYSTEM) return CACHE_MODE_INCLUDES_SYSTEM;
    return CACHE_MODE_KNOWLEDGE_ONLY;
  } catch {
    return CACHE_MODE_KNOWLEDGE_ONLY;
  }
}

/** @param {string} mode */
export function setCacheMode(mode) {
  try {
    const v = String(mode || "").trim();
    if (v === CACHE_MODE_INCLUDES_SYSTEM) {
      localStorage.setItem(CACHE_MODE_KEY, CACHE_MODE_INCLUDES_SYSTEM);
    } else {
      localStorage.setItem(CACHE_MODE_KEY, CACHE_MODE_KNOWLEDGE_ONLY);
    }
  } catch {
    /* ignore */
  }
}

/** @param {string} name */
function normalizeCacheResourceName(name) {
  const v = String(name || "").trim();
  if (!v) return "";
  return v.startsWith("cachedContents/") ? v : `cachedContents/${v}`;
}

export function isCachedContentActive() {
  return Boolean(normalizeCacheResourceName(getStoredCachedContentName()));
}

/**
 * Terapkan kebijakan cache ke setup WebSocket Live.
 * - knowledge-only: cachedContent + systemInstruction dinamis (multibahasa Rhema)
 * - includes-system-instruction: cachedContent saja, hapus systemInstruction (hindari konflik Google)
 *
 * @param {object} setup
 * @returns {object}
 */
export function applyGeminiCachePolicy(setup) {
  const cacheName = normalizeCacheResourceName(getStoredCachedContentName());
  if (!cacheName) return setup;

  const mode = getCacheMode();
  const next = { ...setup, cachedContent: cacheName };

  if (mode === CACHE_MODE_INCLUDES_SYSTEM) {
    delete next.systemInstruction;
  }

  return next;
}

/** @deprecated Use applyGeminiCachePolicy */
export function applyGeminiCachedContent(setup) {
  return applyGeminiCachePolicy(setup);
}

export const GEMINI_CACHE_ADMIN_HINT =
  "Buat cache knowledge-only (tanpa systemInstruction) via scripts/create-gemini-counseling-cache.ps1. " +
  "Daftar: localStorage rhema-gemini-cached-content-name + mode knowledge-only.";
