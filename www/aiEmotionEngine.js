/**
 * AI Emotion Engine — konten ayat & refleksi per perasaan (Ayat untuk Perasaanmu).
 * Gemini sekali/hari per emosi + cache lokal + fallback bank kurasi.
 */

import { apiUrl } from "./platform.js";
import { EMOTIONS } from "./homeWorshipData.js";
import { normalizeDevotionContent } from "./aiDevotionEngine.js";
import { getDailyEmotionPrologVariation } from "./dailyRenunganEngine.js";
import {
  getAiLanguageRule,
  getAiLifeContextRule,
  getPrimaryBibleLabel,
  isIndonesiaProfile,
} from "./localeProfile.js";

const EMOTION_CACHE_KEY = "rhema-ai-emotion-content";

/** @type {Record<string, { ref: string, text: string, theme: string, reflection: string, prayer: string }>} */
export const EMOTION_CONTENT_BANK = {
  sedih: {
    ref: "Mazmur 34:18",
    text: "TUHAN dekat pada orang-orang yang patah hati, dan Ia menyelamatkan orang-orang yang remuk redam.",
    theme: "Tuhan Dekat di Saat Hati Patah",
    reflection:
      "Ketika hati sedih, sering kita merasa sendirian — seolah tidak ada yang benar-benar mengerti. Mazmur ini mengingatkan: Tuhan tidak jauh di langit yang dingin; Ia dekat, bahkan pada saat kita paling rapuh. Bukan berarti rasa sakit langsung hilang, tapi ada Gembala yang duduk di samping saudara.",
    prayer:
      "Bapa, Engkau melihat air mata yang tidak sempat saudara tumpahkan. Dekatlah pada hati yang sedih ini. Segarkan jiwa saudara dengan janji-Mu. Amin.",
  },
  cemas: {
    ref: "Filipi 4:6-7",
    text: "Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur. Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.",
    theme: "Ganti Kekhawatiran dengan Doa",
    reflection:
      "Kekhawatiran sering datang tanpa undangan — tentang uang, kesehatan, masa depan anak, atau pekerjaan. Paulus tidak bilang masalahnya palsu; ia mengajak membawa semuanya ke hadirat Tuhan. Damai sejahtera bukan ketiadaan masalah, tapi jaminan bahwa hati saudara dijaga saat langkah masih berat.",
    prayer:
      "Tuhan, saudara menyerahkan kekhawatiran yang menggerogoti hati. Berikan damai sejahtera-Mu yang melampaui akal. Amin.",
  },
  syukur: {
    ref: "1 Tesalonika 5:18",
    text: "Mengucap syukurlah dalam segala hal, sebab itulah yang dikehendaki Allah di dalam Kristus Yesus bagi kamu.",
    theme: "Syukur di Tengah Apapun",
    reflection:
      "Bersyukur bukan berarti pura-pura bahagia saat hidup berat. Syukur adalah sikap hati yang sengaja melihat kebaikan Tuhan — bahkan yang kecil — di tengah apapun yang sedang saudara jalani. Satu ucapan syukur hari ini bisa membuka mata hati saudara pada kasih setia-Nya.",
    prayer:
      "Bapa, terima kasih atas kasih setia-Mu yang tidak pernah berhenti. Ajar saudara bersyukur dengan hati yang jujur. Amin.",
  },
  takut: {
    ref: "Yesaya 41:10",
    text: "Janganlah takut, sebab Aku menyertai engkau, janganlah bimbang, sebab Aku ini Allahmu; Aku akan meneguhkan, ya, Aku akan menolong engkau, Aku akan memegang engkau dengan tangan kanan-Ku yang benar.",
    theme: "Jangan Takut — Tuhan Menyertai",
    reflection:
      "Ketakutan wajar — tentang kesehatan, keputusan besar, atau masa depan yang belum jelas. Tuhan tidak mengecilkan rasa takut saudara; Ia menegaskan kehadiran-Nya. Keberanian rohani sering bukan hilangnya ketakutan, tapi langkah kecil iman sambil tetap merasakan tangan Tuhan memegang saudara.",
    prayer:
      "Tuhan, saudara mengakui ketakutan ini. Kuatkan iman saudara; pegang tangan saudara melangkah. Amin.",
  },
  lelah: {
    ref: "Matius 11:28",
    text: "Marilah kepada-Ku, semua yang letih lesu dan berbeban berat, Aku akan memberi kelegaan kepadamu.",
    theme: "Istirahat di Hadirat Tuhan",
    reflection:
      "Lelah bisa dari kerja, merawat keluarga, atau beban yang tidak terlihat orang lain. Yesus tidak bilang saudara harus lebih kuat — Ia mengundang datang. Istirahat rohani bukan kemalasan; itu perlindungan jiwa yang terlalu lama berlari tanpa henti.",
    prayer:
      "Tuhan Yesus, saudara datang lelah dan terbebani. Berikan kelegaan pada jiwa saudara hari ini. Amin.",
  },
  marah: {
    ref: "Efesus 4:26",
    text: "Apabila kamu marah, janganlah berdosa dan janganlah matahari terbenam, sebelum padam amarahmu.",
    theme: "Marah yang Dibawa ke Tuhan",
    reflection:
      "Marah bukan selalu dosa — terkadang itu sinyal bahwa sesuatu tidak adil atau hati terluka. Alkitab mengajak saudara tidak membiarkan amarah mengendalikan hidup. Bawa kemarahan ke hadirat Tuhan sebelum malam tiba; biarkan Dia menyejukkan hati yang memanas.",
    prayer:
      "Bapa, saudara menyerahkan amarah dan luka di baliknya. Tenangkan hati saudara; ajari saudara damai. Amin.",
  },
  "putus-asa": {
    ref: "Roma 8:28",
    text: "Kita tahu sekarang, bahwa Allah turut bekerja dalam segala sesuatu untuk mendatangkan kebaikan bagi mereka yang mengasihi Dia, yaitu bagi mereka yang terpanggil sesuai dengan rencana Allah.",
    theme: "Harapan di Balik Keputusasaan",
    reflection:
      "Putus asa terasa seperti dinding tebal — seolah tidak ada jalan keluar. Roma 8:28 bukan janji bahwa semua mudah, tapi keyakinan bahwa Tuhan tetap bekerja bahkan saat saudara tidak melihat hasilnya. Harapan rohani sering datang perlahan, seperti fajar yang belum terang tapi sudah pasti.",
    prayer:
      "Tuhan, saudara percaya Engkau masih bekerja meski malam terasa panjang. Pulihkan pengharapan saudara. Amin.",
  },
  bahagia: {
    ref: "Mazmur 118:24",
    text: "Inilah hari yang dijadikan TUHAN, marilah kita bersorak-sorai dan bergembira karena itu!",
    theme: "Bersyukur untuk Hari yang Diberikan",
    reflection:
      "Kebahagiaan adalah anugerah — dan layak diucap syukur. Mazmur ini mengajak saudara tidak hanya menikmati hari baik, tapi mengakui bahwa setiap hari adalah pemberian Tuhan. Biarkan sukacita hari ini menguatkan iman saudara untuk hari-hari berat yang mungkin datang.",
    prayer:
      "Bapa, terima kasih untuk sukacita hari ini. Biarkan syukur saudara memuliakan nama-Mu. Amin.",
  },
};

function attachDailyEmotionProlog(content, emotionId) {
  const daily = getDailyEmotionPrologVariation(emotionId);
  return {
    ...content,
    openingValidate: daily.validatePhrase,
    openingInvite: daily.invitePhrase,
    dailyAngle: daily.dailyAngle,
    dailyProlog: daily,
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {typeof EMOTIONS[number]} emotion
 * @param {"local" | "gemini"} source
 */
function buildEmotionContent(emotion, source = "local") {
  const bank = EMOTION_CONTENT_BANK[emotion.id] || EMOTION_CONTENT_BANK.sedih;
  return normalizeDevotionContent(
    {
      theme: bank.theme,
      verse: { reference: bank.ref || emotion.ref, text: bank.text },
      reflection: bank.reflection,
      guidedPrayer: bank.prayer,
      tags: [emotion.label, "Emosi"],
    },
    {
      id: `emotion-${emotion.id}-${todayKey()}`,
      dateKey: todayKey(),
      formattedDate: emotion.label,
      source,
    },
  );
}

/**
 * @param {string} emotionId
 * @param {string} topicPrompt
 */
async function fetchEmotionFromApi(emotionId, topicPrompt) {
  const res = await fetch(apiUrl("/api/gemini/generate-devotion"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: topicPrompt }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.success || !data.result) return null;
  return normalizeDevotionContent(
    {
      theme: data.result.theme,
      verse: { reference: data.result.passage, text: data.result.verseText },
      reflection: data.result.reflection,
      practicalAction: data.result.practicalAction,
      guidedPrayer: data.result.guidedPrayer,
      tags: data.result.tags || [emotionId],
    },
    { id: `emotion-${emotionId}-${todayKey()}`, dateKey: todayKey(), source: "gemini" },
  );
}

/**
 * @param {string} emotionId
 * @returns {Promise<{ content: object, emotion: typeof EMOTIONS[number] } | null>}
 */
export async function getEmotionContent(emotionId) {
  const emotion = EMOTIONS.find((e) => e.id === emotionId);
  if (!emotion) return null;

  const cacheKey = `${EMOTION_CACHE_KEY}-${emotionId}`;
  const today = todayKey();

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached?.content?.dateKey === today) {
      return { content: attachDailyEmotionProlog(cached.content, emotionId), emotion };
    }
  } catch {
    /* ignore */
  }

  const topicPrompt = isIndonesiaProfile()
    ? `Ayat penghiburan Alkitab TB/LAI untuk perasaan ${emotion.label.toLowerCase()}: ${emotion.prompt}. Refleksi hangat ke hidup nyata Indonesia kontemporer — minimal 1–2 analogi konkret yang menyentuh (pekerjaan, keluarga, kesehatan, keuangan). Bahasa sehari-hari, bukan khotbah. Doa penghiburan spesifik dari perasaan ini, bukan template generik.`
    : `Comforting Scripture (${getPrimaryBibleLabel()}) for feeling ${emotion.label.toLowerCase()}: ${emotion.prompt}. ${getAiLanguageRule()} ${getAiLifeContextRule()} Include 1–2 concrete illustrations. Specific prayer for this feeling, not a generic template.`;

  try {
    const generated = await fetchEmotionFromApi(emotionId, topicPrompt);
    if (generated) {
      const withDaily = attachDailyEmotionProlog(generated, emotionId);
      localStorage.setItem(cacheKey, JSON.stringify({ content: withDaily, emotionId }));
      return { content: withDaily, emotion };
    }
  } catch (err) {
    console.warn("[aiEmotionEngine] Gemini fallback:", err);
  }

  const content = attachDailyEmotionProlog(buildEmotionContent(emotion, "local"), emotionId);
  localStorage.setItem(cacheKey, JSON.stringify({ content, emotionId }));
  return { content, emotion };
}

/** @param {string} emotionId */
export function getEmotionMeta(emotionId) {
  return EMOTIONS.find((e) => e.id === emotionId) || null;
}

/** Konteks sapaan empati per emosi — untuk prolog sesi suara. */
export const EMOTION_VOICE_CONTEXT = {
  sedih: {
    validatePhrase: "Hati sedih itu valid — Tuhan tidak mengecilkan air mata saudara.",
    invitePhrase: "Biarkan firman-Nya datang lembut, seperti pelukan yang tidak terburu-buru.",
  },
  cemas: {
    validatePhrase: "Kekhawatiran sering datang tanpa undangan — saudara tidak sendirian.",
    invitePhrase: "Mari bawa beban pikiran ini ke hadirat Tuhan, sedikit demi sedikit.",
  },
  syukur: {
    validatePhrase: "Syukur yang jujur — bahkan di hari yang campur aduk — indah di mata Tuhan.",
    invitePhrase: "Biarkan firman menguatkan rasa syukur saudara hari ini.",
  },
  takut: {
    validatePhrase: "Takut itu manusiawi — Tuhan tidak marah karena saudara merasa lemah.",
    invitePhrase: "Dengarkan janji-Nya yang meneguhkan langkah saudara.",
  },
  lelah: {
    validatePhrase: "Lelah bukan berarti saudara gagal — tubuh dan jiwa butuh istirahat.",
    invitePhrase: "Undang kelegaan dari Tuhan yang memanggil yang letih.",
  },
  marah: {
    validatePhrase: "Marah sering menutupi luka — Tuhan melihat yang di balik amarah itu.",
    invitePhrase: "Bawa hati yang memanas ke hadirat-Nya yang menyejukkan.",
  },
  "putus-asa": {
    validatePhrase: "Putus asa terasa seperti dinding tebal — tapi Tuhan masih ada di baliknya.",
    invitePhrase: "Biarkan secercah harapan masuk lewat firman-Nya.",
  },
  bahagia: {
    validatePhrase: "Sukacita hari ini adalah anugerah — layak disyukuri dengan hati terbuka.",
    invitePhrase: "Biarkan firman mengakar syukur saudara lebih dalam.",
  },
};

/**
 * @param {{ id: string, label: string, emoji: string }} emotion
 */
export function getEmotionVoiceContext(emotion) {
  return (
    EMOTION_VOICE_CONTEXT[emotion.id] || {
      validatePhrase: `Perasaan ${emotion.label.toLowerCase()} saudara layak diakui dengan jujur.`,
      invitePhrase: "Biarkan firman Tuhan menemui hati saudara lewat ayat penghiburan ini.",
    }
  );
}
