/**
 * Home Worship & Renungan UI — AI Devotion Engine, Sub-Tabs Segmented, Rencana Baca Tematik, Jurnal Doa Terjawab, & Kuis Alkitab.
 */

import {
  initBreathingPrayerUI,
  speakIndonesianText,
  warmupSpeechVoices,
} from "./ambientAudio.js";
import {
  closeHomeQuizSection,
  configureDailyQuizPanel,
  openHomeQuizSection,
  renderDailyBibleQuiz,
} from "./dailyQuizPanel.js";

export { openHomeQuizSection, closeHomeQuizSection, renderDailyBibleQuiz };
import {
  markTodayRead,
  renderHomeStreakMini,
  renderStreakBar,
} from "./homeStreakPanel.js";

export { markTodayRead, renderHomeStreakMini };
import { openDailyStoryModal } from "./storyViewer.js";
import { configureThematicPlansPanel, renderThematicPlans } from "./thematicPlansPanel.js";

export { renderThematicPlans };
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
  bindDevotionPodcastControls,
  configureDevotionCardPanel,
  devotionPodcastSessionActive,
  getCurrentDevotionData,
  getDevotionSession,
  renderDevotionCard,
  resetDevotionPodcastUi,
  stopDevotionSession,
  syncDevotionListenButton,
} from "./devotionCard.js";

export { renderDevotionCard };
import { preloadTodayGuidedPrayers } from "./aiGuidedPrayerEngine.js";
import {
  configureEmotionPrayerPanel,
  emotionPrayerSessionActive,
  getEmotionSession,
  getGuidedPrayerSession,
  renderEmotions,
  renderPrayers,
  stopEmotionPrayerSessions,
} from "./emotionPrayerPanel.js";
import {
  bindPrayerJournalScreen,
  configurePrayerJournalPanel,
  renderPrayerJournal,
  syncPrayerCategoryPill,
} from "./prayerJournalPanel.js";

export { renderPrayerJournal };
import { openVisionLensModal } from "./visionLens.js?v=20260911-play";
import { openWorshipSongwriterModal } from "./worshipSongwriter.js";
import { openKidungHubModal } from "./laguPanel.js";
import { renderLectioJournalList } from "./lectioDivina.js";

/** @type {import("../shared/chatCore.js").ChatTransport | null} */
let voiceTransport = null;
export function stopAllRenunganInlineSessions() {
  stopDevotionSession();
  stopEmotionPrayerSessions();
}

function speakInlineSessionPhase(prompt, onTurnComplete) {
  window.__rhemaPrepareVoiceUserPrompt?.();
  if (voiceTransport?.voice?.sendTextOrStart) {
    voiceTransport.voiceProfile = "alkitab-voice";
    void voiceTransport.voice.sendTextOrStart(prompt, {
      mic: false,
      preferClientContent: false,
      inlineListen: false,
    });
    return;
  }
  speakIndonesianText(prompt, {
    ambientPreset: "harp",
    stopAmbientOnEnd: false,
    onEnd: () => onTurnComplete?.(),
    onError: () => stopAllRenunganInlineSessions(),
  });
}

/** @param {() => string | null | undefined} getPhaseId @param {Record<string, number>} phaseMaxMs */
async function waitInlineSessionPlaybackIdle(getPhaseId, phaseMaxMs, defaultMaxMs = 120_000) {
  const phaseId = getPhaseId?.() ?? null;
  const maxMs = (phaseId && phaseMaxMs[phaseId]) || defaultMaxMs;
  const idle = voiceTransport?.voice?.waitForPlaybackIdle?.(maxMs);
  if (!idle) return;
  await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, maxMs + 500))]);
}

export function anyInlineRenunganSessionActive() {
  return devotionPodcastSessionActive() || emotionPrayerSessionActive();
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
    const devotionData = getCurrentDevotionData();
    if (devotionData) renderDevotionCard(devotionData);
  } catch (e) {
    console.warn("[rhema] renderDevotionCard refresh:", e);
  }
  void preloadTodayGuidedPrayers();
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
  voiceTransport = transport;
  configureThematicPlansPanel({
    askVoice: (text) => api.askVoice(text),
    markTodayRead: () => markTodayRead(),
  });
  configurePrayerJournalPanel({
    askVoice: (text) => api.askVoice(text),
    markTodayRead: () => markTodayRead(),
  });
  configureDailyQuizPanel({
    askVoice: (text) => api.askVoice(text),
    go: (screen) => api.go(screen),
    markTodayRead: () => markTodayRead(),
    renderHomeStreakMini: () => renderHomeStreakMini(),
  });
  configureEmotionPrayerPanel({
    markTodayRead: () => markTodayRead(),
    markInlineVoiceTap: () => api.markInlineVoiceTap?.(),
    voiceTransport: transport,
    speakInlineSessionPhase,
    waitInlineSessionPlaybackIdle,
    stopAllInlineSessions: () => stopAllRenunganInlineSessions(),
  });
  configureDevotionCardPanel({
    markTodayRead: () => markTodayRead(),
    markInlineVoiceTap: () => api.markInlineVoiceTap?.(),
    voiceTransport: transport,
    speakInlineSessionPhase,
    waitInlineSessionPlaybackIdle,
    syncComposerStopForInlineSessions,
    stopOtherInlineSessions: () => stopEmotionPrayerSessions(),
    isOtherInlineSessionActive: () => emotionPrayerSessionActive(),
  });
  warmupSpeechVoices();

  document.addEventListener("rhema-locale-home-refresh", () => {
    try { renderHomeStreakMini(); } catch { /* ignore */ }
    try { renderDailyBibleQuiz(); } catch { /* ignore */ }
    try { renderPrayerJournal(); } catch { /* ignore */ }
    try { syncPrayerCategoryPill(); } catch { /* ignore */ }
    try { renderRenunganShell(); } catch { /* ignore */ }
    try { renderAlkitabProgramShell(); } catch { /* ignore */ }
    try { document.dispatchEvent(new CustomEvent("rhema-locale-alkitab-refresh")); } catch { /* ignore */ }
    try { renderLectioJournalList(); } catch { /* ignore */ }
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

  const sermonDetectBtn = document.getElementById("btn-open-sermon-detector");
  const hasSpeech = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  if (sermonDetectBtn && !hasSpeech) {
    sermonDetectBtn.hidden = true;
    sermonDetectBtn.setAttribute("aria-hidden", "true");
  }
  sermonDetectBtn?.addEventListener("click", () => {
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

  bindPrayerJournalScreen({
    askVoice: (text) => api.askVoice(text),
    markTodayRead: () => markTodayRead(),
  });

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
