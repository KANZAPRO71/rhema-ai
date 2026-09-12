/**
 * Guardrail krisis kesehatan mental — deteksi deterministik, hotline, respons pastoral aman Play Store.
 * Bukan diagnosis klinis; arahkan ke bantuan manusia profesional.
 */
import { getEffectiveProfile } from "./localeProfile.js";

/** @typedef {{ id: string, label: string, number: string, note?: string, tel?: string }} CrisisHotline */

const CRISIS_PATTERNS_ID = [
  /\bbunuh\s+diri\b/i,
  /\bmau\s+(?:mati|meninggal|mati\s+saja)\b/i,
  /\bmengakhiri\s+hidup\b/i,
  /\bmenyakiti\s+diri\b/i,
  /\bself[\s-]?harm\b/i,
  /\bsuicide\b/i,
  /\bdepresi\s+berat\b/i,
  /\btidak\s+(?:mau|ingin)\s+hidup\b/i,
  /\bputus\s+asa\s+total\b/i,
];

const CRISIS_PATTERNS_EN = [
  /\bsuicide\b/i,
  /\bkill\s+myself\b/i,
  /\bself[\s-]?harm\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bend\s+my\s+life\b/i,
  /\bsevere\s+depression\b/i,
];

/** @type {Record<string, CrisisHotline[]>} */
const HOTLINES_BY_REGION = {
  indonesia: [
    { id: "119", label: "Darurat Nasional", number: "119", tel: "tel:119", note: "Bahaya langsung — hubungi sekarang" },
    { id: "sejiwa", label: "SEJIWA (Kemenkes)", number: "119 ext 8", tel: "tel:119", note: "Konseling krisis kesehatan jiwa" },
    { id: "itl", label: "Into The Light", number: "1500-456", tel: "tel:1500456", note: "Hotline krisis & pencegahan bunuh diri" },
  ],
  global: [
    { id: "988", label: "988 Suicide & Crisis Lifeline (US)", number: "988", tel: "tel:988", note: "US & territories" },
    { id: "911", label: "Emergency (US)", number: "911", tel: "tel:911", note: "Immediate danger" },
    { id: "116123", label: "Samaritans (UK)", number: "116 123", tel: "tel:116123", note: "Free 24/7 support" },
  ],
  latam: [
    { id: "911", label: "Emergencias", number: "911", tel: "tel:911", note: "Peligro inmediato" },
    { id: "988", label: "Línea 988 (US reference)", number: "988", tel: "tel:988", note: "Crisis internacional" },
  ],
  brazil: [
    { id: "188", label: "CVV — Centro de Valorização da Vida", number: "188", tel: "tel:188", note: "24h, gratuito" },
    { id: "192", label: "SAMU", number: "192", tel: "tel:192", note: "Emergência médica" },
  ],
  korea: [
    { id: "1393", label: "자살예방상담전화", number: "1393", tel: "tel:1393", note: "24시간 위기 상담" },
    { id: "119", label: "응급 (119)", number: "119", tel: "tel:119", note: "즉각적 위험" },
  ],
  japan: [
    { id: "lifeline", label: "いのちの電話", number: "0570-783-556", tel: "tel:0570783556", note: "24時間" },
    { id: "110", label: "警察 (110)", number: "110", tel: "tel:110", note: "緊急時" },
  ],
  china: [
    { id: "400", label: "北京心理危机研究与干预中心", number: "400-161-9995", tel: "tel:4001619995", note: "危机支持" },
    { id: "120", label: "急救 (120)", number: "120", tel: "tel:120", note: "紧急医疗" },
  ],
};

export const CRISIS_SYSTEM_RULE_ID =
  "GUARDRAIL KRISIS (WAJIB — Play Store Health Policy): " +
  "Rhema AI bukan layanan kesehatan mental klinis. JANGAN mendiagnosis depresi, gangguan jiwa, atau bunuh diri. " +
  "Jika user menyebut bunuh diri, menyakiti diri, atau bahaya langsung: berikan respons hangat singkat, arahkan ke hotline darurat/profesional manusia SEGERA, doa pengharapan singkat — tanpa interogasi.";

export const CRISIS_SYSTEM_RULE_EN =
  "CRISIS GUARDRAIL (required — Play Store): Not a clinical mental-health service. Do not diagnose. " +
  "If user mentions suicide, self-harm, or immediate danger: warm brief response, direct to emergency/professional human help immediately, short prayer — no interrogation.";

/** @param {string} text */
export function detectCrisisSignals(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  const patterns = [...CRISIS_PATTERNS_ID, ...CRISIS_PATTERNS_EN];
  return patterns.some((re) => re.test(t));
}

/** @param {string} [region] */
export function getCrisisHotlines(region) {
  const r = region || getEffectiveProfile().region || "indonesia";
  return HOTLINES_BY_REGION[r] || HOTLINES_BY_REGION.global;
}

/** @param {string} [region] @param {boolean} [spoken] */
export function buildCrisisResponse(region, spoken = true) {
  const hotlines = getCrisisHotlines(region);
  const primary = hotlines[0];
  const spokenReply = spoken
    ? `Saudara, saya mendengar beban berat yang saudara alami — dan itu penting. ` +
      `Rhema AI bukan pengganti konselor atau layanan darurat. ` +
      `Mohon hubungi ${primary.label} di ${primary.number} sekarang, atau orang tepercaya di dekat saudara. ` +
      `Tuhan tidak meninggalkan saudara sendirian — bantuan manusia yang terlatih ada untuk saudara hari ini.`
    : "";
  return {
    severity: "crisis",
    hotlines,
    spokenReply,
    moduleId: "crisis",
  };
}

/** @param {boolean} [indonesia] */
export function getCrisisSystemRule(indonesia = true) {
  return indonesia ? CRISIS_SYSTEM_RULE_ID : CRISIS_SYSTEM_RULE_EN;
}
