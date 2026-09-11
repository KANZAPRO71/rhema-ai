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
  } catch (err) {
    if (cap.nativePromise) {
      try {
        await cap.nativePromise("MicPermission", "ensure", {});
        return;
      } catch (err2) {
        err = err2;
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/ditolak|denied/i.test(msg)) {
      throw new Error(
        "Izin mikrofon ditolak. Buka Pengaturan → Aplikasi → Rhema AI → Mikrofon → Izinkan.",
      );
    }
    throw err instanceof Error ? err : new Error(msg);
  }
}

/** Fire-and-forget — minta izin mic lebih awal (saat buka app / tab voice). */
export function warmupNativeMicPermission() {
  if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform?.()) return;
  void ensureNativeMicPermission().catch(() => {});
}
