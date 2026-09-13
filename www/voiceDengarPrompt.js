/**
 * Perkaya prompt "Dengar — …" dengan teks ayat offline — hindari round-trip tool Gemini.
 */
import { lookupVerse } from "./alkitabClient.js";

const DENGAR_PREFIX_RE = /^dengar\s*[—–-]\s*(.+)$/i;

/** @type {Map<string, string>} */
const promptCache = new Map();

/** @param {string} text */
export function getCachedDengarPrompt(text) {
  const m = DENGAR_PREFIX_RE.exec(String(text || "").trim());
  if (!m) return null;
  return promptCache.get(m[1].trim().toLowerCase()) || null;
}

/**
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function enrichVoiceListenPrompt(text) {
  const raw = String(text || "").trim();
  const m = DENGAR_PREFIX_RE.exec(raw);
  if (!m) return raw;

  const ref = m[1].trim();
  if (!ref) return raw;

  const cacheKey = ref.toLowerCase();
  const cached = promptCache.get(cacheKey);
  if (cached) return cached;

  try {
    const verse = await lookupVerse(ref);
    if (verse?.found !== false && verse.text) {
      const prompt =
        `Bacakan ayat ${verse.reference}: "${verse.text}". ` +
        "Setelah itu berikan renungan singkat (2–3 kalimat). Langsung bacakan — teks ayat sudah benar di prompt ini.";
      promptCache.set(cacheKey, prompt);
      return prompt;
    }
  } catch {
    /* fallback di bawah */
  }

  const fallback = `Bacakan ayat ${ref} dari Alkitab offline perangkat, lalu renungan singkat.`;
  promptCache.set(cacheKey, fallback);
  return fallback;
}

/** Preload ayat populer saat tab Voice dibuka. */
export function prefetchDengarVerse(reference) {
  void enrichVoiceListenPrompt(`Dengar — ${reference}`).catch(() => {});
}
