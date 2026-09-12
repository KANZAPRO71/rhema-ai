/**
 * UI darurat krisis — hotline tap-to-call (Play Store compliance).
 * Android native: AlertDialog via CrisisGuardrailPlugin; web: modal HTML fallback.
 */
import { isNativeCrisisGuardrailAvailable, showNativeCrisisDialog } from "./nativeCrisisGuardrail.js";

/** @typedef {{ id: string, label: string, number: string, note?: string, tel?: string }} CrisisHotline */

let modalEl = null;

function ensureModal() {
  if (modalEl) return modalEl;
  modalEl = document.createElement("div");
  modalEl.id = "rhema-crisis-modal";
  modalEl.className = "rhema-crisis-modal";
  modalEl.hidden = true;
  modalEl.innerHTML = `
    <div class="rhema-crisis-backdrop" data-close="1"></div>
    <div class="rhema-crisis-card" role="alertdialog" aria-labelledby="rhema-crisis-title" aria-modal="true">
      <h2 id="rhema-crisis-title">Bantuan Darurat</h2>
      <p class="rhema-crisis-lead">Rhema AI bukan pengganti layanan krisis profesional. Jika saudara dalam bahaya, hubungi bantuan manusia sekarang.</p>
      <ul class="rhema-crisis-list"></ul>
      <p class="rhema-crisis-foot">Jika bahaya langsung, hubungi layanan darurat terdekat atau orang tepercaya di samping saudara.</p>
      <button type="button" class="rhema-crisis-close">Saya mengerti</button>
    </div>
  `;
  document.body.appendChild(modalEl);

  if (!document.getElementById("rhema-crisis-modal-style")) {
    const style = document.createElement("style");
    style.id = "rhema-crisis-modal-style";
    style.textContent = `
      .rhema-crisis-modal { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 16px; }
      .rhema-crisis-modal[hidden] { display: none !important; }
      .rhema-crisis-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.55); }
      .rhema-crisis-card { position: relative; max-width: 420px; width: 100%; background: #fff; color: #1a1a1a; border-radius: 16px; padding: 20px; box-shadow: 0 12px 40px rgba(0,0,0,.25); }
      .rhema-crisis-card h2 { margin: 0 0 8px; font-size: 1.15rem; color: #b42318; }
      .rhema-crisis-lead { margin: 0 0 12px; font-size: .92rem; line-height: 1.45; }
      .rhema-crisis-list { list-style: none; margin: 0 0 12px; padding: 0; }
      .rhema-crisis-list li { margin-bottom: 8px; }
      .rhema-crisis-list a { display: block; padding: 10px 12px; border-radius: 10px; background: #fef3f2; border: 1px solid #fecdca; color: #912018; text-decoration: none; font-weight: 600; }
      .rhema-crisis-list small { display: block; font-weight: 400; color: #667085; margin-top: 2px; }
      .rhema-crisis-foot { font-size: .82rem; color: #667085; margin: 0 0 14px; line-height: 1.4; }
      .rhema-crisis-close { width: 100%; padding: 12px; border: none; border-radius: 10px; background: #344054; color: #fff; font-weight: 600; cursor: pointer; }
    `;
    document.head.appendChild(style);
  }

  modalEl.querySelector(".rhema-crisis-close")?.addEventListener("click", hideCrisisHotlineModal);
  modalEl.querySelector(".rhema-crisis-backdrop")?.addEventListener("click", hideCrisisHotlineModal);
  return modalEl;
}

/** @param {CrisisHotline[]} [hotlines] */
export async function showCrisisHotlineModal(hotlines = []) {
  if (isNativeCrisisGuardrailAvailable()) {
    const shown = await showNativeCrisisDialog({ hotlines });
    if (shown) return;
  }

  const el = ensureModal();
  const list = el.querySelector(".rhema-crisis-list");
  if (list) {
    list.innerHTML = hotlines
      .map(
        (h) =>
          `<li><a href="${h.tel || "#"}" rel="noopener">${h.label}: ${h.number}${h.note ? `<small>${h.note}</small>` : ""}</a></li>`,
      )
      .join("");
  }
  el.hidden = false;
}

export function hideCrisisHotlineModal() {
  if (modalEl) modalEl.hidden = true;
}

export function initCrisisHotlineModal() {
  ensureModal();
  document.addEventListener("rhema-crisis-alert", (e) => {
    const hotlines = /** @type {CustomEvent<{ hotlines?: CrisisHotline[] }>} */ (e).detail?.hotlines;
    showCrisisHotlineModal(hotlines || []);
  });
}
