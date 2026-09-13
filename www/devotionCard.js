/**
 * Devotion card — render renungan harian + sesi saat teduh inline (voice/TTS).
 */
import { ambientEngine, forceStopAmbientAndSpeech } from "./ambientAudio.js";
import { DEVOTION_SNIPPETS } from "./homeWorshipData.js";
import { getEffectiveBibleVersion } from "./localeProfile.js";
import { escapeHtml } from "./markdown.js";
import { t } from "./uiStrings.js";
import {
  devotionTimelineShortLabels,
  formatDevotionDate,
  localizedDevotionSessionPhases,
} from "./worshipUiI18n.js";
import {
  createDevotionSessionController,
  formatMeditationTime,
  MEDITATION_DURATION_SEC,
  SESSION_ESTIMATED_MINUTES,
} from "./devotionSessionEngine.js";

const DEVOTION_PLAYBACK_MAX_MS = {
  reflection: 7 * 60 * 1000,
  prayer: 3 * 60 * 1000,
  opening: 3 * 60 * 1000,
};

const DEVOTION_TIMELINE_TIMES = ["~2m", "1m", "5-6m", "2m"];

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
 *   syncComposerStopForInlineSessions?: () => void,
 *   stopOtherInlineSessions?: () => void,
 *   isOtherInlineSessionActive?: () => boolean,
 * } | null} */
let devotionBridge = null;

/** @type {ReturnType<typeof createDevotionSessionController> | null} */
let devotionSession = null;

/** @type {object | null} */
let currentDevotionData = null;

/** @param {NonNullable<typeof devotionBridge>} bridge */
export function configureDevotionCardPanel(bridge) {
  devotionBridge = bridge;
}

export function getCurrentDevotionData() {
  return currentDevotionData;
}

export function devotionPodcastSessionActive() {
  return getDevotionSession().isActive();
}

export function stopDevotionSession() {
  getDevotionSession().stop();
}

export function getDevotionSession() {
  if (devotionSession) return devotionSession;
  devotionSession = createDevotionSessionController({
    onPhaseChange: (index) => renderSessionPhaseBar(index),
    onMeditationStart: (secondsLeft) => {
      window.__rhemaDevotionSilentPhase = true;
      setDevotionMeditationUi(true, secondsLeft);
      devotionBridge?.syncComposerStopForInlineSessions?.();
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
      if (devotionBridge?.voiceTransport?.voice?.sendTextOrStart) {
        devotionBridge.voiceTransport.voiceProfile = "alkitab-voice";
      }
      ambientEngine.start("harp");
    },
    onSessionEnd: (reason) => {
      window.__rhemaDevotionSilentPhase = false;
      const finalizeVoice = async () => {
        try {
          if (reason === "complete") {
            const idle = devotionBridge?.voiceTransport?.voice?.waitForPlaybackIdle?.(15000);
            if (idle) await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, 15500))]);
          }
          devotionBridge?.voiceTransport?.voice?.stop?.();
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
    onMarkRead: () => devotionBridge?.markTodayRead?.(),
    waitPlaybackIdle: () =>
      devotionBridge?.waitInlineSessionPlaybackIdle?.(
        () => devotionSession?.getCurrentPhaseId?.(),
        DEVOTION_PLAYBACK_MAX_MS,
      ) ?? Promise.resolve(),
    onSpeakPhase: (prompt) => {
      devotionBridge?.speakInlineSessionPhase?.(prompt, () => {
        if (devotionSession?.isActive()) void devotionSession.onVoiceTurnComplete();
      });
    },
  });
  return devotionSession;
}

function isDevotionListenUiActive() {
  return devotionPodcastSessionActive() || Boolean(devotionBridge?.isOtherInlineSessionActive?.());
}

function setDevotionPodcastUiPlaying(playing) {
  for (const icon of document.querySelectorAll("#dpw-play-icon")) icon.textContent = playing ? "⏸" : "▶";
  document.querySelectorAll("#dpw-equalizer").forEach((el) => el.classList.toggle("active", playing));
  document.querySelectorAll(".devotion-podcast-widget").forEach((el) => el.classList.toggle("playing", playing));
  document.querySelectorAll(".btn-dpw-stop").forEach((el) => {
    el.classList.toggle("hidden", !playing);
    el.disabled = !playing;
  });
  if (playing) devotionBridge?.syncComposerStopForInlineSessions?.();
  syncDevotionListenButton();
}

function renderSessionPhaseBar(activeIndex) {
  const el = document.getElementById("dpw-session-phases");
  if (!el) return;
  const phases = localizedDevotionSessionPhases();
  const timelineShort = devotionTimelineShortLabels();
  const useTimeline = el.classList.contains("devotion-audio-timeline");
  if (useTimeline) {
    el.innerHTML = phases
      .map((phase, idx) => {
        const state = idx < activeIndex ? "is-done" : idx === activeIndex ? "is-active" : "";
        const short = timelineShort[idx] || phase.label;
        const timeLbl = DEVOTION_TIMELINE_TIMES[idx] || "";
        const dotChar = idx <= activeIndex && activeIndex >= 0 ? "●" : "○";
        return `<div class="dat-step ${state}" title="${escapeHtml(phase.label)}">
        <span class="dat-dot-char" aria-hidden="true">${dotChar}</span>
        <span class="dat-label">${escapeHtml(short)}</span>
        <span class="dat-time">${escapeHtml(timeLbl)}</span>
      </div>`;
      })
      .join("");
    return;
  }
  el.innerHTML = phases
    .map((phase, idx) => {
      const state = idx < activeIndex ? "done" : idx === activeIndex ? "active" : "";
      return `<span class="dpw-phase-pill ${state}" title="${escapeHtml(phase.label)}"><span class="dpw-phase-icon">${phase.icon}</span><span class="dpw-phase-label">${escapeHtml(phase.label)}</span></span>`;
    })
    .join("");
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

export function syncDevotionListenButton() {
  const btn = document.getElementById("btn-devotion-listen");
  const stopBtn = document.getElementById("btn-devotion-listen-stop");
  const active = isDevotionListenUiActive();
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

export function resetDevotionPodcastUi() {
  getDevotionSession().stop();
}

function stopDevotionPodcast() {
  forceStopAmbientAndSpeech();
  getDevotionSession().stop();
}

function startDevotionPodcast() {
  const devotion = currentDevotionData;
  if (!devotion) {
    document.dispatchEvent(
      new CustomEvent("rhema-alkitab-toast", {
        detail: "Renungan hari ini belum siap — tunggu sebentar lalu coba lagi.",
      }),
    );
    return;
  }

  const session = getDevotionSession();
  if (session.isActive()) {
    session.stop();
    return;
  }

  devotionBridge?.stopOtherInlineSessions?.();
  devotionBridge?.markInlineVoiceTap?.();
  window.__rhemaInlineVoiceUntil = Date.now() + 25 * 60 * 1000;
  session.start(devotion);
}

function syncDevotionPodcastUi() {
  if (isDevotionListenUiActive()) {
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
    devotionBridge?.voiceTransport?.voice?.stop?.();
    stopDevotionPodcast();
    return;
  }

  if (playBtn && isDevotionListenUiActive()) {
    stopDevotionPodcast();
    return;
  }

  if (playBtn) {
    startDevotionPodcast();
  }
}

export function bindDevotionPodcastControls() {
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

function devotionSnippet() {
  const day = Math.floor(Date.now() / 86_400_000);
  return DEVOTION_SNIPPETS[day % DEVOTION_SNIPPETS.length];
}

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
    if (isDevotionListenUiActive()) {
      stopDevotionPodcast();
      return;
    }
    startDevotionPodcast();
  };

  const listenBtn = document.getElementById("btn-devotion-listen");
  listenBtn?.addEventListener("click", runDevotionListen, true);
}
