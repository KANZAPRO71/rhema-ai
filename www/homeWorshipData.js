/** Data kurasi — renungan, emosi, rencana 7 hari, doa (UI Fase 1). */

/** @type {Array<{ id: string, emoji: string, label: string, ref: string, prompt: string }>} */
export const EMOTIONS = [
  { id: "sedih", emoji: "😢", label: "Sedih", ref: "Mazmur 34:18", prompt: "Bacakan ayat penghiburan untuk hati yang sedih" },
  { id: "cemas", emoji: "😰", label: "Cemas", ref: "Filipi 4:6-7", prompt: "Bacakan ayat tentang kekhawatiran dan damai sejahtera" },
  { id: "syukur", emoji: "🙏", label: "Bersyukur", ref: "1 Tesalonika 5:18", prompt: "Bacakan ayat tentang bersyukur" },
  { id: "takut", emoji: "😨", label: "Takut", ref: "Yesaya 41:10", prompt: "Bacakan ayat peneguhan saat takut" },
  { id: "lelah", emoji: "😩", label: "Lelah", ref: "Matius 11:28", prompt: "Bacakan ayat untuk yang lelah dan terbebani" },
  { id: "marah", emoji: "😤", label: "Marah", ref: "Efesus 4:26", prompt: "Bacakan ayat tentang mengelola amarah" },
  { id: "putus-asa", emoji: "💔", label: "Putus asa", ref: "Roma 8:28", prompt: "Bacakan ayat harapan saat putus asa" },
  { id: "bahagia", emoji: "😊", label: "Bahagia", ref: "Mazmur 118:24", prompt: "Bacakan ayat syukur untuk hari yang baik" },
];

/** Renungan singkat per hari (rotasi) — melengkapi ayat hari ini. */
export const DEVOTION_SNIPPETS = [
  "Allah dekat dengan yang patah hati. Luangkan waktu diam sejenak dan dengarkan suara-Nya hari ini.",
  "Firman Tuhan adalah pelita. Biarkan satu ayat menuntun langkah Anda sepanjang hari.",
  "Bersyukur membuka mata hati. Hitung berkat kecil yang sering terlewat.",
  "Damai sejahtera-Nya melampaui akal. Serahkan yang tidak Anda kuasai kepada-Nya.",
  "Kasih setia Tuhan new every morning. Mulai hari ini dengan harapan baru.",
  "Jangan takut — Tuhan menyertai. Ingat janji-Nya saat jalan terasa berat.",
  "Berdoa tanpa henti. Jadikan percakapan dengan Tuhan gaya hidup, bukan rutinitas singkat.",
];

/** @type {Array<{ day: number, title: string, refs: string[] }>} */
export const READING_PLAN_7 = [
  { day: 1, title: "Kasih Allah", refs: ["Yohanes 3:16", "1 Yohanes 4:19"] },
  { day: 2, title: "Penghiburan", refs: ["Mazmur 23:1-3", "Mazmur 23:4"] },
  { day: 3, title: "Iman", refs: ["Ibrani 11:1", "Markus 11:22"] },
  { day: 4, title: "Damai sejahtera", refs: ["Filipi 4:6-7", "Filipi 4:8"] },
  { day: 5, title: "Pengharapan", refs: ["Roma 8:28", "Yeremia 29:11"] },
  { day: 6, title: "Pengampunan", refs: ["Efesus 4:32", "Matius 6:14"] },
  { day: 7, title: "Panggilan", refs: ["Matius 28:19-20", "Mikha 6:8"] },
];

/** @type {Array<{ id: string, emoji: string, title: string, subtitle: string, label: string, voicePrompt: string }>} */
export const PRAYER_PRESETS = [
  {
    id: "pagi",
    emoji: "🌅",
    title: "Doa Pagi Hari",
    subtitle: "Ucap syukur & serahkan hari",
    label: "Doa pagi",
    voicePrompt:
      "Pimpin doa pagi singkat dalam bahasa Indonesia — ucapkan syukur, serahkan hari ini, dan minta hikmat. Tenang dan khidmat.",
  },
  {
    id: "malam",
    emoji: "🌙",
    title: "Doa Malam Hari",
    subtitle: "Damai sebelum tidur",
    label: "Doa malam",
    voicePrompt:
      "Pimpin doa malam singkat — syukuri hari ini, minta pengampunan jika perlu, dan berikan damai sebelum tidur.",
  },
  {
    id: "keluarga",
    emoji: "👨‍👩‍👧",
    title: "Doa Keluarga",
    subtitle: "Kasih & perlindungan rumah",
    label: "Doa keluarga",
    voicePrompt: "Doakan keluarga saya — kesatuan, kasih, dan perlindungan Tuhan. Singkat dan hangat.",
  },
  {
    id: "stres",
    emoji: "🧘",
    title: "Ketenangan Jiwa",
    subtitle: "Saat cemas & lelah",
    label: "Stres & ujian",
    voicePrompt: "Doakan saya yang sedang stres dan terbebani — berikan ayat penghiburan lalu doa singkat.",
  },
];

export const STREAK_KEY = "rhema-reading-streak";
export const PLAN_KEY = "rhema-reading-plan";
