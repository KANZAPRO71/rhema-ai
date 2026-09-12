/**
 * Localized labels for worship UI — emotions, prayer presets, session phases, mood chips.
 */
import { DEVOTION_SESSION_PHASES } from "./devotionSessionEngine.js";
import { EMOTION_SESSION_PHASES } from "./emotionSessionEngine.js";
import { GUIDED_PRAYER_SESSION_PHASES } from "./guidedPrayerSessionEngine.js";
import { MOOD_CHIPS } from "./moodScriptureEngine.js";
import { EMOTIONS, PRAYER_PRESETS } from "./homeWorshipData.js";
import { getEffectiveUiLang } from "./localeProfile.js";
import { t } from "./uiStrings.js";

/** @param {{ labelKey?: string, label?: string }} item */
export function localizedLabel(item) {
  return item.labelKey ? t(item.labelKey) : item.label || "";
}

/** @param {{ titleKey?: string, title?: string, label?: string }} item */
export function localizedTitle(item) {
  return item.titleKey ? t(item.titleKey) : item.title || item.label || "";
}

/** @param {{ subtitleKey?: string, subtitle?: string }} item */
export function localizedSubtitle(item) {
  return item.subtitleKey ? t(item.subtitleKey) : item.subtitle || "";
}

export function localizedEmotions() {
  return EMOTIONS.map((e) => ({ ...e, label: localizedLabel(e) }));
}

export function localizedPrayerPresets() {
  return PRAYER_PRESETS.map((p) => ({
    ...p,
    title: localizedTitle(p),
    subtitle: localizedSubtitle(p),
    label: p.labelKey ? t(p.labelKey) : p.label || localizedTitle(p),
  }));
}

export function localizedMoodChips() {
  return MOOD_CHIPS.map((m) => ({ ...m, label: localizedLabel(m) }));
}

/** @param {Array<{ id: string, label: string, icon: string, voice?: boolean, durationSec?: number }>} phases @param {string} prefix */
function localizePhases(phases, prefix) {
  return phases.map((p) => ({
    ...p,
    label: t(`${prefix}.${p.id}`),
  }));
}

export function localizedDevotionSessionPhases() {
  return localizePhases(DEVOTION_SESSION_PHASES, "phase.devotion");
}

export function localizedEmotionSessionPhases() {
  return localizePhases(EMOTION_SESSION_PHASES, "phase.emotion");
}

export function localizedGuidedPrayerSessionPhases() {
  return localizePhases(GUIDED_PRAYER_SESSION_PHASES, "phase.guided");
}

export function devotionTimelineShortLabels() {
  return [
    t("phase.devotion.short.opening"),
    t("phase.devotion.short.meditate"),
    t("phase.devotion.short.reflection"),
    t("phase.devotion.short.prayer"),
  ];
}

/** @param {Date} [date] */
export function formatDevotionDate(date = new Date()) {
  const loc = getEffectiveUiLang() === "en" ? "en-US" : "id-ID";
  return date.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "short" });
}

/** @param {Date} [date] */
export function formatMoodSummaryDate(date = new Date()) {
  const loc = getEffectiveUiLang() === "en" ? "en-US" : "id-ID";
  return date.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" });
}
