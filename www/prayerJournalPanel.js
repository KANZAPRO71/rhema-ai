/**
 * Jurnal doa — daftar, filter, form tambah, doa bersama AI.
 */
import { escapeAttr, escapeHtml } from "./markdown.js";
import { PRAYER_CATEGORIES } from "./renunganData.js";
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
import { t } from "./uiStrings.js";

/** @type {{ askVoice?: (text: string) => void, markTodayRead?: () => void } | null} */
let journalBridge = null;
let currentPrayerFilter = "all";
/** @type {(() => void) | null} */
let syncPrayerCategoryPillFn = null;

/** @param {{ askVoice?: (text: string) => void, markTodayRead?: () => void }} bridge */
export function configurePrayerJournalPanel(bridge) {
  journalBridge = bridge;
}

export function syncPrayerCategoryPill() {
  syncPrayerCategoryPillFn?.();
}

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
          <button type="button" class="btn-pj-action btn-support-prayer" data-prayer-id="${escapeAttr(p.id)}">
            ${escapeHtml(t("prayer.prayWithAi"))} (${p.prayerCount || 1})
          </button>
          <button type="button" class="btn-pj-action btn-mark-answered" data-prayer-id="${escapeAttr(p.id)}">
            ${isAnswered ? escapeHtml(t("prayer.unmarkAnswered")) : escapeHtml(t("prayer.markAnswered"))}
          </button>
          <button type="button" class="btn-pj-action btn-delete-prayer" data-prayer-id="${escapeAttr(p.id)}">${escapeHtml(t("prayer.delete"))}</button>
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
      journalBridge?.askVoice?.(buildSinglePrayerVoicePrompt(item));
      journalBridge?.markTodayRead?.();
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

/**
 * Pasang filter, form, dan hook layar Doa — panggil sekali dari initHomeWorship.
 * @param {{ askVoice: (text: string) => void, markTodayRead: () => void }} api
 */
export function bindPrayerJournalScreen(api) {
  const doaScreen = document.getElementById("screen-doa");
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

    const syncPrayerCategoryPillLocal = () => {
      const value = catSelect?.value || "keluarga";
      const cat = PRAYER_CATEGORIES.find((c) => c.id === value) || PRAYER_CATEGORIES[0];
      const shortKey = `${cat.nameKey}.short`;
      const shortName = t(shortKey);
      if (catEmojiEl) catEmojiEl.textContent = cat.icon;
      if (catLabelEl) catLabelEl.textContent = shortName;
    };

    catSelect?.addEventListener("change", syncPrayerCategoryPillLocal);
    syncPrayerCategoryPillLocal();
    syncPrayerCategoryPillFn = syncPrayerCategoryPillLocal;

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
      api.markTodayRead();
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
}
