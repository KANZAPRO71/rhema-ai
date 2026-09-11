/**
 * AI Devotion Engine — Mesin Generator Renungan Harian Cerdas & Tematik bertenaga AI.
 */

import { apiUrl } from "./platform.js";

const AI_DEVOTION_CACHE_KEY = "rhema-ai-daily-devotion";

export const DEVOTION_TOPIC_TEMPLATES = [
  { id: "damai", label: "🌿 Damai & Ketenangan Jiwa", prompt: "Damai sejahtera Kristus di tengah kekuatiran hidup" },
  { id: "kekuatan", label: "🦅 Kekuatan & Pemulihan", prompt: "Mendapat kekuatan baru saat lelah dan tertekan" },
  { id: "hikmat", label: "👑 Hikmat & Keputusan Hidup", prompt: "Memohon petunjuk Tuhan dalam pekerjaan dan studi" },
  { id: "kasih", label: "❤️ Kasih & Pengampunan", prompt: "Memulihkan hubungan keluarga dan melepaskan pengampunan" },
  { id: "syukur", label: "🙌 Ucapan Syukur & Berkat", prompt: "Melihat kebaikan dan penyertaan Tuhan setiap hari" },
  { id: "iman", label: "✝️ Iman & Pengharapan", prompt: "Percaya janji Allah ketika jalan belum terlihat" },
];

export const SCRIPTURE_BANK = [
  {
    ref: "Yesaya 40:31",
    text: "Tetapi orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang naik terbang dengan kekuatan sayapnya; mereka berlari dan tidak menjadi lesu, mereka berjalan dan tidak menjadi lelah.",
    theme: "Kekuatan yang Tak Pernah Pudar",
    reflection: "Dalam perjalanan hidup, seringkali kita merasa kehabisan energi fisik dan emosional. Namun firman Tuhan mengingatkan bahwa sumber kekuatan sejati bukan berasal dari daya tahan manusiawi kita, melainkan dari sikap hati yang menanti-nantikan Tuhan. Menanti bukan berarti pasif, melainkan meletakkan kepercayaan penuh bahwa Tuhan sedang bekerja.",
    action: "Luangkan 3 menit untuk berdiam di hadirat Tuhan, hembuskan kekuatiranmu dan undang Roh Kudus memperbaharui jiwamu.",
    prayer: "Bapa surgawi, ketika tubuh dan jiwaku lelah, kuatkanlah aku dengan kuasa Roh Kudus-Mu. Ajar aku untuk senantiasa bersandar pada pemeliharaan-Mu. Amin.",
    tags: ["Kekuatan", "Pengharapan", "Pemulihan"],
  },
  {
    ref: "Roma 8:28",
    text: "Kita tahu sekarang, bahwa Allah turut bekerja dalam segala sesuatu untuk mendatangkan kebaikan bagi mereka yang mengasihi Dia, yaitu bagi mereka yang terpanggil sesuai dengan rencana Allah.",
    theme: "Rancangan Kebaikan di Balik Segala Hal",
    reflection: "Tidak ada peristiwa yang terjadi secara kebetulan dalam hidup orang percaya. Bahkan di tengah situasi yang tampaknya membingungkan atau mengecewakan, Allah merajut setiap benang kehidupan kita menjadi sebuah karya agung yang mendatangkan kebaikan dan kemuliaan bagi nama-Nya.",
    action: "Tuliskan satu hal yang saat ini terasa berat, lalu serahkan kepada Tuhan dengan iman bahwa Ia sedang merajut kebaikan.",
    prayer: "Tuhan Yesus, terima kasih karena Engkau memegang kendali atas seluruh jalan hidupku. Aku percaya tidak ada rencana-Mu yang gagal. Di dalam nama-Mu aku berdoa. Amin.",
    tags: ["Rencana Allah", "Iman", "Kebaikan"],
  },
  {
    ref: "Filipi 4:6-7",
    text: "Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur. Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.",
    theme: "Kunci Damai Sejahtera yang Sempurna",
    reflection: "Kekuatiran adalah pencuri sukacita yang paling halus. Paulus memberikan formula ilahi: ganti kekuatiran dengan doa yang disertai rasa syukur. Saat kita bersyukur atas apa yang telah Tuhan perbuat, iman kita bangkit untuk mempercayai apa yang akan Tuhan selesaikan.",
    action: "Setiap kali kekuatiran muncul hari ini, ubahlah menjadi satu kalimat doa dan ucapan syukur singkat.",
    prayer: "Ya Tuhan, aku menyerahkan segala kecemasan dan bebanku ke dalam tangan-Mu. Berikanlah damai sejahtera-Mu yang melampaui akal menjaga hati dan pikiranku hari ini. Amin.",
    tags: ["Damai", "Doa", "Ketenangan"],
  },
  {
    ref: "Mazmur 23:1-3",
    text: "TUHAN adalah gembalaku, takkan kekurangan aku. Ia membaringkan aku di padang yang berumput hijau, Ia membimbing aku ke air yang tenang; Ia menyegarkan jiwaku.",
    theme: "Gembala yang Setia Menuntun Langkah",
    reflection: "Seekor domba tidak perlu memikirkan ke mana arah rumput hijau berikutnya; ia hanya perlu tetap dekat dengan sang Gembala. Demikian pula hidup kita: ketika kita hidup dekat dengan Kristus, kita tidak akan pernah kekurangan kasih karunia, perlindungan, dan kesegaran jiwa.",
    action: "Nikmati saat teduh hari ini dengan menyadari bahwa Tuhan sedang menjaga dan memelihara seluruh keluargamu.",
    prayer: "Gembala yang baik, bimbinglah langkah kakiku hari ini. Segarkanlah jiwaku dan bawalah aku selalu dalam naungan hadirat-Mu yang kudus. Amin.",
    tags: ["Pemeliharaan", "Damai", "Mazmur"],
  },
  {
    ref: "Amsal 3:5-6",
    text: "Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri. Akuilah Dia dalam segala lakumu, maka Ia akan meluruskan jalanmu.",
    theme: "Menyerahkan Kemudi Hidup kepada Tuhan",
    reflection: "Akal dan pengalaman kita terbatas, tetapi hikmat Tuhan tidak terbatas. Menyerahkan kemudi hidup kepada Tuhan berarti melibatkan Dia dalam setiap keputusan kecil maupun besar, baik dalam pekerjaan, keluarga, maupun masa depan.",
    action: "Sebelum mengambil keputusan penting hari ini, ucapkan doa: 'Tuhan, pimpin aku dengan hikmat-Mu.'",
    prayer: "Bapa, aku melepaskan kebiasaanku mengandalkan kekuatanku sendiri. Penuhilah aku dengan hikmat surgawi dan luruskanlah setiap langkah hidupku. Amin.",
    tags: ["Hikmat", "Petunjuk", "Integritas"],
  },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formattedDateId() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** @returns {{ id: string, prompt: string, label: string }} */
export function pickDailyTopic() {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return DEVOTION_TOPIC_TEMPLATES[dayIndex % DEVOTION_TOPIC_TEMPLATES.length];
}

/**
 * @param {typeof SCRIPTURE_BANK[number]} base
 * @param {string} dateKey
 * @param {"local" | "gemini"} source
 */
function buildDevotionFromScripture(base, dateKey, source = "local") {
  return {
    id: "devotion-" + dateKey,
    dateKey,
    formattedDate: formattedDateId(),
    theme: base.theme,
    verse: { reference: base.ref, text: base.text },
    reflection: base.reflection,
    practicalAction: base.action,
    guidedPrayer: base.prayer,
    tags: base.tags,
    source,
  };
}

/**
 * @param {object | null | undefined} raw
 * @param {Partial<{ id: string, dateKey: string, formattedDate: string, source: "local" | "gemini" }>} meta
 * @returns {object | null}
 */
export function normalizeDevotionContent(raw, meta = {}) {
  if (!raw || typeof raw !== "object") return null;

  const verseText = String(raw.verse?.text || raw.text || raw.verseText || "").trim();
  const verseRef = String(raw.verse?.reference || raw.reference || raw.passage || "").trim();
  const reflection = String(raw.reflection || "").trim();
  const theme = String(raw.theme || "").trim();

  if (!theme && !verseText && !reflection) return null;

  return {
    id: meta.id || raw.id || "devotion-" + todayKey(),
    dateKey: meta.dateKey || raw.dateKey || todayKey(),
    formattedDate: meta.formattedDate || raw.formattedDate || formattedDateId(),
    theme: theme || "Firman Saat Teduh Hari Ini",
    verse: { reference: verseRef || "Alkitab TB", text: verseText },
    reflection,
    practicalAction: String(raw.practicalAction || raw.action || "").trim(),
    guidedPrayer: String(raw.guidedPrayer || raw.prayer || "").trim(),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    source: meta.source || raw.source || "gemini",
  };
}

/**
 * @param {object} r
 * @param {string} topicPrompt
 * @param {string} formattedDate
 * @param {"local" | "gemini"} source
 */
function buildDevotionFromApiResult(r, topicPrompt, formattedDate) {
  return normalizeDevotionContent(
    {
      theme: r.theme || `Renungan: ${topicPrompt}`,
      verse: { reference: r.passage, text: r.verseText },
      reflection: r.reflection,
      practicalAction: r.practicalAction,
      guidedPrayer: r.guidedPrayer,
      tags: r.tags || [topicPrompt],
    },
    { id: "devotion-" + todayKey(), dateKey: todayKey(), formattedDate, source: "gemini" },
  );
}

/**
 * @param {string} topicPrompt
 * @returns {Promise<object | null>}
 */
async function fetchDevotionFromApi(topicPrompt) {
  const res = await fetch(apiUrl("/api/gemini/generate-devotion"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: topicPrompt }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.success || !data.result) return null;
  return data.result;
}

/**
 * Mengambil renungan hari ini — Gemini sekali/hari, cache lokal, fallback offline.
 */
export async function getTodayAIDevotion() {
  const today = todayKey();

  try {
    const cached = JSON.parse(localStorage.getItem(AI_DEVOTION_CACHE_KEY) || "null");
    if (cached && cached.dateKey === today) {
      return cached;
    }
  } catch {
    /* ignore */
  }

  const topic = pickDailyTopic();
  const dayIndex = Math.floor(Date.now() / 86_400_000);

  try {
    const result = await fetchDevotionFromApi(topic.prompt);
    if (result) {
      const devotion = buildDevotionFromApiResult(result, topic.prompt, formattedDateId());
      if (devotion) {
        localStorage.setItem(AI_DEVOTION_CACHE_KEY, JSON.stringify(devotion));
        return devotion;
      }
    }
  } catch (err) {
    console.warn("[aiDevotionEngine] Gemini daily generate fallback:", err);
  }

  const base = SCRIPTURE_BANK[dayIndex % SCRIPTURE_BANK.length];
  const devotion = buildDevotionFromScripture(base, today, "local");
  localStorage.setItem(AI_DEVOTION_CACHE_KEY, JSON.stringify(devotion));
  return devotion;
}

/**
 * Menghasilkan renungan tematik khusus secara dinamis bertenaga Gemini AI.
 * @param {string} topicPrompt
 * @returns {Promise<object>}
 */
export async function generateCustomAIDevotion(topicPrompt) {
  try {
    const result = await fetchDevotionFromApi(topicPrompt);
    if (result) {
      const devotion = buildDevotionFromApiResult(result, topicPrompt, "Renungan Tematik Khusus");
      if (devotion) {
        return { ...devotion, id: "custom-" + Date.now() };
      }
    }
  } catch (err) {
    console.warn("[aiDevotionEngine] Gemini custom generate fallback:", err);
  }

  const matching =
    SCRIPTURE_BANK.find(
      (s) =>
        s.tags.some((t) => topicPrompt.toLowerCase().includes(t.toLowerCase())) ||
        s.theme.toLowerCase().includes(topicPrompt.toLowerCase()),
    ) || SCRIPTURE_BANK[Math.floor(Math.random() * SCRIPTURE_BANK.length)];

  return {
    id: "custom-" + Date.now(),
    dateKey: todayKey(),
    formattedDate: "Renungan Tematik Khusus",
    theme: `Tema: ${matching.theme}`,
    verse: { reference: matching.ref, text: matching.text },
    reflection: `[Fokus: ${topicPrompt}] ${matching.reflection}`,
    practicalAction: matching.action,
    guidedPrayer: matching.prayer,
    tags: matching.tags,
    source: "local",
  };
}
