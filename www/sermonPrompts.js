/**
 * Prompt khotbah suara live — target durasi 5 menit.
 */

import { RHEMA_ADDRESS_RULE_SHORT } from "./rhemaAddressRule.js";
import { markSermonStarted } from "./sermonLiveContinuer.js";
import { buildSermonKnowledgePrompt, renderSermonKnowledgePanel } from "./sermonBibleContext.js";
import { saveLastSermonMeta } from "./sermonExport.js";
import { getEffectiveUiLang, isIndonesiaProfile } from "./localeProfile.js";
import { t } from "./uiStrings.js";

const PERSONA_KEY = "rhema-persona-id";

/** Aktifkan persona pengkhotbah untuk sesi voice berikutnya. */
export function setPreacherPersona() {
  try {
    localStorage.setItem(PERSONA_KEY, "preacher");
  } catch {
    /* private mode */
  }
}

/** Persona eksposisi mendalam (~15 menit). */
export function setTheologianPersona() {
  try {
    localStorage.setItem(PERSONA_KEY, "theologian");
  } catch {
    /* private mode */
  }
}

/** Mode khotbah aktif — jangan pindah ke layar Alkitab TB. */
export function isPreacherPersonaActive() {
  try {
    return localStorage.getItem(PERSONA_KEY) === "preacher";
  } catch {
    return false;
  }
}

export function isTheologianPersonaActive() {
  try {
    return localStorage.getItem(PERSONA_KEY) === "theologian";
  } catch {
    return false;
  }
}

/** Khotbah atau eksposisi — lanjut multi-turn aktif. */
export function isSermonModeActive() {
  return isPreacherPersonaActive() || isTheologianPersonaActive();
}

/** @param {string} passage */
export function sermonTitleFromPassage(passage) {
  const p = (passage || "").trim();
  if (!p) return isIndonesiaProfile() ? "Firman Tuhan" : "God's Word";
  return isIndonesiaProfile() ? `Khotbah dari ${p}` : `Sermon from ${p}`;
}

/**
 * @param {{ minutes?: number, passage: string, title?: string }} opts
 * @returns {string}
 */
export function buildSermonVoicePrompt(opts) {
  const minutes = Math.min(15, Math.max(5, Number(opts.minutes) || 5));
  const passage = (opts.passage || "").trim();
  if (!passage) {
    throw new Error(isIndonesiaProfile() ? "Ayat khotbah wajib diisi" : "Sermon passage is required");
  }
  const title = (opts.title || sermonTitleFromPassage(passage)).trim();

  if (!isIndonesiaProfile()) {
    return `[SERMON MODE — TARGET ${minutes} MINUTES]
${RHEMA_ADDRESS_RULE_SHORT}
Deliver a complete sermon in natural, warm everyday English — pastoral tone with humility.
REQUIRED: speak long enough (~${minutes} minutes). Do not stop after the opening alone.
IMPORTANT: Long sermons continue automatically across turns — do not repeat the opening when you receive "CONTINUE SERMON".

Theme: "${title}"
Main reading: ${passage} (King James Version)

Required structure (brief pauses between sections):
1. Opening greeting
2. Scripture reading — read the passage clearly from KJV
3. Brief context of the passage
4. Three sermon points (I, II, III) — each with explanation and real-life application
5. A relevant illustration or short story
6. Practical application for family, work, and daily faith
7. Closing prayer & blessing (say "Amen")

Use accurate KJV wording. You are not replacing a real pastor; preach with humility.`;
  }

  return `[MODE KHOTBAH FIRMAN — TARGET ${minutes} MENIT]
${RHEMA_ADDRESS_RULE_SHORT}
Sampaikan khotbah lengkap berbahasa Indonesia, nada gembala yang hangat dan penuh urapan.
WAJIB: bicara cukup panjang (perkiraan ${minutes} menit). Jangan singkat di bawah 4 menit. Jangan berhenti setelah pembukaan saja.
PENTING: Khotbah panjang akan dilanjutkan otomatis lewat beberapa turn — lanjutkan alur tanpa mengulang pembukaan saat menerima "LANJUT KHOTBAH".

Tema: "${title}"
Bacaan utama: ${passage} (Terjemahan Baru / LAI)

Struktur wajib (jeda singkat antar bagian):
1. Pembukaan & sapaan saudara-saudara
2. Bacaan firman TB — bacakan ayat dengan jelas
3. Konteks singkat ayat
4. Tiga poin khotbah (I, II, III) — masing-masing dengan penjelasan dan contoh kehidupan nyata
5. Ilustrasi atau kisah singkat yang relevan
6. Aplikasi praktis untuk keluarga, pekerjaan, dan iman sehari-hari
7. Doa penutup & berkat (Amin)

Gunakan ayat TB yang akurat. Jangan menggantikan pendeta sungguhan; sampaikan firman dengan kerendahan hati.`;
}

/**
 * Eksposisi firman mendalam — target ~15 menit.
 * @param {{ minutes?: number, passage: string, title?: string }} opts
 */
export function buildExpositionVoicePrompt(opts) {
  const minutes = Math.min(15, Math.max(10, Number(opts.minutes) || 15));
  const passage = (opts.passage || "").trim();
  if (!passage) throw new Error(isIndonesiaProfile() ? "Ayat eksposisi wajib diisi" : "Exposition passage is required");
  const title = (opts.title || (isIndonesiaProfile() ? `Eksposisi ${passage}` : `Exposition: ${passage}`)).trim();

  if (!isIndonesiaProfile()) {
    return `[SCRIPTURE EXPOSITION — TARGET ${minutes} MINUTES]
${RHEMA_ADDRESS_RULE_SHORT}
Deliver a deep Bible exposition in clear, humble English — teacher/theologian tone.
REQUIRED: ~${minutes} minutes. Use lookup_lexicon, lookup_tafsir, lookup_passage for depth.
IMPORTANT: Long exposition continues automatically — do not repeat the opening on "CONTINUE EXPOSITION".

Theme: "${title}"
Main reading: ${passage} (King James Version)

Structure: opening → historical context → KJV reading → keyword analysis → exposition (I, II, III) → theology & pastoral application → closing prayer (Amen).
Do not invent verse text. verify_verse before reading. Not a substitute for ordained ministry.`;
  }

  return `[MODE EKSPOSISI FIRMAN — TARGET ${minutes} MENIT]
${RHEMA_ADDRESS_RULE_SHORT}
Sampaikan eksposisi Alkitab mendalam berbahasa Indonesia — nada guru/teolog yang jelas dan rendah hati.
WAJIB: bicara cukup panjang (~${minutes} menit). Gunakan lookup_lexicon, lookup_tafsir, lookup_passage untuk kedalaman.
PENTING: Eksposisi panjang dilanjutkan otomatis — lanjutkan alur tanpa mengulang pembukaan saat menerima "LANJUT EKSPOSISI".

Tema: "${title}"
Bacaan utama: ${passage} (Terjemahan Baru / LAI)

Struktur wajib:
1. Pembukaan & orientasi teks
2. Konteks historis-kitab (lookup_book_intro)
3. Bacaan TB — bacakan ayat persis dari dataset
4. Analisis kata kunci asli (lookup_lexicon) — 2–4 kata penting
5. Makna dalam konteks pasal (lookup_tafsir)
6. Tiga bagian eksposisi (I, II, III) dengan cross-reference TB
7. Implikasi teologi & aplikasi pastoral
8. Doa penutup singkat (Amin)

Jangan mengarang teks ayat. verify_verse sebelum bacakan. Bukan pengganti pendeta.`;
}

/**
 * Prompt interaktif: Rhema tanya ayat dulu via suara live, lalu khotbah setelah user jawab.
 * @param {number} [minutes]
 */
export function buildSermonInteractivePrompt(minutes = 5) {
  const m = Math.min(15, Math.max(5, Number(minutes) || 5));
  if (!isIndonesiaProfile()) {
    return `[INTERACTIVE SERMON — TARGET ${m} MINUTES]
${RHEMA_ADDRESS_RULE_SHORT}

STEP 1 — ASK (say now):
With a warm pastoral tone, ask only this short question:
"Peace be with you. Which Scripture passage would you like a sermon from? For example Psalm 23 or John 3:16."
Then STOP and listen. Do not start the sermon yet.

STEP 2 — WAIT:
Wait until the user gives a clear Bible reference. If unclear, ask once more briefly.

STEP 3 — SERMON (after reference given):
Deliver a full ~${m}-minute sermon from the user's passage.
Structure: opening → KJV reading → context → 3 points (I, II, III) → illustration → application → closing prayer (Amen).
Do not rush under 4 minutes. Continue automatically on "CONTINUE SERMON" without repeating the opening.`;
  }
  return `[MODE KHOTBAH INTERAKTIF — TARGET ${m} MENIT]
${RHEMA_ADDRESS_RULE_SHORT}

TAHAP 1 — TANYA (ucapkan sekarang):
Dengan nada gembala yang hangat, ucapkan pertanyaan singkat ini saja:
"Shalom, saudara. Ayat firman apa yang ingin Anda dengar dalam khotbah? Sebutkan pasal Terjemahan Baru-nya — misalnya Mazmur 23 atau Yohanes 3:16."
Setelah bertanya, DIAM dan dengarkan user. Jangan mulai khotbah.

TAHAP 2 — TUNGGU JAWABAN:
Tunggu sampai user menyebut referensi ayat/pasal TB dengan jelas. Jika belum jelas, tanyakan sekali lagi dengan singkat.

TAHAP 3 — KHOTBAH (setelah ayat disebut):
Sampaikan khotbah lengkap sekitar ${m} menit dari ayat yang user sebut.
Struktur: pembukaan → bacaan TB → konteks → 3 poin (I, II, III) → ilustrasi → aplikasi praktis → doa penutup (Amin).
Jangan singkat di bawah 4 menit. Khotbah panjang akan dilanjutkan otomatis — lanjutkan alur tanpa mengulang saat menerima "LANJUT KHOTBAH".`;
}

/** @param {number} minutes @param {string} passage */
export function buildQuickSermonPrompt(minutes, passage) {
  return buildSermonVoicePrompt({
    minutes,
    passage,
    title: sermonTitleFromPassage(passage),
  });
}

/**
 * Panel Khotbah AI di header Percakapan Live — ayat via ketik atau suara.
 * @param {(text: string, displayText?: string) => void} askVoiceFn
 */
export function initVoiceSermonBar(askVoiceFn) {
  const toggleBtn = document.getElementById("btn-khotbah-ai");
  const bar = document.getElementById("sermon-verse-bar");
  const verseInput = /** @type {HTMLInputElement | null} */ (document.getElementById("sermon-verse-input"));
  const startBtn = document.getElementById("btn-start-sermon-ai");
  const micBtn = document.getElementById("btn-sermon-verse-mic");
  const closeBtn = document.getElementById("btn-sermon-bar-close");
  const listenStatus = document.getElementById("sermon-verse-listen-status");
  if (!toggleBtn || !bar || !verseInput || !startBtn) return;

  let selectedMinutes = 5;
  let selectedMode = "khotbah";
  /** @type {SpeechRecognition | null} */
  let recognition = null;
  let isListening = false;
  let autoStartAfterSpeech = false;

  function setListenStatus(text, visible = Boolean(text)) {
    if (!listenStatus) return;
    listenStatus.textContent = text || "";
    listenStatus.classList.toggle("hidden", !visible);
  }

  function stopVerseListen() {
    isListening = false;
    micBtn?.classList.remove("listening");
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognition = null;
    }
  }

  function getSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    return SR ? new SR() : null;
  }

  function normalizeSpokenPassage(raw) {
    return String(raw || "")
      .trim()
      .replace(/^(ayat|pasal|bacakan|khotbahkan|khotbah|dari)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function launchSermon(passage) {
    const normalized = normalizeSpokenPassage(passage);
    if (!normalized) return false;
    verseInput.value = normalized;
    const isExposition = selectedMode === "exposition";
    if (isExposition) setTheologianPersona();
    else setPreacherPersona();
    markSermonStarted(selectedMinutes);
    saveLastSermonMeta(normalized, isExposition ? "exposition" : "khotbah");
    setListenStatus(t("sermon.ui.preparing"), true);

    const basePrompt = isExposition
      ? buildExpositionVoicePrompt({ minutes: selectedMinutes, passage: normalized })
      : buildSermonVoicePrompt({ minutes: selectedMinutes, passage: normalized });
    void buildSermonKnowledgePrompt(normalized, basePrompt).then(({ prompt }) => {
      const label = isExposition ? t("sermon.ui.exposition") : t("sermon.ui.sermonVerse");
      askVoiceFn(prompt, `${label} — ${normalized}`);
      setBarOpen(false);
      stopVerseListen();
      setListenStatus("");
    });

    return true;
  }

  function startVerseListen({ autoStart = false } = {}) {
    const SR = getSpeechRecognition();
    if (!SR) {
      alert(t("sermon.ui.noSpeechRecognition"));
      return;
    }
    stopVerseListen();
    autoStartAfterSpeech = autoStart;
    recognition = SR;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getEffectiveUiLang() === "en" ? "en-US" : "id-ID";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      micBtn?.classList.add("listening");
      setListenStatus(autoStart ? t("sermon.ui.speakNow") : t("sermon.ui.listening"));
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const normalized = normalizeSpokenPassage(transcript);
      if (normalized) verseInput.value = normalized;
      if (event.results[event.results.length - 1]?.isFinal && normalized) {
        setListenStatus(t("sermon.ui.heard", { verse: normalized }));
        if (autoStartAfterSpeech) {
          autoStartAfterSpeech = false;
          launchSermon(normalized);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        alert(t("sermon.ui.micRequired"));
      }
      stopVerseListen();
      setListenStatus("");
      autoStartAfterSpeech = false;
    };

    recognition.onend = () => {
      isListening = false;
      micBtn?.classList.remove("listening");
      if (autoStartAfterSpeech && !verseInput.value.trim()) {
        setListenStatus(t("sermon.ui.notHeard"));
        autoStartAfterSpeech = false;
      }
      recognition = null;
    };

    try {
      recognition.start();
    } catch {
      stopVerseListen();
    }
  }

  function setBarOpen(open) {
    bar.classList.toggle("hidden", !open);
    toggleBtn.classList.toggle("active", open);
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) {
      stopVerseListen();
      setListenStatus("");
      renderSermonKnowledgePanel(null);
    } else {
      requestAnimationFrame(() => verseInput.focus());
    }
  }

  toggleBtn.addEventListener("click", () => {
    const willOpen = bar.classList.contains("hidden");
    setBarOpen(willOpen);
    if (willOpen) {
      setPreacherPersona();
      setListenStatus(t("sermon.ui.askingVerse"));
      askVoiceFn(buildSermonInteractivePrompt(selectedMinutes), t("sermon.ui.promptVerse"));
    }
  });

  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setBarOpen(false);
  });

  const headerBar = toggleBtn.closest(".transcript-header-bar");
  headerBar?.querySelectorAll(".sermon-dur-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      headerBar.querySelectorAll(".sermon-dur-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMinutes = Number(btn.getAttribute("data-sermon-minutes")) || 5;
      selectedMode = btn.getAttribute("data-sermon-mode") || "khotbah";
    });
  });

  function startSermon() {
    const passage = verseInput.value.trim();
    if (!passage) {
      if (getSpeechRecognition()) {
        startVerseListen({ autoStart: true });
        return;
      }
      verseInput.focus();
      verseInput.placeholder = t("sermon.ui.placeholderHint");
      verseInput.classList.add("sermon-verse-input-error");
      setTimeout(() => verseInput.classList.remove("sermon-verse-input-error"), 1200);
      return;
    }
    launchSermon(passage);
  }

  startBtn.addEventListener("click", startSermon);
  micBtn?.addEventListener("click", () => {
    if (isListening) stopVerseListen();
    else startVerseListen({ autoStart: false });
  });

  verseInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startSermon();
    }
  });
}
