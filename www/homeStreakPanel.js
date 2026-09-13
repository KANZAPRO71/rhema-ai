/**
 * Streak baca harian — bar renungan & mini badge di beranda.
 */
import { todayKey } from "./dailyRenunganEngine.js";
import { STREAK_KEY } from "./homeWorshipData.js";
import { escapeHtml } from "./markdown.js";
import { t } from "./uiStrings.js";

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

/** Tandai hari ini sudah baca (streak). */
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

export function renderStreakBar() {
  const el = document.getElementById("renungan-streak-bar");
  if (!el) return;
  const streak = loadStreak();
  const count = streak.count || 0;
  const activeToday = streak.lastDate === todayKey();
  const isSplit = el.classList.contains("renungan-streak-split");

  if (isSplit) {
    el.innerHTML = `
      <div class="wellness-split-card wellness-split-card--streak">
        <span class="wellness-split-icon" aria-hidden="true">${count > 0 ? "🔥" : "✨"}</span>
        <p class="wellness-split-value">${count} ${escapeHtml(t("streak.days"))}</p>
        <p class="wellness-split-label">${escapeHtml(t("streak.consecutive"))}</p>
        <p class="wellness-split-hint">${activeToday ? escapeHtml(t("streak.doneToday")) : escapeHtml(t("streak.hintToday"))}</p>
      </div>`;
    return;
  }

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
          <span class="streak-label">${escapeHtml(t("streak.unitLong"))}</span>
        </div>
        <div class="streak-pct">${Math.min(count, 7)}/7</div>
      </div>
      <div class="streak-track" aria-hidden="true">
        <div class="streak-fill" style="width:${Math.min(100, (Math.min(count, 7) / 7) * 100)}%"></div>
      </div>
      <div class="streak-dots" aria-label="${escapeHtml(t("streak.progressAria"))}">${dots}</div>
      <p class="streak-hint">${activeToday ? escapeHtml(t("streak.doneTodayLong")) : escapeHtml(t("streak.hintLong"))}</p>
    </div>`;
}

export function renderHomeStreakMini() {
  const el = document.getElementById("home-streak-mini");
  if (!el) return;
  const streak = loadStreak();
  const count = streak.count || 0;
  el.innerHTML = `
    <span class="mini-streak-fire">${count > 0 ? "🔥" : "✨"}</span>
    <span class="mini-streak-text"><strong>${count}</strong> ${t("home.streak.unit")}</span>`;
}
