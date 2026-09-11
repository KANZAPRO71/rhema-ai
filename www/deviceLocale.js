/**
 * Bridge deteksi locale/timezone native Android (LocaleManager.java).
 * Fallback ke navigator/Intl di web.
 */

/** @returns {Promise<{ language: string, timezone: string, suggestGlobal: boolean, suggestRegion: 'global'|'indonesia' } | null>} */
export async function getNativeDeviceLocaleHints() {
  try {
    const plugin = window.Capacitor?.Plugins?.DeviceLocale;
    if (plugin?.getBootHints) {
      const res = await plugin.getBootHints();
      const suggestGlobal = Boolean(res?.suggestGlobal);
      return {
        language: String(res?.language || "en"),
        timezone: String(res?.timezone || "UTC"),
        suggestGlobal,
        suggestRegion: suggestGlobal ? "global" : "indonesia",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
