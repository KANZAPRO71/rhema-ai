/**
 * Rencana baca tematik + kartu Alkitab 1 Tahun (tab Program Alkitab).
 */
import {
  countOneYearCompleted,
  getCalendarPercent,
  getOneYearProgress,
  getTodayOneYearDay,
  toggleOneYearDayCompleted,
} from "./biblePlanData.js";
import { isGlobalUiLang } from "./localeProfile.js";
import { escapeAttr, escapeHtml } from "./markdown.js";
import { getLocalizedThematicPlans } from "./thematicPlanEngine.js";
import { t } from "./uiStrings.js";

const THEMATIC_PROGRESS_KEY = "rhema-thematic-progress";

/** @type {{ askVoice?: (text: string) => void, markTodayRead?: () => void } | null} */
let plansBridge = null;
let selectedThematicPlanId = null;

/** @param {{ askVoice?: (text: string) => void, markTodayRead?: () => void }} bridge */
export function configureThematicPlansPanel(bridge) {
  plansBridge = bridge;
}

function loadThematicProgress() {
  try {
    return JSON.parse(localStorage.getItem(THEMATIC_PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveThematicProgress(data) {
  localStorage.setItem(THEMATIC_PROGRESS_KEY, JSON.stringify(data));
}

/** @param {number} totalDays */
function formatPlanWeeks(totalDays) {
  const weeks = Math.ceil(totalDays / 7);
  if (isGlobalUiLang()) {
    return weeks <= 1 ? t("plans.week.one") : t("plans.week.many", { n: String(weeks) });
  }
  return weeks <= 1 ? "1 minggu" : `${weeks} minggu`;
}

/** @param {{ totalDays: number }} plan @param {number} doneCount */
function getThematicPlanStatus(plan, doneCount) {
  if (doneCount >= plan.totalDays) {
    return { label: t("plans.status.done"), tone: "done" };
  }
  if (doneCount > 0) {
    return {
      label: t("plans.status.active", { current: String(doneCount + 1), total: String(plan.totalDays) }),
      tone: "active",
    };
  }
  return { label: t("plans.status.new"), tone: "new" };
}

function toggleThematicDay(planId, day) {
  const progress = loadThematicProgress();
  if (!progress[planId]) progress[planId] = { completedDays: [] };
  const idx = progress[planId].completedDays.indexOf(day);
  if (idx >= 0) {
    progress[planId].completedDays.splice(idx, 1);
  } else {
    progress[planId].completedDays.push(day);
  }
  saveThematicProgress(progress);
}

function renderThematicPlanDetail(planId) {
  const detail = document.getElementById("thematic-plan-detail");
  const iconEl = document.getElementById("plan-detail-icon");
  const titleEl = document.getElementById("plan-detail-title");
  const subEl = document.getElementById("plan-detail-sub");
  const daysList = document.getElementById("plan-days-list");

  if (!detail || !daysList) return;
  const plan = getLocalizedThematicPlans().find((p) => p.id === planId);
  if (!plan) {
    detail.classList.add("hidden");
    return;
  }

  detail.classList.remove("hidden");
  if (iconEl) iconEl.textContent = plan.icon;
  if (titleEl) titleEl.textContent = plan.title;
  if (subEl) subEl.textContent = plan.subtitle;

  const progress = loadThematicProgress();
  const pData = progress[plan.id] || { completedDays: [] };
  const doneSet = new Set(pData.completedDays || []);
  const doneCount = doneSet.size;
  const pct = Math.round((doneCount / plan.totalDays) * 100);
  const isAllDone = doneCount >= plan.totalDays;
  const status = getThematicPlanStatus(plan, doneCount);

  const progressEl = document.getElementById("plan-detail-progress");
  if (progressEl) {
    progressEl.innerHTML = `
      <div class="plan-detail-stats">
        <div class="plan-detail-stat">
          <div class="plan-detail-stat-top">
            <span class="plan-detail-stat-label">${escapeHtml(t("plans.detail.progress"))}</span>
            <span class="plan-detail-stat-val">${escapeHtml(t("plans.detail.progressVal", { done: String(doneCount), total: String(plan.totalDays) }))}</span>
          </div>
          <div class="plan-detail-stat-bar">
            <div class="plan-detail-stat-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="plan-detail-stat">
          <div class="plan-detail-stat-top">
            <span class="plan-detail-stat-label">${escapeHtml(t("plans.detail.duration"))}</span>
            <span class="plan-detail-stat-val">${formatPlanWeeks(plan.totalDays)}</span>
          </div>
          <span class="plan-detail-status plan-detail-status--${status.tone}">${escapeHtml(status.label)}</span>
        </div>
      </div>
    `;
  }

  const currentUnfinishedDay = plan.days.find((d) => !doneSet.has(d.day)) || plan.days[0];

  const headerBannerHtml = isAllDone
    ? `
      <div class="plan-completion-banner glass-card glow">
        <span class="completion-trophy">🏆</span>
        <div class="completion-meta">
          <h4 class="completion-title">${escapeHtml(t("plans.detail.completeTitle"))}</h4>
          <p class="completion-desc">${escapeHtml(t("plans.detail.completeDesc", { title: plan.title }))}</p>
          <button type="button" class="btn-pill btn-soft btn-restart-plan" data-plan-id="${escapeAttr(plan.id)}">${escapeHtml(t("plans.detail.restart"))}</button>
        </div>
      </div>
    `
    : `
      <div class="plan-hero-action glass-card">
        <div class="hero-action-meta">
          <span class="hero-badge">${escapeHtml(t("plans.detail.todayBadge"))}</span>
          <h4 class="hero-day-title">${escapeHtml(t("plans.detail.dayTitle", { n: String(currentUnfinishedDay.day), title: currentUnfinishedDay.title }))}</h4>
          <p class="hero-day-ref">${escapeHtml(currentUnfinishedDay.ref)} · ${escapeHtml(currentUnfinishedDay.desc)}</p>
        </div>
        <div class="hero-action-buttons">
          <button type="button" class="btn-pill primary full glow btn-hero-start-day" data-ref="${escapeHtml(currentUnfinishedDay.ref)}" data-title="${escapeHtml(currentUnfinishedDay.title)}" data-desc="${escapeHtml(currentUnfinishedDay.desc)}" data-day="${currentUnfinishedDay.day}">
            ${escapeHtml(t("plans.detail.startBtn"))}
          </button>
        </div>
      </div>
    `;

  daysList.innerHTML = `
    ${headerBannerHtml}
    <div class="plan-days-container">
      ${plan.days
        .map((d) => {
          const isDone = doneSet.has(d.day);
          const isToday = !isAllDone && d.day === currentUnfinishedDay.day;
          return `
          <div class="thematic-day-item ${isDone ? "done" : ""} ${isToday ? "active-today" : ""}">
            <button type="button" class="btn-check-day ${isDone ? "checked" : ""}" data-plan-id="${escapeAttr(plan.id)}" data-day="${d.day}" title="${escapeHtml(isDone ? t("plans.detail.markUndone") : t("plans.detail.markDone"))}">
              ${isDone ? "✓" : d.day}
            </button>
            <div class="thematic-day-info">
              <div class="thematic-day-top">
                <div class="thematic-title-wrap">
                  ${isToday ? `<span class="badge-today-mini">${escapeHtml(t("plans.detail.todayMini"))}</span>` : ""}
                  <span class="thematic-day-label">${escapeHtml(t("plans.detail.dayTitle", { n: String(d.day), title: d.title }))}</span>
                </div>
                <button type="button" class="thematic-day-ref" data-ref="${escapeHtml(d.ref)}">${escapeHtml(d.ref)} ↗</button>
              </div>
              <p class="thematic-day-desc">${escapeHtml(d.desc)}</p>
              <div class="thematic-day-actions">
                <button type="button" class="btn-day-micro btn-day-open" data-ref="${escapeHtml(d.ref)}">${escapeHtml(t("plans.detail.openVerse"))}</button>
                <button type="button" class="btn-day-micro btn-day-listen" data-ref="${escapeHtml(d.ref)}" data-title="${escapeHtml(d.title)}" data-desc="${escapeHtml(d.desc)}">${escapeHtml(t("plans.detail.listen"))}</button>
              </div>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;

  daysList.querySelector(".btn-hero-start-day")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = /** @type {HTMLElement} */ (e.currentTarget);
    const ref = btn.getAttribute("data-ref") || "";
    const title = btn.getAttribute("data-title") || "";
    const desc = btn.getAttribute("data-desc") || "";
    const day = Number(btn.getAttribute("data-day") || 1);

    if (plansBridge?.askVoice) {
      plansBridge.askVoice(
        isGlobalUiLang()
          ? `Read day ${day} of "${plan.title}": ${title} (${ref}). ${desc}. Let's reflect on its meaning and lead a brief prayer.`
          : `Bacakan rencana baca hari ke-${day} dari "${plan.title}": ${title} (${ref}). ${desc}. Mari kita renungkan maknanya dan pimpin doa singkat.`,
      );
    }
    toggleThematicDay(plan.id, day);
    renderThematicPlans();
    renderThematicPlanDetail(plan.id);
    plansBridge?.markTodayRead?.();
  });

  daysList.querySelector(".btn-restart-plan")?.addEventListener("click", () => {
    if (confirm(t("plans.detail.restartConfirm"))) {
      const prog = loadThematicProgress();
      delete prog[plan.id];
      saveThematicProgress(prog);
      renderThematicPlans();
      renderThematicPlanDetail(plan.id);
    }
  });

  daysList.querySelectorAll(".btn-check-day").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pId = btn.getAttribute("data-plan-id");
      const dNum = Number(btn.getAttribute("data-day"));
      toggleThematicDay(pId, dNum);
      renderThematicPlans();
      renderThematicPlanDetail(pId);
      plansBridge?.markTodayRead?.();
    });
  });

  daysList.querySelectorAll(".thematic-day-ref, .btn-day-open").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ref = btn.getAttribute("data-ref");
      if (ref) {
        document.dispatchEvent(new CustomEvent("rhema-open-verse", { detail: ref }));
      }
    });
  });

  daysList.querySelectorAll(".btn-day-listen").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ref = btn.getAttribute("data-ref") || "";
      const title = btn.getAttribute("data-title") || "";
      const desc = btn.getAttribute("data-desc") || "";
      if (plansBridge?.askVoice) {
        plansBridge.askVoice(
          isGlobalUiLang()
            ? `Read Scripture from ${ref}: "${title}". ${desc}. Offer a brief reflection and blessing.`
            : `Bacakan firman dari ${ref}: "${title}". ${desc}. Berikan renungan dan berkat.`,
        );
      }
      plansBridge?.markTodayRead?.();
    });
  });
}

export function renderThematicPlans() {
  const plans = getLocalizedThematicPlans();
  const oneYearCard = document.getElementById("one-year-bible-card");
  const plansSummaryEl = document.getElementById("reading-plans-summary");
  const { year, dayOfYear, plan, totalDays } = getTodayOneYearDay();
  const oyProgress = getOneYearProgress();
  const oyDoneCount = countOneYearCompleted(year);
  const thematicProgress = loadThematicProgress();
  const thematicActive = plans.filter((p) => {
    const done = thematicProgress[p.id]?.completedDays?.length || 0;
    return done > 0 && done < p.totalDays;
  }).length;

  if (plansSummaryEl) {
    plansSummaryEl.innerHTML = `
      <span class="reading-plans-chip">${escapeHtml(t("plans.oneYear.chip"))}</span>
      <span class="reading-plans-chip">${escapeHtml(t("plans.thematic.count", { n: String(plans.length) }))}</span>
      <span class="reading-plans-chip reading-plans-chip--year">${escapeHtml(t("plans.dayYear", { day: String(dayOfYear), year: String(year) }))}</span>
      ${oyDoneCount ? `<span class="reading-plans-chip reading-plans-chip--read">${escapeHtml(t("plans.readProgress", { done: String(oyDoneCount), total: String(totalDays) }))}</span>` : ""}
      ${thematicActive ? `<span class="reading-plans-chip reading-plans-chip--active">${escapeHtml(t("plans.thematic.active", { n: String(thematicActive) }))}</span>` : ""}
    `;
  }

  if (oneYearCard) {
    const isDone = !!oyProgress.completed[String(dayOfYear)];
    const doneCount = oyDoneCount;
    const readPct = Math.round((doneCount / totalDays) * 100);
    const calPct = getCalendarPercent(dayOfYear);

    oneYearCard.innerHTML = `
      <div class="oy-split-card">
        <div class="oy-split-left">
          <div class="oy-progress-ring" style="--oy-pct:${readPct}" role="progressbar" aria-valuenow="${readPct}" aria-valuemin="0" aria-valuemax="100">
            <span class="oy-ring-inner">
              <strong>${doneCount}</strong>
              <small>/${totalDays}</small>
            </span>
          </div>
          <p class="oy-split-kicker">${escapeHtml(t("plans.oneYear.kicker", { year: String(year) }))}</p>
          <p class="oy-split-day">${escapeHtml(t("plans.oneYear.day", { n: String(dayOfYear) }))}</p>
          <p class="oy-split-cal">${escapeHtml(t("plans.oneYear.calPct", { n: String(calPct) }))}</p>
        </div>
        <div class="oy-split-right">
          <p class="oy-split-theme">${escapeHtml(plan.theme)}</p>
          <button type="button" class="oy-split-passage" data-ref="${escapeHtml(plan.pl)}">
            <span class="oy-tag-lbl">${escapeHtml(t("plans.oneYear.ot"))}</span> ${escapeHtml(plan.pl)}
          </button>
          <button type="button" class="oy-split-passage" data-ref="${escapeHtml(plan.pb)}">
            <span class="oy-tag-lbl">${escapeHtml(t("plans.oneYear.nt"))}</span> ${escapeHtml(plan.pb)}
          </button>
          <button type="button" class="oy-split-passage" data-ref="${escapeHtml(plan.mazmur)}">
            <span class="oy-tag-lbl">${escapeHtml(t("plans.oneYear.wisdom"))}</span> ${escapeHtml(plan.mazmur)}
          </button>
          <div class="oy-split-actions">
            <button type="button" class="oy-split-play" id="btn-oy-listen" aria-label="${escapeHtml(t("plans.oneYear.playAria"))}">▶</button>
            <button type="button" class="oy-split-check ${isDone ? "is-done" : ""}" id="btn-oy-check">
              ${isDone ? escapeHtml(t("plans.oneYear.done")) : escapeHtml(t("plans.oneYear.markDone"))}
            </button>
          </div>
        </div>
      </div>
    `;

    oneYearCard.querySelectorAll(".oy-split-passage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ref = btn.getAttribute("data-ref");
        if (ref) document.dispatchEvent(new CustomEvent("rhema-open-verse", { detail: ref }));
      });
    });

    oneYearCard.querySelector("#btn-oy-listen")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (plansBridge?.askVoice) {
        plansBridge.askVoice(
          isGlobalUiLang()
            ? `Read and reflect on One-Year Bible day ${dayOfYear}: Old Testament from ${plan.pl}, New Testament from ${plan.pb}, and Psalms/Wisdom from ${plan.mazmur}. Lead a brief blessing prayer.`
            : `Bacakan dan berikan renungan untuk program baca Alkitab 1 Tahun hari ke-${dayOfYear}: Perjanjian Lama dari ${plan.pl}, Perjanjian Baru dari ${plan.pb}, serta Mazmur dari ${plan.mazmur}. Pimpin doa berkat.`,
        );
      }
      plansBridge?.markTodayRead?.();
    });

    oneYearCard.querySelector("#btn-oy-check")?.addEventListener("click", () => {
      toggleOneYearDayCompleted(dayOfYear);
      renderThematicPlans();
      plansBridge?.markTodayRead?.();
    });
  }

  const grid = document.getElementById("thematic-plans-grid");
  const detail = document.getElementById("thematic-plan-detail");
  const summaryEl = document.getElementById("thematic-plans-summary");
  if (!grid || !detail) return;

  const progress = loadThematicProgress();
  const activeCount = plans.filter((plan) => {
    const done = progress[plan.id]?.completedDays?.length || 0;
    return done > 0 && done < plan.totalDays;
  }).length;
  const doneCountAll = plans.filter((plan) => {
    const done = progress[plan.id]?.completedDays?.length || 0;
    return done >= plan.totalDays;
  }).length;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <span class="plan-summary-chip">${escapeHtml(t("plans.summary.count", { n: String(plans.length) }))}</span>
      ${activeCount ? `<span class="plan-summary-chip plan-summary-chip--active">${escapeHtml(t("plans.summary.inProgress", { n: String(activeCount) }))}</span>` : ""}
      ${doneCountAll ? `<span class="plan-summary-chip plan-summary-chip--done">${escapeHtml(t("plans.summary.completed", { n: String(doneCountAll) }))}</span>` : ""}
    `;
  }

  grid.innerHTML = plans
    .map((plan) => {
      const pData = progress[plan.id] || { completedDays: [] };
      const doneCount = pData.completedDays?.length || 0;
      const pct = Math.round((doneCount / plan.totalDays) * 100);
      const isSelected = selectedThematicPlanId === plan.id;
      const status = getThematicPlanStatus(plan, doneCount);
      return `
      <div class="thematic-plan-card glass-card ${isSelected ? "selected" : ""} ${status.tone !== "new" ? `tone-${status.tone}` : ""}" data-plan-id="${escapeAttr(plan.id)}">
        <div class="plan-card-icon">${plan.icon}</div>
        <div class="plan-card-info">
          <div class="plan-card-top">
            <h4 class="plan-card-title">${escapeHtml(plan.title)}</h4>
            <span class="plan-card-chevron" aria-hidden="true">›</span>
          </div>
          <p class="plan-card-sub">${escapeHtml(plan.subtitle)}</p>
          <div class="plan-card-meta">
            <span class="plan-card-duration">${escapeHtml(t("plans.card.duration", { days: String(plan.totalDays), weeks: formatPlanWeeks(plan.totalDays) }))}</span>
            <span class="plan-card-status plan-card-status--${status.tone}">${escapeHtml(status.label)}</span>
          </div>
          <div class="plan-card-progress">
            <div class="plan-card-pbar"><div class="plan-card-pfill" style="width:${pct}%"></div></div>
            <span class="plan-card-ptext">${doneCount}/${plan.totalDays}</span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  grid.querySelectorAll("[data-plan-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const planId = card.getAttribute("data-plan-id");
      selectedThematicPlanId = planId;
      renderThematicPlans();
      renderThematicPlanDetail(planId);
    });
  });

  if (selectedThematicPlanId) {
    renderThematicPlanDetail(selectedThematicPlanId);
  } else {
    detail.classList.add("hidden");
  }
}
