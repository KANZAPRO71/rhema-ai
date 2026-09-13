/**
 * ChordPro-style parser & lyric/chord alignment for Kidung Jemaat.
 * Supports inline markers: [C]Mari kita puji
 */
import { escapeHtml } from "./markdown.js";

/**
 * @param {string} text
 * @returns {Array<{ chords: string[], lyric: string }>}
 */
export function parseChordPro(text) {
  const lines = String(text || "").split("\n");
  return lines.map((line) => {
    if (!/\[[A-Ga-g]/.test(line)) {
      return { chords: [], lyric: line };
    }
    /** @type {string[]} */
    const chords = [];
    const lyric = line.replace(/\[([^\]]+)\]/g, (_m, chord) => {
      chords.push(String(chord).trim());
      return "";
    });
    return { chords, lyric: lyric.trimStart() };
  });
}

/** @param {string} text */
export function hasChordProMarkers(text) {
  return /\[[A-Ga-g][#b]?[^\]]*\]/.test(String(text || ""));
}

/**
 * Spread progression chords across lyric lines (non-empty).
 * @param {string} lyrics
 * @param {string[]} progression
 */
export function distributeChordsToLyrics(lyrics, progression) {
  const rawLines = String(lyrics || "").split("\n");
  const prog = (progression || []).filter(Boolean);
  if (!prog.length) {
    return rawLines.map((lyric) => ({ chords: [], lyric }));
  }

  let progIdx = 0;
  return rawLines.map((lyric) => {
    const trimmed = lyric.trim();
    if (!trimmed || /^Reff:?$/i.test(trimmed) || /^Bait \d+:?$/i.test(trimmed)) {
      return { chords: [], lyric };
    }
    const chord = prog[progIdx % prog.length];
    progIdx++;
    return { chords: [chord], lyric };
  });
}

/**
 * @param {Array<{ chords: string[], lyric: string }>} rows
 * @param {{ onChordClick?: (chord: string, el: HTMLElement) => void, instIcon?: string, instName?: string }} opts
 */
export function renderChordProRows(rows, opts = {}) {
  const instName = opts.instName || "SoundFont";
  return rows
    .map((row, idx) => {
      const chordHtml = row.chords.length
        ? `<div class="lyrics-chord-row">${row.chords
            .map(
              (c) =>
                `<button type="button" class="inline-chord-badge" data-chord="${escapeHtml(c)}" title="Mainkan akor ${escapeHtml(c)} (${escapeHtml(instName)})">${escapeHtml(c)}</button>`,
            )
            .join(" ")}</div>`
        : "";
      const text = escapeHtml(row.lyric) || "&nbsp;";
      return `${chordHtml}<div class="lyrics-text-row lyrics-line-item" data-line-idx="${idx}">${text}</div>`;
    })
    .join("");
}

/**
 * @param {HTMLElement} container
 * @param {(chord: string) => void} playFn
 */
export function wireChordBadgeClicks(container, playFn) {
  container?.querySelectorAll(".inline-chord-badge, .interactive-chord-pill").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const chordName = btn.getAttribute("data-chord") || "C";
      playFn(chordName);
      btn.classList.add("strummed");
      setTimeout(() => btn.classList.remove("strummed"), 400);
    });
  });
}
