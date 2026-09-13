/**
 * Night Renungan Engine — pool ayat tidur, rotasi harian/mingguan, sync Firman Hari Ini, teks TB.
 */

import { lookupVerse, verseOfTheDay } from "./alkitabClient.js";
import { dailyPickIndex, todayKey } from "./dailyRenunganEngine.js";

export const NIGHT_POD_SPEECH_MINUTES = 2;
export const NIGHT_POD_AMBIENT_MINUTES = [3, 5, 8];

/** @typedef {{ id: string, title: string, scripture: string, description: string, promptBase: string, badge?: string, reference?: string, tbText?: string, tbFound?: boolean }} NightPodEpisode */

/** Pool renungan tidur — referensi TB. */
export const NIGHT_POD_SLEEP_POOL = [
  { id: "pod-mz91", title: "Naungan Sayap Yang Mahatinggi", scripture: "Mazmur 91:1-4", description: "Perlindungan Tuhan di malam hari.", promptBase: "Renungkan perlindungan Tuhan malam ini" },
  { id: "pod-mz4", title: "Tidur dalam Ketenangan", scripture: "Mazmur 4:8", description: "Berbaring dan tidur dengan aman.", promptBase: "Renungkan damai tidur dari Mazmur 4:8" },
  { id: "pod-mz121", title: "Penjaga yang Tidak Terlelap", scripture: "Mazmur 121:3-4", description: "Tuhan menjaga keluar masukmu.", promptBase: "Renungkan Mazmur 121 tentang penjagaan Tuhan" },
  { id: "pod-mz23", title: "Gembala yang Setia", scripture: "Mazmur 23:1-2", description: "TUHAN gembalaku, takkan kekurangan aku.", promptBase: "Renungkan pemeliharaan Sang Gembala" },
  { id: "pod-mz46", title: "Allah Tempat Perlindungan", scripture: "Mazmur 46:10", description: "Diamlah, ketahuilah bahwa Aku Allah.", promptBase: "Renungkan Mazmur 46:10 tentang ketenangan" },
  { id: "pod-mz3", title: "Bangun dengan Damai", scripture: "Mazmur 3:5", description: "Aku berbaring dan tidur; aku bangun, sebab TUHAN menopang aku.", promptBase: "Renungkan Mazmur 3:5" },
  { id: "pod-mz16", title: "Ketenangan di Hadirat-Nya", scripture: "Mazmur 16:11", description: "Sukacita dan kedamaian di dekat Tuhan.", promptBase: "Renungkan sukacita di hadirat Tuhan" },
  { id: "pod-mz62", title: "Jiwa Beristirahat pada Allah", scripture: "Mazmur 62:1-2", description: "Dari-Nya saja keselamatanku.", promptBase: "Renungkan Mazmur 62 tentang istirahat jiwa" },
  { id: "pod-mz127", title: "Rumah Tangga yang Diberkati", scripture: "Mazmur 127:2", description: "Ia memberi tidur nyenyak kepada kekasih-Nya.", promptBase: "Renungkan Mazmur 127:2" },
  { id: "pod-mz139", title: "Dikenal dan Dijaga", scripture: "Mazmur 139:17-18", description: "Bagiku terlalu ajaib pikiran-Mu, ya Allah.", promptBase: "Renungkan Mazmur 139 tentang kasih Tuhan" },
  { id: "pod-ys26", title: "Damai Sejahtera Sempurna", scripture: "Yesaya 26:3", description: "Engkau akan menjaga dia dalam damai sejahtera.", promptBase: "Renungkan Yesaya 26:3" },
  { id: "pod-mt11", title: "Istirahat dalam Kristus", scripture: "Matius 11:28", description: "Marilah kepada-Ku, semua yang letih lesu.", promptBase: "Renungkan undangan Yesus dalam Matius 11:28" },
  { id: "pod-flp4", title: "Damai yang Melampaui Akal", scripture: "Filipi 4:6-7", description: "Serahkan segala kekhawatiranmu dalam doa.", promptBase: "Renungkan Filipi 4:6-7" },
  { id: "pod-1pt5", title: "Serahkan Kepada-Nya", scripture: "1 Petrus 5:7", description: "Serahkanlah segala kekuatiranmu kepada-Nya.", promptBase: "Renungkan 1 Petrus 5:7" },
  { id: "pod-rm8", title: "Kasih yang Tidak Terpisahkan", scripture: "Roma 8:38-39", description: "Tidak ada yang dapat memisahkan kita dari kasih Allah.", promptBase: "Renungkan Roma 8:38-39" },
  { id: "pod-yb31", title: "Pengharapan dan Hiburan", scripture: "Yeremia 31:25", description: "Aku akan memuaskan jiwa yang lesu.", promptBase: "Renungkan Yeremia 31:25" },
  { id: "pod-pr3", title: "Tidur Nyenyak Malam Hari", scripture: "Amsal 3:24", description: "Jika engkau berbaring tidur, engkau tidak akan terkejut.", promptBase: "Renungkan Amsal 3:24" },
  { id: "pod-mz103", title: "Kasih Setia yang Baru", scripture: "Mazmur 103:1-2", description: "Berkati, hai jiwaku, TUHAN.", promptBase: "Renungkan Mazmur 103 dengan syukur lembut" },
];

/** Tema rotasi mingguan (0 = Minggu). */
export const NIGHT_POD_WEEKLY = [
  { label: "Minggu · Damai & Istirahat", poolIds: ["pod-mz23", "pod-mz46", "pod-mz127"] },
  { label: "Senin · Penyerahan", poolIds: ["pod-1pt5", "pod-mt11", "pod-flp4"] },
  { label: "Selasa · Perlindungan", poolIds: ["pod-mz91", "pod-mz121", "pod-mz3"] },
  { label: "Rabu · Ketenangan", poolIds: ["pod-mz4", "pod-ys26", "pod-mz62"] },
  { label: "Kamis · Pengharapan", poolIds: ["pod-yb31", "pod-rm8", "pod-mz16"] },
  { label: "Jumat · Syukur", poolIds: ["pod-mz103", "pod-mz139", "pod-pr3"] },
  { label: "Sabtu · Kedekatan", poolIds: ["pod-mz23", "pod-mz139", "pod-mz16"] },
];

/** @deprecated */
export const NIGHT_POD_EPISODES = NIGHT_POD_SLEEP_POOL;

function poolById(id) {
  return NIGHT_POD_SLEEP_POOL.find((p) => p.id === id);
}

/** @param {typeof NIGHT_POD_SLEEP_POOL[0]} base @returns {Promise<NightPodEpisode>} */
async function enrichWithTb(base, extra = {}) {
  const tb = await lookupVerse(base.scripture);
  return {
    ...base,
    ...extra,
    reference: tb.reference || base.scripture,
    scripture: tb.reference || base.scripture,
    tbText: tb.text || "",
    tbFound: Boolean(tb.found && tb.text),
    description: extra.description || base.description,
  };
}

/**
 * Susun daftar episode untuk sesi malam ini.
 * @returns {Promise<{ episodes: NightPodEpisode[], defaultIdx: number, weeklyLabel: string }>}
 */
export async function resolveNightPodSession() {
  const weekly = NIGHT_POD_WEEKLY[new Date().getDay()] || NIGHT_POD_WEEKLY[0];
  const tonightPoolIdx = dailyPickIndex("night-pod-pool", NIGHT_POD_SLEEP_POOL.length);

  const firmanRaw = await verseOfTheDay();
  const firmanEpisode = firmanRaw?.found
    ? await enrichWithTb(
        {
          id: "firman-hari-ini",
          title: "Firman Hari Ini",
          scripture: firmanRaw.reference || "Ayat hari ini",
          description: "Ayat yang sama dengan Beranda — renungkan sebelum tidur.",
          promptBase: "Renungkan ayat firman hari ini dengan suara tenang",
        },
        { badge: "Beranda" },
      )
    : null;

  const tonightEpisode = await enrichWithTb(NIGHT_POD_SLEEP_POOL[tonightPoolIdx], { badge: "Malam ini" });

  /** @type {NightPodEpisode[]} */
  const episodes = [];
  const seen = new Set();

  function pushUnique(ep) {
    const key = ep.reference || ep.scripture;
    if (seen.has(key)) return;
    seen.add(key);
    episodes.push(ep);
  }

  if (firmanEpisode) pushUnique(firmanEpisode);
  pushUnique(tonightEpisode);

  for (const id of weekly.poolIds) {
    const base = poolById(id);
    if (base) pushUnique(await enrichWithTb(base, { badge: weekly.label.split("·")[0]?.trim() || "Minggu" }));
  }

  for (const base of NIGHT_POD_SLEEP_POOL) {
    if (episodes.length >= 14) break;
    if (!seen.has(base.scripture)) {
      pushUnique(await enrichWithTb(base));
    }
  }

  return {
    episodes,
    defaultIdx: 0,
    weeklyLabel: weekly.label,
  };
}

/** @deprecated */
export function getTonightEpisodeIndex(dateKey = todayKey()) {
  return dailyPickIndex("night-pod-pool", NIGHT_POD_SLEEP_POOL.length);
}

/** @deprecated */
export function getTonightEpisode(dateKey = todayKey()) {
  return NIGHT_POD_SLEEP_POOL[getTonightEpisodeIndex(dateKey)];
}

/** @param {NightPodEpisode} episode */
export function buildNightPodVoicePrompt(episode) {
  const tbInstruction = episode.tbText
    ? `Bacakan teks ayat persis: "${episode.tbText}" (${episode.reference || episode.scripture}).`
    : `Bacakan ${episode.scripture} dari Alkitab.`;

  return [
    `[MODE: Renungan malam pengantar tidur — SINGKAT, maksimal ${NIGHT_POD_SPEECH_MINUTES} menit bicara, ±200 kata.]`,
    "Nada: sangat tenang, lembut, lambat. Bukan podcast tanya-jawab. Jangan khotbah panjang.",
    "Struktur: (1) ayat inti, (2) renungan 2-3 kalimat, (3) doa penutup singkat, selesai.",
    tbInstruction,
    `Fokus renungan: ${episode.promptBase}.`,
    "Akhiri dengan 'Selamat tidur dalam damai Tuhan' lalu berhenti — jangan lanjut obrolan.",
  ].join(" ");
}
