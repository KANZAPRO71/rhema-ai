/**
 * Mood Scripture Engine — rotasi ayat harian per perasaan (tab Alkitab).
 * Terpisah dari aiEmotionEngine / Renungan. Deterministik per hari: sama seharian, berganti besok.
 */

/** @returns {string} */
export function moodTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** @param {string} salt @param {number} poolLength */
function moodDailyPickIndex(salt, poolLength) {
  if (poolLength <= 0) return 0;
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const key = `${moodTodayKey()}::${salt}`;
  let hash = dayIndex;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % poolLength;
}

/** @template T @param {T[]} pool @param {string} salt @returns {T} */
function pickDailyMoodEntry(pool, salt) {
  return pool[moodDailyPickIndex(salt, pool.length)];
}

/** @type {Array<{ id: string, emoji: string, label: string }>} */
export const MOOD_CHIPS = [
  { id: "cemas", emoji: "🌿", label: "Cemas & Gelisah" },
  { id: "lelah", emoji: "⚡", label: "Letih & Lelah Jiwa" },
  { id: "syukur", emoji: "🌟", label: "Penuh Syukur & Sukacita" },
  { id: "takut", emoji: "🛡️", label: "Takut Masa Depan" },
  { id: "duka", emoji: "💔", label: "Sedih & Patah Hati" },
  { id: "arah", emoji: "🧭", label: "Butuh Petunjuk Arah" },
  { id: "bersalah", emoji: "🕊️", label: "Rasa Bersalah / Dosa" },
];

/**
 * @typedef {{ title: string, verse: string, text: string, devotion: string }} MoodScriptureEntry
 */

/** @type {Record<string, MoodScriptureEntry[]>} */
export const MOOD_SCRIPTURE_BANK = {
  cemas: [
    {
      title: "Damai Sejahtera Melampaui Akal",
      verse: "Filipi 4:6-7",
      text: "Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur. Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.",
      devotion: "Tuhan tahu detak jantungmu saat cemas. Serahkan seluruh beban pikiranmu kepada-Nya sekarang, sebab Ia yang memeliharamu.",
    },
    {
      title: "Serahkan Segala Kekhawatiran kepada-Nya",
      verse: "1 Petrus 5:7",
      text: "Serahkanlah segala kekuatiranmu kepada-Nya, sebab Dia yang memelihara kamu.",
      devotion: "Kekhawatiran terasa berat karena saudara memikulnya sendirian. Tuhan mengundang saudara meletakkan beban itu di kaki-Nya — satu langkah kejujuran sudah cukup untuk memulai.",
    },
    {
      title: "Tuhan Menjaga Langkahmu",
      verse: "Mazmur 55:22",
      text: "Serahkanlah dirimu kepada TUHAN, biarlah Dia yang memelihara kamu; Ia tidak akan membiarkan orang benar goyah.",
      devotion: "Saat pikiran berputar di malam hari, ingat: Tuhan tidak tidur dan tidak lupa saudara. Firman-Nya meneguhkan langkah hari esok.",
    },
    {
      title: "Ketenangan dalam Kehendak Tuhan",
      verse: "Yesaya 26:3",
      text: "Engkau akan menjaga dalam damai sejahtera orang yang teguh hatinya, sebab ia percaya kepada-Mu.",
      devotion: "Damai sejahtera datang bukan karena masalah hilang, tapi karena hati saudara berlabuh pada Tuhan yang setia.",
    },
  ],
  lelah: [
    {
      title: "Kekuatan Baru Bagi yang Letih",
      verse: "Matius 11:28",
      text: "Marilah kepada-Ku, semua yang letih lesu dan berbeban berat, Aku akan memberi kelegaan kepadamu.",
      devotion: "Ketika tenagamu habis, anugerah Tuhan justru bekerja paling sempurna. Datanglah dan beristirahatlah di dalam hadirat-Nya.",
    },
    {
      title: "Kekuatan Baru untuk yang Penat",
      verse: "Yesaya 40:31",
      text: "Tetapi orang-orang yang menanti-nantikan TUHAN, mendapat kekuatan baru: mereka seolah-olah mendapat sayap seperti rajawali, mereka lari dan tidak lesu, mereka berjalan dan tidak lelah.",
      devotion: "Letih bukan tanda lemah iman — kadang tubuh dan jiwa butuh istirahat di hadirat Sang Pencipta. Tuhan menyegarkan saudara dari dalam.",
    },
    {
      title: "TUHAN Gembala yang Menuntun",
      verse: "Mazmur 23:1-3",
      text: "TUHAN adalah gembalaku, takkan kekurangan aku. Ia membaringkan aku di padang yang berumput hijau, Ia membimbing aku ke air yang tenang; Ia menyegarkan jiwaku.",
      devotion: "Di tengah kesibukan yang tidak berujung, Tuhan mengundang saudara berbaring sejenak di padang hijau-Nya — tempat jiwa diperbarui.",
    },
    {
      title: "Kasih Karunia Cukup di Kelemahan",
      verse: "2 Korintus 12:9",
      text: "Tetapi firman-Nya kepadaku: Cukuplah kasih karunia-Ku bagimu, sebab justru di dalam kelemahanmu, kekuatan-Ku menjadi sempurna.",
      devotion: "Saudara tidak perlu pura-pura kuat. Tuhan bekerja paling nyata ketika saudara jujur: aku lelah, dan aku butuh Engkau.",
    },
  ],
  syukur: [
    {
      title: "Pujilah Tuhan, Hai Jiwaku!",
      verse: "Mazmur 103:1-2",
      text: "Pujilah TUHAN, hai jiwaku! Pujilah nama-Nya yang kudus, hai segenap batinku! Pujilah TUHAN, hai jiwaku, dan janganlah lupakan segala kebaikan-Nya!",
      devotion: "Mengingat satu per satu kebaikan Tuhan akan melipatgandakan sukacita dan damai di dalam hidupmu hari ini.",
    },
    {
      title: "Masuklah dengan Nyanyian Syukur",
      verse: "Mazmur 100:4",
      text: "Masuklah ke pintu gerbang-Nya dengan nyanyian syukur, ke pelataran-Nya dengan pujian, bersyukurlah kepada-Nya, berkati lah nama-Nya!",
      devotion: "Syukur membuka mata hati — saudara mulai melihat berkat yang selama ini terlewat di tengah rutinitas.",
    },
    {
      title: "Damai Sejahtera Memerintah",
      verse: "Kolose 3:15",
      text: "Hendaklah damai sejahtera Kristus yang memerintah dalam hatimu, karena untuk itulah kamu telah dipanggil, dan hendaklah kamu saling mengasihi.",
      devotion: "Sukacita rohani bukan mood sementara — itu damai Kristus yang merajai hati saudara, bahkan saat hari tidak sempurna.",
    },
    {
      title: "Bersyukur dalam Segala Hal",
      verse: "1 Tesalonika 5:18",
      text: "Mengucap syukurlah dalam segala hal, sebab itulah yang dikehendaki Allah di dalam Kristus Yesus bagi kamu.",
      devotion: "Syukur hari ini bisa sederhana: satu hal kecil yang Tuhan berikan — nafas, keluarga, atau kesempatan bertumbuh.",
    },
  ],
  takut: [
    {
      title: "Tuhan Besertamu Selalu",
      verse: "Yesaya 41:10",
      text: "Janganlah takut, sebab Aku menyertai engkau, janganlah bimbang, sebab Aku ini Allahmu; Aku akan meneguhkan, bahkan akan menolong engkau; Aku akan memegang engkau dengan tangan kanan-Ku yang membawa kemenangan.",
      devotion: "Masa depanmu tidak berada di tangan keberuntungan, melainkan di dalam genggaman tangan Tuhan yang penuh kasih setia.",
    },
    {
      title: "TUHAN Penjagaku",
      verse: "Mazmur 27:1",
      text: "TUHAN adalah terangku dan keselamatanku, kepada siapakah aku takut? TUHAN adalah benteng hidupku, kepada siapakah aku gentar?",
      devotion: "Ketakutan sering membesar di kegelapan. Firman Tuhan menyalakan terang — saudara tidak melangkah sendirian.",
    },
    {
      title: "Kuat dan Teguh Hati",
      verse: "Yosua 1:9",
      text: "Bukankah telah Kuperintahkan kepadamu: kuatkan dan teguhkanlah hatimu? Janganlah kecut dan tawar hati, sebab TUHAN, Allahmu, menyertai engkau, ke manapun engkau pergi.",
      devotion: "Langkah baru — pekerjaan, pindah rumah, atau keputusan besar — terasa menakutkan. Tuhan sudah berjanji menyertai setiap langkah.",
    },
    {
      title: "Roh Keteguhan dan Kasih",
      verse: "2 Timotius 1:7",
      text: "Sebab Allah memberikan kepada kita roh, bukan roh ketakutan, melainkan roh yang membangun kekuatan, kasih, dan ketertiban.",
      devotion: "Allah tidak memberi saudara roh takut — Ia memberi kekuatan untuk melangkah, kasih untuk bertahan, dan akal sehat untuk memilih dengan bijak.",
    },
  ],
  duka: [
    {
      title: "Tuhan Dekat pada yang Remuk Hati",
      verse: "Mazmur 34:19",
      text: "TUHAN itu dekat kepada orang-orang yang patah hati, dan Ia menyelamatkan orang-orang yang remuk jiwanya.",
      devotion: "Air matamu tidak pernah jatuh sia-sia. Tuhan menampungnya dan membalut luka hatimu dengan penghiburan Roh Kudus.",
    },
    {
      title: "Ia Menyembuhkan yang Remuk Hati",
      verse: "Mazmur 147:3",
      text: "Ia menyembuhkan yang remuk hati dan membebat luka-luka mereka.",
      devotion: "Penyembuhan hati tidak selalu instan — tapi Tuhan setia duduk di samping saudara di setiap malam yang panjang.",
    },
    {
      title: "Penghiburan bagi yang Berdukacita",
      verse: "2 Korintus 1:3-4",
      text: "Terpujilah Allah, Bapa Tuhan kita Yesus Kristus, Bapa yang penuh kasih sayang dan Allah sumber segala penghiburan, yang menghiburkan kita dalam segala penderitaan kita.",
      devotion: "Duka saudara valid. Tuhan tidak meminta saudara pura-pura kuat — Ia datang sebagai Bapa yang memeluk.",
    },
    {
      title: "Harapan bagi yang Berkabung",
      verse: "Matius 5:4",
      text: "Berbahagialah orang yang berdukacita, karena mereka akan dihibur.",
      devotion: "Yesus memberkati yang berduka — bukan karena duka baik, tapi karena Tuhan menjanjikan penghiburan yang nyata di waktu-Nya.",
    },
  ],
  arah: [
    {
      title: "Percaya Sepenuh Hati pada Tuhan",
      verse: "Amsal 3:5-6",
      text: "Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri. Akuilah Dia dalam segala lakumu, maka Ia akan meluruskan jalanmu.",
      devotion: "Saat jalan di depan tampak buntu, jangan andalkan logika semata. Dengarkan bisikan Roh Kudus yang menuntun langkahmu.",
    },
    {
      title: "Tuhan Menuntun Langkahmu",
      verse: "Mazmur 32:8",
      text: "Aku mau mengajar dan menuntun kamu ke jalan yang harus kautempuh; Aku mau memberi nasihat, mata-Ku tertimpa kepadamu.",
      devotion: "Saudara tidak perlu melihat seluruh peta — cukup langkah berikutnya yang Tuhan terangi hari ini.",
    },
    {
      title: "Rencana Tuhan yang Penuh Harapan",
      verse: "Yeremia 29:11",
      text: "Sebab Aku tahu rencana-rencana-Ku yang ada tentang kamu, demikianlah firman TUHAN, rencana damai sejahtera dan bukan rencana kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan.",
      devotion: "Ketika arah hidup terasa kabur, ingat: Tuhan sedang menulis rencana damai sejahtera — bukan untuk menghancurkan saudara.",
    },
    {
      title: "Hidup yang Diselaraskan dengan Kehendak Tuhan",
      verse: "Roma 12:2",
      text: "Janganlah kamu menjadi serupa dengan dunia ini, melainkan berubahlah oleh pembaharuan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: yang baik, yang berkenan kepada Allah dan yang sempurna.",
      devotion: "Petunjuk sering datang lewat pembaharuan pikiran — bukan selalu jawaban instan, tapi hati yang semakin selaras dengan Tuhan.",
    },
  ],
  bersalah: [
    {
      title: "Pengampunan & Pembasuhan Dosa",
      verse: "1 Yohanes 1:9",
      text: "Jika kita mengaku dosa kita, maka Ia adalah setia dan adil, sehingga Ia akan mengampuni segala dosa kita dan menyucikan kita dari segala kejahatan.",
      devotion: "Kasih karunia Kristus jauh lebih besar daripada masa lalumu. Bangkitlah kembali, engkau telah ditebus dan dikuduskan.",
    },
    {
      title: "Hati yang Baru dan Roh yang Teguh",
      verse: "Mazmur 51:10",
      text: "Ciptakanlah padaku hati yang bersih, ya Allah, dan perbaruilah roh di dalam jiwaku!",
      devotion: "Pengakuan jujur membuka pintu pembaruan. Tuhan tidak menolak saudara — Ia siap memberi hati yang baru.",
    },
    {
      title: "Dosa Diampuni, Seperti Salju",
      verse: "Yesaya 1:18",
      text: "Marilah, baik-baiklah perkarakan, firman TUHAN; sekalipun dosamu merah seperti kirmizi, akan menjadi putih seperti salju.",
      devotion: "Rasa bersalah bisa terasa permanen — firman Tuhan menegaskan: pengampunan-Nya lebih kuat dari masa lalu saudara.",
    },
    {
      title: "Tiada Penghukuman bagi yang di Kristus",
      verse: "Roma 8:1",
      text: "Demikianlah sekarang tidak ada lagi penghukuman bagi mereka yang ada di dalam Kristus Yesus.",
      devotion: "Di dalam Kristus, saudara bukan lagi didefinisikan oleh kesalahan terbesar — saudara didefinisikan oleh kasih karunia-Nya.",
    },
  ],
};

/**
 * Ayat firman harian untuk satu perasaan — sama seharian, berganti besok.
 * @param {string} moodId
 * @returns {({ id: string, emoji: string, label: string, title: string, verse: string, text: string, devotion: string, dateKey: string, poolSize: number, variationIndex: number } | null)}
 */
export function getDailyMoodScripture(moodId) {
  const meta = MOOD_CHIPS.find((m) => m.id === moodId);
  const pool = MOOD_SCRIPTURE_BANK[moodId];
  if (!meta || !pool?.length) return null;

  const salt = `alkitab-mood-${moodId}`;
  const variationIndex = moodDailyPickIndex(salt, pool.length);
  const entry = pool[variationIndex];

  return {
    ...meta,
    ...entry,
    dateKey: moodTodayKey(),
    poolSize: pool.length,
    variationIndex,
  };
}

/** @returns {typeof MOOD_CHIPS} */
export function listMoodChips() {
  return MOOD_CHIPS;
}
