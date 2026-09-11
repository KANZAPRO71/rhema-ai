/**
 * Rhema Daily Story Viewer — Story firman visual interaktif 4 kartu geser bertenaga AI Daily Story Engine.
 */

import {
  STORY_THEME_TEMPLATES,
  generateCustomAIDailyStory,
  getTodayAIDailyStory,
} from "./aiStoryEngine.js";

/**
 * Membuka Modal Rhema Daily Story
 * @param {object} [customStoryData]
 * @param {{ onListenVoice?: (story: object) => void }} [callbacks]
 */
export async function openDailyStoryModal(customStoryData = null, callbacks = {}) {
  let existing = document.getElementById("rhema-story-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "rhema-story-modal";
  modal.className = "apple-modal-overlay story-modal-overlay active";

  let activeIndex = 0;
  const totalSlides = 4;
  let autoAdvanceTimer = null;

  let currentStory = customStoryData;
  if (!currentStory) {
    try {
      currentStory = await getTodayAIDailyStory();
    } catch {
      currentStory = null;
    }
  }

  const title = currentStory?.theme || "Rancangan Kebaikan Allah";
  const badge = currentStory?.badge || "AI Daily Story";
  const verseRef = currentStory?.verse?.reference || "Yesaya 40:31";
  const verseText = currentStory?.verse?.text || "Tetapi orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang naik terbang dengan kekuatan sayapnya...";
  const refHeadline = currentStory?.reflection?.headline || "Melayang Bersama Roh Kudus";
  const refBody = currentStory?.reflection?.body || currentStory?.reflection || "Serahkan letihmu, biarkan anugerah-Nya mengangkatmu melampaui segala pergumulan.";
  const refTakeaway = currentStory?.reflection?.takeaway || "Ketika kekuatan fisikmu habis, kuasa Allah mulai bekerja.";
  
  const pollQ = currentStory?.interactivePoll?.question || "Apa respon iman hatimu hari ini?";
  const pollOptions = currentStory?.interactivePoll?.options || [
    { text: "🙌 Mengucap syukur atas segala keadaan", votes: 48 },
    { text: "🕊️ Menyerahkan 1 kekuatiran kepada Tuhan", votes: 32 },
    { text: "❤️ Mendoakan keluarga & sahabat", votes: 20 },
  ];

  const blessingTitle = currentStory?.blessing?.title || "Lencana Berkat Hari Ini";
  const blessingIcon = currentStory?.blessing?.icon || "🕊️";
  const confession = currentStory?.blessing?.confession || "Damai sejahtera Kristus memerintah penuh atas hidupku.";
  const prayer = currentStory?.blessing?.prayer || currentStory?.guidedPrayer || "Tuhan Yesus, kuatkan langkahku dan penuhilah hariku dengan damai-Mu. Amin.";

  modal.innerHTML = `
    <div class="story-container">
      <!-- Story Top Progress Bars -->
      <div class="story-progress-bar-wrap">
        <div class="story-bar-segment" id="sbar-0"><div class="story-bar-fill"></div></div>
        <div class="story-bar-segment" id="sbar-1"><div class="story-bar-fill"></div></div>
        <div class="story-bar-segment" id="sbar-2"><div class="story-bar-fill"></div></div>
        <div class="story-bar-segment" id="sbar-3"><div class="story-bar-fill"></div></div>
      </div>

      <!-- Story Header -->
      <div class="story-header">
        <div class="story-user-info">
          <span class="story-avatar">${blessingIcon}</span>
          <div>
            <p class="story-title">Rhema Daily Story <span class="story-ai-badge">✦ AI</span></p>
            <p class="story-subtitle">${verseRef} · ${badge}</p>
          </div>
        </div>
        <div class="story-header-tools">
          <button type="button" class="story-tool-btn" id="btn-story-voice" title="Dengarkan Suara AI Live">🎙️</button>
          <button type="button" class="story-tool-btn" id="btn-story-custom-topic" title="Pilih Topik AI Lain">✨</button>
          <button type="button" class="story-close-btn" id="btn-close-story" aria-label="Tutup Story">✕</button>
        </div>
      </div>

      <!-- Slide 1: Ayat Emas -->
      <div class="story-slide active" data-slide="0">
        <div class="story-slide-content golden-card">
          <span class="story-kicker">✨ Ayat Pegangan Hari Ini</span>
          <blockquote class="story-verse">&ldquo;${verseText}&rdquo;</blockquote>
          <p class="story-verse-ref">${verseRef} · Terjemahan Baru</p>
        </div>
      </div>

      <!-- Slide 2: Refleksi 30 Detik -->
      <div class="story-slide hidden" data-slide="1">
        <div class="story-slide-content reflection-card">
          <span class="story-kicker">💡 Refleksi Cepat 30 Detik</span>
          <h3 class="story-theme-heading">${refHeadline}</h3>
          <p class="story-reflection-text">${refBody}</p>
          <div class="story-takeaway-box">
            <span class="takeaway-icon">🎯</span>
            <p class="takeaway-text"><strong>Inti:</strong> ${refTakeaway}</p>
          </div>
        </div>
      </div>

      <!-- Slide 3: Pertanyaan Iman Interaktif -->
      <div class="story-slide hidden" data-slide="2">
        <div class="story-slide-content interactive-card">
          <span class="story-kicker">🎯 Respon Hati Interaktif</span>
          <h3 class="story-poll-title">${pollQ}</h3>
          <div class="story-poll-options">
            ${pollOptions.map((opt, i) => `
              <button type="button" class="story-poll-btn" data-poll-idx="${i}">
                <span class="poll-text">${opt.text}</span>
                <span class="poll-percent hidden">${opt.votes}%</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Slide 4: Lencana Berkat -->
      <div class="story-slide hidden" data-slide="3">
        <div class="story-slide-content blessing-card">
          <span class="story-kicker">🙏 Doa &amp; Pengurapan Hari Ini</span>
          <div class="story-badge-hero">
            <span class="badge-icon-large">${blessingIcon}</span>
            <h4 class="badge-title-large">${blessingTitle}</h4>
            <p class="confession-text">&ldquo;${confession}&rdquo;</p>
          </div>
          <blockquote class="story-prayer-text">${prayer}</blockquote>
          <div class="story-finish-wrap">
            <button type="button" class="btn-pill primary glow" id="btn-story-finish">✓ Selesai &amp; Terima Lencana</button>
          </div>
        </div>
      </div>

      <!-- Tap Area Navigation -->
      <div class="story-nav-tap left" id="tap-story-prev"></div>
      <div class="story-nav-tap right" id="tap-story-next"></div>
    </div>
  `;

  document.body.appendChild(modal);

  function showSlide(idx) {
    if (idx < 0) {
      activeIndex = 0;
      return;
    }
    if (idx >= totalSlides) {
      closeStory();
      return;
    }
    activeIndex = idx;

    modal.querySelectorAll(".story-slide").forEach((s, i) => {
      s.classList.toggle("active", i === idx);
      s.classList.toggle("hidden", i !== idx);
    });

    modal.querySelectorAll(".story-bar-segment").forEach((bar, i) => {
      const fill = bar.querySelector(".story-bar-fill");
      if (!fill) return;
      if (i < idx) {
        fill.style.width = "100%";
      } else if (i === idx) {
        fill.style.width = "100%";
      } else {
        fill.style.width = "0%";
      }
    });
  }

  function closeStory(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    document.removeEventListener("keydown", onKeyDown);
    modal.remove();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") closeStory();
    else if (e.key === "ArrowLeft") showSlide(activeIndex - 1);
    else if (e.key === "ArrowRight") showSlide(activeIndex + 1);
  }

  document.addEventListener("keydown", onKeyDown);

  const closeBtn = modal.querySelector("#btn-close-story");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeStory);
    closeBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  }

  const finishBtn = modal.querySelector("#btn-story-finish");
  if (finishBtn) {
    finishBtn.addEventListener("click", closeStory);
  }

  // Suara AI Live
  modal.querySelector("#btn-story-voice")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeStory();
    if (callbacks.onListenVoice) {
      callbacks.onListenVoice(currentStory);
    } else {
      document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "voice" }));
      document.dispatchEvent(
        new CustomEvent("rhema-ask-voice", {
          detail: `Bacakan Daily Story firman hari ini tentang "${title}" dari ${verseRef}: "${verseText}". Berikan refleksi 30 detik dan pimpin doa pengurapan.`,
        })
      );
    }
  });

  // Ganti Topik AI Story
  modal.querySelector("#btn-story-custom-topic")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const topicMenu = STORY_THEME_TEMPLATES.map((t, i) => `${i + 1}. ${t.label}`).join("\n");
    const chosen = prompt(`Pilih / ketik tema cerita firman AI yang ingin Anda renungkan hari ini:\n\n${topicMenu}\n\nKetik nomor (1-8) atau topik bebas:`);
    if (chosen) {
      const num = parseInt(chosen.trim(), 10);
      const selectedTheme = !isNaN(num) && STORY_THEME_TEMPLATES[num - 1] ? STORY_THEME_TEMPLATES[num - 1].id : chosen;
      const newStory = await generateCustomAIDailyStory(selectedTheme);
      modal.remove();
      openDailyStoryModal(newStory, callbacks);
    }
  });

  modal.querySelector("#tap-story-prev")?.addEventListener("click", (e) => {
    e.stopPropagation();
    showSlide(activeIndex - 1);
  });

  modal.querySelector("#tap-story-next")?.addEventListener("click", (e) => {
    e.stopPropagation();
    showSlide(activeIndex + 1);
  });

  modal.querySelectorAll(".story-poll-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      btn.classList.add("selected");
      btn.querySelector(".poll-percent")?.classList.remove("hidden");
      setTimeout(() => showSlide(activeIndex + 1), 650);
    });
  });

  showSlide(0);
}
