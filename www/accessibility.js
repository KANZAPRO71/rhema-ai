/**
 * Preferensi aksesibilitas — ukuran teks (lansia / low vision).
 * Tidak menyentuh arsitektur suara.
 */

const STORAGE_KEY = "rhema-font-size";
/** @type {Set<string>} */
const VALID = new Set(["normal", "large", "xlarge"]);

/** @param {"normal"|"large"|"xlarge"} size */
export function applyFontSize(size) {
  const next = VALID.has(size) ? size : "normal";
  document.body.setAttribute("data-font", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  for (const btn of document.querySelectorAll(".font-pick[data-font]")) {
    const on = btn.getAttribute("data-font") === next;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

export function initAccessibility() {
  let saved = "normal";
  try {
    saved = localStorage.getItem(STORAGE_KEY) || "normal";
  } catch {
    saved = "normal";
  }
  applyFontSize(/** @type {"normal"|"large"|"xlarge"} */ (VALID.has(saved) ? saved : "normal"));

  document.querySelectorAll(".font-pick[data-font]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-font") || "normal";
      applyFontSize(/** @type {"normal"|"large"|"xlarge"} */ (next));
    });
  });
}
