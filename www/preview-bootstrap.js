/**
 * Preview localhost — jalur kode sama dengan APK Android (parity 1:1).
 * rhema-build.js harus dimuat sebelum script ini.
 */
(function () {
  if (window.__rhemaPreviewBootstrapped) return;
  window.__rhemaPreviewBootstrapped = true;

  const host = location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (!isLocal) return;

  if (window.Capacitor?.isNativePlatform?.()) return;

  const build = window.__RHEMA_BUILD__ || { id: "unknown", androidParity: true };
  window.__RHEMA_ANDROID_PARITY__ = true;

  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "android",
    Plugins: window.Capacitor?.Plugins || {},
  };

  document.documentElement.classList.add("rhema-android-parity");

  /** WebView Android tidak punya speechSynthesis — PC preview meniru batas ini. */
  try {
    const speechStub = {
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () => [],
      speak: () => {},
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      onvoiceschanged: null,
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: speechStub,
      configurable: true,
      writable: true,
    });
  } catch {
    /* ignore */
  }

  const BUILD = String(build.id || "unknown");
  try {
    const prev = sessionStorage.getItem("rhema-preview-build");
    if (prev && prev !== BUILD) {
      sessionStorage.setItem("rhema-preview-build", BUILD);
      location.reload();
      return;
    }
    sessionStorage.setItem("rhema-preview-build", BUILD);
  } catch {
    /* private mode */
  }

  if (!document.getElementById("rhema-preview-build-badge")) {
    const badge = document.createElement("div");
    badge.id = "rhema-preview-build-badge";
    badge.textContent = `Build ${BUILD} · parity Android`;
    badge.setAttribute("aria-hidden", "true");
    document.body.appendChild(badge);
  }

  if ("caches" in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    }).catch(() => {});
  }

  const legacyShare = document.getElementById("modal-share-verse");
  if (legacyShare && !legacyShare.classList.contains("apple-modal-overlay")) {
    legacyShare.remove();
  }
})();
