/**
 * Worship engine: WebAudioFont — real PCM instrument samples (JCLive SF2).
 * Mix dirancang sebagai iringan lembut di bawah suara AI (bukan lead).
 */

import { getMidiNotesForChord, getRootFrequency } from "./chordTheory.js";
import { isNativeVoiceAudible } from "./nativeAudioPlayback.js";

/** @typedef {"pad"|"organ"|"piano"|"guitar"} WorshipInstrumentId */

const SOUND_BASE = "https://surikov.github.io/webaudiofontdata/sound/";
const PLAYER_SCRIPT = "/vendor/webaudiofont/WebAudioFontPlayer.js";

const MIX = {
  normal: 0.36,
  ducked: 0.09,
  drone: 0.22,
};

const INSTRUMENT_FILES = {
  piano: "0000_JCLive_sf2_file",
  organ: "0190_JCLive_sf2_file",
  pad: "0480_JCLive_sf2_file",
  guitar: "0253_Acoustic_Guitar_sf2_file",
};

/** @type {Record<WorshipInstrumentId, object | null>} */
const presets = {
  pad: null,
  organ: null,
  piano: null,
  guitar: null,
};

/** @type {WebAudioFontPlayer | null} */
let player = null;
/** @type {AudioContext | null} */
let audioContext = null;
/** @type {GainNode | null} */
let masterGain = null;
/** @type {BiquadFilterNode | null} */
let toneFilter = null;
/** @type {{ input: AudioNode; output: AudioNode; dry?: GainNode; wet?: GainNode } | null} */
let reverb = null;
/** @type {AudioNode | null} */
let masterOut = null;

let engineReady = false;
let engineInitPromise = null;
let currentlyDucked = false;

/** @type {ReturnType<typeof setTimeout> | null} */
let accompanimentTimer = null;
/** @type {ReturnType<typeof setInterval> | null} */
let duckMonitorId = null;
let accompanimentRunning = false;
let isDroneActive = false;

export const ENGINE_INSTRUMENT_PROFILES = [
  { id: "pad", label: "🌌 Modern Worship Pad", icon: "🌌", desc: "String ensemble JCLive — pad hangat ala Sunday Keys" },
  { id: "organ", label: "⛪ Organ Pipa Katedral", icon: "⛪", desc: "Church organ sample nyata — megah & sakral dengan reverb" },
  { id: "piano", label: "✨ Piano Grand Akustik", icon: "✨", desc: "Grand piano JCLive — lembut, jernih, dan natural" },
  { id: "guitar", label: "🎸 Gitar Akustik", icon: "🎸", desc: "Acoustic guitar sample — strum hangat ala pemimpin pujian" },
];

export function isEngineReady() {
  return engineReady;
}

export function getSharedAudioContext() {
  return audioContext;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (typeof WebAudioFontPlayer !== "undefined") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * @param {AudioContext} ctx
 * @param {WebAudioFontPlayer} wafPlayer
 * @param {string} fileKey
 */
function loadInstrumentPreset(ctx, wafPlayer, fileKey) {
  const varName = `_tone_${fileKey}`;
  if (window[varName]) {
    wafPlayer.adjustPreset(ctx, window[varName]);
    return Promise.resolve(window[varName]);
  }

  return new Promise((resolve, reject) => {
    const url = `${SOUND_BASE}${fileKey}.js`;
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${fileKey}`)), 90000);

    const poll = () => {
      if (window[varName]) {
        clearTimeout(timeout);
        wafPlayer.adjustPreset(ctx, window[varName]);
        resolve(window[varName]);
        return;
      }
      setTimeout(poll, 111);
    };

    wafPlayer.loader.startLoad(ctx, url, varName);
    poll();
  });
}

function applyMasterLevel(target, timeConstantSec = 0.4) {
  if (!masterGain || !audioContext) return;
  const now = audioContext.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setTargetAtTime(target, now, timeConstantSec);
}

function isVoiceAudibleNow() {
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) return true;
  try {
    if (isNativeVoiceAudible()) return true;
  } catch {}
  return false;
}

function refreshDuckState() {
  const voiceOn = isVoiceAudibleNow();
  if (voiceOn && !currentlyDucked) {
    currentlyDucked = true;
    applyMasterLevel(MIX.ducked, 0.22);
  } else if (!voiceOn && currentlyDucked) {
    currentlyDucked = false;
    applyMasterLevel(MIX.normal, 0.55);
  }
}

function startDuckMonitor() {
  if (duckMonitorId) return;
  refreshDuckState();
  duckMonitorId = setInterval(refreshDuckState, 130);
}

function stopDuckMonitor() {
  if (duckMonitorId) clearInterval(duckMonitorId);
  duckMonitorId = null;
  currentlyDucked = false;
  applyMasterLevel(MIX.normal, 0.35);
}

async function buildEngine() {
  await loadScript(PLAYER_SCRIPT);
  if (typeof WebAudioFontPlayer === "undefined") {
    throw new Error("WebAudioFontPlayer not available");
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio API unavailable");

  audioContext = new AudioContextClass();
  player = new WebAudioFontPlayer();

  toneFilter = audioContext.createBiquadFilter();
  toneFilter.type = "lowpass";
  toneFilter.frequency.value = 3200;
  toneFilter.Q.value = 0.55;

  reverb = player.createReverberator(audioContext);
  if (reverb.dry) reverb.dry.gain.setTargetAtTime(0.84, 0, 0.01);
  if (reverb.wet) reverb.wet.gain.setTargetAtTime(0.1, 0, 0.01);

  masterGain = audioContext.createGain();
  masterGain.gain.value = MIX.normal;

  masterOut = toneFilter;
  toneFilter.connect(reverb.input);
  reverb.output.connect(masterGain);
  masterGain.connect(audioContext.destination);

  const entries = Object.entries(INSTRUMENT_FILES);
  for (const [id, fileKey] of entries) {
    presets[id] = await loadInstrumentPreset(audioContext, player, fileKey);
  }

  if (audioContext.state === "suspended") await audioContext.resume();
  engineReady = true;
}

export function ensureWorshipEngineReady() {
  if (engineReady) return Promise.resolve(true);
  if (!engineInitPromise) {
    engineInitPromise = buildEngine()
      .then(() => true)
      .catch((err) => {
        console.warn("[worshipMusicEngine] WebAudioFont init failed:", err);
        engineInitPromise = null;
        return false;
      });
  }
  return engineInitPromise;
}

/** @param {WorshipInstrumentId} instrumentId */
function chordVolume(instrumentId) {
  if (instrumentId === "organ") return 0.44;
  if (instrumentId === "guitar") return 0.38;
  if (instrumentId === "piano") return 0.4;
  return 0.36;
}

/**
 * @param {string} chordName
 * @param {WorshipInstrumentId} instrumentId
 * @param {number} durationSec
 * @param {number} [whenSec]
 */
export function playSoundfontChord(chordName, instrumentId = "pad", durationSec = 2.6, whenSec, baseOctave = 3) {
  if (!engineReady || !player || !audioContext || !masterOut) return false;
  if (audioContext.state === "suspended") void audioContext.resume();

  startDuckMonitor();

  const preset = presets[instrumentId] || presets.pad;
  if (!preset) return false;

  const octave = instrumentId === "organ" ? Math.max(2, baseOctave - 1) : baseOctave;
  const pitches = getMidiNotesForChord(chordName, octave);
  const when = whenSec ?? audioContext.currentTime + 0.02;
  const vol = chordVolume(instrumentId);
  const sustain = Math.min(durationSec, instrumentId === "pad" ? 2.1 : 1.85);

  if (instrumentId === "guitar") {
    player.queueStrumDown(audioContext, masterOut, preset, when, pitches.slice(), sustain, vol);
  } else {
    player.queueChord(audioContext, masterOut, preset, when, pitches.slice(), sustain, vol);
  }
  return true;
}

/**
 * @param {{ events: Array<{ chord: string, beats: number }>, bpm: number, baseOctave?: number, instrument?: WorshipInstrumentId }} arrangement
 * @param {(chord: string, idx: number, total: number) => void} onBeat
 * @param {WorshipInstrumentId} [instrumentId]
 */
export async function startArrangedAccompaniment(arrangement, onBeat = () => {}, instrumentId) {
  const ready = await ensureWorshipEngineReady();
  if (!ready) return false;

  stopTransportAccompaniment();

  const events = arrangement?.events?.filter(Boolean) || [];
  if (!events.length) return false;

  const inst = instrumentId || arrangement.instrument || "pad";
  const safeBpm = Math.max(40, Math.min(160, arrangement.bpm || 72));
  const baseOctave = arrangement.baseOctave ?? 3;
  const beatSec = 60 / safeBpm;
  let idx = 0;

  startDuckMonitor();

  const tick = () => {
    const ev = events[idx % events.length];
    const durationSec = ev.beats * beatSec + 0.12;
    playSoundfontChord(ev.chord, inst, durationSec, undefined, baseOctave);
    try {
      onBeat(ev.chord, idx % events.length, events.length);
    } catch {}
    idx++;
    accompanimentTimer = setTimeout(tick, ev.beats * beatSec * 1000);
  };

  tick();
  accompanimentRunning = true;
  return true;
}

/** @deprecated Legacy — gunakan startArrangedAccompaniment */
export async function startTransportAccompaniment(chordsOrProgression, bpm = 72, onBeat = () => {}, instrumentId = "pad") {
  /** @type {string[]} */
  let progression = [];
  if (Array.isArray(chordsOrProgression) && chordsOrProgression.length) {
    progression = chordsOrProgression;
  } else {
    progression = String(chordsOrProgression || "C")
      .replace(/[\[\],–—|·]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }
  const events = progression.map((chord, i) => ({
    chord,
    beats: i === progression.length - 1 ? 2 : 1,
  }));
  return startArrangedAccompaniment({ events, bpm, baseOctave: 3, instrument: instrumentId }, onBeat, instrumentId);
}

export function stopTransportAccompaniment() {
  if (accompanimentTimer) clearTimeout(accompanimentTimer);
  accompanimentTimer = null;
  accompanimentRunning = false;
  stopDuckMonitor();
  if (player && audioContext) {
    try {
      player.cancelQueue(audioContext);
    } catch {}
  }
}

export function isTransportAccompanimentActive() {
  return accompanimentRunning;
}

/** @param {string} rootNote */
export async function startSoundfontDrone(rootNote = "C") {
  const ready = await ensureWorshipEngineReady();
  if (!ready || !player || !audioContext || !masterOut) return false;
  if (isDroneActive) {
    stopSoundfontDrone();
    return false;
  }

  const root = String(rootNote || "C").split("/")[0];
  const preset = presets.pad;
  if (!preset) return false;

  startDuckMonitor();
  applyMasterLevel(MIX.drone, 0.5);

  const pitches = getMidiNotesForChord(root, 2).slice(0, 3);
  const when = audioContext.currentTime + 0.05;
  player.queueChord(audioContext, masterOut, preset, when, pitches, 24, 0.34);
  isDroneActive = true;
  return true;
}

export function stopSoundfontDrone() {
  if (player && audioContext) {
    try {
      player.cancelQueue(audioContext);
    } catch {}
  }
  isDroneActive = false;
  if (!accompanimentRunning) stopDuckMonitor();
}

export function isSoundfontDroneActive() {
  return isDroneActive;
}

export { getRootFrequency };
