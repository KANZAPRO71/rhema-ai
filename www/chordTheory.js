/** Shared chord → MIDI helpers for Kidung Jemaat music engine. */

const SEMITONE = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** @param {string} root */
export function parseRootSemitone(root) {
  const r = String(root || "C").trim();
  if (SEMITONE[r] !== undefined) return SEMITONE[r];
  const flat = r.replace("b", "b");
  if (SEMITONE[flat] !== undefined) return SEMITONE[flat];
  return 0;
}

/** @param {number} semitone @param {number} [octave=3] */
export function semitoneToMidi(semitone, octave = 3) {
  return (octave + 1) * 12 + ((semitone % 12) + 12) % 12;
}

/** @param {number} midi */
export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

/**
 * @param {string} chordName
 * @param {number} [baseOctave=3]
 * @returns {number[]}
 */
export function getMidiNotesForChord(chordName, baseOctave = 3) {
  const clean = String(chordName || "C").trim();
  const match = clean.match(/^([A-Ga-g][#b]?)(.*)?(?:\/([A-Ga-g][#b]?))?$/);
  if (!match) return [semitoneToMidi(0, baseOctave), semitoneToMidi(4, baseOctave), semitoneToMidi(7, baseOctave)];

  const root = match[1];
  const quality = (match[2] || "").toLowerCase();
  const bass = match[3];
  const rootSemi = parseRootSemitone(root);

  /** @type {number[]} */
  let intervals = [0, 4, 7];

  if (/dim/.test(quality)) intervals = [0, 3, 6];
  else if (/aug/.test(quality)) intervals = [0, 4, 8];
  else if (/sus2/.test(quality)) intervals = [0, 2, 7];
  else if (/sus4|sus(?![24])/.test(quality)) intervals = [0, 5, 7];
  else if (/m(?!aj)|min/.test(quality)) intervals = [0, 3, 7];

  if (/maj7|ma7|Δ7/.test(quality)) intervals = [...intervals, 11];
  else if (/m7|min7/.test(quality) || (/m/.test(quality) && /7/.test(quality))) intervals = [...intervals, 10];
  else if (/7/.test(quality)) intervals = [...intervals, 10];

  const notes = intervals.map((i) => semitoneToMidi(rootSemi + i, baseOctave));

  if (bass) {
    const bassMidi = semitoneToMidi(parseRootSemitone(bass), baseOctave - 1);
    if (!notes.includes(bassMidi)) notes.unshift(bassMidi);
  }

  return [...new Set(notes)].sort((a, b) => a - b);
}

/** @param {string} note @param {number} semitones */
export function transposeNote(note, semitones) {
  let idx = NOTE_NAMES.indexOf(note);
  const flatMap = { Db: 1, Eb: 3, Gb: 6, Ab: 8, Bb: 10 };
  if (idx === -1 && flatMap[note] !== undefined) idx = flatMap[note];
  if (idx === -1) return note;
  return NOTE_NAMES[(idx + semitones + 120) % 12];
}

/** @param {string} chordText @param {number} semitones */
export function transposeChords(chordText, semitones) {
  if (!chordText || semitones === 0) return chordText;
  return chordText.replace(/\b([A-G][#b]?)(m|maj|min|dim|aug|sus[24]?|[0-9]+)?/g, (_m, root, suffix) => {
    return transposeNote(root, semitones) + (suffix || "");
  });
}

/** @param {string} rootNote */
export function getRootFrequency(rootNote) {
  const midi = getMidiNotesForChord(String(rootNote || "C").split("/")[0], 2)[0];
  return 440 * 2 ** ((midi - 69) / 12);
}
