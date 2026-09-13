/**
 * Bootstrap dev localhost — meniru APK Android (BYOK lokal, tanpa PC server).
 */
(function () {
  if (window.__rhemaDevLocalhost) return;
  window.__rhemaDevLocalhost = true;

  // Capacitor Android memakai host localhost — jangan timpa native bridge.
  if (window.Capacitor) return;
  const host = location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (!isLocal) return;

  window.__RHEMA_DEV__ = Object.freeze({
    mode: "localhost",
    port: Number(location.port) || 80,
    startedAt: new Date().toISOString(),
  });
  window.__RHEMA_ANDROID_PARITY__ = true;

  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "android",
    Plugins: window.Capacitor?.Plugins || {},
  };

  document.documentElement.classList.add("rhema-dev-localhost", "rhema-android-parity", "rhema-preview");

  try {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => [],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        onvoiceschanged: null,
      },
      configurable: true,
      writable: true,
    });
  } catch {
    /* ignore */
  }

  if ("caches" in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    }).catch(() => {});
  }

  if (!document.getElementById("rhema-dev-badge")) {
    const badge = document.createElement("div");
    badge.id = "rhema-dev-badge";
    badge.textContent = `Dev · ${location.host}`;
    badge.setAttribute("aria-hidden", "true");
    document.body.appendChild(badge);
  }

  const legacyShare = document.getElementById("modal-share-verse");
  if (legacyShare && !legacyShare.classList.contains("apple-modal-overlay")) {
    legacyShare.remove();
  }
})();
