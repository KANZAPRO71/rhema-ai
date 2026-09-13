/**
 * Alkitab TB offline — lookup & search di device (BYOK, tanpa PC server).
 */
import { getEffectiveBibleVersion } from "./localeProfile.js";

const TB_BASE = "/data/alkitab_tb";
const KJV_BASE = "/data/alkitab_kjv";
const KNOWLEDGE_BASE = "/data/rhema_knowledge";

const KODE_LEGACY = { "1sm": "1sa", "2sm": "2sa", efe: "ef", "1ch": "1ta", "2ch": "2ta" };

const REF_RE =
  /(?<book>[\w\s\-]+?)\s+(?<pasal>\d{1,3})\s*(?:[:.]|\s+(?:pasal\s+)?(?:ayat\s+)?)\s*(?<ayat>\d{1,3})/i;
const REF_RANGE_RE =
  /(?<book>[\w\s\-]+?)\s+(?<pasal>\d{1,3})\s*(?:[:.]|\s+(?:pasal\s+)?(?:ayat\s+)?)\s*(?<ayatStart>\d{1,3})\s*[-–—]\s*(?<ayatEnd>\d{1,3})/i;
const REF_SINGKAT = /\b(?<kode>[a-z0-9]{2,4})\.?\s+(?<pasal>\d{1,3})\s*[:.]\s*(?<ayat>\d{1,3})\b/i;
const REF_CHAPTER_RANGE_RE =
  /^(?<book>[\w\s\-]+?)\s+(?<pasalStart>\d{1,3})\s*[-–—]\s*(?<pasalEnd>\d{1,3})\s*$/i;
const REF_SINGKAT_RANGE =
  /\b(?<kode>[a-z0-9]{2,4})\.?\s+(?<pasal>\d{1,3})\s*[:.]\s*(?<ayatStart>\d{1,3})\s*[-–—]\s*(?<ayatEnd>\d{1,3})\b/i;

const VERSE_OF_DAY_REFS = [
  "Yohanes 3:16",
  "Mazmur 23:1",
  "Filipi 4:13",
  "Roma 8:28",
  "Matius 6:33",
  "Yeremia 29:11",
  "Amsal 3:5",
  "Yesaya 41:10",
  "1 Petrus 5:7",
  "Efesus 2:8",
  "Galatia 5:22",
  "Mazmur 46:1",
  "Kejadian 1:1",
  "Ibrani 11:1",
  "2 Timotius 1:7",
];

const STOP = new Set([
  "di", "ke", "dari", "yang", "dan", "atau", "pada", "untuk", "dengan", "adalah", "akan", "ialah",
  "itu", "ini", "juga", "nya", "the", "and", "for", "with", "that", "this",
]);

/** @type {Array<{kode:string,nama:string,alias?:string[]}>} */
let kitabIndex = [];
/** @type {Record<string,string>} */
let aliasToKode = {};
/** @type {Record<string,string>} */
let kodeToNama = {};
/** @type {Record<string,string>} */
let kjvKodeToNama = {};
/** @type {Map<string, object>} */
const bukuCache = new Map();
/** @type {Map<string, object>} */
const kjvBukuCache = new Map();
/** @type {object | null} */
let searchIndex = null;
/** @type {object | null} */
let tafsirKitab = null;
/** @type {object | null} */
let tafsirLiteratur = null;
/** @type {object | null} */
let strongsGlossary = null;
/** @type {{ refs?: Record<string, Array<{ ref: string, label?: string }>> } | null} */
let crossRefCache = null;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function loadIndex() {
  if (kitabIndex.length) return;
  try {
    const raw = await fetchJson(`${TB_BASE}/kitab_index.json`);
    kitabIndex = raw.kitab ?? [];
  } catch {
    kitabIndex = [];
  }
  aliasToKode = {};
  kodeToNama = {};
  for (const k of kitabIndex) {
    kodeToNama[k.kode] = k.nama;
    aliasToKode[k.nama.toLowerCase()] = k.kode;
    aliasToKode[k.kode] = k.kode;
    for (const a of k.alias ?? []) aliasToKode[a.toLowerCase()] = k.kode;
  }
  for (const [leg, baru] of Object.entries(KODE_LEGACY)) aliasToKode[leg] = baru;
}

async function loadKjvIndex() {
  if (Object.keys(kjvKodeToNama).length) return;
  try {
    const raw = await fetchJson(`${KJV_BASE}/kitab_index.json`);
    for (const k of raw.kitab ?? []) {
      kjvKodeToNama[k.kode] = k.nama;
    }
  } catch {
    kjvKodeToNama = {};
  }
}

function normKode(kode) {
  const k = String(kode || "").toLowerCase();
  return KODE_LEGACY[k] ?? aliasToKode[k] ?? k;
}

function bookName(kode) {
  return kodeToNama[normKode(kode)] ?? String(kode).toUpperCase();
}

function kjvBookName(kode) {
  return kjvKodeToNama[normKode(kode)] ?? bookName(kode);
}

function formatKjvReference(ref) {
  return `${kjvBookName(ref.kode)} ${ref.pasal}:${ref.ayat}`;
}

async function readKjvBuku(kode) {
  const nk = normKode(kode);
  if (kjvBukuCache.has(nk)) return kjvBukuCache.get(nk);
  try {
    const data = await fetchJson(`${KJV_BASE}/buku/${nk}.json`);
    kjvBukuCache.set(nk, data);
    return data;
  } catch {
    return null;
  }
}

async function readFromKjvBuku(kode, pasal, ayat) {
  const max = await maxValidAyat(kode, pasal);
  if (max != null && ayat > max) return null;
  const buku = await readKjvBuku(kode);
  const raw = buku?.pasal?.[String(pasal)]?.[String(ayat)] ?? null;
  return raw ? normalizeVerseText(raw) : null;
}

async function readBuku(kode) {
  const nk = normKode(kode);
  if (bukuCache.has(nk)) return bukuCache.get(nk);
  try {
    const data = await fetchJson(`${TB_BASE}/buku/${nk}.json`);
    bukuCache.set(nk, data);
    return data;
  } catch {
    return null;
  }
}

function normalizeVerseText(text) {
  return String(text || "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** @type {object | null} */
let verseBounds = null;

async function loadVerseBounds() {
  if (verseBounds) return verseBounds;
  try {
    const raw = await fetchJson(`${TB_BASE}/verse_bounds.json`);
    verseBounds = raw.bounds ?? {};
  } catch {
    verseBounds = {};
  }
  return verseBounds;
}

async function maxValidAyat(kode, pasal) {
  const bounds = await loadVerseBounds();
  const nk = normKode(kode);
  const max = bounds[nk]?.[String(pasal)];
  return typeof max === "number" && max > 0 ? max : null;
}

async function readFromBuku(kode, pasal, ayat) {
  const max = await maxValidAyat(kode, pasal);
  if (max != null && ayat > max) return null;
  const buku = await readBuku(kode);
  const raw = buku?.pasal?.[String(pasal)]?.[String(ayat)] ?? null;
  return raw ? normalizeVerseText(raw) : null;
}

function formatReference(ref) {
  return `${bookName(ref.kode)} ${ref.pasal}:${ref.ayat}`;
}

function refValid(ref) {
  return ref && ref.pasal >= 1 && ref.ayat >= 1 && Boolean(normKode(ref.kode));
}

function resolveBook(raw) {
  const t = String(raw || "")
    .toLowerCase()
    .replace(/[^\w\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  const aliases = Object.keys(aliasToKode).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (alias.length < 2) continue;
    if (t === alias || t.startsWith(`${alias} `)) {
      return normKode(aliasToKode[alias]);
    }
  }
  const tok = (t.split(/\s+/)[0] ?? "").replace(/\.$/, "");
  return aliasToKode[tok] ? normKode(aliasToKode[tok]) : null;
}

function findRefInText(text) {
  const tl = text.toLowerCase();
  const aliases = Object.keys(aliasToKode).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (alias.length < 2) continue;
    const pos = tl.indexOf(alias);
    if (pos < 0) continue;
    const frag = text.slice(pos, pos + alias.length + 40);
    const m = /(?<pasal>\d{1,3})\s*(?:[:.]|\s+(?:pasal\s+)?(?:ayat\s+)?)\s*(?<ayat>\d{1,3})/i.exec(
      frag.slice(alias.length),
    );
    if (!m?.groups) continue;
    const ref = { kode: normKode(aliasToKode[alias]), pasal: Number(m.groups.pasal), ayat: Number(m.groups.ayat) };
    if (refValid(ref)) return ref;
  }
  return null;
}

/** @param {string} text */
export async function parseVerseRange(text) {
  await loadIndex();
  const t = String(text || "");

  const singkat = REF_SINGKAT_RANGE.exec(t);
  if (singkat?.groups) {
    const kode = normKode(singkat.groups.kode);
    const pasal = Number(singkat.groups.pasal);
    const ayatStart = Number(singkat.groups.ayatStart);
    const ayatEnd = Number(singkat.groups.ayatEnd);
    if (refValid({ kode, pasal, ayat: ayatStart }) && ayatEnd >= ayatStart) {
      return { kode, pasal, ayatStart, ayatEnd };
    }
  }

  const m = REF_RANGE_RE.exec(t);
  if (!m?.groups) return null;
  const kode = resolveBook(m.groups.book);
  if (!kode) return null;
  const pasal = Number(m.groups.pasal);
  const ayatStart = Number(m.groups.ayatStart);
  const ayatEnd = Number(m.groups.ayatEnd);
  if (!refValid({ kode, pasal, ayat: ayatStart }) || ayatEnd < ayatStart) return null;
  return { kode: normKode(kode), pasal, ayatStart, ayatEnd };
}

export async function parseVerseReference(text) {
  await loadIndex();
  const t = String(text || "");

  const singkat = REF_SINGKAT.exec(t);
  if (singkat?.groups) {
    const ref = {
      kode: normKode(singkat.groups.kode),
      pasal: Number(singkat.groups.pasal),
      ayat: Number(singkat.groups.ayat),
    };
    if (refValid(ref)) return ref;
  }

  const inline = findRefInText(t);
  if (inline) return inline;

  const m = REF_RE.exec(t);
  if (!m?.groups) return null;
  const kode = resolveBook(m.groups.book);
  if (!kode) return null;
  const ref = { kode, pasal: Number(m.groups.pasal), ayat: Number(m.groups.ayat) };
  return refValid(ref) ? ref : null;
}

/** @param {string} text */
async function parseChapterRange(text) {
  await loadIndex();
  const m = REF_CHAPTER_RANGE_RE.exec(String(text || "").trim());
  if (!m?.groups) return null;
  const kode = resolveBook(m.groups.book);
  if (!kode) return null;
  const pasalStart = Number(m.groups.pasalStart);
  const pasalEnd = Number(m.groups.pasalEnd);
  if (!Number.isFinite(pasalStart) || !Number.isFinite(pasalEnd) || pasalEnd < pasalStart) return null;
  return { kode: normKode(kode), pasalStart, pasalEnd };
}

export async function lookupVerse(reference) {
  await loadIndex();
  const raw = String(reference || "").trim();
  const chRange = await parseChapterRange(raw);
  if (chRange) {
    const kode = chRange.kode;
    const formatted = `${bookName(kode)} ${chRange.pasalStart}-${chRange.pasalEnd}`;
    const snippets = [];
    for (let pasal = chRange.pasalStart; pasal <= chRange.pasalEnd; pasal++) {
      const text = await readFromBuku(kode, pasal, 1);
      if (text) snippets.push(`${pasal}:1 ${text}`);
    }
    return {
      reference: formatted,
      text: snippets.join(" · "),
      translation: "TB",
      found: snippets.length > 0,
      kode,
      pasal: chRange.pasalStart,
      pasalEnd: chRange.pasalEnd,
      chapterRange: true,
      sumber: "Alkitab offline (device)",
    };
  }
  const range = await parseVerseRange(raw);
  if (range) {
    const kode = normKode(range.kode);
    const formatted = `${bookName(kode)} ${range.pasal}:${range.ayatStart}-${range.ayatEnd}`;
    /** @type {{ ayat: number, text: string }[]} */
    const verses = [];
    for (let ayat = range.ayatStart; ayat <= range.ayatEnd; ayat++) {
      const text = await readFromBuku(kode, range.pasal, ayat);
      if (text) verses.push({ ayat, text });
    }
    if (verses.length) {
      return {
        reference: formatted,
        text: verses.map((v) => `${range.pasal}:${v.ayat} ${v.text}`).join(" "),
        translation: "TB",
        found: true,
        kode,
        pasal: range.pasal,
        ayat: range.ayatStart,
        ayatEnd: range.ayatEnd,
        verses,
        sumber: "Alkitab offline (device)",
      };
    }
    return {
      reference: formatted,
      text: "",
      translation: "TB",
      found: false,
      kode,
      pasal: range.pasal,
      ayat: range.ayatStart,
      ayatEnd: range.ayatEnd,
    };
  }

  const ref = await parseVerseReference(raw);
  if (!ref) {
    return { reference: raw, text: "", translation: "TB", found: false };
  }
  const kode = normKode(ref.kode);
  const formatted = formatReference({ ...ref, kode });
  const text = await readFromBuku(kode, ref.pasal, ref.ayat);
  if (text) {
    return {
      reference: formatted,
      text,
      translation: "TB",
      found: true,
      kode,
      pasal: ref.pasal,
      ayat: ref.ayat,
      sumber: "Alkitab offline (device)",
    };
  }
  return {
    reference: formatted,
    text: "",
    translation: "TB",
    found: false,
    kode,
    pasal: ref.pasal,
    ayat: ref.ayat,
  };
}

/** King James Version — 66 kitab offline (parity TB). */
export async function lookupKjvVerse(reference) {
  await loadIndex();
  await loadKjvIndex();
  const raw = String(reference || "").trim();
  const tr = "KJV";
  const src = "KJV offline (device)";
  const chRange = await parseChapterRange(raw);
  if (chRange) {
    const kode = chRange.kode;
    const formatted = `${kjvBookName(kode)} ${chRange.pasalStart}-${chRange.pasalEnd}`;
    const snippets = [];
    for (let pasal = chRange.pasalStart; pasal <= chRange.pasalEnd; pasal++) {
      const text = await readFromKjvBuku(kode, pasal, 1);
      if (text) snippets.push(`${pasal}:1 ${text}`);
    }
    return {
      reference: formatted,
      text: snippets.join(" · "),
      translation: tr,
      found: snippets.length > 0,
      kode,
      pasal: chRange.pasalStart,
      pasalEnd: chRange.pasalEnd,
      chapterRange: true,
      sumber: src,
    };
  }
  const range = await parseVerseRange(raw);
  if (range) {
    const kode = normKode(range.kode);
    const formatted = `${kjvBookName(kode)} ${range.pasal}:${range.ayatStart}-${range.ayatEnd}`;
    const verses = [];
    for (let ayat = range.ayatStart; ayat <= range.ayatEnd; ayat++) {
      const text = await readFromKjvBuku(kode, range.pasal, ayat);
      if (text) verses.push({ ayat, text });
    }
    if (verses.length) {
      return {
        reference: formatted,
        text: verses.map((v) => `${range.pasal}:${v.ayat} ${v.text}`).join(" "),
        translation: tr,
        found: true,
        kode,
        pasal: range.pasal,
        ayat: range.ayatStart,
        ayatEnd: range.ayatEnd,
        verses,
        sumber: src,
      };
    }
    return {
      reference: formatted,
      text: "",
      translation: tr,
      found: false,
      kode,
      pasal: range.pasal,
      ayat: range.ayatStart,
      ayatEnd: range.ayatEnd,
    };
  }
  const ref = await parseVerseReference(raw);
  if (!ref) {
    return { reference: raw, text: "", translation: tr, found: false };
  }
  const kode = normKode(ref.kode);
  const formatted = formatKjvReference({ ...ref, kode });
  const text = await readFromKjvBuku(kode, ref.pasal, ref.ayat);
  if (text) {
    return {
      reference: formatted,
      text,
      translation: tr,
      found: true,
      kode,
      pasal: ref.pasal,
      ayat: ref.ayat,
      sumber: src,
    };
  }
  return {
    reference: formatted,
    text: "",
    translation: tr,
    found: false,
    kode,
    pasal: ref.pasal,
    ayat: ref.ayat,
  };
}

export async function lookupVerseFromQuery(text) {
  const ref = await parseVerseReference(text);
  if (!ref) return null;
  const result = await lookupVerse(formatReference(ref));
  return result.found ? result : null;
}

export async function verseOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const ref = VERSE_OF_DAY_REFS[day % VERSE_OF_DAY_REFS.length] ?? "Yohanes 3:16";
  return getEffectiveBibleVersion() === "kjv" ? lookupKjvVerse(ref) : lookupVerse(ref);
}

export async function verifyVerse(reference, quotedText) {
  const official = await lookupVerse(reference);
  if (!official.found) return { valid: false, reference, reason: "Ayat tidak ditemukan di Alkitab offline" };
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const valid = norm(official.text).includes(norm(quotedText).slice(0, 40)) || norm(quotedText).includes(norm(official.text).slice(0, 40));
  return { valid, reference: official.reference, officialText: official.text, quotedText };
}

async function loadCrossReferences() {
  if (crossRefCache) return crossRefCache;
  try {
    crossRefCache = await fetchJson(`${KNOWLEDGE_BASE}/cross_references.json`);
  } catch {
    crossRefCache = { refs: {} };
  }
  return crossRefCache;
}

/** @param {string} reference */
export async function getCrossReferences(reference) {
  const data = await loadCrossReferences();
  const raw = String(reference || "").trim();
  if (!raw) return [];
  const refs = data.refs ?? {};
  const keys = [raw];
  const m = /^(.+?\s+\d+)(?::\d+(?:-\d+)?)?$/.exec(raw);
  if (m?.[1]) keys.push(m[1]);
  for (const key of keys) {
    if (refs[key]?.length) return refs[key];
  }
  return [];
}

export async function lookupPassage(reference, options = {}) {
  const radius = options.contextRadius ?? 2;
  const primary = await lookupVerse(reference);
  if (!primary.found) {
    return { reference, found: false, translation: "TB", primary: null, contextBefore: [], contextAfter: [] };
  }
  const ref = await parseVerseReference(reference);
  const contextBefore = [];
  const contextAfter = [];
  if (ref) {
    for (let i = 1; i <= radius; i++) {
      const before = await lookupVerse(formatReference({ ...ref, ayat: ref.ayat - i }));
      if (before.found) contextBefore.unshift(before);
      const after = await lookupVerse(formatReference({ ...ref, ayat: ref.ayat + i }));
      if (after.found) contextAfter.push(after);
    }
  }
  const bookIntro = await getBookIntro(ref?.kode ?? "");
  const tafsir = ref ? await getTafsirForRef(ref) : null;
  const crossReferences = await getCrossReferences(primary.reference);
  return {
    reference: primary.reference,
    found: true,
    translation: "TB",
    primary,
    contextBefore,
    contextAfter,
    bookIntro,
    tafsir,
    crossReferences,
    lexicon: [],
    ethics: [],
  };
}

async function loadTafsirKitab() {
  if (tafsirKitab) return tafsirKitab;
  try {
    tafsirKitab = await fetchJson(`${TB_BASE}/tafsir_kitab.json`);
  } catch {
    tafsirKitab = {};
  }
  return tafsirKitab;
}

async function loadTafsirLiteratur() {
  if (tafsirLiteratur) return tafsirLiteratur;
  try {
    tafsirLiteratur = await fetchJson(`${TB_BASE}/tafsir_literatur.json`);
  } catch {
    tafsirLiteratur = {};
  }
  return tafsirLiteratur;
}

export async function getBookIntro(bookOrKode) {
  await loadIndex();
  const data = await loadTafsirKitab();
  const kode = normKode(String(bookOrKode || "").toLowerCase()) || resolveBook(bookOrKode);
  if (!kode) return null;
  const intro = data[kode] ?? data[bookName(kode).toLowerCase()];
  if (!intro) return null;
  return { found: true, kode, nama: bookName(kode), ...intro };
}

export async function getTafsirForRef(ref) {
  const data = await loadTafsirLiteratur();
  const key = `${normKode(ref.kode)}:${ref.pasal}:${ref.ayat}`;
  const entry = data[key] ?? data[`${bookName(ref.kode)} ${ref.pasal}:${ref.ayat}`];
  if (!entry) return null;
  return { found: true, reference: formatReference(ref), ...entry };
}

export async function getLexiconForReference(reference) {
  try {
    const { BIBLE_LEXICON } = await import("./bibleLexicon.js");
    const ref = await lookupVerse(reference);
    if (!ref.found) return [];
    return BIBLE_LEXICON[ref.reference] ?? [];
  } catch {
    return [];
  }
}

export async function getStrongsEntry(id) {
  if (!strongsGlossary) {
    try {
      strongsGlossary = await fetchJson(`${KNOWLEDGE_BASE}/strongs_glossary.json`);
    } catch {
      strongsGlossary = {};
    }
  }
  const key = String(id || "").trim().toUpperCase();
  const entry = strongsGlossary[key] ?? strongsGlossary[key.replace(/^([GH])/, "$1")];
  if (!entry) return null;
  return { found: true, id: key, ...entry };
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

async function loadSearchIndex() {
  if (searchIndex) return searchIndex;
  try {
    searchIndex = await fetchJson(`${KNOWLEDGE_BASE}/tb_search_index.json`);
  } catch {
    searchIndex = null;
  }
  return searchIndex;
}

export async function searchTb(query, options = {}) {
  const q = String(query || "").trim();
  const limit = options.limit ?? 12;
  if (!q) return { query: q, hits: [], mode: "offline" };

  const direct = await lookupVerseFromQuery(q);
  if (direct) {
    return {
      query: q,
      hits: [{ score: 100, reference: direct.reference, preview: direct.text.slice(0, 120), verse: direct }],
      mode: "reference",
    };
  }

  const idx = await loadSearchIndex();
  if (!idx) return { query: q, hits: [], mode: "offline", error: "Index Alkitab belum tersedia di app" };

  const tokens = [...new Set(tokenize(q))];
  const scores = new Map();
  for (const t of tokens) {
    const w = idx.idf?.[t];
    const list = idx.postings?.[t];
    if (!w || !list?.length) continue;
    for (const id of list) scores.set(id, (scores.get(id) ?? 0) + w);
  }

  const hits = [];
  for (const [id, score] of scores) {
    const meta = idx.verses?.[id];
    if (!meta) continue;
    hits.push({ score, id, reference: meta.ref, preview: meta.preview });
  }
  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, limit);
  for (const h of top) {
    h.verse = await lookupVerse(h.reference);
  }
  return { query: q, hits: top, mode: "semantic", verseCount: idx.verseCount ?? 0 };
}

export async function knowledgeMeta() {
  const idx = await loadSearchIndex();
  return {
    product: "Rhema AI",
    mode: "byok-offline",
    tbSearchIndex: {
      ready: Boolean(idx),
      verseCount: idx?.verseCount ?? 0,
      termCount: idx?.termCount ?? 0,
      built: idx?.built ?? "",
    },
    note: "Backend berjalan di device — BYOK Gemini API key di Pengaturan.",
  };
}
