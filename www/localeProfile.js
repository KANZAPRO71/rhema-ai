/**
 * Profil locale/worship region — Indonesia vs Global.
 * Mengatur default Alkitab, bahasa AI, dan konteks hidup.
 */

export const LOCALE_PROFILE_KEY = "rhema-locale-profile";

/** @typedef {"indonesia"|"global"} WorshipRegion */
/** @typedef {"tb"|"kjv"} BibleVersionPreference */
/** @typedef {"id"|"en"|"es"|"pt"|"ko"|"zh"|"ja"} UiLang */
/** @typedef {{
 *   region: WorshipRegion,
 *   bibleVersion: BibleVersionPreference,
 *   uiLang?: UiLang,
 *   aiLang?: UiLang,
 *   configuredAt?: string,
 *   source?: string
 * }} LocaleProfile */

/** Bahasa yang bisa dipilih di wizard & pengaturan (nama native tetap). */
export const APP_LANGUAGES = [
  { id: "en", flag: "🇬🇧", native: "English" },
  { id: "id", flag: "🇮🇩", native: "Bahasa Indonesia" },
  { id: "es", flag: "🇪🇸", native: "Español" },
  { id: "pt", flag: "🇧🇷", native: "Português" },
  { id: "ko", flag: "🇰🇷", native: "한국어" },
  { id: "zh", flag: "🇨🇳", native: "中文" },
  { id: "ja", flag: "🇯🇵", native: "日本語" },
];

const UI_LANG_IDS = new Set(APP_LANGUAGES.map((l) => l.id));

/** @param {string} [lang] @returns {UiLang} */
export function normalizeUiLang(lang) {
  const raw = String(lang || "en").toLowerCase().split("-")[0];
  if (raw === "in") return "id";
  if (UI_LANG_IDS.has(raw)) return /** @type {UiLang} */ (raw);
  return "en";
}

/** @param {string} [lang] */
export function languageNativeName(lang) {
  const id = normalizeUiLang(lang);
  return APP_LANGUAGES.find((l) => l.id === id)?.native || "English";
}

/** Preview bahasa wizard — sebelum profil disimpan. */
/** @type {UiLang | null} */
let uiLangOverride = null;

/** @param {UiLang | null} lang */
export function setUiLangOverride(lang) {
  uiLangOverride = lang ? normalizeUiLang(lang) : null;
}

export function getUiLangOverride() {
  return uiLangOverride;
}

export const INDONESIA_TIMEZONES = new Set([
  "Asia/Jakarta",
  "Asia/Pontianak",
  "Asia/Makassar",
  "Asia/Jayapura",
]);

/** @type {{ timezone?: string, locale?: string, suggestGlobal?: boolean } | null} */
let nativeLocaleHints = null;

/** Terapkan hint DeviceLocale native sebelum wizard / getEffectiveUiLang. */
export function applyNativeLocaleHints(hints) {
  if (!hints) return;
  nativeLocaleHints = {
    timezone: hints.timezone || hints.timezoneId,
    locale: hints.language || hints.locale,
    suggestGlobal: hints.suggestGlobal,
  };
}

/** @returns {{ timezone: string, locale: string, suggestGlobal?: boolean }} */
export function detectDeviceSignals() {
  if (nativeLocaleHints?.locale || nativeLocaleHints?.timezone) {
    return {
      timezone: nativeLocaleHints.timezone || "UTC",
      locale: nativeLocaleHints.locale || "en",
      suggestGlobal: nativeLocaleHints.suggestGlobal,
    };
  }
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

/** @param {Partial<LocaleProfile>} profile */
export function saveLocaleProfile(profile) {
  const uiLang = normalizeUiLang(
    profile.uiLang || (profile.region === "indonesia" ? "id" : "en"),
  );
  const aiLang = normalizeUiLang(profile.aiLang || uiLang);
  const region =
    profile.region === "indonesia" || profile.region === "global"
      ? profile.region
      : uiLang === "id"
        ? "indonesia"
        : "global";
  const bibleVersion =
    profile.bibleVersion === "tb" || profile.bibleVersion === "kjv"
      ? profile.bibleVersion
      : region === "indonesia"
        ? "tb"
        : "kjv";
  /** @type {LocaleProfile} */
  const next = {
    region,
    bibleVersion,
    uiLang,
    aiLang,
    configuredAt: new Date().toISOString(),
    source: profile.source || "manual",
  };
  uiLangOverride = null;
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

/** Default Inggris + KJV jika perangkat tidak terdeteksi Indonesia. */
const DEFAULT_EN_PROFILE = /** @type {LocaleProfile} */ ({
  region: "global",
  bibleVersion: "kjv",
  uiLang: "en",
  aiLang: "en",
  source: "default-en",
});

/** Default TB + Indonesia jika timezone/locale perangkat Indonesia. */
function defaultProfileFromDevice() {
  if (suggestRegion() === "indonesia") {
    return /** @type {LocaleProfile} */ ({
      region: "indonesia",
      bibleVersion: "tb",
      uiLang: "id",
      aiLang: "id",
      source: "default-device",
    });
  }
  return DEFAULT_EN_PROFILE;
}

/** @returns {LocaleProfile} */
export function getEffectiveProfile() {
  const saved = getLocaleProfile();
  if (saved?.region) {
    return {
      ...saved,
      uiLang: normalizeUiLang(
        saved.uiLang || (saved.region === "indonesia" ? "id" : "en"),
      ),
      aiLang: normalizeUiLang(
        saved.aiLang || saved.uiLang || (saved.region === "indonesia" ? "id" : "en"),
      ),
      bibleVersion: saved.bibleVersion === "kjv" ? "kjv" : saved.bibleVersion === "tb" ? "tb" : (saved.region === "global" ? "kjv" : "tb"),
    };
  }
  return defaultProfileFromDevice();
}

/** Profil auto-deteksi lama — belum dipilih user di wizard. */
export function isAutoBootLocaleProfile() {
  const src = getLocaleProfile()?.source || "";
  return src.startsWith("auto-boot");
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

/** @param {string} [locale] */
export function mapDeviceLocaleToUiLang(locale) {
  const loc = (locale || detectDeviceSignals().locale || "").toLowerCase();
  if (loc.startsWith("id") || loc.startsWith("in")) return "id";
  if (loc.startsWith("es")) return "es";
  if (loc.startsWith("pt")) return "pt";
  if (loc.startsWith("ko")) return "ko";
  if (loc.startsWith("zh")) return "zh";
  if (loc.startsWith("ja")) return "ja";
  return "en";
}

/** UI non-Indonesia (en + es/pt/ko/zh/ja) — konten overlay English fallback. */
export function isGlobalUiLang(lang = getEffectiveUiLang()) {
  return lang !== "id";
}

/** Locale BCP-47 untuk speech, tanggal, dan formatter. */
export function getSpeechLocale(lang = getEffectiveUiLang()) {
  /** @type {Record<string, string>} */
  const map = {
    id: "id-ID",
    en: "en-US",
    es: "es-ES",
    pt: "pt-BR",
    ko: "ko-KR",
    zh: "zh-CN",
    ja: "ja-JP",
  };
  return map[lang] || "en-US";
}

/** Bahasa UI efektif — wizard / pengaturan, ikuti perangkat jika belum disimpan. */
export function getEffectiveUiLang() {
  if (uiLangOverride) return uiLangOverride;
  const saved = getLocaleProfile();
  if (saved?.uiLang) return normalizeUiLang(saved.uiLang);
  if (saved?.region === "indonesia") return "id";
  return defaultProfileFromDevice().uiLang;
}

/** Bahasa percakapan AI — mengikuti pilihan wizard. */
export function getEffectiveAiLang() {
  const saved = getLocaleProfile();
  if (saved?.aiLang) return normalizeUiLang(saved.aiLang);
  if (saved?.region === "indonesia") return "id";
  return getEffectiveUiLang();
}

/** Saran region dari timezone + locale perangkat (setara deteksi Kotlin/JS di boot). */
export function getBootRegionSuggestion() {
  const signals = detectDeviceSignals();
  const region = suggestRegion(signals);
  return { region, signals, lang: getEffectiveUiLang() };
}

/** Struktur respons suara live — devotion / renungan (Pilar 2: Otak AI). */
export function getLiveVoiceDevotionStructureRule() {
  const bible = getEffectiveBibleVersion() === "tb" ? "Alkitab" : "KJV";
  if (getEffectiveAiLang() === "id") {
    return (
      `Struktur renungan suara default: Sapaan hangat → Pembacaan ayat ${bible} → ` +
      "Refleksi teologis → Doa syafaat/karismatik. Akhiri doa: Dalam nama Tuhan Yesus, Amen."
    );
  }
  return (
    `Default live voice devotion structure: warm Greeting → ${bible} Scripture reading → ` +
    "Reflection → Pastoral Prayer. End prayer with: In Jesus' name, Amen."
  );
}

/** @returns {BibleVersionPreference} */
export function getDefaultBibleVersion() {
  const v = getEffectiveProfile().bibleVersion;
  return v === "kjv" ? "kjv" : "tb";
}

/** Alkitab efektif — profil tersimpan, atau selaras bahasa UI sebelum onboarding. */
export function getEffectiveBibleVersion() {
  if (isLocaleProfileConfigured()) return getDefaultBibleVersion();
  return isGlobalUiLang() ? "kjv" : "tb";
}

const AI_LANG_RULES = {
  id: "WAJIB: bahasa Indonesia sehari-hari hangat dan mudah dicerna.",
  en: "REQUIRED: respond in natural, warm everyday English.",
  es: "REQUIRED: respond in natural, warm everyday Spanish.",
  pt: "REQUIRED: respond in natural, warm everyday Portuguese.",
  ko: "REQUIRED: respond in natural, warm everyday Korean (존댓말).",
  zh: "REQUIRED: respond in natural, warm everyday Chinese (简体中文).",
  ja: "REQUIRED: respond in natural, warm everyday Japanese (丁寧語).",
};

export function getAiLanguageRule() {
  return AI_LANG_RULES[getEffectiveAiLang()] ?? AI_LANG_RULES.en;
}

export function getAiLifeContextRule() {
  return getEffectiveAiLang() === "id"
    ? "Analogi selaras realita hidup Indonesia kontemporer (keluarga, kerja, perantau, kesehatan)."
    : "Use relatable everyday-life illustrations for a global English-speaking audience (work, family, anxiety, faith).";
}

export function getAlkitabChatSystemBase() {
  const bible = getEffectiveBibleVersion() === "tb" ? "Alkitab" : "King James Version (KJV)";
  if (getEffectiveAiLang() === "id") {
    return `Anda adalah Rhema AI — pendamping rohani. Alkitab utama: ${bible}.`;
  }
  return `You are Rhema AI — a Scripture companion. Primary Bible: ${bible}.`;
}

export function getDevotionTimezone() {
  if (isIndonesiaProfile()) return "Asia/Makassar";
  return detectDeviceSignals().timezone;
}

export function getUiLocale() {
  return getSpeechLocale(getEffectiveUiLang());
}

export function getAiSpeechLocale() {
  return getSpeechLocale(getEffectiveAiLang());
}

export function getTimeSuffix() {
  if (!isIndonesiaProfile()) return "";
  const tz = getDevotionTimezone();
  if (tz === "Asia/Jakarta" || tz === "Asia/Pontianak") return " WIB";
  if (tz === "Asia/Jayapura") return " WIT";
  return " WITA";
}

export function getRegionDisplayLabel() {
  const p = getEffectiveProfile();
  const bible = p.bibleVersion === "tb" ? "Alkitab" : "KJV";
  return `${languageNativeName(p.uiLang)} · ${bible} · AI ${languageNativeName(p.aiLang)}`;
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
    : "Alkitab";
}
