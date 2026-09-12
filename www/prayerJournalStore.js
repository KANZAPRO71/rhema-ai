/**
 * Penyimpanan terpusat jurnal pokok doa — dipakai tab Doa & kartu Alkitab.
 */
import { getEffectiveUiLang, isGlobalUiLang } from "./localeProfile.js";
import { PRAYER_CATEGORIES } from "./renunganData.js";
import { t } from "./uiStrings.js";

export const PRAYER_JOURNAL_KEY = "rhema-prayer-journal";

/** @typedef {{ id: string, title: string, content?: string, notes?: string, category: string, status: "active" | "answered", date: string, testimony?: string, answeredDate?: string, prayerCount?: number }} PrayerEntry */

/** @param {unknown} raw */
function normalizePrayerEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const p = /** @type {Record<string, unknown>} */ (raw);
  const title = String(p.title ?? "").trim();
  if (!title) return null;

  const content = String(p.content ?? p.notes ?? "").trim();
  let category = String(p.category ?? "keluarga").trim().toLowerCase();
  const catMatch = PRAYER_CATEGORIES.find((c) => c.id === category || c.id === p.category);
  if (catMatch) category = catMatch.id;

  const isAnswered = p.status === "answered" || p.isAnswered === true;
  return {
    id: String(p.id ?? `prayer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    title,
    content,
    category,
    status: isAnswered ? "answered" : "active",
    date: String(p.date ?? new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })),
    testimony: p.testimony ? String(p.testimony) : "",
    answeredDate: p.answeredDate ? String(p.answeredDate) : "",
    prayerCount: Math.max(1, Number(p.prayerCount) || 1),
  };
}

/** @returns {PrayerEntry[]} */
export function loadPrayerJournal() {
  try {
    const raw = JSON.parse(localStorage.getItem(PRAYER_JOURNAL_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizePrayerEntry).filter(Boolean);
  } catch {
    return [];
  }
}

/** @param {PrayerEntry[]} list */
export function savePrayerJournal(list) {
  localStorage.setItem(PRAYER_JOURNAL_KEY, JSON.stringify(list));
}

/** @param {PrayerEntry[]} list */
export function getPrayerJournalStats(list = loadPrayerJournal()) {
  const answered = list.filter((p) => p.status === "answered").length;
  return {
    total: list.length,
    active: list.length - answered,
    answered,
  };
}

/**
 * @param {string} title
 * @param {string} [category]
 * @param {string} [content]
 */
export function addPrayerRequest(title, category = "keluarga", content = "") {
  const list = loadPrayerJournal();
  const entry = normalizePrayerEntry({
    id: `prayer-${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    category,
    status: "active",
    date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    prayerCount: 1,
  });
  if (!entry) return null;
  list.unshift(entry);
  savePrayerJournal(list);
  return entry;
}

/** @param {string} id */
export function togglePrayerAnswered(id) {
  const list = loadPrayerJournal();
  const item = list.find((p) => p.id === id);
  if (!item) return null;

  if (item.status === "answered") {
    item.status = "active";
    item.testimony = "";
    item.answeredDate = "";
  } else {
    const testimony = prompt("Tuliskan kesaksian / ungkapan syukur doa yang telah dijawab Tuhan:");
    item.status = "answered";
    item.testimony = testimony || "Tuhan telah menjawab dan mengabulkan doa ini.";
    item.answeredDate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }
  savePrayerJournal(list);
  return item;
}

/** @param {string} id */
export function deletePrayer(id) {
  const list = loadPrayerJournal().filter((p) => p.id !== id);
  savePrayerJournal(list);
}

/** @param {string} id */
export function incrementPrayerSupport(id) {
  const list = loadPrayerJournal();
  const item = list.find((p) => p.id === id);
  if (!item) return null;
  item.prayerCount = (item.prayerCount || 1) + 1;
  savePrayerJournal(list);
  return item;
}

/** @param {PrayerEntry} prayer */
export function buildSinglePrayerVoicePrompt(prayer) {
  const cat = PRAYER_CATEGORIES.find((c) => c.id === prayer.category);
  const catLabel = cat ? t(cat.nameKey) : t("prayer.cat.general");
  const detail = prayer.content?.trim()
    ? isGlobalUiLang()
      ? ` Note: ${prayer.content.trim()}.`
      : ` Catatan: ${prayer.content.trim()}.`
    : "";
  if (isGlobalUiLang()) {
    return `Lead a deep, faith-filled intercession for this ${catLabel} prayer request: "${prayer.title}".${detail} Bring this petition before the Lord.`;
  }
  return `Pimpin doa syafaat yang mendalam dan penuh iman untuk pokok doa kategori ${catLabel}: "${prayer.title}".${detail} Bawa permohonan ini ke hadirat Tuhan.`;
}

/** @param {PrayerEntry[]} prayers */
export function buildAllActivePrayersVoicePrompt(prayers) {
  const active = prayers.filter((p) => p.status !== "answered");
  const prayerSummary = active
    .map((p, i) => `${i + 1}. ${p.title}${p.content ? ` (${p.content})` : ""}`)
    .join(". ");
  if (isGlobalUiLang()) {
    return `Lead a deep, faith-filled intercession for these prayer requests: ${prayerSummary}. Bring each petition before the Lord.`;
  }
  return `Pimpin doa syafaat yang mendalam dan penuh iman untuk pokok-pokok doa saya berikut ini: ${prayerSummary}. Bawa setiap permohonan ini ke hadirat Tuhan.`;
}
