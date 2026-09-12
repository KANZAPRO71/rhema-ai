/**
 * Home Worship & Renungan UI — AI Devotion Engine, Sub-Tabs Segmented, Rencana Baca Tematik, Jurnal Doa Terjawab, & Kuis Alkitab.
 */

import {
  ambientEngine,
  forceStopAmbientAndSpeech,
  initBreathingPrayerUI,
  speakIndonesianText,
  warmupSpeechVoices,
} from "./ambientAudio.js";
import {
  DEVOTION_SNIPPETS,
  EMOTIONS,
  PLAN_KEY,
  PRAYER_PRESETS,
  READING_PLAN_7,
  STREAK_KEY,
} from "./homeWorshipData.js";
import {
  DAILY_QUIZ_COUNT,
  getDailyQuizQuestions,
  getDailyQuizTopic,
  isDailyQuizComplete,
  loadQuizState,
  saveQuizAnswer,
  scoreDailyQuiz,
} from "./dailyQuizEngine.js";
import { awardDailyQuizXp } from "./quizProfileStore.js";
import { isNativeQuizStoreAvailable, saveDailyQuizNative } from "./quizNativeStore.js";
import { getEffectiveBibleVersion, isGlobalUiLang } from "./localeProfile.js";
import { t } from "./uiStrings.js";
import {
  devotionTimelineShortLabels,
  formatDevotionDate,
  localizedDevotionSessionPhases,
  localizedEmotionSessionPhases,
  localizedEmotions,
  localizedGuidedPrayerSessionPhases,
  localizedPrayerPresets,
} from "./worshipUiI18n.js";
import { PRAYER_CATEGORIES } from "./renunganData.js";
import { getLocalizedThematicPlans } from "./thematicPlanEngine.js";
import {
  getTodayAIDevotion,
} from "./aiDevotionEngine.js";
import { openDailyStoryModal } from "./storyViewer.js";
import {
  countOneYearCompleted,
  getCalendarPercent,
  getOneYearProgress,
  getTodayOneYearDay,
  ONE_YEAR_TOTAL_DAYS,
  toggleOneYearDayCompleted,
} from "./biblePlanData.js";
import { openSermonAssistantModal } from "./sermonAssistant.js";
import { openBibleTimelineModal } from "./bibleTimeline.js";
import {
  openNightDevotionalPodModal,
  buildNightPodVoicePrompt,
  ensureNightPodAmbient,
} from "./nightDevotionalPod.js";
import { openBiblicalPersonasModal } from "./biblicalPersonas.js";
import { openBiblicalArchaeologyModal } from "./biblicalArchaeology.js";
import { buildSermonVoicePrompt, setPreacherPersona } from "./sermonPrompts.js";
import { openLiveSermonDetectorModal } from "./liveSermonDetector.js";
import { openBiblicalGenealogyModal } from "./biblicalGenealogy.js";
import { scrollMobileSectionIntoView } from "./mobileScroll.js";
import {
  createDevotionSessionController,
  DEVOTION_SESSION_PHASES,
  formatMeditationTime,
  MEDITATION_DURATION_SEC,
  OPENING_TARGET_MIN,
  PRAYER_TARGET_MIN,
  PRAYER_TARGET_MAX,
  REFLECTION_TARGET_MAX,
  REFLECTION_TARGET_MIN,
  SESSION_ESTIMATED_MINUTES,
} from "./devotionSessionEngine.js";
import { getEmotionContent } from "./aiEmotionEngine.js";
import { getGuidedPrayerContent, preloadTodayGuidedPrayers } from "./aiGuidedPrayerEngine.js";
import {
  createEmotionSessionController,
  EMOTION_SESSION_ESTIMATED_MINUTES,
  EMOTION_SESSION_PHASES,
} from "./emotionSessionEngine.js";
import {
  createGuidedPrayerSessionController,
  GUIDED_PRAYER_SESSION_ESTIMATED_MINUTES,
  GUIDED_PRAYER_SESSION_PHASES,
} from "./guidedPrayerSessionEngine.js";
import {
  addPrayerRequest,
  buildAllActivePrayersVoicePrompt,
  buildSinglePrayerVoicePrompt,
  deletePrayer,
  getPrayerJournalStats,
  incrementPrayerSupport,
  loadPrayerJournal,
  togglePrayerAnswered,
} from "./prayerJournalStore.js";
import { openVisionLensModal } from "./visionLens.js?v=20260911-play";
import { openWorshipSongwriterModal } from "./worshipSongwriter.js";
import { openKidungHubModal } from "./laguPanel.js";
import { renderLectioJournalList } from "./lectioDivina.js";

const THEMATIC_PROGRESS_KEY = "rhema-thematic-progress";

/** @type {{ go: (screen: string) => void, askVoice: (text: string) => void, openVerse: (ref: string) => void } | null} */
let homeBridge = null;
/** @type {import("../shared/chatCore.js").ChatTransport | null} */
let voiceTransport = null;
/** @type {ReturnType<typeof createDevotionSessionController> | null} */
let devotionSession = null;
/** @type {ReturnType<typeof createEmotionSessionController> | null} */
let emotionSession = null;
/** @type {ReturnType<typeof createGuidedPrayerSessionController> | null} */
let guidedPrayerSession = null;

export function stopAllRenunganInlineSessions() {
  getDevotionSession().stop();
  getEmotionSession().stop();
  getGuidedPrayerSession().stop();
}

function speakInlineSessionPhase(prompt, onTurnComplete) {
  window.__rhemaPrepareVoiceUserPrompt?.();
  if (voiceTransport?.voice?.sendTextOrStart) {
    voiceTransport.voiceProfile = "alkitab-voice";
    void voiceTransport.voice.sendTextOrStart(prompt, { mic: false, preferClientContent: false });
    return;
  }
  speakIndonesianText(prompt, {
    ambientPreset: "harp",
    stopAmbientOnEnd: false,
    onEnd: () => onTurnComplete?.(),
    onError: () => stopAllRenunganInlineSessions(),
  });
}

const DEVOTION_PLAYBACK_MAX_MS = {
  reflection: 7 * 60 * 1000,
  prayer: 3 * 60 * 1000,
  opening: 3 * 60 * 1000,
};

const EMOTION_PLAYBACK_MAX_MS = {
  opening: 90_000,
  reflection: 5 * 60 * 1000,
  prayer: 3 * 60 * 1000,
};

const GUIDED_PRAYER_PLAYBACK_MAX_MS = {
  opening: 90_000,
  prayer: 5 * 60 * 1000,
};

/** @param {() => string | null | undefined} getPhaseId @param {Record<string, number>} phaseMaxMs */
async function waitInlineSessionPlaybackIdle(getPhaseId, phaseMaxMs, defaultMaxMs = 120_000) {
  const phaseId = getPhaseId?.() ?? null;
  const maxMs = (phaseId && phaseMaxMs[phaseId]) || defaultMaxMs;
  const idle = voiceTransport?.voice?.waitForPlaybackIdle?.(maxMs);
  if (!idle) return;
  await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, maxMs + 500))]);
}

export function anyInlineRenunganSessionActive() {
  return (
    devotionPodcastSessionActive() ||
    getEmotionSession().isActive() ||
    getGuidedPrayerSession().isActive()
  );
}

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

function setEmotionChipActive(emotionId) {
  document.querySelectorAll("#renungan-emotion-chips .emotion-chip").forEach((btn) => {
    btn.classList.toggle("active", emotionId && btn.getAttribute("data-id") === emotionId);
    btn.toggleAttribute("aria-pressed", emotionId && btn.getAttribute("data-id") === emotionId ? "true" : "false");
  });
}

function setPrayerCardActive(presetId) {
  document.querySelectorAll("#renungan-prayer-grid .prayer-card").forEach((btn) => {
    btn.classList.toggle("active", presetId && btn.getAttribute("data-id") === presetId);
    btn.toggleAttribute("aria-pressed", presetId && btn.getAttribute("data-id") === presetId ? "true" : "false");
  });
}

function getDevotionSession() {
  if (devotionSession) return devotionSession;
  devotionSession = createDevotionSessionController({
    onPhaseChange: (index) => renderSessionPhaseBar(index),
    onMeditationStart: (secondsLeft) => {
      window.__rhemaDevotionSilentPhase = true;
      setDevotionMeditationUi(true, secondsLeft);
      syncComposerStopForInlineSessions();
      ambientEngine.start("harp");
    },
    onMeditationTick: (secondsLeft) => setDevotionMeditationTime(secondsLeft),
    onMeditationEnd: () => {
      window.__rhemaDevotionSilentPhase = false;
      setDevotionMeditationTime(0);
      setDevotionMeditationUi(false);
    },
    onSessionStart: () => {
      setDevotionPodcastUiPlaying(true);
      if (voiceTransport?.voice?.sendTextOrStart) {
        voiceTransport.voiceProfile = "alkitab-voice";
      }
      ambientEngine.start("harp");
    },
    onSessionEnd: (reason) => {
      window.__rhemaDevotionSilentPhase = false;
      const finalizeVoice = async () => {
        try {
          if (reason === "complete") {
            const idle = voiceTransport?.voice?.waitForPlaybackIdle?.(15000);
            if (idle) await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, 15500))]);
          }
          voiceTransport?.voice?.stop?.();
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
      setDevotionMeditationUi(false);
      renderSessionPhaseBar(-1);
      setDevotionPodcastUiPlaying(false);
      ambientEngine.stop();
    },
    onMarkRead: () => markTodayRead(),
    waitPlaybackIdle: () =>
      waitInlineSessionPlaybackIdle(() => devotionSession?.getCurrentPhaseId?.(), DEVOTION_PLAYBACK_MAX_MS),
    onSpeakPhase: (prompt) => {
      speakInlineSessionPhase(prompt, () => {
        if (devotionSession?.isActive()) void devotionSession.onVoiceTurnComplete();
      });
    },
  });
  return devotionSession;
}

function getEmotionSession() {
  if (emotionSession) return emotionSession;
  emotionSession = createEmotionSessionController({
    onPhaseChange: (index) => renderInlineSessionPhases("emotion-session-phases", localizedEmotionSessionPhases(), index),
    onSessionStart: ({ emotion, content }) => {
      setEmotionChipActive(emotion.id);
      renderEmotionPreview({ emotion, content });
      document.getElementById("emotion-session-bar")?.classList.remove("hidden");
      homeBridge?.markInlineVoiceTap?.();
      window.__rhemaInlineVoiceUntil = Date.now() + 10 * 60 * 1000;
      if (voiceTransport?.voice?.sendTextOrStart) voiceTransport.voiceProfile = "alkitab-voice";
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
            const idle = voiceTransport?.voice?.waitForPlaybackIdle?.(15000);
            if (idle) await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, 15500))]);
          }
          if (reason === "stop" || reason === "complete") {
            voiceTransport?.voice?.stop?.();
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
    onMarkRead: () => markTodayRead(),
    waitPlaybackIdle: () =>
      waitInlineSessionPlaybackIdle(() => emotionSession?.getCurrentPhaseId?.(), EMOTION_PLAYBACK_MAX_MS),
    onSpeakPhase: (prompt) => {
      speakInlineSessionPhase(prompt, () => {
        if (emotionSession?.isActive()) void emotionSession.onVoiceTurnComplete();
      });
    },
  });
  return emotionSession;
}

function getGuidedPrayerSession() {
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
      homeBridge?.markInlineVoiceTap?.();
      window.__rhemaInlineVoiceUntil = Date.now() + 8 * 60 * 1000;
      if (voiceTransport?.voice?.sendTextOrStart) voiceTransport.voiceProfile = "alkitab-voice";
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
            const idle = voiceTransport?.voice?.waitForPlaybackIdle?.(15000);
            if (idle) await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, 15500))]);
          }
          if (reason === "stop" || reason === "complete") {
            voiceTransport?.voice?.stop?.();
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
    onMarkRead: () => markTodayRead(),
    waitPlaybackIdle: () =>
      waitInlineSessionPlaybackIdle(
        () => guidedPrayerSession?.getCurrentPhaseId?.(),
        GUIDED_PRAYER_PLAYBACK_MAX_MS,
      ),
    onSpeakPhase: (prompt) => {
      speakInlineSessionPhase(prompt, () => {
        if (guidedPrayerSession?.isActive()) void guidedPrayerSession.onVoiceTurnComplete();
      });
    },
  });
  return guidedPrayerSession;
}

function devotionPodcastSessionActive() {
  return getDevotionSession().isActive();
}

/** Tampilkan tombol stop composer saat sesi renungan inline aktif (meski voice sudah off). */
export function syncComposerStopForInlineSessions() {
  const composerStop = document.getElementById("btn-voice-composer-stop");
  if (!composerStop) return;
  if (!anyInlineRenunganSessionActive()) return;
  composerStop.classList.remove("idle", "hidden");
  composerStop.classList.add("live");
  composerStop.removeAttribute("disabled");
}

function setDevotionPodcastUiPlaying(playing) {
  for (const icon of document.querySelectorAll("#dpw-play-icon")) icon.textContent = playing ? "⏸" : "▶";
  document.querySelectorAll("#dpw-equalizer").forEach((el) => el.classList.toggle("active", playing));
  document.querySelectorAll(".devotion-podcast-widget").forEach((el) => el.classList.toggle("playing", playing));
  document.querySelectorAll(".btn-dpw-stop").forEach((el) => {
    el.classList.toggle("hidden", !playing);
    el.disabled = !playing;
  });
  if (playing) syncComposerStopForInlineSessions();
  syncDevotionListenButton();
}

const DEVOTION_TIMELINE_TIMES = ["~2m", "2m", "5-6m", "2m"];

function renderSessionPhaseBar(activeIndex) {
  const el = document.getElementById("dpw-session-phases");
  if (!el) return;
  const phases = localizedDevotionSessionPhases();
  const timelineShort = devotionTimelineShortLabels();
  const useTimeline = el.classList.contains("devotion-audio-timeline");
  if (useTimeline) {
    el.innerHTML = phases.map((phase, idx) => {
      const state = idx < activeIndex ? "is-done" : idx === activeIndex ? "is-active" : "";
      const short = timelineShort[idx] || phase.label;
      const timeLbl = DEVOTION_TIMELINE_TIMES[idx] || "";
      const dotChar = idx <= activeIndex && activeIndex >= 0 ? "●" : "○";
      return `<div class="dat-step ${state}" title="${escapeHtml(phase.label)}">
        <span class="dat-dot-char" aria-hidden="true">${dotChar}</span>
        <span class="dat-label">${escapeHtml(short)}</span>
        <span class="dat-time">${escapeHtml(timeLbl)}</span>
      </div>`;
    }).join("");
    return;
  }
  el.innerHTML = phases.map((phase, idx) => {
    const state = idx < activeIndex ? "done" : idx === activeIndex ? "active" : "";
    return `<span class="dpw-phase-pill ${state}" title="${escapeHtml(phase.label)}"><span class="dpw-phase-icon">${phase.icon}</span><span class="dpw-phase-label">${escapeHtml(phase.label)}</span></span>`;
  }).join("");
}

function setDevotionMeditationUi(active, secondsLeft = MEDITATION_DURATION_SEC) {
  document.querySelectorAll("#dpw-meditation-overlay").forEach((el) => {
    el.classList.toggle("hidden", !active);
  });
  document.querySelectorAll("#dpw-meditation-timer").forEach((el) => {
    el.textContent = formatMeditationTime(secondsLeft);
  });
  document.querySelectorAll(".devotion-podcast-widget").forEach((el) => {
    el.classList.toggle("meditating", active);
  });
}

function syncDevotionListenButton() {
  const btn = document.getElementById("btn-devotion-listen");
  const stopBtn = document.getElementById("btn-devotion-listen-stop");
  const active = devotionPodcastSessionActive() || isDevotionPodcastActive();
  if (btn) {
    btn.textContent = active ? "⏹ Hentikan Sesi" : "🎙️ Mulai Saat Teduh";
    btn.setAttribute("aria-label", active ? "Hentikan saat teduh" : "Mulai saat teduh hari ini");
    btn.disabled = false;
  }
  stopBtn?.classList.toggle("hidden", !active);
  stopBtn?.toggleAttribute("disabled", !active);
}

function setDevotionMeditationTime(secondsLeft) {
  document.querySelectorAll("#dpw-meditation-timer").forEach((el) => {
    el.textContent = formatMeditationTime(Math.max(0, secondsLeft));
  });
}

function resetDevotionPodcastUi() {
  getDevotionSession().stop();
}

function isDevotionPodcastActive() {
  return (
    devotionPodcastSessionActive() ||
    getEmotionSession().isActive() ||
    getGuidedPrayerSession().isActive()
  );
}

function stopDevotionPodcast() {
  forceStopAmbientAndSpeech();
  getDevotionSession().stop();
}

function startDevotionPodcast() {
  const devotion = currentDevotionData;
  if (!devotion) return;

  const session = getDevotionSession();
  if (session.isActive()) {
    session.stop();
    return;
  }

  stopAllRenunganInlineSessions();
  homeBridge?.markInlineVoiceTap?.();
  window.__rhemaInlineVoiceUntil = Date.now() + 25 * 60 * 1000;
  session.start(devotion);
}

function syncDevotionPodcastUi() {
  if (devotionPodcastSessionActive() || isDevotionPodcastActive()) {
    setDevotionPodcastUiPlaying(true);
  }
}

function handleDevotionPodcastTap(e) {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;

  const stopBtn = target.closest("#btn-dpw-stop, .btn-dpw-stop");
  const playBtn = target.closest("#btn-dpw-play-toggle, .btn-dpw-play");
  if (!stopBtn && !playBtn) return;

  e.preventDefault();
  e.stopPropagation();

  if (stopBtn) {
    voiceTransport?.voice?.stop?.();
    stopDevotionPodcast();
    return;
  }

  if (playBtn && (devotionPodcastSessionActive() || isDevotionPodcastActive())) {
    stopDevotionPodcast();
    return;
  }

  if (playBtn) {
    startDevotionPodcast();
  }
}

function bindDevotionPodcastControls() {
  const root = document.getElementById("screen-renungan");
  if (!root || root.__devotionPodcastBound) return;
  root.__devotionPodcastBound = true;

  /** @type {number} */
  let lastTapAt = 0;

  function onTap(e) {
    const now = Date.now();
    if (now - lastTapAt < 360) return;
    lastTapAt = now;
    handleDevotionPodcastTap(e);
  }

  root.addEventListener("click", onTap);
  root.addEventListener("touchend", onTap, { passive: false });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadStreak() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStreak(data) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

function loadPlanProgress() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY) || "{}");
  } catch {
    return { startedAt: null, completedDays: [], currentDay: 1 };
  }
}

function savePlanProgress(data) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(data));
}

function loadThematicProgress() {
  try {
    return JSON.parse(localStorage.getItem(THEMATIC_PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveThematicProgress(data) {
  localStorage.setItem(THEMATIC_PROGRESS_KEY, JSON.stringify(data));
}

/** @param {number} totalDays */
function formatPlanWeeks(totalDays) {
  const weeks = Math.ceil(totalDays / 7);
  if (isGlobalUiLang()) {
    return weeks <= 1 ? t("plans.week.one") : t("plans.week.many", { n: String(weeks) });
  }
  return weeks <= 1 ? "1 minggu" : `${weeks} minggu`;
}

/** @param {{ totalDays: number }} plan @param {number} doneCount */
function getThematicPlanStatus(plan, doneCount) {
  if (doneCount >= plan.totalDays) {
    return { label: t("plans.status.done"), tone: "done" };
  }
  if (doneCount > 0) {
    return {
      label: t("plans.status.active", { current: String(doneCount + 1), total: String(plan.totalDays) }),
      tone: "active",
    };
  }
  return { label: t("plans.status.new"), tone: "new" };
}

/** Tandai hari ini sudah baca (streak + rencana). */
export function markTodayRead() {
  const key = todayKey();
  const streak = loadStreak();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);

  if (streak.lastDate === key) {
    renderStreakBar();
    renderHomeStreakMini();
    return;
  }

  streak.count = streak.lastDate === yKey ? (streak.count || 0) + 1 : 1;
  streak.lastDate = key;
  saveStreak(streak);
  renderStreakBar();
  renderHomeStreakMini();
}

function markPlanDayDone(day) {
  const plan = loadPlanProgress();
  if (!plan.startedAt) plan.startedAt = todayKey();
  if (!plan.completedDays.includes(day)) plan.completedDays.push(day);
  if (plan.currentDay <= day) plan.currentDay = Math.min(day + 1, 7);
  savePlanProgress(plan);
  markTodayRead();
}

function devotionSnippet() {
  const day = Math.floor(Date.now() / 86_400_000);
  return DEVOTION_SNIPPETS[day % DEVOTION_SNIPPETS.length];
}

function renderStreakBar() {
  const el = document.getElementById("renungan-streak-bar");
  if (!el) return;
  const streak = loadStreak();
  const count = streak.count || 0;
  const activeToday = streak.lastDate === todayKey();
  const isSplit = el.classList.contains("renungan-streak-split");

  if (isSplit) {
    el.innerHTML = `
      <div class="wellness-split-card wellness-split-card--streak">
        <span class="wellness-split-icon" aria-hidden="true">${count > 0 ? "🔥" : "✨"}</span>
        <p class="wellness-split-value">${count} ${escapeHtml(t("streak.days"))}</p>
        <p class="wellness-split-label">${escapeHtml(t("streak.consecutive"))}</p>
        <p class="wellness-split-hint">${activeToday ? escapeHtml(t("streak.doneToday")) : escapeHtml(t("streak.hintToday"))}</p>
      </div>`;
    return;
  }

  const dots = Array.from({ length: 7 }, (_, i) => {
    const filled = i < Math.min(count, 7);
    const todayDot = i === count % 7 && activeToday && count > 0;
    return `<span class="streak-dot${filled ? " filled" : ""}${todayDot ? " today" : ""}" aria-hidden="true"></span>`;
  }).join("");

  el.innerHTML = `
    <div class="streak-inner glass-card">
      <div class="streak-head">
        <div class="streak-badge">${count > 0 ? "🔥" : "✨"}</div>
        <div class="streak-meta">
          <span class="streak-count">${count}</span>
          <span class="streak-label">${escapeHtml(t("streak.unitLong"))}</span>
        </div>
        <div class="streak-pct">${Math.min(count, 7)}/7</div>
      </div>
      <div class="streak-track" aria-hidden="true">
        <div class="streak-fill" style="width:${Math.min(100, (Math.min(count, 7) / 7) * 100)}%"></div>
      </div>
      <div class="streak-dots" aria-label="${escapeHtml(t("streak.progressAria"))}">${dots}</div>
      <p class="streak-hint">${activeToday ? escapeHtml(t("streak.doneTodayLong")) : escapeHtml(t("streak.hintLong"))}</p>
    </div>`;
}

let currentDevotionData = null;

/**
 * Render Devotion Card bertenaga AI dengan tema, refleksi mendalam, langkah iman & doa penutup.
 * @param {object | null} devotion
 * @param {{ onListen?: () => void, onExplain?: () => void, onOpen?: () => void }} actions
 */
export function renderDevotionCard(devotion, actions = {}) {
  const el = document.getElementById("renungan-devotion-card") || document.getElementById("renungan-today-card");
  if (!el) return;

  if (!devotion) {
    el.innerHTML = `<p class="alkitab-verse-missing">${escapeHtml(t("devotion.unavailable"))}</p>`;
    return;
  }

  currentDevotionData = devotion;

  const theme = devotion.theme || t("devotion.themeDefault");
  const verseText = devotion.verse?.text || devotion.text || "";
  const verseRef = devotion.verse?.reference || devotion.reference || "";
  const reflection = devotion.reflection || devotionSnippet();
  const practicalAction = devotion.practicalAction || "";
  const guidedPrayer = devotion.guidedPrayer || "";
  const formattedDate = devotion.formattedDate || formatDevotionDate();
  const translationLabel =
    getEffectiveBibleVersion() === "kjv" ? t("devotion.translationKjv") : t("devotion.translationTb");

  const sourceBadge = devotion.source === "gemini" ? t("devotion.badgeAi") : t("devotion.badgeToday");

  el.innerHTML = `
    <div class="devotion-paper-hero">
      <p class="devotion-hero-kicker">✦ ${escapeHtml(sourceBadge)} · ${escapeHtml(formattedDate).toUpperCase()}</p>
      <h3 class="devotion-hero-theme">${escapeHtml(theme)}</h3>
      <div class="devotion-silk-panel">
        <span class="devotion-paper-quote" aria-hidden="true">&ldquo;</span>
        <blockquote class="devotion-verse devotion-verse--paper">&ldquo;${escapeHtml(verseText)}&rdquo;</blockquote>
        <cite class="devotion-ref devotion-ref--silk">${escapeHtml(verseRef)} · ${escapeHtml(translationLabel)}</cite>
      </div>
    </div>

    <div class="devotion-accordion-stack">
      <details class="devotion-accordion">
        <summary class="devotion-accordion-summary">
          <span class="devotion-accordion-row">
            <span class="devotion-accordion-icon">💡</span>
            <span class="devotion-accordion-label">${escapeHtml(t("devotion.reflection"))}</span>
          </span>
        </summary>
        <p class="devotion-reflection">${escapeHtml(reflection)}</p>
      </details>
      ${practicalAction ? `
      <details class="devotion-accordion">
        <summary class="devotion-accordion-summary">
          <span class="devotion-accordion-row">
            <span class="devotion-accordion-icon">🎯</span>
            <span class="devotion-accordion-label">${escapeHtml(t("devotion.action"))}</span>
          </span>
        </summary>
        <p class="devotion-action-text">${escapeHtml(practicalAction)}</p>
      </details>` : ""}
      ${guidedPrayer ? `
      <details class="devotion-accordion">
        <summary class="devotion-accordion-summary">
          <span class="devotion-accordion-row">
            <span class="devotion-accordion-icon">🙏</span>
            <span class="devotion-accordion-label">${escapeHtml(t("devotion.closingPrayer"))}</span>
          </span>
        </summary>
        <p class="devotion-prayer-text">${escapeHtml(guidedPrayer)}</p>
      </details>` : ""}
    </div>

    <div class="devotion-audio-card devotion-podcast-widget devotion-podcast-widget--timeline" id="devotion-podcast-widget">
      <div class="devotion-audio-head">
        <span class="devotion-audio-kicker">${escapeHtml(t("devotion.sessionKicker", { min: String(SESSION_ESTIMATED_MINUTES) }))}</span>
        <span class="devotion-audio-badge">${escapeHtml(t("devotion.liveBadge"))}</span>
      </div>
      <div class="dpw-session-phases devotion-audio-timeline" id="dpw-session-phases" aria-label="${escapeHtml(t("devotion.progressAria"))}"></div>
      <div class="dpw-meditation-overlay hidden" id="dpw-meditation-overlay" aria-live="polite">
        <span class="dpw-meditation-icon">🕊️</span>
        <p class="dpw-meditation-label">${escapeHtml(t("devotion.meditateLabel"))}</p>
        <p class="dpw-meditation-hint">${escapeHtml(t("devotion.meditateHint"))}</p>
        <p class="dpw-meditation-timer" id="dpw-meditation-timer">${formatMeditationTime(MEDITATION_DURATION_SEC)}</p>
      </div>
      <div class="dpw-equalizer dpw-equalizer--compact hidden" id="dpw-equalizer" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="dpw-controls dpw-controls--inline">
        <button type="button" class="btn-dpw-play hidden" id="btn-dpw-play-toggle" title="${escapeHtml(t("devotion.startAria"))}" aria-label="${escapeHtml(t("devotion.startAria"))}">
          <span id="dpw-play-icon" aria-hidden="true">▶</span>
        </button>
        <button type="button" class="btn-dpw-stop hidden" id="btn-dpw-stop" title="${escapeHtml(t("devotion.stopAria"))}" aria-label="${escapeHtml(t("devotion.stopAria"))}">⏹</button>
      </div>
      <button type="button" class="btn-devotion-listen-full btn-devotion-listen-gold" id="btn-devotion-listen">${escapeHtml(t("devotion.startBtn"))}</button>
    </div>`;

  renderSessionPhaseBar(-1);
  syncDevotionPodcastUi();

  const runDevotionListen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    if (devotionPodcastSessionActive() || isDevotionPodcastActive()) {
      stopDevotionPodcast();
      return;
    }
    startDevotionPodcast();
  };

  const listenBtn = document.getElementById("btn-devotion-listen");
  listenBtn?.addEventListener("click", runDevotionListen, true);
}

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

function renderEmotions() {
  const el = document.getElementById("renungan-emotion-chips");
  if (!el) return;

  const compact = el.classList.contains("emotion-grid--compact");
  el.innerHTML = localizedEmotions().map(
    (e) =>
      `<button type="button" class="emotion-chip tone-${escapeHtml(e.id)}${compact ? " emotion-chip--tile" : ""}" data-id="${escapeHtml(e.id)}" data-ref="${escapeHtml(e.ref)}" aria-pressed="false" aria-label="${escapeHtml(e.label)}">
        <span class="emotion-emoji">${e.emoji}</span>
        <span class="emotion-label">${escapeHtml(e.label)}</span>
      </button>`,
  ).join("");

  el.querySelectorAll(".emotion-chip").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const emotionId = btn.getAttribute("data-id");
      if (!emotionId) return;

      const session = getEmotionSession();
      if (session.isActive() && session.getEmotionId() === emotionId) {
        session.stop();
        return;
      }

      stopAllRenunganInlineSessions();
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

function renderPrayerPreview(preset, content) {
  const el = document.getElementById("prayer-preview-card");
  if (!el || !preset) return;
  el.classList.remove("hidden");
  const theme = content?.dailyTheme
    ? `<p class="prayer-preview-theme">${escapeHtml(content.dailyTheme)}</p>`
    : "";
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

function renderPrayers() {
  const el = document.getElementById("renungan-prayer-grid");
  if (!el) return;

  const bento = el.classList.contains("prayer-grid--bento");
  el.innerHTML = localizedPrayerPresets().map(
    (p) =>
      `<button type="button" class="prayer-card tone-${escapeHtml(p.id)}${bento ? " prayer-card--bento" : ""}" data-id="${escapeHtml(p.id)}" aria-pressed="false">
        <span class="prayer-card-bg" aria-hidden="true"></span>
        <span class="prayer-emoji">${p.emoji}</span>
        <div class="prayer-info">
          <span class="prayer-title">${escapeHtml(p.title || p.label || t("prayer.previewFallback"))}</span>
          <span class="prayer-sub">${escapeHtml(p.subtitle || t("prayer.previewFallback"))}</span>
        </div>
      </button>`,
  ).join("");

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

      stopAllRenunganInlineSessions();
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

/* --- THEMATIC READING PLANS --- */
let selectedThematicPlanId = null;

export function renderThematicPlans() {
  const plans = getLocalizedThematicPlans();
  const oneYearCard = document.getElementById("one-year-bible-card");
  const plansSummaryEl = document.getElementById("reading-plans-summary");
  const { year, dayOfYear, plan, totalDays } = getTodayOneYearDay();
  const oyProgress = getOneYearProgress();
  const oyDoneCount = countOneYearCompleted(year);
  const thematicProgress = loadThematicProgress();
  const thematicActive = plans.filter((p) => {
    const done = thematicProgress[p.id]?.completedDays?.length || 0;
    return done > 0 && done < p.totalDays;
  }).length;

  if (plansSummaryEl) {
    plansSummaryEl.innerHTML = `
      <span class="reading-plans-chip">${escapeHtml(t("plans.oneYear.chip"))}</span>
      <span class="reading-plans-chip">${escapeHtml(t("plans.thematic.count", { n: String(plans.length) }))}</span>
      <span class="reading-plans-chip reading-plans-chip--year">${escapeHtml(t("plans.dayYear", { day: String(dayOfYear), year: String(year) }))}</span>
      ${oyDoneCount ? `<span class="reading-plans-chip reading-plans-chip--read">${escapeHtml(t("plans.readProgress", { done: String(oyDoneCount), total: String(totalDays) }))}</span>` : ""}
      ${thematicActive ? `<span class="reading-plans-chip reading-plans-chip--active">${escapeHtml(t("plans.thematic.active", { n: String(thematicActive) }))}</span>` : ""}
    `;
  }

  if (oneYearCard) {
    const isDone = !!oyProgress.completed[String(dayOfYear)];
    const doneCount = oyDoneCount;
    const readPct = Math.round((doneCount / totalDays) * 100);
    const calPct = getCalendarPercent(dayOfYear);

    oneYearCard.innerHTML = `
      <div class="oy-split-card">
        <div class="oy-split-left">
          <div class="oy-progress-ring" style="--oy-pct:${readPct}" role="progressbar" aria-valuenow="${readPct}" aria-valuemin="0" aria-valuemax="100">
            <span class="oy-ring-inner">
              <strong>${doneCount}</strong>
              <small>/${totalDays}</small>
            </span>
          </div>
          <p class="oy-split-kicker">${escapeHtml(t("plans.oneYear.kicker", { year: String(year) }))}</p>
          <p class="oy-split-day">${escapeHtml(t("plans.oneYear.day", { n: String(dayOfYear) }))}</p>
          <p class="oy-split-cal">${escapeHtml(t("plans.oneYear.calPct", { n: String(calPct) }))}</p>
        </div>
        <div class="oy-split-right">
          <p class="oy-split-theme">${escapeHtml(plan.theme)}</p>
          <button type="button" class="oy-split-passage" data-ref="${escapeHtml(plan.pl)}">
            <span class="oy-tag-lbl">${escapeHtml(t("plans.oneYear.ot"))}</span> ${escapeHtml(plan.pl)}
          </button>
          <button type="button" class="oy-split-passage" data-ref="${escapeHtml(plan.pb)}">
            <span class="oy-tag-lbl">${escapeHtml(t("plans.oneYear.nt"))}</span> ${escapeHtml(plan.pb)}
          </button>
          <button type="button" class="oy-split-passage" data-ref="${escapeHtml(plan.mazmur)}">
            <span class="oy-tag-lbl">${escapeHtml(t("plans.oneYear.wisdom"))}</span> ${escapeHtml(plan.mazmur)}
          </button>
          <div class="oy-split-actions">
            <button type="button" class="oy-split-play" id="btn-oy-listen" aria-label="${escapeHtml(t("plans.oneYear.playAria"))}">▶</button>
            <button type="button" class="oy-split-check ${isDone ? "is-done" : ""}" id="btn-oy-check">
              ${isDone ? escapeHtml(t("plans.oneYear.done")) : escapeHtml(t("plans.oneYear.markDone"))}
            </button>
          </div>
        </div>
      </div>
    `;

    oneYearCard.querySelectorAll(".oy-split-passage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ref = btn.getAttribute("data-ref");
        if (ref) document.dispatchEvent(new CustomEvent("rhema-open-verse", { detail: ref }));
      });
    });

    oneYearCard.querySelector("#btn-oy-listen")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (homeBridge?.askVoice) {
        homeBridge.askVoice(
          isGlobalUiLang()
            ? `Read and reflect on One-Year Bible day ${dayOfYear}: Old Testament from ${plan.pl}, New Testament from ${plan.pb}, and Psalms/Wisdom from ${plan.mazmur}. Lead a brief blessing prayer.`
            : `Bacakan dan berikan renungan untuk program baca Alkitab 1 Tahun hari ke-${dayOfYear}: Perjanjian Lama dari ${plan.pl}, Perjanjian Baru dari ${plan.pb}, serta Mazmur dari ${plan.mazmur}. Pimpin doa berkat.`,
        );
      }
      markTodayRead();
    });

    oneYearCard.querySelector("#btn-oy-check")?.addEventListener("click", () => {
      toggleOneYearDayCompleted(dayOfYear);
      renderThematicPlans();
      markTodayRead();
    });
  }

  const grid = document.getElementById("thematic-plans-grid");
  const detail = document.getElementById("thematic-plan-detail");
  const summaryEl = document.getElementById("thematic-plans-summary");
  if (!grid || !detail) return;

  const progress = loadThematicProgress();
  const activeCount = plans.filter((plan) => {
    const done = progress[plan.id]?.completedDays?.length || 0;
    return done > 0 && done < plan.totalDays;
  }).length;
  const doneCountAll = plans.filter((plan) => {
    const done = progress[plan.id]?.completedDays?.length || 0;
    return done >= plan.totalDays;
  }).length;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <span class="plan-summary-chip">${escapeHtml(t("plans.summary.count", { n: String(plans.length) }))}</span>
      ${activeCount ? `<span class="plan-summary-chip plan-summary-chip--active">${escapeHtml(t("plans.summary.inProgress", { n: String(activeCount) }))}</span>` : ""}
      ${doneCountAll ? `<span class="plan-summary-chip plan-summary-chip--done">${escapeHtml(t("plans.summary.completed", { n: String(doneCountAll) }))}</span>` : ""}
    `;
  }

  grid.innerHTML = plans.map((plan) => {
    const pData = progress[plan.id] || { completedDays: [] };
    const doneCount = pData.completedDays?.length || 0;
    const pct = Math.round((doneCount / plan.totalDays) * 100);
    const isSelected = selectedThematicPlanId === plan.id;
    const status = getThematicPlanStatus(plan, doneCount);
    return `
      <div class="thematic-plan-card glass-card ${isSelected ? "selected" : ""} ${status.tone !== "new" ? `tone-${status.tone}` : ""}" data-plan-id="${plan.id}">
        <div class="plan-card-icon">${plan.icon}</div>
        <div class="plan-card-info">
          <div class="plan-card-top">
            <h4 class="plan-card-title">${escapeHtml(plan.title)}</h4>
            <span class="plan-card-chevron" aria-hidden="true">›</span>
          </div>
          <p class="plan-card-sub">${escapeHtml(plan.subtitle)}</p>
          <div class="plan-card-meta">
            <span class="plan-card-duration">${escapeHtml(t("plans.card.duration", { days: String(plan.totalDays), weeks: formatPlanWeeks(plan.totalDays) }))}</span>
            <span class="plan-card-status plan-card-status--${status.tone}">${status.label}</span>
          </div>
          <div class="plan-card-progress">
            <div class="plan-card-pbar"><div class="plan-card-pfill" style="width:${pct}%"></div></div>
            <span class="plan-card-ptext">${doneCount}/${plan.totalDays}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-plan-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const planId = card.getAttribute("data-plan-id");
      selectedThematicPlanId = planId;
      renderThematicPlans();
      renderThematicPlanDetail(planId);
    });
  });

  if (selectedThematicPlanId) {
    renderThematicPlanDetail(selectedThematicPlanId);
  } else {
    detail.classList.add("hidden");
  }
}

function renderThematicPlanDetail(planId) {
  const detail = document.getElementById("thematic-plan-detail");
  const iconEl = document.getElementById("plan-detail-icon");
  const titleEl = document.getElementById("plan-detail-title");
  const subEl = document.getElementById("plan-detail-sub");
  const daysList = document.getElementById("plan-days-list");

  if (!detail || !daysList) return;
  const plan = getLocalizedThematicPlans().find((p) => p.id === planId);
  if (!plan) {
    detail.classList.add("hidden");
    return;
  }

  detail.classList.remove("hidden");
  if (iconEl) iconEl.textContent = plan.icon;
  if (titleEl) titleEl.textContent = plan.title;
  if (subEl) subEl.textContent = plan.subtitle;

  const progress = loadThematicProgress();
  const pData = progress[plan.id] || { completedDays: [] };
  const doneSet = new Set(pData.completedDays || []);
  const doneCount = doneSet.size;
  const pct = Math.round((doneCount / plan.totalDays) * 100);
  const isAllDone = doneCount >= plan.totalDays;
  const status = getThematicPlanStatus(plan, doneCount);

  const progressEl = document.getElementById("plan-detail-progress");
  if (progressEl) {
    progressEl.innerHTML = `
      <div class="plan-detail-stats">
        <div class="plan-detail-stat">
          <div class="plan-detail-stat-top">
            <span class="plan-detail-stat-label">${escapeHtml(t("plans.detail.progress"))}</span>
            <span class="plan-detail-stat-val">${escapeHtml(t("plans.detail.progressVal", { done: String(doneCount), total: String(plan.totalDays) }))}</span>
          </div>
          <div class="plan-detail-stat-bar">
            <div class="plan-detail-stat-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="plan-detail-stat">
          <div class="plan-detail-stat-top">
            <span class="plan-detail-stat-label">${escapeHtml(t("plans.detail.duration"))}</span>
            <span class="plan-detail-stat-val">${formatPlanWeeks(plan.totalDays)}</span>
          </div>
          <span class="plan-detail-status plan-detail-status--${status.tone}">${status.label}</span>
        </div>
      </div>
    `;
  }

  // Temukan hari aktif berikutnya yang belum selesai
  const currentUnfinishedDay = plan.days.find((d) => !doneSet.has(d.day)) || plan.days[0];

  let headerBannerHtml = "";
  if (isAllDone) {
    headerBannerHtml = `
      <div class="plan-completion-banner glass-card glow">
        <span class="completion-trophy">🏆</span>
        <div class="completion-meta">
          <h4 class="completion-title">${escapeHtml(t("plans.detail.completeTitle"))}</h4>
          <p class="completion-desc">${escapeHtml(t("plans.detail.completeDesc", { title: plan.title }))}</p>
          <button type="button" class="btn-pill btn-soft btn-restart-plan" data-plan-id="${plan.id}">${escapeHtml(t("plans.detail.restart"))}</button>
        </div>
      </div>
    `;
  } else {
    headerBannerHtml = `
      <div class="plan-hero-action glass-card">
        <div class="hero-action-meta">
          <span class="hero-badge">${escapeHtml(t("plans.detail.todayBadge"))}</span>
          <h4 class="hero-day-title">${escapeHtml(t("plans.detail.dayTitle", { n: String(currentUnfinishedDay.day), title: currentUnfinishedDay.title }))}</h4>
          <p class="hero-day-ref">${escapeHtml(currentUnfinishedDay.ref)} · ${escapeHtml(currentUnfinishedDay.desc)}</p>
        </div>
        <div class="hero-action-buttons">
          <button type="button" class="btn-pill primary full glow btn-hero-start-day" data-ref="${escapeHtml(currentUnfinishedDay.ref)}" data-title="${escapeHtml(currentUnfinishedDay.title)}" data-desc="${escapeHtml(currentUnfinishedDay.desc)}" data-day="${currentUnfinishedDay.day}">
            ${escapeHtml(t("plans.detail.startBtn"))}
          </button>
        </div>
      </div>
    `;
  }

  daysList.innerHTML = `
    ${headerBannerHtml}
    <div class="plan-days-container">
      ${plan.days.map((d) => {
        const isDone = doneSet.has(d.day);
        const isToday = !isAllDone && d.day === currentUnfinishedDay.day;
        return `
          <div class="thematic-day-item ${isDone ? "done" : ""} ${isToday ? "active-today" : ""}">
            <button type="button" class="btn-check-day ${isDone ? "checked" : ""}" data-plan-id="${plan.id}" data-day="${d.day}" title="${escapeHtml(isDone ? t("plans.detail.markUndone") : t("plans.detail.markDone"))}">
              ${isDone ? "✓" : d.day}
            </button>
            <div class="thematic-day-info">
              <div class="thematic-day-top">
                <div class="thematic-title-wrap">
                  ${isToday ? `<span class="badge-today-mini">${escapeHtml(t("plans.detail.todayMini"))}</span>` : ""}
                  <span class="thematic-day-label">${escapeHtml(t("plans.detail.dayTitle", { n: String(d.day), title: d.title }))}</span>
                </div>
                <button type="button" class="thematic-day-ref" data-ref="${escapeHtml(d.ref)}">${escapeHtml(d.ref)} ↗</button>
              </div>
              <p class="thematic-day-desc">${escapeHtml(d.desc)}</p>
              <div class="thematic-day-actions">
                <button type="button" class="btn-day-micro btn-day-open" data-ref="${escapeHtml(d.ref)}">${escapeHtml(t("plans.detail.openVerse"))}</button>
                <button type="button" class="btn-day-micro btn-day-listen" data-ref="${escapeHtml(d.ref)}" data-title="${escapeHtml(d.title)}" data-desc="${escapeHtml(d.desc)}">${escapeHtml(t("plans.detail.listen"))}</button>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  // Listener Hero Action Start
  daysList.querySelector(".btn-hero-start-day")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = /** @type {HTMLElement} */ (e.currentTarget);
    const ref = btn.getAttribute("data-ref") || "";
    const title = btn.getAttribute("data-title") || "";
    const desc = btn.getAttribute("data-desc") || "";
    const day = Number(btn.getAttribute("data-day") || 1);

    if (homeBridge?.askVoice) {
      homeBridge.askVoice(
        isGlobalUiLang()
          ? `Read day ${day} of "${plan.title}": ${title} (${ref}). ${desc}. Let's reflect on its meaning and lead a brief prayer.`
          : `Bacakan rencana baca hari ke-${day} dari "${plan.title}": ${title} (${ref}). ${desc}. Mari kita renungkan maknanya dan pimpin doa singkat.`,
      );
    }
    toggleThematicDay(plan.id, day);
    renderThematicPlans();
    renderThematicPlanDetail(plan.id);
    markTodayRead();
  });

  // Listener Restart Plan
  daysList.querySelector(".btn-restart-plan")?.addEventListener("click", () => {
    if (confirm(t("plans.detail.restartConfirm"))) {
      const progress = loadThematicProgress();
      delete progress[plan.id];
      saveThematicProgress(progress);
      renderThematicPlans();
      renderThematicPlanDetail(plan.id);
    }
  });

  // Listener Check Days
  daysList.querySelectorAll(".btn-check-day").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pId = btn.getAttribute("data-plan-id");
      const dNum = Number(btn.getAttribute("data-day"));
      toggleThematicDay(pId, dNum);
      renderThematicPlans();
      renderThematicPlanDetail(pId);
      markTodayRead();
    });
  });

  // Listener Open Verse in Alkitab
  daysList.querySelectorAll(".thematic-day-ref, .btn-day-open").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ref = btn.getAttribute("data-ref");
      if (ref) {
        document.dispatchEvent(new CustomEvent("rhema-open-verse", { detail: ref }));
      }
    });
  });

  // Listener Listen Micro Button
  daysList.querySelectorAll(".btn-day-listen").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ref = btn.getAttribute("data-ref") || "";
      const title = btn.getAttribute("data-title") || "";
      const desc = btn.getAttribute("data-desc") || "";
      if (homeBridge?.askVoice) {
        homeBridge.askVoice(
          isGlobalUiLang()
            ? `Read Scripture from ${ref}: "${title}". ${desc}. Offer a brief reflection and blessing.`
            : `Bacakan firman dari ${ref}: "${title}". ${desc}. Berikan renungan dan berkat.`,
        );
      }
      markTodayRead();
    });
  });
}

function toggleThematicDay(planId, day) {
  const progress = loadThematicProgress();
  if (!progress[planId]) progress[planId] = { completedDays: [] };
  const idx = progress[planId].completedDays.indexOf(day);
  if (idx >= 0) {
    progress[planId].completedDays.splice(idx, 1);
  } else {
    progress[planId].completedDays.push(day);
  }
  saveThematicProgress(progress);
}

/* --- PRAYER JOURNAL & ANSWERED PRAYERS --- */
let currentPrayerFilter = "all"; // 'all' | 'active' | 'answered'
/** @type {(() => void) | null} */
let syncPrayerCategoryPillFn = null;

export function renderPrayerJournal() {
  const listEl = document.getElementById("renungan-prayer-journal-list");
  const statsEl = document.getElementById("prayer-journal-stats");
  if (!listEl) return;

  const list = loadPrayerJournal();
  const stats = getPrayerJournalStats(list);

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="prayer-stats-bento">
        <div class="prayer-stat-bento">
          <span class="prayer-stat-bento-num">${stats.total}</span>
          <span class="prayer-stat-bento-label">${escapeHtml(t("prayer.stats.total"))}</span>
        </div>
        <div class="prayer-stat-bento">
          <span class="prayer-stat-bento-num">${stats.active}</span>
          <span class="prayer-stat-bento-label">${escapeHtml(t("prayer.stats.active"))}</span>
        </div>
        <div class="prayer-stat-bento prayer-stat-bento--answered">
          <span class="prayer-stat-bento-num">${stats.answered}</span>
          <span class="prayer-stat-bento-label">${escapeHtml(t("prayer.stats.answered"))}</span>
        </div>
      </div>`;
  }

  const filtered = list.filter((p) => {
    if (currentPrayerFilter === "active") return p.status !== "answered";
    if (currentPrayerFilter === "answered") return p.status === "answered";
    return true;
  });

  if (!filtered.length) {
    const emptyHint =
      currentPrayerFilter === "answered"
        ? t("prayer.empty.answered")
        : currentPrayerFilter === "active"
          ? t("prayer.empty.active")
          : t("prayer.empty.all");
    listEl.innerHTML = `
      <div class="prayer-journal-empty prayer-empty-dashed">
        <span class="empty-icon prayer-empty-icon" aria-hidden="true">🕊️</span>
        <p class="prayer-empty-title">${escapeHtml(t("prayer.empty.title"))}</p>
        <p class="prayer-empty-note">${escapeHtml(emptyHint)}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((p) => {
      const isAnswered = p.status === "answered";
      const cat = PRAYER_CATEGORIES.find((c) => c.id === p.category);
      const catLabel = cat ? t(cat.nameKey) : t("prayer.cat.general");
      const catIcon = cat?.icon ?? "🕊️";
      return `
      <div class="prayer-journal-card glass-card ${isAnswered ? "answered-card" : ""}">
        <div class="pj-head">
          <div class="pj-head-left">
            <span class="pj-badge">${catIcon} ${escapeHtml(catLabel)}</span>
            <span class="pj-status-badge ${isAnswered ? "badge-answered" : "badge-active"}">${isAnswered ? escapeHtml(t("prayer.status.answered")) : escapeHtml(t("prayer.status.active"))}</span>
          </div>
          <span class="pj-date">${escapeHtml(p.date || "")}</span>
        </div>
        <h4 class="pj-title">${escapeHtml(p.title)}</h4>
        ${p.content ? `<p class="pj-content">${escapeHtml(p.content)}</p>` : ""}
        ${isAnswered ? `
          <div class="pj-answered-box">
            <span class="answered-badge">${escapeHtml(t("prayer.answeredBy"))}${p.answeredDate ? ` · ${escapeHtml(p.answeredDate)}` : ""}</span>
            ${p.testimony ? `<p class="answered-testimony">${escapeHtml(p.testimony)}</p>` : ""}
          </div>
        ` : ""}
        <div class="pj-actions">
          <button type="button" class="btn-pj-action btn-support-prayer" data-prayer-id="${p.id}">
            ${escapeHtml(t("prayer.prayWithAi"))} (${p.prayerCount || 1})
          </button>
          <button type="button" class="btn-pj-action btn-mark-answered" data-prayer-id="${p.id}">
            ${isAnswered ? escapeHtml(t("prayer.unmarkAnswered")) : escapeHtml(t("prayer.markAnswered"))}
          </button>
          <button type="button" class="btn-pj-action btn-delete-prayer" data-prayer-id="${p.id}">${escapeHtml(t("prayer.delete"))}</button>
        </div>
      </div>`;
    })
    .join("");

  listEl.querySelectorAll(".btn-support-prayer").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-prayer-id");
      const item = loadPrayerJournal().find((p) => p.id === id);
      if (!item) return;
      incrementPrayerSupport(id);
      homeBridge?.askVoice?.(buildSinglePrayerVoicePrompt(item));
      markTodayRead();
      renderPrayerJournal();
    });
  });

  listEl.querySelectorAll(".btn-mark-answered").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-prayer-id");
      if (!id) return;
      togglePrayerAnswered(id);
      renderPrayerJournal();
    });
  });

  listEl.querySelectorAll(".btn-delete-prayer").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-prayer-id");
      if (!id || !confirm(t("prayer.deleteConfirm"))) return;
      deletePrayer(id);
      renderPrayerJournal();
    });
  });
}

/* --- DAILY BIBLE QUIZ CHALLENGE (interactive slide module) --- */
/** @type {number | null} */
let quizViewIndex = null;

/** @type {Set<string>} */
const quizHintOpen = new Set();

export function openHomeQuizSection() {
  /* Kuis sudah terbuka di Beranda — jangan auto-scroll saat loadHome. */
}

export function closeHomeQuizSection() {
  quizViewIndex = null;
}

/** @param {Array<{ id: string }>} dailyQuestions @param {Record<string, number>} answers */
function resolveQuizViewIndex(dailyQuestions, answers) {
  const firstOpenIdx = dailyQuestions.findIndex((q) => typeof answers[q.id] !== "number");
  if (quizViewIndex == null || quizViewIndex < 0 || quizViewIndex >= dailyQuestions.length) {
    return firstOpenIdx >= 0 ? firstOpenIdx : Math.max(0, dailyQuestions.length - 1);
  }
  return quizViewIndex;
}

export function renderDailyBibleQuiz() {
  const container = document.getElementById("daily-quiz-container");
  const scoreBadge = document.getElementById("quiz-score-badge");
  const chipScore = document.getElementById("home-quiz-chip-score");
  if (!container) return;

  const dailyQuestions = getDailyQuizQuestions();
  const { dateKey, answers: quizUserAnswers } = loadQuizState();
  const dailyTopic = getDailyQuizTopic(dateKey);
  const topicChip = document.getElementById("home-quiz-topic-chip");
  if (topicChip) topicChip.textContent = dailyTopic.label;

  if (container.dataset.quizDate !== dateKey) {
    container.dataset.quizDate = dateKey;
    quizViewIndex = null;
    quizHintOpen.clear();
    container.dataset.quizFinish = "0";
  }

  const { correct: correctCount, answered: totalAnswered, total } = scoreDailyQuiz(dailyQuestions, quizUserAnswers);
  const allComplete = isDailyQuizComplete(dailyQuestions, quizUserAnswers);
  const showIdx = resolveQuizViewIndex(dailyQuestions, quizUserAnswers);
  quizViewIndex = showIdx;

  if (chipScore) {
    if (allComplete && container.dataset.quizFinish === "1") {
      chipScore.textContent = t("quiz.done", { correct: String(correctCount), total: String(total) });
    } else if (totalAnswered > 0) {
      chipScore.textContent = `${showIdx + 1} / ${total}`;
    } else {
      chipScore.textContent = t("home.quiz.notStarted");
    }
  }

  if (allComplete && container.dataset.quizFinish === "1") {
    const { xpEarned, profile } = awardDailyQuizXp(correctCount, total, dateKey, dailyTopic.key);
    void persistDailyQuizCompletion(dateKey, total, correctCount, xpEarned);

    container.innerHTML = `
      <div class="quiz-finish-card glass-card quiz-slide-in">
        <span class="quiz-finish-icon" aria-hidden="true">${correctCount === total ? "🏆" : "✨"}</span>
        <h4 class="quiz-finish-title">${escapeHtml(t("quiz.finish.title"))}</h4>
        <p class="quiz-finish-sub">${escapeHtml(t("quiz.finish.sub", { correct: String(correctCount), total: String(total) }))}</p>
        ${xpEarned > 0 ? `<p class="quiz-xp-earned">+${xpEarned} XP · Level <strong>${escapeHtml(profile.levelTitle)}</strong></p>` : `<p class="quiz-xp-earned">Level <strong>${escapeHtml(profile.levelTitle)}</strong> · ${profile.xp} XP</p>`}
        <button type="button" class="quiz-btn-secondary" id="quiz-review-btn">${escapeHtml(t("quiz.review"))}</button>
      </div>
    `;
    container.querySelector("#quiz-review-btn")?.addEventListener("click", () => {
      container.dataset.quizFinish = "0";
      quizViewIndex = 0;
      renderDailyBibleQuiz();
    });
    bindQuizSlideAnimation(container);
    updateQuizScoreBadge(scoreBadge, correctCount, total, totalAnswered);
    return;
  }

  container.dataset.quizFinish = "0";
  const q = dailyQuestions[showIdx];
  const userChoice = quizUserAnswers[q.id];
  const isAnswered = typeof userChoice === "number";
  const hintVisible = quizHintOpen.has(q.id);
  const hintText = q.hint || q.explanation;

  const optionsHtml = q.options.map((opt, optIdx) => {
    let btnClass = "quiz-opt-btn";
    if (isAnswered) {
      if (optIdx === q.correctIndex) btnClass += " correct";
      else if (optIdx === userChoice) btnClass += " wrong";
    }
    return `
      <button type="button" class="${btnClass}" data-qid="${q.id}" data-opt="${optIdx}" ${isAnswered ? "disabled" : ""}>
        <span class="opt-index">${String.fromCharCode(65 + optIdx)}</span>
        <span class="opt-text">${escapeHtml(opt)}</span>
      </button>
    `;
  }).join("");

  const dotsHtml = dailyQuestions.map((item, idx) => {
    const answered = typeof quizUserAnswers[item.id] === "number";
    let cls = "quiz-carousel-dot";
    if (idx === showIdx) cls += " is-active";
    else if (answered) cls += " is-done";
    return `<button type="button" class="${cls}" data-quiz-idx="${idx}" aria-label="${escapeHtml(t("quiz.progressAria", { n: String(idx + 1) }))}"></button>`;
  }).join("");

  const canGoNext = isAnswered && showIdx < dailyQuestions.length - 1;
  const isLastAnswered = isAnswered && showIdx === dailyQuestions.length - 1;

  container.innerHTML = `
    <article class="quiz-interactive-card glass-card quiz-slide-in">
      <header class="quiz-interactive-head">
        <span class="quiz-progress-fraction" aria-live="polite">${showIdx + 1} / ${dailyQuestions.length}</span>
        <span class="quiz-ref-badge">${escapeHtml(q.verseRef)}</span>
      </header>
      ${q.visualEmoji ? `
        <div class="quiz-visual-banner" aria-hidden="true">
          <span class="quiz-visual-emoji">${q.visualEmoji}</span>
          <span class="quiz-visual-label">${escapeHtml(q.visualLabel || dailyTopic.label)}</span>
        </div>
      ` : ""}
      <h4 class="quiz-qtext">${escapeHtml(q.question)}</h4>
      <div class="quiz-options-list">${optionsHtml}</div>
      ${hintVisible ? `
        <div class="quiz-hint-panel" role="note">
          <span class="quiz-hint-label">${escapeHtml(t("quiz.hint.label"))}</span>
          <p class="quiz-hint-text">${escapeHtml(hintText)}</p>
        </div>
      ` : ""}
      ${isAnswered ? `
        <div class="quiz-explanation ${userChoice === q.correctIndex ? "success" : "review"}">
          <span class="exp-icon">${userChoice === q.correctIndex ? escapeHtml(t("quiz.correct")) : escapeHtml(t("quiz.explainLabel"))}</span>
          <p class="exp-text">${escapeHtml(q.explanation)}</p>
        </div>
        ${userChoice !== q.correctIndex ? `
          <button type="button" class="quiz-btn-voice" id="quiz-ask-voice-btn">${escapeHtml(t("quiz.askVoice"))}</button>
        ` : ""}
      ` : ""}
      <footer class="quiz-interactive-foot">
        <button type="button" class="quiz-btn-ghost" id="quiz-hint-btn" ${isAnswered ? "disabled" : ""}>
          ${hintVisible ? escapeHtml(t("quiz.hint.hide")) : escapeHtml(t("quiz.hint.show"))}
        </button>
        <button type="button" class="quiz-btn-next" id="quiz-next-btn" ${canGoNext || (isLastAnswered && allComplete) ? "" : "disabled"}>
          ${isLastAnswered ? (allComplete ? escapeHtml(t("quiz.seeScore")) : escapeHtml(t("quiz.next"))) : escapeHtml(t("quiz.next"))}
        </button>
      </footer>
    </article>
    <div class="quiz-carousel-dots" role="tablist" aria-label="${escapeHtml(t("quiz.progressList"))}">${dotsHtml}</div>
  `;

  updateQuizScoreBadge(scoreBadge, correctCount, total, totalAnswered);
  bindQuizSlideAnimation(container);

  container.querySelector("#quiz-ask-voice-btn")?.addEventListener("click", () => {
    const prompt =
      isGlobalUiLang()
        ? `Explain the theological and historical Bible context for this quiz question: "${q.question}" Reference: ${q.verseRef}. Correct answer: ${q.options[q.correctIndex]}.`
        : `Jelaskan konteks teologi dan sejarah Alkitab untuk pertanyaan kuis ini: "${q.question}" Referensi: ${q.verseRef}. Jawaban benarnya: ${q.options[q.correctIndex]}.`;
    homeBridge?.go?.("voice");
    homeBridge?.askVoice?.(prompt);
  });

  container.querySelector("#quiz-hint-btn")?.addEventListener("click", () => {
    if (quizHintOpen.has(q.id)) quizHintOpen.delete(q.id);
    else quizHintOpen.add(q.id);
    renderDailyBibleQuiz();
  });

  container.querySelector("#quiz-next-btn")?.addEventListener("click", () => {
    if (isLastAnswered && allComplete) {
      container.dataset.quizFinish = "1";
      renderDailyBibleQuiz();
      return;
    }
    if (canGoNext) {
      quizViewIndex = showIdx + 1;
      renderDailyBibleQuiz();
    }
  });

  container.querySelectorAll("[data-quiz-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-quiz-idx"));
      if (isNaN(idx)) return;
      quizViewIndex = idx;
      renderDailyBibleQuiz();
    });
  });

  container.querySelectorAll(".quiz-opt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-qid");
      const opt = Number(btn.getAttribute("data-opt"));
      if (!qid || isNaN(opt)) return;

      saveQuizAnswer(qid, opt);
      renderDailyBibleQuiz();
    });
  });
}

/** @param {HTMLElement | null} scoreBadge @param {number} correctCount @param {number} total @param {number} totalAnswered */
function updateQuizScoreBadge(scoreBadge, correctCount, total, totalAnswered) {
  if (!scoreBadge) return;
  if (totalAnswered > 0) {
    scoreBadge.classList.remove("hidden");
    scoreBadge.innerHTML = `Skor Harian: <strong>${correctCount} / ${total} Benar</strong> (${Math.round((correctCount / total) * 100)}%)`;
  } else {
    scoreBadge.classList.add("hidden");
  }
}

/** @param {HTMLElement} container */
function bindQuizSlideAnimation(container) {
  const quizCard = container.querySelector(".quiz-slide-in");
  quizCard?.addEventListener("animationend", () => quizCard.classList.remove("quiz-slide-in"), { once: true });
}

/** @param {string} dateKey @param {number} total @param {number} correctCount @param {number} xpEarned */
async function persistDailyQuizCompletion(dateKey, total, correctCount, xpEarned) {
  const nativeSaved = await saveDailyQuizNative({
    dateKey,
    totalQuestions: total,
    correctAnswers: correctCount,
    xpEarned,
    isCompleted: true,
  });
  if (!nativeSaved && !isNativeQuizStoreAvailable()) {
    markTodayRead();
  } else {
    renderHomeStreakMini();
  }
}

/* --- SUB-TAB SWITCHER (Rencana Baca di tab Alkitab) --- */
export function switchAlkitabProgramSubTab(subtabId) {
  if (subtabId === "quiz") {
    openHomeQuizSection();
    scrollMobileSectionIntoView("home-quiz-section");
    renderDailyBibleQuiz();
    return;
  }
  if (subtabId === "plans") {
    scrollMobileSectionIntoView("alkitab-section-plans");
    renderThematicPlans();
  }
}

/** @deprecated use switchAlkitabProgramSubTab */
export function switchRenunganSubTab(subtabId) {
  switchAlkitabProgramSubTab(subtabId);
}

export function renderAlkitabProgramShell() {
  try { renderThematicPlans(); } catch (e) { console.warn("[rhema] renderThematicPlans:", e); }
}

export function renderRenunganShell() {
  try { renderStreakBar(); } catch (e) { console.warn("[rhema] renderStreakBar:", e); }
  try {
    const breathingHost = document.getElementById("breathing-prayer-host");
    if (breathingHost) {
      const needsCompact = breathingHost.dataset.compact === "1";
      const hasCompact = Boolean(breathingHost.querySelector(".wellness-split-card--breath"));
      if (breathingHost.dataset.bound !== "1" || (needsCompact && !hasCompact)) {
        breathingHost.dataset.bound = "1";
        initBreathingPrayerUI(breathingHost);
      }
    }
  } catch (e) {
    console.warn("[rhema] initBreathingPrayerUI:", e);
  }
  try { renderEmotions(); } catch (e) { console.warn("[rhema] renderEmotions:", e); }
  try { renderPrayers(); } catch (e) { console.warn("[rhema] renderPrayers:", e); }
  try { renderHomeStreakMini(); } catch (e) { console.warn("[rhema] renderHomeStreakMini:", e); }
  try {
    if (currentDevotionData) renderDevotionCard(currentDevotionData);
  } catch (e) {
    console.warn("[rhema] renderDevotionCard refresh:", e);
  }
  void preloadTodayGuidedPrayers();
}

export function renderHomeStreakMini() {
  const el = document.getElementById("home-streak-mini");
  if (!el) return;
  const streak = loadStreak();
  const count = streak.count || 0;
  el.innerHTML = `
    <span class="mini-streak-fire">${count > 0 ? "🔥" : "✨"}</span>
    <span class="mini-streak-text"><strong>${count}</strong> ${t("home.streak.unit")}</span>`;
}

/** @deprecated use renderRenunganShell */
export function renderHomeWorshipShell() {
  renderRenunganShell();
}

/**
 * @param {import("../shared/chatCore.js").ChatTransport} transport
 * @param {{ go: (s: string) => void, askVoice: (t: string) => void, openVerse: (r: string) => Promise<void>, markInlineVoiceTap?: () => void }} api
 */
export function initHomeWorship(transport, api) {
  homeBridge = api;
  voiceTransport = transport;
  warmupSpeechVoices();

  document.addEventListener("rhema-locale-home-refresh", () => {
    try { renderHomeStreakMini(); } catch { /* ignore */ }
    try { renderDailyBibleQuiz(); } catch { /* ignore */ }
    try { renderPrayerJournal(); } catch { /* ignore */ }
    try { syncPrayerCategoryPillFn?.(); } catch { /* ignore */ }
    try { renderRenunganShell(); } catch { /* ignore */ }
    try { renderAlkitabProgramShell(); } catch { /* ignore */ }
    try { document.dispatchEvent(new CustomEvent("rhema-locale-alkitab-refresh")); } catch { /* ignore */ }
  });

  if (!transport.__devotionPodcastHook) {
    transport.__devotionPodcastHook = true;
    transport.onMessage?.((msg) => {
      const m = /** @type {{ type?: string, status?: string }} */ (msg);
      if (m?.type === "voiceTurnComplete") {
        if (devotionPodcastSessionActive()) {
          const session = getDevotionSession();
          if (session.getCurrentPhaseId() === "meditate") return;
          void session.onVoiceTurnComplete();
          return;
        }
        if (getEmotionSession().isActive()) {
          void getEmotionSession().onVoiceTurnComplete();
          return;
        }
        if (getGuidedPrayerSession().isActive()) {
          void getGuidedPrayerSession().onVoiceTurnComplete();
          return;
        }
      }
      if (m?.type === "voiceStatus") {
        syncDevotionListenButton();
        if (anyInlineRenunganSessionActive()) {
          if (m.status === "error") stopAllRenunganInlineSessions();
          return;
        }
        if (m.status === "off" || m.status === "error") {
          const session = getDevotionSession();
          if (session.isActive() && (session.getCurrentPhaseId() === "reflection" || session.getCurrentPhaseId() === "prayer")) {
            return;
          }
          const emotionSess = getEmotionSession();
          if (
            emotionSess.isActive() &&
            (emotionSess.getCurrentPhaseId() === "reflection" || emotionSess.getCurrentPhaseId() === "prayer")
          ) {
            return;
          }
          const prayerSess = getGuidedPrayerSession();
          if (prayerSess.isActive() && prayerSess.getCurrentPhaseId() === "prayer") {
            return;
          }
          resetDevotionPodcastUi();
        }
      }
    });
  }

  bindDevotionPodcastControls();
  document.addEventListener("rhema-devotion-podcast-reset", () => {
    const session = getDevotionSession();
    if (session.isActive() && session.isInSilentPhase()) return;
    resetDevotionPodcastUi();
  });

  renderRenunganShell();
  renderAlkitabProgramShell();

  const renungan = document.getElementById("screen-renungan");
  const alkitabScreen = document.getElementById("screen-alkitab");
  const doaScreen = document.getElementById("screen-doa");
  if (!renungan && !doaScreen) return;

  // Percakapan Suara Tokoh Alkitab (Gemini Live Personas)
  document.getElementById("btn-open-personas")?.addEventListener("click", () => {
    openBiblicalPersonasModal({
      onStartLivePersona: (persona, prompt) => {
        api.go("voice");
        api.askVoice(prompt);
      },
    });
  });

  // Wisata Visual Arkeologi Kota Alkitab
  document.getElementById("btn-open-archaeology")?.addEventListener("click", () => {
    openBiblicalArchaeologyModal({
      onExploreSite: (site) => {
        api.go("voice");
        api.askVoice(site.voicePrompt);
      },
    });
  });

  // Garis Waktu Alkitab (8 Era)
  document.getElementById("btn-open-timeline")?.addEventListener("click", () => {
    openBibleTimelineModal({
      onExplainEra: (era) => {
        api.go("voice");
        api.askVoice(
          `Jelaskan secara mendalam tentang ${era.name} (${era.period}) dalam sejarah Alkitab. Uraikan kitab ${era.badge}, peristiwa kunci, dan makna rohaninya bagi kita hari ini.`
        );
        markTodayRead();
      },
    });
  });

  // Renungan Malam (Pengantar Tidur)
  document.getElementById("btn-open-night-pod")?.addEventListener("click", () => {
    void openNightDevotionalPodModal({
      onStartVoicePod: (ep, _amb, _mins, voicePrompt) => {
        api.go("voice");
        api.askVoice(voicePrompt || buildNightPodVoicePrompt(ep));
        ensureNightPodAmbient();
      },
      onPodComplete: () => {
        markTodayRead();
      },
    });
  });

  // Khotbah (topik) — kerangka khotbah & komsel (Beranda + tab Voice)
  function openKhotbahTopikAssistant() {
    openSermonAssistantModal({
      onVoiceSermon: (outline) => {
        setPreacherPersona();
        api.go("voice");
        api.askVoice(
          buildSermonVoicePrompt({
            minutes: 8,
            passage: outline.passage,
            title: outline.title,
          }),
        );
        markTodayRead();
      },
    });
  }

  document.getElementById("btn-khotbah-topik")?.addEventListener("click", openKhotbahTopikAssistant);
  document.getElementById("btn-open-khotbah-topik")?.addEventListener("click", openKhotbahTopikAssistant);

  // Daily Story Banner
  document.getElementById("btn-open-daily-story")?.addEventListener("click", () => {
    openDailyStoryModal(null, {
      onListenVoice: (story) => {
        api.go("voice");
        api.askVoice(
          `Bacakan Rhema Daily Story dengan tema "${story.theme}" dari ayat ${story.verse?.reference}: "${story.verse?.text}". Sampaikan refleksi 30 detik: "${story.reflection?.headline}. ${story.reflection?.body}" dan pimpin doa pengurapan.`
        );
        markTodayRead();
      },
    });
  });

  // Detektor Ayat Khotbah Live
  document.getElementById("btn-open-sermon-detector")?.addEventListener("click", () => {
    openLiveSermonDetectorModal({
      onOpenVerse: (ref) => {
        api.go("alkitab");
        void api.openVerse(ref);
      },
    });
  });

  renderLectioJournalList();
  document.addEventListener("rhema-lectio-journal-updated", renderLectioJournalList);
  document.addEventListener("rhema-screen", (e) => {
    if (/** @type {CustomEvent} */ (e).detail?.screen === "alkitab") renderLectioJournalList();
  });

  document.getElementById("btn-open-vision-lens")?.addEventListener("click", () => {
    openVisionLensModal({
      onVoicePray: (analysis) => {
        api.go("voice");
        api.askVoice(
          `Berdasarkan situasi: ${analysis.situation || "foto"}. Ayat: ${analysis.passage || ""} "${analysis.verseText || ""}". Refleksi: ${analysis.reflection || ""}. Pimpin doa: ${analysis.prayer || ""}`,
        );
      },
    });
  });

  document.getElementById("btn-open-kidung")?.addEventListener("click", () => {
    openKidungHubModal(voiceTransport);
  });

  document.getElementById("btn-open-worship-songwriter")?.addEventListener("click", () => {
    openWorshipSongwriterModal({
      onVoiceSong: (song) => {
        api.go("voice");
        api.askVoice(`Bawakan lagu pujian "${song.title}" dengan nada ${song.key || "C"}. Lirik: ${song.lyrics?.slice(0, 500) || ""}`);
      },
    });
  });

  // Peta Silsilah Tokoh Alkitab Interaktif
  document.getElementById("btn-open-genealogy")?.addEventListener("click", () => {
    openBiblicalGenealogyModal({
      onOpenVerse: (ref) => {
        api.go("alkitab");
        void api.openVerse(ref);
      },
      onVoicePersona: (prompt) => {
        api.go("voice");
        api.askVoice(prompt);
      },
    });
  });

  // Prayer Filter Tabs (tab Doa)
  if (doaScreen && !doaScreen.__prayerJournalBound) {
    doaScreen.__prayerJournalBound = true;

    doaScreen.querySelectorAll(".prayer-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        doaScreen.querySelectorAll(".prayer-filter-btn").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        currentPrayerFilter = btn.getAttribute("data-prayer-filter") || "all";
        renderPrayerJournal();
      });
    });

    const form = document.getElementById("form-add-prayer");
    const titleInput = /** @type {HTMLInputElement | null} */ (document.getElementById("input-prayer-title"));
    const catSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById("select-prayer-category"));
    const contentInput = /** @type {HTMLTextAreaElement | null} */ (document.getElementById("input-prayer-content"));
    const catEmojiEl = document.getElementById("prayer-category-emoji");
    const catLabelEl = document.getElementById("prayer-category-label");

    const syncPrayerCategoryPill = () => {
      const value = catSelect?.value || "keluarga";
      const cat = PRAYER_CATEGORIES.find((c) => c.id === value) || PRAYER_CATEGORIES[0];
      const shortKey = `${cat.nameKey}.short`;
      const shortName = t(shortKey);
      if (catEmojiEl) catEmojiEl.textContent = cat.icon;
      if (catLabelEl) catLabelEl.textContent = shortName;
    };

    catSelect?.addEventListener("change", syncPrayerCategoryPill);
    syncPrayerCategoryPill();
    syncPrayerCategoryPillFn = syncPrayerCategoryPill;

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = titleInput?.value?.trim();
      if (!title) return;
      const content = contentInput?.value?.trim() || "";
      const category = catSelect?.value || "keluarga";
      addPrayerRequest(title, category, content);
      if (titleInput) titleInput.value = "";
      if (contentInput) contentInput.value = "";
      renderPrayerJournal();
      alert(t("prayer.savedAlert"));
    });

    document.getElementById("btn-pray-all-journal")?.addEventListener("click", () => {
      const activePrayers = loadPrayerJournal().filter((p) => p.status === "active");
      if (!activePrayers.length) {
        alert(t("prayer.noActiveAlert"));
        return;
      }
      api.askVoice(buildAllActivePrayersVoicePrompt(activePrayers));
      markTodayRead();
    });
  }

  if (!document.__rhemaPrayerScreenHook) {
    document.__rhemaPrayerScreenHook = true;
    document.addEventListener("rhema-screen", (e) => {
      const screen = /** @type {CustomEvent<{ screen?: string }>} */ (e).detail?.screen;
      if (screen === "doa") renderPrayerJournal();
    });
    document.addEventListener("rhema-nav-retap", (e) => {
      const screen = /** @type {CustomEvent<{ screen?: string }>} */ (e).detail?.screen;
      if (screen === "doa") renderPrayerJournal();
    });
  }

  renderPrayerJournal();

  document.getElementById("btn-emotion-session-stop")?.addEventListener("click", () => {
    getEmotionSession().stop();
  });

  document.getElementById("btn-prayer-session-stop")?.addEventListener("click", () => {
    getGuidedPrayerSession().stop();
  });

  document.addEventListener("rhema-open-verse", (e) => {
    const ref = /** @type {CustomEvent} */ (e).detail;
    if (ref) {
      api.go("alkitab");
      void api.openVerse(ref);
    }
  });

  return { renderRenunganShell, renderAlkitabProgramShell, markTodayRead, switchAlkitabProgramSubTab, switchRenunganSubTab };
}
