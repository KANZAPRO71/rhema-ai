/**
 * Biblical Chronological Timeline Engine — Garis Waktu Interaktif 8 Era Utama Sejarah Alkitab.
 */

export const BIBLE_TIMELINE_ERAS = [
  {
    id: "era-1",
    name: "Era Permulaan & Penciptaan",
    period: "Awal Mula — ±2000 SM",
    icon: "🌍",
    badge: "Kejadian 1-11",
    summary: "Penciptaan langit dan bumi oleh firman Allah, kejatuhan manusia, janji protoevangelium (Kej 3:15), dan pembaruan dunia lewat air bah Nuh.",
    keyEvents: ["Penciptaan dalam 6 Hari", "Taman Eden & Kejatuhan", "Bahtera Nuh & Pelangi Perjanjian", "Menara Babel"],
    keyVerse: { ref: "Kejadian 1:1", text: "Pada mulanya Allah menciptakan langit dan bumi." },
  },
  {
    id: "era-2",
    name: "Era Bapa Leluhur (Patriark)",
    period: "±2000 SM — ±1500 SM",
    icon: "⛺",
    badge: "Kejadian 12-50",
    summary: "Panggilan Abraham keluar dari Ur-Kasdim, perjanjian berkat bagi segala bangsa, keturunan Ishak, pergulatan Yakub menjadi Israel, dan pemeliharaan ilahi lewat Yusuf di Mesir.",
    keyEvents: ["Panggilan Abraham & Perjanjian Iman", "Pengorbanan Ishak di Gunung Moria", "Yakub Bergulat dengan Allah", "Yusuf Menyelamatkan Mesir"],
    keyVerse: { ref: "Kejadian 12:2-3", text: "Aku akan membuat engkau menjadi bangsa yang besar, dan memberkati engkau... dan olehmu semua kaum di muka bumi akan mendapat berkat." },
  },
  {
    id: "era-3",
    name: "Era Eksodus & Hukum Taurat",
    period: "±1446 SM — ±1400 SM",
    icon: "🔥",
    badge: "Keluaran — Ulangan",
    summary: "Pembebasan bangsa Israel dari perbudakan Mesir melalui 10 tulah, penyeberangan Laut Teberau, 10 Perintah Allah di Gunung Sinai, dan Kemah Suci.",
    keyEvents: ["Semak Belukar Berapi & 10 Tulah", "Paskah Pertama & Penyeberangan Laut", "Dasa Titah di Sinai", "40 Tahun di Padang Gurun"],
    keyVerse: { ref: "Keluaran 20:2", text: "Akulah TUHAN, Allahmu, yang membawa engkau keluar dari tanah Mesir, dari tempat perbudakan." },
  },
  {
    id: "era-4",
    name: "Era Kerajaan Emas Daud & Salomo",
    period: "±1050 SM — ±930 SM",
    icon: "👑",
    badge: "1-2 Samuel, 1 Raja-raja, Mazmur",
    summary: "Penyatuan 12 suku Israel di bawah kepemimpinan Daud, penaklukan Yerusalem, penulisan Mazmur, dan pembangunan Bait Suci megah oleh Salomo.",
    keyEvents: ["Daud Mengalahkan Goliat", "Perjanjian Kerajaan Abadi Daud", "Bait Suci Pertama Didirikan", "Hikmat & Kemuliaan Salomo"],
    keyVerse: { ref: "2 Samuel 7:16", text: "Keluarga dan kerajaanmu akan kokoh untuk selama-lamanya di hadapan-Ku, takhtamu akan teguh untuk selama-lamanya." },
  },
  {
    id: "era-5",
    name: "Era Pembuangan & Para Nabi",
    period: "±586 SM — ±400 SM",
    icon: "📜",
    badge: "Yesaya — Maleakhi, Daniel, Ezra",
    summary: "Kehancuran Yerusalem dan pembuangan bangsa ke Babel akibat ketidaksetiaan, suara para nabi menubuatkan Sang Mesias, dan pemulangan kembali di zaman Nehemia.",
    keyEvents: ["Keruntuhan Yerusalem oleh Nebukadnezar", "Daniel di Gua Singa", "Nubuat Hamba yang Menderita (Yesaya 53)", "Pembangunan Kembali Tembok Yerusalem"],
    keyVerse: { ref: "Yesaya 53:5", text: "Tetapi dia tertikam oleh karena pemberontakan kita, dia diremukkan oleh karena kejahatan kita; ganjaran yang mendatangkan keselamatan bagi kita ditimpakan kepadanya." },
  },
  {
    id: "era-6",
    name: "Era Inkarnasi Kristus (Injil)",
    period: "±4 SM — ±30 M",
    icon: "✝️",
    badge: "Matius, Markus, Lukas, Yohanes",
    summary: "Penggenapan seluruh nubuat Perjanjian Lama: Allah menjadi manusia di dalam Yesus Kristus, mukjizat kesembuhan, salib Golgota, dan kemenangan kebangkitan maut.",
    keyEvents: ["Kelahiran di Betlehem", "Baptisan & Pencobaan Yesus", "Khotbah di Bukit & Mukjizat", "Penyaliban di Golgota & Kebangkitan Hari Ketiga"],
    keyVerse: { ref: "Yohanes 3:16", text: "Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal." },
  },
  {
    id: "era-7",
    name: "Era Gereja Mula-mula & Misi",
    period: "±30 M — ±70 M",
    icon: "🕊️",
    badge: "Kisah Para Rasul & Surat Rasuli",
    summary: "Curahan Roh Kudus di hari Pentakosta, keberanian para rasul bersaksi, pertobatan Paulus di jalan Damsyik, dan penyebaran Injil ke seluruh penjuru Kekaisaran Romawi.",
    keyEvents: ["Hari Pentakosta & 3000 Jiwa Bertobat", "Pertobatan Saulus (Paulus)", "3 Perjalanan Misi Internasional Paulus", "Penulisan Surat-surat Penggembalaan"],
    keyVerse: { ref: "Kisah Para Rasul 1:8", text: "Tetapi kamu akan menerima kuasa, kalau Roh Kudus turun ke atas kamu, dan kamu akan menjadi saksi-Ku di Yerusalem dan di seluruh Yudea dan Samaria dan sampai ke ujung bumi." },
  },
  {
    id: "era-8",
    name: "Era Wahyu & Yerusalem Baru",
    period: "Abad 1 M — Masa Depan Kekal",
    icon: "🌟",
    badge: "Kitab Wahyu",
    summary: "Penglihatan Rasul Yohanes di Pulau Patmos: kemenangan mutlak Anak Domba Allah atas segala kuasa kegelapan, kedatangan Kristus kembali, dan langit serta bumi yang baru.",
    keyEvents: ["Penglihatan Anak Domba di Takhta", "Kemenangan Akhir atas Iblis & Maut", "Turunnya Kota Suci Yerusalem Baru", "Air Kehidupan & Pohon Kehidupan Abadi"],
    keyVerse: { ref: "Wahyu 21:4", text: "Dan Ia akan menghapus segala air mata dari mata mereka, dan maut tidak akan ada lagi; tidak akan ada lagi perkabungan, atau ratap tangis, atau dukacita." },
  },
];

/**
 * Membuka Modal Garis Waktu Sejarah Alkitab
 * @param {{ onExplainEra?: (era: object) => void }} [callbacks]
 */
export function openBibleTimelineModal(callbacks = {}) {
  let existing = document.getElementById("bible-timeline-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "bible-timeline-modal";
  modal.className = "apple-modal-overlay active";

  modal.innerHTML = `
    <div class="apple-modal-sheet timeline-sheet">
      <div class="modal-handle-bar"></div>
      <div class="timeline-header">
        <div>
          <span class="timeline-badge">🗺️ Sejarah Keselamatan</span>
          <h2 class="timeline-title">Garis Waktu Alkitab (8 Era)</h2>
          <p class="timeline-sub">Dari Kejadian sampai Wahyu · Rencana Kekal Allah</p>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-timeline">✕</button>
      </div>

      <!-- Timeline Scroll Container -->
      <div class="timeline-cards-container">
        ${BIBLE_TIMELINE_ERAS.map((era, idx) => `
          <div class="timeline-era-card glass-card">
            <div class="era-card-top">
              <div class="era-icon-badge">${era.icon}</div>
              <div class="era-meta">
                <span class="era-num">Era ${idx + 1} · ${era.period}</span>
                <h3 class="era-name">${era.name}</h3>
                <span class="era-books-tag">${era.badge}</span>
              </div>
            </div>
            <p class="era-summary">${era.summary}</p>
            
            <div class="era-events-box">
              <span class="events-label">⚡ Peristiwa Kunci:</span>
              <ul class="era-events-list">
                ${era.keyEvents.map((evt) => `<li>${evt}</li>`).join("")}
              </ul>
            </div>

            <div class="era-key-verse">
              <blockquote class="era-verse-text">&ldquo;${era.keyVerse.text}&rdquo;</blockquote>
              <div class="era-verse-bottom">
                <span class="era-verse-ref">${era.keyVerse.ref}</span>
                <div class="era-card-actions">
                  <button type="button" class="btn-tool-pill btn-era-open" data-ref="${era.keyVerse.ref}">📖 Buka Ayat</button>
                  <button type="button" class="btn-tool-pill primary btn-era-voice" data-idx="${idx}">🎙️ Jelaskan Era Ini</button>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#btn-close-timeline")?.addEventListener("click", () => modal.remove());

  modal.querySelectorAll(".btn-era-open").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ref = btn.getAttribute("data-ref");
      modal.remove();
      if (ref) document.dispatchEvent(new CustomEvent("rhema-open-verse", { detail: ref }));
    });
  });

  modal.querySelectorAll(".btn-era-voice").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-idx") || 0);
      const era = BIBLE_TIMELINE_ERAS[idx] || BIBLE_TIMELINE_ERAS[0];
      modal.remove();
      if (callbacks.onExplainEra) {
        callbacks.onExplainEra(era);
      } else {
        document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "voice" }));
        document.dispatchEvent(
          new CustomEvent("rhema-ask-voice", {
            detail: `Jelaskan secara mendalam tentang ${era.name} (${era.period}) dalam sejarah Alkitab. Uraikan konteks kitab ${era.badge}, peristiwa kunci, dan makna rohaninya bagi kita hari ini.`,
          })
        );
      }
    });
  });
}
