/**
 * Bridge Room SQLite — skor kuis harian & streak offline (Android).
 * Web fallback: localStorage via quizProfileStore + homeWorship streak.
 */

import { STREAK_KEY } from "./homeWorshipData.js";

function getPlugin() {
  try {
    return window.Capacitor?.Plugins?.QuizScore ?? null;
  } catch {
    return null;
  }
}

export function isNativeQuizStoreAvailable() {
  return Boolean(getPlugin()?.saveDailyResult);
}

/**
 * @param {{ dateKey: string, totalQuestions: number, correctAnswers: number, xpEarned: number, isCompleted?: boolean }} payload
 */
export async function saveDailyQuizNative(payload) {
  const plugin = getPlugin();
  if (!plugin?.saveDailyResult) return null;
  try {
    const res = await plugin.saveDailyResult({
      dateKey: payload.dateKey,
      totalQuestions: payload.totalQuestions,
      correctAnswers: payload.correctAnswers,
      xpEarned: payload.xpEarned,
      isCompleted: payload.isCompleted !== false,
    });
    if (res?.streakCount != null) {
      localStorage.setItem(
        STREAK_KEY,
        JSON.stringify({
          count: Number(res.streakCount) || 0,
          lastDate: String(res.streakLastDate || payload.dateKey),
        }),
      );
    }
    return res;
  } catch {
    return null;
  }
}

/** @param {string} [dateKey] */
export async function getDailyQuizNative(dateKey) {
  const plugin = getPlugin();
  if (!plugin?.getDailyResult) return null;
  try {
    return await plugin.getDailyResult({ dateKey });
  } catch {
    return null;
  }
}

export async function syncNativeStreakToLocal() {
  const plugin = getPlugin();
  if (!plugin?.getStreak) return null;
  try {
    const res = await plugin.getStreak();
    if (res?.count != null) {
      localStorage.setItem(
        STREAK_KEY,
        JSON.stringify({
          count: Number(res.count) || 0,
          lastDate: String(res.lastDate || ""),
        }),
      );
    }
    return res;
  } catch {
    return null;
  }
}
