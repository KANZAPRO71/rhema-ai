/**
 * Daily Bible Quiz Engine — rotasi harian, reset progres, state localStorage.
 */

import { todayKey } from "./dailyRenunganEngine.js";
import { BIBLE_QUIZ_POOL, DAILY_QUIZ_COUNT } from "./renunganData.js";

export { DAILY_QUIZ_COUNT };
export const QUIZ_STATE_KEY = "rhema-daily-quiz";

/** @param {string} dateKey @param {string} salt */
function hashDateSeed(dateKey, salt) {
  const key = `${dateKey}::${salt}`;
  let hash = Math.floor(Date.now() / 86_400_000);
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Pilih indeks soal unik untuk hari ini (deterministik).
 * @param {number} poolLength
 * @param {number} count
 * @param {string} dateKey
 */
function pickDailyQuizIndices(poolLength, count, dateKey) {
  const indices = Array.from({ length: poolLength }, (_, i) => i);
  let seed = hashDateSeed(dateKey, "bible-quiz-daily");
  for (let i = poolLength - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(count, poolLength));
}

/** @param {string} [dateKey] */
export function getDailyQuizQuestions(dateKey = todayKey()) {
  const indices = pickDailyQuizIndices(BIBLE_QUIZ_POOL.length, DAILY_QUIZ_COUNT, dateKey);
  return indices.map((i) => BIBLE_QUIZ_POOL[i]);
}

/** @param {unknown} raw */
function isLegacyQuizState(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  if ("dateKey" in raw || "answers" in raw) return false;
  return Object.keys(raw).length > 0;
}

/** @param {string} [dateKey] @returns {{ dateKey: string, answers: Record<string, number> }} */
export function loadQuizState(dateKey = todayKey()) {
  try {
    const raw = JSON.parse(localStorage.getItem(QUIZ_STATE_KEY) || "null");
    if (isLegacyQuizState(raw)) {
      return { dateKey, answers: {} };
    }
    if (!raw || raw.dateKey !== dateKey) {
      return { dateKey, answers: {} };
    }
    return { dateKey: raw.dateKey, answers: raw.answers || {} };
  } catch {
    return { dateKey, answers: {} };
  }
}

/** @param {{ dateKey: string, answers: Record<string, number> }} state */
export function saveQuizState(state) {
  localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
}

/**
 * @param {string} questionId
 * @param {number} optIndex
 * @param {string} [dateKey]
 */
export function saveQuizAnswer(questionId, optIndex, dateKey = todayKey()) {
  const state = loadQuizState(dateKey);
  state.answers[questionId] = optIndex;
  saveQuizState(state);
  return state;
}

/**
 * @param {Array<{ id: string }>} questions
 * @param {Record<string, number>} answers
 */
export function isDailyQuizComplete(questions, answers) {
  return questions.length > 0 && questions.every((q) => typeof answers[q.id] === "number");
}

/**
 * @param {Array<{ id: string, correctIndex: number }>} questions
 * @param {Record<string, number>} answers
 */
export function scoreDailyQuiz(questions, answers) {
  let correct = 0;
  let answered = 0;
  for (const q of questions) {
    const choice = answers[q.id];
    if (typeof choice !== "number") continue;
    answered++;
    if (choice === q.correctIndex) correct++;
  }
  return { correct, answered, total: questions.length };
}
