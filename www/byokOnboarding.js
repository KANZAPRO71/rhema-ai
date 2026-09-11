/**
 * Onboarding BYOK (Bring Your Own Key) — Play Store.
 * Gemini API key milik pengguna, tersimpan hanya di perangkat.
 */

import { getStoredGoogleKey, googleKeyConfigured, setStoredGoogleKey, validateGoogleKeyForVoice } from "./geminiConstants.js";

export const BYOK_DONE_KEY = "rhema-byok-onboarding-done";
export const BYOK_DEFERRED_KEY = "rhema-byok-onboarding-deferred";
export const AISTUDIO_KEY_URL = "https://aistudio.google.com/apikey";

const STEPS = 4;

/** @type {((consumed: boolean) => void) | null} */
let backHandler = null;

export function isByokOnboardingOpen() {
  const el = document.getElementById("byok-onboard");
  return Boolean(el && el.classList.contains("active"));
}

export function shouldAutoOpenByokOnboarding() {
  if (googleKeyConfigured()) return false;
  if (localStorage.getItem(BYOK_DONE_KEY) === "1") return false;
  if (localStorage.getItem(BYOK_DEFERRED_KEY) === "1") return false;
  return true;
}

export function markByokComplete() {
  try {
    localStorage.setItem(BYOK_DONE_KEY, "1");
    localStorage.removeItem(BYOK_DEFERRED_KEY);
  } catch {
    /* ignore */
  }
}

export function markByokDeferred() {
  try {
    localStorage.setItem(BYOK_DEFERRED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function syncByokHomeBanner() {
  const banner = document.getElementById("byok-home-banner");
  if (!banner) return;
  const need = !googleKeyConfigured();
  banner.classList.toggle("hidden", !need);
  banner.setAttribute("aria-hidden", need ? "false" : "true");
}

/** @param {string} url */
async function openExternalUrl(url) {
  try {
    if (window.Capacitor?.Plugins?.Browser?.open) {
      await window.Capacitor.Plugins.Browser.open({ url });
      return;
    }
  } catch {
    /* fall through */
  }
  window.open(url, "_blank", "noopener");
}

/**
 * @param {{ startStep?: number }} [opts]
 */
export function openByokOnboarding(opts = {}) {
  let modal = document.getElementById("byok-onboard");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "byok-onboard";
    modal.className = "byok-onboard";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "byok-onboard-title");
    document.body.appendChild(modal);
  }

  let step = Math.min(STEPS, Math.max(1, Number(opts.startStep) || 1));

  modal.innerHTML = `
    <div class="byok-onboard-sheet">
      <div class="byok-onboard-progress" aria-hidden="true">
        ${[1, 2, 3, 4].map((n) => `<span class="byok-dot" data-n="${n}"></span>`).join("")}
      </div>

      <div class="byok-step" data-step="1">
        <p class="byok-kicker">Selamat datang</p>
        <h2 class="byok-onboard-title" id="byok-onboard-title">Rhema AI siap menemani saat teduh Anda</h2>
        <p class="byok-copy">Alkitab TB LAI, renungan, doa, dan suara live. Untuk mengaktifkan AI, Anda memakai <strong>API key Google Gemini milik sendiri</strong> — gratis dari Google AI Studio.</p>
        <p class="byok-fine">AI menemani ibadah — bukan pengganti pendeta atau doa pribadi. <a href="/privacy.html">Kebijakan Privasi</a></p>
      </div>

      <div class="byok-step hidden" data-step="2">
        <p class="byok-kicker">Bring Your Own Key</p>
        <h2 class="byok-onboard-title">Key Anda, di HP Anda</h2>
        <ul class="byok-points">
          <li><strong>Privasi</strong> — key tidak dikirim ke server Rhema. Hanya tersimpan di perangkat ini.</li>
          <li><strong>Kuota milik Anda</strong> — Google memberi kuota gratis. Habis? ganti key di Pengaturan.</li>
          <li><strong>Tanpa langganan app</strong> — Rhema tidak menjual API. Anda bawa key sendiri.</li>
        </ul>
      </div>

      <div class="byok-step hidden" data-step="3">
        <p class="byok-kicker">Ambil key gratis</p>
        <h2 class="byok-onboard-title">Tiga langkah di Google AI Studio</h2>
        <ol class="byok-steps-ol">
          <li>Buka <strong>Google AI Studio</strong> dan masuk dengan akun Google.</li>
          <li>Pilih <strong>Get API key</strong> → <strong>Create API key</strong>.</li>
          <li>Salin key, lalu tempel di langkah berikutnya.</li>
        </ol>
        <button type="button" class="byok-btn byok-btn-studio" id="byok-open-studio">Buka aistudio.google.com</button>
        <p class="byok-fine">Butuh jaringan. Key biasanya dimulai dengan AIza…</p>
      </div>

      <div class="byok-step hidden" data-step="4">
        <p class="byok-kicker">Aktifkan AI</p>
        <h2 class="byok-onboard-title">Tempel Gemini API key</h2>
        <label class="byok-field-label" for="byok-onboard-key">API key</label>
        <input id="byok-onboard-key" class="byok-key-input" type="password" autocomplete="off" spellcheck="false" placeholder="AIza… atau key Google AI Studio" />
        <button type="button" class="byok-toggle-vis" id="byok-toggle-vis">Tampilkan</button>
        <p class="byok-status" id="byok-onboard-status" aria-live="polite"></p>
      </div>

      <div class="byok-onboard-footer">
        <button type="button" class="byok-btn byok-btn-ghost" id="byok-secondary"></button>
        <button type="button" class="byok-btn byok-btn-primary" id="byok-primary"></button>
      </div>
      <button type="button" class="byok-skip" id="byok-skip">Jelajahi Alkitab dulu — AI bisa nanti</button>
    </div>
  `;

  modal.classList.add("active");
  document.body.classList.add("byok-onboard-open");

  const primary = modal.querySelector("#byok-primary");
  const secondary = modal.querySelector("#byok-secondary");
  const skip = modal.querySelector("#byok-skip");
  const statusEl = modal.querySelector("#byok-onboard-status");
  const input = /** @type {HTMLInputElement | null} */ (modal.querySelector("#byok-onboard-key"));
  const visBtn = modal.querySelector("#byok-toggle-vis");

  function setStatus(text, kind = "") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = kind ? `byok-status ${kind}` : "byok-status";
  }

  function renderStep() {
    modal.querySelectorAll(".byok-step").forEach((el) => {
      const n = Number(el.getAttribute("data-step"));
      el.classList.toggle("hidden", n !== step);
    });
    modal.querySelectorAll(".byok-dot").forEach((el) => {
      const n = Number(el.getAttribute("data-n"));
      el.classList.toggle("is-on", n === step);
      el.classList.toggle("is-done", n < step);
    });
    if (secondary) {
      secondary.hidden = step === 1;
      secondary.textContent = "Kembali";
    }
    if (primary) {
      primary.disabled = false;
      if (step < 4) primary.textContent = "Lanjut";
      else primary.textContent = "Simpan & mulai";
    }
    if (skip) skip.hidden = step === 4;
    if (step === 4) {
      requestAnimationFrame(() => input?.focus());
    }
  }

  function close() {
    modal.classList.remove("active");
    document.body.classList.remove("byok-onboard-open");
    backHandler = null;
    syncByokHomeBanner();
  }

  function deferAndClose() {
    markByokDeferred();
    close();
    document.dispatchEvent(
      new CustomEvent("rhema-alkitab-toast", {
        detail: "Alkitab siap. Aktifkan suara AI kapan saja lewat banner atau Akun → Pengaturan.",
      }),
    );
  }

  async function saveKey() {
    const key = (input?.value || "").trim();
    if (key.length < 16) {
      setStatus("Tempel API key yang disalin dari Google AI Studio.", "err");
      input?.focus();
      return;
    }
    if (primary) primary.disabled = true;
    setStatus("Memeriksa key…", "");
    setStoredGoogleKey(key);
    const check = await validateGoogleKeyForVoice();
    if (!check.ok) {
      setStoredGoogleKey("");
      setStatus(check.error || "Key tidak valid. Periksa salinan, lalu coba lagi.", "err");
      if (primary) primary.disabled = false;
      return;
    }
    markByokComplete();
    setStatus("Key valid. Selamat beribadah.", "ok");
    document.dispatchEvent(new CustomEvent("rhema-byok-ready"));
    window.setTimeout(() => close(), 650);
  }

  primary?.addEventListener("click", () => {
    if (step < 4) {
      step += 1;
      renderStep();
      return;
    }
    void saveKey();
  });

  secondary?.addEventListener("click", () => {
    if (step > 1) {
      step -= 1;
      renderStep();
    }
  });

  skip?.addEventListener("click", deferAndClose);

  modal.querySelector("#byok-open-studio")?.addEventListener("click", () => {
    void openExternalUrl(AISTUDIO_KEY_URL);
  });

  visBtn?.addEventListener("click", () => {
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    visBtn.textContent = show ? "Sembunyikan" : "Tampilkan";
  });

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void saveKey();
    }
  });

  backHandler = () => {
    if (step > 1) {
      step -= 1;
      renderStep();
      return true;
    }
    deferAndClose();
    return true;
  };

  renderStep();
}

/** Dipakai tombol back native. @returns {boolean} */
export function consumeByokOnboardingBack() {
  if (!isByokOnboardingOpen()) return false;
  return Boolean(backHandler?.());
}

/**
 * @param {import("./chatCore.js").ChatTransport} [transport]
 * @param {{ deferAutoOpen?: boolean }} [opts]
 */
export function initByokOnboarding(transport, opts = {}) {
  if (googleKeyConfigured()) markByokComplete();
  syncByokHomeBanner();

  document.getElementById("byok-home-banner")?.addEventListener("click", () => {
    openByokOnboarding({ startStep: googleKeyConfigured() ? 4 : 1 });
  });

  document.getElementById("btn-open-byok-guide")?.addEventListener("click", (e) => {
    e.preventDefault();
    openByokOnboarding({ startStep: 1 });
  });

  transport?.onMessage?.((msg) => {
    const m = /** @type {{ type?: string, ok?: boolean, provider?: string }} */ (msg);
    if (m?.type === "providerKeySaved" && m.ok && m.provider === "google") {
      markByokComplete();
      syncByokHomeBanner();
    }
  });

  document.addEventListener("rhema-byok-ready", () => {
    syncByokHomeBanner();
    const key = getStoredGoogleKey();
    if (key) transport?.post?.({ type: "saveProviderKey", provider: "google", key });
  });

  function maybeAutoOpenByok() {
    if (!shouldAutoOpenByokOnboarding()) return;
    window.setTimeout(() => openByokOnboarding(), 380);
  }

  if (opts.deferAutoOpen) {
    document.addEventListener("rhema-region-ready", () => maybeAutoOpenByok(), {
      once: true,
    });
  } else {
    maybeAutoOpenByok();
  }
}
