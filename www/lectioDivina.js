/**
 * Lectio Divina 4-Step Guided Meditation & Voice Persona Manager.
 */

import { ambientEngine } from "./ambientAudio.js";
import {
  getAiLanguageRule,
  getEffectiveAiLang,
  getEffectiveBibleVersion,
  getUiLocale,
} from "./localeProfile.js";
import { escapeAttr, escapeHtml } from "./markdown.js";
import { t } from "./uiStrings.js";

export const LECTIO_JOURNAL_KEY = "rhema-lectio-journal";

export const VOICE_PERSONAS = [
  { id: "shepherd", emoji: "🕊️", pitch: 0.92, rate: 0.9 },
  { id: "friend", emoji: "☀️", pitch: 1.05, rate: 0.96 },
  { id: "psalm", emoji: "🌙", pitch: 0.88, rate: 0.85 },
];

const SELECTED_PERSONA_KEY = "rhema-voice-persona";

/** @type {{
 *   active: boolean;
 *   autoMode: boolean;
 *   advancing: boolean;
 *   step: number;
 *   goToStep: (step: number) => void;
 *   getPersona: () => typeof VOICE_PERSONAS[number];
 *   onStartVoice: (persona: typeof VOICE_PERSONAS[number], step: number) => void;
 *   waitPlaybackIdle?: () => Promise<void>;
 *   waitForJournal?: (ms: number) => Promise<void>;
 *   setSpeaking?: (on: boolean) => void;
 *   setStatus?: (text: string) => void;
 *   pauseAuto: () => void;
 *   voiceGen: number;
 *   close?: () => void;
 * } | null} */
let lectioSession = null;

function lectioPhases() {
  return [
    { n: 1, latin: "Silencio", idLabel: t("lectio.phase.1"), hint: t("lectio.hint.1") },
    { n: 2, latin: "Lectio", idLabel: t("lectio.phase.2"), hint: t("lectio.hint.2") },
    { n: 3, latin: "Meditatio", idLabel: t("lectio.phase.3"), hint: t("lectio.hint.3") },
    { n: 4, latin: "Oratio", idLabel: t("lectio.phase.4"), hint: t("lectio.hint.4") },
  ];
}

function personaLabel(id) {
  return t(`lectio.persona.${id}`);
}

function personaTone(id) {
  return t(`lectio.persona.${id}.desc`);
}

function bibleShort() {
  return getEffectiveBibleVersion() === "kjv" ? "KJV" : "Alkitab";
}

function bibleKicker() {
  return getEffectiveBibleVersion() === "kjv" ? t("lectio.bible.kjv") : t("lectio.bible.tb");
}

export function isLectioSessionActive() {
  return Boolean(lectioSession?.active);
}

export function isLectioModalOpen() {
  return Boolean(document.getElementById("lectio-divina-modal"));
}

export function stopLectioSession() {
  if (lectioSession) lectioSession.active = false;
  lectioSession = null;
}

/** Dipanggil saat sesi suara gagal — jangan biarkan mode otomatis macet di fase pertama. */
export function notifyLectioVoiceError(detail = "") {
  const session = lectioSession;
  if (!session?.active) return;
  session.advancing = false;
  session.setSpeaking?.(false);
  const hint = String(detail || "").trim();
  const msg = hint ? `${t("lectio.status.voiceError")} ${hint}` : t("lectio.status.voiceError");
  session.pauseAuto?.(msg);
}

/** Dipanggil saat sesi Gemini Live sudah siap — tampilkan status fase suara. */
export function notifyLectioVoiceLive() {
  const session = lectioSession;
  if (!session?.active) return;
  session.setSpeaking?.(true);
}

/** @param {string} [detail] */
export function notifyLectioVoiceConnecting(detail) {
  const session = lectioSession;
  if (!session?.active) return;
  session.setSpeaking?.(false);
  session.setStatus?.(detail || t("lectio.status.connecting"));
}

export function consumeLectioBack() {
  if (!isLectioModalOpen()) return false;
  lectioSession?.close?.();
  const leftover = document.getElementById("lectio-divina-modal");
  leftover?.remove();
  stopLectioSession();
  return true;
}

/** Lanjut ke fase berikutnya setelah suara AI selesai. */
export async function onLectioVoiceTurnComplete() {
  const session = lectioSession;
  if (!session?.active || !session.autoMode || session.advancing) return;

  session.setSpeaking?.(false);
  session.advancing = true;
  const gen = session.voiceGen;
  try {
    if (session.waitPlaybackIdle) {
      try {
        await session.waitPlaybackIdle();
      } catch {
        /* ignore */
      }
    }
    await new Promise((r) => setTimeout(r, 700));
    if (!session.active || !session.autoMode || session.voiceGen !== gen) return;

    const step = session.step;
    const phases = lectioPhases();

    if (step === 4) {
      session.setStatus?.(t("lectio.status.done"));
      return;
    }

    if (step === 3) {
      session.setStatus?.(t("lectio.status.write"));
      session.advancing = false;
      if (session.waitForJournal) {
        await session.waitForJournal(45_000);
      } else {
        await new Promise((r) => setTimeout(r, 45_000));
      }
      if (!session.active || !session.autoMode || session.step !== 3 || session.voiceGen !== gen) return;
      session.goToStep(4);
      session.onStartVoice(session.getPersona(), 4);
      return;
    }

    const next = step + 1;
    session.setStatus?.(t("lectio.status.next", { phase: phases[next - 1]?.idLabel || "" }));
    await new Promise((r) => setTimeout(r, 450));
    if (!session.active || !session.autoMode || session.voiceGen !== gen) return;
    session.goToStep(next);
    session.onStartVoice(session.getPersona(), next);
  } finally {
    if (lectioSession === session) session.advancing = false;
  }
}

/** @returns {typeof VOICE_PERSONAS[number]} */
export function getSelectedVoicePersona() {
  const id = localStorage.getItem(SELECTED_PERSONA_KEY) || "shepherd";
  return VOICE_PERSONAS.find((p) => p.id === id) || VOICE_PERSONAS[0];
}

/** @param {string} personaId */
export function setSelectedVoicePersona(personaId) {
  localStorage.setItem(SELECTED_PERSONA_KEY, personaId);
}

/** @returns {Array<{ id: string, reference: string, text: string, reflection: string, date: string }>} */
export function loadLectioJournal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LECTIO_JOURNAL_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** @param {{ reference: string, text: string, reflection?: string }} entry */
export function saveLectioJournalEntry(entry) {
  const list = loadLectioJournal();
  list.unshift({
    id: `lectio-${Date.now()}`,
    reference: String(entry.reference || "").trim(),
    text: String(entry.text || "").trim(),
    reflection: String(entry.reflection || "").trim(),
    date: new Date().toLocaleString(getUiLocale(), {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  localStorage.setItem(LECTIO_JOURNAL_KEY, JSON.stringify(list.slice(0, 80)));
}

/**
 * @param {{ reference?: string, text?: string }} verse
 * @param {number} step
 * @param {typeof VOICE_PERSONAS[number]} [persona]
 */
export function buildLectioVoicePrompt(verse, step, persona = getSelectedVoicePersona()) {
  const ref = String(verse?.reference || "").trim();
  const text = String(verse?.text || "").trim();
  const tone = personaTone(persona?.id || "shepherd");
  const bible = bibleShort();
  const langRule = getAiLanguageRule();
  const id = getEffectiveAiLang() === "id";

  const address = id
    ? "Sapa dengan 'saudara' atau 'kita'. Jangan panggil 'jemaat'."
    : "ADDRESS: speak to the listener as friend, you, or we. Never say saudara or jemaat.";

  const noTools = id
    ? "MODE LECTIO DIVINA: hanya panduan suara. Jangan panggil tool apapun."
    : "LECTIO DIVINA MODE: voice guidance only. Do not call any tools.";

  if (id) {
    switch (step) {
      case 1:
        return [
          noTools,
          "Lectio Divina — fase Silencio (hening).",
          "Sapa dengan lembut, undang tarik napas perlahan dan sadari kehadiran Tuhan.",
          "Jangan baca ayat dulu. Durasi ~30 detik.",
          `Gaya suara: ${tone}.`,
          address,
          langRule,
        ].join(" ");
      case 2:
        return [
          noTools,
          `Lectio Divina — fase Lectio. Bacakan ayat ${ref} dari ${bible} dengan perlahan dan khidmat:`,
          `"${text}".`,
          "Jeda 2–3 detik antar kalimat. Ulangi sekali frasa yang paling menonjol.",
          `Gaya suara: ${tone}.`,
          langRule,
        ].join(" ");
      case 3:
        return [
          noTools,
          `Lectio Divina — fase Meditatio untuk ${ref} (${bible}).`,
          `Ayat: "${text}".`,
          "Ajukan 2 pertanyaan refleksi rohani yang menyentuh hati:",
          "kata mana yang paling menggugah, dan apa yang Tuhan katakan untuk hidup hari ini?",
          `Gaya: ${tone}, singkat dan dalam — bukan khotbah panjang.`,
          langRule,
        ].join(" ");
      case 4:
        return [
          noTools,
          `Lectio Divina — fase Oratio untuk ${ref}.`,
          `Pimpin doa penutup 1–2 menit dari ayat ${bible}: "${text}".`,
          "Serahkan hati, minta damai sejahtera, akhiri dengan Amen.",
          `Gaya: ${tone}.`,
          langRule,
        ].join(" ");
      default:
        return `Pandu Lectio Divina 4 langkah untuk ${ref}: "${text}". Gaya: ${tone}. ${langRule}`;
    }
  }

  switch (step) {
    case 1:
      return [
        noTools,
        "Lectio Divina — Silencio (silence).",
        "Greet gently. Invite a slow breath and awareness of God's presence.",
        "Do not read the verse yet. About 30 seconds.",
        `Voice tone: ${tone}.`,
        address,
        langRule,
      ].join(" ");
    case 2:
      return [
        noTools,
        `Lectio Divina — Lectio. Read ${ref} from the ${bible} slowly and reverently:`,
        `"${text}".`,
        "Pause 2–3 seconds between sentences. Repeat the most striking phrase once.",
        `Voice tone: ${tone}.`,
        address,
        langRule,
      ].join(" ");
    case 3:
      return [
        noTools,
        `Lectio Divina — Meditatio for ${ref} (${bible}).`,
        `Verse: "${text}".`,
        "Ask two heart questions: which word stands out, and what is the Lord saying for life today?",
        `Tone: ${tone}, brief and deep — not a long sermon.`,
        address,
        langRule,
      ].join(" ");
    case 4:
      return [
        noTools,
        `Lectio Divina — Oratio for ${ref}.`,
        `Lead a 1–2 minute closing prayer from this ${bible} verse: "${text}".`,
        "Offer the heart, ask for peace, end with Amen.",
        `Tone: ${tone}.`,
        address,
        langRule,
      ].join(" ");
    default:
      return `Guide a 4-step Lectio Divina for ${ref}: "${text}". Tone: ${tone}. ${address} ${langRule}`;
  }
}

/** @param {{ reference?: string, text?: string }} verse */
function buildMeditatioQuestion(verse) {
  return t("lectio.question", { ref: verse.reference || t("lectio.phase.2") });
}

function formatMmSs(totalSec) {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/**
 * @param {{ reference: string, text: string }} verse
 * @param {{
 *   onStartVoiceLectio?: (persona: typeof VOICE_PERSONAS[number], step: number) => void;
 *   waitPlaybackIdle?: () => Promise<void>;
 *   autoStart?: boolean;
 * }} callbacks
 */
export function openLectioDivinaModal(verse, callbacks = {}) {
  let existing = document.getElementById("lectio-divina-modal");
  if (existing) existing.remove();

  const phases = lectioPhases();
  const safeRef = escapeHtml(verse.reference || "");
  const safeText = escapeHtml(verse.text || "");
  const meditatioQuestion = escapeHtml(buildMeditatioQuestion(verse));

  const modal = document.createElement("div");
  modal.id = "lectio-divina-modal";
  modal.className = "apple-modal-overlay lectio-overlay active";

  let currentStep = 1;
  let silencioTimer = null;
  let breathTimer = null;
  let breathInhale = true;
  let selectedPersona = getSelectedVoicePersona();
  let autoMode = callbacks.autoStart !== false;
  let speaking = false;
  /** @type {(() => void) | null} */
  let journalWaitResolve = null;
  let journalWaitTimer = null;

  modal.innerHTML = `
    <div class="apple-modal-sheet lectio-sheet" role="dialog" aria-modal="true" aria-labelledby="lectio-title" data-phase="1">
      <div class="modal-handle-bar"></div>
      <div class="lectio-header">
        <div class="lectio-title-wrap">
          <span class="lectio-badge">${escapeHtml(t("lectio.badge"))}</span>
          <h2 class="lectio-title" id="lectio-title">${escapeHtml(t("lectio.title"))}</h2>
          <p class="lectio-ref-sub">${safeRef}</p>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-lectio" aria-label="${escapeHtml(t("lectio.close"))}">✕</button>
      </div>

      <div class="lectio-status-row">
        <span class="lectio-status-pill" id="lectio-status-pill" aria-live="polite">
          <span class="lectio-status-dot"></span>
          <span id="lectio-status-text">${escapeHtml(autoMode ? t("lectio.status.starting") : t("lectio.status.manual"))}</span>
        </span>
        <button type="button" class="lectio-auto-toggle ${autoMode ? "is-on" : ""}" id="btn-lectio-auto" aria-pressed="${autoMode}">
          ${escapeHtml(autoMode ? t("lectio.auto") : t("lectio.manual"))}
        </button>
      </div>

      <div class="lectio-progress" role="tablist" aria-label="${escapeHtml(t("lectio.phasesAria"))}">
        ${phases
          .map(
            (p) => `
          <button type="button" class="lectio-progress-item ${p.n === 1 ? "is-current" : ""}" data-step="${p.n}" role="tab" aria-selected="${p.n === 1}">
            <span class="lectio-progress-num">${p.n}</span>
            <span class="lectio-progress-name">${escapeHtml(p.idLabel)}</span>
          </button>`,
          )
          .join("")}
      </div>
      <p class="lectio-phase-latin" id="lectio-phase-latin">${escapeHtml(phases[0].latin)} · ${escapeHtml(phases[0].idLabel)}</p>

      <div class="lectio-persona-row" role="group" aria-label="${escapeHtml(t("lectio.personaAria"))}">
        ${VOICE_PERSONAS.map(
          (p) => `
          <button type="button" class="lectio-persona-chip ${p.id === selectedPersona.id ? "active" : ""}" data-persona-id="${escapeAttr(p.id)}" title="${escapeHtml(personaTone(p.id))}">
            <span aria-hidden="true">${p.emoji}</span>
            <span>${escapeHtml(personaLabel(p.id))}</span>
          </button>`,
        ).join("")}
      </div>

      <div class="lectio-body" id="lectio-step-content">
        <div class="lectio-step-view active" id="step-view-1">
          <div class="silencio-circle-wrap">
            <div class="silencio-pulse-ring"></div>
            <div class="silencio-circle" id="silencio-orb">
              <span class="silencio-countdown" id="silencio-count">4</span>
              <span class="silencio-label" id="silencio-label">${escapeHtml(t("lectio.breath.in"))}</span>
            </div>
          </div>
          <p class="lectio-instruction">${escapeHtml(t("lectio.step1.instruction"))}</p>
        </div>

        <div class="lectio-step-view hidden" id="step-view-2">
          <div class="lectio-scripture-box">
            <p class="lectio-verse-kicker">${escapeHtml(bibleKicker())}</p>
            <p class="lectio-verse-text">${safeText}</p>
            <cite class="lectio-verse-cite">${safeRef}</cite>
          </div>
          <p class="lectio-instruction">${escapeHtml(t("lectio.step2.instruction"))}</p>
        </div>

        <div class="lectio-step-view hidden" id="step-view-3">
          <div class="meditatio-prompt-card">
            <p class="lectio-card-kicker">${escapeHtml(t("lectio.step3.kicker"))}</p>
            <p class="meditatio-question">${meditatioQuestion}</p>
          </div>
          <label class="lectio-journal-label" for="lectio-reflection-input">${escapeHtml(t("lectio.step3.label"))}</label>
          <textarea class="meditatio-journal-input" id="lectio-reflection-input" rows="4" placeholder="${escapeHtml(t("lectio.step3.placeholder"))}"></textarea>
          <div class="lectio-journal-wait hidden" id="lectio-journal-wait">
            <div class="lectio-wait-bar"><span id="lectio-wait-fill"></span></div>
            <p class="lectio-wait-caption" id="lectio-wait-caption">${escapeHtml(t("lectio.step3.wait", { time: "0:45" }))}</p>
          </div>
        </div>

        <div class="lectio-step-view hidden" id="step-view-4">
          <div class="oratio-card">
            <p class="lectio-card-kicker">${escapeHtml(t("lectio.step4.kicker"))}</p>
            <p class="oratio-text">${escapeHtml(t("lectio.step4.prayer"))}</p>
          </div>
          <p class="lectio-instruction">${escapeHtml(t("lectio.step4.instruction"))}</p>
        </div>
      </div>

      <div class="lectio-footer" id="lectio-footer">
        <button type="button" class="lectio-btn lectio-btn-ghost" id="btn-lectio-replay">${escapeHtml(t("lectio.replay.voice"))}</button>
        <button type="button" class="lectio-btn lectio-btn-primary" id="btn-lectio-next">${escapeHtml(t("lectio.next.skipSilence"))}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  window.__rhemaLectioOpenedAt = Date.now();
  document.dispatchEvent(new CustomEvent("rhema-subview", { detail: { id: "lectio", open: true } }));

  const sheet = modal.querySelector(".lectio-sheet");
  const statusEl = modal.querySelector("#lectio-status-text");
  const statusPill = modal.querySelector("#lectio-status-pill");
  const autoBtn = modal.querySelector("#btn-lectio-auto");
  const latinEl = modal.querySelector("#lectio-phase-latin");
  const countEl = modal.querySelector("#silencio-count");
  const breathLabel = modal.querySelector("#silencio-label");
  const replayBtn = modal.querySelector("#btn-lectio-replay");
  const nextBtn = modal.querySelector("#btn-lectio-next");
  const waitBox = modal.querySelector("#lectio-journal-wait");
  const waitFill = modal.querySelector("#lectio-wait-fill");
  const waitCaption = modal.querySelector("#lectio-wait-caption");

  try {
    ambientEngine.start("harp");
  } catch {
    /* ignore */
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setSpeaking(on) {
    speaking = on;
    statusPill?.classList.toggle("is-speaking", on);
    sheet?.classList.toggle("is-speaking", on);
    if (on) setStatus(t(`lectio.speak.${currentStep}`) || t("lectio.status.listen"));
  }

  function syncAutoButton() {
    if (!autoBtn) return;
    autoBtn.classList.toggle("is-on", autoMode);
    autoBtn.setAttribute("aria-pressed", String(autoMode));
    autoBtn.textContent = autoMode ? t("lectio.auto") : t("lectio.manual");
  }

  function updateFooter() {
    if (!nextBtn || !replayBtn) return;
    replayBtn.textContent =
      currentStep === 1 ? t("lectio.replay.guide") : currentStep === 4 ? t("lectio.replay.prayer") : t("lectio.replay.voice");
    if (currentStep === 1) nextBtn.textContent = t("lectio.next.skipSilence");
    else if (currentStep === 2) nextBtn.textContent = t("lectio.next.meditate");
    else if (currentStep === 3) nextBtn.textContent = t("lectio.next.pray");
    else nextBtn.textContent = t("lectio.next.save");
    nextBtn.classList.toggle("lectio-btn-finish", currentStep === 4);
  }

  function clearSilencioTimer() {
    if (silencioTimer) {
      clearInterval(silencioTimer);
      silencioTimer = null;
    }
    if (breathTimer) {
      clearInterval(breathTimer);
      breathTimer = null;
    }
  }

  function startBreathCycle() {
    clearSilencioTimer();
    breathInhale = true;
    let n = 4;
    if (countEl) countEl.textContent = "4";
    if (breathLabel) breathLabel.textContent = t("lectio.breath.in");
    breathTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        breathInhale = !breathInhale;
        n = 4;
        if (breathLabel) breathLabel.textContent = breathInhale ? t("lectio.breath.in") : t("lectio.breath.out");
      }
      if (countEl) countEl.textContent = String(n);
    }, 1000);
  }

  function pauseAuto(statusText) {
    autoMode = false;
    if (lectioSession) lectioSession.autoMode = false;
    syncAutoButton();
    setStatus(statusText || t("lectio.status.manual"));
    setSpeaking(false);
  }

  function resumeAuto() {
    autoMode = true;
    if (lectioSession) lectioSession.autoMode = true;
    syncAutoButton();
    startVoiceForStep(currentStep);
  }

  function clearJournalWait() {
    if (journalWaitTimer) {
      clearInterval(journalWaitTimer);
      journalWaitTimer = null;
    }
    const done = journalWaitResolve;
    journalWaitResolve = null;
    waitBox?.classList.add("hidden");
    done?.();
  }

  function waitForJournal(ms) {
    clearJournalWait();
    waitBox?.classList.remove("hidden");
    try {
      ambientEngine.start("harp");
    } catch {
      /* ignore */
    }
    const total = Math.max(1, Math.round(ms / 1000));
    let left = total;
    if (waitCaption) waitCaption.textContent = t("lectio.step3.wait", { time: formatMmSs(left) });
    if (waitFill) waitFill.style.width = "0%";

    return new Promise((resolve) => {
      journalWaitResolve = resolve;
      journalWaitTimer = setInterval(() => {
        left -= 1;
        if (waitCaption) waitCaption.textContent = t("lectio.step3.wait", { time: formatMmSs(left) });
        if (waitFill) waitFill.style.width = `${Math.min(100, ((total - left) / total) * 100)}%`;
        if (left <= 0) {
          const done = journalWaitResolve;
          journalWaitResolve = null;
          if (journalWaitTimer) clearInterval(journalWaitTimer);
          journalWaitTimer = null;
          waitBox?.classList.add("hidden");
          done?.();
        }
      }, 1000);
    });
  }

  function closeModal() {
    clearSilencioTimer();
    clearJournalWait();
    stopLectioSession();
    ambientEngine.stop();
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("rhema-subview-back", onSubviewBack);
    window.__rhemaLectioOpenedAt = 0;
    document.dispatchEvent(new CustomEvent("rhema-subview", { detail: { id: "lectio", open: false } }));
    modal.remove();
  }

  function goToStep(step) {
    if (step < 1 || step > 4) return;
    currentStep = step;
    if (lectioSession) lectioSession.step = step;
    sheet?.setAttribute("data-phase", String(step));
    const phase = lectioPhases()[step - 1];
    if (latinEl && phase) latinEl.textContent = `${phase.latin} · ${phase.idLabel}`;

    modal.querySelectorAll(".lectio-progress-item").forEach((d) => {
      const n = Number(d.getAttribute("data-step"));
      d.classList.toggle("is-current", n === step);
      d.classList.toggle("is-done", n < step);
      d.setAttribute("aria-selected", String(n === step));
    });
    modal.querySelectorAll(".lectio-step-view").forEach((v, idx) => {
      const n = idx + 1;
      const show = n === step;
      v.classList.toggle("hidden", !show);
      v.classList.toggle("active", show);
    });
    if (step === 1) startBreathCycle();
    else clearSilencioTimer();
    if (step !== 3) clearJournalWait();
    updateFooter();
  }

  function startVoiceForStep(step) {
    ambientEngine.stop();
    if (lectioSession) lectioSession.voiceGen += 1;
    setSpeaking(false);
    setStatus(t("lectio.status.connecting"));
    callbacks.onStartVoiceLectio?.(selectedPersona, step);
  }

  function finishAndSave() {
    const reflection =
      /** @type {HTMLTextAreaElement | null} */ (modal.querySelector("#lectio-reflection-input"))?.value?.trim() || "";
    saveLectioJournalEntry({
      reference: verse.reference || "",
      text: verse.text || "",
      reflection,
    });
    closeModal();
    document.dispatchEvent(
      new CustomEvent("rhema-alkitab-toast", {
        detail: reflection ? t("lectio.toast.saved") : t("lectio.toast.done"),
      }),
    );
    document.dispatchEvent(new CustomEvent("rhema-lectio-journal-updated"));
  }

  function advanceFromFooter() {
    if (currentStep === 4) {
      finishAndSave();
      return;
    }
    if (currentStep === 3 && journalWaitResolve) {
      clearJournalWait();
      return;
    }
    const next = currentStep + 1;
    goToStep(next);
    if (autoMode) startVoiceForStep(next);
    else setStatus(lectioPhases()[next - 1]?.hint || "");
  }

  lectioSession = {
    active: true,
    autoMode,
    advancing: false,
    step: currentStep,
    goToStep,
    getPersona: () => selectedPersona,
    onStartVoice: (_persona, step) => startVoiceForStep(step),
    waitPlaybackIdle: callbacks.waitPlaybackIdle,
    waitForJournal,
    setSpeaking,
    setStatus,
    pauseAuto,
    close: closeModal,
    voiceGen: 0,
  };

  startBreathCycle();
  updateFooter();
  syncAutoButton();

  if (autoMode && callbacks.onStartVoiceLectio) {
    setTimeout(() => {
      if (lectioSession?.active && currentStep === 1) startVoiceForStep(1);
    }, 800);
  } else {
    setStatus(lectioPhases()[0].hint);
    if (callbacks.autoStart === false) {
      document.dispatchEvent(
        new CustomEvent("rhema-alkitab-toast", { detail: t("lectio.toast.manualNoVoice") }),
      );
    }
  }

  sheet?.addEventListener("click", (e) => e.stopPropagation());
  sheet?.addEventListener("touchend", (e) => e.stopPropagation());
  modal.addEventListener("click", (e) => {
    if (e.target !== modal) return;
    if (Date.now() - Number(window.__rhemaLectioOpenedAt || 0) < 900) return;
    closeModal();
  });

  modal.querySelectorAll(".lectio-persona-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-persona-id");
      if (!id) return;
      setSelectedVoicePersona(id);
      selectedPersona = getSelectedVoicePersona();
      modal.querySelectorAll(".lectio-persona-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.getAttribute("data-persona-id") === id);
      });
    });
  });

  modal.querySelectorAll(".lectio-progress-item").forEach((dot) => {
    dot.addEventListener("click", () => {
      const step = Number(dot.getAttribute("data-step"));
      if (step === currentStep) return;
      pauseAuto();
      goToStep(step);
    });
  });

  autoBtn?.addEventListener("click", () => {
    if (autoMode) pauseAuto();
    else resumeAuto();
  });

  replayBtn?.addEventListener("click", () => startVoiceForStep(currentStep));
  nextBtn?.addEventListener("click", advanceFromFooter);

  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }
  function onSubviewBack(e) {
    if (/** @type {CustomEvent} */ (e).detail === "lectio") closeModal();
  }
  document.addEventListener("keydown", onKey);
  document.addEventListener("rhema-subview-back", onSubviewBack);

  modal.querySelector("#btn-close-lectio")?.addEventListener("click", closeModal);

  requestAnimationFrame(() => {
    modal.querySelector("#btn-close-lectio")?.focus?.();
  });
}

/** Render daftar jurnal Lectio ke container UI. */
export function renderLectioJournalList() {
  const list = document.getElementById("lectio-journal-list");
  const empty = document.getElementById("lectio-journal-empty");
  if (!list) return;

  const entries = loadLectioJournal();
  list.setAttribute("aria-label", t("lectio.journal.aria"));
  if (!entries.length) {
    list.innerHTML = "";
    empty?.classList.remove("hidden");
    empty?.setAttribute("aria-hidden", "false");
    return;
  }

  empty?.classList.add("hidden");
  empty?.setAttribute("aria-hidden", "true");
  list.innerHTML = entries
    .slice(0, 12)
    .map(
      (e) => `
    <li class="lectio-journal-item">
      <button type="button" class="lectio-journal-card" data-lectio-id="${escapeHtml(e.id)}">
        <span class="lectio-journal-meta">
          <span class="lectio-journal-ref">${escapeHtml(e.reference || "—")}</span>
          <span class="lectio-journal-date">${escapeHtml(e.date || "")}</span>
        </span>
        <span class="lectio-journal-snippet">${escapeHtml(e.reflection || e.text?.slice(0, 110) || t("lectio.journal.none"))}</span>
      </button>
    </li>`,
    )
    .join("");
}
