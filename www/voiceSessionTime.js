/**
 * Konteks waktu untuk sesi suara live — jam/tanggal perangkat pengguna.
 */

import {
  getDayPartLabel,
  getDevotionTimezone,
  getTimeSuffix,
  getUiLocale,
  isIndonesiaProfile,
} from "./localeProfile.js";

/** @param {Date} [now] */
export function getLiveSessionTimeSnapshot(now = new Date()) {
  const timezone = getDevotionTimezone();
  const locale = getUiLocale();
  const dateLabel = now.toLocaleDateString(locale, {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeCore = now.toLocaleTimeString(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: !isIndonesiaProfile(),
  });
  const timeLabel = `${timeCore}${getTimeSuffix()}`;
  const dayPart = getDayPartLabel(now);
  const localTimeNow = isIndonesiaProfile()
    ? `${dateLabel}, pukul ${timeLabel}`
    : `${dateLabel}, ${timeLabel}`;

  return {
    timezone,
    locale,
    dateLabel,
    timeLabel,
    dayPart,
    iso: now.toISOString(),
    localTimeNow,
  };
}

/** @param {Date} [now] */
export function buildLiveSessionTimeContext(now = new Date()) {
  const snap = getLiveSessionTimeSnapshot(now);
  if (!isIndonesiaProfile()) {
    return (
      `SESSION TIME CONTEXT (user device, REQUIRED): ${snap.localTimeNow} (${snap.timezone}, ${snap.dayPart}). ` +
      "If asked what time or date it is: answer briefly and accurately from this context. " +
      "NEVER refuse — use this context or get_session_metadata."
    );
  }
  return (
    `KONTEKS WAKTU SESI (perangkat pengguna, WAJIB): ${snap.localTimeNow} (${snap.timezone}, ${snap.dayPart}). ` +
    "Jika ditanya jam berapa / pukul berapa / tanggal hari ini / hari apa sekarang: jawab singkat dan akurat dari konteks ini. " +
    "JANGAN menolak atau bilang tidak bisa memberi waktu — gunakan konteks ini atau tool get_session_metadata."
  );
}

const TIME_QUERY_RE =
  /\b(jam\s*(?:berapa|brp|pukul)?|pukul\s*berapa|waktu\s*sekarang|what\s*time(?:\s*is\s*it)?|tanggal\s*(?:hari\s*ini|sekarang)|hari\s*apa\s*(?:sekarang|ini)|sekarang\s*(?:jam|pukul)\s*berapa)\b/i;

/** @param {string} text */
export function isTimeQuery(text) {
  const t = text.trim();
  if (!t) return false;
  if (TIME_QUERY_RE.test(t)) return true;
  if (/^jam\s*\d/i.test(t)) return false;
  return /\b(berapa\s*jam|jam\s*brp)\b/i.test(t);
}

/** @param {Date} [now] */
export function buildTimeReply(now = new Date()) {
  const snap = getLiveSessionTimeSnapshot(now);
  return isIndonesiaProfile()
    ? `Sekarang pukul ${snap.timeLabel}, ${snap.dateLabel}.`
    : `It is ${snap.timeLabel}, ${snap.dateLabel}.`;
}
