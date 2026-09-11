/**
 * Dataset Rencana Baca Tematik, Kuis Alkitab Harian & Kategori Doa
 */

export { THEMATIC_READING_PLANS } from "./thematicPlanEngine.js";

/** Jumlah soal yang ditampilkan per hari (rotasi dari pool). */
export const DAILY_QUIZ_COUNT = 3;

/** Pool lengkap — digabung dari kuis Beranda + trivia legacy (deduplikasi). */
export const BIBLE_QUIZ_POOL = [
  {
    id: "q1",
    question: "Menurut Yohanes 14:6, siapakah Jalan, Kebenaran, dan Hidup?",
    options: ["Yesus Kristus", "Musa", "Yohanes Pembaptis", "Nabi Yesaya"],
    correctIndex: 0,
    verseRef: "Yohanes 14:6",
    explanation: "Kata Yesus kepadanya: 'Akulah jalan dan kebenaran dan hidup. Tidak ada seorangpun yang datang kepada Bapa, kalau tidak melalui Aku.'",
  },
  {
    id: "q2",
    question: "Di manakah tertulis ayat: 'TUHAN adalah gembalaku, takkan kekurangan aku'?",
    options: ["Kejadian 1:1", "Mazmur 23:1", "Wahyu 22:20", "Matius 5:1"],
    correctIndex: 1,
    verseRef: "Mazmur 23:1",
    explanation: "Mazmur 23 adalah mazmur Daud yang terkenal mengenai pemeliharaan dan penggembalaan TUHAN yang setia.",
  },
  {
    id: "q3",
    question: "Apa buah Roh yang pertama disebutkan dalam Galatia 5:22-23?",
    options: ["Damai sejahtera", "Kasih", "Sukacita", "Kesabaran"],
    correctIndex: 1,
    verseRef: "Galatia 5:22",
    explanation: "Tetapi buah Roh ialah: kasih, sukacita, damai sejahtera, kesabaran, kemurahan, kebaikan, kesetiaan.",
  },
  {
    id: "q4",
    question: "Berapa jumlah kitab dalam Alkitab Protestan secara keseluruhan?",
    options: ["60 Kitab", "66 Kitab", "73 Kitab", "52 Kitab"],
    correctIndex: 1,
    verseRef: "Kanon Alkitab",
    explanation: "Alkitab terdiri dari 66 kitab: 39 Perjanjian Lama dan 27 Perjanjian Baru.",
  },
  {
    id: "q5",
    question: "Siapakah yang memimpin bangsa Israel menyeberangi Sungai Yordan menuju Tanah Perjanjian?",
    options: ["Yosua", "Musa", "Harun", "Kaleb"],
    correctIndex: 0,
    verseRef: "Yosua 1:1-2",
    explanation: "Setelah Musa wafat, TUHAN mengangkat Yosua bin Nun untuk memimpin umat Israel menyeberangi Yordan.",
  },
  {
    id: "q6",
    question: "Siapakah nabi yang diangkat ke surga dalam angin badai dengan kereta berapi?",
    options: ["Elia", "Elisa", "Yesaya", "Yeremia"],
    correctIndex: 0,
    verseRef: "2 Raja-raja 2:11",
    explanation: "Elia terangkat ke surga dalam angin badai saat kereta berapi dan kuda berapi memisahkan dia dan Elisa.",
  },
  {
    id: "q7",
    question: "Di kota manakah Yesus mengadakan mukjizat pertama-Nya mengubah air menjadi anggur?",
    options: ["Nazaret", "Kapernaum", "Kana di Galilea", "Yerusalem"],
    correctIndex: 2,
    verseRef: "Yohanes 2:1-11",
    explanation: "Mukjizat pertama Yesus dilakukan pada sebuah pesta pernikahan di Kana, Galilea.",
  },
  {
    id: "q8",
    question: "Berapa lama bangsa Israel mengembara di padang gurun sebelum masuk Tanah Kanaan?",
    options: ["7 tahun", "12 tahun", "40 tahun", "70 tahun"],
    correctIndex: 2,
    verseRef: "Bilangan 14:33-34",
    explanation: "Bangsa Israel mengembara selama 40 tahun sesuai jumlah hari pengintaian tanah Kanaan.",
  },
  {
    id: "q9",
    question: "Siapakah penulis sebagian besar Mazmur di dalam Alkitab?",
    options: ["Raja Salomo", "Raja Daud", "Musa", "Asaf"],
    correctIndex: 1,
    verseRef: "Kitab Mazmur",
    explanation: "Raja Daud menggubah setidaknya 73 mazmur yang sarat dengan doa, pujian, dan nubuat mesianik.",
  },
  {
    id: "q10",
    question: "Siapakah murid yang menggantikan Yudas Iskariot sebagai rasul?",
    options: ["Barnabas", "Matius", "Matias", "Timotius"],
    correctIndex: 2,
    verseRef: "Kisah Para Rasul 1:26",
    explanation: "Matias terpilih melalui undian setelah doa bersama para rasul untuk melengkapi kedua belas rasul.",
  },
];

/** @deprecated Gunakan getDailyQuizQuestions() dari dailyQuizEngine.js */
export const DAILY_BIBLE_QUIZ = BIBLE_QUIZ_POOL;

export const PRAYER_CATEGORIES = [
  { id: "keluarga", name: "Keluarga & Rumah Tangga", icon: "🏡" },
  { id: "kesehatan", name: "Kesehatan & Kesembuhan", icon: "🩺" },
  { id: "pekerjaan", name: "Pekerjaan, Studi & Usaha", icon: "💼" },
  { id: "rohani", name: "Pertumbuhan Rohani & Pelayanan", icon: "🕊️" },
  { id: "syukur", name: "Ucapan Syukur & Pujian", icon: "🙌" },
];
