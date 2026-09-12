/**
 * Rhema AI - Alkitab Super Features Hub
 * 1. Mood-Based Scripture Selector (Pencari Firman Sesuai Suasana Hati)
 * 2. Cerita Alkitab Pengantar Tidur (Bedtime Bible Sleep Stories)
 * Kuis Alkitab harian → dailyQuizEngine.js + homeWorship.js (Beranda)
 */

import { speakIndonesianText, stopSpeaking, ambientEngine } from "./ambientAudio.js";
import { isGlobalUiLang } from "./localeProfile.js";
import { getDailyMoodScripture } from "./moodScriptureEngine.js";
import { t } from "./uiStrings.js";
import { formatMoodSummaryDate, localizedMoodChips } from "./worshipUiI18n.js";
import { SLEEP_STORY_EN } from "./sleepStoryI18n.js";

/** @type {{ onOpenVerse?: (ref: string) => void, onAskVoice?: (text: string) => void }} */
let moodFeatureCallbacks = {};

/** @param {string} s */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ==========================================
// 1. MOOD / SUASANA HATI — rotasi harian via moodScriptureEngine.js
// ==========================================

// ==========================================
// 2. CERITA ALKITAB PENGANTAR TIDUR (SLEEP STORIES)
// ==========================================
export const SLEEP_STORIES = [
  {
    id: "badai-galilea",
    title: "Ketenangan di Danau Galilea",
    duration: "10 Menit",
    bgSound: "water",
    desc: "Merenungkan kuasa Yesus yang meredakan badai dan memberi ketenteraman dalam jiwa.",
    script: `Tarik nafas dalam-dalam... hembuskan perlahan. Biarkan seluruh ketegangan harimu mencair. 
Malam ini, bayangkan engkau berada di atas sebuah perahu di Danau Galilea. Angin sepoi-sepoi membelai wajahmu.
Ketika ombak besar mulai bergelora, murid-murid merasa cemas. Namun Yesus sedang tertidur dengan tenang di buritan.
Dengan penuh wibawa dan kasih, Yesus bangkit dan berkata kepada angin dan danau: 'Diam! Tenanglah!'
Seketika itu juga angin reda dan danau menjadi sunyi senyap. 
Yesus menatapmu dengan penuh kelembutan malam ini: 'Mengapa engkau takut? Percayalah pada-Ku.'
Damai sejahtera Allah yang melampaui segala akal kini memenuhi ruangan tempatmu beristirahat. Tidurlah dalam dekapan kasih-Nya yang abadi... Amin.`
  },
  {
    id: "mazmur-23-tidur",
    title: "Padang Hijau & Air yang Tenang",
    duration: "12 Menit",
    bgSound: "stream",
    desc: "Perjalanan meditatif menyusuri Mazmur 23 bersama Sang Gembala yang Baik.",
    script: `Pejamkan matamu... rasakan detak nafasmu yang semakin teratur dan rileks.
TUHAN adalah gembalamu, takkan kekurangan engkau.
Ia membaringkan engkau di padang yang berumput hijau yang sejuk dan empuk.
Ia membimbingmu ke air yang tenang, menyegarkan jiwamu yang letih setelah seharian berjuang.
Sekalipun engkau berjalan dalam lembah yang gelap, janganlah takut, gada-Nya dan tongkat-Nya selalu menghiburmu.
Kebaikan dan kemurahan Tuhan pasti mengikuti engkau seumur hidupmu. 
Malam ini, tidurlah dengan aman dan tenang. Malaikat-malaikat Tuhan menjaga peraduanmu... Amin.`
  },
  {
    id: "bintang-betlehem",
    title: "Malam Kudus di Padang Efrata",
    duration: "15 Menit",
    bgSound: "wind",
    desc: "Kedamaian malam kelahiran Sang Juru Selamat di bawah naungan jutaan bintang.",
    script: `Rasakan kehangatan dan keheningan malam ini.
Bayangkan padang rumput Betlehem yang sunyi di bawah langit malam bertabur bintang gemerlap.
Para gembala sedang berbaring menjaga kawanan domba, ketika cahaya kemuliaan Tuhan melingkupi mereka.
Bala tentara surga bersorak lembut: 'Kemuliaan bagi Allah di tempat yang mahatinggi dan damai sejahtera di bumi di antara manusia yang berkenan kepada-Nya.'
Kristus telah datang membawa damai sejati ke dalam hatimu.
Tidak ada lagi ketakutan, tidak ada lagi kekhawatiran. Beristirahatlah dalam terang kasih-Nya yang kekal... Amin.`
  },
];

// ==========================================
// 4. INTERACTIVE DOM INITIALIZERS & RENDERERS
// ==========================================

export function initAlkitabPowerFeatures(callbacks = {}) {
  moodFeatureCallbacks = callbacks;
  initMoodChips(callbacks.onOpenVerse, callbacks.onAskVoice);
  initSleepStories(callbacks.onAskVoice);
}

document.addEventListener("rhema-locale-alkitab-refresh", () => {
  initMoodChips(moodFeatureCallbacks.onOpenVerse, moodFeatureCallbacks.onAskVoice);
  initSleepStories(moodFeatureCallbacks.onAskVoice);
});

// ---------------- MOOD SCRIPTURE ----------------
function renderMoodSummary(activeLabel = "") {
  const summaryEl = document.getElementById("mood-scripture-summary");
  if (!summaryEl) return;

  const chips = localizedMoodChips();
  const today = formatMoodSummaryDate();

  summaryEl.innerHTML = `
    <span class="mood-summary-chip">${escapeHtml(t("mood.summary.feelings", { count: String(chips.length) }))}</span>
    <span class="mood-summary-chip">${escapeHtml(t("mood.summary.rotation"))}</span>
    <span class="mood-summary-chip mood-summary-chip--today">${escapeHtml(today)}</span>
    ${activeLabel ? `<span class="mood-summary-chip mood-summary-chip--active">${activeLabel}</span>` : ""}
  `;
}

function initMoodChips(onOpenVerse, onAskVoice) {
  const container = document.getElementById("alkitab-mood-chips");
  const resultBox = document.getElementById("alkitab-mood-result");
  if (!container || !resultBox) return;

  renderMoodSummary();

  const chips = localizedMoodChips();
  container.innerHTML = chips
    .map(
      (m) => `<button type="button" class="mood-squircle tone-${m.id}" data-mood="${m.id}">
      <span class="mood-squircle-emoji">${m.emoji}</span>
      <span class="mood-squircle-label">${m.label}</span>
    </button>`,
    )
    .join("");

  container.querySelectorAll(".mood-squircle").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".mood-squircle").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const moodId = btn.getAttribute("data-mood");
      const item = moodId ? getDailyMoodScripture(moodId) : null;
      if (!item) return;

      renderMoodSummary(item.label);

      resultBox.innerHTML = `
        <div class="mood-res-head">
          <span class="mood-res-title">${item.emoji} ${item.title}</span>
          <span class="mood-res-badge">${item.verse}</span>
        </div>
        <p class="mood-res-daily-note">${escapeHtml(t("mood.result.daily", { n: String(item.variationIndex + 1), total: String(item.poolSize) }))}</p>
        <p class="mood-res-text">"${item.text}"</p>
        <p class="mood-res-devotion">💡 <em>${item.devotion}</em></p>
        <div class="mood-res-actions">
          <button type="button" class="btn-pill primary" id="btn-mood-read-verse">${escapeHtml(t("mood.btn.open"))}</button>
          <button type="button" class="btn-pill btn-soft" id="btn-mood-listen-audio">${escapeHtml(t("mood.btn.listen"))}</button>
          <button type="button" class="btn-pill btn-soft" id="btn-mood-ask-ai">${escapeHtml(t("mood.btn.pray"))}</button>
        </div>
      `;
      resultBox.classList.remove("hidden");
      resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });

      resultBox.querySelector("#btn-mood-read-verse")?.addEventListener("click", () => {
        if (onOpenVerse) onOpenVerse(item.verse);
      });

      resultBox.querySelector("#btn-mood-listen-audio")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onAskVoice) {
          const lead =
            isGlobalUiLang()
              ? `I feel ${item.label}. Read and reflect on ${item.verse}: "${item.text}". ${item.devotion}`
              : `Saya merasa ${item.label}. Bacakan dan renungkan ayat ${item.verse}: "${item.text}". ${item.devotion}`;
          onAskVoice(lead);
        }
      });

      resultBox.querySelector("#btn-mood-ask-ai")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onAskVoice) {
          const lead =
            isGlobalUiLang()
              ? `I'm feeling ${item.label}. God's word from ${item.verse} says: "${item.text}". Give Scripture guidance and lead a comforting prayer for me.`
              : `Saya sedang merasa ${item.label}. Firman Tuhan dari ${item.verse} berkata: "${item.text}". Berikan bimbingan firman dan pimpinlah doa penghiburan bagi saya.`;
          onAskVoice(lead);
        }
      });
    });
  });
}

// ---------------- SLEEP STORIES ----------------
/** @param {typeof SLEEP_STORIES[number]} story */
function localizeSleepStory(story) {
  if (!isGlobalUiLang()) return story;
  const en = SLEEP_STORY_EN[story.id];
  if (!en) return story;
  return {
    ...story,
    title: en.title ?? story.title,
    duration: en.duration ?? story.duration,
    desc: en.desc ?? story.desc,
    script: en.script ?? story.script,
    _ambientLabels: en.ambient,
  };
}

/** @returns {ReturnType<typeof localizeSleepStory>[]} */
function getLocalizedSleepStories() {
  return SLEEP_STORIES.map(localizeSleepStory);
}

/** @param {ReturnType<typeof localizeSleepStory>} story */
function buildSleepVoicePrompt(story) {
  if (isGlobalUiLang()) {
    return `Read this bedtime Bible story in a soft, calm, slow voice — like a shepherd soothing the soul before sleep.

Title: "${story.title}"
Target length: ${story.duration}
Mood: ${story.desc}

Narration (gentle tone, natural pauses between paragraphs):
${story.script}

End with a brief prayer and "Good night, God bless you."`;
  }
  return `Bacakan cerita Alkitab pengantar tidur dengan suara lembut, tenang, dan perlahan — seperti gembala yang menenangkan jiwa sebelum tidur.

Judul: "${story.title}"
Durasi target: ${story.duration}
Suasana: ${story.desc}

Narasi (bacakan dengan nada teduh, jeda natural antar paragraf):
${story.script}

Akhiri dengan doa singkat dan "Selamat tidur, Tuhan memberkati."`;
}

/** @param {ReturnType<typeof localizeSleepStory>} story */
function sleepAmbientLabel(story) {
  const id = story.bgSound;
  const key = `sleep.ambient.${id}`;
  const localized = t(key);
  return localized !== key ? localized : id;
}

function initSleepStories(onAskVoice) {
  const list = document.getElementById("alkitab-sleep-list");
  const player = document.getElementById("alkitab-sleep-player");
  if (!list || !player) return;

  list.innerHTML = getLocalizedSleepStories().map((s) => {
    const ambientLabel = sleepAmbientLabel(s);
    return `
      <article class="sleep-visual-card" data-id="${s.id}">
        <div class="sleep-visual-meta">
          <span class="sleep-visual-duration">🌙 ${escapeHtml(s.duration)}</span>
          <span class="sleep-visual-ambient">🌿 ${escapeHtml(ambientLabel)}</span>
        </div>
        <h4 class="sleep-visual-title">${escapeHtml(s.title)}</h4>
        <p class="sleep-visual-desc">${escapeHtml(s.desc)}</p>
        <button type="button" class="sleep-play-bar btn-play-sleep" aria-label="${escapeHtml(t("sleep.playAria", { title: s.title }))}">${escapeHtml(t("sleep.playBtn"))}</button>
      </article>
    `;
  }).join("");

  list.querySelectorAll(".sleep-visual-card").forEach((card) => {
    card.querySelector(".btn-play-sleep")?.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const story = getLocalizedSleepStories().find((s) => s.id === id);
      if (!story) return;

      // Jalankan musik latar ambient
      try { ambientEngine.play(story.bgSound || "water", 0.22); } catch {}

      player.innerHTML = `
        <div class="sleep-player-card sleep-player-inner">
          <div class="sleep-player-head">
            <span class="sleep-player-icon">🌙</span>
            <div class="sleep-player-head-text">
              <h4 class="sleep-player-title">${escapeHtml(story.title)}</h4>
              <p class="sleep-player-meta">${escapeHtml(t("sleep.playerMeta"))}</p>
            </div>
            <button type="button" class="btn-box-close sleep-player-close" id="btn-close-sleep" aria-label="${escapeHtml(t("sleep.closeAria"))}">✕</button>
          </div>
          <div class="sleep-script-preview">
            <p>${escapeHtml(story.script).replace(/\n/g, "<br>")}</p>
          </div>
          <div class="sleep-player-controls">
            <button type="button" class="btn-pill primary" id="btn-narrate-sleep">${escapeHtml(t("sleep.narrateBtn"))}</button>
            <button type="button" class="btn-pill btn-soft sleep-stop-btn" id="btn-stop-sleep">${escapeHtml(t("sleep.stopBtn"))}</button>
          </div>
        </div>
      `;
      player.classList.remove("hidden");
      player.scrollIntoView({ behavior: "smooth", block: "nearest" });

      const narrateSleep = () => {
        if (onAskVoice) {
          onAskVoice(buildSleepVoicePrompt(story));
        } else {
          speakIndonesianText(story.script);
        }
      };

      narrateSleep();

      player.querySelector("#btn-narrate-sleep")?.addEventListener("click", () => {
        narrateSleep();
      });

      player.querySelector("#btn-stop-sleep")?.addEventListener("click", () => {
        stopSpeaking();
        ambientEngine.stop();
        document.dispatchEvent(new CustomEvent("rhema-audio-stop-all", { detail: { forceAmbientStop: true } }));
      });

      player.querySelector("#btn-close-sleep")?.addEventListener("click", () => {
        stopSpeaking();
        ambientEngine.stop();
        document.dispatchEvent(new CustomEvent("rhema-audio-stop-all", { detail: { forceAmbientStop: true } }));
        player.classList.add("hidden");
      });
    });
  });
}
