/**
 * Worship Accompanist — WebAudioFont (real PCM samples).
 * Engine dimuat lazy agar app tidak white-screen saat startup.
 */

import { getMidiNotesForChord, getRootFrequency } from "./chordTheory.js";

const CHORD_FREQUENCIES = {
  C: [130.81, 196.0, 261.63, 329.63, 392.0],
  "C#": [138.59, 207.65, 277.18, 349.23, 415.3],
  Db: [138.59, 207.65, 277.18, 349.23, 415.3],
  D: [146.83, 220.0, 293.66, 369.99, 440.0],
  "D#": [155.56, 233.08, 311.13, 392.0, 466.16],
  Eb: [155.56, 233.08, 311.13, 392.0, 466.16],
  E: [164.81, 246.94, 329.63, 415.3, 493.88],
  F: [174.61, 261.63, 349.23, 440.0, 523.25],
  "F#": [185.0, 277.18, 369.99, 466.16, 554.37],
  Gb: [185.0, 277.18, 369.99, 466.16, 554.37],
  G: [196.0, 246.94, 293.66, 392.0, 493.88],
  "G#": [207.65, 261.63, 311.13, 415.3, 523.25],
  Ab: [207.65, 261.63, 311.13, 415.3, 523.25],
  A: [220.0, 277.18, 329.63, 440.0, 554.37],
  "A#": [233.08, 293.66, 349.23, 466.16, 587.33],
  Bb: [233.08, 293.66, 349.23, 466.16, 587.33],
  B: [246.94, 311.13, 369.99, 493.88, 622.25],
  C7: [130.81, 196.0, 233.08, 261.63, 329.63, 466.16],
  D7: [146.83, 220.0, 261.63, 293.66, 369.99, 440.0],
  E7: [164.81, 246.94, 293.66, 329.63, 415.3, 493.88],
  F7: [174.61, 261.63, 311.13, 349.23, 440.0, 523.25],
  G7: [196.0, 246.94, 293.66, 349.23, 392.0, 493.88],
  A7: [220.0, 277.18, 329.63, 392.0, 440.0, 554.37],
  B7: [246.94, 311.13, 369.99, 440.0, 493.88, 622.25],
  Am: [220.0, 261.63, 329.63, 440.0, 523.25],
  Am7: [220.0, 261.63, 329.63, 392.0, 440.0, 523.25],
  Em: [164.81, 246.94, 329.63, 392.0, 493.88],
  Em7: [164.81, 246.94, 293.66, 329.63, 392.0, 493.88],
  Dm: [146.83, 220.0, 293.66, 349.23, 440.0],
  Dm7: [146.83, 220.0, 261.63, 293.66, 349.23, 440.0],
  Bm: [246.94, 293.66, 369.99, 493.88, 587.33],
  "F#m": [185.0, 220.0, 277.18, 369.99, 440.0],
  "C#m": [138.59, 164.81, 207.65, 277.18, 329.63],
  "G#m": [207.65, 246.94, 311.13, 415.30, 493.88],
  Bbm: [233.08, 277.18, 349.23, 466.16, 554.37],
  Gm: [196.0, 233.08, 293.66, 392.0, 466.16],
  Cm: [130.81, 155.56, 196.0, 261.63, 311.13],
  "D/F#": [185.0, 220.0, 293.66, 369.99, 440.0],
  "G/B": [246.94, 293.66, 392.0, 493.88, 587.33],
  "C/G": [196.0, 261.63, 329.63, 392.0, 523.25],
  "A/C#": [138.59, 220.0, 277.18, 329.63, 440.0],
  "Em/G": [196.0, 246.94, 329.63, 392.0, 493.88],
  "F/A": [220.0, 261.63, 349.23, 440.0, 523.25],
};

let audioCtx = null;
/** @type {"pad"|"organ"|"piano"|"guitar"} */
let currentInstrument = "pad";
let useSoundfontEngine = false;
let currentBaseOctave = 3;
let currentSongBpm = 72;

/** @type {Promise<typeof import("./worshipMusicEngine.js") | null> | null} */
let engineImportPromise = null;

export const INSTRUMENT_PROFILES = [
  { id: "pad", label: "🌌 Modern Worship Pad", icon: "🌌", desc: "String ensemble JCLive — pad hangat ala Sunday Keys" },
  { id: "organ", label: "⛪ Organ Pipa Katedral", icon: "⛪", desc: "Church organ sample nyata — megah & sakral dengan reverb" },
  { id: "piano", label: "✨ Piano Grand Akustik", icon: "✨", desc: "Grand piano JCLive — lembut, jernih, dan natural" },
  { id: "guitar", label: "🎸 Gitar Akustik", icon: "🎸", desc: "Acoustic guitar sample — strum hangat ala pemimpin pujian" },
];

async function loadEngineModule() {
  if (!engineImportPromise) {
    engineImportPromise = import("./worshipMusicEngine.js")
      .then((mod) => mod)
      .catch((err) => {
        console.warn("[worshipAccompanist] engine import failed:", err);
        engineImportPromise = null;
        return null;
      });
  }
  return engineImportPromise;
}

/** Preload SoundFont saat user menyentuh layar / buka Kidung. */
export function warmupWorshipEngine() {
  void loadEngineModule().then(async (mod) => {
    if (!mod) return;
    const ok = await mod.ensureWorshipEngineReady();
    useSoundfontEngine = ok;
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => warmupWorshipEngine(), { once: true, passive: true });
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function setAccompanimentInstrument(inst) {
  currentInstrument = inst || "pad";
}

/** @param {{ baseOctave?: number, bpm?: number, instrument?: string }} ctx */
export function setAccompanimentContext(ctx = {}) {
  if (ctx.baseOctave !== undefined) currentBaseOctave = ctx.baseOctave;
  if (ctx.bpm !== undefined) currentSongBpm = ctx.bpm;
  if (ctx.instrument) currentInstrument = ctx.instrument;
}

export function getAccompanimentContext() {
  return { baseOctave: currentBaseOctave, bpm: currentSongBpm, instrument: currentInstrument };
}

export function getAccompanimentInstrument() {
  return currentInstrument;
}

function getFrequenciesForChord(chordName) {
  const clean = String(chordName || "C").trim();
  if (CHORD_FREQUENCIES[clean]) return CHORD_FREQUENCIES[clean];
  const root = clean.split("/")[0];
  if (CHORD_FREQUENCIES[root]) return CHORD_FREQUENCIES[root];
  const alphanumeric = clean.replace(/[^A-Za-z0-9#b]/g, "");
  if (CHORD_FREQUENCIES[alphanumeric]) return CHORD_FREQUENCIES[alphanumeric];
  const midi = getMidiNotesForChord(clean, 3);
  return midi.map((m) => 440 * 2 ** ((m - 69) / 12));
}

function playOscillatorPad(chordName, duration = 3.2) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = getFrequenciesForChord(chordName);
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(950, now);
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.linearRampToValueAtTime(0.22, now + 0.35);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    osc.connect(g);
    g.connect(filter);
    osc.start(now);
    osc.stop(now + duration + 0.1);
  });
}

function playOscillatorOrgan(chordName, duration = 2.6) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = getFrequenciesForChord(chordName);
  const now = ctx.currentTime;
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  });
}

function playOscillatorPiano(chordName, duration = 2.4) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = getFrequenciesForChord(chordName);
  const now = ctx.currentTime;
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  });
}

function playOscillatorGuitar(chordName, speed = 0.024) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = getFrequenciesForChord(chordName);
  const now = ctx.currentTime;
  freqs.forEach((freq, idx) => {
    const t = now + idx * speed;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.7);
  });
}

async function trySoundfontChord(chordName, instrument, duration) {
  const mod = await loadEngineModule();
  if (!mod) return false;
  const ok = await mod.ensureWorshipEngineReady();
  useSoundfontEngine = ok;
  if (!ok) return false;
  return mod.playSoundfontChord(chordName, instrument, duration, undefined, currentBaseOctave);
}

export function playModernWorshipPad(chordName, duration = 3.2) {
  void trySoundfontChord(chordName, "pad", duration).then((played) => {
    if (!played) playOscillatorPad(chordName, duration);
  });
}

export function playChurchOrganChord(chordName, duration = 2.6) {
  void trySoundfontChord(chordName, "organ", duration).then((played) => {
    if (!played) playOscillatorOrgan(chordName, duration);
  });
}

export function playShimmerPianoChord(chordName, duration = 2.4) {
  void trySoundfontChord(chordName, "piano", duration).then((played) => {
    if (!played) playOscillatorPiano(chordName, duration);
  });
}

export function strumGuitarChord(chordName) {
  void trySoundfontChord(chordName, "guitar", 2.2).then((played) => {
    if (!played) playOscillatorGuitar(chordName);
  });
}

export function playChordByInstrument(chordName, instrument = currentInstrument, duration = 2.4) {
  warmupWorshipEngine();
  if (instrument === "pad") playModernWorshipPad(chordName, duration);
  else if (instrument === "organ") playChurchOrganChord(chordName, duration);
  else if (instrument === "piano") playShimmerPianoChord(chordName, duration);
  else strumGuitarChord(chordName);
}

let fallbackTimer = null;
let fallbackPlaying = false;
let accompanistRunning = false;
let droneRunning = false;
/** @type {OscillatorNode[]} */
let oscillatorDroneNodes = [];
/** @type {GainNode | null} */
let oscillatorDroneGain = null;
let isOscillatorDroneRunning = false;

function startOscillatorDrone(rootNote) {
  const ctx = getAudioContext();
  if (!ctx) return false;
  const baseFreq = getRootFrequency(rootNote);
  const now = ctx.currentTime;
  oscillatorDroneGain = ctx.createGain();
  oscillatorDroneGain.gain.setValueAtTime(0.0001, now);
  oscillatorDroneGain.gain.linearRampToValueAtTime(0.14, now + 1.0);
  oscillatorDroneGain.connect(ctx.destination);
  oscillatorDroneNodes = [baseFreq, baseFreq * 1.5].map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.06, now);
    osc.connect(og);
    og.connect(oscillatorDroneGain);
    osc.start(now);
    return osc;
  });
  isOscillatorDroneRunning = true;
  return true;
}

function stopOscillatorDrone() {
  if (oscillatorDroneGain && audioCtx) {
    const now = audioCtx.currentTime;
    oscillatorDroneGain.gain.linearRampToValueAtTime(0.0001, now + 0.7);
    setTimeout(() => {
      oscillatorDroneNodes.forEach((osc) => {
        try {
          osc.stop();
        } catch {}
      });
      oscillatorDroneNodes = [];
      oscillatorDroneGain = null;
    }, 750);
  }
  isOscillatorDroneRunning = false;
}

export function toggleContinuousWorshipPad(rootNote = "C") {
  if (isContinuousPadActive()) {
    stopContinuousWorshipPad();
    return false;
  }

  void loadEngineModule().then(async (mod) => {
    if (mod) {
      const ok = await mod.ensureWorshipEngineReady();
      useSoundfontEngine = ok;
      if (ok) {
        const started = await mod.startSoundfontDrone(rootNote);
        if (started) {
          droneRunning = true;
          return;
        }
      }
    }
    if (startOscillatorDrone(rootNote)) droneRunning = true;
  });

  return true;
}

export function stopContinuousWorshipPad() {
  void loadEngineModule().then((mod) => mod?.stopSoundfontDrone());
  stopOscillatorDrone();
  droneRunning = false;
}

export function isContinuousPadActive() {
  return droneRunning || isOscillatorDroneRunning;
}

/**
 * @param {import("./songArrangement.js").SongArrangement | string[] | string} arrangementOrProgression
 * @param {number | ((chord: string, idx: number, total: number) => void)} [bpmOrOnBeat]
 * @param {((chord: string, idx: number, total: number) => void) | string} [onBeatOrInstrument]
 * @param {string} [instrumentOverride]
 */
export function toggleWorshipAccompanist(arrangementOrProgression, bpmOrOnBeat = 72, onBeatOrInstrument = () => {}, instrumentOverride) {
  if (isAccompanistActive()) {
    stopWorshipAccompanist();
    return false;
  }

  /** @type {import("./songArrangement.js").SongArrangement | null} */
  let arrangement = null;
  /** @type {(chord: string, idx: number, total: number) => void} */
  let onBeat = () => {};
  let instrument = currentInstrument;

  if (arrangementOrProgression && typeof arrangementOrProgression === "object" && !Array.isArray(arrangementOrProgression) && arrangementOrProgression.events) {
    arrangement = arrangementOrProgression;
    onBeat = typeof bpmOrOnBeat === "function" ? bpmOrOnBeat : () => {};
    instrument = (typeof onBeatOrInstrument === "string" ? onBeatOrInstrument : instrumentOverride) || arrangement.instrument || currentInstrument;
    currentSongBpm = arrangement.bpm;
    currentBaseOctave = arrangement.baseOctave ?? currentBaseOctave;
  } else {
    /** @type {string[]} */
    let progression = [];
    if (Array.isArray(arrangementOrProgression)) progression = arrangementOrProgression;
    else {
      progression = String(arrangementOrProgression || "C")
        .replace(/[\[\],–—|·]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
    }
    const bpm = typeof bpmOrOnBeat === "number" ? bpmOrOnBeat : currentSongBpm;
    onBeat = typeof onBeatOrInstrument === "function" ? onBeatOrInstrument : typeof bpmOrOnBeat === "function" ? bpmOrOnBeat : () => {};
    instrument = typeof onBeatOrInstrument === "string" ? onBeatOrInstrument : instrumentOverride || currentInstrument;
    arrangement = {
      events: progression.map((chord, i) => ({ chord, beats: i === progression.length - 1 ? 2 : 1 })),
      bpm,
      baseOctave: currentBaseOctave,
      instrument,
      key: "C",
    };
  }

  if (!arrangement?.events?.length) return false;
  currentInstrument = instrument || "pad";

  accompanistRunning = true;

  void loadEngineModule().then(async (mod) => {
    if (mod) {
      const ok = await mod.ensureWorshipEngineReady();
      useSoundfontEngine = ok;
      if (ok) {
        const started = await mod.startArrangedAccompaniment(arrangement, onBeat, currentInstrument);
        if (started) return;
      }
    }

    let idx = 0;
    fallbackPlaying = true;
    const beatSec = 60 / arrangement.bpm;

    const tick = () => {
      if (!fallbackPlaying) return;
      const ev = arrangement.events[idx % arrangement.events.length];
      playChordByInstrument(ev.chord, currentInstrument, ev.beats * beatSec + 0.4);
      onBeat(ev.chord, idx % arrangement.events.length, arrangement.events.length);
      idx++;
      fallbackTimer = setTimeout(tick, ev.beats * beatSec * 1000);
    };

    tick();
  });

  return true;
}

export function stopWorshipAccompanist() {
  void loadEngineModule().then((mod) => mod?.stopTransportAccompaniment());
  if (fallbackTimer) clearTimeout(fallbackTimer);
  fallbackTimer = null;
  fallbackPlaying = false;
  accompanistRunning = false;
}

export function isAccompanistActive() {
  return accompanistRunning || fallbackPlaying;
}
