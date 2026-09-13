/**
 * Sermon & Ministry Assistant Engine — Modul AI untuk Generator Kerangka Khotbah, Bahan Komsel & Sekolah Minggu.
 */

import { escapeHtml } from "./markdown.js";
import { buildSermonVoicePrompt, setPreacherPersona } from "./sermonPrompts.js";

export const SERMON_TOPIC_TEMPLATES = [
  { id: "faith", label: "🔥 Iman Teguh di Tengah Gelombang Hidup", passage: "Ibrani 11:1-6" },
  { id: "family", label: "🏡 Membangun Mezbah Keluarga yang Diberkati", passage: "Yosua 24:14-15" },
  { id: "restoration", label: "🕊️ Pemulihan Kasih Mula-mula", passage: "Wahyu 2:4-5" },
  { id: "grace", label: "💎 Anugerah Kasih Karunia Tanpa Syarat", passage: "Efesus 2:8-10" },
  { id: "healing", label: "🩺 Kuasa Kesembuhan dalam Nama Yesus", passage: "Yesaya 53:4-5" },
  { id: "purpose", label: "🌟 Menemukan Panggilan & Tujuan Hidup", passage: "Yeremia 1:4-9" },
];

/**
 * Menghasilkan kerangka khotbah lengkap berbasis AI.
 */
export function generateSermonOutline(topicTitle, passageRef) {
  const t = topicTitle || "Kemenangan di Dalam Kristus";
  const p = passageRef || "Roma 8:31-39";

  return {
    title: t,
    passage: p,
    theme: `Kemenangan Sejati Orang Percaya Berdasarkan ${p}`,
    historicalContext: `Surat ini ditulis untuk meneguhkan umat percaya di tengah tekanan dan tantangan hidup, mengingatkan bahwa kasih Allah di dalam Kristus Yesus tidak dapat dipisahkan oleh kuasa apa pun.`,
    points: [
      {
        number: "I",
        headline: "Menyadari Bahwa Allah Berada di Pihak Kita",
        subtext: "Jika Allah di pihak kita, siapakah yang dapat melawan kita? Rasa takut runtuh saat kita menyadari kedaulatan Tuhan.",
      },
      {
        number: "II",
        headline: "Kasih yang Telah Terbukti Melalui Pengorbanan Salib",
        subtext: "Ia yang tidak menyayangkan Anak-Nya sendiri pasti akan menganugerahkan segala kebaikan yang kita perlukan.",
      },
      {
        number: "III",
        headline: "Lebih dari Pemenang dalam Segala Keadaan",
        subtext: "Kemenangan kristiani bukan berarti terbebas dari badai, melainkan tetap teguh dan berbuah di tengah badai.",
      },
    ],
    realLifeIllustration: `Bagaikan sebuah kapal jangkar yang menancap kuat pada dasar karang laut yang tak tergoyahkan, demikianlah iman orang percaya yang berakar di dalam kasih Kristus. Badai ombak di permukaan tidak dapat menghanyutkan kapal yang berjangkar kuat.`,
    practicalApplication: `1. Jangan biarkan masa lalu atau rasa bersalah mendikte masa depanmu.\n2. Mulailah hari dengan memperkatakan janji firman Tuhan atas keluarga dan pekerjaanmu.\n3. Jadilah saluran kasih Allah bagi sesama yang sedang terluka.`,
    closingPrayer: `Tuhan Yesus, terima kasih atas firman-Mu yang hidup. Kami menaruh seluruh hidup kami dalam pemeliharaan kasih-Mu. Jadikan kami lebih dari pemenang dalam segala pergumulan. Di dalam nama Tuhan Yesus Kristus kami berdoa. Amin.`,
  };
}

/**
 * Membuka Modal Asisten Khotbah & Bahan Komsel
 * @param {{ onVoiceSermon?: (outline: object) => void }} [callbacks]
 */
export function openSermonAssistantModal(callbacks = {}) {
  let existing = document.getElementById("sermon-assistant-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "sermon-assistant-modal";
  modal.className = "apple-modal-overlay active";

  let currentOutline = generateSermonOutline("Iman Teguh di Tengah Badai", "Markus 4:35-41");

  modal.innerHTML = `
    <div class="apple-modal-sheet sermon-sheet">
      <div class="modal-handle-bar"></div>
      <div class="sermon-header">
        <div>
          <span class="sermon-badge">📝 Khotbah (topik)</span>
          <h2 class="sermon-title">Kerangka Khotbah &amp; Komsel</h2>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-sermon">✕</button>
      </div>

      <!-- Quick Topic Selector Drawer -->
      <div class="sermon-topics-scroll">
        ${SERMON_TOPIC_TEMPLATES.map((t, idx) => `
          <button type="button" class="sermon-topic-pill ${idx === 0 ? "active" : ""}" data-title="${t.label}" data-pass="${t.passage}">
            ${t.label}
          </button>
        `).join("")}
      </div>

      <!-- Sermon Outline Content -->
      <div class="sermon-content-body" id="sermon-body-wrap">
        <div class="sermon-card-main">
          <h3 class="sermon-main-title" id="sermon-render-title">${currentOutline.title}</h3>
          <p class="sermon-main-ref" id="sermon-render-ref">📖 Bacaan: <strong>${currentOutline.passage}</strong></p>
          
          <div class="sermon-section-box">
            <h4>🏛️ Latar Belakang &amp; Konteks</h4>
            <p id="sermon-render-bg">${currentOutline.historicalContext}</p>
          </div>

          <div class="sermon-section-box">
            <h4>💡 3 Poin Utama Khotbah</h4>
            <div id="sermon-render-points">
              ${currentOutline.points.map((pt) => `
                <div class="sermon-pt-row">
                  <span class="sermon-pt-num">${pt.number}</span>
                  <div>
                    <strong class="sermon-pt-head">${pt.headline}</strong>
                    <p class="sermon-pt-sub">${pt.subtext}</p>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="sermon-section-box">
            <h4>🎨 Ilustrasi Kehidupan Nyata</h4>
            <p id="sermon-render-illus">${currentOutline.realLifeIllustration}</p>
          </div>

          <div class="sermon-section-box">
            <h4>🎯 Aplikasi Praktis untuk Saudara</h4>
            <p id="sermon-render-app" style="white-space: pre-line;">${currentOutline.practicalApplication}</p>
          </div>

          <div class="sermon-section-box prayer-sermon">
            <h4>🙏 Doa Penutup</h4>
            <p id="sermon-render-prayer">${currentOutline.closingPrayer}</p>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="sermon-footer-actions">
        <button type="button" class="btn-pill btn-soft" id="btn-copy-sermon">📋 Salin Kerangka</button>
        <button type="button" class="btn-pill btn-soft" id="btn-copy-slides">📺 Salin Teks Slide (Proyektor)</button>
        <button type="button" class="btn-pill primary glow" id="btn-voice-sermon">🎙️ Khotbahkan (ayat)</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  modal.querySelector(".apple-modal-sheet")?.addEventListener("click", (e) => e.stopPropagation());

  requestAnimationFrame(() => {
    modal.scrollIntoView({ block: "end", behavior: "smooth" });
  });

  modal.querySelector("#btn-close-sermon")?.addEventListener("click", () => modal.remove());

  modal.querySelector("#btn-copy-slides")?.addEventListener("click", () => {
    const slideText = `=== SLIDE 1: JUDUL & BACAAN ===\n${currentOutline.title}\n(${currentOutline.passage})\n\n=== SLIDE 2: POIN I ===\nI. ${currentOutline.points[0].headline}\n"${currentOutline.points[0].subtext}"\n\n=== SLIDE 3: POIN II ===\nII. ${currentOutline.points[1].headline}\n"${currentOutline.points[1].subtext}"\n\n=== SLIDE 4: POIN III ===\nIII. ${currentOutline.points[2].headline}\n"${currentOutline.points[2].subtext}"\n\n=== SLIDE 5: KOMITMEN IMAN ===\n${currentOutline.practicalApplication}`;
    navigator.clipboard.writeText(slideText);
    alert("✨ Teks Slide Proyektor berhasil disalin! Siap ditempel ke PowerPoint atau EasyWorship.");
  });

  modal.querySelectorAll(".sermon-topic-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".sermon-topic-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const title = btn.getAttribute("data-title") || "";
      const pass = btn.getAttribute("data-pass") || "";
      currentOutline = generateSermonOutline(title, pass);

      // Re-render
      const tEl = modal.querySelector("#sermon-render-title");
      const rEl = modal.querySelector("#sermon-render-ref");
      const bgEl = modal.querySelector("#sermon-render-bg");
      const ptsEl = modal.querySelector("#sermon-render-points");
      const ilEl = modal.querySelector("#sermon-render-illus");
      const apEl = modal.querySelector("#sermon-render-app");
      const prEl = modal.querySelector("#sermon-render-prayer");

      if (tEl) tEl.textContent = currentOutline.title;
      if (rEl) rEl.innerHTML = `📖 Bacaan: <strong>${escapeHtml(currentOutline.passage)}</strong>`;
      if (bgEl) bgEl.textContent = currentOutline.historicalContext;
      if (ilEl) ilEl.textContent = currentOutline.realLifeIllustration;
      if (apEl) apEl.textContent = currentOutline.practicalApplication;
      if (prEl) prEl.textContent = currentOutline.closingPrayer;
      if (ptsEl) {
        ptsEl.innerHTML = currentOutline.points.map((pt) => `
          <div class="sermon-pt-row">
            <span class="sermon-pt-num">${escapeHtml(pt.number)}</span>
            <div>
              <strong class="sermon-pt-head">${escapeHtml(pt.headline)}</strong>
              <p class="sermon-pt-sub">${escapeHtml(pt.subtext)}</p>
            </div>
          </div>
        `).join("");
      }
    });
  });

  modal.querySelector("#btn-copy-sermon")?.addEventListener("click", () => {
    const text = `KERANGKA KHOTBAH: ${currentOutline.title}\nBacaan: ${currentOutline.passage}\n\nI. ${currentOutline.points[0].headline}\nII. ${currentOutline.points[1].headline}\nIII. ${currentOutline.points[2].headline}\n\nIlustrasi: ${currentOutline.realLifeIllustration}\n\nAplikasi:\n${currentOutline.practicalApplication}\n\nDoa: ${currentOutline.closingPrayer}`;
    navigator.clipboard.writeText(text);
    alert("Kerangka khotbah berhasil disalin ke clipboard!");
  });

  modal.querySelector("#btn-voice-sermon")?.addEventListener("click", () => {
    modal.remove();
    setPreacherPersona();
    const prompt = buildSermonVoicePrompt({
      minutes: 8,
      passage: currentOutline.passage,
      title: currentOutline.title,
    });
    if (callbacks.onVoiceSermon) {
      callbacks.onVoiceSermon(currentOutline);
    } else {
      document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "voice" }));
      document.dispatchEvent(new CustomEvent("rhema-ask-voice", { detail: prompt }));
    }
  });
}
