/**
 * Home Worship & Renungan UI — AI Devotion Engine, Sub-Tabs Segmented, Rencana Baca Tematik, Jurnal Doa Terjawab, & Kuis Alkitab.
 */

import {
  ambientEngine,
  forceStopAmbientAndSpeech,
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
  isDailyQuizComplete,
  loadQuizState,
  saveQuizAnswer,
  scoreDailyQuiz,
} from "./dailyQuizEngine.js";
import {
  PRAYER_CATEGORIES,
  THEMATIC_READING_PLANS,
} from "./renunganData.js";
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
import { openVisionLensModal } from "./visionLens.js";
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
    onPhaseChange: (index) => renderInlineSessionPhases("emotion-session-phases", EMOTION_SESSION_PHASES, index),
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
      renderInlineSessionPhases("emotion-session-phases", EMOTION_SESSION_PHASES, -1);
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
      renderInlineSessionPhases("prayer-session-phases", GUIDED_PRAYER_SESSION_PHASES, index),
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
      renderInlineSessionPhases("prayer-session-phases", GUIDED_PRAYER_SESSION_PHASES, -1);
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

function renderSessionPhaseBar(activeIndex) {
  const el = document.getElementById("dpw-session-phases");
  if (!el) return;
  el.innerHTML = DEVOTION_SESSION_PHASES.map((phase, idx) => {
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
  return weeks <= 1 ? "1 minggu" : `${weeks} minggu`;
}

/** @param {{ totalDays: number }} plan @param {number} doneCount */
function getThematicPlanStatus(plan, doneCount) {
  if (doneCount >= plan.totalDays) {
    return { label: "Selesai", tone: "done" };
  }
  if (doneCount > 0) {
    return { label: `Hari ${doneCount + 1} dari ${plan.totalDays}`, tone: "active" };
  }
  return { label: "Belum mulai", tone: "new" };
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
          <span class="streak-label">hari berturut-turut</span>
        </div>
        <div class="streak-pct">${Math.min(count, 7)}/7</div>
      </div>
      <div class="streak-track" aria-hidden="true">
        <div class="streak-fill" style="width:${Math.min(100, (Math.min(count, 7) / 7) * 100)}%"></div>
      </div>
      <div class="streak-dots" aria-label="Progres streak 7 hari">${dots}</div>
      <p class="streak-hint">${activeToday ? "✓ Hari ini sudah beribadah — puji Tuhan!" : "Dengarkan atau baca satu ayat untuk melanjutkan streak rohani Anda."}</p>
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
    el.innerHTML = `<p class="alkitab-verse-missing">Saat teduh hari ini belum tersedia.</p>`;
    return;
  }

  currentDevotionData = devotion;

  const theme = devotion.theme || "Firman Saat Teduh Hari Ini";
  const verseText = devotion.verse?.text || devotion.text || "";
  const verseRef = devotion.verse?.reference || devotion.reference || "";
  const reflection = devotion.reflection || devotionSnippet();
  const practicalAction = devotion.practicalAction || "";
  const guidedPrayer = devotion.guidedPrayer || "";
  const formattedDate = devotion.formattedDate || new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });

  const sourceBadge = devotion.source === "gemini" ? "Saat Teduh AI" : "Saat Teduh Hari Ini";
  const meditationMin = Math.round(MEDITATION_DURATION_SEC / 60);

  el.innerHTML = `
    <div class="devotion-theme-badge">
      <span class="theme-star">✦</span>
      <span class="theme-text">${escapeHtml(theme)}</span>
    </div>
    <span class="quote-deco" aria-hidden="true">&ldquo;</span>
    <p class="devotion-badge">${escapeHtml(sourceBadge)} · ${escapeHtml(formattedDate)}</p>
    <blockquote class="devotion-verse">&ldquo;${escapeHtml(verseText)}&rdquo;</blockquote>
    <cite class="devotion-ref">${escapeHtml(verseRef)} · Terjemahan Baru (LAI)</cite>
    
    <div class="devotion-reflection-box">
      <div class="reflection-head"><span class="reflection-icon">💡</span><strong>Refleksi Firman</strong></div>
      <p class="devotion-reflection">${escapeHtml(reflection)}</p>
    </div>

    ${practicalAction ? `
      <div class="devotion-action-box">
        <div class="action-head"><span class="action-icon">🎯</span><strong>Langkah Iman Hari Ini</strong></div>
        <p class="devotion-action-text">${escapeHtml(practicalAction)}</p>
      </div>
    ` : ""}

    ${guidedPrayer ? `
      <div class="devotion-prayer-box">
        <div class="prayer-head"><span class="prayer-icon">🙏</span><strong>Doa Penutup</strong></div>
        <p class="devotion-prayer-text">${escapeHtml(guidedPrayer)}</p>
      </div>
    ` : ""}

    <div class="devotion-podcast-widget" id="devotion-podcast-widget">
      <div class="dpw-head">
        <div class="dpw-icon-pulse">🎧</div>
        <div class="dpw-info">
          <span class="dpw-badge">Sesi Saat Teduh · ~${SESSION_ESTIMATED_MINUTES} menit · 4 fase</span>
          <div class="dpw-title">${escapeHtml(theme)}</div>
        </div>
        <div class="dpw-controls">
          <button type="button" class="btn-dpw-play" id="btn-dpw-play-toggle" title="Mulai saat teduh hari ini" aria-label="Mulai saat teduh">
            <span id="dpw-play-icon" aria-hidden="true">▶</span>
          </button>
          <button type="button" class="btn-dpw-stop hidden" id="btn-dpw-stop" title="Hentikan saat teduh" aria-label="Hentikan saat teduh">⏹</button>
        </div>
      </div>
      <div class="dpw-session-phases" id="dpw-session-phases" aria-label="Progres saat teduh"></div>
      <div class="dpw-meditation-overlay hidden" id="dpw-meditation-overlay" aria-live="polite">
        <span class="dpw-meditation-icon">🕊️</span>
        <p class="dpw-meditation-label">Renungkan firman yang baru didengar…</p>
        <p class="dpw-meditation-hint">Diam sejenak — biarkan Roh Kudus berbicara</p>
        <p class="dpw-meditation-timer" id="dpw-meditation-timer">${formatMeditationTime(MEDITATION_DURATION_SEC)}</p>
      </div>
      <div class="dpw-equalizer" id="dpw-equalizer">
        <span></span><span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <p class="dpw-phase-hint">Prolog &amp; ayat (~${OPENING_TARGET_MIN} m) → Renungkan (${meditationMin} m) → Refleksi (${REFLECTION_TARGET_MIN}–${REFLECTION_TARGET_MAX} m) → Doa (${PRAYER_TARGET_MIN}–${PRAYER_TARGET_MAX} m)</p>
    </div>

    <button type="button" class="btn-pill primary glow btn-devotion-listen-full" id="btn-devotion-listen">🎙️ Mulai Saat Teduh</button>`;

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

  el.innerHTML = EMOTIONS.map(
    (e) =>
      `<button type="button" class="emotion-chip tone-${escapeHtml(e.id)}" data-id="${escapeHtml(e.id)}" data-ref="${escapeHtml(e.ref)}" aria-pressed="false">
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
    <p class="prayer-preview-sub">${escapeHtml(preset.subtitle || "Doa terpandu")}</p>
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

  el.innerHTML = PRAYER_PRESETS.map(
    (p) =>
      `<button type="button" class="prayer-card tone-${escapeHtml(p.id)}" data-id="${escapeHtml(p.id)}" aria-pressed="false">
        <span class="prayer-emoji">${p.emoji}</span>
        <div class="prayer-info">
          <span class="prayer-title">${escapeHtml(p.title || p.label || "Doa")}</span>
          <span class="prayer-sub">${escapeHtml(p.subtitle || "Doa terpandu")}</span>
        </div>
      </button>`,
  ).join("");

  el.querySelectorAll(".prayer-card").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const presetId = btn.getAttribute("data-id");
      const preset = PRAYER_PRESETS.find((p) => p.id === presetId);
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
  const oneYearCard = document.getElementById("one-year-bible-card");
  const plansSummaryEl = document.getElementById("reading-plans-summary");
  const { year, dayOfYear, plan, totalDays } = getTodayOneYearDay();
  const oyProgress = getOneYearProgress();
  const oyDoneCount = countOneYearCompleted(year);
  const thematicProgress = loadThematicProgress();
  const thematicActive = THEMATIC_READING_PLANS.filter((p) => {
    const done = thematicProgress[p.id]?.completedDays?.length || 0;
    return done > 0 && done < p.totalDays;
  }).length;

  if (plansSummaryEl) {
    plansSummaryEl.innerHTML = `
      <span class="reading-plans-chip">365 hari · 1 tahun</span>
      <span class="reading-plans-chip">${THEMATIC_READING_PLANS.length} rencana tematik</span>
      <span class="reading-plans-chip reading-plans-chip--year">Hari ${dayOfYear} · ${year}</span>
      ${oyDoneCount ? `<span class="reading-plans-chip reading-plans-chip--read">${oyDoneCount}/${totalDays} dibaca</span>` : ""}
      ${thematicActive ? `<span class="reading-plans-chip reading-plans-chip--active">${thematicActive} tematik aktif</span>` : ""}
    `;
  }

  if (oneYearCard) {
    const isDone = !!oyProgress.completed[String(dayOfYear)];
    const doneCount = oyDoneCount;
    const readPct = Math.round((doneCount / totalDays) * 100);
    const calPct = getCalendarPercent(dayOfYear);

    oneYearCard.innerHTML = `
      <div class="oy-head">
        <div class="oy-badge-wrap">
          <span class="oy-icon">📅</span>
          <div class="oy-head-text">
            <span class="oy-kicker">PROGRAM ALKITAB 1 TAHUN · ${year}</span>
            <h3 class="oy-title">Hari ke-${dayOfYear} dari ${totalDays || ONE_YEAR_TOTAL_DAYS}</h3>
            <p class="oy-theme">${escapeHtml(plan.theme)}</p>
          </div>
        </div>
      </div>

      <div class="oy-stats-row" aria-label="Progres baca Alkitab 1 tahun">
        <div class="oy-stat">
          <div class="oy-stat-top">
            <span class="oy-stat-label">Sudah dibaca</span>
            <span class="oy-stat-val">${doneCount}/${totalDays}</span>
          </div>
          <div class="oy-stat-bar" role="progressbar" aria-valuenow="${readPct}" aria-valuemin="0" aria-valuemax="100">
            <div class="oy-stat-fill oy-stat-fill-read" style="width:${readPct}%"></div>
          </div>
        </div>
        <div class="oy-stat">
          <div class="oy-stat-top">
            <span class="oy-stat-label">Posisi tahun</span>
            <span class="oy-stat-val">Hari ${dayOfYear}</span>
          </div>
          <div class="oy-stat-bar" role="progressbar" aria-valuenow="${calPct}" aria-valuemin="0" aria-valuemax="100">
            <div class="oy-stat-fill oy-stat-fill-cal" style="width:${calPct}%"></div>
          </div>
        </div>
      </div>

      <div class="oy-passages-row">
        <button type="button" class="oy-passage-pill" data-ref="${escapeHtml(plan.pl)}">
          <span class="oy-tag-lbl">📜 PL:</span> ${escapeHtml(plan.pl)} ↗
        </button>
        <button type="button" class="oy-passage-pill" data-ref="${escapeHtml(plan.pb)}">
          <span class="oy-tag-lbl">📖 PB:</span> ${escapeHtml(plan.pb)} ↗
        </button>
        <button type="button" class="oy-passage-pill" data-ref="${escapeHtml(plan.mazmur)}">
          <span class="oy-tag-lbl">🕊️ Hikmat:</span> ${escapeHtml(plan.mazmur)} ↗
        </button>
      </div>

      <div class="oy-actions-row">
        <button type="button" class="btn-pill primary glow" id="btn-oy-listen">
          🎙️ Putar Audio Firman Hari Ini
        </button>
        <button type="button" class="btn-pill btn-soft ${isDone ? "active" : ""}" id="btn-oy-check">
          ${isDone ? "✓ Hari Ini Selesai Dibaca" : "○ Tandai Selesai Dibaca"}
        </button>
      </div>
    `;

    oneYearCard.querySelectorAll(".oy-passage-pill").forEach((btn) => {
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
          `Bacakan dan berikan renungan untuk program baca Alkitab 1 Tahun hari ke-${dayOfYear}: Perjanjian Lama dari ${plan.pl}, Perjanjian Baru dari ${plan.pb}, serta Mazmur dari ${plan.mazmur}. Pimpin doa berkat.`
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
  const activeCount = THEMATIC_READING_PLANS.filter((plan) => {
    const done = progress[plan.id]?.completedDays?.length || 0;
    return done > 0 && done < plan.totalDays;
  }).length;
  const doneCountAll = THEMATIC_READING_PLANS.filter((plan) => {
    const done = progress[plan.id]?.completedDays?.length || 0;
    return done >= plan.totalDays;
  }).length;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <span class="plan-summary-chip">${THEMATIC_READING_PLANS.length} rencana</span>
      ${activeCount ? `<span class="plan-summary-chip plan-summary-chip--active">${activeCount} sedang jalan</span>` : ""}
      ${doneCountAll ? `<span class="plan-summary-chip plan-summary-chip--done">${doneCountAll} selesai</span>` : ""}
    `;
  }

  grid.innerHTML = THEMATIC_READING_PLANS.map((plan) => {
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
            <span class="plan-card-duration">${plan.totalDays} hari · ${formatPlanWeeks(plan.totalDays)}</span>
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
  const plan = THEMATIC_READING_PLANS.find((p) => p.id === planId);
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
            <span class="plan-detail-stat-label">Progres baca</span>
            <span class="plan-detail-stat-val">${doneCount}/${plan.totalDays} hari</span>
          </div>
          <div class="plan-detail-stat-bar">
            <div class="plan-detail-stat-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="plan-detail-stat">
          <div class="plan-detail-stat-top">
            <span class="plan-detail-stat-label">Durasi</span>
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
          <h4 class="completion-title">Selamat! Rencana Selesai</h4>
          <p class="completion-desc">Anda telah menyelesaikan seluruh bacaan ${escapeHtml(plan.title)} dengan setia. Teruslah bertumbuh dalam firman Tuhan!</p>
          <button type="button" class="btn-pill btn-soft btn-restart-plan" data-plan-id="${plan.id}">🔁 Ulangi Rencana Ini</button>
        </div>
      </div>
    `;
  } else {
    headerBannerHtml = `
      <div class="plan-hero-action glass-card">
        <div class="hero-action-meta">
          <span class="hero-badge">👉 BACA HARI INI</span>
          <h4 class="hero-day-title">Hari ke-${currentUnfinishedDay.day}: ${escapeHtml(currentUnfinishedDay.title)}</h4>
          <p class="hero-day-ref">${escapeHtml(currentUnfinishedDay.ref)} · ${escapeHtml(currentUnfinishedDay.desc)}</p>
        </div>
        <div class="hero-action-buttons">
          <button type="button" class="btn-pill primary full glow btn-hero-start-day" data-ref="${escapeHtml(currentUnfinishedDay.ref)}" data-title="${escapeHtml(currentUnfinishedDay.title)}" data-desc="${escapeHtml(currentUnfinishedDay.desc)}" data-day="${currentUnfinishedDay.day}">
            🎙 Putar Audio &amp; Mulai Renungan
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
            <button type="button" class="btn-check-day ${isDone ? "checked" : ""}" data-plan-id="${plan.id}" data-day="${d.day}" title="${isDone ? "Tandai belum selesai" : "Tandai selesai"}">
              ${isDone ? "✓" : d.day}
            </button>
            <div class="thematic-day-info">
              <div class="thematic-day-top">
                <div class="thematic-title-wrap">
                  ${isToday ? `<span class="badge-today-mini">HARI INI</span>` : ""}
                  <span class="thematic-day-label">Hari ke-${d.day}: ${escapeHtml(d.title)}</span>
                </div>
                <button type="button" class="thematic-day-ref" data-ref="${escapeHtml(d.ref)}">${escapeHtml(d.ref)} ↗</button>
              </div>
              <p class="thematic-day-desc">${escapeHtml(d.desc)}</p>
              <div class="thematic-day-actions">
                <button type="button" class="btn-day-micro btn-day-open" data-ref="${escapeHtml(d.ref)}">📖 Buka Firman</button>
                <button type="button" class="btn-day-micro btn-day-listen" data-ref="${escapeHtml(d.ref)}" data-title="${escapeHtml(d.title)}" data-desc="${escapeHtml(d.desc)}">🔊 Dengarkan</button>
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
        `Bacakan rencana baca hari ke-${day} dari "${plan.title}": ${title} (${ref}). ${desc}. Mari kita renungkan maknanya dan pimpin doa singkat.`
      );
    }
    toggleThematicDay(plan.id, day);
    renderThematicPlans();
    renderThematicPlanDetail(plan.id);
    markTodayRead();
  });

  // Listener Restart Plan
  daysList.querySelector(".btn-restart-plan")?.addEventListener("click", () => {
    if (confirm("Ulangi progres rencana baca ini dari awal?")) {
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
        homeBridge.askVoice(`Bacakan firman dari ${ref}: "${title}". ${desc}. Berikan renungan dan berkat.`);
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

export function renderPrayerJournal() {
  const listEl = document.getElementById("renungan-prayer-journal-list");
  const statsEl = document.getElementById("prayer-journal-stats");
  if (!listEl) return;

  const list = loadPrayerJournal();
  const stats = getPrayerJournalStats(list);

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="prayer-stats-grid">
        <div class="prayer-stat-card">
          <span class="prayer-stat-num">${stats.total}</span>
          <span class="prayer-stat-label">Total Pokok Doa</span>
        </div>
        <div class="prayer-stat-card">
          <span class="prayer-stat-num">${stats.active}</span>
          <span class="prayer-stat-label">Permohonan Aktif</span>
        </div>
        <div class="prayer-stat-card answered">
          <span class="prayer-stat-num">${stats.answered}</span>
          <span class="prayer-stat-label">Doa Terjawab</span>
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
        ? "Belum ada doa yang ditandai terjawab. Syukur kepada Tuhan saat jawaban-Nya datang."
        : currentPrayerFilter === "active"
          ? "Semua pokok doa sudah ditandai terjawab, atau belum ada doa tersimpan."
          : "Mulai catat permohonan doa Anda — judul singkat sudah cukup; catatan opsional.";
    listEl.innerHTML = `
      <div class="prayer-journal-empty">
        <span class="empty-icon">🕊️</span>
        <p class="prayer-empty-title">Belum ada pokok doa di kategori ini</p>
        <p class="prayer-empty-note">${escapeHtml(emptyHint)}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((p) => {
      const isAnswered = p.status === "answered";
      const cat = PRAYER_CATEGORIES.find((c) => c.id === p.category) || { name: "Umum", icon: "🕊️" };
      return `
      <div class="prayer-journal-card glass-card ${isAnswered ? "answered-card" : ""}">
        <div class="pj-head">
          <div class="pj-head-left">
            <span class="pj-badge">${cat.icon} ${escapeHtml(cat.name)}</span>
            <span class="pj-status-badge ${isAnswered ? "badge-answered" : "badge-active"}">${isAnswered ? "🎉 Terjawab" : "⏳ Aktif"}</span>
          </div>
          <span class="pj-date">${escapeHtml(p.date || "")}</span>
        </div>
        <h4 class="pj-title">${escapeHtml(p.title)}</h4>
        ${p.content ? `<p class="pj-content">${escapeHtml(p.content)}</p>` : ""}
        ${isAnswered ? `
          <div class="pj-answered-box">
            <span class="answered-badge">✨ Dijawab Tuhan${p.answeredDate ? ` · ${escapeHtml(p.answeredDate)}` : ""}</span>
            ${p.testimony ? `<p class="answered-testimony">${escapeHtml(p.testimony)}</p>` : ""}
          </div>
        ` : ""}
        <div class="pj-actions">
          <button type="button" class="btn-pj-action btn-support-prayer" data-prayer-id="${p.id}">
            🙏 Doakan Bersama AI (${p.prayerCount || 1})
          </button>
          <button type="button" class="btn-pj-action btn-mark-answered" data-prayer-id="${p.id}">
            ${isAnswered ? "↩ Batalkan Terjawab" : "🎉 Tandai Terjawab"}
          </button>
          <button type="button" class="btn-pj-action btn-delete-prayer" data-prayer-id="${p.id}">Hapus</button>
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
      if (!id || !confirm("Hapus pokok doa ini?")) return;
      deletePrayer(id);
      renderPrayerJournal();
    });
  });
}

/* --- DAILY BIBLE QUIZ CHALLENGE --- */
export function openHomeQuizSection() {
  const el = document.getElementById("home-quiz-section");
  if (el instanceof HTMLDetailsElement) {
    el.open = true;
  }
}

export function closeHomeQuizSection() {
  const el = document.getElementById("home-quiz-section");
  if (el instanceof HTMLDetailsElement) {
    el.open = false;
  }
}

export function renderDailyBibleQuiz() {
  const container = document.getElementById("daily-quiz-container");
  const scoreBadge = document.getElementById("quiz-score-badge");
  const chipCount = document.getElementById("home-quiz-chip-count");
  const chipScore = document.getElementById("home-quiz-chip-score");
  if (!container) return;

  const dailyQuestions = getDailyQuizQuestions();
  const { answers: quizUserAnswers } = loadQuizState();
  const { correct: correctCount, answered: totalAnswered, total } = scoreDailyQuiz(dailyQuestions, quizUserAnswers);
  const allComplete = isDailyQuizComplete(dailyQuestions, quizUserAnswers);

  if (chipCount) {
    chipCount.textContent = `${DAILY_QUIZ_COUNT} pertanyaan / hari · rotasi`;
  }
  if (chipScore) {
    if (allComplete) {
      chipScore.textContent = `Selesai · ${correctCount}/${total} benar`;
    } else if (totalAnswered > 0) {
      chipScore.textContent = `Progres ${totalAnswered}/${total}`;
    } else {
      chipScore.textContent = "Belum dimulai hari ini";
    }
  }

  container.innerHTML = dailyQuestions.map((q, qIdx) => {
    const userChoice = quizUserAnswers[q.id];
    const isAnswered = typeof userChoice === "number";

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

    return `
      <div class="quiz-question-card glass-card">
        <div class="quiz-card-top">
          <span class="quiz-qnum">Pertanyaan ${qIdx + 1} dari ${dailyQuestions.length}</span>
          <span class="quiz-ref-badge">${escapeHtml(q.verseRef)}</span>
        </div>
        <h4 class="quiz-qtext">${escapeHtml(q.question)}</h4>
        <div class="quiz-options-list">${optionsHtml}</div>
        ${isAnswered ? `
          <div class="quiz-explanation ${userChoice === q.correctIndex ? "success" : "review"}">
            <span class="exp-icon">${userChoice === q.correctIndex ? "✓ Benar!" : "ℹ️ Penjelasan:"}</span>
            <p class="exp-text">${escapeHtml(q.explanation)}</p>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  if (allComplete) {
    container.innerHTML += `
      <div class="quiz-finish-card glass-card">
        <span class="quiz-finish-icon" aria-hidden="true">${correctCount === total ? "🏆" : "✨"}</span>
        <h4 class="quiz-finish-title">Kuis Hari Ini Selesai</h4>
        <p class="quiz-finish-sub">Skor: <strong>${correctCount} / ${total} benar</strong> — soal baru besok pagi.</p>
      </div>
    `;
  }

  if (scoreBadge) {
    if (totalAnswered > 0) {
      scoreBadge.classList.remove("hidden");
      scoreBadge.innerHTML = `Skor Harian: <strong>${correctCount} / ${total} Benar</strong> (${Math.round((correctCount / total) * 100)}%)`;
    } else {
      scoreBadge.classList.add("hidden");
    }
  }

  container.querySelectorAll(".quiz-opt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-qid");
      const opt = Number(btn.getAttribute("data-opt"));
      if (!qid || isNaN(opt)) return;

      const state = saveQuizAnswer(qid, opt);
      renderDailyBibleQuiz();
      if (isDailyQuizComplete(dailyQuestions, state.answers)) {
        markTodayRead();
      }
    });
  });
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
  try { renderEmotions(); } catch (e) { console.warn("[rhema] renderEmotions:", e); }
  try { renderPrayers(); } catch (e) { console.warn("[rhema] renderPrayers:", e); }
  try { renderHomeStreakMini(); } catch (e) { console.warn("[rhema] renderHomeStreakMini:", e); }
  void preloadTodayGuidedPrayers();
}

export function renderHomeStreakMini() {
  const el = document.getElementById("home-streak-mini");
  if (!el) return;
  const streak = loadStreak();
  const count = streak.count || 0;
  el.innerHTML = `
    <span class="mini-streak-fire">${count > 0 ? "🔥" : "✨"}</span>
    <span class="mini-streak-text">
      <strong>${count} hari</strong> streak firman
    </span>
    <span class="mini-streak-arrow">→</span>`;
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
    if (/** @type {CustomEvent} */ (e).detail?.screen === "renungan") renderLectioJournalList();
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
        doaScreen.querySelectorAll(".prayer-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentPrayerFilter = btn.getAttribute("data-prayer-filter") || "all";
        renderPrayerJournal();
      });
    });

    const form = document.getElementById("form-add-prayer");
    const titleInput = /** @type {HTMLInputElement | null} */ (document.getElementById("input-prayer-title"));
    const catSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById("select-prayer-category"));
    const contentInput = /** @type {HTMLTextAreaElement | null} */ (document.getElementById("input-prayer-content"));

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
      alert("Pokok doa berhasil disimpan ke jurnal!");
    });

    document.getElementById("btn-pray-all-journal")?.addEventListener("click", () => {
      const activePrayers = loadPrayerJournal().filter((p) => p.status === "active");
      if (!activePrayers.length) {
        alert("Belum ada pokok doa aktif. Tuliskan permohonan doa Anda terlebih dahulu.");
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
