/**
 * Devotion Session Engine — orkestrasi sesi renungan multi-fase dengan jeda merenung.
 * Lapisan ini bebas DOM: UI & voice di-wire lewat callback.
 */

import { RHEMA_ADDRESS_RULE_SHORT } from "./rhemaAddressRule.js";
import { getDailyDevotionOpeningVariation } from "./dailyRenunganEngine.js";
import {
  getAiLanguageRule,
  getAiLifeContextRule,
  getDayPartLabel,
  getDevotionTimezone,
  getTimeSuffix,
  getUiLocale,
  isIndonesiaProfile,
} from "./localeProfile.js";

/** Durasi hening merenung (detik). */
export const MEDITATION_DURATION_SEC = 120;

/** Target durasi fase suara (menit). */
export const OPENING_TARGET_MIN = 2;
export const REFLECTION_TARGET_MIN = 5;
export const REFLECTION_TARGET_MAX = 6;
export const PRAYER_TARGET_MIN = 2;
export const PRAYER_TARGET_MAX = 2;

/** Estimasi total sesi (menit) untuk UI. */
export const SESSION_ESTIMATED_MINUTES =
  OPENING_TARGET_MIN + MEDITATION_DURATION_SEC / 60 + REFLECTION_TARGET_MAX + PRAYER_TARGET_MAX;

/** @type {Array<{ id: string, label: string, moodHint: string, bridgeStyle: string }>} */
export const DAILY_GREETING_ANGLES = [
  {
    id: "sukacita-syukur",
    label: "Sukacita & Syukur",
    moodHint: "hati yang cenderung bersyukur meski hari penuh urusan",
    bridgeStyle: "hubungkan sukacita rohani dengan tema firman hari ini",
  },
  {
    id: "lelah-pulih",
    label: "Lelah & Butuh Segar",
    moodHint: "tubuh atau jiwa yang lelah dan butuh kesegaran dari Tuhan",
    bridgeStyle: "akui kelelahan dengan lembut, undang firman sebagai sumber kekuatan baru",
  },
  {
    id: "tenang-kesibukan",
    label: "Tenang di Tengah Kesibukan",
    moodHint: "pikiran yang masih berpacu di tengah kesibukan hari",
    bridgeStyle: "ajak saudara melambatkan langkah sejenak sebelum firman dibacakan",
  },
  {
    id: "rindu-hadirat",
    label: "Rindu Hadirat Tuhan",
    moodHint: "kerinduan untuk berdiam di hadirat Tuhan lebih dari sekadar rutinitas",
    bridgeStyle: "sentuh kerinduan hati yang haus akan Tuhan",
  },
  {
    id: "pengharapan-baru",
    label: "Pengharapan Baru",
    moodHint: "hati yang mencari arah atau pengharapan segar dari firman",
    bridgeStyle: "buka ruang pengharapan sebelum ayat hari ini disampaikan",
  },
  {
    id: "damai-sejahtera",
    label: "Damai Sejahtera",
    moodHint: "kebutuhan akan damai sejahtera yang lebih dalam dari sekadar ketenangan sementara",
    bridgeStyle: "undang damai Kristus menyertai saat teduh ini",
  },
  {
    id: "refleksi-jujur",
    label: "Refleksi Jujur",
    moodHint: "hati yang ingin jujur pada Tuhan tentang kondisi hidup saat ini",
    bridgeStyle: "ciptakan ruang kejujuran sebelum firman berbicara",
  },
];

function dayIndex() {
  return Math.floor(Date.now() / 86_400_000);
}

/** @returns {typeof DAILY_GREETING_ANGLES[number]} */
export function pickDailyGreetingAngle() {
  return DAILY_GREETING_ANGLES[dayIndex() % DAILY_GREETING_ANGLES.length];
}

/**
 * Konteks waktu & sapaan untuk prolog pembuka sesi renungan (WITA).
 * @returns {{
 *   dateLabel: string,
 *   timeLabel: string,
 *   dayPart: string,
 *   dayPartHint: string,
 *   greetingAngle: typeof DAILY_GREETING_ANGLES[number],
 * }}
 */
export function getDevotionOpeningContext(now = new Date()) {
  const tz = getDevotionTimezone();
  const locale = getUiLocale();
  const dateLabel = now.toLocaleDateString(locale, {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeCore = now.toLocaleTimeString(locale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: !isIndonesiaProfile(),
  });
  const timeLabel = `${timeCore}${getTimeSuffix()}`;

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );

  const dayPart = getDayPartLabel(now);
  let dayPartHint = isIndonesiaProfile()
    ? "pertengahan hari yang mungkin masih penuh aktivitas"
    : "midday — life may still feel busy and full";

  if (hour >= 5 && hour < 11) {
    dayPartHint = isIndonesiaProfile()
      ? "awal hari yang baru dimulai — tubuh bangun, pikiran mulai bergerak"
      : "early morning — a fresh start before the day unfolds";
  } else if (hour >= 11 && hour < 15) {
    dayPartHint = isIndonesiaProfile()
      ? "tengah hari — mungkin saudara baru selesai makan atau masih di tengah pekerjaan"
      : "midday — perhaps between tasks, meals, or responsibilities";
  } else if (hour >= 15 && hour < 18) {
    dayPartHint = isIndonesiaProfile()
      ? "sore hari — tubuh mulai lelah, hati butuh jeda sebelum malam tiba"
      : "late afternoon — energy fading, heart needing a pause";
  } else if (hour >= 18 && hour < 22) {
    dayPartHint = isIndonesiaProfile()
      ? "petang — hari hampir selesai, saat yang tepat menarik napas dan merenung"
      : "evening — the day winding down, a good moment to breathe and reflect";
  } else {
    dayPartHint = isIndonesiaProfile()
      ? "malam — kesunyian yang cocok untuk berdiam di hadirat Tuhan"
      : "night — quiet hours suited for resting in God's presence";
  }

  const daily = getDailyDevotionOpeningVariation();

  return {
    dateLabel,
    timeLabel,
    dayPart,
    dayPartHint,
    greetingAngle: {
      id: `daily-${daily.variationIndex}`,
      label: daily.label,
      moodHint: daily.moodHint,
      bridgeStyle: daily.bridgeStyle,
    },
  };
}

/** @type {Array<{ id: string, label: string, voice: boolean, icon: string, durationSec?: number }>} */
export const DEVOTION_SESSION_PHASES = [
  { id: "opening", label: "Prolog & Ayat", voice: true, icon: "📖" },
  { id: "meditate", label: "Renungkan", voice: false, icon: "🕊️", durationSec: MEDITATION_DURATION_SEC },
  { id: "reflection", label: "Refleksi", voice: true, icon: "💡" },
  { id: "prayer", label: "Doa", voice: true, icon: "🙏" },
];

/** Kerangka berpikir refleksi — rotasi harian agar tidak monoton. */
export const REFLECTION_FRAMEWORKS = [
  {
    id: "cermin-hati",
    label: "Cermin Hati",
    structure:
      "Perasaan jujur hari ini → ayat sebagai cermin → satu kebenaran yang menyentuh → langkah kecil hari ini.",
    sampleQuestions: [
      "Apa yang paling menekan hati saudara belakangan ini?",
      "Bagian ayat mana yang seperti hold up cermin bagi hidup saudara?",
      "Jika Tuhan berbisik satu kalimat hari ini, apa yang ingin saudara dengar?",
    ],
    analogyDomain: "kehidupan sehari-hari yang penuh tuntutan — seperti ponsel yang penuh notifikasi, tapi hati yang paling perlu dijeda",
  },
  {
    id: "jembatan-hidup",
    label: "Jembatan ke Realita",
    structure:
      "Makna ayat dalam bahasa sederhana → analogi kehidupan modern → jembatan ke situasi nyata saudara → kerinduan hati.",
    sampleQuestions: [
      "Di tengah rutinitas yang padat, firman ini mau menemui saudara di bagian mana?",
      "Pernahkah saudara merasa Tuhan jauh — padahal ayat ini bilang sebaliknya?",
      "Apa satu area hidup yang paling butuh sentuhan firman ini hari ini?",
    ],
    analogyDomain: "commute macet, tagihan, deadline kerja, atau chat keluarga yang bikin hati berat",
  },
  {
    id: "harapan-di-tengah",
    label: "Harapan di Tengah Badai",
    structure:
      "Akui kenyataan pahit yang umum → janji ayat → gambaran harapan yang realistis → doa batin yang terbuka.",
    sampleQuestions: [
      "Bukan hanya saudara — banyak yang lelah hari ini. Apa yang ayat ini tawarkan?",
      "Jika iman saudara lemah sekarang, apakah Tuhan masih cukup?",
      "Bagaimana firman ini mengubah cara saudara melihat hari ini?",
    ],
    analogyDomain: "musim hujan panjang, proses yang lambat, atau menunggu jawaban yang belum datang",
  },
  {
    id: "relasi-dan-kasih",
    label: "Relasi & Kasih",
    structure:
      "Firman tentang hati manusia → hubungan (keluarga, teman, rekan kerja) → belajar mengampuni/menerima → langkah damai.",
    sampleQuestions: [
      "Ada kah seseorang yang sulit saudara sayangi hari ini?",
      "Apakah ayat ini mengajak saudara membuka hati atau melindungi hati?",
      "Langkah damai kecil apa yang bisa saudara ambil sebelum tidur?",
    ],
    analogyDomain: "grup WhatsApp keluarga, rekan kantor, tetangga, atau jarak dengan orang tua",
  },
  {
    id: "identitas-di-Tuhan",
    label: "Identitas di Hadirat Tuhan",
    structure:
      "Siapa saudara di mata Tuhan (bukan di mata dunia) → ayat sebagai jangkar identitas → lepaskan tekanan performa → istirahat rohani.",
    sampleQuestions: [
      "Apakah saudara terlalu sibuk membuktikan diri — dan lupa bahwa Tuhan sudah menerima saudara?",
      "Bagaimana hidup saudara berubah jika saudara benar-benar percaya ayat ini?",
      "Apa yang perlu saudara lepaskan agar hati lebih ringan?",
    ],
    analogyDomain: "perbandingan di media sosial, ekspektasi karier, atau rasa tidak cukup",
  },
  {
    id: "syukur-dan-kesadaran",
    label: "Syukur & Kesadaran",
    structure:
      "Berhenti sejenak dari keluhan → lihat berkat tersembunyi → ayat sebagai undangan syukur → respons hati yang jujur.",
    sampleQuestions: [
      "Di tengah yang sulit, ada kah satu berkat kecil yang sering terlewat?",
      "Apakah hati saudara lebih cepat mengeluh daripada bersyukur — dan apa yang ayat ini ajak?",
      "Siapa atau apa yang ingin saudara ucap syukur hari ini?",
    ],
    analogyDomain: "makan sederhana, kesehatan yang dianggap remeh, atau orang yang setia di sisi saudara",
  },
  {
    id: "keberanian-baru",
    label: "Keberanian Baru",
    structure:
      "Ketakutan yang wajar → firman sebagai sumber keberanian → langkah iman kecil yang konkret → peneguhan penutup.",
    sampleQuestions: [
      "Apa yang saudara tunda karena takut — dan bagaimana ayat ini menyentuhnya?",
      "Bukan berarti hidup mudah — tapi apakah saudara bersedia melangkah satu inci saja hari ini?",
      "Bagaimana rupa keberanian yang lembut, bukan keras?",
    ],
    analogyDomain: "keputusan karier, percakapan yang ditunda, atau langkah iman yang terasa terlalu besar",
  },
];

/** Referensi realita kehidupan — dipadukan dengan analogi refleksi. */
export const LIFE_REALITY_REFERENCES = [
  "tekanan biaya hidup dan kekhawatiran ekonomi keluarga",
  "lelah bekerja — di kantor, remote, atau usaha sendiri",
  "merawat orang tua atau anak sambil mengejar tanggung jawab",
  "perantau yang rindu kampung halaman dan jaring pengingat iman",
  "notifikasi ponsel yang tidak pernah henti dan hati yang kewalahan",
  "perbandingan hidup di media sosial yang mencuri syukur",
  "hubungan yang retak — suami-istri, sahabat, atau rekan kerja",
  "kesehatan yang menurun atau burnout yang sunyi",
  "masa depan anak, pendidikan, atau pekerjaan yang belum jelas",
  "berita dunia yang menakutkan — tapi Tuhan yang tetap berdaulat",
  "rasa bersalah atau malu yang sulit saudara akui",
  "doa yang belum terjawab dan proses menunggu yang panjang",
];

export function getReflectionVoiceRules() {
  return [
    isIndonesiaProfile()
      ? "Ini percakapan renungan pribadi setelah saudara hening — BUKAN khotbah, BUKAN kuliah teologi."
      : "This is a personal devotion conversation — NOT a sermon, NOT a lecture.",
    isIndonesiaProfile()
      ? "JANGAN: monoton, jargon rohani, mengulang ayat kata per kata, daftar poin kaku, gaya mengajar step-by-step, terburu-buru."
      : "AVOID: monotone delivery, heavy jargon, verse-by-verse repetition, rigid bullet lists, rushed pacing.",
    `${getAiLanguageRule()} ${isIndonesiaProfile() ? "Tafsir ayat sederhana." : "Explain Scripture plainly."} ${getAiLifeContextRule()}`,
    isIndonesiaProfile()
      ? "WAJIB: minimal 2–3 analogi konkret yang menyentuh hati — biarkan setiap analogi 'land' sejenak sebelum lanjut."
      : "REQUIRED: at least 2–3 concrete heart-level illustrations — let each one land before moving on.",
    isIndonesiaProfile()
      ? "Gunakan pertanyaan retoris ke hati — saudara TIDAK perlu menjawab lisan."
      : "Use gentle rhetorical heart questions — the listener does not need to answer aloud.",
    isIndonesiaProfile()
      ? `Minimal ${REFLECTION_TARGET_MIN} menit, maksimal ${REFLECTION_TARGET_MAX} menit total — jangan singkat; biarkan firman benar-benar hidup di hati saudara.`
      : `Aim for ${REFLECTION_TARGET_MIN}–${REFLECTION_TARGET_MAX} minutes total — unhurried; let Scripture settle in the heart.`,
  ].join(" ");
}

export const PRAYER_VOICE_RULES = [
  "Doa ini melanjutkan refleksi barusan — bukan doa template generik.",
  "Susun kerangka doa dari: tema ayat + kebenaran yang baru digarisbawahi + kerinduan hati yang tersentuh + langkah iman hari ini.",
  "Doa seperti yang saudara HARAPKAN Tuhan dengar — penuh jujur, spesifik, dan penuh pengharapan.",
  "Gunakan 'saudara' atau 'kita'; jangan panggil 'jemaat'. Bicara pelan dan khidmat.",
  "Jangan mengajar atau bertanya — fase ini murni memanjatkan doa.",
].join(" ");

/** @returns {typeof REFLECTION_FRAMEWORKS[number]} */
export function pickReflectionFramework() {
  return REFLECTION_FRAMEWORKS[dayIndex() % REFLECTION_FRAMEWORKS.length];
}

/** @returns {string} */
const GLOBAL_LIFE_REALITY_REFERENCES = [
  "work pressure and financial anxiety",
  "fatigue from work, study, or caregiving",
  "homesickness or feeling far from community",
  "constant phone notifications and mental overload",
  "comparison on social media stealing gratitude",
  "strained relationships — family, friends, or colleagues",
  "declining health or quiet burnout",
  "uncertainty about the future",
  "heavy news cycles — yet a sovereign God",
  "unanswered prayer and long seasons of waiting",
];

export function pickLifeRealityReference() {
  const pool = isIndonesiaProfile()
    ? LIFE_REALITY_REFERENCES
    : GLOBAL_LIFE_REALITY_REFERENCES;
  return pool[dayIndex() % pool.length];
}

/**
 * @param {object} devotion
 * @param {typeof REFLECTION_FRAMEWORKS[number]} [framework]
 * @param {string} [lifeRef]
 * @returns {string}
 */
export function buildReflectionPhasePrompt(devotion, framework = pickReflectionFramework(), lifeRef = pickLifeRealityReference()) {
  const theme = devotion.theme || "Firman Saat Teduh Hari Ini";
  const verseText = devotion.verse?.text || devotion.text || "";
  const verseRef = devotion.verse?.reference || devotion.reference || "";
  const reflection = devotion.reflection || "";
  const practicalAction = devotion.practicalAction || "";

  const tone = `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — khidmat, hangat, pelan, seperti sahabat rohani setia.`;
  const questions = framework.sampleQuestions.map((q) => `"${q}"`).join(" ");

  return [
    tone,
    getReflectionVoiceRules(),
    `Fase 3 — Refleksi sesi renungan (minimal ${REFLECTION_TARGET_MIN} menit, maksimal ${REFLECTION_TARGET_MAX} menit).`,
    `Saudara baru selesai ${MEDITATION_DURATION_SEC / 60} menit hening merenung ayat ${verseRef}.`,
    `Tema: ${theme}. Ayat TB: "${verseText}".`,
    reflection ? `Garis refleksi (kembangkan hidup, jangan dibaca mentah): ${reflection}` : "",
    `Kerangka berpikir hari ini: "${framework.label}" — ${framework.structure}`,
    `Padukan realita kehidupan: ${lifeRef}. Analogi selaras: ${framework.analogyDomain}.`,
    `Ajukan pertanyaan retoris ke hati (saudara tidak perlu jawab lisan): ${questions}`,
    practicalAction ? `Akhiri dengan langkah iman konkret: ${practicalAction}` : "Akhiri dengan satu langkah iman kecil yang spesifik hari ini.",
    "Jangan memimpin doa — fase doa terpisah. Bicara cukup panjang — refleksi akan dilanjutkan otomatis jika belum selesai.",
    "Langsung mulai berbicara.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {number} segment
 * @param {number} elapsedMin
 * @param {object} devotion
 * @param {typeof REFLECTION_FRAMEWORKS[number]} framework
 * @param {string} lifeRef
 */
export function buildReflectionContinuationPrompt(
  segment,
  elapsedMin,
  devotion,
  framework = pickReflectionFramework(),
  lifeRef = pickLifeRealityReference(),
) {
  const theme = devotion.theme || "Firman Saat Teduh Hari Ini";
  const verseRef = devotion.verse?.reference || devotion.reference || "";
  const remaining = Math.max(1, Math.round(REFLECTION_TARGET_MAX - elapsedMin));
  const tone = `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — khidmat, hangat, pelan, penuh penghayatan.`;

  const focus =
    segment <= 2
      ? "Perdalam analogi ke hidup nyata — tambah contoh konkret yang menyentuh hati saudara."
      : segment <= 3
        ? "Kembangkan pertanyaan retoris ke hati; hubungkan ayat ke situasi hidup saudara hari ini."
        : "Rangkum kebenaran yang tersentuh; siapkan hati menuju doa — tapi jangan mulai doa dulu.";

  return [
    tone,
    `[LANJUT REFLEKSI — bagian ${segment}]`,
    "Jangan ulang sapaan, ayat, atau analogi yang sudah disampaikan. Lanjutkan dari titik terakhir.",
    getReflectionVoiceRules(),
    `Target total refleksi: ${REFLECTION_TARGET_MIN}–${REFLECTION_TARGET_MAX} menit (sudah ~${Math.round(elapsedMin)} menit, sisa ~${remaining} menit).`,
    `Tema: ${theme}. Ayat: ${verseRef}. Kerangka: "${framework.label}". Realita: ${lifeRef}.`,
    focus,
    "Minimal 1 analogi baru atau perdalam analogi sebelumnya — biarkan saudara merinding merasakan firman di hidup nyata.",
    "Jangan memimpin doa — fase doa terpisah. Langsung lanjut berbicara.",
  ].join(" ");
}

/**
 * @param {object} devotion
 * @param {typeof REFLECTION_FRAMEWORKS[number]} [framework]
 * @returns {string}
 */
export function buildPrayerPhasePrompt(devotion, framework = pickReflectionFramework()) {
  const theme = devotion.theme || "Firman Saat Teduh Hari Ini";
  const verseText = devotion.verse?.text || devotion.text || "";
  const verseRef = devotion.verse?.reference || devotion.reference || "";
  const reflection = devotion.reflection || "";
  const practicalAction = devotion.practicalAction || "";
  const guidedPrayer = devotion.guidedPrayer || "";

  const tone = `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — khidmat, hangat, pelan, penuh penghayatan.`;

  return [
    tone,
    PRAYER_VOICE_RULES,
    `Fase 4 — Doa penutup (${PRAYER_TARGET_MIN}–${PRAYER_TARGET_MAX} menit). Barusan saudara memimpin refleksi kerangka "${framework.label}" dari ayat ${verseRef}.`,
    `Tema: ${theme}. Ayat: "${verseText}".`,
    reflection ? `Kebenaran refleksi yang perlu dinaikkan dalam doa: ${reflection}` : "",
    practicalAction ? `Langkah iman yang dimohonkan: ${practicalAction}` : "",
    guidedPrayer ? `Doa penuntun (susun ulang jadi doa hidup penuh kerinduan, jangan dibaca kaku): ${guidedPrayer}` : "",
    "Susun doa dari kerinduan hati yang barusan tersentuh — pengakuan, permohonan spesifik, penyerahan, syukur, Amen.",
    "Doa harus terasa seperti yang saudara harapkan Tuhan dengar setelah merenung firman ini.",
    "Doa akan dilanjutkan otomatis jika belum selesai — jangan terburu-buru; kembangkan dengan penuh penghayatan.",
    "Langsung mulai berdoa.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {number} segment
 * @param {number} elapsedMin
 * @param {object} devotion
 * @param {typeof REFLECTION_FRAMEWORKS[number]} framework
 */
export function buildPrayerContinuationPrompt(
  segment,
  elapsedMin,
  devotion,
  framework = pickReflectionFramework(),
) {
  const theme = devotion.theme || "Firman Saat Teduh Hari Ini";
  const verseRef = devotion.verse?.reference || devotion.reference || "";
  const reflection = devotion.reflection || "";
  const remaining = Math.max(1, Math.round(PRAYER_TARGET_MAX - elapsedMin));
  const tone = `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — khidmat, hangat, pelan, penuh penghayatan.`;
  const isFinal = elapsedMin >= PRAYER_TARGET_MIN - 0.25 || segment >= 2;

  return [
    tone,
    `[LANJUT DOA — bagian ${segment}]`,
    PRAYER_VOICE_RULES,
    "Jangan ulang sapaan atau doa yang sudah diucapkan. Lanjutkan doa dari titik terakhir dengan penuh kerinduan.",
    `Target total doa ${PRAYER_TARGET_MIN}–${PRAYER_TARGET_MAX} menit (sudah ~${Math.round(elapsedMin)} menit, sisa ~${remaining} menit).`,
    `Tema: ${theme}. Ayat: ${verseRef}. Kerangka refleksi: "${framework.label}".`,
    reflection ? `Bawa ke doa: ${reflection}` : "",
    isFinal
      ? "Ini bagian penutup — selesaikan doa dengan penyerahan dan syukur, ucap Amen khidmat, lalu hentikan respons."
      : "Lanjutkan permohonan spesifik, penyerahan, atau syukur — belum perlu Amen; doa masih berlanjut.",
    "Langsung lanjut berdoa.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {object} devotion
 * @param {ReturnType<typeof getDevotionOpeningContext>} [ctx]
 * @returns {string}
 */
export function buildOpeningPhasePrompt(devotion, ctx = getDevotionOpeningContext()) {
  const theme = devotion.theme || "Firman Saat Teduh Hari Ini";
  const verseText = devotion.verse?.text || devotion.text || "";
  const verseRef = devotion.verse?.reference || devotion.reference || "";
  const angle = ctx.greetingAngle;

  const tone = `${RHEMA_ADDRESS_RULE_SHORT} Suara natural Rhema AI Live — khidmat, hangat, pelan, seperti sahabat rohani setia.`;

  return [
    tone,
    `Fase 1 — Prolog pembuka & bacakan ayat (maksimal ~${OPENING_TARGET_MIN} menit).`,
    "ATURAN PROLOG (WAJIB — lakukan SEBELUM membaca ayat):",
    "1) Sapa: 'Shalom saudara' — variasikan kalimat damai sejahtera; JANGAN template kaku yang sama setiap hari.",
    `2) Sebut tanggal & waktu persis: hari ini ${ctx.dateLabel}, pukul ${ctx.timeLabel}.`,
    `3) Umumkan: kita akan melakukan saat teduh bersama — sesuaikan nuansa dengan waktu ${ctx.dayPart} (${ctx.dayPartHint}).`,
    `4) Satu kalimat observasi lembut ke hati saudara — gunakan 'kira-kira' atau 'mungkin'; sudut hari ini: "${angle.label}" (${angle.moodHint}). Jangan mendiagnosis; cukup sentuh dengan empati.`,
    `5) Satu kalimat jembatan unik hari ini menuju tema "${theme}" — ${angle.bridgeStyle}. Kata-kata harus terasa segar, tidak generik, tidak copy-paste dari hari sebelumnya.`,
    "6) BARU SETELAH prolog selesai — bacakan ayat TB dengan pelan dan khidmat:",
    `   Ayat ${verseRef}: "${verseText}".`,
    "7) Akhiri fase ini dengan undangan singkat hening sejenak — jangan tafsir, jangan refleksi, jangan doa.",
    "JANGAN langsung baca ayat di kalimat pertama. Prolog dulu, firman belakangan.",
    "Langsung mulai berbicara.",
  ].join(" ");
}

/**
 * @param {object} devotion
 * @param {string} phaseId
 * @param {{ framework?: typeof REFLECTION_FRAMEWORKS[number], lifeRef?: string }} [ctx]
 * @returns {string}
 */
export function buildPhasePrompt(devotion, phaseId, ctx = {}) {
  const framework = ctx.framework || pickReflectionFramework();
  const lifeRef = ctx.lifeRef || pickLifeRealityReference();

  switch (phaseId) {
    case "opening":
      return buildOpeningPhasePrompt(devotion, ctx.openingContext || getDevotionOpeningContext());
    case "reflection":
      return buildReflectionPhasePrompt(devotion, framework, lifeRef);
    case "prayer":
      return buildPrayerPhasePrompt(devotion, framework);
    default:
      return "";
  }
}

/**
 * @param {number} totalSec
 * @returns {string}
 */
export function formatMeditationTime(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Controller sesi renungan — state machine tanpa ketergantungan DOM.
 * @param {{
 *   onPhaseChange?: (index: number, phase: typeof DEVOTION_SESSION_PHASES[number]) => void,
 *   onMeditationStart?: (durationSec: number) => void,
 *   onMeditationTick?: (secondsLeft: number) => void,
 *   onMeditationEnd?: () => void,
 *   onSpeakPhase?: (prompt: string, phase: typeof DEVOTION_SESSION_PHASES[number]) => void | Promise<void>,
 *   onSessionStart?: (devotion: object) => void,
 *   onSessionEnd?: (reason: "complete" | "stop" | "timeout" | "error") => void,
 *   onMarkRead?: () => void,
 *   waitPlaybackIdle?: () => Promise<void>,
 * }} hooks
 */
export function createDevotionSessionController(hooks = {}) {
  /** @type {object | null} */
  let devotion = null;
  /** @type {typeof REFLECTION_FRAMEWORKS[number] | null} */
  let sessionFramework = null;
  /** @type {string | null} */
  let sessionLifeRef = null;
  /** @type {ReturnType<typeof getDevotionOpeningContext> | null} */
  let sessionOpeningContext = null;
  let active = false;
  let phaseIndex = -1;
  let advancing = false;
  let meditationRunToken = 0;
  let meditationInProgress = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let meditationTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let meditationHardCapTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let sessionTimeout = null;
  let reflectionPhaseStartMs = 0;
  let reflectionSegmentCount = 0;
  let prayerPhaseStartMs = 0;
  let prayerSegmentCount = 0;

  function clearMeditationTimer() {
    if (meditationTimer) {
      clearTimeout(meditationTimer);
      meditationTimer = null;
    }
    if (meditationHardCapTimer) {
      clearTimeout(meditationHardCapTimer);
      meditationHardCapTimer = null;
    }
  }

  function clearSessionTimeout() {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      sessionTimeout = null;
    }
  }

  function armSessionTimeout() {
    clearSessionTimeout();
    sessionTimeout = setTimeout(() => {
      sessionTimeout = null;
      endSession("timeout");
    }, (SESSION_ESTIMATED_MINUTES + 6) * 60 * 1000);
  }

  function endSession(reason) {
    if (!active && phaseIndex < 0) return;
    clearSessionTimeout();
    meditationRunToken += 1;
    clearMeditationTimer();
    meditationInProgress = false;
    active = false;
    phaseIndex = -1;
    advancing = false;
    devotion = null;
    sessionFramework = null;
    sessionLifeRef = null;
    sessionOpeningContext = null;
    reflectionPhaseStartMs = 0;
    reflectionSegmentCount = 0;
    prayerPhaseStartMs = 0;
    prayerSegmentCount = 0;
    hooks.onMeditationEnd?.();
    hooks.onSessionEnd?.(reason);
  }

  function runMeditationPhase(durationSec, meditateIndex) {
    return new Promise((resolve) => {
      const token = ++meditationRunToken;
      const endAt = Date.now() + durationSec * 1000;
      let finished = false;

      const finishMeditation = () => {
        if (finished) return;
        finished = true;
        clearMeditationTimer();

        if (active && token === meditationRunToken) {
          hooks.onMeditationTick?.(0);
          hooks.onMeditationEnd?.();
        }
        resolve();
      };

      hooks.onMeditationStart?.(durationSec);
      clearMeditationTimer();

      const tick = () => {
        if (finished) return;

        if (!active || token !== meditationRunToken) {
          finishMeditation();
          return;
        }

        const remainingMs = endAt - Date.now();
        const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
        hooks.onMeditationTick?.(remaining);

        if (remainingMs <= 0) {
          finishMeditation();
          return;
        }

        meditationTimer = setTimeout(tick, Math.min(1000, remainingMs));
      };

      meditationHardCapTimer = setTimeout(finishMeditation, durationSec * 1000 + 800);
      tick();
    });
  }

  function advanceAfterMeditation(meditateIndex) {
    if (!active) return;

    const reflectionIndex = meditateIndex + 1;
    const current = DEVOTION_SESSION_PHASES[phaseIndex];

    if (current?.id === "reflection" || current?.id === "prayer") {
      return;
    }

    if (phaseIndex <= meditateIndex) {
      phaseIndex = reflectionIndex;
    }

    void advanceToPhase(phaseIndex);
  }

  async function advanceToPhase(index) {
    if (!active || !devotion) return;

    const phase = DEVOTION_SESSION_PHASES[index];
    if (!phase) {
      endSession("complete");
      return;
    }

    phaseIndex = index;
    hooks.onPhaseChange?.(index, phase);
    armSessionTimeout();

    if (phase.id === "meditate") {
      if (meditationInProgress) return;
      meditationInProgress = true;
      const meditateIndex = index;
      try {
        await runMeditationPhase(phase.durationSec || MEDITATION_DURATION_SEC, meditateIndex);
      } finally {
        meditationInProgress = false;
      }
      advanceAfterMeditation(meditateIndex);
      return;
    }

    if (!phase.voice) return;

    if (phase.id === "reflection") {
      reflectionPhaseStartMs = Date.now();
      reflectionSegmentCount = 0;
    }

    if (phase.id === "prayer") {
      prayerPhaseStartMs = Date.now();
      prayerSegmentCount = 0;
    }

    const prompt = buildPhasePrompt(devotion, phase.id, {
      framework: sessionFramework || undefined,
      lifeRef: sessionLifeRef || undefined,
      openingContext: sessionOpeningContext || undefined,
    });
    if (!prompt) {
      phaseIndex += 1;
      void advanceToPhase(phaseIndex);
      return;
    }

    await hooks.onSpeakPhase?.(prompt, phase);
  }

  return {
    /** @param {object} devotionData */
    start(devotionData) {
      if (active) {
        this.stop();
      }
      devotion = devotionData;
      sessionFramework = pickReflectionFramework();
      sessionLifeRef = pickLifeRealityReference();
      sessionOpeningContext = getDevotionOpeningContext();
      active = true;
      phaseIndex = 0;
      advancing = false;
      hooks.onMarkRead?.();
      hooks.onSessionStart?.(devotionData);
      void advanceToPhase(0);
    },

    stop() {
      if (!active && phaseIndex < 0) return;
      endSession("stop");
    },

    async onVoiceTurnComplete() {
      if (!active || advancing) return;

      const current = DEVOTION_SESSION_PHASES[phaseIndex];
      if (!current?.voice) return;

      advancing = true;
      clearSessionTimeout();
      try {
        await hooks.waitPlaybackIdle?.();
      } catch {
        /* ignore */
      }

      if (!active) {
        advancing = false;
        return;
      }

      const stillCurrent = DEVOTION_SESSION_PHASES[phaseIndex];
      if (!stillCurrent?.voice) {
        advancing = false;
        return;
      }

      if (stillCurrent.id === "prayer" && devotion) {
        prayerSegmentCount += 1;
        const elapsedMin = (Date.now() - prayerPhaseStartMs) / 60000;
        const maxSegments = Math.max(2, Math.ceil(PRAYER_TARGET_MAX / 1.75));
        const shouldContinue =
          prayerSegmentCount < maxSegments && elapsedMin < PRAYER_TARGET_MIN - 0.15;

        if (shouldContinue) {
          advancing = false;
          armSessionTimeout();
          await new Promise((r) => setTimeout(r, 1200));
          if (!active || DEVOTION_SESSION_PHASES[phaseIndex]?.id !== "prayer") return;

          const contPrompt = buildPrayerContinuationPrompt(
            prayerSegmentCount + 1,
            elapsedMin,
            devotion,
            sessionFramework || pickReflectionFramework(),
          );
          await hooks.onSpeakPhase?.(contPrompt, stillCurrent);
          return;
        }

        try {
          await hooks.waitPlaybackIdle?.();
        } catch {
          /* ignore */
        }
        advancing = false;
        endSession("complete");
        return;
      }

      if (stillCurrent.id === "reflection" && devotion) {
        reflectionSegmentCount += 1;
        const elapsedMin = (Date.now() - reflectionPhaseStartMs) / 60000;
        const maxSegments = Math.max(4, Math.ceil(REFLECTION_TARGET_MAX / 1.75));
        const shouldContinue =
          reflectionSegmentCount < maxSegments && elapsedMin < REFLECTION_TARGET_MIN - 0.2;

        if (shouldContinue) {
          advancing = false;
          armSessionTimeout();
          await new Promise((r) => setTimeout(r, 1200));
          if (!active || DEVOTION_SESSION_PHASES[phaseIndex]?.id !== "reflection") return;

          const contPrompt = buildReflectionContinuationPrompt(
            reflectionSegmentCount + 1,
            elapsedMin,
            devotion,
            sessionFramework || pickReflectionFramework(),
            sessionLifeRef || pickLifeRealityReference(),
          );
          await hooks.onSpeakPhase?.(contPrompt, stillCurrent);
          return;
        }

        phaseIndex += 1;
        advancing = false;
        void advanceToPhase(phaseIndex);
        return;
      }

      phaseIndex += 1;
      advancing = false;
      void advanceToPhase(phaseIndex);
    },

    isActive() {
      return active;
    },

    getPhaseIndex() {
      return phaseIndex;
    },

    getDevotion() {
      return devotion;
    },

    /** @returns {string | null} */
    getCurrentPhaseId() {
      return DEVOTION_SESSION_PHASES[phaseIndex]?.id ?? null;
    },

    isInSilentPhase() {
      return active && DEVOTION_SESSION_PHASES[phaseIndex]?.id === "meditate";
    },
  };
}
