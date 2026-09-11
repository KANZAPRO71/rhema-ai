/**
 * Live Biblical Personas Engine — Modul Percakapan Suara Langsung 2 Arah dengan Tokoh-tokoh Alkitab via Gemini Live Voice.
 */

export const BIBLICAL_PERSONAS = [
  {
    id: "david",
    name: "Raja Daud",
    title: "Gembala & Penulis Mazmur",
    icon: "👑",
    era: "±1000 SM · Betlehem & Yerusalem",
    avatarBg: "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
    bio: "Pria yang berkenan di hati Allah, mengalahkan Goliat, melewati lembah bayang-bayang maut, dan menggubah nyanyian Mazmur pemujaan abadi.",
    sampleTopics: [
      "Bagaimana caramu tetap tenang saat dikejar Saul di padang gurun?",
      "Ceritakan pengalamanmu saat menulis Mazmur 23.",
      "Bagaimana caramu bangkit dari rasa bersalah setelah ditegur nabi Natan?",
    ],
    systemPrompt: `Anda sekarang berperan penuh sebagai RAJA DAUD dari Alkitab.
Berbicaralah dengan nada suara yang penuh kerendahan hati, kelembutan seorang gembala, iman yang berkobar, dan hikmat seorang penyembah sejati.
Gunakan metafora mazmur, padang rumput, kecapi, dan kasih setia Tuhan yang tak berkesudahan (Hesed).
Sapa pengguna dengan hangat sebagai sahabat seiman yang sedang menempuh perjalanan hidup bersama TUHAN.`,
  },
  {
    id: "paul",
    name: "Rasul Paulus",
    title: "Teolog Kasih Karunia & Misionaris",
    icon: "📜",
    era: "±60 M · Roma, Korintus & Efesus",
    avatarBg: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    bio: "Dari penganiaya umat percaya menjadi rasul bagi bangsa-bangsa bukan Yahudi, mengalami perjumpaan di jalan Damsyik, dan menulis surat-surat penggembalaan.",
    sampleTopics: [
      "Bagaimana caramu bersukacita saat dipenjara di Filipi?",
      "Jelaskan padaku apa itu kasih karunia yang cuma-cuma.",
      "Bagaimana mengatasi duri dalam daging yang menyakitkan?",
    ],
    systemPrompt: `Anda sekarang berperan penuh sebagai RASUL PAULUS dari Alkitab.
Berbicaralah dengan ketegasan teologis, semangat yang menyala-nyala untuk Injil Kristus, penuh kasih persaudaraan, dan penekanan mendalam pada KASIH KARUNIA (Grace) dan salib Kristus.
Ingatkan pengguna bahwa dalam kelemahan kitalah kuasa Kristus menjadi sempurna.`,
  },
  {
    id: "moses",
    name: "Nabi Musa",
    title: "Pemimpin Eksodus & Sahabat Allah",
    icon: "⛺",
    era: "±1400 SM · Mesir & Gunung Sinai",
    avatarBg: "linear-gradient(135deg, #065f46 0%, #059669 100%)",
    bio: "Dipanggil lewat semak belukar berapi, memimpin bangsa Israel keluar dari perbudakan Mesir, dan berbicara dengan Allah muka dengan muka seperti seorang sahabat.",
    sampleTopics: [
      "Apa yang kau rasakan saat semak belukar terbakar tapi tak hangus?",
      "Bagaimana rasanya membelah Laut Merah dengan tongkatmu?",
      "Bagaimana memimpin orang-orang yang sering bersungut-sungut?",
    ],
    systemPrompt: `Anda sekarang berperan penuh sebagai NABI MUSA dari Alkitab.
Berbicaralah dengan ketenangan seorang nabi tua yang sangat sabar, berwibawa, penuh kekaguman akan kekudusan dan kemuliaan TUHAN yang Mahaagung.
Kuatkan iman pengguna bahwa TUHAN yang membawa keluar dari tanah perbudakan sanggup membuka jalan di tengah laut yang mustahil.`,
  },
  {
    id: "peter",
    name: "Rasul Petrus",
    title: "Nelayan Galilea & Batu Karang",
    icon: "⛵",
    era: "±33 M · Danau Galilea & Yerusalem",
    avatarBg: "linear-gradient(135deg, #0369a1 0%, #0284c7 100%)",
    bio: "Nelayan bersahaja yang dipanggil menjadi penjala manusia, saksi mata transfigurasi dan kebangkitan Yesus, dipulihkan dengan penuh kasih di tepi pantai.",
    sampleTopics: [
      "Bagaimana rasanya melangkah keluar dari perahu dan berjalan di atas air?",
      "Ceritakan saat Yesus memulihkanmu di tepi pantai setelah kau menyangkal-Nya.",
      "Apa pesanmu bagi kami yang merasa gagal dan tidak layak?",
    ],
    systemPrompt: `Anda sekarang berperan penuh sebagai RASUL SIMON PETRUS dari Alkitab.
Berbicaralah dengan gaya bersahaja, tulus, penuh empati atas kelemahan manusia, dan luapan sukacita karena anugerah pengampunan Yesus yang tidak terbatas.
Kuatkan pengguna bahwa kegagalan bukanlah akhir dari panggilan Tuhan.`,
  },
  {
    id: "esther",
    name: "Ratu Ester",
    title: "Keberanian Iman Menyelamatkan Bangsa",
    icon: "🌸",
    era: "±480 SM · Istana Susan Persia",
    avatarBg: "linear-gradient(135deg, #9d174d 0%, #db2777 100%)",
    bio: "Gadis yatim piatu yang diangkat menjadi ratu, berpuasa 3 hari 3 malam demi menyelamatkan bangsanya dengan tekad 'kalau terpaksa aku mati, biarlah aku mati'.",
    sampleTopics: [
      "Bagaimana caramu mengumpulkan keberanian menghadap raja?",
      "Bagaimana doa dan puasa mengubah situasi yang genting?",
      "Apa arti hidup 'untuk masa seperti inilah' (for such a time as this)?",
    ],
    systemPrompt: `Anda sekarang berperan penuh sebagai RATU ESTER dari Alkitab.
Berbicaralah dengan keanggunan, ketenangan batin, keberanian iman yang teguh, dan keyakinan akan pemeliharaan Allah yang bekerja di balik layar kehidupan.`,
  },
  {
    id: "elijah",
    name: "Nabi Elia",
    title: "Pendoa Pembawa Api Pemulihan",
    icon: "🕊️",
    era: "±850 SM · Gunung Karmel & Sungai Kerit",
    avatarBg: "linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)",
    bio: "Nabi pemberani yang berdoa hingga api TUHAN turun membakar korban bakaran di Gunung Karmel, dipelihara burung gagak, dan mendengar suara Tuhan dalam bisikan angin lembut.",
    sampleTopics: [
      "Bagaimana caramu berdoa hingga api TUHAN turun di Gunung Karmel?",
      "Ceritakan saat kau putus asa di bawah pohon arar dan Tuhan memulihkanmu.",
      "Bagaimana cara mengenali suara TUHAN dalam bisikan yang lembut?",
    ],
    systemPrompt: `Anda sekarang berperan penuh sebagai NABI ELIA dari Alkitab.
Berbicaralah dengan ketegasan iman yang tak kenal kompromi terhadap penyembahan berhala, namun lembut dan penuh kehangatan saat menguatkan jiwa yang sedang lelah.`,
  },
];

/**
 * Membuka Modal Percakapan Suara dengan Tokoh Alkitab
 * @param {{ onStartLivePersona?: (persona: object, topic?: string) => void }} [callbacks]
 */
export function openBiblicalPersonasModal(callbacks = {}) {
  let existing = document.getElementById("biblical-personas-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "biblical-personas-modal";
  modal.className = "apple-modal-overlay active";

  let selectedIdx = 0;

  modal.innerHTML = `
    <div class="apple-modal-sheet personas-sheet">
      <div class="modal-handle-bar"></div>
      <div class="personas-header">
        <div>
          <span class="personas-badge">🎙️ Gemini Multimodal Live Persona</span>
          <h2 class="personas-title">Ngobrol dengan Tokoh Alkitab</h2>
          <p class="personas-sub">Percakapan suara langsung 2 arah dengan pahlawan iman</p>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-personas">✕</button>
      </div>

      <!-- Persona Cards Grid -->
      <div class="personas-sheet-body">
      <div class="personas-grid-scroll">
        ${BIBLICAL_PERSONAS.map((p, idx) => `
          <button type="button" class="persona-chip-card ${idx === 0 ? "active" : ""}" data-idx="${idx}">
            <div class="persona-avatar-disc" style="background:${p.avatarBg};">
              <span class="persona-avatar-icon">${p.icon}</span>
            </div>
            <span class="persona-chip-name">${p.name}</span>
            <span class="persona-chip-title">${p.title}</span>
          </button>
        `).join("")}
      </div>

      <!-- Selected Persona Detail Display -->
      <div class="persona-focus-card glass-card" id="persona-focus-wrap">
        <div class="persona-focus-head">
          <div class="persona-avatar-big" id="p-render-avatar" style="background:${BIBLICAL_PERSONAS[0].avatarBg};">
            <span id="p-render-icon">${BIBLICAL_PERSONAS[0].icon}</span>
          </div>
          <div>
            <h3 class="persona-focus-name" id="p-render-name">${BIBLICAL_PERSONAS[0].name}</h3>
            <span class="persona-focus-era" id="p-render-era">${BIBLICAL_PERSONAS[0].era}</span>
            <p class="persona-focus-bio" id="p-render-bio">${BIBLICAL_PERSONAS[0].bio}</p>
          </div>
        </div>

        <div class="persona-topics-box">
          <span class="ptopics-label">💡 Contoh Pertanyaan yang Bisa Ditanyakan:</span>
          <div class="ptopics-list" id="p-render-topics">
            ${BIBLICAL_PERSONAS[0].sampleTopics.map((top) => `
              <button type="button" class="btn-ptopic-prompt" data-prompt="${top}">
                💬 &ldquo;${top}&rdquo;
              </button>
            `).join("")}
          </div>
        </div>
      </div>
      </div>

      <!-- Action Footer -->
      <div class="personas-action-footer">
        <button type="button" class="btn-pill primary full glow" id="btn-start-persona-voice">
          🎙️ Mulai Percakapan Suara Live Sekarang
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#btn-close-personas")?.addEventListener("click", () => modal.remove());

  const updateFocus = (idx) => {
    selectedIdx = idx;
    const p = BIBLICAL_PERSONAS[idx];
    const nEl = modal.querySelector("#p-render-name");
    const eEl = modal.querySelector("#p-render-era");
    const bEl = modal.querySelector("#p-render-bio");
    const iEl = modal.querySelector("#p-render-icon");
    const aEl = modal.querySelector("#p-render-avatar");
    const tEl = modal.querySelector("#p-render-topics");

    if (nEl) nEl.textContent = p.name;
    if (eEl) eEl.textContent = p.era;
    if (bEl) bEl.textContent = p.bio;
    if (iEl) iEl.textContent = p.icon;
    if (aEl) aEl.style.background = p.avatarBg;

    if (tEl) {
      tEl.innerHTML = p.sampleTopics.map((top) => `
        <button type="button" class="btn-ptopic-prompt" data-prompt="${top}">
          💬 &ldquo;${top}&rdquo;
        </button>
      `).join("");

      tEl.querySelectorAll(".btn-ptopic-prompt").forEach((btn) => {
        btn.addEventListener("click", () => {
          const prompt = btn.getAttribute("data-prompt") || "";
          startPersonaConversation(p, prompt);
        });
      });
    }
  };

  modal.querySelectorAll(".persona-chip-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".persona-chip-card").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const idx = Number(btn.getAttribute("data-idx") || 0);
      updateFocus(idx);
    });
  });

  const startPersonaConversation = (persona, initialQuestion = "") => {
    modal.remove();
    const instructionPrompt = `${persona.systemPrompt}\n\n[Mulai percakapan dengan menyapa pengguna hangat sebagai ${persona.name}. Jika pengguna menanyakan: "${initialQuestion || "Salam damai sejahtera, ceritakan sedikit pengalaman imanmu"}", jawablah langsung secara lisan penuh kasih dan urapan.]`;

    if (callbacks.onStartLivePersona) {
      callbacks.onStartLivePersona(persona, instructionPrompt);
    } else {
      document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "voice" }));
      document.dispatchEvent(
        new CustomEvent("rhema-ask-voice", {
          detail: instructionPrompt,
        })
      );
    }
  };

  modal.querySelector("#btn-start-persona-voice")?.addEventListener("click", () => {
    const p = BIBLICAL_PERSONAS[selectedIdx];
    startPersonaConversation(p);
  });

  modal.querySelectorAll(".btn-ptopic-prompt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = BIBLICAL_PERSONAS[selectedIdx];
      const prompt = btn.getAttribute("data-prompt") || "";
      startPersonaConversation(p, prompt);
    });
  });
}
