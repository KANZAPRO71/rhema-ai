/**
 * Emotion chips & guided prayer grid — inline voice sessions di tab Renungan.
 */
import { ambientEngine, forceStopAmbientAndSpeech } from "./ambientAudio.js";
import { getEmotionContent } from "./aiEmotionEngine.js";
import { getGuidedPrayerContent } from "./aiGuidedPrayerEngine.js";
import { createEmotionSessionController } from "./emotionSessionEngine.js";
import { createGuidedPrayerSessionController } from "./guidedPrayerSessionEngine.js";
import { escapeHtml } from "./markdown.js";
import { t } from "./uiStrings.js";
import {
  localizedEmotionSessionPhases,
  localizedEmotions,
  localizedGuidedPrayerSessionPhases,
  localizedPrayerPresets,
} from "./worshipUiI18n.js";

const EMOTION_PLAYBACK_MAX_MS = {
  opening: 90_000,
  reflection: 5 * 60 * 1000,
  prayer: 3 * 60 * 1000,
};

const GUIDED_PRAYER_PLAYBACK_MAX_MS = {
  opening: 90_000,
  prayer: 5 * 60 * 1000,
};

/** @type {{
 *   markTodayRead?: () => void,
 *   markInlineVoiceTap?: () => void,
 *   voiceTransport?: import("../shared/chatCore.js").ChatTransport | null,
 *   speakInlineSessionPhase?: (prompt: string, onTurnComplete?: () => void) => void,
 *   waitInlineSessionPlaybackIdle?: (
 *     getPhaseId: () => string | null | undefined,
 *     phaseMaxMs: Record<string, number>,
 *     defaultMaxMs?: number,
 *   ) => Promise<void>,
 *   stopAllInlineSessions?: () => void,
 * } | null} */
let panelBridge = null;

/** @type {ReturnType<typeof createEmotionSessionController> | null} */
let emotionSession = null;

/** @type {ReturnType<typeof createGuidedPrayerSessionController> | null} */
let guidedPrayerSession = null;

/** @param {NonNullable<typeof panelBridge>} bridge */
export function configureEmotionPrayerPanel(bridge) {
  panelBridge = bridge;
}

export function emotionPrayerSessionActive() {
  return getEmotionSession().isActive() || getGuidedPrayerSession().isActive();
}

export function stopEmotionPrayerSessions() {
  getEmotionSession().stop();
  getGuidedPrayerSession().stop();
}

export function getEmotionSession() {
  if (emotionSession) return emotionSession;
  emotionSession = createEmotionSessionController({
    onPhaseChange: (index) => renderInlineSessionPhases("emotion-session-phases", localizedEmotionSessionPhases(), index),
    onSessionStart: ({ emotion, content }) => {
      setEmotionChipActive(emotion.id);
      renderEmotionPreview({ emotion, content });
      document.getElementById("emotion-session-bar")?.classList.remove("hidden");
      panelBridge?.markInlineVoiceTap?.();
      window.__rhemaInlineVoiceUntil = Date.now() + 10 * 60 * 1000;
      if (panelBridge?.voiceTransport?.voice?.sendTextOrStart) {
        panelBridge.voiceTransport.voiceProfile = "alkitab-voice";
      }
      ambientEngine.start("harp");
    },
    onSessionEnd: (reason) => {
      setEmotionChipActive(null);
      clearEmotionPreview();
      document.getElementById("emotion-session-bar")?.classList.add("hidden");
      renderInlineSessionPhases("emotion-session-phases", localizedEmotionSessionPhases(), -1);
      const finalizeVoice = async () => {
        try {
          if (reason === "complete") {
            const idle = panelBridge?.voiceTransport?.voice?.waitForPlaybackIdle?.(15000);
            if (idle) await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, 15500))]);
          }
          if (reason === "stop" || reason === "complete") {
            panelBridge?.voiceTransport?.voice?.stop?.();
          }
        } catch {
          /* ignore */
        }
      };
      void finalizeVoice();
      if (reason === "stop") {
        forceStopAmbientAndSpeech();
        document.dispatchEvent(new CustomEvent("rhema-audio-stop-all", { detail: { forceAmbientStop: true } }));
      }
      window.__rhemaInlineVoiceUntil = 0;
      window.__rhemaInlineVoiceSession = false;
      ambientEngine.stop();
    },
    onMarkRead: () => panelBridge?.markTodayRead?.(),
    waitPlaybackIdle: () =>
      panelBridge?.waitInlineSessionPlaybackIdle?.(
        () => emotionSession?.getCurrentPhaseId?.(),
        EMOTION_PLAYBACK_MAX_MS,
      ) ?? Promise.resolve(),
    onSpeakPhase: (prompt) => {
      panelBridge?.speakInlineSessionPhase?.(prompt, () => {
        if (emotionSession?.isActive()) void emotionSession.onVoiceTurnComplete();
      });
    },
  });
  return emotionSession;
}

export function getGuidedPrayerSession() {
  if (guidedPrayerSession) return guidedPrayerSession;
  guidedPrayerSession = createGuidedPrayerSessionController({
    onPhaseChange: (index) =>
      renderInlineSessionPhases("prayer-session-phases", localizedGuidedPrayerSessionPhases(), index),
    onSessionStart: (payload) => {
      const preset = payload.preset || payload;
      const content = payload.content || null;
      setPrayerCardActive(preset.id);
      renderPrayerPreview(preset, content);
      document.getElementById("prayer-session-bar")?.classList.remove("hidden");
      panelBridge?.markInlineVoiceTap?.();
      window.__rhemaInlineVoiceUntil = Date.now() + 8 * 60 * 1000;
      if (panelBridge?.voiceTransport?.voice?.sendTextOrStart) {
        panelBridge.voiceTransport.voiceProfile = "alkitab-voice";
      }
      ambientEngine.start("harp");
    },
    onSessionEnd: (reason) => {
      setPrayerCardActive(null);
      clearPrayerPreview();
      document.getElementById("prayer-session-bar")?.classList.add("hidden");
      renderInlineSessionPhases("prayer-session-phases", localizedGuidedPrayerSessionPhases(), -1);
      const finalizeVoice = async () => {
        try {
          if (reason === "complete") {
            const idle = panelBridge?.voiceTransport?.voice?.waitForPlaybackIdle?.(15000);
            if (idle) await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, 15500))]);
          }
          if (reason === "stop" || reason === "complete") {
            panelBridge?.voiceTransport?.voice?.stop?.();
          }
        } catch {
          /* ignore */
        }
      };
      void finalizeVoice();
      if (reason === "stop") {
        forceStopAmbientAndSpeech();
        document.dispatchEvent(new CustomEvent("rhema-audio-stop-all", { detail: { forceAmbientStop: true } }));
      }
      window.__rhemaInlineVoiceUntil = 0;
      window.__rhemaInlineVoiceSession = false;
      ambientEngine.stop();
    },
    onMarkRead: () => panelBridge?.markTodayRead?.(),
    waitPlaybackIdle: () =>
      panelBridge?.waitInlineSessionPlaybackIdle?.(
        () => guidedPrayerSession?.getCurrentPhaseId?.(),
        GUIDED_PRAYER_PLAYBACK_MAX_MS,
      ) ?? Promise.resolve(),
    onSpeakPhase: (prompt) => {
      panelBridge?.speakInlineSessionPhase?.(prompt, () => {
        if (guidedPrayerSession?.isActive()) void guidedPrayerSession.onVoiceTurnComplete();
      });
    },
  });
  return guidedPrayerSession;
}

/** @param {string} containerId @param {Array<{ label: string, icon: string }>} phases @param {number} activeIndex */
function renderInlineSessionPhases(containerId, phases, activeIndex) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = phases
    .map((phase, idx) => {
      const state = idx < activeIndex ? "done" : idx === activeIndex ? "active" : "";
      return `<span class="dpw-phase-pill ${state}" title="${escapeHtml(phase.label)}"><span class="dpw-phase-icon">${phase.icon}</span><span class="dpw-phase-label">${escapeHtml(phase.label)}</span></span>`;
    })
    .join("");
}

/** @param {string | null | undefined} emotionId */
function setEmotionChipActive(emotionId) {
  document.querySelectorAll("#renungan-emotion-chips .emotion-chip").forEach((btn) => {
    btn.classList.toggle("active", emotionId && btn.getAttribute("data-id") === emotionId);
    btn.toggleAttribute("aria-pressed", emotionId && btn.getAttribute("data-id") === emotionId ? "true" : "false");
  });
}

/** @param {string | null | undefined} presetId */
function setPrayerCardActive(presetId) {
  document.querySelectorAll("#renungan-prayer-grid .prayer-card").forEach((btn) => {
    btn.classList.toggle("active", presetId && btn.getAttribute("data-id") === presetId);
    btn.toggleAttribute("aria-pressed", presetId && btn.getAttribute("data-id") === presetId ? "true" : "false");
  });
}

/** @param {{ emotion: { id: string, emoji: string, label: string }, content: { theme?: string, verse?: { reference?: string, text?: string } } }} payload */
function renderEmotionPreview(payload) {
  const el = document.getElementById("emotion-preview-card");
  if (!el || !payload) return;
  const { content, emotion } = payload;
  const verse = content.verse || {};
  el.classList.remove("hidden");
  el.innerHTML = `<div class="emotion-preview-inner">
    <span class="emotion-preview-badge">${emotion.emoji} ${escapeHtml(emotion.label)}</span>
    <p class="emotion-preview-theme">${escapeHtml(content.theme || "")}</p>
    <p class="emotion-preview-verse"><strong>${escapeHtml(verse.reference || "")}</strong> — ${escapeHtml(verse.text || "")}</p>
  </div>`;
}

function clearEmotionPreview() {
  const el = document.getElementById("emotion-preview-card");
  if (!el) return;
  el.classList.add("hidden");
  el.innerHTML = "";
}

export function renderEmotions() {
  const el = document.getElementById("renungan-emotion-chips");
  if (!el) return;

  const compact = el.classList.contains("emotion-grid--compact");
  el.innerHTML = localizedEmotions()
    .map(
      (e) =>
        `<button type="button" class="emotion-chip tone-${escapeHtml(e.id)}${compact ? " emotion-chip--tile" : ""}" data-id="${escapeHtml(e.id)}" data-ref="${escapeHtml(e.ref)}" aria-pressed="false" aria-label="${escapeHtml(e.label)}">
        <span class="emotion-emoji">${e.emoji}</span>
        <span class="emotion-label">${escapeHtml(e.label)}</span>
      </button>`,
    )
    .join("");

  el.querySelectorAll(".emotion-chip").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const emotionId = btn.getAttribute("data-id");
      if (!emotionId) return;

      const session = getEmotionSession();
      if (session.isActive() && session.getEmotionId() === emotionId) {
        session.stop();
        return;
      }

      panelBridge?.stopAllInlineSessions?.();
      btn.classList.add("loading");
      try {
        const payload = await getEmotionContent(emotionId);
        if (!payload) return;
        session.start(payload);
      } finally {
        btn.classList.remove("loading");
      }
    });
  });
}

/** @param {{ id: string, emoji: string, title?: string, label?: string, subtitle?: string }} preset @param {{ dailyTheme?: string } | null} content */
function renderPrayerPreview(preset, content) {
  const el = document.getElementById("prayer-preview-card");
  if (!el || !preset) return;
  el.classList.remove("hidden");
  const theme = content?.dailyTheme ? `<p class="prayer-preview-theme">${escapeHtml(content.dailyTheme)}</p>` : "";
  el.innerHTML = `<div class="prayer-preview-inner">
    <span class="prayer-preview-badge">${preset.emoji} ${escapeHtml(preset.title || preset.label || "Doa")}</span>
    ${theme}
    <p class="prayer-preview-sub">${escapeHtml(preset.subtitle || t("prayer.previewFallback"))}</p>
  </div>`;
}

function clearPrayerPreview() {
  const el = document.getElementById("prayer-preview-card");
  if (!el) return;
  el.classList.add("hidden");
  el.innerHTML = "";
}

export function renderPrayers() {
  const el = document.getElementById("renungan-prayer-grid");
  if (!el) return;

  const bento = el.classList.contains("prayer-grid--bento");
  el.innerHTML = localizedPrayerPresets()
    .map(
      (p) =>
        `<button type="button" class="prayer-card tone-${escapeHtml(p.id)}${bento ? " prayer-card--bento" : ""}" data-id="${escapeHtml(p.id)}" aria-pressed="false">
        <span class="prayer-card-bg" aria-hidden="true"></span>
        <span class="prayer-emoji">${p.emoji}</span>
        <div class="prayer-info">
          <span class="prayer-title">${escapeHtml(p.title || p.label || t("prayer.previewFallback"))}</span>
          <span class="prayer-sub">${escapeHtml(p.subtitle || t("prayer.previewFallback"))}</span>
        </div>
      </button>`,
    )
    .join("");

  el.querySelectorAll(".prayer-card").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const presetId = btn.getAttribute("data-id");
      const preset = localizedPrayerPresets().find((p) => p.id === presetId);
      if (!preset) return;

      const session = getGuidedPrayerSession();
      if (session.isActive() && session.getPresetId() === presetId) {
        session.stop();
        return;
      }

      panelBridge?.stopAllInlineSessions?.();
      btn.classList.add("loading");
      try {
        const payload = await getGuidedPrayerContent(presetId);
        if (!payload) return;
        session.start(payload);
      } finally {
        btn.classList.remove("loading");
      }
    });
  });
}
