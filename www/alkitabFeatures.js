/**
 * Rhema AI - Alkitab Super Features Hub
 * 1. Mood-Based Scripture Selector (Pencari Firman Sesuai Suasana Hati)
 * 2. Cerita Alkitab Pengantar Tidur (Bedtime Bible Sleep Stories)
 * Kuis Alkitab harian → dailyQuizEngine.js + homeWorship.js (Beranda)
 */

import { speakIndonesianText, stopSpeaking, ambientEngine } from "./ambientAudio.js";
import { getDailyMoodScripture, listMoodChips } from "./moodScriptureEngine.js";

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
  const { onOpenVerse, onAskVoice } = callbacks;

  initMoodChips(onOpenVerse, onAskVoice);
  initSleepStories(onAskVoice);
}

// ---------------- MOOD SCRIPTURE ----------------
function renderMoodSummary(activeLabel = "") {
  const summaryEl = document.getElementById("mood-scripture-summary");
  if (!summaryEl) return;

  const chips = listMoodChips();
  const today = new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

  summaryEl.innerHTML = `
    <span class="mood-summary-chip">${chips.length} perasaan</span>
    <span class="mood-summary-chip">4 ayat · rotasi harian</span>
    <span class="mood-summary-chip mood-summary-chip--today">${today}</span>
    ${activeLabel ? `<span class="mood-summary-chip mood-summary-chip--active">${activeLabel}</span>` : ""}
  `;
}

function initMoodChips(onOpenVerse, onAskVoice) {
  const container = document.getElementById("alkitab-mood-chips");
  const resultBox = document.getElementById("alkitab-mood-result");
  if (!container || !resultBox) return;

  renderMoodSummary();

  const chips = listMoodChips();
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
        <p class="mood-res-daily-note">Firman hari ini · variasi ${item.variationIndex + 1}/${item.poolSize}</p>
        <p class="mood-res-text">"${item.text}"</p>
        <p class="mood-res-devotion">💡 <em>${item.devotion}</em></p>
        <div class="mood-res-actions">
          <button type="button" class="btn-pill primary" id="btn-mood-read-verse">📖 Buka Ayat</button>
          <button type="button" class="btn-pill btn-soft" id="btn-mood-listen-audio">🔊 Dengar Live</button>
          <button type="button" class="btn-pill btn-soft" id="btn-mood-ask-ai">✨ Doakan Bersama AI</button>
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
          onAskVoice(
            `Saya merasa ${item.label}. Bacakan dan renungkan ayat ${item.verse}: "${item.text}". ${item.devotion}`,
          );
        }
      });

      resultBox.querySelector("#btn-mood-ask-ai")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onAskVoice) {
          onAskVoice(`Saya sedang merasa ${item.label}. Firman Tuhan dari ${item.verse} berkata: "${item.text}". Berikan bimbingan firman dan pimpinlah doa penghiburan bagi saya.`);
        }
      });
    });
  });
}

// ---------------- SLEEP STORIES ----------------
function buildSleepVoicePrompt(story) {
  return `Bacakan cerita Alkitab pengantar tidur dengan suara lembut, tenang, dan perlahan — seperti gembala yang menenangkan jiwa sebelum tidur.

Judul: "${story.title}"
Durasi target: ${story.duration}
Suasana: ${story.desc}

Narasi (bacakan dengan nada teduh, jeda natural antar paragraf):
${story.script}

Akhiri dengan doa singkat dan "Selamat tidur, Tuhan memberkati."`;
}

function initSleepStories(onAskVoice) {
  const list = document.getElementById("alkitab-sleep-list");
  const player = document.getElementById("alkitab-sleep-player");
  if (!list || !player) return;

  list.innerHTML = SLEEP_STORIES.map((s) => {
    const ambientLabel = { water: "Air", stream: "Sungai", wind: "Angin" }[s.bgSound] || s.bgSound;
    return `
      <article class="sleep-visual-card" data-id="${s.id}">
        <div class="sleep-visual-meta">
          <span class="sleep-visual-duration">🌙 ${s.duration}</span>
          <span class="sleep-visual-ambient">🌿 ${ambientLabel}</span>
        </div>
        <h4 class="sleep-visual-title">${s.title}</h4>
        <p class="sleep-visual-desc">${s.desc}</p>
        <button type="button" class="sleep-play-bar btn-play-sleep" aria-label="Putar ${s.title}">▶ Putar Cerita</button>
      </article>
    `;
  }).join("");

  list.querySelectorAll(".sleep-visual-card").forEach((card) => {
    card.querySelector(".btn-play-sleep")?.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const story = SLEEP_STORIES.find((s) => s.id === id);
      if (!story) return;

      // Jalankan musik latar ambient
      try { ambientEngine.play(story.bgSound || "water", 0.22); } catch {}

      player.innerHTML = `
        <div class="sleep-player-card sleep-player-inner">
          <div class="sleep-player-head">
            <span class="sleep-player-icon">🌙</span>
            <div class="sleep-player-head-text">
              <h4 class="sleep-player-title">${story.title}</h4>
              <p class="sleep-player-meta">Narasi teduh · musik latar aktif</p>
            </div>
            <button type="button" class="btn-box-close sleep-player-close" id="btn-close-sleep" aria-label="Tutup pemutar">✕</button>
          </div>
          <div class="sleep-script-preview">
            <p>${story.script.replace(/\n/g, "<br>")}</p>
          </div>
          <div class="sleep-player-controls">
            <button type="button" class="btn-pill primary" id="btn-narrate-sleep">🔊 Putar Narasi Live</button>
            <button type="button" class="btn-pill btn-soft sleep-stop-btn" id="btn-stop-sleep">⏹️ Berhenti</button>
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
