/**
 * Thematic Plan Engine — rencana baca tematik lengkap & validasi (tab Alkitab).
 * Terpisah dari Renungan / aiEmotionEngine.
 */

import { THEMATIC_READING_PLANS_RAW } from "./thematicPlanData.js";

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

/** @returns {ThematicPlan[]} */
export function getThematicPlans() {
  return PLANS;
}

/** @param {string} planId */
export function getThematicPlanById(planId) {
  return PLANS.find((p) => p.id === planId) || null;
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

/** @deprecated gunakan getThematicPlans — compat renunganData */
export const THEMATIC_READING_PLANS = PLANS;
