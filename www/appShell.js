/**
 * Navigasi utama — bottom bar + tombol back di semua halaman.
 */

import { registerScreenNavigator } from "./uiGuard.js";
import { resetViewportScroll } from "./mobileScroll.js";
import { ensureNativeMicPermission } from "./nativeMicPermission.js";
import { consumeByokOnboardingBack, isByokOnboardingOpen } from "./byokOnboarding.js";
import { consumeRegionOnboardingBack, isRegionOnboardingOpen } from "./regionOnboarding.js";

const STACK_SCREENS = new Set(["chat", "cloud"]);
const OVERLAY_SCREENS = new Set(["akun"]);

const TITLES = {
  home: "Alkitab AI Voice",
  alkitab: "Alkitab",
  renungan: "Renungan",
  doa: "Doa",
  voice: "Rhema AI",
  akun: "Akun",
  chat: "Rhema Agent",
  cloud: "Cloud Agents",
};

const WORSHIP_SCREENS = new Set(["home", "alkitab", "renungan", "doa", "voice"]);

/** @type {string} */
let currentScreen = "";
/** @type {string} */
let lastMainScreen = "home";
/** @type {string[]} */
const navHistory = [];
/** @type {Set<string>} */
const openSubViews = new Set();

/** @param {import("../shared/chatCore.js").ChatTransport} transport */
export function initAppShell(transport, hooks = {}) {
  const titleEl = document.getElementById("mobile-title");
  const backBtn = document.getElementById("btn-mobile-back");
  const akunBtn = document.getElementById("btn-header-akun");
  const bottomNav = document.querySelector(".bottom-nav");

  function isSettingsOpen() {
    const panel = document.getElementById("settings-panel");
    return Boolean(panel && !panel.classList.contains("hidden"));
  }

  function isSessionDrawerOpen() {
    const drawer = document.getElementById("session-drawer");
    return Boolean(drawer && !drawer.classList.contains("hidden"));
  }

  function isByokOnboardOpen() {
    return isRegionOnboardingOpen() || isByokOnboardingOpen();
  }

  function canGoBack() {
    if (isByokOnboardOpen()) return true;
    if (openSubViews.size > 0 || isSettingsOpen() || isSessionDrawerOpen()) return true;
    if (STACK_SCREENS.has(currentScreen) || OVERLAY_SCREENS.has(currentScreen)) return true;
    return navHistory.length > 0;
  }

  function syncBackButton() {
    const show = canGoBack();
    backBtn?.classList.toggle("hidden", !show);
    document.querySelectorAll("[data-rhema-back]").forEach((el) => {
      el.classList.toggle("hidden", !show);
    });
  }

  function pushNavHistory(from, to) {
    if (from === to) return;
    if (STACK_SCREENS.has(to) || OVERLAY_SCREENS.has(to)) return;
    if (STACK_SCREENS.has(from) || OVERLAY_SCREENS.has(from)) return;
    navHistory.push(from);
  }

  function setProfileForScreen(name) {
    const prev = transport.voiceProfile;
    const next = name === "chat" ? "rhema-ide" : WORSHIP_SCREENS.has(name) ? "alkitab-voice" : prev;
    if (next !== prev && transport.voice?.isActive?.()) {
      transport.voice.stop?.();
    }
    if (name === "chat") transport.voiceProfile = "rhema-ide";
    else if (WORSHIP_SCREENS.has(name)) transport.voiceProfile = "alkitab-voice";
  }

  /** @type {boolean} */
  let historyGuard = false;

  function pushNavState() {
    try {
      history.pushState({ rhema: currentScreen, sub: openSubViews.size }, "", `#${currentScreen}`);
    } catch {
      /* ignore */
    }
  }

  function emitNavRetap(name) {
    document.dispatchEvent(new CustomEvent("rhema-nav-retap", { detail: { screen: name } }));
  }

  function go(name, { skipHook = false, fromBack = false, force = false } = {}) {
    if (!name) return;
    if (window.__rhemaNavVoiceLongPressBlockNav) return;
    if (
      name === "voice" &&
      !force &&
      !fromBack &&
      Date.now() < Number(window.__rhemaInlineVoiceUntil || 0)
    ) {
      return;
    }
    if (name === currentScreen && document.querySelector(`.mobile-screen.active#screen-${name}`)) {
      emitNavRetap(name);
      return;
    }

    closeSettings();
    closeSessionDrawer();
    openSubViews.clear();

    const prev = currentScreen;

    if (!fromBack && prev && prev !== name) pushNavHistory(prev, name);

    if (!STACK_SCREENS.has(name) && !OVERLAY_SCREENS.has(name)) {
      lastMainScreen = name;
    } else if (OVERLAY_SCREENS.has(name) && !STACK_SCREENS.has(prev) && !OVERLAY_SCREENS.has(prev)) {
      lastMainScreen = prev;
    }

    currentScreen = name;

    resetViewportScroll();

    for (const el of document.querySelectorAll(".mobile-screen")) {
      const match = el.id === `screen-${name}`;
      el.classList.toggle("active", match);
      el.style.display = match ? "flex" : "none";
    }

    for (const btn of document.querySelectorAll(".bottom-nav .nav-item")) {
      const match = btn.getAttribute("data-screen") === name;
      btn.classList.toggle("active", match);
      if (match) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    }

    const hideNav = STACK_SCREENS.has(name) || OVERLAY_SCREENS.has(name);
    bottomNav?.classList.toggle("hidden", hideNav);
    akunBtn?.classList.toggle("hidden", hideNav);
    syncBackButton();

    if (titleEl) titleEl.textContent = TITLES[name] || name;

    setProfileForScreen(name);

    if (!skipHook) {
      document.dispatchEvent(new CustomEvent("rhema-screen", { detail: { screen: name } }));
      if (name === "home") hooks.onHome?.();
      if (name === "alkitab") hooks.onAlkitab?.();
      if (name === "renungan") hooks.onRenungan?.();
      if (name === "doa") hooks.onDoa?.();
      if (name === "voice") {
        hooks.onVoice?.();
        void ensureNativeMicPermission().catch(() => {});
      }
      if (name === "cloud") hooks.onCloud?.();
    }

    if (!fromBack && !historyGuard) pushNavState();
  }

  function closeSettings() {
    if (!isSettingsOpen()) return false;
    document.getElementById("btn-settings-close")?.click();
    if (isSettingsOpen()) document.getElementById("btn-settings")?.click();
    return true;
  }

  function closeSessionDrawer() {
    if (!isSessionDrawerOpen()) return false;
    document.getElementById("btn-sessions")?.click();
    return true;
  }

  function goBack() {
    if (consumeRegionOnboardingBack()) {
      syncBackButton();
      return;
    }
    if (consumeByokOnboardingBack()) {
      syncBackButton();
      return;
    }
    if (closeSettings()) {
      syncBackButton();
      return;
    }
    if (closeSessionDrawer()) {
      syncBackButton();
      return;
    }
    if (openSubViews.size > 0) {
      const subId = openSubViews.values().next().value;
      if (subId) {
        document.dispatchEvent(new CustomEvent("rhema-subview-back", { detail: subId }));
        return;
      }
    }
    if (STACK_SCREENS.has(currentScreen)) {
      go("akun", { fromBack: true });
      return;
    }
    if (OVERLAY_SCREENS.has(currentScreen)) {
      go(lastMainScreen || "home", { fromBack: true });
      return;
    }
    const prev = navHistory.pop();
    if (prev) go(prev, { fromBack: true });
  }

  document.querySelectorAll(".bottom-nav .nav-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (btn.classList.contains("nav-item-voice")) return;
      e.preventDefault();
      const s = btn.getAttribute("data-screen");
      if (s) go(s, { fromNav: true });
    });
  });

  // Fallback pointer — beberapa browser mobile gagal fire click
  document.addEventListener(
    "pointerup",
    (e) => {
      const target = /** @type {HTMLElement | null} */ (e.target);
      const navBtn = target?.closest(".bottom-nav .nav-item");
      if (navBtn) {
        if (navBtn.classList.contains("nav-item-voice")) return;
        const s = navBtn.getAttribute("data-screen");
        if (s) go(s, { fromNav: true });
        return;
      }
      const btn = target?.closest("button, [role='button'], .btn-pill, .nav-item");
      if (btn?.closest(".apple-modal-overlay:not(.hidden), .mobile-modal:not(.hidden), #settings-panel:not(.hidden)")) {
        return;
      }
    },
    true,
  );

  // Delegated fallback listener for bottom navigation
  document.addEventListener("click", (e) => {
    const navBtn = /** @type {HTMLElement | null} */ (e.target)?.closest(".bottom-nav .nav-item");
    if (navBtn) {
      if (navBtn.classList.contains("nav-item-voice")) return;
      const s = navBtn.getAttribute("data-screen");
      if (s) go(s);
    }
  });

  backBtn?.addEventListener("click", goBack);
  document.querySelectorAll("[data-rhema-back]").forEach((btn) => {
    btn.addEventListener("click", goBack);
  });

  akunBtn?.addEventListener("click", () => go("akun"));

  document.getElementById("btn-goto-renungan")?.addEventListener("click", () => go("renungan"));
  document.getElementById("home-streak-mini")?.addEventListener("click", () => go("renungan"));
  document.getElementById("home-streak-mini")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go("renungan");
    }
  });

  document.getElementById("btn-open-chat")?.addEventListener("click", () => go("chat"));
  document.getElementById("btn-open-cloud")?.addEventListener("click", () => go("cloud"));

  document.getElementById("btn-open-settings")?.addEventListener("click", () => {
    const panel = document.getElementById("settings-panel");
    if (panel?.parentElement?.classList.contains("mobile-settings")) {
      document.body.appendChild(panel);
    }
    if (panel && !document.getElementById("btn-settings-close")) {
      panel.insertAdjacentHTML(
        "afterbegin",
        '<button id="btn-settings-close" type="button" class="settings-close">← Tutup</button>',
      );
      document.getElementById("btn-settings-close")?.addEventListener("click", () => {
        document.getElementById("btn-settings")?.click();
        syncBackButton();
      });
    }
    document.getElementById("btn-settings")?.click();
    syncBackButton();
  });

  document.addEventListener("rhema-subview", (e) => {
    const detail = /** @type {CustomEvent<{id?: string, open?: boolean}>} */ (e).detail;
    const id = detail?.id;
    if (!id) return;
    if (detail.open) openSubViews.add(id);
    else openSubViews.delete(id);
    syncBackButton();
  });

  document.addEventListener("rhema-nav", (e) => {
    const name = /** @type {CustomEvent} */ (e).detail;
    if (name) go(String(name));
  });

  window.addEventListener("popstate", () => {
    historyGuard = true;
    goBack();
    historyGuard = false;
  });

  document.addEventListener("rhema-hardware-back", () => {
    if (canGoBack()) goBack();
  });

  function resolveBootScreen() {
    const hash = (location.hash || "").replace(/^#/, "");
    if (hash.startsWith("alkitab")) return "alkitab";
    if (hash === "renungan" || hash === "doa" || hash === "home") return hash;
    return "home";
  }

  try {
    const boot = resolveBootScreen();
    history.replaceState({ rhema: boot }, "", `#${boot}`);
  } catch {
    /* ignore */
  }

  go(resolveBootScreen());
  syncBackButton();

  registerScreenNavigator(go);
  /** @type {typeof go} */
  window.__rhemaGo = go;

  return { go, goBack, getCurrentScreen: () => currentScreen };
}
