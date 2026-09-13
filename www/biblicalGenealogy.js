/**
 * Biblical Genealogy & Messianic Lineage Engine — Silsilah & Peta Relasi Tokoh Alkitab Interaktif dari Kejadian hingga Kristus.
 */

import { escapeHtml } from "./markdown.js";

export const MESSIANIC_GENEALOGY = [
  {
    id: "adam",
    name: "Adam & Hawa",
    hebrewName: "אָדָם (Adam — Tanah Merah / Manusia)",
    era: "Era Permulaan",
    period: "Awal Mula",
    badge: "Kejadian 1-3",
    role: "Manusia pertama yang diciptakan menurut gambar dan rupa Allah; menerima janji pertama keselamatan Protoevangelium (Kejadian 3:15).",
    keyVerse: { ref: "Kejadian 1:27", text: "Maka Allah menciptakan manusia itu menurut gambar-Nya, menurut gambar Allah diciptakan-Nya dia." },
    significance: "Leluhur seluruh umat manusia, titik awal rencana penebusan ilahi.",
    personaPrompt: "Anda adalah Adam, manusia pertama di Taman Eden. Ceritakan dengan penuh takjub mengenai keagungan ciptaan Allah dan kerinduan akan pemulihan janji penebusan.",
  },
  {
    id: "henokh",
    name: "Henokh",
    hebrewName: "חֲנוֹךְ (Chanokh — Berdedikasi / Ditahbiskan)",
    era: "Era Permulaan",
    period: "Sebelum Air Bah",
    badge: "Kejadian 5:21-24",
    role: "Pribadi yang hidup bergaul karib dengan Allah selama 300 tahun hingga terangkat langsung ke surga tanpa mengalami kematian.",
    keyVerse: { ref: "Kejadian 5:24", text: "Dan Henokh hidup bergaul dengan Allah, lalu ia tidak ada lagi, sebab ia telah diangkat oleh Allah." },
    significance: "Teladan persekutuan intim dan keintiman doa yang tak terputus dengan Sang Pencipta.",
    personaPrompt: "Anda adalah Henokh yang berjalan intim dengan Allah. Bagikan rahasia bagaimana menjaga hati tetap kudus dan bergaul karib dengan Tuhan di tengah dunia.",
  },
  {
    id: "nuh",
    name: "Nuh",
    hebrewName: "נֹחַ (Noach — Ketenangan / Penghiburan)",
    era: "Era Air Bah",
    period: "±2400 SM",
    badge: "Kejadian 6-9",
    role: "Orang benar dan tak bercela di zamannya; membangun Bahtera keselamatan dan menerima Perjanjian Pelangi.",
    keyVerse: { ref: "Kejadian 6:8", text: "Tetapi Nuh mendapat kasih karunia di mata TUHAN." },
    significance: "Tipologi keselamatan Kristus: bahtera keselamatan bagi mereka yang beriman.",
    personaPrompt: "Anda adalah Nuh. Ceritakan bagaimana ketaatan membangun bahtera di tengah ejekan orang lain dan kesetiaan Allah memegang perjanjian pelangi-Nya.",
  },
  {
    id: "abraham",
    name: "Abraham",
    hebrewName: "אַבְרָהָם (Avraham — Bapa Banyak Bangsa)",
    era: "Era Patriark",
    period: "±2000 SM",
    badge: "Kejadian 12-25",
    role: "Bapa orang percaya; taat melangkah dari Ur-Kasdim ke tanah Kanaan dan menerima perjanjian keturunan sebanyak bintang di langit.",
    keyVerse: { ref: "Kejadian 15:6", text: "Lalu percayalah Abram kepada TUHAN, maka TUHAN memperhitungkan hal itu kepadanya sebagai kebenaran." },
    significance: "Garis keturunan iman di mana semua kaum di bumi beroleh berkat keselamatan.",
    personaPrompt: "Anda adalah Abraham, sahabat Allah dan bapa orang beriman. Sampaikan pesan tentang bagaimana mempercayai janji Tuhan saat mata jasmani belum melihatnya.",
  },
  {
    id: "ishak",
    name: "Ishak",
    hebrewName: "יִצְחָק (Yitzchak — Tertawa / Sukacita)",
    era: "Era Patriark",
    period: "±1900 SM",
    badge: "Kejadian 21-28",
    role: "Anak perjanjian yang dipersembahkan di Gunung Moria; teladan kerelaan dan penyerahan diri penuh kepada kehendak Bapa.",
    keyVerse: { ref: "Kejadian 22:8", text: "Sahut Abraham: 'Allah yang akan menyediakan anak domba untuk korban bakaran bagi-Nya, anakku.'" },
    significance: "Bayangan profetik Yesus sebagai Anak Tunggal yang dikorbankan di atas bukit.",
    personaPrompt: "Anda adalah Ishak. Bagikan pengalaman iman ketika melihat penyediaan Allah (Yahweh Yireh) di atas Gunung Moria.",
  },
  {
    id: "yakub",
    name: "Yakub (Israel)",
    hebrewName: "יַעֲקֹב / יִשְׂרָאֵל (Yisra'el — Pangeran Allah)",
    era: "Era Patriark",
    period: "±1800 SM",
    badge: "Kejadian 25-49",
    role: "Bergulat dengan Malaikat TUHAN di sungai Yabok; menerima nama Israel dan melahirkan 12 bapa suku Israel.",
    keyVerse: { ref: "Kejadian 32:28", text: "Namamu tidak akan disebutkan lagi Yakub, melainkan Israel, sebab engkau telah bergumul melawan Allah dan manusia, dan engkau menang." },
    significance: "Fondasi 12 suku umat pilihan Allah.",
    personaPrompt: "Anda adalah Yakub yang diubahkan menjadi Israel. Ceritakan bagaimana anugerah Tuhan mengubah hati seorang penipu menjadi pangeran doa.",
  },
  {
    id: "yehuda",
    name: "Yehuda",
    hebrewName: "יְהוּדָה (Yehudah — Terpujilah TUHAN)",
    era: "Era Patriark",
    period: "±1750 SM",
    badge: "Kejadian 38, 49:8-10",
    role: "Anak ke-4 Yakub; rela menjadi jaminan bagi Benyamin; menerima nubuat tongkat kerajaan kekal 'Singa dari suku Yehuda'.",
    keyVerse: { ref: "Kejadian 49:10", text: "Tongkat kerajaan tidak akan beranjak dari Yehuda... sampai Dia datang yang berhak atasnya." },
    significance: "Suku kerajaan dari mana Daud dan Mesias Yesus dilahirkan.",
    personaPrompt: "Anda adalah Yehuda. Bagikan mengenai kuasa pengorbanan menjadi jaminan bagi saudara dan nubuat Singa Yehuda.",
  },
  {
    id: "boas_rut",
    name: "Boas & Rut",
    hebrewName: "בֹּעַז & רוּת (Boaz — Kekuatan Ada Padanya & Ruth — Sahabat)",
    era: "Era Hakim-hakim",
    period: "±1150 SM",
    badge: "Kitab Rut 1-4",
    role: "Rut wanita Moab yang memilih menyembah Allah Israel ('Allahmulah Allahku'); ditebus oleh Boas sebagai Sang Penebus Sanak Saudara (Go'el).",
    keyVerse: { ref: "Rut 1:16", text: "Bangsamulah bangsaku dan Allahmulah Allahku." },
    significance: "Bukti kasih karunia Allah bagi bangsa-bangsa non-Yahudi masuk ke dalam silsilah Kristus.",
    personaPrompt: "Anda adalah Rut dan Boas. Ceritakan keindahan kasih karunia penebusan dan bagaimana kesetiaan sederhana diperhitungkan Tuhan dalam rencana besar-Nya.",
  },
  {
    id: "daud",
    name: "Raja Daud",
    hebrewName: "דָּוִד (Dawid — Yang Dikasihi)",
    era: "Era Kerajaan Emas",
    period: "±1010 SM — 970 SM",
    badge: "1-2 Samuel & Mazmur",
    role: "Pembalap kecapi dan pahlawan iman yang mengalahkan Goliat; raja pemersatu Israel yang berkenan di hati Allah; penulis Mazmur.",
    keyVerse: { ref: "Mazmur 23:1", text: "TUHAN adalah gembalaku, takkan kekurangan aku." },
    significance: "Menerima Perjanjian Daud: takhta kerajaan keturunannya akan kokoh untuk selama-lamanya.",
    personaPrompt: "Anda adalah Raja Daud. Bicaralah dengan nada seorang pemazmur yang penuh cinta akan hadirat Tuhan dan kerendahan hati.",
  },
  {
    id: "salomo",
    name: "Raja Salomo",
    hebrewName: "שְׁלֹמֹה (Shelomoh — Damai Sejahtera / Shalom)",
    era: "Era Kerajaan Emas",
    period: "±970 SM — 931 SM",
    badge: "1 Raja-raja, Amsal, Kidung",
    role: "Raja paling berhikmat di bumi; pembangun Bait Suci megah pertama di Yerusalem; penulis Kitab Amsal dan Kidung Agung.",
    keyVerse: { ref: "Amsal 3:5", text: "Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri." },
    significance: "Kemuliaan damai dan hikmat ilahi yang mengantisipasi hikmat Kristus yang lebih besar dari Salomo.",
    personaPrompt: "Anda adalah Salomo. Bagikan mutiara hikmat hidup, rahasia takut akan Tuhan, dan kemegahan hadirat-Nya saat Bait Suci ditahbiskan.",
  },
  {
    id: "maria_yusuf",
    name: "Yusuf & Maria",
    hebrewName: "יוֹסֵף & מִרְיָם (Yosef & Miryam)",
    era: "Era Inkarnasi",
    period: "±4 SM",
    badge: "Matius 1, Lukas 1-2",
    role: "Hamba Tuhan yang rendah hati; Maria melahirkan Yesus dari Roh Kudus ('Jadilah padaku menurut perkataan-Mu') dan Yusuf yang tulus menjaga Keluarga Kudus.",
    keyVerse: { ref: "Lukas 1:38", text: "Sesungguhnya aku ini adalah hamba Tuhan; jadilah padaku menurut perkataanmu itu." },
    significance: "Instrumen ketaatan mutlak yang menyambut penggenapan kedatangan Sang Imanuel di bumi.",
    personaPrompt: "Anda adalah Maria dan Yusuf. Ceritakan kedamaian dan keajaiban malam kudus saat Sang Juruselamat lahir di palungan Betlehem.",
  },
  {
    id: "yesus_kristus",
    name: "YESUS KRISTUS",
    hebrewName: "יֵשׁוּעַ הַמָּשִׁיחַ (Yeshua HaMashiach — TUHAN Menyelamatkan)",
    era: "Puncak Segala Masa",
    period: "Kekal dari Awal sampai Selama-lamanya",
    badge: "Matius, Markus, Lukas, Yohanes, Wahyu",
    role: "Anak Allah yang Hidup, Firman yang menjadi Manusia, Anak Domba Penebus Dosa, Raja Segala Raja dan Tuan di Atas Segala Tuan.",
    keyVerse: { ref: "Yohanes 14:6", text: "Akulah jalan dan kebenaran dan hidup. Tidak ada seorang pun yang datang kepada Bapa, kalau tidak melalui Aku." },
    significance: "Penggenapan seluruh hukum Taurat, nabi-nabi, dan janji keselamatan kekal bagi setiap orang yang percaya.",
    personaPrompt: "Bicaralah dengan penuh kasih karunia, wibawa, dan damai sejahtera surgawi Kristus, menguatkan dan memberkati orang yang datang mencari firman.",
  },
];

/**
 * Membuka Modal Peta Silsilah Alkitab Interaktif
 * @param {{ onOpenVerse?: (ref: string) => void, onVoicePersona?: (prompt: string, name: string) => void }} [callbacks]
 */
export function openBiblicalGenealogyModal(callbacks = {}) {
  let existing = document.getElementById("biblical-genealogy-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "biblical-genealogy-modal";
  modal.className = "apple-modal-overlay active";

  let selectedIdx = 0;

  modal.innerHTML = `
    <div class="apple-modal-sheet genealogy-sheet">
      <div class="modal-handle-bar"></div>
      
      <div class="genealogy-header">
        <div>
          <span class="genealogy-badge">🌳 Garis Keturunan Mesianik</span>
          <h2 class="genealogy-title">Peta Silsilah Tokoh Alkitab</h2>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-genealogy">✕</button>
      </div>

      <!-- Interactive Genealogy Horizontal Tree Nodes -->
      <div class="genealogy-tree-scroll" id="genealogy-tree-scroll">
        <div class="tree-line-connector"></div>
        ${MESSIANIC_GENEALOGY.map((p, idx) => `
          <button type="button" class="tree-node-card ${idx === 0 ? "active" : ""}" data-idx="${idx}">
            <div class="node-icon-glow">${idx === MESSIANIC_GENEALOGY.length - 1 ? "✝️" : "👤"}</div>
            <div class="node-name">${escapeHtml(p.name)}</div>
            <div class="node-era">${escapeHtml(p.era)}</div>
          </button>
        `).join("")}
      </div>

      <!-- Active Selected Persona Detail Card -->
      <div class="genealogy-sheet-body">
        <div class="genealogy-detail-card" id="genealogy-detail-display">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <div class="genealogy-action-footer" id="genealogy-action-footer" aria-label="Aksi tokoh"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = document.getElementById("btn-close-genealogy");
  const detailDisplay = document.getElementById("genealogy-detail-display");
  const actionFooter = document.getElementById("genealogy-action-footer");
  const nodeButtons = modal.querySelectorAll(".tree-node-card");

  function closeModal() {
    modal.classList.remove("active");
    setTimeout(() => modal.remove(), 250);
  }

  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  function renderSelectedPersona(idx) {
    selectedIdx = idx;
    nodeButtons.forEach((btn, i) => btn.classList.toggle("active", i === idx));

    const p = MESSIANIC_GENEALOGY[idx];
    if (!detailDisplay || !p) return;

    detailDisplay.innerHTML = `
      <div class="gdc-head-row">
        <div>
          <span class="gdc-era-badge">${escapeHtml(p.era)} · ${escapeHtml(p.period)}</span>
          <h3 class="gdc-name">${escapeHtml(p.name)}</h3>
          <p class="gdc-hebrew">${escapeHtml(p.hebrewName)}</p>
        </div>
        <div class="gdc-pass-badge">${escapeHtml(p.badge)}</div>
      </div>

      <p class="gdc-role">${escapeHtml(p.role)}</p>

      <div class="gdc-verse-box">
        <div class="gdc-verse-ref">📖 ${escapeHtml(p.keyVerse.ref)}</div>
        <p class="gdc-verse-text">"${escapeHtml(p.keyVerse.text)}"</p>
      </div>

      <div class="gdc-significance-box">
        <span class="gdc-sig-label">✨ Signifikansi Mesianik:</span>
        <p class="gdc-sig-text">${escapeHtml(p.significance)}</p>
      </div>
    `;

    if (actionFooter) {
      actionFooter.innerHTML = `
      <div class="gdc-actions">
        <button type="button" class="btn-gdc-voice" id="btn-gdc-talk">🎙️ Bicara dengan ${escapeHtml(p.name.split(" ")[0])} (Live AI)</button>
        <button type="button" class="btn-gdc-verse" id="btn-gdc-open-verse" data-ref="${escapeHtml(p.keyVerse.ref)}">📖 Buka Ayat</button>
      </div>`;
    }

    document.getElementById("btn-gdc-open-verse")?.addEventListener("click", () => {
      closeModal();
      if (callbacks.onOpenVerse) callbacks.onOpenVerse(p.keyVerse.ref);
    });

    document.getElementById("btn-gdc-talk")?.addEventListener("click", () => {
      closeModal();
      if (callbacks.onVoicePersona) {
        callbacks.onVoicePersona(p.personaPrompt, p.name);
      } else {
        document.dispatchEvent(new CustomEvent("rhema-start-persona-voice", {
          detail: { prompt: p.personaPrompt, name: p.name }
        }));
      }
    });
  }

  nodeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
      renderSelectedPersona(idx);
    });
  });

  renderSelectedPersona(0);
}
