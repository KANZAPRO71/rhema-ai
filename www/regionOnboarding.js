/**
 * Onboarding region ibadah — Indonesia vs Global (Play Store worldwide).
 */

import {
  detectDeviceSignals,
  getBootRegionSuggestion,
  isLocaleProfileConfigured,
  saveLocaleProfile,
  suggestRegion,
} from "./localeProfile.js";
import { getNativeDeviceLocaleHints } from "./deviceLocale.js";
import { applyLocaleUi } from "./localeUi.js";
import { t } from "./uiStrings.js";

export const REGION_DONE_KEY = "rhema-region-onboarding-done";
const BYOK_DONE_KEY = "rhema-byok-onboarding-done";

/** @type {((consumed: boolean) => void) | null} */
let backHandler = null;

export function isRegionOnboardingOpen() {
  const el = document.getElementById("region-onboard");
  return Boolean(el && el.classList.contains("active"));
}

function migrateLegacyUsers() {
  try {
    if (localStorage.getItem(BYOK_DONE_KEY) === "1") {
      saveLocaleProfile({
        region: "indonesia",
        bibleVersion: "tb",
        source: "migration-byok",
      });
      markRegionOnboardingComplete();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function shouldAutoOpenRegionOnboarding() {
  if (isLocaleProfileConfigured()) return false;
  if (localStorage.getItem(REGION_DONE_KEY) === "1") return false;
  if (migrateLegacyUsers()) return false;
  return true;
}

export function markRegionOnboardingComplete() {
  try {
    localStorage.setItem(REGION_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ onComplete?: () => void }} [opts]
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

  const signals = detectDeviceSignals();
  const suggested = suggestRegion();
  let selected = suggested;

  modal.innerHTML = `
    <div class="byok-onboard-sheet region-onboard-sheet">
      <p class="byok-kicker">${t("region.kicker")}</p>
      <h2 class="byok-onboard-title" id="region-onboard-title">${t("region.title")}</h2>
      <p class="byok-copy">${t("region.copy")}</p>

      <p class="region-detect-note" id="region-detect-note"></p>

      <div class="region-choice-grid" role="radiogroup" aria-label="${t("region.title")}">
        <button type="button" class="region-choice-card" data-region="indonesia" aria-pressed="${suggested === "indonesia"}">
          <span class="region-choice-flag">🇮🇩</span>
          <strong>${t("region.indonesia.title")}</strong>
          <span class="region-choice-sub">${t("region.indonesia.sub")}</span>
        </button>
        <button type="button" class="region-choice-card" data-region="global" aria-pressed="${suggested === "global"}">
          <span class="region-choice-flag">🌏</span>
          <strong>${t("region.global.title")}</strong>
          <span class="region-choice-sub">${t("region.global.sub")}</span>
        </button>
      </div>

      <p class="byok-fine">${t("region.fine")}</p>

      <div class="byok-onboard-footer region-onboard-footer">
        <button type="button" class="byok-btn byok-btn-primary" id="region-primary">${t("region.continue")}</button>
      </div>
    </div>
  `;

  modal.classList.add("active");
  document.body.classList.add("byok-onboard-open");

  const note = modal.querySelector("#region-detect-note");
  if (note) {
    const regionLabel = suggested === "indonesia" ? t("region.indonesia.title") : t("region.global.title");
    note.textContent = t("region.detectNote", {
      region: regionLabel,
      locale: signals.locale,
      timezone: signals.timezone,
    });
  }

  function syncCards() {
    modal.querySelectorAll(".region-choice-card").forEach((btn) => {
      const r = btn.getAttribute("data-region");
      const on = r === selected;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function finish() {
    saveLocaleProfile({
      region: selected,
      bibleVersion: selected === "global" ? "kjv" : "tb",
      source: selected === suggested ? "onboarding-suggested" : "onboarding-manual",
    });
    markRegionOnboardingComplete();
    modal.classList.remove("active");
    document.body.classList.remove("byok-onboard-open");
    backHandler = null;
    document.dispatchEvent(new CustomEvent("rhema-region-ready"));
    document.dispatchEvent(new CustomEvent("rhema-locale-changed"));
    opts.onComplete?.();
  }

  modal.querySelectorAll(".region-choice-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      selected = btn.getAttribute("data-region") === "global" ? "global" : "indonesia";
      syncCards();
    });
  });

  modal.querySelector("#region-primary")?.addEventListener("click", finish);

  backHandler = () => {
    finish();
    return true;
  };

  syncCards();
}

/** @returns {boolean} */
export function consumeRegionOnboardingBack() {
  if (!isRegionOnboardingOpen()) return false;
  return Boolean(backHandler?.());
}

/**
 * Zero-config boot: deteksi locale/timezone HP (native Android atau JS) → simpan region otomatis.
 * @returns {Promise<boolean>} true jika region baru diterapkan
 */
export async function bootstrapAutoRegionIfNeeded() {
  if (isLocaleProfileConfigured()) {
    markRegionOnboardingComplete();
    return false;
  }
  if (localStorage.getItem(REGION_DONE_KEY) === "1") return false;
  if (migrateLegacyUsers()) return true;

  const native = await getNativeDeviceLocaleHints();
  const signals = native
    ? { locale: native.language, timezone: native.timezone, suggestGlobal: native.suggestGlobal }
    : detectDeviceSignals();
  const region = suggestRegion(signals);

  saveLocaleProfile({
    region,
    bibleVersion: region === "global" ? "kjv" : "tb",
    source: native ? "auto-boot-native" : "auto-boot-js",
  });
  markRegionOnboardingComplete();
  applyLocaleUi();
  document.dispatchEvent(new CustomEvent("rhema-region-ready"));
  document.dispatchEvent(new CustomEvent("rhema-locale-changed"));

  const regionLabel =
    region === "global" ? t("region.global.title") : t("region.indonesia.title");
  document.dispatchEvent(
    new CustomEvent("rhema-alkitab-toast", {
      detail: t("region.autoApplied", { region: regionLabel }),
    }),
  );
  return true;
}

/** @param {import("./chatCore.js").ChatTransport} [_transport] */
export function initRegionOnboarding(_transport) {
  if (isLocaleProfileConfigured()) {
    markRegionOnboardingComplete();
    document.dispatchEvent(new CustomEvent("rhema-region-ready"));
    return;
  }

  void bootstrapAutoRegionIfNeeded();
}

/** Expose untuk debug / dokumentasi boot. */
export { getBootRegionSuggestion };
