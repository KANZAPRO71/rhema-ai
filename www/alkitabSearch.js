/**
 * Pencarian semantic TB — tema, TF-IDF, anchor/full embedding via API.
 */
import { escapeAttr, escapeHtml } from "./markdown.js";
import { apiUrl } from "./platform.js";

const SEARCH_MODE_KEY = "rhema-alkitab-search-mode";
const SEARCH_HISTORY_KEY = "rhema-alkitab-search-history";
const MAX_SEARCH_HISTORY = 8;

/** @returns {"auto"|"anchor"|"full"} */
export function getSearchMode() {
  try {
    const m = localStorage.getItem(SEARCH_MODE_KEY);
    if (m === "anchor" || m === "full" || m === "auto") return m;
  } catch {
    /* private mode */
  }
  return "auto";
}

/** @param {"auto"|"anchor"|"full"} mode */
export function setSearchMode(mode) {
  try {
    localStorage.setItem(SEARCH_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/**
 * @param {HTMLElement | null} container
 * @param {{ onChange?: () => void }} [opts]
 */
export function renderSearchModeSelector(container, opts = {}) {
  if (!container) return;
  const current = getSearchMode();
  container.innerHTML = `
    <div class="search-mode-row">
      <span class="search-mode-label">Mode pencarian</span>
      <div class="search-mode-chips" role="group" aria-label="Mode pencarian semantik">
        <button type="button" class="search-mode-chip ${current === "auto" ? "active" : ""}" data-mode="auto">Otomatis</button>
        <button type="button" class="search-mode-chip ${current === "anchor" ? "active" : ""}" data-mode="anchor">Cepat</button>
        <button type="button" class="search-mode-chip ${current === "full" ? "active" : ""}" data-mode="full">Mendalam</button>
      </div>
    </div>`;
  container.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      if (mode === "auto" || mode === "anchor" || mode === "full") {
        setSearchMode(mode);
        renderSearchModeSelector(container, opts);
        opts.onChange?.();
      }
    });
  });
}

/** @param {string} query */
export function pushSearchHistory(query) {
  const q = (query || "").trim();
  if (!q || q.length < 2) return;
  try {
    const list = getSearchHistory().filter((x) => x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(list.slice(0, MAX_SEARCH_HISTORY)));
  } catch {
    /* private mode */
  }
}

/** @returns {string[]} */
export function getSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * @param {HTMLElement | null} container
 * @param {(q: string) => void} onPick
 */
export function renderSearchHistory(container, onPick) {
  if (!container) return;
  const items = getSearchHistory();
  if (!items.length) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  container.classList.remove("hidden");
  container.innerHTML = items
    .map(
      (q) =>
        `<button type="button" class="alkitab-quick-btn search-history-chip" data-q="${escapeAttr(q)}" title="Terakhir dicari">${escapeHtml(q)}</button>`,
    )
    .join("");
  container.querySelectorAll("[data-q]").forEach((btn) => {
    btn.addEventListener("click", () => onPick(btn.getAttribute("data-q") || ""));
  });
}

/** @returns {Promise<{ fullReady: boolean, fullCount: number, fullTotal: number, fullComplete: boolean, anchorReady: boolean }>} */
export async function fetchTbSearchStatus() {
  try {
    const res = await fetch(apiUrl("/api/rhema/knowledge"));
    if (!res.ok) throw new Error("status");
    const data = await res.json();
    const full = data.tbFullEmbed ?? {};
    const count = Number(full.loadedCount ?? full.embeddedCount ?? 0);
    const total = Number(full.totalVerses ?? 0);
    return {
      fullReady: Boolean(full.ready),
      fullCount: count,
      fullTotal: total,
      fullComplete: Boolean(full.complete || full.nearlyComplete),
      anchorReady: Boolean(data.tbEmbedCache?.ready),
    };
  } catch {
    return { fullReady: false, fullCount: 0, fullTotal: 0, fullComplete: false, anchorReady: false };
  }
}

/** @param {string} q */
export function looksLikeVerseQuery(q) {
  const t = (q || "").trim();
  if (!t) return false;
  if (/\d+\s*:\s*\d+/.test(t)) return true;
  if (/\d+\s*-\s*\d+/.test(t)) return true;
  if (
    /^(mazmur|ms|yohanes|yo|1\s*yohanes|2\s*yohanes|3\s*yohanes|roma|rm|matius|mt|markus|mr|lukas|lk|filipi|fl|efesus|ef|ibrani|ibr|amsal|ams|kejadian|kej|yesaya|yes|ulangan|ul)\b/i.test(
      t,
    ) &&
    /\d/.test(t)
  ) {
    return true;
  }
  return false;
}

/**
 * @param {string} query
 * @param {{ limit?: number, mode?: string, anchor?: boolean, rerank?: boolean }} [opts]
 */
export async function searchTbBrowser(query, opts = {}) {
  const mode = opts.mode ?? getSearchMode();
  const params = new URLSearchParams();
  params.set("q", query.trim());
  params.set("limit", String(opts.limit ?? 12));
  params.set("anchor", mode === "anchor" || mode === "auto" ? "1" : "0");
  params.set("mode", mode === "full" ? "full" : mode === "anchor" ? "default" : "auto");
  if (opts.rerank || mode === "full") params.set("rerank", "1");

  const res = await fetch(apiUrl(`/api/alkitab/search?${params.toString()}`));
  if (!res.ok) throw new Error(`Search gagal (${res.status})`);
  return res.json();
}

/** @param {object} result */
export function normalizeSearchResult(result) {
  if (!result || typeof result !== "object") {
    return { query: "", verses: [], themes: [], semantic: [] };
  }
  const hits = Array.isArray(result.hits) ? result.hits : [];
  const verses =
    Array.isArray(result.verses) && result.verses.length
      ? result.verses
      : hits.map((h) => ({
          reference: h.reference,
          text: h.verse?.text || h.preview || "",
          score: h.score,
        }));

  const semantic = result.fullSemantic?.length
    ? result.fullSemantic
    : result.anchorSemantic?.length
      ? result.anchorSemantic
      : Array.isArray(result.semantic) && result.semantic.length
        ? result.semantic
        : [];

  return {
    ...result,
    verses,
    semantic,
    themes: result.themes ?? [],
  };
}

/**
 * @param {HTMLElement | null} container
 * @param {object} result
 * @param {{ onSelect: (ref: string) => void, emptyHint?: string }} handlers
 */
export function renderAlkitabSearchResults(container, result, handlers) {
  if (!container) return;
  const normalized = normalizeSearchResult(result);
  const verses = normalized.verses ?? [];
  const themes = normalized.themes ?? [];
  const semantic = normalized.semantic ?? [];
  const modeBadge = normalized.fullEmbedReady
    ? "Semantic penuh"
    : normalized.reranked
      ? "Rerank ONNX"
      : normalized.embedCacheReady
        ? "Anchor cache"
        : normalized.indexReady
          ? "TF-IDF"
          : normalized.mode === "semantic"
            ? "Indeks Alkitab"
            : "";
  const note = normalized.note ?? "";

  if (!verses.length && !themes.length && !semantic.length) {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="search-results-head">
        <span class="search-results-title">Hasil pencarian</span>
        <button type="button" class="btn-search-close" id="btn-close-search-results" aria-label="Tutup">✕</button>
      </div>
      <p class="search-results-empty">${handlers.emptyHint || `Tidak ada ayat untuk <strong>${escapeHtml(normalized.query)}</strong>.`}</p>
    `;
    container.querySelector("#btn-close-search-results")?.addEventListener("click", () => hideSearchResults(container));
    return;
  }

  const themeHtml = themes.length
    ? `<div class="search-theme-block">
        <span class="search-section-label">Tema pastoral</span>
        <ul class="search-theme-list">
          ${themes
            .map(
              (t) =>
                `<li><strong>${escapeHtml(t.label)}</strong> — ${t.refs
                  .slice(0, 4)
                  .map((r) => `<button type="button" class="search-ref-link" data-ref="${escapeAttr(r)}">${escapeHtml(r)}</button>`)
                  .join(" · ")}</li>`,
            )
            .join("")}
        </ul>
      </div>`
    : "";

  const semanticHtml = semantic.length
    ? `<div class="search-semantic-block">
        <span class="search-section-label">Semantic</span>
        <ul class="search-semantic-list">
          ${semantic
            .slice(0, 6)
            .map(
              (h) =>
                `<li><button type="button" class="search-verse-btn" data-ref="${escapeAttr(h.reference)}">
                  <span class="search-verse-ref">${escapeHtml(h.reference)}</span>
                  <span class="search-verse-preview">${escapeHtml(h.preview || h.verse?.text?.slice(0, 80) || "")}${(h.preview || h.verse?.text || "").length > 80 ? "…" : ""}</span>
                </button></li>`,
            )
            .join("")}
        </ul>
      </div>`
    : "";

  const verseHtml = verses.length
    ? `<ul class="search-verse-list">
        ${verses
          .map(
            (v) =>
              `<li><button type="button" class="search-verse-btn" data-ref="${escapeAttr(v.reference)}">
                <span class="search-verse-ref">${escapeHtml(v.reference)}</span>
                <span class="search-verse-preview">${escapeHtml((v.text || "").slice(0, 100))}${(v.text || "").length > 100 ? "…" : ""}</span>
              </button></li>`,
          )
          .join("")}
      </ul>`
    : "";

  container.classList.remove("hidden");
  container.innerHTML = `
    <div class="search-results-head">
      <span class="search-results-title">Hasil: ${escapeHtml(normalized.query)}</span>
      <button type="button" class="btn-search-close" id="btn-close-search-results" aria-label="Tutup">✕</button>
    </div>
    ${note ? `<p class="search-results-note">${escapeHtml(note)}${modeBadge ? ` · <span class="search-mode-badge">${escapeHtml(modeBadge)}</span>` : ""}</p>` : modeBadge ? `<p class="search-results-note"><span class="search-mode-badge">${escapeHtml(modeBadge)}</span></p>` : ""}
    ${themeHtml}
    ${semanticHtml}
    ${verseHtml ? `<div class="search-verse-block"><span class="search-section-label">Ayat</span>${verseHtml}</div>` : ""}
  `;

  container.querySelector("#btn-close-search-results")?.addEventListener("click", () => hideSearchResults(container));

  container.querySelectorAll("[data-ref]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ref = btn.getAttribute("data-ref");
      if (ref) handlers.onSelect(ref);
    });
  });
}

/** @param {HTMLElement | null} container */
export function hideSearchResults(container) {
  if (!container) return;
  container.classList.add("hidden");
  container.innerHTML = "";
}

/** @param {HTMLElement | null} container */
export function showSearchLoading(container, query) {
  if (!container) return;
  container.classList.remove("hidden");
  container.innerHTML = `<p class="alkitab-loading search-loading">Mencari "${escapeHtml(query)}"…</p>`;
}
