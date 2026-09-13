/**
 * Filter & normalisasi transkripsi ASR Gemini Live.
 * Native audio model sering salah bahasa (Hangul/Spanyol) atau salah dengar (mayatn→ayat).
 */
import { getAiSpeechLocale, getEffectiveAiLang, isIndonesiaProfile } from "./localeProfile.js";

/** @typedef {"latin"|"hangul"|"kana"|"han"|"cyrillic"|"arabic"|"mixed"|"empty"} DominantScript */

/** @type {Record<string, Set<DominantScript>>} */
const REGION_ALLOWED_SCRIPTS = {
  indonesia: new Set(["latin", "mixed", "empty"]),
  global: new Set(["latin", "mixed", "empty"]),
  latam: new Set(["latin", "mixed", "empty"]),
  brazil: new Set(["latin", "mixed", "empty"]),
  korea: new Set(["hangul", "latin", "mixed", "empty"]),
  japan: new Set(["kana", "han", "latin", "mixed", "empty"]),
  china: new Set(["han", "latin", "mixed", "empty"]),
};

const AI_LANG_SCRIPTS = {
  id: REGION_ALLOWED_SCRIPTS.indonesia,
  en: REGION_ALLOWED_SCRIPTS.global,
  es: REGION_ALLOWED_SCRIPTS.latam,
  pt: REGION_ALLOWED_SCRIPTS.brazil,
  ko: REGION_ALLOWED_SCRIPTS.korea,
  ja: REGION_ALLOWED_SCRIPTS.japan,
  zh: REGION_ALLOWED_SCRIPTS.china,
};

/** Kata satu-suku phantom dari noise mic / salah bahasa — bukan ucapan user Indonesia. */
const PHANTOM_STANDALONE = new Set([
  "nada",
  "a",
  "sí",
  "si",
  "hmm",
  "eh",
  "ah",
  "oh",
  "um",
  "uh",
  "oui",
  "the",
  "and",
  "adelante",
  "adélante",
  "forward",
  "n",
  "i",
  "o",
]);

/** Kata pendek valid dalam percakapan Indonesia. */
const ALLOW_SHORT_ID = new Set([
  "ya",
  "iya",
  "ok",
  "oke",
  "tidak",
  "bisa",
  "mau",
  "apa",
  "siapa",
  "tuhan",
  "amin",
  "shalom",
]);

/** Satu kata tanpa konteks — sering sisa ASR/VAD (bukan ucapan lengkap). */
const ORPHAN_SINGLE_WORDS = new Set([
  "punya",
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "itu",
  "ini",
  "ada",
  "jadi",
  "sih",
  "kan",
  "lah",
  "dong",
  "deh",
  "nya",
  "ku",
  "mu",
  "kau",
  "cara",
  "meski",
  "tapi",
  "kalau",
  "juga",
  "saja",
  "the",
  "a",
]);

/** @type {[RegExp, string | ((...args: string[]) => string)][]} */
const ID_ASR_PHRASE_FIXES = [
  [/\bdua\s+mayatn\b/gi, "dua ayat"],
  [/\btiga\s+mayatn\b/gi, "tiga ayat"],
  [/\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s+mayat(n)?\b/gi, "$1 ayat"],
  [/\bmayatn\b/gi, "ayat"],
  [/\bayat\s+alkitab\b/gi, "ayat Alkitab"],
  [/\balki\s*tab\b/gi, "Alkitab"],
  [/\brenung\s*an\b/gi, "renungan"],
  [/\bpasal\s*(\d+)\b/gi, "pasal $1"],
  [/\bkitab\s+(\w+)\b/gi, (m) => m.replace(/\s+/g, " ")],
  [/\bagaimana\b/gi, "bagaimana"],
  [/\bgenji\b/gi, "Gen Z"],
  [/\bgen\s*z\b/gi, "Gen Z"],
  [/\bjen\s*z\b/gi, "Gen Z"],
  [/\bgenerasi\s+di\s+atas(nya| gen z)?\b/gi, "generasi di atasnya"],
  [/\bbego\s+sekali\s+lipat\b/gi, "berlipat ganda sekali"],
  [/\bberlipat\s+lipat\b/gi, "berlipat ganda"],
  [/\bgimana\s+makan\b/gi, "bagaimana makan"],
  [/\btekananmu\b/gi, "tekanannya"],
  [/\bsaya harus jujur sama\b/gi, "saya harus jujur sama kamu"],
  [/\bjujur sama\s*$/gi, "jujur sama kamu"],
  [/\bana\s+logi\b/gi, "analogi"],
  [/\bberibu\s*ribu\s+ana\s+logi\b/gi, "beribu-ribu analogi"],
  [/\bberibu\s*ribu\s+analogi\b/gi, "beribu-ribu analogi"],
];

function scoreScripts(text) {
  /** @type {Record<DominantScript, number>} */
  const scores = {
    hangul: 0,
    kana: 0,
    han: 0,
    cyrillic: 0,
    arabic: 0,
    latin: 0,
    mixed: 0,
    empty: 0,
  };
  for (const ch of text) {
    const c = ch.codePointAt(0) || 0;
    if ((c >= 0x1100 && c <= 0x11ff) || (c >= 0xac00 && c <= 0xd7a3)) scores.hangul++;
    else if (c >= 0x3040 && c <= 0x30ff) scores.kana++;
    else if ((c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf)) scores.han++;
    else if (c >= 0x0400 && c <= 0x04ff) scores.cyrillic++;
    else if (c >= 0x0600 && c <= 0x06ff) scores.arabic++;
    else if (/[A-Za-zÀ-ÿ]/.test(ch)) scores.latin++;
  }
  return scores;
}

/** @returns {DominantScript} */
export function detectDominantScript(text) {
  const t = String(text || "").trim();
  if (!t) return "empty";
  const scores = scoreScripts(t);
  const letterScores = [
    ["hangul", scores.hangul],
    ["kana", scores.kana],
    ["han", scores.han],
    ["cyrillic", scores.cyrillic],
    ["arabic", scores.arabic],
    ["latin", scores.latin],
  ];
  const total = letterScores.reduce((n, [, v]) => n + v, 0);
  if (total === 0) return "mixed";
  letterScores.sort((a, b) => b[1] - a[1]);
  const [top, topScore] = letterScores[0];
  if (topScore / total < 0.4) return "mixed";
  return /** @type {DominantScript} */ (top);
}

function normalizeToken(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[.!?,…:;]+$/g, "")
    .trim();
}

/** Normalisasi untuk deduplikasi bubble user. */
export function normalizeUserTranscriptKey(text) {
  return normalizeToken(text).replace(/\s+/g, " ").trim();
}

/**
 * Satu kata yatim dari potongan VAD — bukan kalimat user.
 * @param {string} text
 */
export function shouldDiscardOrphanUserFragment(text) {
  if (!isIndonesiaProfile()) return false;
  const norm = normalizeUserTranscriptKey(text);
  if (!norm) return true;
  const words = norm.split(/\s+/).filter(Boolean);
  if (words.length !== 1) return false;
  const w = words[0];
  if (ALLOW_SHORT_ID.has(w)) return false;
  if (PHANTOM_STANDALONE.has(w) || ORPHAN_SINGLE_WORDS.has(w)) return true;
  return w.length <= 4;
}

/** @param {string | undefined} languageCode */
function languageCodeMatchesRegion(languageCode) {
  if (!languageCode) return true;
  const expected = getAiSpeechLocale().split("-")[0].toLowerCase();
  const reported = String(languageCode).split("-")[0].toLowerCase();
  if (expected === reported) return true;
  if (expected === "id" && (reported === "in" || reported === "id")) return true;
  return false;
}

/**
 * Normalisasi typo ASR umum (khusus region Indonesia / konteks Alkitab).
 * @param {string} text
 */
export function normalizeUserAsrText(text) {
  let out = String(text || "").trim();
  if (!out || getEffectiveAiLang() !== "id") return out;
  for (const [re, rep] of ID_ASR_PHRASE_FIXES) {
    out = typeof rep === "function" ? out.replace(re, rep) : out.replace(re, rep);
  }
  return out;
}

/**
 * Buang fragment phantom (noise mic, salah deteksi bahasa singkat).
 * @param {string} text
 * @param {{ final?: boolean }} [opts]
 */
export function shouldDiscardPhantomUserAsr(text, opts = {}) {
  if (!isIndonesiaProfile()) return false;
  const norm = normalizeToken(text);
  if (!norm) return true;
  if (PHANTOM_STANDALONE.has(norm)) return true;

  const words = norm.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const w = words[0];
    if (ALLOW_SHORT_ID.has(w)) return false;
    if (w.length <= 4 && opts.final) return true;
  }
  return false;
}

/**
 * Buang transkripsi user yang script/bahasa tidak cocok dengan region aktif.
 * @param {string} text
 * @param {string} [languageCode]
 */
export function shouldDiscardMisdetectedUserAsr(text, languageCode) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return false;

  const allowed = AI_LANG_SCRIPTS[getEffectiveAiLang()] || REGION_ALLOWED_SCRIPTS.global;
  const script = detectDominantScript(trimmed);

  if (!allowed.has(script)) return true;

  if (languageCode && !languageCodeMatchesRegion(languageCode)) {
    if (script !== "latin" || trimmed.length <= 48) return true;
  }

  return false;
}

/**
 * Pipeline lengkap: filter + normalisasi. Null = buang.
 * @param {string} text
 * @param {{ languageCode?: string, final?: boolean }} [opts]
 */
export function processUserAsrText(text, opts = {}) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  if (shouldDiscardMisdetectedUserAsr(trimmed, opts.languageCode)) return null;
  const normalized = normalizeUserAsrText(trimmed);
  if (shouldDiscardPhantomUserAsr(normalized, opts)) return null;
  if (shouldDiscardOrphanUserFragment(normalized)) return null;
  return normalized;
}

/** BCP-47 hints untuk setup Gemini Live (best-effort). */
export function getAsrLanguageCodes() {
  const locale = getAiSpeechLocale();
  if (locale.toLowerCase().startsWith("id")) return ["id-ID", "id"];
  return [locale];
}

/** Kosakata bias Gemini ASR ke istilah Alkitab Indonesia. */
export function getAsrCustomVocabulary() {
  if (getEffectiveAiLang() !== "id") return [];
  return [
    "ayat",
    "Alkitab",
    "renungan",
    "doa",
    "Tuhan",
    "Yesus",
    "Allah",
    "firman",
    "khotbah",
    "Shalom",
    "Amen",
    "Puji Tuhan",
    "Kidung Jemaat",
    "pasal",
    "Mazmur",
    "Injil",
    "kesabaran",
    "pengharapan",
    "kekuatan",
    "gereja",
    "saudara",
    "Kejadian",
    "Matius",
    "Yohanes",
    "Roma",
    "Filipi",
    "lookup_verse",
    "Gen Z",
    "generasi",
    "millennial",
    "generasi di atasnya",
    "analogi",
    "konseling pastoral",
    "teologi praktis",
  ];
}
