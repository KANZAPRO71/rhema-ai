/**
 * Profil rohani kuis — XP, level, riwayat skor (localStorage, offline-first).
 * Padanan konsep Room: schema JSON di perangkat, tanpa server.
 */

export const QUIZ_PROFILE_KEY = "rhema-quiz-profile";

/** @type {Array<{ minXp: number, title: string }>} */
export const SPIRITUAL_LEVELS = [
  { minXp: 0, title: "Pemula" },
  { minXp: 100, title: "Pendamping" },
  { minXp: 300, title: "Companion" },
  { minXp: 600, title: "Pemimpin" },
];

/**
 * @returns {{
 *   xp: number,
 *   levelTitle: string,
 *   lastAwardDate: string,
 *   history: Array<{ dateKey: string, correct: number, total: number, topic: string, xpEarned: number }>
 * }}
 */
export function loadQuizProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(QUIZ_PROFILE_KEY) || "null");
    if (!raw || typeof raw !== "object") return defaultQuizProfile();
    return {
      xp: Number(raw.xp) || 0,
      levelTitle: String(raw.levelTitle || levelForXp(Number(raw.xp) || 0)),
      lastAwardDate: String(raw.lastAwardDate || ""),
      history: Array.isArray(raw.history) ? raw.history.slice(0, 60) : [],
    };
  } catch {
    return defaultQuizProfile();
  }
}

function defaultQuizProfile() {
  return { xp: 0, levelTitle: "Pemula", lastAwardDate: "", history: [] };
}

/** @param {number} xp */
export function levelForXp(xp) {
  let title = SPIRITUAL_LEVELS[0].title;
  for (const tier of SPIRITUAL_LEVELS) {
    if (xp >= tier.minXp) title = tier.title;
  }
  return title;
}

/**
 * @param {number} correct
 * @param {number} total
 * @param {string} dateKey
 * @param {string} topic
 * @returns {{ xpEarned: number, profile: ReturnType<typeof loadQuizProfile>, alreadyAwarded: boolean }}
 */
export function awardDailyQuizXp(correct, total, dateKey, topic) {
  const profile = loadQuizProfile();
  if (profile.lastAwardDate === dateKey) {
    return { xpEarned: 0, profile, alreadyAwarded: true };
  }

  let xpEarned = correct * 10;
  if (correct === total && total > 0) xpEarned += 25;

  profile.xp += xpEarned;
  profile.levelTitle = levelForXp(profile.xp);
  profile.lastAwardDate = dateKey;
  profile.history = [
    { dateKey, correct, total, topic, xpEarned },
    ...profile.history.filter((h) => h.dateKey !== dateKey),
  ].slice(0, 60);

  localStorage.setItem(QUIZ_PROFILE_KEY, JSON.stringify(profile));
  return { xpEarned, profile, alreadyAwarded: false };
}
