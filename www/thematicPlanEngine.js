/**
 * Thematic Plan Engine — rencana baca tematik lengkap & validasi (tab Alkitab).
 * Terpisah dari Renungan / aiEmotionEngine.
 */

import { getEffectiveUiLang } from "./localeProfile.js";
import { THEMATIC_READING_PLANS_RAW } from "./thematicPlanData.js";
import { THEMATIC_PLAN_EN } from "./thematicPlanI18n.js";

/** @typedef {{ day: number, ref: string, title: string, desc: string }} ThematicDay */
/** @typedef {{ id: string, title: string, subtitle: string, icon: string, totalDays: number, days: ThematicDay[] }} ThematicPlan */

/** @param {ThematicPlan} plan */
function normalizePlan(plan) {
  const days = [...plan.days].sort((a, b) => a.day - b.day);
  const totalDays = days.length;
  return {
    ...plan,
    totalDays,
    days,
  };
}

const PLANS = THEMATIC_READING_PLANS_RAW.map(normalizePlan);

/** @param {ThematicPlan} plan */
export function localizeThematicPlan(plan) {
  if (getEffectiveUiLang() !== "en") return plan;
  const en = THEMATIC_PLAN_EN[plan.id];
  if (!en) return plan;
  return {
    ...plan,
    title: en.title ?? plan.title,
    subtitle: en.subtitle ?? plan.subtitle,
    days: plan.days.map((d) => {
      const dayEn = en.days?.[d.day];
      return dayEn ? { ...d, title: dayEn.title, desc: dayEn.desc } : d;
    }),
  };
}

/** @returns {ThematicPlan[]} */
export function getThematicPlans() {
  return PLANS.map(localizeThematicPlan);
}

/** @param {string} planId */
export function getThematicPlanById(planId) {
  const plan = PLANS.find((p) => p.id === planId);
  return plan ? localizeThematicPlan(plan) : null;
}

/** @param {ThematicPlan} plan @param {Set<number>} doneSet */
export function getNextThematicDay(plan, doneSet) {
  return plan.days.find((d) => !doneSet.has(d.day)) || plan.days[plan.days.length - 1];
}

/** Ringkasan untuk debug / preload. */
export function getThematicPlansSummary() {
  return PLANS.map((p) => ({
    id: p.id,
    title: p.title,
    totalDays: p.totalDays,
    dayCount: p.days.length,
  }));
}

/** @deprecated gunakan getThematicPlans() — compat; panggilan dinamis agar locale-aware */
export const THEMATIC_READING_PLANS = PLANS;

/** Locale-aware rencana tematik untuk UI. */
export function getLocalizedThematicPlans() {
  return getThematicPlans();
}
