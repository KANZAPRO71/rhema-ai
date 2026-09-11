/**
 * AI Daily Story Engine — Mesin Pembangkit Cerita Rohani Harian Interaktif Berbasis AI (Multi-Slide Story Generator).
 */

export const STORY_THEME_TEMPLATES = [
  { id: "peace", label: "🌿 Ketenangan Batin & Damai Sejahtera", scriptureRef: "Filipi 4:6-7" },
  { id: "strength", label: "⚡ Kekuatan dalam Kelemahan", scriptureRef: "Yesaya 40:31" },
  { id: "wisdom", label: "👑 Hikmat Hidup & Keputusan", scriptureRef: "Amsal 3:5-6" },
  { id: "love", label: "❤️ Kasih Kristus yang Memulihkan", scriptureRef: "1 Korintus 13:4-8" },
  { id: "faith", label: "🔥 Iman Menghadapi Gunung Masalah", scriptureRef: "Markus 11:23-24" },
  { id: "hope", label: "🌈 Pengharapan Masa Depan Gemilang", scriptureRef: "Yeremia 29:11" },
  { id: "protection", label: "🛡️ Perlindungan Naungan Yang Mahatinggi", scriptureRef: "Mazmur 91:1-2" },
  { id: "gratitude", label: "🌻 Ucapan Syukur & Berkat Melimpah", scriptureRef: "Mazmur 103:1-5" },
];

export const AI_STORY_REPOSITORY = [
  {
    id: "story-day-0",
    theme: "Kekuatan Sayap Rajawali",
    badge: "Pemulihan Jiwa",
    gradient: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)",
    verse: {
      reference: "Yesaya 40:31",
      text: "Tetapi orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang naik terbang dengan kekuatan sayapnya; mereka berlari dan tidak menjadi lesu, mereka berjalan dan tidak menjadi lelah.",
      version: "Terjemahan Baru (LAI)",
    },
    reflection: {
      headline: "Bukan Berjuang Sendiri, Melainkan Melayang Bersama Roh Kudus",
      body: "Burung rajawali tidak mengepakkan sayapnya terus-menerus saat badai datang. Ia membentangkan sayapnya dan memanfaatkan pusaran angin badai untuk melambung lebih tinggi di atas awan gelap. Begitu pula hidupmu saat menanti-nantikan Tuhan: serahkan letihmu, biarkan anugerah-Nya mengangkatmu melampaui segala pergumulan.",
      takeaway: "Ketika kekuatan fisikmu habis, kekuatan supranatural Tuhan baru saja dimulai.",
    },
    interactivePoll: {
      question: "Di area mana Anda paling membutuhkan kekuatan baru dari Tuhan hari ini?",
      options: [
        { text: "🕊️ Ketenangan hati dari rasa cemas", votes: 45 },
        { text: "💪 Stamina & energi menyelesaikan pekerjaan", votes: 32 },
        { text: "❤️ Kasih & kesabaran menghadapi sesama", votes: 23 },
      ],
    },
    blessing: {
      title: "Lencana Iman: Rajawali Tangguh",
      icon: "🦅",
      confession: "Aku tidak berjalan dengan kekuatanku sendiri. Hari ini, Roh Kudus memberikan aku sayap kemenangan.",
      prayer: "Tuhan Yesus, aku meletakkan segala keletihan dan kekuatiranku di hadapan-Mu. Pulihkan jiwaku, beri aku kekuatan sayap rajawali untuk terbang melampaui setiap ujian hari ini. Di dalam nama Yesus. Amin.",
    },
  },
  {
    id: "story-day-1",
    theme: "Damai yang Melampaui Segala Akal",
    badge: "Ketenangan Jiwa",
    gradient: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #ec4899 100%)",
    verse: {
      reference: "Filipi 4:6-7",
      text: "Janganlah hendaknya kamu kuatir tentang apa pun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur. Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.",
      version: "Terjemahan Baru (LAI)",
    },
    reflection: {
      headline: "Tukarkan Kekuatiranmu dengan Hadirat Damai Sejahtera",
      body: "Kekuatiran tidak pernah menyelesaikan masalah esok hari; ia hanya menguras kekuatanmu hari ini. Rumus Alkitabiah sangat jelas: saat rasa takut mengetuk pintu hatimu, jawablah dengan doa dan ucapan syukur. Damai sejahtera Allah akan bertindak seperti benteng penjaga bagi pikiranmu.",
      takeaway: "Damai sejati bukan ketiadaan masalah, melainkan kehadiran Kristus di tengah masalah.",
    },
    interactivePoll: {
      question: "Langkah apa yang akan Anda ambil begitu rasa kuatir muncul?",
      options: [
        { text: "🙏 Langsung berbisik doa singkat: 'Yesus, kupegang janji-Mu'", votes: 52 },
        { text: "📖 Membuka 1 ayat Alkitab dan merenungkannya", votes: 28 },
        { text: "🎵 Memutar lagu pujian dan memuji Tuhan", votes: 20 },
      ],
    },
    blessing: {
      title: "Lencana Damai: Benteng Kristus",
      icon: "🕊️",
      confession: "Damai sejahtera Kristus memerintah penuh atas hati dan pikiranku hari ini.",
      prayer: "Bapa surgawi, aku menolak rasa kuatir menguasai hariku. Aku percaya Engkau tahu persis apa yang kubutuhkan sebelum aku memintanya. Penuhilah batinku dengan damai sejahtera-Mu. Di dalam nama Tuhan Yesus. Amin.",
    },
  },
  {
    id: "story-day-2",
    theme: "Gembala yang Setia dan Menyediakan",
    badge: "Pemeliharaan Abadi",
    gradient: "linear-gradient(135deg, #065f46 0%, #10b981 50%, #84cc16 100%)",
    verse: {
      reference: "Mazmur 23:1",
      text: "TUHAN adalah gembalaku, takkan kekurangan aku.",
      version: "Terjemahan Baru (LAI)",
    },
    reflection: {
      headline: "Kamu Tidak Pernah Dibiarkan Berjalan Sendiri",
      body: "Sang Gembala Agung mengenal nama setiap domba-Nya. Dia tahu rumput hijau yang paling segar untuk jiwamu dan air tenang yang menyegarkan dahagamu. Bahkan ketika jalan hidupmu melintasi lembah yang gelap, gada dan tongkat-Nya selalu siap melindungimu.",
      takeaway: "Jika Tuhan adalah Gembalamu, maka masa depanmu berada di tangan yang paling aman di alam semesta.",
    },
    interactivePoll: {
      question: "Apa bentuk pemeliharaan Tuhan yang paling Anda syukuri belakangan ini?",
      options: [
        { text: "🩺 Kesehatan dan napas hidup keluarga", votes: 48 },
        { text: "💼 Berkat kecukupan rezeki sehari-hari", votes: 34 },
        { text: "🛡️ Perlindungan dari marabahaya yang tak terlihat", votes: 18 },
      ],
    },
    blessing: {
      title: "Lencana Berkat: Naungan Gembala",
      icon: "🌿",
      confession: "Tuhan adalah Gembalaku yang setia. Kebaikan dan kemurahan-Nya mengikutiku seumur hidupku.",
      prayer: "Tuhan Yesus, terima kasih karena Engkau adalah Gembala yang memelihara hidupku dengan sempurna. Bimbinglah setiap keputusanku hari ini ke padang rumput berkat-Mu. Amin.",
    },
  },
  {
    id: "story-day-3",
    theme: "Rancangan Hari Depan yang Gemilang",
    badge: "Masa Depan & Harapan",
    gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fcd34d 100%)",
    verse: {
      reference: "Yeremia 29:11",
      text: "Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan.",
      version: "Terjemahan Baru (LAI)",
    },
    reflection: {
      headline: "Kisah Hidupmu Ditulis oleh Tangan Kasih Allah",
      body: "Mungkin saat ini kamu merasa rencanamu berantakan atau tertunda. Namun ketahuilah, Allah tidak pernah kehabisan rencana cadangan. Rancangan Allah bagimu selalu berujung pada damai sejahtera dan masa depan yang berkemenangan.",
      takeaway: "Jangan menilai keseluruhan cerita hidupmu hanya dari satu babak yang sulit.",
    },
    interactivePoll: {
      question: "Bagaimana Anda menyikapi rencana yang belum terjawab?",
      options: [
        { text: "⏳ Tetap percaya bahwa waktu Tuhan adalah yang terbaik", votes: 58 },
        { text: "🙏 Minta hikmat untuk melangkah setahap demi setahap", votes: 27 },
        { text: "🙌 Mengucap syukur atas apa yang sudah ada", votes: 15 },
      ],
    },
    blessing: {
      title: "Lencana Harapan: Masa Depan Emas",
      icon: "🌟",
      confession: "Hari depanku penuh dengan pengharapan karena Allah yang setia merancangnya bagiku.",
      prayer: "Bapa di surga, aku meletakkan seluruh cita-cita, keluarga, dan pekerjaanku ke dalam tangan-Mu. Tuntun aku menyongsong masa depan dengan iman yang teguh. Di dalam nama Yesus. Amin.",
    },
  },
];

/**
 * Mengambil story rohani AI harian berdasarkan kalender hari ini.
 */
export async function getTodayAIDailyStory() {
  const dayIndex = new Date().getDay() % AI_STORY_REPOSITORY.length;
  return AI_STORY_REPOSITORY[dayIndex] || AI_STORY_REPOSITORY[0];
}

/**
 * Menghasilkan story AI kustom secara dinamis berdasarkan topik permohonan pengguna.
 */
export async function generateCustomAIDailyStory(topicPrompt) {
  const match = STORY_THEME_TEMPLATES.find((t) =>
    t.label.toLowerCase().includes((topicPrompt || "").toLowerCase()) ||
    t.id.toLowerCase() === (topicPrompt || "").toLowerCase()
  );

  const themeLabel = match ? match.label : topicPrompt || "Damai & Pengharapan";
  const ref = match ? match.scriptureRef : "Roma 8:28";

  return {
    id: "custom-story-" + Date.now(),
    theme: themeLabel.replace(/[^\w\s&]/g, "").trim(),
    badge: "AI Generated Story",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #06b6d4 100%)",
    verse: {
      reference: ref,
      text: `Allah turut bekerja dalam segala sesuatu untuk mendatangkan kebaikan bagi mereka yang mengasihi Dia (${ref}).`,
      version: "Terjemahan Baru (LAI)",
    },
    reflection: {
      headline: `Pesan Khusus AI Mengenai ${themeLabel}`,
      body: `Di dalam setiap musim kehidupanmu, Allah senantiasa membuka jalan di mana tiada jalan. Firman Tuhan pada ${ref} mengingatkan bahwa kuasa-Nya bekerja melampaui keterbatasan logika manusia. Peganglah firman ini sepanjang hari.`,
      takeaway: "Setiap langkah kecil yang diambil dalam iman bernilai kekal di hadapan Tuhan.",
    },
    interactivePoll: {
      question: `Apa respon komitmen imanmu mengenai ${themeLabel}?`,
      options: [
        { text: "🙏 Mengambil waktu saat teduh khusus hari ini", votes: 60 },
        { text: "🤝 Membagikan berkat firman ini kepada seorang sahabat", votes: 25 },
        { text: "❤️ Melatih hati untuk senantiasa bersyukur", votes: 15 },
      ],
    },
    blessing: {
      title: "Lencana Khusus: Kemenangan Iman",
      icon: "👑",
      confession: `Aku percaya firman Tuhan mengenai ${themeLabel} digenapi secara nyata dalam hidupku.`,
      prayer: `Tuhan Yesus, terima kasih atas berkat firman-Mu hari ini. Teguhkan imanku, penuhi hatiku dengan kuasa Roh Kudus. Di dalam nama Yesus. Amin.`,
    },
  };
}
