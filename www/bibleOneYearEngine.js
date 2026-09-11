/**
 * Bible One Year Engine — jadwal baca 365 hari (PL + PB + Mazmur/Amsal).
 * Terpisah dari Renungan. Jadwal di-generate deterministik dari urutan kitab TB.
 */

const ONE_YEAR_STORAGE_KEY = "rhema-1year-bible-plan-v2";
const TOTAL_DAYS = 365;

/** @type {Array<{ name: string, chapters: number }>} */
const OT_BOOKS = [
  { name: "Kejadian", chapters: 50 },
  { name: "Keluaran", chapters: 40 },
  { name: "Imamat", chapters: 27 },
  { name: "Bilangan", chapters: 36 },
  { name: "Ulangan", chapters: 34 },
  { name: "Yosua", chapters: 24 },
  { name: "Hakim-hakim", chapters: 21 },
  { name: "Rut", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Raja-raja", chapters: 22 },
  { name: "2 Raja-raja", chapters: 25 },
  { name: "1 Tawarikh", chapters: 29 },
  { name: "2 Tawarikh", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemia", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Ayub", chapters: 42 },
  { name: "Mazmur", chapters: 150 },
  { name: "Amsal", chapters: 31 },
  { name: "Pengkhotbah", chapters: 12 },
  { name: "Kidung Agung", chapters: 8 },
  { name: "Yesaya", chapters: 66 },
  { name: "Yeremia", chapters: 52 },
  { name: "Ratapan", chapters: 5 },
  { name: "Yehezkiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Yoel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obaja", chapters: 1 },
  { name: "Yunus", chapters: 4 },
  { name: "Mikha", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakuk", chapters: 3 },
  { name: "Zefanya", chapters: 3 },
  { name: "Hagai", chapters: 2 },
  { name: "Zakaria", chapters: 14 },
  { name: "Maleakhi", chapters: 4 },
];

/** @type {Array<{ name: string, chapters: number }>} */
const NT_BOOKS = [
  { name: "Matius", chapters: 28 },
  { name: "Markus", chapters: 16 },
  { name: "Lukas", chapters: 24 },
  { name: "Yohanes", chapters: 21 },
  { name: "Kisah Para Rasul", chapters: 28 },
  { name: "Roma", chapters: 16 },
  { name: "1 Korintus", chapters: 16 },
  { name: "2 Korintus", chapters: 13 },
  { name: "Galatia", chapters: 6 },
  { name: "Efesus", chapters: 6 },
  { name: "Filipi", chapters: 4 },
  { name: "Kolose", chapters: 4 },
  { name: "1 Tesalonika", chapters: 5 },
  { name: "2 Tesalonika", chapters: 3 },
  { name: "1 Timotius", chapters: 6 },
  { name: "2 Timotius", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Filemon", chapters: 1 },
  { name: "Ibrani", chapters: 13 },
  { name: "Yakobus", chapters: 5 },
  { name: "1 Petrus", chapters: 5 },
  { name: "2 Petrus", chapters: 3 },
  { name: "1 Yohanes", chapters: 5 },
  { name: "2 Yohanes", chapters: 1 },
  { name: "3 Yohanes", chapters: 1 },
  { name: "Yudas", chapters: 1 },
  { name: "Wahyu", chapters: 22 },
];

/** @param {Array<{ name: string, chapters: number }>} books */
function expandChapterRefs(books) {
  /** @type {string[]} */
  const refs = [];
  for (const book of books) {
    for (let c = 1; c <= book.chapters; c++) {
      refs.push(`${book.name} ${c}`);
    }
  }
  return refs;
}

/** @param {string[]} refs @param {number} dayIndex 0-based @param {number} totalDays */
function sliceForDay(refs, dayIndex, totalDays) {
  if (!refs.length) return [];
  const start = Math.floor((dayIndex * refs.length) / totalDays);
  const end = Math.floor(((dayIndex + 1) * refs.length) / totalDays);
  return refs.slice(start, Math.max(start + 1, end));
}

/** @param {string[]} chapterRefs */
function formatChapterGroup(chapterRefs) {
  if (!chapterRefs.length) return "—";
  const first = chapterRefs[0];
  const last = chapterRefs[chapterRefs.length - 1];
  const firstBook = first.replace(/\s+\d+$/, "");
  const lastBook = last.replace(/\s+\d+$/, "");
  const firstNum = Number(first.match(/\d+$/)?.[0] || 1);
  const lastNum = Number(last.match(/\d+$/)?.[0] || firstNum);
  if (firstBook === lastBook && firstNum === lastNum) return first;
  if (firstBook === lastBook) return `${firstBook} ${firstNum}-${lastNum}`;
  return `${first} … ${last}`;
}

/** @param {number} dayIndex 0-based */
function wisdomReading(dayIndex) {
  if (dayIndex % 3 === 2) {
    const n = (dayIndex % 31) + 1;
    return `Amsal ${n}`;
  }
  const n = (dayIndex % 150) + 1;
  return `Mazmur ${n}`;
}

/** @param {string} ref */
function bookFromRef(ref) {
  const m = ref.match(/^(.+?)\s+\d/);
  return m ? m[1].trim() : ref.split(" ")[0] || "Firman";
}

/** @param {string} pl @param {string} pb */
function themeForDay(pl, pb) {
  return `${bookFromRef(pl)} & ${bookFromRef(pb)} — Firman hari ini`;
}

/** @type {Array<{ day: number, pl: string, pb: string, mazmur: string, theme: string }> | null} */
let cachedSchedule = null;

export function buildOneYearSchedule() {
  if (cachedSchedule) return cachedSchedule;

  const otRefs = expandChapterRefs(OT_BOOKS);
  const ntRefs = expandChapterRefs(NT_BOOKS);

  cachedSchedule = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const pl = formatChapterGroup(sliceForDay(otRefs, i, TOTAL_DAYS));
    const pb = formatChapterGroup(sliceForDay(ntRefs, i, TOTAL_DAYS));
    const mazmur = wisdomReading(i);
    return {
      day: i + 1,
      pl,
      pb,
      mazmur,
      theme: themeForDay(pl, pb),
    };
  });

  return cachedSchedule;
}

export function getCalendarDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.min(TOTAL_DAYS, Math.max(1, Math.floor(diff / oneDay)));
}

export function getCalendarYear(date = new Date()) {
  return date.getFullYear();
}

/** @param {number} dayNum 1-365 */
export function getOneYearDayEntry(dayNum) {
  const schedule = buildOneYearSchedule();
  const idx = Math.max(0, Math.min(TOTAL_DAYS - 1, dayNum - 1));
  return schedule[idx];
}

export function getTodayOneYearDay(date = new Date()) {
  const dayOfYear = getCalendarDayOfYear(date);
  const year = getCalendarYear(date);
  return {
    year,
    dayOfYear,
    plan: getOneYearDayEntry(dayOfYear),
    totalDays: TOTAL_DAYS,
  };
}

/** @returns {{ year: number, completed: Record<string, boolean> }} */
export function getOneYearProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(ONE_YEAR_STORAGE_KEY) || "{}");
    const year = getCalendarYear();
    if (raw.year !== year) {
      return { year, completed: {} };
    }
    return { year: raw.year, completed: raw.completed || {} };
  } catch {
    return { year: getCalendarYear(), completed: {} };
  }
}

/** @param {{ year: number, completed: Record<string, boolean> }} progress */
export function saveOneYearProgress(progress) {
  localStorage.setItem(ONE_YEAR_STORAGE_KEY, JSON.stringify(progress));
}

/** @param {number} dayNum */
export function toggleOneYearDayCompleted(dayNum) {
  const progress = getOneYearProgress();
  const key = String(dayNum);
  progress.completed[key] = !progress.completed[key];
  saveOneYearProgress(progress);
  return progress;
}

/** @param {number} [year] */
export function countOneYearCompleted(year = getCalendarYear()) {
  const progress = getOneYearProgress();
  if (progress.year !== year) return 0;
  return Object.values(progress.completed).filter(Boolean).length;
}

export function getOneYearPercentComplete(year = getCalendarYear(), dayOfYear = getCalendarDayOfYear()) {
  const done = countOneYearCompleted(year);
  return Math.round((done / TOTAL_DAYS) * 100);
}

/** Persentase kalender (hari ke-N dari 365), bukan progres centang. */
export function getCalendarPercent(dayOfYear = getCalendarDayOfYear()) {
  return Math.round((dayOfYear / TOTAL_DAYS) * 100);
}

export const ONE_YEAR_TOTAL_DAYS = TOTAL_DAYS;
