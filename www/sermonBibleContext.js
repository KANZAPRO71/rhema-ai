/**
 * Bible Context Engine (browser) — fetch Rhema Knowledge untuk Khotbah AI.
 */
import { escapeHtml } from "./markdown.js";
import { apiUrl } from "./platform.js";

/**
 * @param {string} reference
 * @returns {Promise<import("../src/biblePassageLookup.ts").PassageLookupResult | null>}
 */
export async function fetchPassageContext(reference) {
  const ref = (reference || "").trim();
  if (!ref) return null;
  try {
    const res = await fetch(apiUrl(`/api/alkitab/passage?ref=${encodeURIComponent(ref)}`));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * @param {import("../src/biblePassageLookup.ts").PassageLookupResult | null} passage
 */
export function renderSermonKnowledgePanel(passage) {
  const panel = document.getElementById("sermon-knowledge-panel");
  if (!panel) return;
  if (!passage?.found) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }

  const primary = (passage.primary || [])
    .filter((v) => v.found && v.text)
    .map((v) => `<li><strong>${escapeHtml(v.reference)}</strong> — ${escapeHtml(v.text.slice(0, 120))}${v.text.length > 120 ? "…" : ""}</li>`)
    .join("");

  const cross = (passage.crossReferences || [])
    .slice(0, 4)
    .map((c) => `<li>${escapeHtml(c.ref)} — ${escapeHtml(c.label)}</li>`)
    .join("");

  const intro = passage.bookIntro
    ? `<p class="sk-intro">${escapeHtml(passage.bookIntro.nama)} (${escapeHtml(passage.bookIntro.bagian)}): ${escapeHtml(passage.bookIntro.ringkas)}</p>`
    : "";

  const tafsir = passage.tafsir?.makna_ringkas
    ? `<p class="sk-tafsir"><strong>Tafsir:</strong> ${escapeHtml(passage.tafsir.makna_ringkas)}</p>`
    : "";

  const lexicon = (passage.lexicon || [])
    .slice(0, 3)
    .map(
      (w) =>
        `<li><strong>${escapeHtml(w.original)}</strong> (${escapeHtml(w.language)}): ${escapeHtml(w.meaning)}</li>`,
    )
    .join("");

  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="sermon-knowledge-head">📖 Bahan Firman</div>
    ${intro}
    <ul class="sk-verses">${primary}</ul>
    ${tafsir}
    ${lexicon ? `<div class="sk-cross"><span>Kata kunci asli</span><ul>${lexicon}</ul></div>` : ""}
    ${cross ? `<div class="sk-cross"><span>Ayat terkait</span><ul>${cross}</ul></div>` : ""}
  `;
}

/**
 * @param {string} reference
 * @returns {Promise<{ passage: object | null, inject: string, prompt: string }>}
 */
export async function buildSermonKnowledgePrompt(reference, basePrompt) {
  const passage = await fetchPassageContext(reference);
  renderSermonKnowledgePanel(passage);

  if (!passage?.found) {
    return { passage, inject: "", prompt: basePrompt };
  }

  const inject = formatPassageInjectClient(passage);
  const prompt = `${inject}\n\n${basePrompt}`;
  return { passage, inject, prompt };
}

/**
 * @param {object} passage
 */
function formatPassageInjectClient(passage) {
  const lines = [
    `[RHEMA KNOWLEDGE — KONTEKS FIRMAN — KHOTBAH]`,
    `Referensi: ${passage.reference} (Alkitab)`,
  ];

  for (const block of [
    ["Bacaan utama", passage.primary],
    ["Konteks sebelum", passage.contextBefore],
    ["Konteks sesudah", passage.contextAfter],
  ]) {
    const [label, verses] = block;
    const items = (verses || []).filter((v) => v.found && v.text);
    if (!items.length) continue;
    lines.push(`${label}:`);
    for (const v of items) lines.push(`${v.reference}: "${v.text}"`);
  }

  if (passage.bookIntro) {
    lines.push(
      `Kitab ${passage.bookIntro.nama} (${passage.bookIntro.bagian}): ${passage.bookIntro.ringkas}`,
    );
  }
  if (passage.tafsir?.makna_ringkas) {
    lines.push(`Tafsir: ${passage.tafsir.makna_ringkas}`);
  }
  if (passage.lexicon?.length) {
    lines.push("Kata kunci asli:");
    for (const w of passage.lexicon.slice(0, 4)) {
      lines.push(`- ${w.original} (${w.language}): ${w.meaning}`);
    }
  }
  if (passage.crossReferences?.length) {
    lines.push("Ayat terkait:");
    for (const c of passage.crossReferences.slice(0, 5)) {
      lines.push(`- ${c.ref}: ${c.label}`);
    }
  }

  lines.push(
    "WAJIB: Bacakan ayat persis dari blok di atas. Gunakan verify_verse jika ragu. Jangan mengarang teks ayat.",
  );
  return lines.join("\n");
}
