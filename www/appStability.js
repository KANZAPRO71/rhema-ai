/**
 * Guard stabilitas — tangkap error JS agar WebView tidak blank / hang (Play Store Vitals).
 */

let installed = false;

function logStability(kind, detail) {
  try {
    console.warn(`[rhema-stability] ${kind}`, detail);
  } catch {
    /* ignore */
  }
}

/** Pasang handler global — panggil sekali di boot main.js. */
export function initAppStability() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (ev) => {
    logStability("error", ev.error || ev.message || ev);
    return false;
  });

  window.addEventListener("unhandledrejection", (ev) => {
    logStability("unhandledrejection", ev.reason);
    ev.preventDefault();
  });

  window.addEventListener("pagehide", () => {
    document.dispatchEvent(new CustomEvent("rhema-app-background", { detail: { reason: "pagehide" } }));
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      document.dispatchEvent(new CustomEvent("rhema-app-background", { detail: { reason: "visibility" } }));
    } else if (document.visibilityState === "visible") {
      document.dispatchEvent(new CustomEvent("rhema-app-foreground", { detail: { reason: "visibility" } }));
    }
  });
}
