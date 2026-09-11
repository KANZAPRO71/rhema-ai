/**
 * Export transkrip khotbah/eksposisi + bahan firman TB.
 */
import { apiUrl } from "./platform.js";
import { fetchPassageContext } from "./sermonBibleContext.js";

const VOICE_HISTORY_KEY = "rhema-voice-conversation-history";
export const SERMON_LAST_REF_KEY = "rhema-sermon-last-ref";
export const SERMON_LAST_MODE_KEY = "rhema-sermon-last-mode";

/** @param {string} ref @param {"khotbah"|"exposition"} [mode] */
export function saveLastSermonMeta(ref, mode = "khotbah") {
  try {
    localStorage.setItem(SERMON_LAST_REF_KEY, ref.trim());
    localStorage.setItem(SERMON_LAST_MODE_KEY, mode);
  } catch {
    /* private mode */
  }
}

/** @returns {Array<{ role: string, text: string, time?: string }>} */
function loadVoiceHistory() {
  try {
    const raw = localStorage.getItem(VOICE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** @param {object | null} passage */
function formatPassageBlock(passage) {
  if (!passage?.found) return "(Bahan firman TB tidak tersedia)\n";
  const lines = [`Referensi: ${passage.reference} (TB / LAI)`, ""];
  for (const v of passage.primary || []) {
    if (v.found && v.text) lines.push(`${v.reference}: "${v.text}"`);
  }
  if (passage.bookIntro?.ringkas) {
    lines.push("", `Kitab: ${passage.bookIntro.ringkas}`);
  }
  if (passage.tafsir?.makna_ringkas) {
    lines.push(`Tafsir: ${passage.tafsir.makna_ringkas}`);
  }
  if (passage.lexicon?.length) {
    lines.push("", "Kata kunci asli:");
    for (const w of passage.lexicon) {
      lines.push(`- ${w.original} (${w.language}): ${w.meaning}`);
    }
  }
  if (passage.crossReferences?.length) {
    lines.push("", "Ayat terkait:");
    for (const c of passage.crossReferences.slice(0, 6)) {
      lines.push(`- ${c.ref}: ${c.label}`);
    }
  }
  return lines.join("\n") + "\n";
}

/**
 * @param {{ passage?: object | null, mode?: string }} [opts]
 * @returns {Promise<string>}
 */
export async function buildSermonExportText(opts = {}) {
  const history = loadVoiceHistory();
  let ref = "";
  let mode = "khotbah";
  try {
    ref = localStorage.getItem(SERMON_LAST_REF_KEY) || "";
    mode = localStorage.getItem(SERMON_LAST_MODE_KEY) || "khotbah";
  } catch {
    /* ignore */
  }
  if (opts.mode) mode = opts.mode;

  const passage = opts.passage ?? (ref ? await fetchPassageContext(ref) : null);
  const title = mode === "exposition" ? "Eksposisi Firman" : "Khotbah AI";
  const date = new Date().toLocaleString("id-ID");

  const lines = [
    `${title} — Rhema AI`,
    `Tanggal: ${date}`,
    ref ? `Ayat: ${ref}` : "",
    "",
    "=== BAHAN FIRMAN TB ===",
    formatPassageBlock(passage),
    "=== TRANSKRIP PERCAKAPAN ===",
    "",
  ].filter(Boolean);

  if (!history.length) {
    lines.push("(Belum ada transkrip percakapan live)");
  } else {
    for (const item of history) {
      const label = item.role === "user" ? "Anda" : "Rhema";
      lines.push(`[${label}${item.time ? ` · ${item.time}` : ""}]`);
      lines.push(item.text || "");
      lines.push("");
    }
  }

  lines.push("---", "Diekspor dari Rhema AI · TB/LAI offline");
  return lines.join("\n");
}

/** @param {string} text @param {string} filename */
function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Wire tombol export di header transcript. */
export function initSermonExport() {
  const btn = document.getElementById("btn-voice-export");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = "⏳";
    try {
      const text = await buildSermonExportText();
      const ref = localStorage.getItem(SERMON_LAST_REF_KEY) || "khotbah";
      const safeRef = ref.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 40);
      downloadTextFile(text, `rhema-${safeRef || "sermon"}-${Date.now()}.txt`);
      btn.textContent = "✓";
      setTimeout(() => {
        btn.textContent = prev;
      }, 1600);
    } catch {
      btn.textContent = "✗";
      setTimeout(() => {
        btn.textContent = prev;
      }, 1600);
    } finally {
      btn.disabled = false;
    }
  });
}

/** @param {string} q @returns {Promise<object|null>} */
export async function searchTbClient(q) {
  const query = (q || "").trim();
  if (!query) return null;
  try {
    const res = await fetch(apiUrl(`/api/alkitab/search?q=${encodeURIComponent(query)}`));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
