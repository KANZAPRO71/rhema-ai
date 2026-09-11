/**
 * Profil locale/worship region — Indonesia vs Global.
 * Mengatur default Alkitab, bahasa AI, dan konteks hidup.
 */

export const LOCALE_PROFILE_KEY = "rhema-locale-profile";

/** @typedef {"indonesia"|"global"} WorshipRegion */
/** @typedef {"tb"|"kjv"} BibleVersionPreference */
/** @typedef {{ region: WorshipRegion, bibleVersion: BibleVersionPreference, configuredAt?: string, source?: string }} LocaleProfile */

export const INDONESIA_TIMEZONES = new Set([
  "Asia/Jakarta",
  "Asia/Pontianak",
  "Asia/Makassar",
  "Asia/Jayapura",
]);

/** @returns {{ timezone: string, locale: string }} */
export function detectDeviceSignals() {
  let timezone = "Asia/Jakarta";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
  } catch {
    /* ignore */
  }
  const locale =
    (typeof navigator !== "undefined" && navigator.language) || "id-ID";
  return { timezone, locale };
}

/** @param {{ timezone?: string, locale?: string, suggestGlobal?: boolean }} [signals] */
export function suggestRegion(signals = detectDeviceSignals()) {
  if (typeof signals.suggestGlobal === "boolean") {
    return signals.suggestGlobal ? "global" : "indonesia";
  }
  let score = 0;
  const loc = (signals.locale || "").toLowerCase();
  if (loc.startsWith("id") || loc.startsWith("in")) score += 2;
  const tz = signals.timezone || "";
  if (INDONESIA_TIMEZONES.has(tz)) score += 2;
  if (/jakarta|makassar|jayapura|pontianak/i.test(tz)) score += 2;
  return score >= 2 ? "indonesia" : "global";
}

/** @returns {LocaleProfile | null} */
export function getLocaleProfile() {
  try {
    const raw = localStorage.getItem(LOCALE_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.region === "indonesia" || parsed?.region === "global") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isLocaleProfileConfigured() {
  return Boolean(getLocaleProfile()?.region);
}

/** @param {Partial<LocaleProfile> & { region: WorshipRegion }} profile */
export function saveLocaleProfile(profile) {
  const region = profile.region === "global" ? "global" : "indonesia";
  /** @type {LocaleProfile} */
  const next = {
    region,
    bibleVersion:
      profile.bibleVersion || (region === "global" ? "kjv" : "tb"),
    configuredAt: new Date().toISOString(),
    source: profile.source || "manual",
  };
  try {
    localStorage.setItem(LOCALE_PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  document.dispatchEvent(
    new CustomEvent("rhema-locale-changed", { detail: next }),
  );
  return next;
}

/** Profil bawaan — tetap Indonesia sampai pengguna memilih (jaga perilaku lama). */
const LEGACY_DEFAULT_PROFILE = /** @type {LocaleProfile} */ ({
  region: "indonesia",
  bibleVersion: "tb",
  source: "legacy-default",
});

/** @returns {LocaleProfile} */
export function getEffectiveProfile() {
  const saved = getLocaleProfile();
  if (saved?.region) return saved;
  return LEGACY_DEFAULT_PROFILE;
}

/** Saran region untuk onboarding — tidak mengubah perilaku app sebelum disimpan. */
export function getSuggestedProfile() {
  const suggested = suggestRegion();
  return {
    region: suggested,
    bibleVersion: suggested === "global" ? "kjv" : "tb",
    source: "suggested",
  };
}

export function isIndonesiaProfile() {
  return getEffectiveProfile().region === "indonesia";
}

/** Bahasa UI efektif: region tersimpan, atau deteksi locale HP sebelum onboarding. */
export function getEffectiveUiLang() {
  if (isLocaleProfileConfigured()) {
    return isIndonesiaProfile() ? "id" : "en";
  }
  const loc = (detectDeviceSignals().locale || "").toLowerCase();
  return loc.startsWith("id") ? "id" : "en";
}

/** Saran region dari timezone + locale perangkat (setara deteksi Kotlin/JS di boot). */
export function getBootRegionSuggestion() {
  const signals = detectDeviceSignals();
  const region = suggestRegion(signals);
  return { region, signals, lang: getEffectiveUiLang() };
}

/** Struktur respons suara live — devotion / renungan (Pilar 2: Otak AI). */
export function getLiveVoiceDevotionStructureRule() {
  if (!isIndonesiaProfile()) {
    return (
      "Default live voice devotion structure: warm Greeting → KJV Scripture reading → " +
      "Reflection → Pastoral Prayer. End prayer with: In Jesus' name, Amen."
    );
  }
  return (
    "Struktur renungan suara default: Sapaan hangat → Pembacaan ayat TB → " +
    "Refleksi teologis → Doa syafaat/karismatik. Akhiri doa: Dalam nama Tuhan Yesus, Amen."
  );
}

/** @returns {BibleVersionPreference} */
export function getDefaultBibleVersion() {
  const v = getEffectiveProfile().bibleVersion;
  return v === "kjv" ? "kjv" : "tb";
}

export function getAiLanguageRule() {
  return isIndonesiaProfile()
    ? "WAJIB: bahasa Indonesia sehari-hari hangat dan mudah dicerna."
    : "REQUIRED: respond in natural, warm everyday English.";
}

export function getAiLifeContextRule() {
  return isIndonesiaProfile()
    ? "Analogi selaras realita hidup Indonesia kontemporer (keluarga, kerja, perantau, kesehatan)."
    : "Use relatable everyday-life illustrations for a global English-speaking audience (work, family, anxiety, faith).";
}

export function getAlkitabChatSystemBase() {
  return isIndonesiaProfile()
    ? "Anda adalah Rhema AI — pendamping rohani berbasis Alkitab Terjemahan Baru (TB/LAI)."
    : "You are Rhema AI — a Scripture companion. Primary Bible: King James Version (KJV) for global users; Indonesian TB when user asks in Indonesian.";
}

export function getDevotionTimezone() {
  if (isIndonesiaProfile()) return "Asia/Makassar";
  return detectDeviceSignals().timezone;
}

export function getUiLocale() {
  return isIndonesiaProfile() ? "id-ID" : "en-US";
}

export function getTimeSuffix() {
  if (!isIndonesiaProfile()) return "";
  const tz = getDevotionTimezone();
  if (tz === "Asia/Jakarta" || tz === "Asia/Pontianak") return " WIB";
  if (tz === "Asia/Jayapura") return " WIT";
  return " WITA";
}

export function getRegionDisplayLabel() {
  return isIndonesiaProfile()
    ? "🇮🇩 Indonesia (TB · Kidung Jemaat)"
    : "🌏 Global (KJV · English worship)";
}

/** @param {Date} [now] */
export function getDayPartLabel(now = new Date()) {
  const tz = getDevotionTimezone();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  if (isIndonesiaProfile()) {
    if (hour >= 18) return "malam";
    if (hour >= 12) return "siang";
    if (hour >= 5) return "pagi";
    return "dini hari";
  }
  if (hour >= 18) return "evening";
  if (hour >= 12) return "afternoon";
  if (hour >= 5) return "morning";
  return "night";
}

/** @returns {string} */
export function getPrimaryBibleLabel() {
  return getDefaultBibleVersion() === "kjv"
    ? "King James Version (KJV)"
    : "Terjemahan Baru (TB/LAI)";
}
