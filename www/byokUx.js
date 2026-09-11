/**
 * BYOK UX helpers — paste clipboard, pesan error ramah, deteksi kuota.
 */
import { t } from "./uiStrings.js";

/** @returns {Promise<string>} */
export async function pasteFromClipboard() {
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      return String(text || "").trim();
    }
  } catch {
    /* permission denied or unsupported */
  }
  return "";
}

/** @param {unknown} err */
export function isQuotaError(err) {
  const s = String(
    typeof err === "object" && err && "message" in err ? err.message : err ?? "",
  ).toLowerCase();
  return (
    /429|too many requests|rate limit|quota|resource_exhausted|resource exhausted/.test(s)
  );
}

/** @param {number} [status] @param {string} [rawMessage] @param {string} [kind] */
export function formatGeminiKeyError(status, rawMessage = "", kind = "") {
  const msg = String(rawMessage || "");
  const k = String(kind || "");
  if (k === "live_not_enabled" || /live.preview|live preview|bidi|websocket.*model|model.*not/i.test(msg)) {
    return t("byok.error.liveNotEnabled");
  }
  if (status === 429 || k === "quota" || isQuotaError(msg)) {
    return t("error.429") || t("byok.error.quota");
  }
  if (status === 403 || k === "invalid" || /API key|PERMISSION|authentication|invalid/i.test(msg)) {
    return t("byok.error.invalid");
  }
  if (k === "timeout") return t("byok.error.liveTimeout");
  if (k === "network" || /network|fetch|failed to fetch|offline|websocket|timeout/i.test(msg)) {
    return t("byok.error.network");
  }
  return msg || t("byok.error.invalid");
}

/** @param {string} detail */
export function formatVoiceError(detail) {
  const d = String(detail || "");
  if (isQuotaError(d)) return t("byok.error.quotaVoice");
  if (/live.preview|live preview|bidi|model.*not|not enabled/i.test(d)) {
    return t("byok.error.liveNotEnabled");
  }
  if (/API key|authentication|PERMISSION|invalid/i.test(d)) {
    return t("byok.error.invalidVoice");
  }
  return d;
}

/** Teks keamanan BYOK — Android pakai EncryptedSharedPreferences. @param {"onboard"|"settings"} [ctx] */
export function getSecurityTrustLine(ctx = "onboard") {
  const nativeSecure =
    typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.() &&
    window.Capacitor?.Plugins?.SecureKey?.setItem;
  if (nativeSecure) {
    return ctx === "settings" ? t("settings.securityTrustNative") : t("byok.step4.securityNative");
  }
  return ctx === "settings" ? t("settings.securityTrust") : t("byok.step4.security");
}
