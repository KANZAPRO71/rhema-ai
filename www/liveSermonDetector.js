/**
 * Live Preaching Scripture Detector Engine — Mendeteksi & menampilkan ayat Alkitab TB secara otomatis saat mendengarkan khotbah di gereja.
 */

import { escapeHtml } from "./markdown.js";

const INDO_BIBLE_BOOKS = [
  "Kejadian", "Keluaran", "Imamat", "Bilangan", "Ulangan",
  "Yosua", "Hakim-hakim", "Rut", "1 Samuel", "2 Samuel",
  "1 Raja-raja", "2 Raja-raja", "1 Tawarikh", "2 Tawarikh",
  "Ezra", "Nehemia", "Ester", "Ayub", "Mazmur", "Amsal",
  "Pengkhotbah", "Kidung Agung", "Yesaya", "Yeremia", "Ratapan",
  "Yehezkiel", "Daniel", "Hosea", "Yoel", "Amos",
  "Obaja", "Yunus", "Mikha", "Nahum", "Habakuk",
  "Zefanya", "Hagai", "Zakharia", "Maleakhi",
  "Matius", "Markus", "Lukas", "Yohanes", "Kisah Para Rasul",
  "Roma", "1 Korintus", "2 Korintus", "Galatia", "Efesus",
  "Filipi", "Kolose", "1 Tesalonika", "2 Tesalonika",
  "1 Timotius", "2 Timotius", "Titus", "Filemon", "Ibrani",
  "Yakobus", "1 Petrus", "2 Petrus", "1 Yohanes", "2 Yohanes",
  "3 Yohanes", "Yudas", "Wahyu"
];

// Regular expression generator for spoken Bible verses
const BOOK_REGEX_STR = INDO_BIBLE_BOOKS.map((b) => b.replace(/\s+/g, "\\s*")).join("|");
const SCRIPTURE_REGEX = new RegExp(
  `(?:kitab|surat|pasal)?\\s*(${BOOK_REGEX_STR})\\s*(?:pasal)?\\s*(\\d+)(?:\\s*(?:ayat|:)\\s*(\\d+(?:\\s*-\\s*\\d+)?))?`,
  "gi"
);

/**
 * Parsing teks khotbah untuk menemukan referensi ayat Alkitab.
 * @param {string} text
 * @returns {string[]}
 */
export function extractScriptureReferences(text) {
  if (!text) return [];
  const found = new Set();
  let match;
  SCRIPTURE_REGEX.lastIndex = 0;
  while ((match = SCRIPTURE_REGEX.exec(text)) !== null) {
    const book = match[1].trim();
    const chapter = match[2].trim();
    const verse = match[3] ? match[3].replace(/\s+/g, "") : "1";
    found.add(`${book} ${chapter}:${verse}`);
  }
  return Array.from(found);
}

/**
 * State mesin pendeteksi khotbah
 */
let recognitionInstance = null;
let isListening = false;
let detectedVerses = [];

/**
 * Membuka Modal Detektor Ayat Khotbah Live
 * @param {{ onOpenVerse?: (ref: string) => void, onSaveNote?: (note: string) => void }} [callbacks]
 */
export function openLiveSermonDetectorModal(callbacks = {}) {
  let existing = document.getElementById("sermon-detector-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "sermon-detector-modal";
  modal.className = "apple-modal-overlay active";

  modal.innerHTML = `
    <div class="apple-modal-sheet sermon-detector-sheet">
      <div class="modal-handle-bar"></div>
      
      <div class="detector-header">
        <div class="detector-title-wrap">
          <span class="detector-badge">🎙️ Ibadah &amp; Khotbah Live</span>
          <h2 class="detector-title">Detektor Ayat Khotbah</h2>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-detector">✕</button>
      </div>

      <!-- Live Mic Listening Status Card -->
      <div class="detector-mic-card" id="detector-mic-card">
        <div class="detector-orb-wrap">
          <div class="detector-radar-wave"></div>
          <button type="button" class="detector-mic-orb" id="btn-toggle-detector-listen" title="Mulai / Berhenti Mendengar">
            <span class="detector-mic-icon">🎙️</span>
          </button>
        </div>
        <div class="detector-status-info">
          <h4 class="detector-status-title" id="detector-status-text">Siap Mendengarkan Khotbah</h4>
          <p class="detector-status-sub" id="detector-sub-text">Tap mikrofon di atas saat pendeta mulai berkhotbah di gereja.</p>
        </div>
      </div>

      <!-- Live Transcript Stream Snippet -->
      <div class="detector-speech-stream" id="detector-speech-stream">
        <span class="stream-placeholder">Suara khotbah yang tertangkap akan muncul di sini…</span>
      </div>

      <!-- Detected Verses List Section -->
      <div class="detector-results-section">
        <div class="results-head-bar">
          <h3 class="results-title">📖 Ayat yang Terdeteksi (<span id="detected-count">0</span>)</h3>
          <button type="button" class="btn-clear-detector" id="btn-clear-detector">Bersihkan</button>
        </div>
        <div class="detector-verses-list" id="detector-verses-list">
          <div class="detector-empty-hint">
            <span>🕊️</span>
            <p>Belum ada ayat terdeteksi. Saat pendeta menyebutkan ayat (misal: "Roma 8:28"), ayat akan muncul otomatis di sini.</p>
          </div>
        </div>
      </div>

      <!-- Quick Action: Manual Simulation for Testing -->
      <div class="detector-test-chips">
        <span class="test-label">Uji Coba Deteksi:</span>
        <button type="button" class="test-chip" data-sample="Bapak Ibu mari kita buka di kitab Yohanes 3 ayat 16">"Yohanes 3:16"</button>
        <button type="button" class="test-chip" data-sample="Firman Tuhan hari ini dari Roma 8:28 yang meneguhkan kita">"Roma 8:28"</button>
        <button type="button" class="test-chip" data-sample="Tuhan adalah gembalaku di Mazmur 23:1">"Mazmur 23:1"</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = document.getElementById("btn-close-detector");
  const micBtn = document.getElementById("btn-toggle-detector-listen");
  const micCard = document.getElementById("detector-mic-card");
  const statusText = document.getElementById("detector-status-text");
  const subText = document.getElementById("detector-sub-text");
  const streamEl = document.getElementById("detector-speech-stream");
  const listEl = document.getElementById("detector-verses-list");
  const countEl = document.getElementById("detected-count");
  const clearBtn = document.getElementById("btn-clear-detector");

  function closeModal() {
    stopListening();
    modal.classList.remove("active");
    setTimeout(() => modal.remove(), 250);
  }

  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  clearBtn?.addEventListener("click", () => {
    detectedVerses = [];
    renderDetectedVerses();
  });

  // Test chips simulation
  modal.querySelectorAll(".test-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const sample = chip.getAttribute("data-sample") || "";
      processSermonText(sample);
    });
  });

  function processSermonText(transcript) {
    if (!transcript) return;
    if (streamEl) {
      streamEl.innerHTML = `<span class="stream-live-text">"…${escapeHtml(transcript)}…"</span>`;
    }
    const refs = extractScriptureReferences(transcript);
    for (const ref of refs) {
      if (!detectedVerses.some((d) => d.reference.toLowerCase() === ref.toLowerCase())) {
        detectedVerses.unshift({
          reference: ref,
          time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          context: transcript,
        });
      }
    }
    renderDetectedVerses();
  }

  function renderDetectedVerses() {
    if (countEl) countEl.textContent = String(detectedVerses.length);
    if (!listEl) return;

    if (!detectedVerses.length) {
      listEl.innerHTML = `
        <div class="detector-empty-hint">
          <span>🕊️</span>
          <p>Belum ada ayat terdeteksi. Saat pendeta menyebutkan ayat (misal: "Roma 8:28"), ayat akan muncul otomatis di sini.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = detectedVerses.map((item) => `
      <div class="detected-verse-card" data-ref="${escapeHtml(item.reference)}">
        <div class="dvc-head">
          <div class="dvc-badge">📖 ${escapeHtml(item.reference)}</div>
          <span class="dvc-time">${escapeHtml(item.time)}</span>
        </div>
        <p class="dvc-context">"${escapeHtml(item.context)}"</p>
        <div class="dvc-actions">
          <button type="button" class="btn-dvc-open" data-ref="${escapeHtml(item.reference)}">📖 Buka Alkitab</button>
          <button type="button" class="btn-dvc-copy" data-ref="${escapeHtml(item.reference)}">📋 Salin</button>
          <button type="button" class="btn-dvc-share" data-ref="${escapeHtml(item.reference)}">🖼️ Kartu Ayat</button>
        </div>
      </div>
    `).join("");

    listEl.querySelectorAll(".btn-dvc-open").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ref = btn.getAttribute("data-ref") || "";
        closeModal();
        if (callbacks.onOpenVerse) callbacks.onOpenVerse(ref);
      });
    });

    listEl.querySelectorAll(".btn-dvc-copy").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ref = btn.getAttribute("data-ref") || "";
        navigator.clipboard.writeText(`Referensi Khotbah: ${ref}`).then(() => {
          btn.textContent = "✓ Tersalin";
          setTimeout(() => { btn.textContent = "📋 Salin"; }, 1800);
        });
      });
    });

    listEl.querySelectorAll(".btn-dvc-share").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ref = btn.getAttribute("data-ref") || "";
        closeModal();
        document.dispatchEvent(new CustomEvent("rhema-share-verse", { detail: ref }));
      });
    });
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Detektor khotbah membutuhkan Web Speech API. Di aplikasi Android ini belum tersedia — pakai Chrome di komputer, atau salin ayat lewat Alkitab.");
      return;
    }

    try {
      recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "id-ID";

      recognitionInstance.onstart = () => {
        isListening = true;
        micCard?.classList.add("listening");
        if (statusText) statusText.textContent = "Sedang Mendengarkan Khotbah Live…";
        if (subText) subText.textContent = "Mikrofon aktif. Setiap ayat yang diucapkan pendeta akan langsung muncul.";
      };

      recognitionInstance.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        processSermonText(transcript);
      };

      recognitionInstance.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          alert("Izin akses mikrofon diperlukan untuk mendengarkan khotbah.");
          stopListening();
        }
      };

      recognitionInstance.onend = () => {
        if (isListening) {
          try { recognitionInstance.start(); } catch {}
        }
      };

      recognitionInstance.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      stopListening();
    }
  }

  function stopListening() {
    isListening = false;
    micCard?.classList.remove("listening");
    if (statusText) statusText.textContent = "Detektor Dijeda";
    if (subText) subText.textContent = "Tap mikrofon untuk kembali mendengarkan khotbah.";
    if (recognitionInstance) {
      try { recognitionInstance.stop(); } catch {}
      recognitionInstance = null;
    }
  }

  micBtn?.addEventListener("click", () => {
    if (isListening) stopListening();
    else startListening();
  });

  renderDetectedVerses();
}
