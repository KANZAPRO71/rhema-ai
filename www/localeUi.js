/**
 * Terapkan UI bilingual saat boot & saat region berubah.
 */
import { getBibleReadKicker, getGreetingPhrase, getHeroBibleSub, t } from "./uiStrings.js";
import { getEffectiveUiLang } from "./localeProfile.js";

/** Terapkan semua elemen [data-i18n]. */
export function applyLocaleUi() {
  const lang = getEffectiveUiLang();
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      /** @type {HTMLInputElement | HTMLTextAreaElement} */ (el).placeholder = val;
    } else {
      el.textContent = val;
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = t(key);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });

  const greeting = document.getElementById("home-greeting");
  if (greeting && !greeting.dataset.userGreeting) {
    greeting.textContent = getGreetingPhrase();
  }

  const heroSub = document.querySelector(".beranda-hero-sub");
  if (heroSub) heroSub.textContent = getHeroBibleSub();

  const bibleKicker = document.querySelector(".alkitab-section-kicker");
  if (bibleKicker) bibleKicker.textContent = getBibleReadKicker();

  document.querySelectorAll(".mobile-screen[data-title-key]").forEach((el) => {
    const key = el.getAttribute("data-title-key");
    if (key) el.setAttribute("data-title", t(key));
  });

  const streakBtn = document.getElementById("home-streak-mini");
  if (streakBtn) streakBtn.setAttribute("aria-label", t("home.streak.aria"));

  document.dispatchEvent(new CustomEvent("rhema-locale-ui-applied"));
}

export function initLocaleUi() {
  applyLocaleUi();
  document.addEventListener("rhema-locale-changed", () => {
    applyLocaleUi();
    document.dispatchEvent(new CustomEvent("rhema-locale-home-refresh"));
  });
  document.addEventListener("rhema-locale-ui-applied", () => {
    document.dispatchEvent(new CustomEvent("rhema-locale-home-refresh"));
  });
}
