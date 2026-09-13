/** Minta izin RECORD_AUDIO lewat native plugin — sekali saja, sebelum getUserMedia WebView. */

export async function isNativeMicGranted() {
  try {
    const cap = typeof window !== "undefined" ? window.Capacitor : null;
    if (!cap?.isNativePlatform?.()) return true;
    const plugin = cap.Plugins?.MicPermission;
    if (!plugin?.check) return false;
    const res = await plugin.check();
    return Boolean(res?.granted);
  } catch {
    return false;
  }
}

export async function ensureNativeMicPermission() {
  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  if (!cap?.isNativePlatform?.()) return;

  const plugin = cap.Plugins?.MicPermission;
  if (!plugin?.ensure) return;

  try {
    await plugin.ensure();
  } catch (initialErr) {
    let micErr = initialErr;
    if (cap.nativePromise) {
      try {
        await cap.nativePromise("MicPermission", "ensure", {});
        return;
      } catch (fallbackErr) {
        micErr = fallbackErr;
      }
    }
    const msg = micErr instanceof Error ? micErr.message : String(micErr);
    if (/ditolak|denied/i.test(msg)) {
      throw new Error(
        "Izin mikrofon ditolak. Buka Pengaturan → Aplikasi → Rhema AI → Mikrofon → Izinkan.",
      );
    }
    throw micErr instanceof Error ? micErr : new Error(msg);
  }
}

/** Fire-and-forget — minta izin mic lebih awal (saat buka app / tab voice). */
export function warmupNativeMicPermission() {
  if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform?.()) return;
  void ensureNativeMicPermission().catch(() => {});
}
