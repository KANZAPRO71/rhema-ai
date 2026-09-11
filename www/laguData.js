/**
 * Kidung Jemaat — katalog lengkap (KJ 478, PKJ 308, NKB 230, BE 719+, POP 10)
 * Lirik & akor detail di-load per lagu dari /data/hymns/songs/{id}.json
 */
import { HYMN_CATALOG } from "./data/hymns/catalog.js";

export const HYMN_BOOKS = [
  { id: "all", name: "Semua Buku", icon: "🎵", desc: "Seluruh nyanyian & pujian rohani gereja" },
  { id: "KJ", name: "Kidung Jemaat (KJ)", count: "478 Lagu", icon: "📖", desc: "Buku nyanyian oikoumene PGI/YAMUGER" },
  { id: "PKJ", name: "Pelengkap KJ (PKJ)", count: "308 Lagu", icon: "🌿", desc: "Pujian kontekstual gereja nusantara" },
  { id: "NKB", name: "Nyanyikanlah Kidung Baru (NKB)", count: "230 Lagu", icon: "✨", desc: "Kidung sukacita, persekutuan & misi" },
  { id: "BE", name: "Buku Ende (BE)", count: "864 Ende", icon: "⛪", desc: "Buku ende liturgis jemaat HKBP" },
  { id: "POP", name: "Lagu Rohani Populer", count: "Top Worship", icon: "🎸", desc: "Pujian & penyembahan modern Indonesia" },
];

/** @type {Map<string, object>} */
const songCache = new Map();
/** @type {Map<string, Promise<object|null>>} */
const songLoads = new Map();

function normalizeId(id) {
  if (!id) return "";
  const numId = Number(id);
  if (!isNaN(numId)) {
    const hit = HYMN_CATALOG.find((h) => h.no === numId);
    return hit?.id || "";
  }
  const clean = String(id).toLowerCase().trim();
  const direct = HYMN_CATALOG.find((h) => h.id.toLowerCase() === clean);
  if (direct) return direct.id;

  const m = clean.match(/(kj|pkj|nkb|be|pop)\s*[- ]?\s*([0-9]+)/i);
  if (m) {
    const book = m[1].toUpperCase();
    const no = parseInt(m[2], 10);
    const hit = HYMN_CATALOG.find((h) => h.book === book && h.no === no);
    return hit?.id || `${book.toLowerCase()}-${no}`;
  }
  return clean;
}

/** @param {string} songId */
export function getHymnEntry(songId) {
  const id = normalizeId(songId);
  if (!id) return null;
  return HYMN_CATALOG.find((h) => h.id === id) || null;
}

/** @param {string} songId */
export async function loadHymn(songId) {
  const id = normalizeId(songId);
  if (!id) return null;
  if (songCache.has(id)) return songCache.get(id);

  const pending = songLoads.get(id);
  if (pending) return pending;

  const entry = getHymnEntry(id);
  if (!entry) return null;

  const promise = fetch(`/data/hymns/songs/${id}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const merged = data || { ...entry, lyrics: "", progression: [] };
      songCache.set(id, merged);
      songLoads.delete(id);
      return merged;
    })
    .catch(() => {
      songLoads.delete(id);
      const fallback = { ...entry, lyrics: entry.preview || "", progression: [] };
      songCache.set(id, fallback);
      return fallback;
    });

  songLoads.set(id, promise);
  return promise;
}

/** Sync lookup — metadata katalog saja (tanpa lirik penuh). */
export function getHymn(id) {
  const entry = getHymnEntry(id);
  if (!entry) return null;
  const cached = songCache.get(entry.id);
  if (cached) return cached;
  return {
    id: entry.id,
    book: entry.book,
    no: entry.no,
    title: entry.title,
    key: entry.key,
    chord: entry.chord,
    lyrics: entry.preview || "",
    progression: [],
  };
}

export function getHymnsByBook(book) {
  if (!book || book === "all") return HYMN_CATALOG.map(catalogToListItem);
  return HYMN_CATALOG.filter((h) => h.book.toUpperCase() === book.toUpperCase()).map(catalogToListItem);
}

function catalogToListItem(h) {
  return {
    id: h.id,
    book: h.book,
    no: h.no,
    title: h.title,
    key: h.key,
    chord: h.chord,
    lyrics: h.preview || "",
    hasLyrics: h.hasLyrics,
  };
}

export function hymnOfTheDay() {
  const day = Math.floor(Date.now() / 86_400_000);
  const entry = HYMN_CATALOG[day % HYMN_CATALOG.length];
  return catalogToListItem(entry);
}

export function searchHymns(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return getHymnsByBook("all");
  return HYMN_CATALOG.filter((h) => {
    const hay = `${h.book} ${h.no} ${h.title} ${h.preview || ""}`.toLowerCase();
    return hay.includes(q);
  }).map((h) => {
    const item = catalogToListItem(h);
    if (q.length >= 3 && h.preview && h.preview.toLowerCase().includes(q)) {
      item.snippet = h.preview;
    }
    return item;
  });
}

export function getCatalogStats() {
  const stats = {};
  for (const h of HYMN_CATALOG) {
    stats[h.book] = (stats[h.book] || 0) + 1;
  }
  return stats;
}
