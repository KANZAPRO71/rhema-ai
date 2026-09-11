/**
 * Navigasi darurat — jalan sebelum main.js selesai load.
 * Menjamin tab bawah (termasuk Rhema AI) selalu merespons tap/klik.
 */
(function () {
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

  /** Tab default saat cold start — Beranda, bukan Voice. */
  const BOOT_SCREENS = new Set(["home", "alkitab", "renungan", "doa"]);

  function resolveBootScreen() {
    const hash = (location.hash || "").replace(/^#/, "");
    if (hash.startsWith("alkitab")) return "alkitab";
    if (BOOT_SCREENS.has(hash)) return hash;
    return "home";
  }

  /** @type {string} */
  let current = "home";

  function dismissOverlays() {
    document.getElementById("settings-panel")?.classList.add("hidden");
    document.getElementById("session-drawer")?.classList.add("hidden");
    const shareModal = document.getElementById("modal-share-verse");
    if (shareModal) {
      shareModal.classList.add("hidden");
      shareModal.classList.remove("active");
    }
    document.getElementById("modal-ambient-picker")?.classList.add("hidden");
    document.getElementById("approval-host")?.classList.remove("blocking");
    document.body.style.pointerEvents = "";
    document.documentElement.style.pointerEvents = "";
    document.body.style.overflow = "";
    for (const el of document.querySelectorAll(
      "body > .apple-modal-overlay:not(#modal-share-verse):not(#sermon-assistant-modal), body > #rhema-story-modal, body > #lectio-divina-modal",
    )) {
      el.remove();
    }
  }

  function flashNav(name) {
    const btn = document.querySelector(`.bottom-nav .nav-item[data-screen="${name}"]`);
    if (!btn) return;
    btn.classList.add("nav-tap-flash");
    window.setTimeout(() => btn.classList.remove("nav-tap-flash"), 200);
  }

  function readActiveScreen() {
    const active = document.querySelector(".mobile-screen.active");
    if (!active?.id?.startsWith("screen-")) return current;
    return active.id.slice("screen-".length);
  }

  function fallbackGo(name) {
    if (!name) return;
    dismissOverlays();
    const prev = readActiveScreen();
    current = name;

    try {
      window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    for (const el of document.querySelectorAll(".mobile-screen")) {
      const on = el.id === `screen-${name}`;
      el.classList.toggle("active", on);
      el.style.display = on ? "flex" : "none";
    }

    for (const btn of document.querySelectorAll(".bottom-nav .nav-item")) {
      const on = btn.getAttribute("data-screen") === name;
      btn.classList.toggle("active", on);
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    }

    const title = document.getElementById("mobile-title");
    if (title && TITLES[name]) title.textContent = TITLES[name];

    try {
      history.replaceState({ rhema: name }, "", `#${name}`);
    } catch {
      /* ignore */
    }

    document.dispatchEvent(new CustomEvent("rhema-screen", { detail: { screen: name } }));
    if (name === prev) {
      document.dispatchEvent(new CustomEvent("rhema-nav-retap", { detail: { screen: name } }));
    }
  }

  function navigate(name) {
    if (!name) return;
    if (name === "voice" && Date.now() < Number(window.__rhemaInlineVoiceUntil || 0)) {
      flashNav(name);
      dismissOverlays();
      return;
    }
    flashNav(name);
    dismissOverlays();

    const fn = window.__rhemaGo;
    if (typeof fn === "function") fn(name);
    else fallbackGo(name);
  }

  /** @type {number} */
  let lastNavAt = 0;

  function onNavEvent(e) {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    const navBtn = target.closest(".bottom-nav .nav-item[data-screen]");
    if (!navBtn) return;

    // Tab mic tengah — tap/navigasi & long-press live di-handle khusus di alkitabPanel.js
    if (navBtn.classList.contains("nav-item-voice")) return;

    const screen = navBtn.getAttribute("data-screen");
    if (!screen) return;

    if (window.__rhemaNavVoiceLongPressBlockNav) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const now = Date.now();
    if (now - lastNavAt < 280) return;
    lastNavAt = now;

    e.preventDefault();
    e.stopPropagation();
    navigate(screen);
  }

  dismissOverlays();
  document.addEventListener("click", onNavEvent, true);
  document.addEventListener("touchend", onNavEvent, true);
  document.addEventListener("pointerup", onNavEvent, true);

  const bootScreen = resolveBootScreen();
  current = bootScreen;
  fallbackGo(bootScreen);

  window.__rhemaNavBootstrap = navigate;
})();
