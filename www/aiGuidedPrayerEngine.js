/**
 * AI Guided Prayer Engine — konten doa terpandu harian per preset.
 * Gemini sekali/hari per preset + cache lokal + fallback bank rotasi harian.
 */

import { apiUrl } from "./platform.js";
import { PRAYER_PRESETS } from "./homeWorshipData.js";
import {
  getDailyGuidedPrayerVariation,
  todayKey,
} from "./dailyRenunganEngine.js";
import { getAiLanguageRule, isIndonesiaProfile } from "./localeProfile.js";

const GUIDED_PRAYER_CACHE_KEY = "rhema-ai-guided-prayer";

/**
 * @param {typeof PRAYER_PRESETS[number]} preset
 * @param {ReturnType<typeof getDailyGuidedPrayerVariation>} daily
 * @param {"local" | "gemini"} source
 */
function buildGuidedPrayerContent(preset, daily, source = "local") {
  return {
    id: `prayer-${preset.id}-${daily.dateKey}`,
    dateKey: daily.dateKey,
    presetId: preset.id,
    dailyTheme: daily.dailyTheme,
    openingValidate: daily.validatePhrase,
    openingInvite: daily.invitePhrase,
    prayerFocus: daily.prayerFocus,
    lifeScenario: daily.lifeScenario,
    voicePrompt: preset.voicePrompt,
    source,
  };
}

/**
 * @param {string} presetId
 * @param {typeof PRAYER_PRESETS[number]} preset
 */
async function fetchGuidedPrayerFromApi(presetId, preset) {
  const daily = getDailyGuidedPrayerVariation(presetId);
  const topicPrompt = isIndonesiaProfile()
    ? `Doa terpandu singkat hari ini untuk "${preset.title}" (${preset.subtitle}). Tema hari: ${daily.dailyTheme}. Fokus: ${daily.prayerFocus}. Situasi hidup: ${daily.lifeScenario}. Buat prolog penghiburan dan kerangka doa hidup bahasa Indonesia sehari-hari — spesifik hari ini, bukan template generik.`
    : `Short guided prayer for "${preset.title}" (${preset.subtitle}). Theme: ${daily.dailyTheme}. Focus: ${daily.prayerFocus}. Life situation: ${daily.lifeScenario}. ${getAiLanguageRule()} Warm opening and living prayer framework — specific to today, not generic.`;

  const res = await fetch(apiUrl("/api/gemini/generate-devotion"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: topicPrompt }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.success || !data.result) return null;

  const r = data.result;
  return {
    id: `prayer-${presetId}-${todayKey()}`,
    dateKey: todayKey(),
    presetId,
    dailyTheme: r.theme || daily.dailyTheme,
    openingValidate: daily.validatePhrase,
    openingInvite: daily.invitePhrase,
    prayerFocus: daily.prayerFocus,
    lifeScenario: daily.lifeScenario,
    prayerBody: String(r.guidedPrayer || r.reflection || "").trim(),
    optionalVerse: r.passage
      ? { reference: r.passage, text: String(r.verseText || "").trim() }
      : null,
    voicePrompt: preset.voicePrompt,
    source: "gemini",
  };
}

/**
 * @param {string} presetId
 * @returns {Promise<{ content: object, preset: typeof PRAYER_PRESETS[number] } | null>}
 */
export async function getGuidedPrayerContent(presetId) {
  const preset = PRAYER_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;

  const cacheKey = `${GUIDED_PRAYER_CACHE_KEY}-${presetId}`;
  const today = todayKey();

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached?.content?.dateKey === today) {
      return { content: cached.content, preset };
    }
  } catch {
    /* ignore */
  }

  try {
    const generated = await fetchGuidedPrayerFromApi(presetId, preset);
    if (generated) {
      localStorage.setItem(cacheKey, JSON.stringify({ content: generated, presetId }));
      return { content: generated, preset };
    }
  } catch (err) {
    console.warn("[aiGuidedPrayerEngine] Gemini fallback:", err);
  }

  const daily = getDailyGuidedPrayerVariation(presetId);
  const content = buildGuidedPrayerContent(preset, daily, "local");
  localStorage.setItem(cacheKey, JSON.stringify({ content, presetId }));
  return { content, preset };
}

/** Preload konten harian semua preset (saat tab Renungan dibuka). */
export async function preloadTodayGuidedPrayers() {
  await Promise.allSettled(PRAYER_PRESETS.map((p) => getGuidedPrayerContent(p.id)));
}
