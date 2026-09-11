/**
 * Terapkan UI bilingual saat boot & saat region berubah.
 */
import { getGreetingPhrase, getHeroBibleSub, t } from "./uiStrings.js";
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
      /** @type {HTMLInputElement} */ (el).placeholder = val;
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

  document.querySelectorAll(".mobile-screen[data-title-key]").forEach((el) => {
    const key = el.getAttribute("data-title-key");
    if (key) el.setAttribute("data-title", t(key));
  });

  document.dispatchEvent(new CustomEvent("rhema-locale-ui-applied"));
}

export function initLocaleUi() {
  applyLocaleUi();
  document.addEventListener("rhema-locale-changed", () => applyLocaleUi());
}
