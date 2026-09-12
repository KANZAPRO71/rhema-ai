/**
 * Alkitab TB — terhubung ke API, voice S2S, dan mobile shell.
 */

import { apiUrl } from "./platform.js";
import { verseOfTheDay, knowledgeMeta, getCrossReferences, lookupKjvVerse } from "./alkitabClient.js";
import { openSermonAssistantModal } from "./sermonAssistant.js";
import { buildSermonKnowledgePrompt } from "./sermonBibleContext.js";
import { getTodayOneYearDay } from "./biblePlanData.js";
import { openVerseShareModal } from "./verseCardRenderer.js?v=20260819-1509";
import { getTodayAIDevotion } from "./aiDevotionEngine.js";
import {
  openLectioDivinaModal,
  buildLectioVoicePrompt,
  isLectioSessionActive,
  onLectioVoiceTurnComplete,
} from "./lectioDivina.js";
import { initAlkitabPowerFeatures } from "./alkitabFeatures.js?v=20260911-sleep";
import { forceStopAmbientAndSpeech } from "./ambientAudio.js";
import {
  buildSermonVoicePrompt,
  initVoiceSermonBar,
  isPreacherPersonaActive,
  isSermonModeActive,
  setPreacherPersona,
} from "./sermonPrompts.js";
import { initSermonLiveContinuer, markSermonEnded, markSermonStarted } from "./sermonLiveContinuer.js";
import { unlockNativeElementAudio, warmupNativePlayback } from "./nativeAudioPlayback.js";
import { googleKeyConfigured, isGoogleKeyLiveValidated, validateGoogleKeyForVoice } from "./geminiConstants.js";
import { openByokOnboarding } from "./byokOnboarding.js";
import { formatVoiceError } from "./byokUx.js";
import { getEffectiveBibleVersion, getEffectiveUiLang } from "./localeProfile.js";
import { t } from "./uiStrings.js";
import { deliverVoiceOpenGreeting, deliverVoiceResumeContext, hasVoiceConversationHistory } from "./voiceGreeting.js";
import { parseExplicitMemory, syncLocalSessionMemory } from "./memoryStore.js";
import { handleVoiceLocalCommand } from "./voiceLocalCommands.js";
import {
  fetchTbSearchStatus,
  hideSearchResults,
  looksLikeVerseQuery,
  pushSearchHistory,
  renderAlkitabSearchResults,
  renderSearchHistory,
  searchTbBrowser,
  showSearchLoading,
  normalizeSearchResult,
  renderSearchModeSelector,
} from "./alkitabSearch.js";
import { scrollMobileSectionIntoView } from "./mobileScroll.js";

import { loadHymn } from "./laguData.js";
import {
  initHomeWorship,
  stopAllRenunganInlineSessions,
  anyInlineRenunganSessionActive,
  markTodayRead,
  renderDevotionCard,
  renderHomeStreakMini,
  renderPrayerJournal,
  renderRenunganShell,
  renderAlkitabProgramShell,
  renderDailyBibleQuiz,
  openHomeQuizSection,
  switchAlkitabProgramSubTab,
  switchRenunganSubTab,
} from "./homeWorship.js?v=20260911-play";
import { refreshHomeGreeting } from "./uiShell.js";

const RHEMA_STUDIO_LABEL = "🎨 Rhema Studio";

const QUICK_VERSES = [
  { ref: "Yohanes 3:16", label: "Yohanes 3:16" },
  { ref: "Mazmur 23:1", label: "Mazmur 23" },
  { ref: "Filipi 4:13", label: "Filipi 4:13" },
  { ref: "Roma 8:28", label: "Roma 8:28" },
  { ref: "Matius 6:33", label: "Matius 6:33" },
];

const RECENT_KEY = "rhema-alkitab-recent";
const HOME_PILLAR_KEY = "rhema-home-pillar-last";

/** @type {{ onOpenVerse?: (ref: string) => void, onAskVoice?: (text: string) => void } | null} */
let alkitabPowerCallbacks = null;

/** @type {{ reference: string, text: string, found?: boolean } | null} */
let currentVerse = null;

/** @type {(screen: string) => void} */
let navigate = () => {};

/** Cegah ghost-tap ke tab Rhema AI setelah Suara Live inline di Renungan. */
function markInlineVoiceTap() {
  window.__rhemaInlineVoiceUntil = Date.now() + 2500;
  window.__rhemaInlineVoiceSession = true;
}

function shouldBlockVoiceScreenNav() {
  return Date.now() < Number(window.__rhemaInlineVoiceUntil || 0);
}

function isRenunganScreenActive() {
  const el = document.getElementById("screen-renungan");
  return Boolean(el?.classList.contains("active"));
}

function isHomeScreenActive() {
  const el = document.getElementById("screen-home");
  return Boolean(el?.classList.contains("active"));
}

function isAlkitabScreenActive() {
  const el = document.getElementById("screen-alkitab");
  return Boolean(el?.classList.contains("active"));
}

function wireRhemaVoiceHubButton(buttonId, transport) {
  document.getElementById(buttonId)?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    goToRhemaVoice({ force: true });
    startVoiceLive(transport, { switchScreen: false });
  });
}

function shouldKeepVoiceOnCurrentScreen() {
  return shouldBlockVoiceScreenNav() || isRenunganScreenActive() || Boolean(window.__rhemaInlineVoiceSession);
}

/** @type {(screen: string) => void} */
let shellGo = () => {};

/** Pindah ke tab Rhema AI — paksa dari Beranda meski inline-voice flag masih aktif. */
function goToRhemaVoice({ force = false } = {}) {
  if (force) {
    window.__rhemaInlineVoiceUntil = 0;
    window.__rhemaInlineVoiceSession = false;
  }
  if (!force && shouldKeepVoiceOnCurrentScreen()) return false;
  shellGo("voice");
  return true;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveJson(key, data) {
  localStorage.setItem(key, JSON.stringify(data.slice(0, 30)));
}

function pushRecent(verse) {
  if (!verse?.reference || !verse?.text) return;
  const list = loadJson(RECENT_KEY).filter((v) => v.reference !== verse.reference);
  list.unshift({ reference: verse.reference, text: verse.text, at: Date.now() });
  saveJson(RECENT_KEY, list);
  renderRecentList();
}

const kjvTextCache = new Map();

async function loadKjvForCard(reference, tbText, found) {
  if (kjvTextCache.has(reference)) {
    renderVerseCard(reference, tbText, found, kjvTextCache.get(reference));
    return;
  }
  try {
    const kjv = await lookupKjvVerse(reference);
    const kjvText = kjv.found ? kjv.text : "Ayat belum tersedia di KJV offline.";
    kjvTextCache.set(reference, kjvText);
    if (currentVerse?.reference === reference && currentVersionMode === "kjv") {
      renderVerseCard(reference, tbText, found, kjvText);
    }
  } catch {
    kjvTextCache.set(reference, "Gagal memuat KJV offline.");
    if (currentVerse?.reference === reference && currentVersionMode === "kjv") {
      renderVerseCard(reference, tbText, found, "Gagal memuat KJV offline.");
    }
  }
}

let currentVersionMode = getEffectiveBibleVersion(); // 'tb' | 'kjv'

function applyLocaleBibleDefault() {
  currentVersionMode = getEffectiveBibleVersion();
  if (currentVerse?.reference) {
    renderVerseCard(
      currentVerse.reference,
      currentVerse.text,
      currentVerse.found !== false,
      kjvTextCache.get(currentVerse.reference),
    );
  }
}

const HIGHLIGHTS_KEY = "rhema_verse_highlights";
const NOTES_KEY = "rhema_verse_notes";

function getHighlightsMap() {
  try {
    return JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function setVerseHighlight(ref, color) {
  if (!ref) return;
  const map = getHighlightsMap();
  if (!color || color === "none") delete map[ref];
  else map[ref] = color;
  localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(map));
}

function getVerseHighlight(ref) {
  if (!ref) return null;
  return getHighlightsMap()[ref] || null;
}

function getNotesMap() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveVerseNote(ref, text) {
  if (!ref) return;
  const map = getNotesMap();
  const t = (text || "").trim();
  if (!t) delete map[ref];
  else map[ref] = { text: t, updatedAt: Date.now() };
  localStorage.setItem(NOTES_KEY, JSON.stringify(map));
}

function syncRhemaStudioButton() {
  const shareBtn = document.getElementById("btn-alkitab-share-image");
  if (shareBtn) shareBtn.textContent = RHEMA_STUDIO_LABEL;
}

function showAlkitabToast(message) {
  let el = document.getElementById("alkitab-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "alkitab-toast";
    el.className = "alkitab-toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(showAlkitabToast._t);
  showAlkitabToast._t = window.setTimeout(() => el?.classList.remove("show"), 2400);
}

async function renderRelatedVerses(reference) {
  const el = document.getElementById("alkitab-related");
  if (!el) return;
  try {
    const related = await getCrossReferences(reference);
    if (!related.length) {
      el.classList.add("hidden");
      el.innerHTML = "";
      return;
    }
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="alkitab-related-row">
        <span class="related-label">Ayat terkait</span>
        ${related
          .slice(0, 5)
          .map(
            (item) =>
              `<button type="button" class="related-chip" data-ref="${escapeHtml(item.ref)}" title="${escapeHtml(item.label || item.ref)}">${escapeHtml(item.ref)}</button>`,
          )
          .join("")}
      </div>`;
    el.querySelectorAll("[data-ref]").forEach((btn) => {
      btn.addEventListener("click", () => void openVerse(btn.getAttribute("data-ref") || ""));
    });
  } catch {
    el.classList.add("hidden");
  }
}

/** @param {boolean} hasVerse */
function setVerseActionsState(hasVerse) {
  const actions = document.getElementById("alkitab-verse-actions");
  if (!actions) return;
  actions.classList.remove("hidden");
  syncRhemaStudioButton();
  for (const id of ["btn-alkitab-listen", "btn-alkitab-explain", "btn-alkitab-lectio"]) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.disabled = !hasVerse;
    btn.setAttribute("aria-disabled", hasVerse ? "false" : "true");
    btn.classList.toggle("verse-action-disabled", !hasVerse);
  }
  syncKhotbahHubState(hasVerse);
}

function syncKhotbahHubState(hasVerse = Boolean(currentVerse?.reference && currentVerse?.text)) {
  for (const id of ["btn-alkitab-khotbah-verse", "btn-alkitab-renungan-live"]) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.disabled = !hasVerse;
    btn.setAttribute("aria-disabled", hasVerse ? "false" : "true");
    btn.classList.toggle("verse-action-disabled", !hasVerse);
    btn.classList.toggle("alkitab-voice-bento-btn--disabled", !hasVerse);
  }
}

function getVerseNote(ref) {
  if (!ref) return "";
  return getNotesMap()[ref]?.text || "";
}

export function renderVerseCard(reference, text, found, kjvText = undefined) {
  const card = document.getElementById("alkitab-verse-card");
  if (!card) return;
  if (!found || !text) {
    currentVerse = { reference, text: "", found: false };
    card.innerHTML = `<p class="alkitab-verse-missing">Ayat <strong>${escapeHtml(reference)}</strong> belum ada di TB offline.</p>`;
    setVerseActionsState(false);
    document.getElementById("alkitab-explain-banner")?.classList.add("hidden");
    document.getElementById("alkitab-related")?.classList.add("hidden");
    syncKhotbahHubState(false);
    return;
  }
  currentVerse = { reference, text, found: true };
  const activeHighlight = getVerseHighlight(reference);
  const existingNote = getVerseNote(reference);

  const hlClass = activeHighlight ? `verse-hl-${activeHighlight}` : "";

  let bodyHtml = "";
  if (currentVersionMode === "tb") {
    bodyHtml = `
      <blockquote class="alkitab-verse-text ${hlClass}">&ldquo;${escapeHtml(text)}&rdquo;</blockquote>
      <cite class="alkitab-verse-ref">${escapeHtml(reference)} · Terjemahan Baru (LAI)</cite>`;
  } else {
    const kjv = kjvText ?? "Memuat KJV…";
    const isMissing = kjv === "Memuat KJV…" || kjv.startsWith("Ayat belum") || kjv.startsWith("Gagal memuat");
    bodyHtml = `
      <blockquote class="alkitab-verse-text kjv-text ${hlClass} ${isMissing && kjv !== "Memuat KJV…" ? "kjv-missing" : ""}">&ldquo;${escapeHtml(kjv)}&rdquo;</blockquote>
      <cite class="alkitab-verse-ref">${escapeHtml(reference)} · King James Version · offline 66 kitab${isMissing && kjv !== "Memuat KJV…" ? " · tidak ditemukan" : ""}</cite>`;
    if (kjvText === undefined) void loadKjvForCard(reference, text, found);
  }

  card.innerHTML = `
    <div class="alkitab-version-tabs" role="tablist" aria-label="Pilih terjemahan Alkitab">
      <button type="button" class="version-tab-btn ${currentVersionMode === "tb" ? "active" : ""}" data-ver="tb">TB (LAI)</button>
      <button type="button" class="version-tab-btn ${currentVersionMode === "kjv" ? "active" : ""}" data-ver="kjv">KJV (English)</button>
    </div>
    
    <div class="verse-content-wrap">
      ${bodyHtml}
    </div>

    <!-- Floating Highlight & Notes Toolbar -->
    <div class="verse-floating-toolbar">
      <span class="toolbar-label">Stabilo:</span>
      <button type="button" class="swatch-btn hl-gold ${activeHighlight === "gold" ? "selected" : ""}" data-color="gold" title="Kuning: Janji & Berkat">🟡</button>
      <button type="button" class="swatch-btn hl-green ${activeHighlight === "green" ? "selected" : ""}" data-color="green" title="Hijau: Hikmat & Perintah">🟢</button>
      <button type="button" class="swatch-btn hl-blue ${activeHighlight === "blue" ? "selected" : ""}" data-color="blue" title="Biru: Damai Sejahtera">🔵</button>
      <button type="button" class="swatch-btn hl-rose ${activeHighlight === "rose" ? "selected" : ""}" data-color="rose" title="Merah: Kasih Karunia">🔴</button>
      ${activeHighlight ? `<button type="button" class="swatch-btn swatch-clear" data-color="none" title="Hapus stabilo">✕</button>` : ""}
    </div>

    <!-- Note Box -->
    <div class="verse-note-box ${existingNote ? "has-note" : ""}" id="verse-note-box">
      <div class="note-box-head">
        <span class="note-icon">📝</span>
        <span class="note-title">Catatan Renungan Pribadi</span>
      </div>
      <textarea id="verse-note-input" class="verse-note-textarea" rows="2" placeholder="Tulis perenungan atau doa pribadi untuk ayat ini…">${escapeHtml(existingNote)}</textarea>
      <div class="note-box-actions">
        <button type="button" id="btn-save-verse-note" class="btn-tool-pill primary">Simpan Catatan</button>
      </div>
    </div>`;

  // Listener Version Tabs
  card.querySelectorAll(".version-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentVersionMode = btn.getAttribute("data-ver") || "tb";
      renderVerseCard(reference, text, found);
    });
  });

  // Listener Swatch Highlights
  card.querySelectorAll(".swatch-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.getAttribute("data-color");
      setVerseHighlight(reference, color);
      renderVerseCard(reference, text, found);
    });
  });

  // Listener Save Note
  card.querySelector("#btn-save-verse-note")?.addEventListener("click", () => {
    const noteInput = /** @type {HTMLTextAreaElement | null} */ (card.querySelector("#verse-note-input"));
    if (noteInput) {
      saveVerseNote(reference, noteInput.value);
      showAlkitabToast("Catatan renungan disimpan.");
    }
  });

  setVerseActionsState(true);
  document.getElementById("alkitab-explain-banner")?.classList.remove("hidden");
  void renderRelatedVerses(reference);
  pushRecent(currentVerse);
  markTodayRead();
}

function renderTodayCard(verse) {
  renderDevotionCard(verse, {
    onOpen: () => verse?.reference && void openVerse(verse.reference),
    onListen: () => {
      if (!verse?.reference) return;
      askVoice(`Bacakan ayat ${verse.reference}`);
      markTodayRead();
    },
    onExplain: () => {
      if (!verse?.reference) return;
      askVoice(`Penjelasan arti dari ayat ${verse.reference}`);
      markTodayRead();
    },
  });
}

/** @type {(text: string) => void} */
let askVoice = () => {};

function renderMiniList(listEl, items, emptyText, onPick) {
  if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML = `<li class="alkitab-mini-empty">${escapeHtml(emptyText)}</li>`;
    return;
  }
  listEl.innerHTML = items
    .slice(0, 8)
    .map(
      (v) =>
        `<li><button type="button" class="alkitab-quick-btn" data-ref="${escapeHtml(v.reference)}">${escapeHtml(v.reference)}</button></li>`,
    )
    .join("");
  listEl.querySelectorAll("[data-ref]").forEach((btn) => {
    btn.addEventListener("click", () => onPick(btn.getAttribute("data-ref") || ""));
  });
}

function renderAlkitabQuickRow() {
  const quickWrap = document.getElementById("alkitab-quick");
  if (!quickWrap) return;

  const recent = loadJson(RECENT_KEY).slice(0, 4);
  const recentRefs = new Set(recent.map((v) => v.reference));
  const chips = [
    ...recent.map((v) => ({
      ref: v.reference,
      label: v.reference,
      recent: true,
    })),
    ...QUICK_VERSES.filter((v) => !recentRefs.has(v.ref)).map((v) => ({
      ref: v.ref,
      label: v.label,
      recent: false,
    })),
  ];

  if (!chips.length) {
    quickWrap.innerHTML = `<span class="alkitab-mini-empty">Belum ada ayat — cari di atas.</span>`;
    return;
  }

  quickWrap.innerHTML = chips
    .map(
      (v) =>
        `<button type="button" class="alkitab-quick-btn${v.recent ? " alkitab-recent-chip" : ""}" data-ref="${escapeHtml(v.ref)}" title="${v.recent ? "Baru dibuka" : "Ayat populer"}">${escapeHtml(v.label)}</button>`,
    )
    .join("");
  quickWrap.querySelectorAll("[data-ref]").forEach((btn) => {
    btn.addEventListener("click", () => void openVerse(btn.getAttribute("data-ref") || ""));
  });
}

function renderRecentList() {
  const items = loadJson(RECENT_KEY);
  const onPick = (ref) => void openVerse(ref);
  renderMiniList(document.getElementById("alkitab-recent-list"), items, t("home.recent.empty"), onPick);
  renderAlkitabQuickRow();
}

let khotbahHubWired = false;

function wireAlkitabKhotbahHub(askVoiceFn) {
  if (khotbahHubWired) return;
  khotbahHubWired = true;
  syncKhotbahHubState(false);

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;

      if (target.closest("#btn-alkitab-khotbah-verse")) {
        e.preventDefault();
        e.stopPropagation();
        if (!currentVerse?.reference || !currentVerse?.text) {
          showAlkitabToast("Buka ayat TB dulu untuk khotbah dari ayat ini.");
          return;
        }
        setPreacherPersona();
        markSermonStarted(8);
        const passage = currentVerse.reference;
        const basePrompt = buildSermonVoicePrompt({ minutes: 8, passage, title: passage });
        void buildSermonKnowledgePrompt(passage, basePrompt)
          .then(({ prompt }) => {
            askVoiceFn(prompt, `🎙️ Khotbah — ${passage}`, { stayOnScreen: true });
          })
          .catch(() => {
            askVoiceFn(basePrompt, `🎙️ Khotbah — ${passage}`, { stayOnScreen: true });
          });
        markTodayRead();
        return;
      }

      if (target.closest("#btn-alkitab-khotbah-topik")) {
        e.preventDefault();
        e.stopPropagation();
        openSermonAssistantModal({
          onVoiceSermon: (outline) => {
            setPreacherPersona();
            markSermonStarted(8);
            askVoiceFn(
              buildSermonVoicePrompt({
                minutes: 8,
                passage: outline.passage,
                title: outline.title,
              }),
              `🎙️ Khotbah — ${outline.title}`,
              { stayOnScreen: true },
            );
            markTodayRead();
          },
        });
        return;
      }

      if (target.closest("#btn-alkitab-renungan-live")) {
        e.preventDefault();
        e.stopPropagation();
        if (!currentVerse?.reference || !currentVerse?.text) {
          showAlkitabToast("Buka ayat TB dulu untuk renungan live.");
          return;
        }
        askVoiceFn(
          `Renungkan ayat ${currentVerse.reference}: "${currentVerse.text}". Sampaikan renungan rohani 3-4 menit dengan nada gembala — pembukaan, makna ayat, aplikasi hidup, dan doa penutup.`,
          `✨ Renungan — ${currentVerse.reference}`,
          { stayOnScreen: true },
        );
        markTodayRead();
        return;
      }

      if (target.closest("#btn-alkitab-goto-voice")) {
        e.preventDefault();
        e.stopPropagation();
        goToRhemaVoice({ force: true });
      }
    },
    true,
  );
}

async function fetchVerse(ref) {
  const res = await fetch(apiUrl(`/api/alkitab/verse?ref=${encodeURIComponent(ref)}`));
  return res.json();
}

async function loadVerseIntoCard(ref) {
  const card = document.getElementById("alkitab-verse-card");
  if (card) card.innerHTML = `<p class="alkitab-loading">Memuat ${escapeHtml(ref)}…</p>`;
  try {
    const verse = await fetchVerse(ref);
    renderVerseCard(verse.reference || ref, verse.text || "", verse.found !== false);
  } catch {
    renderVerseCard(ref, "", false);
  }
}

export async function openVerse(ref, opts = {}) {
  navigate("alkitab");
  if (!opts.preserveSearchPanel) {
    hideSearchResults(document.getElementById("alkitab-search-results"));
  }
  await loadVerseIntoCard(ref);
}

async function runSemanticTopicSearch(query, fallbackRef) {
  const q = (query || "").trim();
  if (!q) {
    if (fallbackRef) await openVerse(fallbackRef);
    return;
  }

  navigate("alkitab");
  pushSearchHistory(q);
  const searchInput = document.getElementById("alkitab-search");
  if (searchInput) searchInput.value = q;
  const resultsBox = document.getElementById("alkitab-search-results");
  showSearchLoading(resultsBox, q);

  try {
    const result = await searchTbBrowser(q);
    const normalized = normalizeSearchResult(result);
    const hasHits = normalized.verses.length || normalized.semantic.length || normalized.themes.length;

    if (!hasHits && fallbackRef) {
      await loadVerseIntoCard(fallbackRef);
      renderAlkitabSearchResults(resultsBox, { ...normalized, query: q }, {
        onSelect: (ref) => void openVerse(ref),
        emptyHint: `Ayat utama untuk topik ini sudah ditampilkan di kartu firman (${fallbackRef}).`,
      });
      return;
    }

    renderAlkitabSearchResults(resultsBox, normalized, {
      onSelect: (ref) => void openVerse(ref),
    });
    renderSearchHistory(document.getElementById("alkitab-search-history"), (picked) => {
      void runAlkitabSearch(picked);
    });

    const topRef = fallbackRef || normalized.verses[0]?.reference;
    if (topRef) await loadVerseIntoCard(topRef);
  } catch {
    if (fallbackRef) {
      await loadVerseIntoCard(fallbackRef);
      if (resultsBox) {
        resultsBox.classList.remove("hidden");
        resultsBox.innerHTML = `
          <div class="search-results-head">
            <span class="search-results-title">Topik firman</span>
            <button type="button" class="btn-search-close" id="btn-close-search-results" aria-label="Tutup">✕</button>
          </div>
          <p class="search-results-note">Pencarian penuh tidak tersedia — ayat kurati untuk topik ini ditampilkan di kartu firman.</p>
          <button type="button" class="search-verse-btn" data-ref="${escapeHtml(fallbackRef)}">
            <span class="search-verse-ref">${escapeHtml(fallbackRef)}</span>
          </button>`;
        resultsBox.querySelector("#btn-close-search-results")?.addEventListener("click", () => hideSearchResults(resultsBox));
        resultsBox.querySelector("[data-ref]")?.addEventListener("click", () => void openVerse(fallbackRef));
      }
    } else if (resultsBox) {
      resultsBox.innerHTML = `<p class="search-results-empty">Gagal mencari. Periksa koneksi server.</p>`;
    }
  }
}

async function runAlkitabSearch(query) {
  const q = (query || "").trim();
  if (!q) return;
  navigate("alkitab");
  pushSearchHistory(q);
  const searchInput = document.getElementById("alkitab-search");
  if (searchInput) searchInput.value = q;
  const resultsBox = document.getElementById("alkitab-search-results");
  showSearchLoading(resultsBox, q);
  try {
    const result = await searchTbBrowser(q);
    renderAlkitabSearchResults(resultsBox, result, {
      onSelect: (ref) => void openVerse(ref),
    });
    renderSearchHistory(document.getElementById("alkitab-search-history"), (picked) => {
      void runAlkitabSearch(picked);
    });
  } catch {
    if (resultsBox) {
      resultsBox.innerHTML = `<p class="search-results-empty">Gagal mencari. Periksa koneksi server.</p>`;
    }
  }
}

async function handleAlkitabSearchInput(query) {
  const q = (query || "").trim();
  if (!q) return;
  if (looksLikeVerseQuery(q)) {
    const verse = await fetchVerse(q);
    if (verse?.found !== false && verse?.text) {
      await openVerse(verse.reference || q);
      return;
    }
  }
  await runAlkitabSearch(q);
}

async function initAlkitabSearchHistory() {
  renderSearchHistory(document.getElementById("alkitab-search-history"), (q) => {
    void runAlkitabSearch(q);
  });
}

export async function refreshHomeEmbedBadge() {
  const heroBadge = document.getElementById("hero-embed-badge");
  if (!heroBadge) return;
  try {
    const meta = await knowledgeMeta();
    const count = meta.tbSearchIndex?.verseCount ?? 0;
    if (meta.tbSearchIndex?.ready && count > 0) {
      const loc = getEffectiveUiLang() === "en" ? "en-US" : "id-ID";
      heroBadge.textContent = t("home.embed.semantic", { count: count.toLocaleString(loc) });
      heroBadge.classList.remove("hidden");
      return;
    }
  } catch {
    /* offline meta unavailable */
  }
  try {
    const st = await fetchTbSearchStatus();
    if (st.fullComplete) {
      const loc = getEffectiveUiLang() === "en" ? "en-US" : "id-ID";
      heroBadge.textContent = t("home.embed.semantic", { count: st.fullCount.toLocaleString(loc) });
      heroBadge.classList.remove("hidden");
    }
  } catch {
    /* ignore */
  }
}

function voiceTimeLocale() {
  return getEffectiveUiLang() === "en" ? "en-US" : "id-ID";
}

function voiceEmptyStateHtml() {
  return `
    <div class="voice-empty-state" id="voice-empty-state">
      <div class="empty-sacred-icon">🕊️</div>
      <p class="empty-title">${escapeHtml(t("voice.empty.title"))}</p>
      <p class="empty-desc">${escapeHtml(t("voice.empty.descClear"))}</p>
    </div>
  `;
}

function setAlkitabHint(text) {
  const el = document.getElementById("alkitab-hint");
  if (el) el.textContent = text;
}

/** @param {"idle" | "active" | "error" | "connecting"} mode */
function setVoiceTapLabel(mode, errorDetail) {
  const state = document.getElementById("voice-state-label");
  const composerMic = document.getElementById("btn-voice-composer-mic");
  const composerStop = document.getElementById("btn-voice-composer-stop");
  composerMic?.classList.remove("connecting", "live-hidden");
  composerStop?.classList.remove("hidden", "live", "idle");
  if (mode === "active" || mode === "connecting") {
    composerStop?.classList.add("live");
    composerStop?.removeAttribute("disabled");
    composerMic?.classList.toggle("connecting", mode === "connecting");
    if (mode === "active") composerMic?.classList.add("live-hidden");
  } else {
    composerStop?.classList.add("idle");
    composerStop?.setAttribute("disabled", "true");
  }
  if (!state) return;
  if (mode === "active") {
    state.textContent = t("voice.state.active");
  } else if (mode === "connecting") {
    state.textContent = t("voice.state.connecting");
  } else if (mode === "error") {
    const detail = String(errorDetail || "");
    state.textContent = /API key|authentication|PERMISSION|invalid/i.test(detail)
      ? t("voice.state.errorKey")
      : /dikunci|lock/i.test(detail)
        ? t("voice.state.errorLock")
        : t("voice.state.errorRetry");
    composerMic?.setAttribute("title", t("voice.composer.micTitle"));
    composerMic?.setAttribute("aria-label", t("voice.composer.micAria"));
  } else {
    state.textContent = t("voice.state.idle");
    composerMic?.setAttribute("title", t("voice.composer.micTitle"));
    composerMic?.setAttribute("aria-label", t("voice.composer.micAria"));
  }
}

function refreshVoiceLocaleUi(transport) {
  const voiceActive = transport?.voice?.isActive?.();
  if (!voiceActive && !voiceStartPending) {
    setVoiceTapLabel("idle");
    setAlkitabHint(t("voice.hint.idle"));
  }
}

function blockNavFromVoiceLongPress() {
  window.__rhemaNavVoiceLongPressBlockNav = true;
  window.setTimeout(() => {
    window.__rhemaNavVoiceLongPressBlockNav = false;
  }, 800);
}

/** Tab mic bawah: sentuh singkat = buka halaman saja; tahan ~1 d = on/off live. */
function bindNavVoiceLongPress(el, transport, { delayMs = 900, visualDelayMs = 300 } = {}) {
  if (!el) return;
  let timer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let visualTimer = null;
  let longPressFired = false;
  let startX = 0;
  let startY = 0;
  const moveTolerance = 14;

  function clearHold() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (visualTimer) {
      clearTimeout(visualTimer);
      visualTimer = null;
    }
    el.classList.remove("nav-voice-holding");
    window.__rhemaNavVoiceHoldActive = false;
  }

  el.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0) return;
      longPressFired = false;
      window.__rhemaNavVoiceHoldActive = true;
      startX = e.clientX;
      startY = e.clientY;
      visualTimer = window.setTimeout(() => {
        visualTimer = null;
        if (window.__rhemaNavVoiceHoldActive) el.classList.add("nav-voice-holding");
      }, visualDelayMs);
      el.setPointerCapture?.(e.pointerId);
      timer = window.setTimeout(() => {
        longPressFired = true;
        clearHold();
        blockNavFromVoiceLongPress();
        if (transport.voice?.isActive?.() || voiceStartPending || anyInlineRenunganSessionActive()) {
          stopVoiceLive(transport);
        } else {
          goToRhemaVoice({ force: true });
          startVoiceLive(transport, { switchScreen: false });
        }
      }, delayMs);
    },
    true,
  );

  el.addEventListener(
    "pointermove",
    (e) => {
      if (!timer) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > moveTolerance) clearHold();
    },
    true,
  );

  el.addEventListener(
    "pointerup",
    (e) => {
      const wasLongPress = longPressFired;
      clearHold();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      if (wasLongPress) return;
      goToRhemaVoice({ force: true });
    },
    true,
  );

  el.addEventListener("pointercancel", clearHold, true);

  for (const type of ["click", "touchend"]) {
    el.addEventListener(
      type,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
      },
      true,
    );
  }

  el.addEventListener("contextmenu", (e) => e.preventDefault(), true);
}

let todayRhemaVerse = null;

async function renderHomeTodayVerse() {
  const tile = document.getElementById("bento-today-verse");
  if (!tile) return;
  const textEl = tile.querySelector(".bento-verse-text");
  const refEl = tile.querySelector(".bento-verse-ref");
  if (textEl) {
    textEl.setAttribute("data-i18n", "home.verse.loading");
    textEl.textContent = t("home.verse.loading");
    textEl.classList.add("alkitab-loading");
  }
  if (refEl) refEl.textContent = "—";
  try {
    const verse = await verseOfTheDay();
    todayRhemaVerse = verse?.found !== false ? verse : null;
    if (verse?.text && textEl && refEl) {
      textEl.removeAttribute("data-i18n");
      textEl.textContent = `"${verse.text}"`;
      textEl.classList.remove("alkitab-loading");
      refEl.textContent = verse.reference || "—";
    } else if (textEl) {
      textEl.textContent = t("home.verse.unavailable");
      textEl.classList.remove("alkitab-loading");
    }
  } catch {
    todayRhemaVerse = null;
    if (textEl) {
      textEl.textContent = t("home.verse.loadError");
      textEl.classList.remove("alkitab-loading");
    }
  }
}

const VOICE_HISTORY_STORAGE_KEY = "rhema-voice-conversation-history";
const VOICE_MEMORY_SESSION = "rhema-voice-live";

/** @returns {Array<{ id: string, role: "user" | "assistant", text: string, time: string }>} */
function loadVoiceHistory() {
  try {
    const raw = localStorage.getItem(VOICE_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** @param {Array<{ id: string, role: "user" | "assistant", text: string, time: string }>} items */
function saveVoiceHistory(items) {
  try {
    localStorage.setItem(VOICE_HISTORY_STORAGE_KEY, JSON.stringify(items.slice(-60)));
  } catch {}
}

/** Auto-scroll hanya jika user sudah di bagian bawah — biar bisa scroll riwayat saat live. */
function scrollVoiceTranscript(box, force = false) {
  if (!box) return;
  const gap = box.scrollHeight - box.scrollTop - box.clientHeight;
  if (force || gap < 96) box.scrollTop = box.scrollHeight;
}

export function initVoiceTranscriptHistory() {
  const box = document.getElementById("voice-transcript");
  if (!box) return;
  const history = loadVoiceHistory();
  if (!history.length) return;

  const empty = document.getElementById("voice-empty-state");
  if (empty) empty.style.display = "none";

  // If already populated with all items, no need to overwrite
  const existingBubbles = box.querySelectorAll(".vt-line");
  if (existingBubbles.length === history.length) return;

  box.innerHTML = "";
  for (const item of history) {
    renderVoiceTranscriptBubble(item.role, item.text, item.time, item.id);
  }
  scrollVoiceTranscript(box, true);
}

function refreshVoiceTranscriptToTop() {
  const box = document.getElementById("voice-transcript");
  if (!box) return;
  const history = loadVoiceHistory();
  if (!history.length) return;

  const empty = document.getElementById("voice-empty-state");
  if (empty) empty.style.display = "none";

  box.innerHTML = "";
  for (const item of history) {
    renderVoiceTranscriptBubble(item.role, item.text, item.time, item.id);
  }
  box.scrollTo({ top: 0, behavior: "smooth" });
}

function renderVoiceTranscriptBubble(role, text, timeStr, id) {
  const box = document.getElementById("voice-transcript");
  if (!box) return null;
  const empty = document.getElementById("voice-empty-state");
  if (empty) empty.style.display = "none";

  const isUser = role === "user";
  const itemId = id || "vmsg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const time = timeStr || new Date().toLocaleTimeString(voiceTimeLocale(), { hour: "2-digit", minute: "2-digit" });

  const line = document.createElement("div");
  line.className = `vt-line ${isUser ? "user" : "assistant"}`;
  line.id = itemId;
  line.innerHTML = `
    <div class="vt-meta-row">
      <span class="vt-role-tag">${isUser ? t("voice.role.user") : t("voice.role.assistant")}</span>
      <span class="vt-time-tag">${time}</span>
    </div>
    <div class="vt-bubble">${escapeHtml(text)}</div>
  `;

  box.appendChild(line);
  scrollVoiceTranscript(box, false);
  return line;
}

let liveAssistantBubble = null;
let liveAssistantText = "";
let liveUserBubble = null;
let liveUserText = "";
let assistantSilenceTimer = null;
let suppressGeminiAssistantUntil = 0;

function handleVoiceTranscriptStream(role, delta, final = false, moduleId = "") {
  const box = document.getElementById("voice-transcript");
  if (!box) return;

  const isUser = role === "user";

  // Jawaban lokal (pencipta, ingatan) — selalu tampilkan meski Gemini sedang di-suppress.
  if (!isUser && moduleId) {
    finalizeLiveAssistant();
    finalizeLiveUser();
    renderVoiceTranscriptBubble("assistant", delta || "…");
    if (final && delta?.trim()) commitVoiceHistory("assistant", delta.trim());
    return;
  }

  if (!isUser && Date.now() < suppressGeminiAssistantUntil) {
    return;
  }

  if (isUser) {
    if (!liveUserBubble) {
      finalizeLiveAssistant();
      const id = "vmsg-live-user";
      liveUserBubble = renderVoiceTranscriptBubble("user", delta || "…", "", id);
      liveUserText = delta || "";
    } else {
      liveUserText = delta || liveUserText;
      const bubbleEl = liveUserBubble.querySelector(".vt-bubble");
      if (bubbleEl) bubbleEl.textContent = liveUserText;
      scrollVoiceTranscript(box);
    }
    if (final && liveUserText.trim()) {
      commitVoiceHistory("user", liveUserText.trim());
      if (liveUserBubble) liveUserBubble.id = "vmsg-" + Date.now();
      liveUserBubble = null;
      liveUserText = "";
    }
  } else {
    // Assistant delta
    if (!liveAssistantBubble) {
      finalizeLiveUser();
      const id = "vmsg-live-assistant";
      liveAssistantText = delta || "";
      liveAssistantBubble = renderVoiceTranscriptBubble("assistant", liveAssistantText || "…", "", id);
    } else {
      const prev = liveAssistantText;
      if (delta && delta.startsWith(prev)) {
        liveAssistantText = delta;
      } else if (delta && !prev.endsWith(delta)) {
        liveAssistantText = prev + delta;
      }
      const bubbleEl = liveAssistantBubble.querySelector(".vt-bubble");
      if (bubbleEl) bubbleEl.textContent = liveAssistantText;
    }
    scrollVoiceTranscript(box);

    if (assistantSilenceTimer) clearTimeout(assistantSilenceTimer);
    assistantSilenceTimer = setTimeout(() => {
      finalizeLiveAssistant();
    }, 2200);

    if (final && liveAssistantText.trim()) {
      finalizeLiveAssistant();
    }
  }
}

function finalizeLiveUser() {
  if (liveUserBubble && liveUserText.trim()) {
    commitVoiceHistory("user", liveUserText.trim());
    liveUserBubble.id = "vmsg-" + Date.now();
  }
  liveUserBubble = null;
  liveUserText = "";
}

function finalizeLiveAssistant() {
  if (assistantSilenceTimer) {
    clearTimeout(assistantSilenceTimer);
    assistantSilenceTimer = null;
  }
  if (liveAssistantBubble && liveAssistantText.trim()) {
    commitVoiceHistory("assistant", liveAssistantText.trim());
    liveAssistantBubble.id = "vmsg-" + Date.now();
  }
  liveAssistantBubble = null;
  liveAssistantText = "";
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    finalizeLiveAssistant();
    finalizeLiveUser();
  });
}

function commitVoiceHistory(role, text) {
  if (!text?.trim()) return;
  const history = loadVoiceHistory();
  history.push({
    id: "vmsg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    role,
    text: text.trim(),
    time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  });
  saveVoiceHistory(history);

  if (role === "user") {
    const fact = parseExplicitMemory(text);
    if (fact) {
      document.dispatchEvent(new CustomEvent("rhema-memory-updated"));
    }
  }
}

function syncVoiceInteractionMemory() {
  const history = loadVoiceHistory().slice(-10);
  if (!history.length) return;
  syncLocalSessionMemory(
    localStorage,
    VOICE_MEMORY_SESSION,
    t("voice.memory.sessionTitle"),
    history.map((h) => ({ role: h.role, text: h.text })),
  );
  document.dispatchEvent(new CustomEvent("rhema-memory-updated"));
}

/** Sapaan Shalom hanya untuk tap orb / tab Rhema AI — bukan tombol Dengar/Jelaskan. */
let pendingOrbGreeting = false;
let voiceStartPending = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let orbGreetingTimer = null;

function cancelOrbGreeting() {
  pendingOrbGreeting = false;
  if (orbGreetingTimer) {
    clearTimeout(orbGreetingTimer);
    orbGreetingTimer = null;
  }
}

/** Siapkan prompt suara dari tombol tab lain — batalkan sapaan Shalom yang tertunda. */
function prepareVoiceUserPrompt() {
  cancelOrbGreeting();
  window.__rhemaVoiceUserPromptPending = true;
  window.__rhemaInlineVoiceUntil = 0;
  window.__rhemaInlineVoiceSession = false;
}

function stopVoiceLive(transport) {
  voiceStartPending = false;
  cancelOrbGreeting();
  window.__rhemaVoiceUserPromptPending = false;
  window.__rhemaInlineVoiceUntil = 0;
  window.__rhemaInlineVoiceSession = false;
  forceStopAmbientAndSpeech();
  stopAllRenunganInlineSessions();
  try {
    transport.voice?.stop?.();
  } catch {
    /* ignore */
  }
  document.dispatchEvent(new CustomEvent("rhema-audio-stop-all", { detail: { forceAmbientStop: true } }));
  setVoiceTapLabel("idle");
  setAlkitabHint(t("voice.hint.idle"));
  document.getElementById("btn-alkitab-voice")?.classList.remove("live", "connecting", "voice-capturing");
}

function startVoiceLive(transport, { switchScreen = true } = {}) {
  // Percakapan Live eksplisit — jangan biarkan sesi Saat Teduh / renungan inline hijack voice.
  const hadInlineSession = anyInlineRenunganSessionActive();
  if (hadInlineSession) {
    stopAllRenunganInlineSessions();
  }
  window.__rhemaInlineVoiceUntil = 0;
  window.__rhemaInlineVoiceSession = false;
  window.__rhemaDevotionSilentPhase = false;
  window.__rhemaVoiceUserPromptPending = false;

  transport.voiceProfile = "alkitab-voice";
  if (hadInlineSession && transport.voice?.isActive?.()) {
    try {
      transport.voice.stop?.();
    } catch {
      /* ignore */
    }
  }
  if (transport.voice?.isActive?.() || voiceStartPending) return;
  if (switchScreen) goToRhemaVoice({ force: isHomeScreenActive() });
  pendingOrbGreeting = true;
  markSermonEnded();
  try {
    localStorage.setItem("rhema-persona-id", "pastor");
  } catch {
    /* private mode */
  }
    if (!googleKeyConfigured()) {
    setVoiceTapLabel("error", "API key belum diset");
    setAlkitabHint(t("voice.hint.byok"));
    openByokOnboarding({ startStep: 4 });
    pendingOrbGreeting = false;
    return;
  }
  if (!transport.voice?.start) {
    setAlkitabHint(t("voice.hint.moduleNotReady"));
    pendingOrbGreeting = false;
    return;
  }
  setVoiceTapLabel("connecting");
  voiceStartPending = true;
  unlockNativeElementAudio();
  void warmupNativePlayback();
  void import("./nativeMicPermission.js").then((m) => m.warmupNativeMicPermission?.());

  const connectLive = () => {
    if (!voiceStartPending) return;
    setAlkitabHint(t("voice.hint.connecting"));
    transport.voice.start({ mic: true });
  };

  if (isGoogleKeyLiveValidated()) {
    connectLive();
    return;
  }

  setAlkitabHint(t("voice.hint.checkingKey"));
  void validateGoogleKeyForVoice().then((check) => {
    if (!transport.voice) voiceStartPending = false;
    if (!check.ok) {
      voiceStartPending = false;
      pendingOrbGreeting = false;
      setVoiceTapLabel("error", "API key tidak valid");
      setAlkitabHint(formatVoiceError(check.error) || t("byok.error.invalidVoice"));
      openByokOnboarding({ startStep: 4 });
      return;
    }
    connectLive();
  });
}

function refreshHomePillarHighlight() {
  const last = localStorage.getItem(HOME_PILLAR_KEY) || "";
  document.querySelectorAll(".beranda-pillar[data-pillar]").forEach((el) => {
    el.classList.toggle("beranda-pillar--active", el.dataset.pillar === last);
  });
}

function markHomePillar(pillar) {
  if (!pillar) return;
  localStorage.setItem(HOME_PILLAR_KEY, pillar);
  refreshHomePillarHighlight();
}

export async function loadHome() {
  refreshHomeGreeting();
  refreshHomePillarHighlight();
  try {
    const { syncNativeStreakToLocal } = await import("./quizNativeStore.js");
    await syncNativeStreakToLocal();
  } catch {
    /* web-only */
  }
  renderHomeStreakMini();
  renderRecentList();
  try { renderDailyBibleQuiz(); } catch (e) { console.warn("[rhema] renderDailyBibleQuiz:", e); }
  openHomeQuizSection();
  await renderHomeTodayVerse();
  await refreshHomeEmbedBadge();
}

function scrollToHomeQuiz() {
  openHomeQuizSection();
  scrollMobileSectionIntoView("home-quiz-section");
  try { renderDailyBibleQuiz(); } catch (e) { console.warn("[rhema] renderDailyBibleQuiz:", e); }
}

export async function loadDoa() {
  try {
    renderPrayerJournal();
  } catch (err) {
    console.warn("[rhema] loadDoa renderPrayerJournal:", err);
  }
}

function resolveAlkitabProgramSubtab() {
  const hash = (location.hash || "").replace(/^#/, "");
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get("program");
  if (fromQuery === "quiz") return "quiz";
  if (fromQuery === "plans") return "plans";
  if (hash === "quiz" || hash === "home-quiz") return "quiz";
  if (hash.startsWith("alkitab-")) {
    const sub = hash.slice("alkitab-".length);
    if (sub === "quiz") return "quiz";
    if (sub === "plans") return "plans";
  }
  return null;
}

export async function loadAlkitabProgram() {
  const subtab = resolveAlkitabProgramSubtab();
  if (subtab === "quiz") {
    navigate("home");
    scrollToHomeQuiz();
    return;
  }
  renderAlkitabProgramShell();
  if (subtab === "plans") switchAlkitabProgramSubTab("plans");
}

export async function loadRenungan() {
  renderRenunganShell();
  const card = document.getElementById("renungan-today-card");
  if (card) {
    card.innerHTML = `<p class="alkitab-loading">Menyusun saat teduh hari ini…</p>`;
  }
  try {
    const devotion = await getTodayAIDevotion();
    renderDevotionCard(devotion, {
      onOpen: () => devotion?.verse?.reference && void openVerse(devotion.verse.reference),
      onExplain: () => {
        if (!devotion?.verse?.reference) return;
        askVoice(`Jelaskan renungan firman mengenai: "${devotion.theme}" berdasarkan ayat ${devotion.verse.reference}`);
      },
    });
  } catch {
    renderDevotionCard(null);
  }
}

/** @param {string} screen */
export async function refreshActiveScreen(screen) {
  document.dispatchEvent(new CustomEvent("rhema-screen-refresh", { detail: { screen } }));

  switch (screen) {
    case "home":
      refreshHomeGreeting();
      await loadHome();
      break;
    case "alkitab":
      await loadAlkitabProgram();
      if (alkitabPowerCallbacks) {
        try {
          initAlkitabPowerFeatures(alkitabPowerCallbacks);
        } catch (err) {
          console.warn("[rhema] refresh alkitab mood:", err);
        }
      }
      break;
    case "renungan":
      await loadRenungan();
      break;
    case "doa":
      await loadDoa();
      break;
    case "voice":
      refreshVoiceTranscriptToTop();
      syncVoiceInteractionMemory();
      break;
    default:
      break;
  }

  document.querySelector(`#screen-${screen} .mobile-scroll`)?.scrollTo({ top: 0, behavior: "smooth" });
}

/** @param {import("../shared/chatCore.js").ChatTransport & { voice?: object }} transport */
/** @param {(name: string) => void} go */
export function initAlkitabPanel(transport, go) {
  shellGo = go;
  navigate = (screen) => {
    if (screen === "voice" && shouldBlockVoiceScreenNav()) return;
    if (screen === "alkitab" && shouldKeepVoiceOnCurrentScreen()) return;
    go(screen);
  };

  const input = document.getElementById("alkitab-input");
  const searchInput = document.getElementById("alkitab-search");
  const voiceOrb = document.getElementById("btn-alkitab-voice");

  renderAlkitabQuickRow();

  setVerseActionsState(false);
  syncKhotbahHubState(false);

  initVoiceTranscriptHistory();

  document.addEventListener("rhema-locale-changed", () => {
    applyLocaleBibleDefault();
  });

  document.addEventListener("rhema-locale-home-refresh", () => {
    void renderHomeTodayVerse();
    renderRecentList();
    void refreshHomeEmbedBadge();
  });

  document.addEventListener("rhema-alkitab-toast", (e) => {
    const msg = /** @type {CustomEvent<string>} */ (e).detail;
    if (msg) showAlkitabToast(String(msg));
  });

  function askVoiceFn(text, displayText, { stayOnScreen = false } = {}) {
    const t = text.trim();
    if (!t) return;

    unlockNativeElementAudio();

    if (!googleKeyConfigured()) {
      setAlkitabHint(t("voice.hint.byok"));
      setVoiceTapLabel("error", "API key belum diset");
      openByokOnboarding({ startStep: 4 });
      return;
    }

    prepareVoiceUserPrompt();

    if (!stayOnScreen) {
      goToRhemaVoice({ force: true });
    }
    pendingOrbGreeting = false;
    finalizeLiveAssistant();
    finalizeLiveUser();
    renderVoiceTranscriptBubble("user", displayText || t);
    commitVoiceHistory("user", displayText || t);
    if (input) input.value = "";

    const keepAmbient = Boolean(window.__rhemaNightPodAmbientActive);
    // Hentikan TTS/ambient saja — jangan reset AudioContext native sebelum sesi live mulai.
    document.dispatchEvent(
      new CustomEvent("rhema-audio-stop-all", { detail: { keepVoiceSession: true, keepAmbient } }),
    );
    void warmupNativePlayback();
    unlockNativeElementAudio();

    const local = handleVoiceLocalCommand(t, (msg) => transport.broadcast?.(msg), {
      userAlreadyShown: true,
    });
    if (local.handled) {
      suppressGeminiAssistantUntil = Date.now() + 12000;
      setAlkitabHint(t("voice.hint.done"));
      setVoiceTapLabel("active");
      return;
    }

    setAlkitabHint(t("voice.hint.connecting"));
    setVoiceTapLabel("active");
    transport.voiceProfile = "alkitab-voice";
    transport.voice?.sendTextOrStart?.(t, { mic: false, preferClientContent: false });
  }
  askVoice = askVoiceFn;
  window.__rhemaPrepareVoiceUserPrompt = prepareVoiceUserPrompt;

  try {
    initHomeWorship(transport, {
      go,
      askVoice: (text, displayText, opts) =>
        askVoiceFn(text, displayText, { stayOnScreen: true, ...opts }),
      openVerse,
      markInlineVoiceTap,
    });
  } catch (err) {
    console.warn("[rhema] initHomeWorship error:", err);
  }
  void loadDoa();

  document.getElementById("btn-alkitab-send")?.addEventListener("click", () => {
    askVoiceFn(input?.value || "");
  });
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askVoiceFn(input.value || "");
    }
  });

  document.getElementById("btn-voice-clear")?.addEventListener("click", () => {
    if (confirm(t("voice.transcript.clearConfirm"))) {
      saveVoiceHistory([]);
      liveAssistantBubble = null;
      liveAssistantText = "";
      liveUserBubble = null;
      liveUserText = "";
      const box = document.getElementById("voice-transcript");
      if (box) box.innerHTML = voiceEmptyStateHtml();
    }
  });

  wireRhemaVoiceHubButton("btn-alkitab-voice-hero", transport);

  window.__rhemaStartVoiceLive = () => {
    goToRhemaVoice({ force: true });
    startVoiceLive(transport, { switchScreen: false });
  };

  document.getElementById("btn-voice-composer-mic")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (voiceStartPending) return;
    const inlineActive = anyInlineRenunganSessionActive();
    if (transport.voice?.isActive?.() && !inlineActive) {
      transport.voice?.interruptPlayback?.();
      if (!transport.voice?.isMicActive?.()) {
        setAlkitabHint(t("voice.hint.interrupt"));
        void transport.voice.enableMic?.({ deferUntilIdle: false });
      } else {
        setAlkitabHint(t("voice.hint.liveSpeak"));
      }
      return;
    }
    startVoiceLive(transport, { switchScreen: false });
  });

  document.getElementById("btn-voice-composer-stop")?.addEventListener("click", (e) => {
    e.preventDefault();
    const voiceActive = transport.voice?.isActive?.() || voiceStartPending;
    const inlineActive = anyInlineRenunganSessionActive();
    if (!voiceActive && !inlineActive) return;
    stopVoiceLive(transport);
  });

  bindNavVoiceLongPress(document.querySelector(".nav-item-voice"), transport);

  initVoiceSermonBar(askVoiceFn);
  initSermonLiveContinuer(transport);

  function shellGoVoice() {
    goToRhemaVoice({ force: true });
  }

  // Tiga pilar Beranda — Baca · Bicara · Berdoa
  document.getElementById("pillar-goto-read")?.addEventListener("click", () => {
    markHomePillar("read");
    navigate("alkitab");
  });
  document.getElementById("pillar-goto-speak")?.addEventListener("click", () => {
    markHomePillar("speak");
    goToRhemaVoice({ force: true });
  });
  document.getElementById("pillar-goto-pray")?.addEventListener("click", () => {
    markHomePillar("pray");
    navigate("renungan");
  });

  // Pintasan Bento Home — yang terkait ibadah dihubungkan ke Rhema AI Voice
  document.getElementById("btn-goto-renungan")?.addEventListener("click", () => navigate("renungan"));
  document.getElementById("home-streak-mini")?.addEventListener("click", () => navigate("renungan"));

  document.getElementById("bento-goto-plans")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("alkitab");
    requestAnimationFrame(() => {
      switchAlkitabProgramSubTab("plans");
    });
  });

  document.getElementById("bento-goto-pj")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("doa");
  });

  // Aksi Bento Ayat Hari Ini
  document.getElementById("btn-home-listen-today")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!todayRhemaVerse?.reference || !todayRhemaVerse.text) {
      setAlkitabHint(t("voice.hint.verseNotReady"));
      void renderHomeTodayVerse();
      return;
    }
    askVoiceFn(
      `Bacakan ayat hari ini dari ${todayRhemaVerse.reference}: "${todayRhemaVerse.text}" dan berikan berkat singkat.`,
      undefined,
      { stayOnScreen: true },
    );
    markTodayRead();
  });

  document.getElementById("btn-home-explain-today")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!todayRhemaVerse?.reference) {
      setAlkitabHint(t("voice.hint.verseNotReady"));
      void renderHomeTodayVerse();
      return;
    }
    askVoiceFn(`Penjelasan arti dari ayat ${todayRhemaVerse.reference}`, undefined, { stayOnScreen: true });
  });

  document.getElementById("btn-home-open-today")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!todayRhemaVerse?.reference) {
      setAlkitabHint(t("voice.hint.verseNotReady"));
      void renderHomeTodayVerse();
      return;
    }
    navigate("alkitab");
    void openVerse(todayRhemaVerse.reference);
  });

  document.getElementById("btn-alkitab-search")?.addEventListener("click", () => {
    const q = searchInput?.value?.trim();
    if (q) void handleAlkitabSearchInput(q);
  });
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (q) void handleAlkitabSearchInput(q);
    }
  });

  document.querySelectorAll(".semantic-topic-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const query = chip.getAttribute("data-query");
      const ref = chip.getAttribute("data-ref");
      void runSemanticTopicSearch(query, ref);
    });
  });

  void initAlkitabSearchHistory();
  renderSearchModeSelector(document.getElementById("alkitab-search-mode"));

  const listenBtn = document.getElementById("btn-alkitab-listen");
  listenBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentVerse?.reference || !currentVerse.text) return;
    askVoiceFn(`Bacakan firman dari ${currentVerse.reference}: "${currentVerse.text}". Berikan berkat dan renungan singkat.`, undefined, { stayOnScreen: true });
    markTodayRead();
  });

  function handleShareVerseClick(e) {
    if (!currentVerse?.reference || !currentVerse?.text) {
      setAlkitabHint(t("voice.hint.openVerseFirst"));
      return;
    }
    try {
      const opened = openVerseShareModal(currentVerse);
      if (!opened) setAlkitabHint(t("voice.hint.studioFail"));
    } catch (err) {
      console.error("[rhema] openVerseShareModal error:", err);
      setAlkitabHint(t("voice.hint.studioFail"));
    }
  }

  document.getElementById("btn-alkitab-share-image")?.addEventListener("click", handleShareVerseClick);

  document.getElementById("btn-alkitab-explain")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentVerse?.reference) return;
    askVoiceFn(`Penjelasan arti dari ayat ${currentVerse.reference}`, undefined, { stayOnScreen: true });
  });

  // Inisialisasi fitur unggulan Alkitab (Mood Scripture)
  alkitabPowerCallbacks = {
    onOpenVerse: (ref) => void openVerse(ref),
    onAskVoice: (prompt, displayText, opts) => {
      askVoiceFn(prompt, displayText, { stayOnScreen: true, ...opts });
    },
  };
  try {
    initAlkitabPowerFeatures(alkitabPowerCallbacks);
  } catch (err) {
    console.warn("[rhema-ai] initAlkitabPowerFeatures error:", err);
  }
  wireAlkitabKhotbahHub(askVoiceFn);

  // Tombol Lectio Divina 4 Langkah
  document.getElementById("btn-alkitab-lectio")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentVerse?.reference || !currentVerse.text) return;
    openLectioDivinaModal(currentVerse, {
      autoStart: true,
      waitPlaybackIdle: async () => {
        const idle = transport.voice?.waitForPlaybackIdle?.(120_000);
        if (!idle) return;
        await Promise.race([idle.catch(() => {}), new Promise((r) => setTimeout(r, 120_500))]);
      },
      onStartVoiceLectio: (persona, step) => {
        const labels = { 1: "Silencio", 2: "Lectio", 3: "Meditatio", 4: "Oratio" };
        const prompt = buildLectioVoicePrompt(currentVerse, step, persona);
        window.__rhemaInlineVoiceUntil = Date.now() + 12 * 60 * 1000;
        askVoiceFn(prompt, `🧘 Lectio Divina · ${labels[step] || step}`, { stayOnScreen: true });
      },
    });
  });

  transport.onMessage?.((msg) => {
    const m = /** @type {{type?:string,reference?:string,text?:string,found?:boolean,status?:string,profile?:string,detail?:string,role?:string,delta?:string,final?:boolean}} */ (msg);

    if (m.type === "voiceVerseLookup") {
      if (isSermonModeActive() || shouldKeepVoiceOnCurrentScreen()) {
        if (m.found !== false && m.text) {
          renderVoiceTranscriptBubble("assistant", `${m.reference}: "${m.text}"`);
        }
        if (isSermonModeActive()) {
          setAlkitabHint(t("voice.hint.sermonMode"));
        }
      } else {
        renderVerseCard(m.reference || "", m.text || "", m.found !== false);
        navigate("alkitab");
      }
    }

    if (m.type === "voiceHymnLookup" && m.id && m.found !== false) {
      loadHymn(m.id).then((hymn) => {
        if (hymn?.lyrics) {
          askVoiceFn(
            `Bacakan kidung ${hymn.book} ${hymn.no} — ${hymn.title}. Ucapkan liriknya baris demi baris dengan tenang: "${hymn.lyrics.slice(0, 400)}"`,
          );
        }
      });
    }

    if (m.type === "voiceTranscript") {
      handleVoiceTranscriptStream(
        m.role === "user" ? "user" : "assistant",
        m.delta || "",
        !!m.final,
        /** @type {string} */ (m.moduleId || ""),
      );
    }

    if (m.type === "voiceLocalQueryHandled") {
      suppressGeminiAssistantUntil = Date.now() + 12000;
      finalizeLiveAssistant();
    }

    if (m.type === "voiceInterrupt") {
      finalizeLiveAssistant();
      finalizeLiveUser();
    }

    if (m.type === "voiceTurnComplete") {
      finalizeLiveAssistant();
      syncVoiceInteractionMemory();
      window.__rhemaVoiceUserPromptPending = false;
      if (isLectioSessionActive()) {
        void onLectioVoiceTurnComplete();
      }
    }

    if (m.type === "voiceMicStatus") {
      if (m.active) {
        setAlkitabHint(t("voice.hint.liveMicActive"));
      } else if (m.detail) {
        setAlkitabHint(String(m.detail));
      }
    }

    if (m.type === "voiceStatus") {
      voiceOrb?.classList.toggle("live", m.status === "live" || m.status === "connecting");
      voiceOrb?.classList.toggle("connecting", m.status === "connecting");
      if (m.status === "live" && m.profile === "alkitab-voice") {
        voiceStartPending = false;
        setVoiceTapLabel("active");
        if (pendingOrbGreeting && !window.__rhemaVoiceUserPromptPending) {
          pendingOrbGreeting = false;
          const resume = hasVoiceConversationHistory();
          orbGreetingTimer = setTimeout(() => {
            orbGreetingTimer = null;
            if (!window.__rhemaVoiceUserPromptPending) {
              if (resume) deliverVoiceResumeContext(transport);
              else deliverVoiceOpenGreeting(transport);
            }
          }, resume ? 350 : 900);
          setAlkitabHint(resume ? t("voice.hint.resume") : t("voice.hint.greeting"));
        } else if (isSermonModeActive()) {
          setAlkitabHint(t("voice.hint.sermonExposition"));
        } else {
          setAlkitabHint(t("voice.hint.listenFirst"));
        }
      } else if (m.status === "off") {
        voiceStartPending = false;
        window.__rhemaInlineVoiceUntil = 0;
        window.__rhemaInlineVoiceSession = false;
        window.__rhemaVoiceUserPromptPending = false;
        cancelOrbGreeting();
        finalizeLiveAssistant();
        finalizeLiveUser();
        setVoiceTapLabel("idle");
        setAlkitabHint(t("voice.hint.idle"));
        voiceOrb?.classList.remove("live", "connecting", "voice-capturing");
      } else if (m.status === "error") {
        voiceStartPending = false;
        cancelOrbGreeting();
        const detail = formatVoiceError(m.detail) || m.detail || t("voice.hint.sessionError");
        setVoiceTapLabel("error", detail);
        setAlkitabHint(detail);
        voiceOrb?.classList.remove("live", "connecting", "voice-capturing");
      } else if (m.status === "connecting") {
        voiceStartPending = true;
        setVoiceTapLabel("connecting");
        setAlkitabHint(m.detail || t("voice.hint.connecting"));
      }
    }
  });

  document.addEventListener("rhema-locale-ui-applied", () => {
    refreshVoiceLocaleUi(transport);
  });

  void loadHome();
  void loadRenungan();
  void loadAlkitabProgram();

  return { loadHome, loadRenungan, loadDoa, loadAlkitabProgram, openVerse };
}
