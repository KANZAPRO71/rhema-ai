/**
 * Biblical Archaeological Time-Travel Engine — Modul Rekonstruksi Visual Arkeologi Kota & Tempat Suci Alkitab.
 */

export const ARCHAEOLOGICAL_SITES = [
  {
    id: "solomon_temple",
    name: "Bait Suci Salomo di Yerusalem",
    period: "±960 SM · Gunung Moria",
    icon: "🏛️",
    summary: "Bait suci pertama yang didirikan oleh Raja Salomo dengan kayu aras Libanon dan lapisan emas murni, tempat Tabut Perjanjian ditahtakan dan kemuliaan Allah (Shekinah Glory) turun memenuhinya.",
    features: ["Tiang Perunggu Yakhin & Boas", "Bejana Laut Tuangan Besar", "Ruang Kudus & Meja Roti Sajian", "Ruang Mahakudus & Tabut Perjanjian"],
    scripture: "1 Raja-raja 6 & 2 Tawarikh 3",
    voicePrompt: "Ceritakan secara mendalam mengenai kemegahan arsitektur dan makna spiritual dari Bait Suci Salomo di Yerusalem, bagaimana kemuliaan Tuhan memenuhi bait suci tersebut, dan relevansinya bagi tubuh kita sebagai bait Roh Kudus hari ini.",
  },
  {
    id: "capernaum",
    name: "Kapernaum & Danau Galilea",
    period: "Abad 1 M · Pesisir Galilea Utara",
    icon: "⛵",
    summary: "Kota basis pelayanan Yesus di Galilea. Tempat terjadinya banyak mukjizat: penyembuhan orang lumpuh yang diturunkan dari atap, penyembuhan ibu mertua Petrus, dan pengajaran di rumah ibadat kuno.",
    features: ["Rumah Simon Petrus dari Abad 1", "Sinagoge Putih Kuno", "Dermaga Perahu Nelayan Galilea", "Pabrik Pemeras Zaitun Basalt Hitam"],
    scripture: "Matius 4:13 & Markus 2:1-12",
    voicePrompt: "Bawa kami dalam wisata sejarah ke kota Kapernaum di abad pertama, gambarkan suasana kehidupan di tepi Danau Galilea saat Yesus melayani, dan renungkan arti mukjizat-mukjizat-Nya bagi iman kita.",
  },
  {
    id: "tabernacle",
    name: "Kemah Suci di Padang Gurun Sinai",
    period: "±1440 SM · Semenanjung Sinai",
    icon: "⛺",
    summary: "Tempat kediaman Allah yang bergerak di tengah perkemahan bangsa Israel. Menggambarkan peta jalan penebusan menuju hadirat Allah yang Mahakudus.",
    features: ["Mezbah Korban Bakaran Perunggu", "Bejana Pembasuhan Tembaga", "Kandil Emas 7 Cabang (Menorah)", "Mezbah Pembakaran Ukupan"],
    scripture: "Keluaran 25-40 & Ibrani 9",
    voicePrompt: "Jelaskan makna simbolis dan teologis dari setiap bagian Kemah Suci (Tabernakel) di padang gurun, dan bagaimana Yesus Kristus adalah penggenapan sempurna dari setiap perabot kemah suci tersebut.",
  },
  {
    id: "city_of_david",
    name: "Benteng Sion & Kota Daud",
    period: "±1000 SM · Bukit Ofel Yerusalem",
    icon: "🏰",
    summary: "Ibu kota kuno kerajaan Daud yang direbut dari orang Yebus. Dilengkapi sistem terowongan air bawah tanah Mata Air Gihon dan benteng pertahanan batu raksasa.",
    features: ["Struktur Bertingkat Batu Megah", "Saluran Terowongan Mata Air Gihon", "Pintu Gerbang Kota Kuno", "Kolam Siloam Asli"],
    scripture: "2 Samuel 5:6-10 & Mazmur 48",
    voicePrompt: "Uraikan sejarah arkeologi Kota Daud dan Benteng Sion, makna rohani Bukit Sion dalam firman Tuhan, dan bagaimana Daud memimpin bangsanya menyembah Tuhan.",
  },
  {
    id: "babylon",
    name: "Babel & Gerbang Ishtar di Zaman Daniel",
    period: "±600 SM · Sungai Efrat (Mesopotamia)",
    icon: "🦁",
    summary: "Kota metropolitan termegah di dunia kuno yang dibangun Raja Nebukadnezar. Tempat nabi Daniel, Sadrakh, Mesakh, dan Abednego berdiri teguh mempertahankan iman tanpa kompromi.",
    features: ["Gerbang Ishtar dengan Glasir Biru Lapis Lazuli", "Jalan Raya Prosesi Kemegahan", "Taman Gantung Babel", "Gua Singa Kerajaan"],
    scripture: "Kitab Daniel 1-6",
    voicePrompt: "Gambarkan kemegahan kota Babel kuno di zaman Raja Nebukadnezar dan teladan iman nabi Daniel yang tetap setia berdoa kepada Tuhan di tengah lingkungan yang menyembah berhala.",
  },
  {
    id: "patmos",
    name: "Pulau Patmos & Gua Penglihatan Wahyu",
    period: "±95 M · Laut Aegea Yunani",
    icon: "🌊",
    summary: "Pulau berbatu di mana Rasul Yohanes diasingkan oleh Kaisar Domitianus. Di dalam gua di pulau inilah surga terbuka dan Yohanes menerima penglihatan ilahi kitab Wahyu mengenai kemenangan akhir Kristus.",
    features: ["Gua Apokalipsis", "Pemandangan Laut Aegea yang Luas", "Batu Rekahan Penglihatan", "Simbol Anak Domba di Takhta"],
    scripture: "Wahyu 1:9-20",
    voicePrompt: "Bawa kami merenungkan suasana pengasingan Rasul Yohanes di Pulau Patmos, bagaimana di tempat terpencil yang sunyi ia justru melihat penglihatan termegah tentang Kristus yang bertakhta dalam kemuliaan kekal.",
  },
];

/**
 * Membuka Modal Rekonstruksi Arkeologi Kota Alkitab
 */
export function openBiblicalArchaeologyModal(callbacks = {}) {
  let existing = document.getElementById("biblical-archaeology-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "biblical-archaeology-modal";
  modal.className = "apple-modal-overlay active";

  modal.innerHTML = `
    <div class="apple-modal-sheet arch-sheet">
      <div class="modal-handle-bar"></div>
      <div class="arch-header">
        <div>
          <span class="arch-badge">🏛️ Rekonstruksi Visual Arkeologi</span>
          <h2 class="arch-title">Wisata Sejarah Kota Alkitab</h2>
          <p class="arch-sub">Jelajahi tempat-tempat suci bersejarah Alkitab secara visual</p>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-arch">✕</button>
      </div>

      <!-- Sites Grid -->
      <div class="arch-cards-container">
        ${ARCHAEOLOGICAL_SITES.map((site, idx) => `
          <div class="arch-site-card glass-card">
            <div class="arch-card-top">
              <span class="arch-icon-box">${site.icon}</span>
              <div>
                <h3 class="arch-site-name">${site.name}</h3>
                <span class="arch-site-period">${site.period} · 📖 ${site.scripture}</span>
              </div>
            </div>
            <p class="arch-site-summary">${site.summary}</p>
            
            <div class="arch-features-box">
              <span class="arch-f-label">🏛️ Bukti &amp; Struktur Arkeologi:</span>
              <ul class="arch-f-list">
                ${site.features.map((f) => `<li>${f}</li>`).join("")}
              </ul>
            </div>

            <div class="arch-card-actions">
              <button type="button" class="btn-tool-pill primary full glow btn-arch-voice" data-idx="${idx}">
                🎙️ Dengarkan Tur Suara Sejarah AI
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#btn-close-arch")?.addEventListener("click", () => modal.remove());

  modal.querySelectorAll(".btn-arch-voice").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-idx") || 0);
      const site = ARCHAEOLOGICAL_SITES[idx] || ARCHAEOLOGICAL_SITES[0];
      modal.remove();
      if (callbacks.onExploreSite) {
        callbacks.onExploreSite(site);
      } else {
        document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "voice" }));
        document.dispatchEvent(
          new CustomEvent("rhema-ask-voice", {
            detail: site.voicePrompt,
          })
        );
      }
    });
  });
}
