/**
 * Onboarding region ibadah — Indonesia vs Global (Play Store worldwide).
 */

import {
  detectDeviceSignals,
  isLocaleProfileConfigured,
  saveLocaleProfile,
  suggestRegion,
} from "./localeProfile.js";
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
      <p class="byok-kicker">Welcome · Selamat datang</p>
      <h2 class="byok-onboard-title" id="region-onboard-title">Where do you worship from?</h2>
      <p class="byok-copy">Dari mana saudara beribadah? Kami menyesuaikan Alkitab, renungan, dan kidung.</p>

      <p class="region-detect-note" id="region-detect-note"></p>

      <div class="region-choice-grid" role="radiogroup" aria-label="Pilih region ibadah">
        <button type="button" class="region-choice-card" data-region="indonesia" aria-pressed="${suggested === "indonesia"}">
          <span class="region-choice-flag">🇮🇩</span>
          <strong>Indonesia</strong>
          <span class="region-choice-sub">TB LAI · Kidung Jemaat · renungan konteks Indonesia</span>
        </button>
        <button type="button" class="region-choice-card" data-region="global" aria-pressed="${suggested === "global"}">
          <span class="region-choice-flag">🌏</span>
          <strong>Outside Indonesia</strong>
          <span class="region-choice-sub">KJV default · English devotion · global context</span>
        </button>
      </div>

      <p class="byok-fine">Bisa diubah kapan saja di Akun → Pengaturan → Region Ibadah.</p>

      <div class="byok-onboard-footer region-onboard-footer">
        <button type="button" class="byok-btn byok-btn-primary" id="region-primary">Lanjutkan / Continue</button>
      </div>
    </div>
  `;

  modal.classList.add("active");
  document.body.classList.add("byok-onboard-open");

  const note = modal.querySelector("#region-detect-note");
  if (note) {
    note.textContent = `Saran: ${suggested === "indonesia" ? "Indonesia" : "Global"} — bahasa perangkat ${signals.locale}, zona waktu ${signals.timezone}.`;
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

/** @param {import("./chatCore.js").ChatTransport} [_transport] */
export function initRegionOnboarding(_transport) {
  if (isLocaleProfileConfigured()) markRegionOnboardingComplete();

  if (shouldAutoOpenRegionOnboarding()) {
    window.setTimeout(() => openRegionOnboarding(), 120);
  }
}
