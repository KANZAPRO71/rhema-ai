/**
 * Preset region ibadah global — AI language, Alkitab, instruksi Gemini Live.
 * Offline Bible: hanya tb + kjv tersedia saat ini; lainnya fase 2 (pack download).
 */

/** @typedef {"indonesia"|"global"|"latam"|"brazil"|"korea"|"japan"|"china"} WorshipRegionId */
/** @typedef {"tb"|"kjv"|"rvr"|"jfa"|"krv"|"ja1955"|"cuv"} BibleVersionId */

/**
 * @typedef {object} WorshipLocalePreset
 * @property {WorshipRegionId} id
 * @property {string} label
 * @property {string} uiLang — id | en (UI visual; fase 2: es, pt, ko, ja, zh)
 * @property {string} aiLangCode — BCP-47 untuk Gemini Live
 * @property {BibleVersionId} bibleVersion
 * @property {string} bibleLabel
 * @property {boolean} bibleOffline
 * @property {string} aiLanguageRule
 * @property {string} lifeContextRule
 * @property {string} devotionStructure
 * @property {string} prayerClosing
 * @property {string} onboardSub — ringkasan singkat untuk kartu onboarding
 * @property {string} [theologyKey] — kunci di theologyPrompts.js (instruksi penuh)
 */

/** @type {Record<WorshipRegionId, WorshipLocalePreset>} */
export const WORSHIP_LOCALES = {
  indonesia: {
    id: "indonesia",
    label: "🇮🇩 Indonesia (Kidung Jemaat)",
    onboardSub: "Alkitab · Kidung Jemaat · renungan konteks Indonesia",
    uiLang: "id",
    aiLangCode: "id-ID",
    bibleVersion: "tb",
    bibleLabel: "Alkitab",
    bibleOffline: true,
    aiLanguageRule:
      "WAJIB: bahasa Indonesia sehari-hari hangat dan mudah dicerna. JANGAN berpindah ke English, Spanyol, Portugis, Korea (Hangul), Jepang, atau bahasa lain meskipun user menyebut kata asing singkat (mis. 'sí', 'ok') — tetap jawab dalam Indonesia kecuali user secara eksplisit minta ganti bahasa.",
    lifeContextRule:
      "Analogi selaras realita hidup Indonesia kontemporer — termasuk Gen Z (identitas, mental health, media sosial, karier, perantau) — tanpa mengabaikan generasi lain.",
    devotionStructure:
      "Struktur renungan: Sapaan hangat → Pembacaan ayat Alkitab → Refleksi teologis → Doa syafaat. Akhiri: Dalam nama Tuhan Yesus, Amen.",
    prayerClosing: "Dalam nama Tuhan Yesus, Amen.",
  },
  global: {
    id: "global",
    label: "🇺🇸 Global English (KJV)",
    onboardSub: "KJV · English devotion & sermon · worldwide",
    uiLang: "en",
    aiLangCode: "en-US",
    bibleVersion: "kjv",
    bibleLabel: "King James Version (KJV)",
    bibleOffline: true,
    aiLanguageRule: "REQUIRED: respond in natural, warm everyday English.",
    lifeContextRule:
      "Use relatable illustrations for a global English-speaking audience (work, family, anxiety, faith).",
    devotionStructure:
      "Devotion structure: Greeting → KJV reading → Reflection → Pastoral prayer. End: In Jesus' name, Amen.",
    prayerClosing: "In Jesus' name, Amen.",
  },
  latam: {
    id: "latam",
    label: "🇲🇽 América Latina (RVR · Español)",
    onboardSub: "Reina-Valera · renungan Español · AI voice live",
    uiLang: "es",
    theologyKey: "latam",
    aiLangCode: "es-ES",
    bibleVersion: "rvr",
    bibleLabel: "Reina-Valera 1960 (RVR)",
    bibleOffline: false,
    aiLanguageRule: "OBLIGATORIO: habla en español cristiano cálido y claro.",
    lifeContextRule: "Usa ejemplos de la vida diaria en contexto latinoamericano.",
    devotionStructure:
      "Estructura: Saludo → Lectura RVR → Reflexión → Oración pastoral. Termina: En el nombre de Jesús, Amén.",
    prayerClosing: "En el nombre de Jesús, Amén.",
  },
  brazil: {
    id: "brazil",
    label: "🇧🇷 Brasil (ARC · Português)",
    onboardSub: "Almeida ARC/NVI · células · AI voice live",
    uiLang: "pt",
    theologyKey: "brazil",
    aiLangCode: "pt-BR",
    bibleVersion: "jfa",
    bibleLabel: "Almeida Revista e Corrigida (ARC) / NVI",
    bibleOffline: false,
    aiLanguageRule: "OBRIGATÓRIO: fale em português cristão caloroso e natural.",
    lifeContextRule: "Use ilustrações do cotidiano brasileiro.",
    devotionStructure:
      "Estrutura: Saudação → Leitura ARC/NVI → Reflexão → Oração pastoral. Termine: Em nome de Jesus, Amém.",
    prayerClosing: "Em nome de Jesus, Amém.",
  },
  korea: {
    id: "korea",
    label: "🇰🇷 대한민국 (KRV · 한국어)",
    onboardSub: "개역한글 KRV · 한국어 묵상 · AI voice live",
    uiLang: "ko",
    theologyKey: "korea",
    aiLangCode: "ko-KR",
    bibleVersion: "krv",
    bibleLabel: "Korean Revised Version (KRV / 개역한글)",
    bibleOffline: false,
    aiLanguageRule: "필수: 따뜻하고 자연스러운 한국어 기독교 문맥으로 대화하세요.",
    lifeContextRule: "한국 일상(가정, 직장, 신앙)에 맞는 비유를 사용하세요.",
    devotionStructure:
      "구조: 인사 → KRV 성경 낭독 → 묵상 → pastoral 기도. 마무리: 예수님의 이름으로 기도드립니다, 아멘.",
    prayerClosing: "예수님의 이름으로 기도드립니다, 아멘.",
  },
  japan: {
    id: "japan",
    label: "🇯🇵 日本 (口語訳 · 日本語)",
    onboardSub: "口語訳聖書 · 日本語黙想 · AI voice live",
    uiLang: "ja",
    theologyKey: "japan",
    aiLangCode: "ja-JP",
    bibleVersion: "ja1955",
    bibleLabel: "Colloquial Japanese Bible (JA1955 / 口語訳聖書)",
    bibleOffline: false,
    aiLanguageRule: "必須: キリスト教の文脈に沿った自然で温かい日本語で話してください。",
    lifeContextRule: "日本の日常生活に合う例えを使ってください。",
    devotionStructure:
      "構成: 挨拶 → 口語訳の朗読 → 黙想 →  pastoral の祈り。締め: イエスの御名によって祈ります、アーメン。",
    prayerClosing: "主イエスの御名によって祈ります、アーメン。",
  },
  china: {
    id: "china",
    label: "🇨🇳 华语 (CUV · 中文)",
    onboardSub: "和合本 CUV · 中文灵修 · AI voice live",
    uiLang: "zh",
    theologyKey: "china",
    aiLangCode: "zh-CN",
    bibleVersion: "cuv",
    bibleLabel: "Chinese Union Version (CUV)",
    bibleOffline: false,
    aiLanguageRule: "必须：用温暖自然的基督教语境中文回应。",
    lifeContextRule: "使用符合华人生活背景的比喻。",
    devotionStructure: "结构：问候 → CUV 读经 → 默想 →  pastoral 祷告。结束：奉耶稣基督的名，阿们。",
    prayerClosing: "奉耶稣基督的名，阿们。",
  },
};

/** @type {WorshipRegionId[]} */
export const WORSHIP_REGION_IDS = Object.keys(WORSHIP_LOCALES);

/** @param {string} [id] @returns {WorshipLocalePreset} */
export function getWorshipLocalePreset(id) {
  const key = /** @type {WorshipRegionId} */ (id);
  return WORSHIP_LOCALES[key] || WORSHIP_LOCALES.global;
}

/** @param {string} deviceLanguage — e.g. id, en, es, pt, ko, ja, zh */
export function suggestRegionFromLanguage(deviceLanguage) {
  const lang = String(deviceLanguage || "en").toLowerCase().split("-")[0];
  if (lang === "id" || lang === "in") return "indonesia";
  if (lang === "es") return "latam";
  if (lang === "pt") return "brazil";
  if (lang === "ko") return "korea";
  if (lang === "ja") return "japan";
  if (lang === "zh") return "china";
  return "global";
}

/** @param {string} regionId @returns {boolean} */
export function isValidWorshipRegion(regionId) {
  return regionId in WORSHIP_LOCALES;
}

/** Label Alkitab untuk dropdown pengaturan. */
export const BIBLE_VERSION_LABELS = {
  tb: "Indonesia",
  kjv: "KJV — English",
  rvr: "Reina-Valera 1960 — Español",
  jfa: "João Ferreira de Almeida — Português",
  krv: "Korean Revised Version — 한국어",
  ja1955: "Colloquial Japanese Bible (1955)",
  cuv: "Chinese Union Version — 中文",
};
