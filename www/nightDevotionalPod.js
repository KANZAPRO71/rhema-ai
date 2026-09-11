/**
 * Renungan Malam — modal pengantar tidur dengan musik latar & voice AI singkat.
 */

import { ambientEngine, cancelSleepTimer, startSleepTimer, stopSpeaking } from "./ambientAudio.js";
import {
  NIGHT_POD_AMBIENT_MINUTES,
  NIGHT_POD_SLEEP_POOL,
  NIGHT_POD_SPEECH_MINUTES,
  buildNightPodVoicePrompt,
  resolveNightPodSession,
} from "./nightPodEngine.js";

export { NIGHT_POD_SLEEP_POOL as NIGHT_POD_EPISODES, buildNightPodVoicePrompt };

const NIGHT_POD_AMBIENT_VOLUME = 0.24;
const DEFAULT_AMBIENT_VOLUME = 0.18;

let nightPodSpeechCapTimer = null;
let nightPodPreviewOnly = false;

/** @param {string} [preset] */
export function beginNightPodAmbient(preset = "harp") {
  nightPodPreviewOnly = false;
  window.__rhemaNightPodAmbientActive = true;
  window.__rhemaNightPodAmbientPreset = preset || "harp";
  ambientEngine.setVolume(NIGHT_POD_AMBIENT_VOLUME);
  ambientEngine.start(window.__rhemaNightPodAmbientPreset);
}

/** @param {string} [preset] */
export function previewNightPodAmbient(preset = "harp") {
  if (window.__rhemaNightPodAmbientActive && !nightPodPreviewOnly) return;
  nightPodPreviewOnly = true;
  window.__rhemaNightPodAmbientActive = false;
  ambientEngine.setVolume(NIGHT_POD_AMBIENT_VOLUME);
  ambientEngine.start(preset || "harp");
}

export function stopNightPodAmbientPreview() {
  if (!nightPodPreviewOnly || window.__rhemaNightPodAmbientActive) return;
  nightPodPreviewOnly = false;
  ambientEngine.setVolume(DEFAULT_AMBIENT_VOLUME);
  ambientEngine.stop();
}

export function ensureNightPodAmbient() {
  if (!window.__rhemaNightPodAmbientActive) return;
  const preset = window.__rhemaNightPodAmbientPreset || "harp";
  if (!ambientEngine.isPlaying) {
    ambientEngine.setVolume(NIGHT_POD_AMBIENT_VOLUME);
    ambientEngine.start(preset);
  }
}

export function endNightPodAmbient() {
  window.__rhemaNightPodAmbientActive = false;
  window.__rhemaNightPodAmbientPreset = "";
  nightPodPreviewOnly = false;
  ambientEngine.setVolume(DEFAULT_AMBIENT_VOLUME);
  ambientEngine.stop();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function scheduleNightPodSpeechCap() {
  clearNightPodSpeechCap();
  nightPodSpeechCapTimer = setTimeout(() => {
    stopSpeaking();
    document.dispatchEvent(
      new CustomEvent("rhema-audio-stop-all", {
        detail: { keepVoiceSession: false, keepAmbient: true },
      }),
    );
    nightPodSpeechCapTimer = null;
  }, NIGHT_POD_SPEECH_MINUTES * 60 * 1000);
}

export function clearNightPodSpeechCap() {
  if (nightPodSpeechCapTimer) {
    clearTimeout(nightPodSpeechCapTimer);
    nightPodSpeechCapTimer = null;
  }
}

function formatPodHint(ambientMinutes) {
  return `Renungan AI ±${NIGHT_POD_SPEECH_MINUTES} menit · musik latar ${ambientMinutes} menit`;
}

export function showNightPodTimerBadge(label) {
  const badge = document.getElementById("night-pod-timer-badge");
  if (!badge) return;
  badge.textContent = `🌙 Timer tidur ${label}`;
  badge.classList.remove("hidden");
}

export function hideNightPodTimerBadge() {
  const badge = document.getElementById("night-pod-timer-badge");
  if (!badge) return;
  badge.classList.add("hidden");
}

/** @param {HTMLElement} modal @param {import("./nightPodEngine.js").NightPodEpisode[]} episodes @param {number} epIdx */
function renderEpisodeDisplay(modal, episodes, epIdx) {
  const ep = episodes[epIdx];
  if (!ep) return;
  const tEl = modal.querySelector("#night-pod-render-title");
  const rEl = modal.querySelector("#night-pod-render-ref");
  const dEl = modal.querySelector("#night-pod-render-desc");
  const tbEl = modal.querySelector("#night-pod-render-tb");
  if (tEl) tEl.textContent = ep.title;
  if (rEl) rEl.textContent = `📖 ${ep.reference || ep.scripture}`;
  if (dEl) dEl.textContent = ep.description;
  if (tbEl) {
    if (ep.tbText) {
      tbEl.textContent = `"${ep.tbText}"`;
      tbEl.classList.remove("hidden");
    } else {
      tbEl.textContent = "";
      tbEl.classList.add("hidden");
    }
  }
}

/**
 * @param {import("./nightPodEngine.js").NightPodEpisode} featured
 * @param {import("./nightPodEngine.js").NightPodEpisode[]} episodes
 * @param {number} defaultIdx
 * @param {string} weeklyLabel
 * @param {number} selectedMinutes
 */
function buildModalHtml(featured, episodes, defaultIdx, weeklyLabel, selectedMinutes) {
  return `
    <div class="apple-modal-sheet night-pod-sheet">
      <div class="modal-handle-bar"></div>
      <div class="night-pod-head">
        <div class="pod-title-wrap">
          <span class="pod-badge">🌙 Pengantar Tidur Nyenyak</span>
          <h2 class="pod-sheet-title">Renungan Malam</h2>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-pod">✕</button>
      </div>

      <div class="night-pod-sheet-body">
      <div class="night-pod-tonight-chip">${weeklyLabel}</div>

      <div class="night-pod-display">
        <div class="night-pod-glow-disc">
          <span class="pod-moon-icon">🌙</span>
        </div>
        <h3 class="night-pod-title" id="night-pod-render-title">${escapeHtml(featured.title)}</h3>
        <p class="night-pod-ref" id="night-pod-render-ref">📖 ${escapeHtml(featured.reference || featured.scripture)}</p>
        <p class="night-pod-desc" id="night-pod-render-desc">${escapeHtml(featured.description)}</p>
        <p class="night-pod-tb-text ${featured.tbText ? "" : "hidden"}" id="night-pod-render-tb">${featured.tbText ? `"${escapeHtml(featured.tbText)}"` : ""}</p>
        <p class="night-pod-timer-hint" id="night-pod-timer-hint">${formatPodHint(selectedMinutes)}</p>
      </div>

      <div class="pod-episodes-bar">
        ${episodes.map((ep, idx) => `
          <button type="button" class="pod-ep-pill ${idx === defaultIdx ? "active" : ""}" data-idx="${idx}">
            ${ep.badge ? `${escapeHtml(ep.badge)} · ` : ""}${escapeHtml(ep.scripture)}${idx === defaultIdx ? " ★" : ""}
          </button>
        `).join("")}
      </div>

      <div class="pod-ambient-section">
        <label class="pod-tool-label">Musik Latar Suasana:</label>
        <div class="pod-ambient-row">
          <button type="button" class="pod-amb-btn active" data-amb="harp">🕊️ Kecapi</button>
          <button type="button" class="pod-amb-btn" data-amb="galilee">🌊 Galilea</button>
          <button type="button" class="pod-amb-btn" data-amb="rain">🌧️ Hujan</button>
          <button type="button" class="pod-amb-btn" data-amb="temple">🏛️ Bait Suci</button>
        </div>
      </div>

      <div class="pod-timer-section">
        <label class="pod-tool-label">Timer Musik Latar (hemat token):</label>
        <div class="pod-timer-row">
          ${NIGHT_POD_AMBIENT_MINUTES.map((mins) => `
            <button type="button" class="pod-time-btn ${mins === selectedMinutes ? "active" : ""}" data-time="${mins}">${mins} Menit</button>
          `).join("")}
        </div>
        <p class="pod-timer-note">Suara AI dibatasi ±${NIGHT_POD_SPEECH_MINUTES} menit · teks ayat dari TB offline.</p>
      </div>
      </div>

      <div class="pod-action-footer">
        <button type="button" class="btn-pill primary full glow" id="btn-start-night-pod">
          🎙️ Mulai Renungan &amp; Meditasi Tidur
        </button>
      </div>
    </div>
  `;
}

/**
 * @param {{ onStartVoicePod?: (episode: object, ambient: string, minutes: number, voicePrompt: string) => void, onPodComplete?: () => void }} [callbacks]
 */
export async function openNightDevotionalPodModal(callbacks = {}) {
  let existing = document.getElementById("night-pod-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "night-pod-modal";
  modal.className = "apple-modal-overlay active";
  modal.innerHTML = `
    <div class="apple-modal-sheet night-pod-sheet night-pod-sheet--loading">
      <p class="night-pod-loading">Memuat ayat TB &amp; renungan malam…</p>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => {
    stopNightPodAmbientPreview();
    modal.remove();
  };

  modal.querySelector("#btn-close-pod")?.addEventListener("click", closeModal);

  let episodes = [];
  let defaultIdx = 0;
  let weeklyLabel = "Renungan malam";
  try {
    const session = await resolveNightPodSession();
    episodes = session.episodes;
    defaultIdx = session.defaultIdx;
    weeklyLabel = session.weeklyLabel;
  } catch (err) {
    console.warn("[rhema] resolveNightPodSession:", err);
    episodes = NIGHT_POD_SLEEP_POOL.slice(0, 3).map((p) => ({ ...p, reference: p.scripture, tbText: "", tbFound: false }));
  }

  let selectedEpIdx = defaultIdx;
  let selectedAmbient = "harp";
  const defaultAmbient = NIGHT_POD_AMBIENT_MINUTES[1] ?? 5;
  let selectedMinutes = defaultAmbient;
  const featured = episodes[defaultIdx] || episodes[0];

  modal.innerHTML = buildModalHtml(featured, episodes, defaultIdx, weeklyLabel, selectedMinutes);

  modal.querySelector("#btn-close-pod")?.addEventListener("click", closeModal);

  modal.querySelectorAll(".pod-ep-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".pod-ep-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedEpIdx = Number(btn.getAttribute("data-idx") || 0);
      renderEpisodeDisplay(modal, episodes, selectedEpIdx);
    });
  });

  modal.querySelectorAll(".pod-amb-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".pod-amb-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedAmbient = btn.getAttribute("data-amb") || "harp";
      previewNightPodAmbient(selectedAmbient);
    });
  });

  modal.querySelectorAll(".pod-time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".pod-time-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMinutes = Number(btn.getAttribute("data-time") || defaultAmbient);
      const hint = modal.querySelector("#night-pod-timer-hint");
      if (hint) hint.textContent = formatPodHint(selectedMinutes);
    });
  });

  modal.querySelector("#btn-start-night-pod")?.addEventListener("click", () => {
    const ep = episodes[selectedEpIdx];
    if (!ep) return;
    modal.remove();
    stopNightPodAmbientPreview();

    beginNightPodAmbient(selectedAmbient);
    showNightPodTimerBadge(`${selectedMinutes}:00`);

    startSleepTimer(
      selectedMinutes,
      (tick) => showNightPodTimerBadge(tick.label),
      () => {
        clearNightPodSpeechCap();
        hideNightPodTimerBadge();
        endNightPodAmbient();
        stopSpeaking();
        callbacks.onPodComplete?.();
      },
      { startAmbient: false },
    );

    scheduleNightPodSpeechCap();

    const voicePrompt = buildNightPodVoicePrompt(ep);
    if (callbacks.onStartVoicePod) {
      callbacks.onStartVoicePod(ep, selectedAmbient, selectedMinutes, voicePrompt);
    } else {
      document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "voice" }));
      document.dispatchEvent(new CustomEvent("rhema-ask-voice", { detail: voicePrompt }));
    }
  });
}

export function cancelNightPodSession() {
  cancelSleepTimer();
  clearNightPodSpeechCap();
  hideNightPodTimerBadge();
  endNightPodAmbient();
  stopSpeaking();
}
