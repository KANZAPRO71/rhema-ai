/**
 * Ambient Audio Soundscape & Offline SpeechSynthesis Engine.
 * Menghasilkan alunan musik teduh (Kecapi Daud / Piano Saat Teduh) via Web Audio API
 * dan menyediakan pembaca suara offline (TTS) gratis tanpa butuh API key.
 */

import {
  speakViaGeminiVoice,
  shouldPreferGeminiVoice,
  canUseBrowserSpeechSynthesis,
  isVoicePlaybackActive,
} from "./voiceTextSpeech.js";

export const AMBIENT_PRESETS = [
  { id: "off", name: "Hening (Mati)", icon: "🍃", desc: "Tanpa musik latar" },
  { id: "harp", name: "Kecapi Daud", icon: "🕊", desc: "Petikan arpeggio pentatonik teduh" },
  { id: "galilee", name: "Danau Galilea", icon: "🌊", desc: "Riak ombak tenang & angin sepoi" },
  { id: "temple", name: "Bait Suci Yerusalem", icon: "🏛️", desc: "Kecapi sakral & gema lonceng khidmat" },
  { id: "judea", name: "Padang Gurun Yudea", icon: "🏜️", desc: "Hening damai & angin sejuk" },
  { id: "rain", name: "Hujan Berkat Malam", icon: "🌧", desc: "Rintik hujan lembut & piano damai" },
  { id: "piano", name: "Piano Saat Teduh", icon: "🎹", desc: "Akord piano akustik meditatif" },
  { id: "chimes", name: "Lonceng Katedral", icon: "🔔", desc: "Denting lonceng tubular sakral" },
];

class AmbientSoundEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.masterGain = null;
    this.currentPreset = "off";
    this.volume = 0.18; // 18% default
    this.timer = null;
    this.subTimers = [];
    this.extraNodes = [];
    this.isPlaying = false;
    this.runId = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && this.isPlaying) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Mainkan not instrumen dengan sintesis harmonik
   */
  playTone(freq, duration = 2.5, type = "sine") {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(type === "piano" ? 950 : type === "chimes" ? 2200 : 1600, now);

    osc.type = type === "piano" ? "triangle" : type === "chimes" ? "sine" : "sine";
    osc.frequency.setValueAtTime(freq, now);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(type === "chimes" ? freq * 2.76 : freq * 2.002, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(type === "piano" ? 0.35 : type === "chimes" ? 0.22 : 0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(filter);
    filter.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * Sintesis Air Tenang / Mazmur 23 (Deburan Ombak Laut Dalam & Deru Pantai Ritmik)
   */
  startWaves() {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 6;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Brown noise tebal dengan energi bass laut dalam
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.035 * white) / 1.035;
      lastOut = data[i];
      data[i] *= 6.5;
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = buffer;
    noiseSrc.loop = true;

    // Filter deburan ombak utama: lowpass dengan ayunan naik-turun frekuensi
    const waveFilter = this.ctx.createBiquadFilter();
    waveFilter.type = "lowpass";
    waveFilter.frequency.setValueAtTime(320, now);
    waveFilter.Q.setValueAtTime(2.2, now);

    const waveGain = this.ctx.createGain();
    waveGain.gain.setValueAtTime(0.85, now);

    // LFO Swell ombak ritmik (siklus 7 detik per gelombang)
    const swellLFO = this.ctx.createOscillator();
    const swellGain = this.ctx.createGain();
    swellLFO.frequency.setValueAtTime(0.14, now); // ~7 detik
    swellGain.gain.setValueAtTime(280, now);
    swellLFO.connect(swellGain);
    swellGain.connect(waveFilter.frequency);
    swellLFO.start(now);

    noiseSrc.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(this.masterGain);
    noiseSrc.start(now);

    // Sub-harmonic ocean depth drone (gelombang dasar laut Mazmur 23)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(58, now); // 58 Hz deep sea rumble
    subGain.gain.setValueAtTime(0.22, now);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);

    this.extraNodes.push(noiseSrc, swellLFO, subOsc);
  }

  /**
   * Sintesis Angin Roh Kudus (Desau Tiupan Angin Resonan + Solfeggio 528 Hz Ethereal Pad)
   */
  startWind() {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Airy white/pink noise untuk desau angin dan dedaunan
    let b0 = 0, b1 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.98 * b0 + white * 0.06;
      b1 = 0.94 * b1 + white * 0.16;
      data[i] = (white * 0.45 + b0 * 0.3 + b1 * 0.25) * 0.36;
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = buffer;
    noiseSrc.loop = true;

    // Dual bandpass whistling wind filters (tiupan bersiul lembut melalui dahan)
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.setValueAtTime(460, now);
    windFilter.Q.setValueAtTime(3.8, now);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.72, now);

    // Modulasi hembusan sepoi-sepoi dinamis
    const windLFO = this.ctx.createOscillator();
    const windLFOGain = this.ctx.createGain();
    windLFO.frequency.setValueAtTime(0.26, now); // hembusan periodik
    windLFOGain.gain.setValueAtTime(260, now);
    windLFO.connect(windLFOGain);
    windLFOGain.connect(windFilter.frequency);
    windLFO.start(now);

    noiseSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain);
    noiseSrc.start(now);

    // Ethereal Sacred Solfeggio 528 Hz Ambient Tone (Ruach Elohim / Hembusan Damai Sejahtera)
    const holyOsc = this.ctx.createOscillator();
    const holyGain = this.ctx.createGain();
    const holyLFO = this.ctx.createOscillator();
    const holyLFOGain = this.ctx.createGain();

    holyOsc.type = "sine";
    holyOsc.frequency.setValueAtTime(528, now); // 528 Hz Solfeggio tone
    holyGain.gain.setValueAtTime(0.09, now);

    // Soft vibrato pada nada rohani
    holyLFO.frequency.setValueAtTime(0.8, now);
    holyLFOGain.gain.setValueAtTime(3.5, now);
    holyLFO.connect(holyLFOGain);
    holyLFOGain.connect(holyOsc.frequency);
    holyLFO.start(now);

    holyOsc.connect(holyGain);
    holyGain.connect(this.masterGain);
    holyOsc.start(now);

    this.extraNodes.push(noiseSrc, windLFO, holyOsc, holyLFO);
  }

  /**
   * Sintesis Hujan Berkat (Rintik Air Hujan Lembut)
   */
  startRain() {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.35;
      b6 = white * 0.115926;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1700, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.68, now);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(now);
    this.extraNodes.push(src);
  }

  start(preset = "harp") {
    this.stop();
    if (!preset || preset === "off") {
      return;
    }

    this.init();
    const runId = this.runId;
    this.isPlaying = true;
    this.currentPreset = preset;

    // Pastikan masterGain aktif dengan volume saat ini
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch {}
    }

    // Tangga nada Pentatonik Mayor D & G
    const harpScale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99];
    const chimesScale = [440.0, 554.37, 659.25, 880.0, 987.77];
    const pianoChords = [
      [220.0, 277.18, 329.63, 440.0],
      [196.0, 246.94, 293.66, 392.0],
      [246.94, 293.66, 369.99, 493.88],
      [220.0, 261.63, 329.63, 440.0],
    ];

    let chordIdx = 0;

    if (preset === "harp") {
      const step = () => {
        if (!this.isPlaying || runId !== this.runId) return;
        const note = harpScale[Math.floor(Math.random() * harpScale.length)];
        this.playTone(note, 3.2, "sine");
        if (!this.isPlaying || runId !== this.runId) return;
        const nextDelay = 700 + Math.random() * 800;
        this.timer = setTimeout(step, nextDelay);
      };
      step();
    } else if (preset === "piano") {
      const step = () => {
        if (!this.isPlaying || runId !== this.runId) return;
        const chord = pianoChords[chordIdx % pianoChords.length];
        chordIdx++;
        chord.forEach((freq, idx) => {
          const t = setTimeout(() => {
            if (this.isPlaying) this.playTone(freq, 4.0, "piano");
          }, idx * 140);
          this.subTimers.push(t);
        });
        if (!this.isPlaying || runId !== this.runId) return;
        this.timer = setTimeout(step, 3600);
      };
      step();
    } else if (preset === "chimes") {
      const step = () => {
        if (!this.isPlaying || runId !== this.runId) return;
        const note = chimesScale[Math.floor(Math.random() * chimesScale.length)];
        this.playTone(note, 5.0, "chimes");
        const nextDelay = 2200 + Math.random() * 2000;
        if (!this.isPlaying || runId !== this.runId) return;
        this.timer = setTimeout(step, nextDelay);
      };
      step();
    } else if (preset === "rain") {
      this.startRain();
      const step = () => {
        if (!this.isPlaying || runId !== this.runId) return;
        const chord = pianoChords[Math.floor(Math.random() * pianoChords.length)];
        chord.forEach((freq, idx) => {
          setTimeout(() => this.playTone(freq, 4.0, "piano"), idx * 120);
        });
        const nextDelay = 4000 + Math.random() * 3000;
        if (!this.isPlaying || runId !== this.runId) return;
        this.timer = setTimeout(step, nextDelay);
      };
      step();
    } else if (preset === "galilee" || preset === "waves") {
      this.startWaves();
      this.startWind();
    } else if (preset === "temple") {
      const step = () => {
        if (!this.isPlaying || runId !== this.runId) return;
        const note = harpScale[Math.floor(Math.random() * harpScale.length)];
        this.playTone(note, 4.5, "harp");
        if (Math.random() > 0.6) {
          const chime = chimesScale[Math.floor(Math.random() * chimesScale.length)];
          setTimeout(() => this.playTone(chime, 5.0, "chimes"), 800);
        }
        if (!this.isPlaying || runId !== this.runId) return;
        const nextDelay = 2200 + Math.random() * 2000;
        this.timer = setTimeout(step, nextDelay);
      };
      step();
    } else if (preset === "judea" || preset === "wind") {
      this.startWind();
    }
  }

  stop() {
    this.runId += 1;
    this.isPlaying = false;
    this.currentPreset = "off";

    if (this.masterGain && this.ctx) {
      try {
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.setValueAtTime(0, t);
      } catch {}
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.subTimers && this.subTimers.length) {
      this.subTimers.forEach((t) => clearTimeout(t));
      this.subTimers = [];
    }
    if (this.extraNodes && this.extraNodes.length) {
      this.extraNodes.forEach((node) => {
        try {
          if (node.stop) node.stop(0);
          if (node.disconnect) node.disconnect();
        } catch {}
      });
      this.extraNodes = [];
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
      this.masterGain = null;
    }
  }
}

export const ambientEngine = new AmbientSoundEngine();

let currentUtterance = null;

/** Hentikan musik ambient + TTS browser seketika (abaikan fase hening renungan). */
export function forceStopAmbientAndSpeech() {
  window.__rhemaDevotionSilentPhase = false;
  if (canUseBrowserSpeechSynthesis()) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
  stopBreathingPrayer();
  ambientEngine.stop();
}

let currentAiVoiceVolume = 0.85;

export function setAiVoiceVolume(vol) {
  currentAiVoiceVolume = Math.max(0, Math.min(1, vol));
}

export function getAiVoiceVolume() {
  return currentAiVoiceVolume;
}

/** Preload daftar suara TTS (Chrome lazy-load). */
export function warmupSpeechVoices() {
  if (!canUseBrowserSpeechSynthesis()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

export function speakIndonesianText(text, options = {}) {
  const clean = String(text || "")
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return false;

  if (options.ambientPreset && options.ambientPreset !== "off") {
    ambientEngine.start(options.ambientPreset);
  }

  const finish = () => {
    if (options.stopAmbientOnEnd !== false) ambientEngine.stop();
    if (typeof options.onEnd === "function") options.onEnd();
  };

  const fail = (err) => {
    if (options.stopAmbientOnEnd !== false) ambientEngine.stop();
    if (typeof options.onError === "function") options.onError(err);
    else finish();
  };

  if (shouldPreferGeminiVoice()) {
    if (
      speakViaGeminiVoice(clean, {
        profile: options.profile,
        voiceOpts: options.voiceOpts,
        onEnd: finish,
        onError: fail,
      })
    ) {
      if (typeof options.onStart === "function") options.onStart();
      return true;
    }
  }

  if (!canUseBrowserSpeechSynthesis()) {
    if (
      speakViaGeminiVoice(clean, {
        profile: options.profile,
        voiceOpts: options.voiceOpts,
        onEnd: finish,
        onError: fail,
      })
    ) {
      if (typeof options.onStart === "function") options.onStart();
      return true;
    }
    console.warn("[rhema] TTS tidak tersedia — speechSynthesis absent");
    finish();
    return false;
  }

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = "id-ID";
  utter.rate = options.rate || 0.95; // Alami dan tenang
  utter.pitch = options.pitch || 1.0;
  utter.volume = options.volume ?? currentAiVoiceVolume;

  const voices = window.speechSynthesis.getVoices();
  // Prioritaskan suara neural alami (Google Indonesian, Microsoft Natural/Online, Apple Damayanti)
  const idVoice = voices.find((v) => 
    (v.lang.startsWith("id") || v.lang.includes("ID") || /indonesia/i.test(v.name)) &&
    (/natural|online|google|neural/i.test(v.name))
  ) || voices.find((v) => v.lang.startsWith("id") || v.lang.includes("ID") || /indonesia/i.test(v.name));

  if (idVoice) {
    utter.voice = idVoice;
  }

  utter.onstart = () => {
    currentUtterance = utter;
    if (typeof options.onStart === "function") options.onStart();
  };

  utter.onend = () => {
    currentUtterance = null;
    if (options.stopAmbientOnEnd !== false) ambientEngine.stop();
    if (typeof options.onEnd === "function") options.onEnd();
  };

  utter.onerror = (e) => {
    currentUtterance = null;
    if (options.stopAmbientOnEnd !== false) ambientEngine.stop();
    if (typeof options.onError === "function") options.onError(e);
  };

  window.speechSynthesis.speak(utter);
  return true;
}

export function stopSpeaking() {
  forceStopAmbientAndSpeech();
}

export function isSpeaking() {
  if (isVoicePlaybackActive()) return true;
  if (!canUseBrowserSpeechSynthesis()) return false;
  return Boolean(window.speechSynthesis?.speaking);
}

const NOTE_FREQUENCIES = {
  C: 261.63,
  "C#": 277.18,
  DB: 277.18,
  D: 293.66,
  "D#": 311.13,
  EB: 311.13,
  E: 329.63,
  F: 349.23,
  "F#": 369.99,
  GB: 369.99,
  G: 392.0,
  "G#": 415.3,
  AB: 415.3,
  A: 440.0,
  "A#": 466.16,
  BB: 466.16,
  B: 493.88,
};

/**
 * Membunyikan denting nada dasar (Pitch Pipe) untuk ibadah / pemandu pujian
 */
export function playPitchPipe(noteName = "C", duration = 2.8) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    ambientEngine.init();
    const ctx = ambientEngine.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const clean = (noteName || "C").trim().toUpperCase();
    const match = clean.match(/^[A-G](#|B|♭|♯)?/i);
    let standardNote = match ? match[0].toUpperCase().replace("♭", "B").replace("♯", "#") : "C";
    const freq = NOTE_FREQUENCIES[standardNote] || 261.63;

    const now = ctx.currentTime;

    // 1. Fundamental Reed Oscillator (Triangle wave)
    const osc1 = ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, now);

    // 2. Overtone Resonator (Sine wave)
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, now);

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const masterTone = ctx.createGain();

    // Smooth Attack -> Sustain -> Gentle Release Envelope
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.38, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    masterTone.gain.setValueAtTime(0.85, now);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(masterTone);
    gain2.connect(masterTone);
    masterTone.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
  } catch (err) {
    console.warn("Pitch pipe error:", err);
  }
}

let sleepTimerInterval = null;
let sleepTimerEndTimestamp = 0;

/**
 * Mulai Sleep Timer dengan durasi menit tertentu
 * @param {number} minutes
 * @param {(tick: { remainingSec: number, label: string }) => void} [onTick]
 * @param {() => void} [onComplete]
 * @param {{ startAmbient?: boolean, ambientPreset?: string }} [options]
 */
export function startSleepTimer(minutes, onTick, onComplete, options = {}) {
  const { startAmbient = true, ambientPreset = "piano" } = options;
  cancelSleepTimer();
  if (minutes <= 0) return;

  if (startAmbient) {
    ambientEngine.start(ambientPreset);
  }
  const totalSeconds = minutes * 60;
  sleepTimerEndTimestamp = Date.now() + totalSeconds * 1000;

  sleepTimerInterval = setInterval(() => {
    const remainingMs = sleepTimerEndTimestamp - Date.now();
    const remainingSec = Math.max(0, Math.round(remainingMs / 1000));

    // Fade out di 45 detik terakhir
    if (remainingSec <= 45 && ambientEngine.masterGain && ambientEngine.ctx) {
      const fadeRatio = remainingSec / 45;
      ambientEngine.setVolume(ambientEngine.volume * fadeRatio);
    }

    if (typeof onTick === "function") {
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      onTick({ remainingSec, label: `${mins}:${secs < 10 ? "0" : ""}${secs}` });
    }

    if (remainingSec <= 0) {
      cancelSleepTimer();
      stopSpeaking();
      ambientEngine.stop();
      ambientEngine.setVolume(0.15); // Kembalikan volume normal
      if (typeof onComplete === "function") onComplete();
    }
  }, 1000);
}

export function cancelSleepTimer() {
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
  }
  sleepTimerEndTimestamp = 0;
}

export function isSleepTimerRunning() {
  return sleepTimerInterval !== null;
}

let stagingPresetId = "off";

/**
 * UI Modal / Dropdown Picker untuk memilih musik ambient
 */
export function openAmbientPicker() {
  const modal = document.getElementById("modal-ambient-picker");
  if (!modal) return;
  stagingPresetId = ambientEngine.isPlaying ? ambientEngine.currentPreset : "off";
  renderAmbientPickerList();
  modal.classList.remove("hidden");
}

export function closeAmbientPicker() {
  const modal = document.getElementById("modal-ambient-picker");
  if (modal) modal.classList.add("hidden");
}

export function renderAmbientPickerList() {
  const listEl = document.getElementById("ambient-presets-list");
  const volSlider = /** @type {HTMLInputElement | null} */ (document.getElementById("ambient-vol-slider"));
  const volVal = document.getElementById("ambient-vol-val");

  if (volSlider) {
    volSlider.value = String(Math.round(ambientEngine.volume * 100));
  }
  if (volVal) {
    volVal.textContent = `${Math.round(ambientEngine.volume * 100)}%`;
  }

  if (!listEl) return;
  listEl.innerHTML = AMBIENT_PRESETS.map((p) => {
    const isActive = stagingPresetId === p.id;
    return `
      <button type="button" class="ambient-preset-item ${isActive ? "active" : ""}" data-preset-id="${p.id}">
        <span class="ambient-item-icon">${p.icon}</span>
        <div class="ambient-item-info">
          <span class="ambient-item-name">${p.name}</span>
          <span class="ambient-item-desc">${p.desc}</span>
        </div>
        ${isActive ? `<span class="ambient-item-check">✓ Dipilih</span>` : ""}
      </button>
    `;
  }).join("");
}

export function syncHeaderAmbientButton() {
  const btn = document.getElementById("btn-header-ambient");
  if (!btn) return;
  const current = AMBIENT_PRESETS.find((p) => p.id === ambientEngine.currentPreset && ambientEngine.isPlaying);
  if (current) {
    btn.classList.add("active");
    btn.title = `Musik Ambient: ${current.name}`;
    btn.innerHTML = `<span class="ambient-icon">${current.icon}</span>`;
  } else {
    btn.classList.remove("active");
    btn.title = "Pilih Musik Ambient (Hening)";
    btn.innerHTML = `<span class="ambient-icon">🎶</span>`;
  }
}

export function initAmbientPickerUI() {
  const btn = document.getElementById("btn-header-ambient");
  const modal = document.getElementById("modal-ambient-picker");
  const btnClose = document.getElementById("btn-close-ambient-picker");
  const btnSave = document.getElementById("btn-save-ambient-choice");
  const btnCancel = document.getElementById("btn-cancel-ambient-choice");
  const listEl = document.getElementById("ambient-presets-list");
  const volSlider = /** @type {HTMLInputElement | null} */ (document.getElementById("ambient-vol-slider"));
  const volVal = document.getElementById("ambient-vol-val");

  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAmbientPicker();
  });

  listEl?.addEventListener("click", (e) => {
    const targetBtn = /** @type {HTMLElement} */ (e.target).closest("[data-preset-id]");
    if (!targetBtn) return;
    stagingPresetId = targetBtn.getAttribute("data-preset-id") || "off";
    renderAmbientPickerList();
  });

  // Tombol Simpan & Terapkan Pilihan
  btnSave?.addEventListener("click", () => {
    if (stagingPresetId === "off") {
      ambientEngine.stop();
      stopSpeaking();
    } else {
      ambientEngine.start(stagingPresetId);
    }
    syncHeaderAmbientButton();
    closeAmbientPicker();
  });

  btnCancel?.addEventListener("click", () => closeAmbientPicker());
  btnClose?.addEventListener("click", () => closeAmbientPicker());

  modal?.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (target === modal || target.classList.contains("modal-backdrop")) {
      closeAmbientPicker();
    }
  });

  volSlider?.addEventListener("input", () => {
    const val = Number(volSlider.value) / 100;
    ambientEngine.setVolume(val);
    if (volVal) volVal.textContent = `${Math.round(val * 100)}%`;
  });

  const voiceSlider = /** @type {HTMLInputElement | null} */ (document.getElementById("ai-voice-vol-slider"));
  const voiceVal = document.getElementById("ai-voice-vol-val");
  voiceSlider?.addEventListener("input", () => {
    const val = Number(voiceSlider.value) / 100;
    setAiVoiceVolume(val);
    if (voiceVal) voiceVal.textContent = `${Math.round(val * 100)}%`;
  });

  syncHeaderAmbientButton();
}

/**
 * 4. Mindful Breathing Prayer Engine (Latihan Nafas Doa Mazmur)
 */
export const BREATHING_VERSES = [
  {
    inhale: "Damai sejahtera Kutinggalkan bagimu...",
    hold: "...damai sejahtera-Ku Kuberikan kepadamu...",
    exhale: "Janganlah gelisah dan gentar hatimu. (Yohanes 14:27)",
  },
  {
    inhale: "TUHAN adalah gembalaku...",
    hold: "...takkan kekurangan aku...",
    exhale: "Ia membimbingku ke air yang tenang. (Mazmur 23:1-2)",
  },
  {
    inhale: "Tenanglah dan ketahuilah...",
    hold: "...bahwa Akulah Allah...",
    exhale: "Aku ditinggikan di antara bangsa-bangsa! (Mazmur 46:11)",
  },
  {
    inhale: "Serahkanlah segala kekuatiranmu kepada-Nya...",
    hold: "...sebab Ia yang memelihara kamu...",
    exhale: "Damai Allah melingkupimu selalu. (1 Petrus 5:7)",
  }
];

let breathingInterval = null;
let isBreathingActive = false;
let breathingVerseIdx = 0;

export function stopBreathingPrayer() {
  const wasActive = isBreathingActive;
  if (breathingInterval) clearInterval(breathingInterval);
  breathingInterval = null;
  isBreathingActive = false;
  if (wasActive) {
    try {
      ambientEngine.stop();
    } catch {}
    syncHeaderAmbientButton();
  }
}

export function initBreathingPrayerUI(containerEl) {
  if (!containerEl) return;

  function renderBreathingWidget() {
    containerEl.innerHTML = `
      <div class="breathing-card">
        <div class="breathing-head">
          <span class="breathing-badge">🌬️ Latihan Nafas Doa</span>
          <span class="breathing-timer-tag">Rileksasi Jiwa 4-4-4</span>
        </div>
        <div class="breathing-circle-wrap">
          <div id="breathing-circle" class="breathing-circle ${isBreathingActive ? "inhale" : ""}">
            <span id="breathing-phase-text" class="breathing-phase">${isBreathingActive ? "Tarik Nafas..." : "Mulai"}</span>
          </div>
        </div>
        <p id="breathing-verse-guide" class="breathing-verse-guide">
          ${isBreathingActive ? BREATHING_VERSES[breathingVerseIdx].inhale : "Tarik nafas hening, hembuskan rasa cemas dalam hadirat Tuhan."}
        </p>
        <div class="breathing-actions">
          <button type="button" class="btn-pill primary" id="btn-toggle-breathing">
            ${isBreathingActive ? "⏹️ Hentikan Latihan" : "▶ Mulai Doa Nafas (4-4-4)"}
          </button>
        </div>
      </div>
    `;

    containerEl.querySelector("#btn-toggle-breathing")?.addEventListener("click", () => {
      if (isBreathingActive) {
        stopBreathingPrayer();
        renderBreathingWidget();
      } else {
        startBreathingCycle();
      }
    });
  }

  function startBreathingCycle() {
    isBreathingActive = true;
    breathingVerseIdx = Math.floor(Math.random() * BREATHING_VERSES.length);
    renderBreathingWidget();

    const circle = containerEl.querySelector("#breathing-circle");
    const phaseText = containerEl.querySelector("#breathing-phase-text");
    const verseText = containerEl.querySelector("#breathing-verse-guide");
    const curVerse = BREATHING_VERSES[breathingVerseIdx];

    // Mulai musik latar tenang
    try { ambientEngine.start("harp"); } catch {}

    let phase = 0; // 0: Inhale (4s), 1: Hold (4s), 2: Exhale (4s)

    function step() {
      if (!isBreathingActive) return;
      if (phase === 0) {
        if (circle) { circle.className = "breathing-circle inhale"; }
        if (phaseText) phaseText.textContent = "Tarik Nafas";
        if (verseText) verseText.textContent = `🌱 ${curVerse.inhale}`;
        phase = 1;
      } else if (phase === 1) {
        if (circle) { circle.className = "breathing-circle hold"; }
        if (phaseText) phaseText.textContent = "Tahan";
        if (verseText) verseText.textContent = `✨ ${curVerse.hold}`;
        phase = 2;
      } else {
        if (circle) { circle.className = "breathing-circle exhale"; }
        if (phaseText) phaseText.textContent = "Hembuskan";
        if (verseText) verseText.textContent = `🕊️ ${curVerse.exhale}`;
        phase = 0;
        breathingVerseIdx = (breathingVerseIdx + 1) % BREATHING_VERSES.length;
      }
    }

    step();
    if (breathingInterval) clearInterval(breathingInterval);
    breathingInterval = setInterval(step, 4000);
  }

  renderBreathingWidget();
}



