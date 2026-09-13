/**
 * Daily Renungan Engine — koordinator variasi harian untuk 3 lapisan renungan.
 * Setiap hari (dateKey) menghasilkan konteks berbeda — prolog, fokus doa, sudut hidup.
 * Deterministik per hari: user yang sama dapat variasi sama seharian, baru lagi besok.
 */

import { detectDeviceSignals, getDevotionTimezone } from "./localeProfile.js";

/** @returns {string} YYYY-MM-DD di zona perangkat (bukan UTC). */
export function todayKey() {
  const tz = detectDeviceSignals().timezone || getDevotionTimezone() || "Asia/Jakarta";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}

/** @returns {number} */
export function dayIndex() {
  return Math.floor(Date.now() / 86_400_000);
}

/**
 * Indeks deterministik harian dari salt + tanggal.
 * @param {string} salt
 * @param {number} poolLength
 */
export function dailyPickIndex(salt, poolLength) {
  if (poolLength <= 0) return 0;
  const key = `${todayKey()}::${salt}`;
  let hash = dayIndex();
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % poolLength;
}

/** @template T @param {T[]} pool @param {string} salt @returns {T} */
export function pickDailyFromPool(pool, salt) {
  return pool[dailyPickIndex(salt, pool.length)];
}

/** @type {Record<string, Array<{ validate: string, invite: string, focus: string, scenario: string, theme: string }>>} */
export const GUIDED_PRAYER_DAILY_BANK = {
  pagi: [
    {
      theme: "Syukur untuk nafas pagi pertama",
      validate: "Pagi ini mungkin masih terasa berat — tapi hari baru tetap anugerah.",
      invite: "Biarkan syukur kecil jadi langkah pertama sebelum segalanya bergerak.",
      focus: "syukur atas tidur malam, penyerahan urusan hari ini, hikmat langkah pertama",
      scenario: "bangun dan langsung cek ponsel sebelum sempat berdoa",
    },
    {
      theme: "Menyerahkan agenda yang menumpuk",
      validate: "Daftar tugas hari ini mungkin sudah menunggu di kepala saudara.",
      invite: "Serahkan dulu daftar itu ke Tuhan sebelum saudara mulai berlari.",
      focus: "prioritas yang benar, kekuatan di tengah kesibukan, damai sebelum berangkat",
      scenario: "berangkat kerja atau antar anak sambil pikiran masih penuh",
    },
    {
      theme: "Harapan segar di awal minggu",
      validate: "Mungkin minggu lalu meninggalkan bekas — pagi ini kesempatan memulai lagi.",
      invite: "Biarkan pengharapan Tuhan masuk sebelum rutinitas menguasai hari.",
      focus: "pengharapan baru, perlindungan perjalanan, kasih karunia di tempat kerja",
      scenario: "memulai hari dengan rasa lelah dari minggu sebelumnya",
    },
    {
      theme: "Kekuatan sebelum langkah besar",
      validate: "Ada keputusan atau pertemuan penting hari ini — wajar hati sedikit deg-degan.",
      invite: "Bawa keputusan itu ke hadirat Tuhan sebelum saudara melangkah.",
      focus: "hikmat keputusan, keberanian lembut, penuntunan Roh Kudus",
      scenario: "presentasi, wawancara, atau percakapan sulit yang menanti",
    },
    {
      theme: "Syukur atas perlindungan malam",
      validate: "Tuhan menjaga saudara semalaman — bahkan saat saudara tidak sadar.",
      invite: "Ucapkan syukur sederhana sebelum hari yang belum saudara ketahui.",
      focus: "syukur perlindungan, berkat keluarga, damai di perjalanan",
      scenario: "keluarga masih tidur dan saudara punya momen tenang sejenak",
    },
    {
      theme: "Damai sebelum kesibukan",
      validate: "Dunia luar akan segera menarik perhatian saudara ke segala arah.",
      invite: "Isi hati dengan damai Tuhan dulu — sebelum notifikasi menguasai pagi.",
      focus: "damai sejahtera, fokus rohani, kekuatan dari firman",
      scenario: "notifikasi kerja dan chat yang sudah menumpuk semalaman",
    },
    {
      theme: "Menyegarkan jiwa yang kering",
      validate: "Jiwa terkadang kering meski tubuh sudah bangun.",
      invite: "Biarkan pagi ini jadi minum rohani sebelum saudara haus di tengah hari.",
      focus: "kesegaran rohani, kehadiran Tuhan, sukacita dalam pelayanan",
      scenario: "rutinitas yang terasa monoton dan hati yang mulai apatis",
    },
    {
      theme: "Membawa keluarga dalam doa pagi",
      validate: "Orang-orang tercinta saudara akan menjalani hari mereka sendiri.",
      invite: "Doakan mereka sebelum saudara berpisah — itu bentuk kasih yang sungguh.",
      focus: "perlindungan keluarga, kasih di rumah, hikmat anak dan pasangan",
      scenario: "suami/istri atau anak yang akan berangkat ke sekolah atau kantor",
    },
    {
      theme: "Syukur di tengah kekhawatiran",
      validate: "Kekhawatiran pagi sering datang lebih dulu dari secangkir kopi.",
      invite: "Ganti satu kekhawatiran dengan satu ucapan syukur kecil hari ini.",
      focus: "mengganti kekuatiran dengan doa, penyerahan, pengharapan praktis",
      scenario: "tagihan, kesehatan, atau masa depan yang terasa dekat",
    },
    {
      theme: "Memanggil kekuatan dari Tuhan",
      validate: "Saudara tidak harus kuat sendiri sebelum hari dimulai.",
      invite: "Minta kekuatan dari sumber yang tidak pernah habis.",
      focus: "kekuatan baru, ketahanan rohani, iman langkah demi langkah",
      scenario: "tubuh lelah tapi hari tetap harus dijalani",
    },
    {
      theme: "Menyembah sebelum bekerja",
      validate: "Pekerjaan adalah panggilan — tapi Tuhan lebih dulu dari pekerjaan.",
      invite: "Mulai hari dengan mengakui Tuhan, bukan mengakui deadline.",
      focus: "integritas di tempat kerja, berkat tangan, kerendahan hati",
      scenario: "target kerja yang menekan dan rekan yang sulit",
    },
    {
      theme: "Pagi penuh anugerah tersembunyi",
      validate: "Anugerah Tuhan sering datang dalam hal kecil yang terlewat.",
      invite: "Buka mata hati untuk melihat kebaikan-Nya hari ini.",
      focus: "syukur hal kecil, kesadaran hadirat Tuhan, sukacita sederhana",
      scenario: "cuaca cerah, kesehatan cukup, atau makan di meja pagi",
    },
    {
      theme: "Penyerahan yang jujur",
      validate: "Tidak semua hari terasa siap — dan itu tidak masalah.",
      invite: "Serahkan hari yang belum sempurna ini dengan jujur ke tangan Tuhan.",
      focus: "kejujuran hati, penyerahan, kasih karunia cukup untuk hari ini",
      scenario: "tidur kurang atau mood pagi yang tidak ideal",
    },
    {
      theme: "Berjalan bersama Tuhan sepanjang hari",
      validate: "Doa pagi bukan titik akhir — tapi awal perjalanan bersama Tuhan.",
      invite: "Minta Tuhan menyertai setiap jam yang akan saudara jalani.",
      focus: "penyertaan Tuhan, kewaspadaan rohani, doa tanpa henti",
      scenario: "jadwal padat dari pagi sampai sore",
    },
  ],
  malam: [
    {
      theme: "Syukur menutup hari",
      validate: "Hari ini mungkin tidak sempurna — tapi Tuhan tetap setia.",
      invite: "Ucapkan syukur sebelum saudara meletakkan kepala.",
      focus: "syukur hari ini, pengampunan kekhilafan, damai tidur",
      scenario: "lelah setelah berbagai urusan seharian",
    },
    {
      theme: "Melepaskan beban pikiran",
      validate: "Pikiran masih berputar — wajar setelah hari yang panjang.",
      invite: "Serahkan pikiran yang berisik ke Tuhan yang tidak pernah tidur.",
      focus: "ketenangan, penyerahan kekhawatiran, damai sejahtera tidur",
      scenario: "masalah kerja atau keluarga yang masih terngiang",
    },
    {
      theme: "Pengampunan sebelum tidur",
      validate: "Mungkin ada kata atau sikap hari ini yang saudara sesali.",
      invite: "Biarkan anugerah Tuhan membersihkan hati sebelum malam.",
      focus: "pengampunan diri, rekonsiliasi, damai dengan Tuhan",
      scenario: "konflik kecil dengan pasangan, rekan, atau anak",
    },
    {
      theme: "Perlindungan malam",
      validate: "Malam datang — saudara tidak perlu menjaga diri sendiri.",
      invite: "Serahkan tidur saudara dan keluarga ke perlindungan Tuhan.",
      focus: "perlindungan malam, berkat tidur, penjagaan malaikat",
      scenario: "khawatir tentang besok atau keamanan keluarga",
    },
    {
      theme: "Refleksi lembut atas hari ini",
      validate: "Tuhan hadir di momen-momen kecil yang saudara lupa syukuri.",
      invite: "Renungkan satu kebaikan Tuhan hari ini sebelum saudara tidur.",
      focus: "syukur reflektif, pembelajaran hari ini, pengharapan besok",
      scenario: "hari yang campur aduk — ada suka dan ada duka",
    },
    {
      theme: "Damai untuk jiwa gelisah",
      validate: "Gelisah malam sering terasa lebih besar dari siang.",
      invite: "Biarkan damai Kristus menutup hari yang berat ini.",
      focus: "damai sejahtera, penghiburan, penyerahan total",
      scenario: "cemas tentang uang, kesehatan, atau masa depan",
    },
    {
      theme: "Doa untuk keluarga yang tidur",
      validate: "Orang-orang tercinta sudah atau akan tidur — saudara bisa mendoakan mereka.",
      invite: "Tutup hari dengan doa perlindungan atas rumah tangga saudara.",
      focus: "berkat keluarga, kasih di rumah, keselamatan malam",
      scenario: "anak kecil atau orang tua yang sudah beristirahat",
    },
    {
      theme: "Menyerahkan esok hari",
      validate: "Besok belum datang — saudara tidak perlu membawanya malam ini.",
      invite: "Letakkan besok di tangan Tuhan; tidurlah dengan tenang.",
      focus: "penyerahan masa depan, istirahat rohani, kepercayaan",
      scenario: "deadline atau janji penting besok pagi",
    },
    {
      theme: "Healing setelah hari berat",
      validate: "Hari ini mungkin meninggalkan luka — Tuhan melihat semuanya.",
      invite: "Biarkan Tuhan menyejukkan hati sebelum saudara tidur.",
      focus: "penyembuhan emosional, penghiburan, kekuatan pagi nanti",
      scenario: "bad news, kekecewaan, atau kelelahan emosional",
    },
    {
      theme: "Syukur di tengah kekurangan",
      validate: "Mungkin ada yang belum tercapai hari ini — tapi Tuhan tetap baik.",
      invite: "Syukuri satu hal kecil sebelum saudara menutup mata.",
      focus: "syukur jujur, pengharapan, kasih setia Tuhan",
      scenario: "rasa gagal atau target yang belum tercapai",
    },
    {
      theme: "Istirahat yang layak",
      validate: "Tubuh saudara butuh istirahat — itu bukan kemalasan.",
      invite: "Terima istirahat sebagai anugerah, bukan hukuman.",
      focus: "istirahat rohani dan fisik, pemulihan, grace",
      scenario: "overwork atau tidur terlalu malam beberapa hari",
    },
    {
      theme: "Komitmen setia Tuhan",
      validate: "Tuhan setia sepanjang hari — meski saudara sempat lupa.",
      invite: "Akhiri hari dengan mengakui kasih setia-Nya.",
      focus: "kasih setia, penyesuaian diri, relasi dengan Tuhan",
      scenario: "rasa bersalah karena sempat jauh dari Tuhan hari ini",
    },
    {
      theme: "Penghiburan untuk yang sendirian",
      validate: "Malam terasa sunyi — tapi saudara tidak sendirian di hadirat Tuhan.",
      invite: "Biarkan kehadiran Tuhan menemani saudara malam ini.",
      focus: "penyertaan Tuhan, penghiburan, keintiman rohani",
      scenario: "tinggal sendiri atau merasa tidak dimengerti",
    },
    {
      theme: "Persiapan jiwa untuk besok",
      validate: "Besok adalah halaman baru — Tuhan sudah menulis rencana-Nya.",
      invite: "Istirahat dengan pengharapan, bukan dengan kekhawatiran.",
      focus: "pengharapan, persiapan rohani, damai proaktif",
      scenario: "minggu kerja baru atau hari penting yang menanti",
    },
  ],
  keluarga: [
    {
      theme: "Kesatuan di tengah perbedaan",
      validate: "Keluarga punya karakter berbeda — itu normal, bukan kegagalan.",
      invite: "Doakan kesatuan yang dibangun kasih, bukan paksaan.",
      focus: "kesatuan, pengertian, komunikasi lembut",
      scenario: "perbedaan pendapat antar anggota keluarga",
    },
    {
      theme: "Kasih yang sabar",
      validate: "Kasih keluarga sering diuji oleh hal-hal kecil yang berulang.",
      invite: "Minta Tuhan menguatkan sabar dan lembut hati saudara.",
      focus: "sabar, pengampunan, kasih praktis",
      scenario: "konflik rutin soal pekerjaan rumah atau jadwal",
    },
    {
      theme: "Perlindungan rumah tangga",
      validate: "Rumah saudara layak dilindungi — fisik dan rohani.",
      invite: "Doakan pagar rohani di sekeliling keluarga saudara.",
      focus: "perlindungan, kesehatan keluarga, keamanan",
      scenario: "khawatir kesehatan anak atau orang tua",
    },
    {
      theme: "Menjauhkan jarak hati",
      validate: "Kadang jarak bukan soal ruang — tapi soal hati yang jarang bicara.",
      invite: "Doakan jembatan komunikasi yang sehat di keluarga.",
      focus: "kedekatan emosional, waktu berkualitas, pengertian",
      scenario: "anak remaja atau pasangan yang jarang curhat",
    },
    {
      theme: "Berkat generasi berikutnya",
      validate: "Anak-anak menyerap lebih dari yang saudara katakan.",
      invite: "Doakan iman dan karakter generasi berikutnya.",
      focus: "anak, pendidikan iman, teladan hidup",
      scenario: "anak di sekolah atau pergantian tahap hidup",
    },
    {
      theme: "Kelelahan mengasuh",
      validate: "Mengasuh keluarga melelahkan — Tuhan melihat lelah saudara.",
      invite: "Minta kekuatan dan kebijaksanaan untuk peran saudara di rumah.",
      focus: "kekuatan orang tua, hikmat mendidik, istirahat",
      scenario: "mengurus anak kecil atau orang tua lanjut usia",
    },
    {
      theme: "Reconciliation di rumah",
      validate: "Ada luka yang mungkin belum sempat dibicarakan.",
      invite: "Doakan kesembuhan hubungan yang retak di keluarga.",
      focus: "rekonsiliasi, pengampunan, dialog jujur",
      scenario: "diam-diaman atau kesalahpahaman yang menumpuk",
    },
    {
      theme: "Keuangan keluarga",
      validate: "Tekanan keuangan sering masuk ke rumah tanpa permisi.",
      invite: "Serahkan kebutuhan keluarga ke Tuhan yang memelihara.",
      focus: "kecukupan, hikmat keuangan, damai di rumah",
      scenario: "biaya sekolah, tagihan, atau incaran pekerjaan",
    },
    {
      theme: "Peran suami/istri/orang tua",
      validate: "Peran di keluarga berat — saudara tidak harus sempurna.",
      invite: "Minta Tuhan mengisi kekurangan saudara sebagai anggota keluarga.",
      focus: "panggilan keluarga, kasih sacrificial, kerendahan hati",
      scenario: "tekanan menjadi provider atau caregiver",
    },
    {
      theme: "Sukacita di rumah",
      validate: "Rumah yang damai adalah anugerah — layak dijaga.",
      invite: "Doakan sukacita dan tawa kembali ke rumah saudara.",
      focus: "sukacita keluarga, humor sehat, kedamaian",
      scenario: "atmosfer rumah yang tegang beberapa waktu",
    },
    {
      theme: "Mendoakan pasangan",
      validate: "Pasangan saudara punya beban sendiri yang mungkin tidak terlihat.",
      invite: "Doakan pasangan dengan spesifik — bukan generik.",
      focus: "pernikahan, kasih, komunikasi pasangan",
      scenario: "pasangan lelah kerja atau jarak emosional",
    },
    {
      theme: "Keluarga besar dan kerabat",
      validate: "Ikatan keluarga luas punya dinamika sendiri.",
      invite: "Doakan hubungan dengan orang tua, mertua, atau saudara.",
      focus: "kerabat, respect, batas sehat",
      scenario: "gathering keluarga atau urusan warisan/adat",
    },
    {
      theme: "Anak yang sedang berjuang",
      validate: "Anak saudara mungkin sedang berjuang di luar pandangan saudara.",
      invite: "Doakan perlindungan dan hikmat untuk anak-anak.",
      focus: "perlindungan anak, persahabatan sehat, iman muda",
      scenario: "anak di lingkungan sekolah yang challenging",
    },
    {
      theme: "Rumah sebagai tempat ibadah",
      validate: "Rumah bisa jadi altar kecil — tempat Tuhan dihormati.",
      invite: "Doakan rumah saudara jadi tempat kasih dan kebenaran.",
      focus: "ibadah keluarga, firman di rumah, altar keluarga",
      scenario: "rindu memulai doa bersama keluarga",
    },
  ],
  stres: [
    {
      theme: "Menarik napas rohani",
      validate: "Stres membuat napas jadi dangkal — jiwa ikut sesak.",
      invite: "Ambil napas rohani sejenak; Tuhan ada di sini.",
      focus: "ketenangan, napas doa, penyerahan beban",
      scenario: "deadline menekan atau inbox yang overflow",
    },
    {
      theme: "Beban yang terlalu berat",
      validate: "Saudara membawa terlalu banyak — wajar tubuh dan jiwa protes.",
      invite: "Letakkan sebagian beban ke tangan Tuhan yang kuat.",
      focus: "penyerahan, kelegaan, batas sehat",
      scenario: "multi-tasking berlebihan atau overtime",
    },
    {
      theme: "Ketakutan akan masa depan",
      validate: "Yang belum terjadi sering lebih menakutkan dari yang sudah.",
      invite: "Bawa ketakutan masa depan ke Tuhan yang sudah ada di sana.",
      focus: "pengharapan, iman, satu langkah demi langkah",
      scenario: "PHK, bisnis sulit, atau kesehatan yang diragukan",
    },
    {
      theme: "Tuhan di tengah badai",
      validate: "Badai belum reda — tapi Tuhan tidak hilang dari perahu saudara.",
      invite: "Doa jujur dari tengah badai — Tuhan sanggup mendengar.",
      focus: "penghiburan, iman di ujian, keteguhan",
      scenario: "krisis mendadak atau berita buruk",
    },
    {
      theme: "Istirahat yang saudara butuhkan",
      validate: "Saudara mungkin sudah lama tidak benar-benar istirahat.",
      invite: "Minta Tuhan memberi istirahat yang saudara butuhkan.",
      focus: "istirahat, recovery, grace untuk diri sendiri",
      scenario: "burnout atau insomnia karena stres",
    },
    {
      theme: "Damai yang melampaui akal",
      validate: "Solusi manusiawi belum terlihat — damai Tuhan tetap bisa datang.",
      invite: "Minta damai sejahtera yang tidak tergantung situasi.",
      focus: "damai sejahtera, Filipi 4:6-7, penyerahan",
      scenario: "masalah yang belum ada solusinya",
    },
    {
      theme: "Kekuatan di lemah",
      validate: "Lemah bukan aib — justru tempat kuasa Tuhan bekerja.",
      invite: "Doa dari kelemahan saudara — Tuhan mendengar.",
      focus: "kuat di lemah, anugerah cukup, iman kecil",
      scenario: "rasa tidak sanggup melanjutkan",
    },
    {
      theme: "Stres finansial",
      validate: "Uang sering jadi sumber stres terbesar — Tuhan tahu kebutuhan saudara.",
      invite: "Serahkan kekhawatiran keuangan dengan jujur.",
      focus: "kecukupan, hikmat keuangan, percaya pemeliharaan",
      scenario: "hutang, gaji tertunda, atau biaya mendadak",
    },
    {
      theme: "Tekanan dari orang sekitar",
      validate: "Ekspektasi orang lain bisa terasa seperti dinding.",
      invite: "Bebasakan hati saudara dari tekanan yang bukan dari Tuhan.",
      focus: "identitas di Kristus, batas sehat, kebebasan",
      scenario: "bos, in-law, atau perbandingan di media sosial",
    },
    {
      theme: "Kesehatan jiwa dan tubuh",
      validate: "Stres lama mempengaruhi tubuh — saudara layak dijaga.",
      invite: "Doa untuk kesembuhan jiwa dan tubuh saudara.",
      focus: "kesehatan, pemulihan, dokter dan Tuhan",
      scenario: "sakit kepala, insomnia, atau anxiety fisik",
    },
    {
      theme: "Menyerahkan kontrol",
      validate: "Saudara tidak bisa mengontrol semuanya — dan itu bukan kegagalan.",
      invite: "Lepaskan kontrol ilusi; pegang tangan Tuhan.",
      focus: "penyerahan, trust, ketenangan",
      scenario: "rencana yang gagal atau orang yang tidak bisa saudara ubah",
    },
    {
      theme: "Ayat penghiburan hari ini",
      validate: "Firman Tuhan hidup — bisa menembus stres saudara hari ini.",
      invite: "Biarkan satu janji Tuhan menemani doa saudara.",
      focus: "janji Alkitab, penghiburan firman, iman aktif",
      scenario: "butuh jangkar rohani saat semuanya goyah",
    },
    {
      theme: "Teman dalam kesepian stres",
      validate: "Stres terasa sendirian — Tuhan menemani saudara.",
      invite: "Ceritakan beban saudara pada Tuhan yang mendengar.",
      focus: "penyertaan, curhat jujur, penghiburan",
      scenario: "tidak punya tempat curhat manusiawi",
    },
    {
      theme: "Harapan setelah badai",
      validate: "Badai tidak selamanya — Tuhan menulis epilog.",
      invite: "Doa dengan pengharapan bahwa pagi akan datang.",
      focus: "pengharapan, pemulihan, masa depan di tangan Tuhan",
      scenario: "ujian yang sudah lama dan belum berakhir",
    },
  ],
};

/** @type {Record<string, Array<{ validate: string, invite: string, angle: string }>>} */
export const EMOTION_DAILY_PROLOG_BANK = {
  sedih: [
    { validate: "Air mata yang saudara tahan juga didengar Tuhan.", invite: "Biarkan firman datang lembut ke hati yang sedih.", angle: "pelukan rohani yang tidak terburu-buru" },
    { validate: "Sedih bukan tanda iman lemah — hati manusiawi saja.", invite: "Diam sejenak; biarkan Tuhan mendekat dulu.", angle: "Tuhan dekat pada yang patah hati" },
    { validate: "Saudara tidak perlu pura-pura kuat di hadirat Tuhan.", invite: "Bawa kejujuran hati sebelum ayat dibacakan.", angle: "kejujuran sebagai ibadah" },
    { validate: "Luka lama atau baru — Tuhan tidak lelah mendengar.", invite: "Undang penghiburan-Nya masuk perlahan.", angle: "penyembuhan yang tidak instan tapi nyata" },
    { validate: "Kesepian terasa nyata — Tuhan tidak absen.", invite: "Biarkan satu ayat jadi teman saudara hari ini.", angle: "firman sebagai teman setia" },
    { validate: "Hati yang remuk layak dihormati, bukan disalahkan.", invite: "Rasakan kasih Tuhan sebelum saudara melanjutkan hari.", angle: "validasi tanpa menghakimi" },
    { validate: "Tuhan melihat yang tidak sempat saudara ceritakan.", invite: "Biarkan Dia berbicara lewat firman ini.", angle: "Allah yang melihat tersembunyi" },
  ],
  cemas: [
    { validate: "Pikiran yang berlarian — Tuhan tidak marah karena saudara cemas.", invite: "Bawa kekhawatiran satu per satu ke hadirat-Nya.", angle: "doa menggantikan kekuatiran" },
    { validate: "Kekhawatiran sering datang tanpa undangan.", invite: "Ganti napas panik dengan firman damai.", angle: "damai sejahtera yang menjaga" },
    { validate: "Saudara tidak sendirian dalam kegelisahan ini.", invite: "Biarkan ayat menenangkan jiwa saudara.", angle: "penyertaan di tengah gelisah" },
    { validate: "Yang belum terjadi sering lebih berat dari yang sudah.", invite: "Ancor hati saudara pada janji hari ini.", angle: "satu hari demi satu hari" },
    { validate: "Tuhan lebih besar dari skenario terburuk di kepala saudara.", invite: "Serahkan skenario itu; dengarkan firman.", angle: "Allah yang berdaulat" },
    { validate: "Cemas adalah sinyal bahwa saudara peduli — itu manusiawi.", invite: "Salurkan kepedulian itu ke doa, bukan spiral.", angle: "cemas yang dibawa ke altar" },
    { validate: "Malam atau siang — Tuhan tidak tidur saat saudara gelisah.", invite: "Biarkan firman jadi obat tenang hari ini.", angle: "Allah yang tidak tidur" },
  ],
  syukur: [
    { validate: "Syukur jujur — bahkan di hari yang campur aduk — indah.", invite: "Perdalam syukur saudara lewat firman hari ini.", angle: "syukur yang tidak naif" },
    { validate: "Ada hal kecil hari ini yang layak disyukuri.", invite: "Biarkan ayat menguatkan mata syukur saudara.", angle: "melihat anugerah tersembunyi" },
    { validate: "Sukacita rohani bisa hidup meski hidup tidak sempurna.", invite: "Rayakan kebaikan Tuhan lewat firman.", angle: "sukacita dalam Tuhan" },
    { validate: "Syukur saudara menyenangkan hati Tuhan.", invite: "Biarkan firman jadi amplop syukur saudara.", angle: "memuliakan Tuhan dengan syukur" },
    { validate: "Hati bersyukur adalah hati yang siap menerima lebih.", invite: "Buka hati lewat ayat penghargaan hari ini.", angle: "hati yang terbuka" },
    { validate: "Tuhan setia — syukur saudara adalah bukti itu.", invite: "Perkuat syukur dengan firman yang hidup.", angle: "kasih setia yang diingat" },
    { validate: "Bersyukur bukan lupa masalah — tapi sengaja melihat Tuhan.", invite: "Biarkan ayat jadi cermin kebaikan-Nya.", angle: "sengaja bersyukur" },
  ],
  takut: [
    { validate: "Takut wajar — Tuhan tidak mengecilkan perasaan saudara.", invite: "Biarkan janji-Nya meneguhkan langkah saudara.", angle: "keberanian dari Tuhan" },
    { validate: "Ketakutan sering berbisik lebih keras dari kebenaran.", invite: "Ganti bisikan itu dengan firman yang benar.", angle: "kebenaran mengalahkan ketakutan" },
    { validate: "Saudara tidak harus berani sendiri.", invite: "Minta keberanian dari Tuhan lewat ayat ini.", angle: "Allah yang meneguhkan" },
    { validate: "Tuhan memegang hari esok — saudara cukup hari ini.", invite: "Ancor hati pada janji yang menenangkan.", angle: "cukup anugerah hari ini" },
    { validate: "Rasa takut tidak menentukan identitas saudara di Kristus.", invite: "Biarkan firman mengingatkan siapa saudara di Tuhan.", angle: "identitas di Kristus" },
    { validate: "Langkah kecil iman tetap dihitung — meski dengan takut.", invite: "Doa lewat ayat sebelum saudara melangkah.", angle: "iman langkah demi langkah" },
    { validate: "Tuhan sudah ada di masa depan yang saudara takuti.", invite: "Percayakan jalan saudara lewat firman-Nya.", angle: "Tuhan di depan kita" },
  ],
  lelah: [
    { validate: "Lelah bukan kegagalan — tubuh dan jiwa butuh istirahat.", invite: "Undang kelegaan dari Tuhan yang memanggil yang letih.", angle: "Yesus yang memberi kelegaan" },
    { validate: "Saudara sudah berjuang cukup lama — Tuhan melihat.", invite: "Biarkan firman jadi tempat saudara beristirahat.", angle: "istirahat rohani" },
    { validate: "Keletihan sering datang sebelum saudara sempat berhenti.", invite: "Berhenti sejenak; dengarkan undangan Tuhan.", angle: "berhenti sebelum runtuh" },
    { validate: "Tuhan tidak menghukum saudara karena lelah.", invite: "Terima kelegaan sebagai anugerah hari ini.", angle: "anugerah istirahat" },
    { validate: "Beban terlalu lama di pundak saudara.", invite: "Letakkan sebagian beban lewat firman penghiburan.", angle: "membawa beban ringan" },
    { validate: "Istirahat rohani bukan kemalasan — itu perlindungan jiwa.", invite: "Biarkan ayat menyegarkan yang kering.", angle: "jiwa yang disegarkan" },
    { validate: "Saudara layak dijaga — mulai dari jiwa saudara.", invite: "Undang Tuhan menopang yang letih.", angle: "Allah yang menopang" },
  ],
  marah: [
    { validate: "Marah sering menutupi luka — Tuhan melihat keduanya.", invite: "Bawa hati yang memanas ke hadirat yang menyejukkan.", angle: "Allah yang menyejukkan" },
    { validate: "Amarah bukan selalu dosa — terkadang sinyal ketidakadilan.", invite: "Biarkan firman menuntun hati saudara.", angle: "amarah yang dibawa ke altar" },
    { validate: "Tuhan tidak takut dengan kemarahan saudara.", invite: "Jujur pada Tuhan sebelum ayat dibacakan.", angle: "kejujuran emosional" },
    { validate: "Luka di balik amarah layak disembuhkan.", invite: "Biarkan firman mulai proses penyembuhan.", angle: "penyembuhan luka tersembunyi" },
    { validate: "Saudara tidak perlu memendam amarah sendirian.", invite: "Serahkan ke Tuhan yang adil dan lembut.", angle: "penyerahan amarah" },
    { validate: "Hati yang memanas butuh udara segar dari firman.", invite: "Biarkan ayat menyejukkan perlahan.", angle: "firman yang menyejukkan" },
    { validate: "Tuhan bisa mengubah amarah jadi kekuatan yang benar.", invite: "Doa lewat firman sebelum saudara merespons.", angle: "transformasi emosi" },
  ],
  "putus-asa": [
    { validate: "Putus asa terasa seperti dinding tebal — Tuhan masih ada.", invite: "Biarkan secercah harapan masuk lewat firman.", angle: "harapan yang tidak mati" },
    { validate: "Saudara tidak harus melihat jalan keluar dulu untuk percaya.", invite: "Ancor hati pada janji sebelum situasi berubah.", angle: "iman sebelum bukti" },
    { validate: "Malam panjang — tapi fajar pasti datang.", invite: "Biarkan ayat jadi cahaya kecil hari ini.", angle: "fajar setelah malam" },
    { validate: "Tuhan bekerja meski saudara tidak melihat hasilnya.", invite: "Percayakan proses-Nya lewat firman ini.", angle: "Allah yang bekerja" },
    { validate: "Putus asa bukan akhir cerita saudara.", invite: "Biarkan firman menulis halaman baru.", angle: "cerita yang belum selesai" },
    { validate: "Saudara masih di sini — itu bukti anugerah belum habis.", invite: "Bangkit perlahan lewat janji Tuhan.", angle: "anugerah hidup" },
    { validate: "Harapan rohani datang perlahan — dan itu valid.", invite: "Terima secercah harapan dari ayat hari ini.", angle: "harapan yang perlahan tumbuh" },
  ],
  bahagia: [
    { validate: "Sukacita hari ini adalah anugerah — layak disyukuri.", invite: "Biarkan firman mengakar syukur saudara lebih dalam.", angle: "syukur yang mengakar" },
    { validate: "Hari baik datang dari tangan Tuhan.", invite: "Perkuat sukacita saudara dengan firman.", angle: "mengingat sumber sukacita" },
    { validate: "Bahagia sejati lebih dalam dari mood sementara.", invite: "Biarkan ayat jadi fondasi sukacita saudara.", angle: "sukacita yang berakar" },
    { validate: "Tuhan memberi hari ini — saudara boleh menikmatinya.", invite: "Rayakan dengan syukur lewat firman.", angle: "menikmati anugerah" },
    { validate: "Sukacita saudara bisa jadi berkat bagi orang lain.", invite: "Biarkan ayat memperkaya hati yang bersyukur.", angle: "sukacita yang memancar" },
    { validate: "Di tengah sukacita, Tuhan tetap yang utama.", invite: "Arahkan syukur saudara kepada-Nya lewat ayat.", angle: "mengarahkan syukur" },
    { validate: "Hari yang cerah juga milik Tuhan — syukuri.", invite: "Perdalam sukacita dengan firman yang hidup.", angle: "firman di hari cerah" },
  ],
};

/** @type {Array<{ label: string, moodHint: string, bridgeStyle: string }>} */
export const DEVOTION_DAILY_OPENING_BANK = [
  { label: "Syukur pagi/sore", moodHint: "hati yang ingin mengucap syukur sebelum firman", bridgeStyle: "hubungkan rasa syukur ke tema firman hari ini" },
  { label: "Lelah butuh segar", moodHint: "tubuh atau jiwa lelah dan haus kesegaran", bridgeStyle: "akui kelelahan, undang firman sebagai sumber baru" },
  { label: "Tenang di kesibukan", moodHint: "pikiran masih berpacu di tengah urusan", bridgeStyle: "ajak melambat sejenak sebelum ayat dibacakan" },
  { label: "Rindu hadirat Tuhan", moodHint: "kerinduan berdiam lebih dari rutinitas", bridgeStyle: "sentuh kerinduan hati yang haus Tuhan" },
  { label: "Pengharapan baru", moodHint: "mencari arah atau harapan segar", bridgeStyle: "buka ruang pengharapan sebelum firman" },
  { label: "Damai sejahtera", moodHint: "butuh damai lebih dalam", bridgeStyle: "undang damai Kristus di saat teduh ini" },
  { label: "Refleksi jujur", moodHint: "ingin jujur pada Tuhan tentang kondisi hidup", bridgeStyle: "ciptakan ruang kejujuran sebelum firman berbicara" },
  { label: "Kekuatan untuk hari", moodHint: "butuh kekuatan sebelum melangkah", bridgeStyle: "hubungkan kebutuhan kekuatan ke ayat hari ini" },
  { label: "Pertanyaan di hati", moodHint: "ada pertanyaan yang belum terjawab", bridgeStyle: "biarkan firman menjawab dengan lembut" },
  { label: "Kasih setia Tuhan", moodHint: "ingin mengingat kasih setia yang tidak berubah", bridgeStyle: "arahkan hati ke setia Tuhan sebelum ayat" },
  { label: "Pelepasan beban", moodHint: "beban terasa berat di pundak", bridgeStyle: "undang firman sebagai tempat meletakkan beban" },
  { label: "Integritas hidup", moodHint: "ingin hidup jujur dan benar hari ini", bridgeStyle: "hubungkan panggilan integritas ke firman" },
  { label: "Sukacita sederhana", moodHint: "menemukan sukacita kecil yang sering terlewat", bridgeStyle: "buka mata untuk sukacita rohani sederhana" },
  { label: "Menyembah sebelum bekerja", moodHint: "ingin mengakui Tuhan sebelum aktivitas", bridgeStyle: "posisikan Tuhan di atas agenda hari ini" },
];

/**
 * Variasi harian doa terpandu per preset.
 * @param {string} presetId
 */
export function getDailyGuidedPrayerVariation(presetId) {
  const bank = GUIDED_PRAYER_DAILY_BANK[presetId] || GUIDED_PRAYER_DAILY_BANK.pagi;
  const entry = pickDailyFromPool(bank, `guided-prayer-${presetId}`);
  return {
    dateKey: todayKey(),
    presetId,
    dailyTheme: entry.theme,
    validatePhrase: entry.validate,
    invitePhrase: entry.invite,
    prayerFocus: entry.focus,
    lifeScenario: entry.scenario,
    variationIndex: dailyPickIndex(`guided-prayer-${presetId}`, bank.length),
  };
}

/**
 * Variasi prolog harian per emosi.
 * @param {string} emotionId
 */
export function getDailyEmotionPrologVariation(emotionId) {
  const bank = EMOTION_DAILY_PROLOG_BANK[emotionId] || EMOTION_DAILY_PROLOG_BANK.sedih;
  const entry = pickDailyFromPool(bank, `emotion-prolog-${emotionId}`);
  return {
    dateKey: todayKey(),
    emotionId,
    validatePhrase: entry.validate,
    invitePhrase: entry.invite,
    dailyAngle: entry.angle,
    variationIndex: dailyPickIndex(`emotion-prolog-${emotionId}`, bank.length),
  };
}

/** Variasi sudut prolog renungan harian — melengkai DAILY_GREETING_ANGLES. */
export function getDailyDevotionOpeningVariation() {
  const entry = pickDailyFromPool(DEVOTION_DAILY_OPENING_BANK, "devotion-opening");
  return {
    dateKey: todayKey(),
    label: entry.label,
    moodHint: entry.moodHint,
    bridgeStyle: entry.bridgeStyle,
    variationIndex: dailyPickIndex("devotion-opening", DEVOTION_DAILY_OPENING_BANK.length),
  };
}

/**
 * Ringkasan variasi harian untuk 3 lapisan (debug / preload).
 * @param {string} [dateKey]
 */
export function getDailyRenunganSummary(dateKey = todayKey()) {
  return {
    dateKey,
    devotion: getDailyDevotionOpeningVariation(),
    emotions: Object.keys(EMOTION_DAILY_PROLOG_BANK).map((id) => ({
      id,
      ...getDailyEmotionPrologVariation(id),
    })),
    prayers: Object.keys(GUIDED_PRAYER_DAILY_BANK).map((id) => ({
      id,
      ...getDailyGuidedPrayerVariation(id),
    })),
  };
}
