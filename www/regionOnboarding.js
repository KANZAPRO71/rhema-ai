/**
 * Wizard bahasa awal — UI, Alkitab, dan percakapan AI.
 * Default mengikuti locale/timezone perangkat (ID+TB atau EN+KJV).
 */

import {
  APP_LANGUAGES,
  applyNativeLocaleHints,
  getEffectiveProfile,
  languageNativeName,
  saveLocaleProfile,
  setUiLangOverride,
} from "./localeProfile.js";
import { getNativeDeviceLocaleHints } from "./deviceLocale.js";
import { escapeHtml } from "./markdown.js";
import { t } from "./uiStrings.js";

export const REGION_DONE_KEY = "rhema-region-onboarding-done";
export const LANG_WIZARD_KEY = "rhema-lang-wizard-done";

/** @type {((consumed: boolean) => void) | null} */
let backHandler = null;

export function isRegionOnboardingOpen() {
  const el = document.getElementById("region-onboard");
  return Boolean(el && el.classList.contains("active"));
}

export function isLanguageWizardComplete() {
  try {
    return localStorage.getItem(LANG_WIZARD_KEY) === "1";
  } catch {
    return false;
  }
}

export function shouldAutoOpenRegionOnboarding() {
  return !isLanguageWizardComplete();
}

export function markRegionOnboardingComplete() {
  try {
    localStorage.setItem(REGION_DONE_KEY, "1");
    localStorage.setItem(LANG_WIZARD_KEY, "1");
  } catch {
    /* ignore */
  }
}

function suggestedBibleForLang(uiLang) {
  return uiLang === "id" ? "tb" : "kjv";
}

function bibleLabel(version) {
  return version === "tb" ? t("langWizard.bible.tb") : t("langWizard.bible.kjv");
}

/**
 * @param {{ onComplete?: () => void, source?: string }} [opts]
 */
export function openRegionOnboarding(opts = {}) {
  let modal = document.getElementById("region-onboard");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "region-onboard";
    modal.className = "byok-onboard region-onboard";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "region-onboard-title");
    document.body.appendChild(modal);
  }

  const existing = getEffectiveProfile();
  let step = 0;
  let uiLang = existing?.uiLang || "en";
  let bibleVersion = existing?.bibleVersion || (uiLang === "id" ? "tb" : "kjv");
  let aiLang = existing?.aiLang || uiLang;
  let bibleTouched = Boolean(getEffectiveProfile()?.source?.startsWith("manual") || isLanguageWizardComplete());
  let aiTouched = bibleTouched;

  setUiLangOverride(uiLang);

  function render() {
    const titles = [t("langWizard.title.lang"), t("langWizard.title.bible"), t("langWizard.title.ai")];
    const copies = [t("langWizard.copy.lang"), t("langWizard.copy.bible"), t("langWizard.copy.ai")];
    modal.innerHTML = `
      <div class="byok-onboard-sheet region-onboard-sheet lang-wizard-sheet">
        <div class="byok-onboard-progress" aria-hidden="true">
          <span class="byok-dot ${step === 0 ? "is-on" : "is-done"}"></span>
          <span class="byok-dot ${step === 1 ? "is-on" : step > 1 ? "is-done" : ""}"></span>
          <span class="byok-dot ${step === 2 ? "is-on" : ""}"></span>
        </div>
        <p class="byok-kicker">${t("langWizard.kicker")}</p>
        <h2 class="byok-onboard-title" id="region-onboard-title">${titles[step]}</h2>
        <p class="byok-copy">${copies[step]}</p>
        <div class="lang-wizard-body" id="lang-wizard-body"></div>
        <p class="byok-fine">${step === 2 ? t("langWizard.summary", {
          lang: languageNativeName(uiLang),
          bible: bibleLabel(bibleVersion),
          ai: languageNativeName(aiLang),
        }) : t("langWizard.fine")}</p>
        <div class="byok-onboard-footer region-onboard-footer">
          <button type="button" class="byok-btn byok-btn-ghost" id="region-back"${step === 0 ? " hidden" : ""}>${t("langWizard.back")}</button>
          <button type="button" class="byok-btn byok-btn-primary" id="region-primary">${step === 2 ? t("langWizard.done") : t("langWizard.continue")}</button>
        </div>
      </div>
    `;
    fillStepBody(modal.querySelector("#lang-wizard-body"));
    modal.querySelector("#region-back")?.addEventListener("click", () => {
      if (step > 0) {
        step -= 1;
        render();
      }
    });
    modal.querySelector("#region-primary")?.addEventListener("click", () => {
      if (step < 2) {
        step += 1;
        render();
        return;
      }
      finish();
    });
  }

  /** @param {Element | null} body */
  function fillStepBody(body) {
    if (!body) return;
    if (step === 0) {
      body.innerHTML = `<div class="region-choice-grid lang-choice-grid" role="radiogroup" aria-label="${t("langWizard.title.lang")}"></div>`;
      const grid = body.querySelector(".lang-choice-grid");
      for (const lang of APP_LANGUAGES) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "region-choice-card lang-choice-card";
        btn.dataset.lang = lang.id;
        btn.setAttribute("aria-pressed", lang.id === uiLang ? "true" : "false");
        if (lang.id === uiLang) btn.classList.add("is-selected");
        btn.innerHTML = `<span class="region-choice-flag">${lang.flag}</span><strong>${escapeHtml(lang.native)}</strong>`;
        btn.addEventListener("click", () => {
          uiLang = lang.id;
          setUiLangOverride(uiLang);
          if (!bibleTouched) bibleVersion = suggestedBibleForLang(uiLang);
          if (!aiTouched) aiLang = uiLang;
          render();
        });
        grid?.appendChild(btn);
      }
      return;
    }

    if (step === 1) {
      body.innerHTML = `
        <div class="region-choice-grid" role="radiogroup" aria-label="${t("langWizard.title.bible")}">
          <button type="button" class="region-choice-card${bibleVersion === "kjv" ? " is-selected" : ""}" data-bible="kjv" aria-pressed="${bibleVersion === "kjv"}">
            <span class="region-choice-flag">📖</span>
            <strong>${t("langWizard.bible.kjv")}</strong>
            <span class="region-choice-sub">${t("langWizard.bible.kjv.sub")}</span>
          </button>
          <button type="button" class="region-choice-card${bibleVersion === "tb" ? " is-selected" : ""}" data-bible="tb" aria-pressed="${bibleVersion === "tb"}">
            <span class="region-choice-flag">📖</span>
            <strong>${t("langWizard.bible.tb")}</strong>
            <span class="region-choice-sub">${t("langWizard.bible.tb.sub")}</span>
          </button>
        </div>`;
      body.querySelectorAll("[data-bible]").forEach((btn) => {
        btn.addEventListener("click", () => {
          bibleVersion = btn.getAttribute("data-bible") === "tb" ? "tb" : "kjv";
          bibleTouched = true;
          render();
        });
      });
      return;
    }

    body.innerHTML = `<div class="region-choice-grid lang-choice-grid" role="radiogroup" aria-label="${t("langWizard.title.ai")}"></div>`;
    const grid = body.querySelector(".lang-choice-grid");
    for (const lang of APP_LANGUAGES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "region-choice-card lang-choice-card";
      btn.dataset.lang = lang.id;
      btn.setAttribute("aria-pressed", lang.id === aiLang ? "true" : "false");
      if (lang.id === aiLang) btn.classList.add("is-selected");
      btn.innerHTML = `<span class="region-choice-flag">${lang.flag}</span><strong>${escapeHtml(lang.native)}</strong>`;
      btn.addEventListener("click", () => {
        aiLang = lang.id;
        aiTouched = true;
        render();
      });
      grid?.appendChild(btn);
    }
  }

  function finish() {
    modal.classList.remove("active");
    document.body.classList.remove("byok-onboard-open");
    backHandler = null;
    window.setTimeout(() => {
      try {
        saveLocaleProfile({
          region: uiLang === "id" ? "indonesia" : "global",
          uiLang,
          aiLang,
          bibleVersion,
          source: opts.source || "language-wizard",
        });
        markRegionOnboardingComplete();
        setUiLangOverride(null);
        document.dispatchEvent(new CustomEvent("rhema-region-ready"));
      } catch (err) {
        console.warn("[rhema] language wizard finish:", err);
      }
    }, 40);
  }

  modal.classList.add("active");
  document.body.classList.add("byok-onboard-open");
  backHandler = () => {
    if (step > 0) {
      step -= 1;
      render();
      return true;
    }
    finish();
    return true;
  };
  render();
}

/** @returns {boolean} */
export function consumeRegionOnboardingBack() {
  if (!isRegionOnboardingOpen()) return false;
  return Boolean(backHandler?.());
}

/** @returns {Promise<boolean>} */
export async function bootstrapAutoRegionIfNeeded() {
  if (isLanguageWizardComplete()) {
    markRegionOnboardingComplete();
    return false;
  }
  const hints = await getNativeDeviceLocaleHints();
  if (hints) applyNativeLocaleHints(hints);
  return false;
}

/** @param {import("./chatCore.js").ChatTransport} [_transport] */
function whenLaunchSplashGone(fn) {
  const start = Date.now();
  const tick = () => {
    const splash = document.getElementById("rhema-launch-splash");
    const gone = !splash || splash.classList.contains("rhema-launch-splash--hide");
    if (gone || Date.now() - start > 3200) {
      fn();
      return;
    }
    window.setTimeout(tick, 80);
  };
  tick();
}

export function initRegionOnboarding(_transport) {
  if (isLanguageWizardComplete()) {
    markRegionOnboardingComplete();
    document.dispatchEvent(new CustomEvent("rhema-region-ready"));
    return;
  }
  whenLaunchSplashGone(() => {
    void bootstrapAutoRegionIfNeeded().finally(() => {
      openRegionOnboarding();
    });
  });
}
