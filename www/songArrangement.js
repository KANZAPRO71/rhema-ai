/**
 * Aransemen iringan per-lagu — BPM, instrumen, oktaf, dan durasi kord
 * diambil dari metadata lagu (key, progression, book) bukan generik.
 */

import { parseRootSemitone } from "./chordTheory.js";

/** @typedef {"pad"|"organ"|"piano"|"guitar"} WorshipInstrumentId */
/** @typedef {{ chord: string, beats: number }} ArrangementEvent */
/** @typedef {{ events: ArrangementEvent[], bpm: number, instrument: WorshipInstrumentId, baseOctave: number, key: string }} SongArrangement */

const BOOK_INSTRUMENT = {
  KJ: "organ",
  PKJ: "piano",
  NKB: "piano",
  BE: "organ",
  POP: "pad",
};

const BOOK_BPM_BASE = {
  KJ: 74,
  PKJ: 78,
  NKB: 80,
  BE: 66,
  POP: 88,
};

/** @param {string} id */
function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** @param {string} [key] */
function keyToBaseOctave(key) {
  const root = String(key || "C").split(/[^A-G#b]/)[0];
  const semi = parseRootSemitone(root);
  if (semi >= 10) return 2;
  if (semi >= 7) return 3;
  if (semi >= 3) return 3;
  return 4;
}

/** @param {string} text */
function parseChordList(text) {
  return String(text || "")
    .replace(/[\[\],–—|·]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Ubah progresi mentah → event berdurasi (gabung kord berulang = hold, bukan strum ulang).
 * @param {string[]} progression
 * @returns {ArrangementEvent[]}
 */
export function progressionToTimedEvents(progression) {
  const prog = (progression || []).filter(Boolean);
  if (!prog.length) return [{ chord: "C", beats: 4 }];

  /** @type {ArrangementEvent[]} */
  const events = [];

  for (let i = 0; i < prog.length; i++) {
    const chord = prog[i];
    let run = 1;
    while (i + run < prog.length && prog[i + run] === chord) run++;

    let beats = 1;
    if (run >= 4) beats = 4;
    else if (run === 3) beats = 3;
    else if (run === 2) beats = 2;
    else if (/7$|dim|aug|sus4/i.test(chord)) beats = 1;
    else if (i === prog.length - 1) beats = 3;

    events.push({ chord, beats });
    i += run - 1;
  }

  return events;
}

/** @param {string} book @param {string} id */
function inferBpm(book, id) {
  const base = BOOK_BPM_BASE[book] ?? 72;
  const spread = book === "BE" ? 8 : book === "POP" ? 14 : 12;
  const offset = hashId(id) % spread;
  return base + offset - Math.floor(spread / 2);
}

/** @param {string} book */
function inferInstrument(book) {
  return BOOK_INSTRUMENT[book] || "organ";
}

/**
 * @param {{ id?: string, book?: string, key?: string, chord?: string, progression?: string[], bpm?: number, instrument?: WorshipInstrumentId }} song
 * @param {number} [transpose=0]
 * @returns {SongArrangement}
 */
export function buildSongArrangement(song, transpose = 0) {
  const book = song?.book || "KJ";
  const id = song?.id || "unknown";
  const key = song?.key || "C";

  /** @type {string[]} */
  let progression = [];
  if (Array.isArray(song?.progression) && song.progression.length) {
    progression = song.progression.map((c) => transposeChordName(c, transpose));
  } else if (song?.chord) {
    progression = parseChordList(song.chord).map((c) => transposeChordName(c, transpose));
  }

  if (!progression.length) {
    progression = [transposeChordName(key, transpose)];
  }

  const events = progressionToTimedEvents(progression);
  const transposedKey = transposeChordName(key, transpose);

  return {
    events,
    bpm: song?.bpm ?? inferBpm(book, id),
    instrument: song?.instrument ?? inferInstrument(book),
    baseOctave: keyToBaseOctave(transposedKey),
    key: transposedKey,
  };
}

/** @param {string} chord @param {number} semitones */
function transposeChordName(chord, semitones) {
  if (!semitones) return chord;
  const m = String(chord).match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!m) return chord;
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const flatMap = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
  let root = m[1];
  let idx = names.indexOf(root);
  if (idx === -1 && flatMap[root]) idx = names.indexOf(flatMap[root]);
  if (idx === -1) return chord;
  return names[(idx + semitones + 120) % 12] + (m[2] || "");
}
