/**
 * Bridge Capacitor — Emergency Guardrail UI native (Play Store compliance).
 */
import { bargeInNativePlayback, isCapacitorNative } from "./nativeAudioPlayback.js";

/** @returns {import("@capacitor/core").Plugin | undefined} */
function crisisPlugin() {
  try {
    return window.Capacitor?.Plugins?.CrisisGuardrail;
  } catch {
    return undefined;
  }
}

/** @param {string} text */
export async function nativeEvaluateCrisisText(text) {
  const plugin = crisisPlugin();
  if (!plugin?.evaluateText) return null;
  try {
    const res = await plugin.evaluateText({ text: String(text || "") });
    return Boolean(res?.crisis);
  } catch {
    return null;
  }
}

/**
 * @param {{ title?: string, message?: string, dialUri?: string, positiveLabel?: string, hotlines?: Array<{ label?: string, number?: string, tel?: string }> }} opts
 */
export async function showNativeCrisisDialog(opts = {}) {
  const plugin = crisisPlugin();
  if (!plugin?.showEmergencyDialog) return false;

  const primary = opts.hotlines?.[0];
  const dialUri = opts.dialUri || primary?.tel || "tel:119";
  const positiveLabel =
    opts.positiveLabel ||
    (primary ? `Hubungi ${primary.label} (${primary.number})` : "Hubungi Hotline (119)");

  await bargeInNativePlayback();

  await plugin.showEmergencyDialog({
    title: opts.title || "Rhema AI: Kami Peduli Pada Anda",
    message:
      opts.message ||
      "Sahabat, jika Anda sedang mengalami masa yang sangat berat, Anda tidak sendirian. " +
        "Hubungi layanan konseling atau hotline darurat sekarang. Tuhan sangat mengasihi Anda.",
    dialUri,
    positiveLabel,
  });
  return true;
}

export function isNativeCrisisGuardrailAvailable() {
  return isCapacitorNative() && Boolean(crisisPlugin()?.showEmergencyDialog);
}
