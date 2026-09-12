/**
 * Lifecycle native — hentikan sesi live saat app ke background (mic/WebSocket/AudioTrack).
 * Mengurangi crash, ANR, dan ghost recording (syarat stabilitas Play Store).
 */

let wired = false;

/** @param {() => { voice?: { stop?: () => void, isActive?: () => boolean } } | null | undefined} getTransport */
export function initNativeAppLifecycle(getTransport) {
  if (wired || typeof document === "undefined") return;
  wired = true;

  const pauseLive = (reason) => {
    try {
      const transport = getTransport?.();
      if (transport?.voice?.isActive?.()) {
        transport.voice.stop?.();
      }
      document.dispatchEvent(
        new CustomEvent("rhema-audio-stop-all", { detail: { keepVoiceSession: false, reason } }),
      );
    } catch (err) {
      console.warn("[rhema-lifecycle] pauseLive", err);
    }
  };

  document.addEventListener("rhema-app-background", (ev) => {
    const reason = /** @type {{ reason?: string }} */ (ev.detail)?.reason || "background";
    pauseLive(reason);
  });
}
