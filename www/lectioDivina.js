/**
 * Lectio Divina 4-Step Guided Meditation & Voice Persona Manager.
 */

import { ambientEngine } from "./ambientAudio.js";
import { escapeHtml } from "./platform.js";

export const LECTIO_JOURNAL_KEY = "rhema-lectio-journal";

export const VOICE_PERSONAS = [
  {
    id: "shepherd",
    name: "Gembala Teduh",
    emoji: "🕊️",
    desc: "Pastoral, tenang, berwibawa",
    pitch: 0.92,
    rate: 0.9,
  },
  {
    id: "friend",
    name: "Sahabat Iman",
    emoji: "☀️",
    desc: "Hangat & membesarkan hati",
    pitch: 1.05,
    rate: 0.96,
  },
  {
    id: "psalm",
    name: "Mazmur Malam",
    emoji: "🌙",
    desc: "Lembut, untuk saat teduh malam",
    pitch: 0.88,
    rate: 0.85,
  },
];

const PHASES = [
  { n: 1, latin: "Silencio", idLabel: "Hening", hint: "Tenangkan hati di hadapan Tuhan" },
  { n: 2, latin: "Lectio", idLabel: "Firman", hint: "Dengarkan ayat dengan perlahan" },
  { n: 3, latin: "Meditatio", idLabel: "Renung", hint: "Biarkan firman berbicara ke hati" },
  { n: 4, latin: "Oratio", idLabel: "Doa", hint: "Serahkan diri dalam doa" },
];

const SPEAK_STATUS = {
  1: "Membimbing hening…",
  2: "Membacakan firman…",
  3: "Membimbing perenungan…",
  4: "Memimpin doa…",
};

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
 * } | null} */
let lectioSession = null;

export function isLectioSessionActive() {
  return Boolean(lectioSession?.active);
}

export function stopLectioSession() {
  if (lectioSession) lectioSession.active = false;
  lectioSession = null;
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

    if (step === 4) {
      session.setStatus?.("Selesai — simpan jurnal Anda");
      return;
    }

    if (step === 3) {
      session.setStatus?.("Waktu menulis perenungan");
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
    session.setStatus?.(`Beralih ke ${PHASES[next - 1]?.idLabel || "fase berikutnya"}…`);
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
    date: new Date().toLocaleDateString("id-ID", {
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
  const tone = persona?.desc || "tenang dan pastoral";

  switch (step) {
    case 1:
      return [
        "Lectio Divina — fase Silencio (hening).",
        "Sapa saudara dengan lembut, undang tarik napas perlahan dan sadari kehadiran Tuhan.",
        "Jangan baca ayat dulu. Durasi ~30 detik, gaya suara:",
        tone,
      ].join(" ");
    case 2:
      return [
        `Lectio Divina — fase Lectio. Bacakan ayat ${ref} dari TB LAI dengan perlahan dan khidmat:`,
        `"${text}".`,
        "Jeda 2–3 detik antar kalimat. Ulangi sekali frasa yang paling menonjol.",
        `Gaya suara: ${tone}.`,
      ].join(" ");
    case 3:
      return [
        `Lectio Divina — fase Meditatio untuk ${ref}.`,
        `Ayat TB: "${text}".`,
        "Ajukan 2 pertanyaan refleksi rohani yang menyentuh hati:",
        "kata mana yang paling menggugah, dan apa yang Tuhan katakan untuk hidup saudara hari ini?",
        `Gaya: ${tone}, singkat dan dalam — bukan khotbah panjang.`,
      ].join(" ");
    case 4:
      return [
        `Lectio Divina — fase Oratio untuk ${ref}.`,
        `Pimpin doa penutup 1–2 menit dari ayat: "${text}".`,
        "Serahkan hati, minta damai sejahtera, akhiri dengan Amen.",
        `Gaya: ${tone}.`,
      ].join(" ");
    default:
      return `Pandu Lectio Divina 4 langkah untuk ${ref}: "${text}". Gaya: ${tone}.`;
  }
}

/** @param {{ reference?: string, text?: string }} verse */
function buildMeditatioQuestion(verse) {
  const ref = verse.reference || "ayat ini";
  return `Kata atau kalimat mana dari ${ref} yang paling menyentuh keadaan hidup Anda saat ini? Apa yang Tuhan ingin katakan melalui firman itu hari ini?`;
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

  const safeRef = escapeHtml(verse.reference || "Mazmur 23:1");
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
          <span class="lectio-badge">Saat teduh</span>
          <h2 class="lectio-title" id="lectio-title">Lectio Divina</h2>
          <p class="lectio-ref-sub">${safeRef}</p>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-lectio" aria-label="Tutup">✕</button>
      </div>

      <div class="lectio-status-row">
        <span class="lectio-status-pill" id="lectio-status-pill" aria-live="polite">
          <span class="lectio-status-dot"></span>
          <span id="lectio-status-text">${autoMode ? "Memulai panduan…" : "Mode manual"}</span>
        </span>
        <button type="button" class="lectio-auto-toggle ${autoMode ? "is-on" : ""}" id="btn-lectio-auto" aria-pressed="${autoMode}">
          ${autoMode ? "Otomatis" : "Manual"}
        </button>
      </div>

      <div class="lectio-progress" role="tablist" aria-label="Empat fase Lectio Divina">
        ${PHASES.map(
          (p) => `
          <button type="button" class="lectio-progress-item ${p.n === 1 ? "is-current" : ""}" data-step="${p.n}" role="tab" aria-selected="${p.n === 1}">
            <span class="lectio-progress-num">${p.n}</span>
            <span class="lectio-progress-name">${escapeHtml(p.idLabel)}</span>
          </button>`,
        ).join("")}
      </div>
      <p class="lectio-phase-latin" id="lectio-phase-latin">Silencio · Hening</p>

      <div class="lectio-persona-row" role="group" aria-label="Pilih suara panduan">
        ${VOICE_PERSONAS.map(
          (p) => `
          <button type="button" class="lectio-persona-chip ${p.id === selectedPersona.id ? "active" : ""}" data-persona-id="${p.id}" title="${escapeHtml(p.desc)}">
            <span aria-hidden="true">${p.emoji}</span>
            <span>${escapeHtml(p.name)}</span>
          </button>`,
        ).join("")}
      </div>

      <div class="lectio-body" id="lectio-step-content">
        <div class="lectio-step-view active" id="step-view-1">
          <div class="silencio-circle-wrap">
            <div class="silencio-pulse-ring"></div>
            <div class="silencio-circle" id="silencio-orb">
              <span class="silencio-countdown" id="silencio-count">4</span>
              <span class="silencio-label" id="silencio-label">Tarik napas</span>
            </div>
          </div>
          <p class="lectio-instruction">Lepaskan kepenatan hari ini. Sadari kehadiran Tuhan yang menyertai Anda di sini.</p>
        </div>

        <div class="lectio-step-view hidden" id="step-view-2">
          <div class="lectio-scripture-box">
            <p class="lectio-verse-kicker">Terjemahan Baru · LAI</p>
            <p class="lectio-verse-text">${safeText}</p>
            <cite class="lectio-verse-cite">${safeRef}</cite>
          </div>
          <p class="lectio-instruction">Dengarkan firman berulang kali. Biarkan satu frasa tinggal di hati Anda.</p>
        </div>

        <div class="lectio-step-view hidden" id="step-view-3">
          <div class="meditatio-prompt-card">
            <p class="lectio-card-kicker">Pertanyaan batin</p>
            <p class="meditatio-question">${meditatioQuestion}</p>
          </div>
          <label class="lectio-journal-label" for="lectio-reflection-input">Jurnal perenungan</label>
          <textarea class="meditatio-journal-input" id="lectio-reflection-input" rows="4" placeholder="Tuliskan bisikan, rasa, atau janji yang Anda dengar…"></textarea>
          <div class="lectio-journal-wait hidden" id="lectio-journal-wait">
            <div class="lectio-wait-bar"><span id="lectio-wait-fill"></span></div>
            <p class="lectio-wait-caption"><span id="lectio-wait-sec">0:45</span> menuju doa — atau lanjut kapan saja</p>
          </div>
        </div>

        <div class="lectio-step-view hidden" id="step-view-4">
          <div class="oratio-card">
            <p class="lectio-card-kicker">Doa &amp; damai sejahtera</p>
            <p class="oratio-text">Tuhan Yesus, terima kasih atas firman-Mu yang hidup. Aku memeteraikan setiap pesan kebenaran ini di dalam hatiku. Pimpin langkahku sepanjang hari ini dalam naungan kasih-Mu. Amin.</p>
          </div>
          <p class="lectio-instruction">Diam sejenak setelah doa. Simpan jurnal bila Anda menulis perenungan.</p>
        </div>
      </div>

      <div class="lectio-footer" id="lectio-footer">
        <button type="button" class="lectio-btn lectio-btn-ghost" id="btn-lectio-replay">Ulangi suara</button>
        <button type="button" class="lectio-btn lectio-btn-primary" id="btn-lectio-next">Lewati hening</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

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
  const waitSec = modal.querySelector("#lectio-wait-sec");

  ambientEngine.start("harp");

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setSpeaking(on) {
    speaking = on;
    statusPill?.classList.toggle("is-speaking", on);
    sheet?.classList.toggle("is-speaking", on);
    if (on) setStatus(SPEAK_STATUS[currentStep] || "Mendengarkan…");
  }

  function syncAutoButton() {
    if (!autoBtn) return;
    autoBtn.classList.toggle("is-on", autoMode);
    autoBtn.setAttribute("aria-pressed", String(autoMode));
    autoBtn.textContent = autoMode ? "Otomatis" : "Manual";
  }

  function updateFooter() {
    if (!nextBtn || !replayBtn) return;
    replayBtn.textContent = currentStep === 1 ? "Ulangi panduan" : currentStep === 4 ? "Ulangi doa" : "Ulangi suara";
    if (currentStep === 1) nextBtn.textContent = "Lewati hening";
    else if (currentStep === 2) nextBtn.textContent = "Lanjut merenung";
    else if (currentStep === 3) nextBtn.textContent = "Siap berdoa";
    else nextBtn.textContent = "Simpan jurnal";
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
    if (breathLabel) breathLabel.textContent = "Tarik napas";
    breathTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        breathInhale = !breathInhale;
        n = 4;
        if (breathLabel) breathLabel.textContent = breathInhale ? "Tarik napas" : "Hembuskan";
      }
      if (countEl) countEl.textContent = String(n);
    }, 1000);
  }

  function pauseAuto() {
    autoMode = false;
    if (lectioSession) lectioSession.autoMode = false;
    syncAutoButton();
    setStatus("Mode manual");
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
    ambientEngine.start("harp");
    const total = Math.max(1, Math.round(ms / 1000));
    let left = total;
    if (waitSec) waitSec.textContent = formatMmSs(left);
    if (waitFill) waitFill.style.width = "0%";

    return new Promise((resolve) => {
      journalWaitResolve = resolve;
      journalWaitTimer = setInterval(() => {
        left -= 1;
        if (waitSec) waitSec.textContent = formatMmSs(left);
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
    modal.remove();
  }

  function goToStep(step) {
    if (step < 1 || step > 4) return;
    currentStep = step;
    if (lectioSession) lectioSession.step = step;
    sheet?.setAttribute("data-phase", String(step));
    const phase = PHASES[step - 1];
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
    setSpeaking(true);
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
        detail: reflection
          ? "Saat teduh selesai — perenungan tersimpan di jurnal."
          : "Puji Tuhan. Saat teduh Lectio Divina selesai.",
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
    else setStatus(PHASES[next - 1]?.hint || "");
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
    voiceGen: 0,
  };

  startBreathCycle();
  updateFooter();
  syncAutoButton();

  if (autoMode && callbacks.onStartVoiceLectio) {
    setTimeout(() => {
      if (lectioSession?.active && currentStep === 1) startVoiceForStep(1);
    }, 550);
  } else {
    setStatus(PHASES[0].hint);
  }

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
  document.addEventListener("keydown", onKey);

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
        <span class="lectio-journal-snippet">${escapeHtml(e.reflection || e.text?.slice(0, 110) || "Tanpa catatan")}</span>
      </button>
    </li>`,
    )
    .join("");
}
