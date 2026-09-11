/**
 * Pastikan tidak ada overlay/modal nyangkut yang memblokir tap/klik.
 * + fallback delegasi klik jika listener per-komponen gagal terpasang.
 */

/** @type {((name: string, opts?: object) => void) | null} */
let goScreen = null;

export function registerScreenNavigator(fn) {
  goScreen = fn;
}

const REMOVABLE_OVERLAY_SELECTOR =
  "body > .apple-modal-overlay:not(#modal-share-verse):not(#sermon-assistant-modal), body > #rhema-story-modal, body > #lectio-divina-modal";

function hideShareModal() {
  const shareModal = document.getElementById("modal-share-verse");
  if (!shareModal) return;
  shareModal.classList.add("hidden");
  shareModal.classList.remove("active");
}

export function dismissBlockingOverlays() {
  const settings = document.getElementById("settings-panel");
  if (settings) settings.classList.add("hidden");

  const drawer = document.getElementById("session-drawer");
  if (drawer) drawer.classList.add("hidden");

  hideShareModal();
  document.getElementById("modal-ambient-picker")?.classList.add("hidden");

  document.getElementById("approval-host")?.classList.remove("blocking");

  for (const el of document.querySelectorAll(REMOVABLE_OVERLAY_SELECTOR)) {
    el.remove();
  }

  document.body.style.pointerEvents = "";
  document.body.style.overflow = "";
  document.documentElement.style.pointerEvents = "";
}

function isInteractiveOpen(el) {
  return Boolean(
    el?.closest(
      ".apple-modal-overlay.active, .mobile-modal:not(.hidden), #settings-panel:not(.hidden), .session-drawer:not(.hidden), #byok-onboard.active",
    ),
  );
}

/** @type {Record<string, string>} */
const RESCUE_NAV_IDS = {
  "btn-header-akun": "akun",
  "btn-alkitab-voice-hero": "voice",
  "btn-goto-renungan": "renungan",
  "home-streak-mini": "renungan",
  "btn-open-chat": "chat",
  "btn-open-cloud": "cloud",
};

function resolveGo() {
  if (goScreen) return goScreen;
  const w = /** @type {{ __rhemaGo?: (name: string) => void, __rhemaNavBootstrap?: (name: string) => void }} */ (window);
  if (typeof w.__rhemaGo === "function") return w.__rhemaGo;
  if (typeof w.__rhemaNavBootstrap === "function") return w.__rhemaNavBootstrap;
  return null;
}

function handleRescueClick(e) {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;

  const stuckOverlay = target.closest("body > .apple-modal-overlay.active");
  if (stuckOverlay && (target === stuckOverlay || target.classList.contains("modal-backdrop"))) {
    if (stuckOverlay.id === "modal-share-verse") {
      hideShareModal();
      document.body.style.overflow = "";
    } else {
      stuckOverlay.remove();
    }
    dismissBlockingOverlays();
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const navBtn = target.closest(".bottom-nav .nav-item[data-screen]");
  if (navBtn) {
    if (navBtn.classList.contains("nav-item-voice")) return;
    if (window.__rhemaNavVoiceLongPressBlockNav) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    dismissBlockingOverlays();
    const screen = navBtn.getAttribute("data-screen");
    const go = resolveGo();
    if (screen && go) {
      e.preventDefault();
      e.stopPropagation();
      go(screen, { fromNav: true });
    }
    return;
  }

  if (isInteractiveOpen(target)) return;

  const screenBtn = target.closest("[data-rhema-screen]");
  if (screenBtn) {
    const screen = screenBtn.getAttribute("data-rhema-screen");
    const go = resolveGo();
    if (screen && go) {
      e.preventDefault();
      e.stopPropagation();
      go(screen);
    }
    return;
  }

  const go = resolveGo();
  if (!go) return;
  for (const [id, screen] of Object.entries(RESCUE_NAV_IDS)) {
    if (target.closest(`#${id}`)) {
      e.preventDefault();
      e.stopPropagation();
      if (id === "btn-alkitab-voice-hero" && typeof window.__rhemaStartVoiceLive === "function") {
        window.__rhemaStartVoiceLive();
        return;
      }
      go(screen);
      return;
    }
  }
}

export function initUiGuard() {
  dismissBlockingOverlays();

  document.addEventListener("click", handleRescueClick, true);
  document.addEventListener("touchend", handleRescueClick, true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dismissBlockingOverlays();
  });

  // Jangan tutup modal share saat alt-tab — hanya pulihkan pointer-events.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      document.body.style.pointerEvents = "";
      document.documentElement.style.pointerEvents = "";
    }
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      document.body.style.pointerEvents = "";
      document.documentElement.style.pointerEvents = "";
    }
  });
}
