/**
 * Auto-lanjut khotbah multi-turn saat Gemini Live turnComplete (batas ~2–3 menit audio/turn).
 */
import { isIndonesiaProfile } from "./localeProfile.js";
import { isSermonModeActive, isTheologianPersonaActive } from "./sermonPrompts.js";

const SERMON_ACTIVE_KEY = "rhema-sermon-active";
const SERMON_MINUTES_KEY = "rhema-sermon-minutes";
const SERMON_START_KEY = "rhema-sermon-start-ms";

/** @param {number} minutes */
export function markSermonStarted(minutes) {
  const m = Math.min(15, Math.max(5, Number(minutes) || 8));
  try {
    localStorage.setItem(SERMON_ACTIVE_KEY, "1");
    localStorage.setItem(SERMON_MINUTES_KEY, String(m));
    localStorage.setItem(SERMON_START_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function markSermonEnded() {
  try {
    localStorage.removeItem(SERMON_ACTIVE_KEY);
    localStorage.removeItem(SERMON_MINUTES_KEY);
    localStorage.removeItem(SERMON_START_KEY);
  } catch {
    /* ignore */
  }
}

export function isSermonActive() {
  try {
    return localStorage.getItem(SERMON_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

function getSermonMinutes() {
  try {
    return Number(localStorage.getItem(SERMON_MINUTES_KEY)) || 8;
  } catch {
    return 8;
  }
}

function getSermonStartMs() {
  try {
    return Number(localStorage.getItem(SERMON_START_KEY)) || Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * @param {number} segment
 * @param {number} targetMinutes
 * @param {number} elapsedMinutes
 */
function buildContinuationPrompt(segment, targetMinutes, elapsedMinutes) {
  const remaining = Math.max(1, Math.round(targetMinutes - elapsedMinutes));
  const exposition = isTheologianPersonaActive();
  const closeAt = Math.max(6, Math.ceil(targetMinutes / 2.5));

  if (!isIndonesiaProfile()) {
    const tag = exposition ? "EXPOSITION" : "SERMON";
    if (segment >= closeAt || elapsedMinutes >= targetMinutes - 1) {
      return `[CONTINUE ${tag} — CLOSING]
Continue without repeating the opening or points already covered.
Finish: ${exposition ? "theological implications & pastoral application" : "practical application"}, closing prayer, and blessing (say "Amen").
~${remaining} minutes left. Close warmly.`;
    }
    if (segment <= 2) {
      return `[CONTINUE ${tag} — PART ${segment}]
Continue from the next point. Do not repeat greeting or Scripture already read.
${exposition ? "Continue keyword analysis, passage context, or next exposition section." : "Continue the next sermon point with explanation and real-life examples."}
Target: ${targetMinutes} min (~${Math.round(elapsedMinutes)} min elapsed).`;
    }
    return `[CONTINUE ${tag} — PART ${segment}]
Continue without repeating. Move to ${exposition ? "cross-references, theology, or pastoral application" : "illustration, application, or closing prayer"} as appropriate.
Target: ${targetMinutes} min (~${Math.round(elapsedMinutes)} min elapsed). Speak fully.`;
  }

  const tag = exposition ? "EKSPOSISI" : "KHOTBAH";
  if (segment >= closeAt || elapsedMinutes >= targetMinutes - 1) {
    return `[LANJUT ${tag} — PENUTUP]
Lanjutkan tanpa mengulang pembukaan atau poin yang sudah disampaikan.
Selesaikan bagian yang belum: ${exposition ? "implikasi teologi & aplikasi pastoral" : "aplikasi praktis singkat"}, doa penutup, dan berkat (ucapkan "Amin").
Target sisa waktu: ~${remaining} menit. Jangan terlalu panjang — tutup dengan hangat.`;
  }
  if (segment <= 2) {
    return `[LANJUT ${tag} — BAGIAN ${segment}]
Lanjutkan dari poin berikutnya. Jangan ulang sapaan atau bacaan ayat yang sudah dibacakan.
${exposition ? "Lanjutkan analisis kata kunci, konteks pasal, atau bagian eksposisi berikutnya." : "Lanjutkan struktur: poin khotbah berikutnya dengan penjelasan dan contoh kehidupan nyata."}
Target total: ${targetMinutes} menit (sudah ~${Math.round(elapsedMinutes)} menit).`;
  }
  return `[LANJUT ${tag} — BAGIAN ${segment}]
Lanjutkan tanpa mengulang. Lanjut ke ${exposition ? "cross-reference, implikasi teologi, atau aplikasi pastoral" : "ilustrasi, aplikasi praktis, atau doa penutup"} sesuai progres.
Target total: ${targetMinutes} menit (sudah ~${Math.round(elapsedMinutes)} menit). Bicara cukup panjang.`;
}

/**
 * @param {import("../shared/chatCore.js").ChatTransport & { voice?: { isLive?: () => boolean, sendText?: (t:string)=>boolean, sendClientContent?: (t:string)=>boolean, sendTextOrStart?: (t:string)=>void } }} transport
 */
export function initSermonLiveContinuer(transport) {
  let continuationCount = 0;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let continuationTimer = null;
  let userInterrupted = false;

  function clearContinuationTimer() {
    if (continuationTimer) {
      clearTimeout(continuationTimer);
      continuationTimer = null;
    }
  }

  function sendContinuation(text) {
    const voice = transport.voice;
    if (!voice?.isLive?.()) return;
    if (voice.sendClientContent?.(text)) return;
    if (voice.sendText?.(text)) return;
    voice.sendTextOrStart?.(text);
  }

  transport.onMessage?.((msg) => {
    const m = /** @type {{type?:string,status?:string}} */ (msg);

    if (m.type === "voiceInterrupt") {
      userInterrupted = true;
      clearContinuationTimer();
      return;
    }

    if (m.type === "voiceTranscript" && /** @type {{role?:string}} */ (msg).role === "user") {
      userInterrupted = false;
    }

    if (m.type === "voiceStatus") {
      if (m.status === "off") {
        markSermonEnded();
        continuationCount = 0;
        userInterrupted = false;
        clearContinuationTimer();
      }
      return;
    }

    if (m.type !== "voiceTurnComplete") return;
    if (!isSermonActive() || !isSermonModeActive()) return;
    if (!transport.voice?.isLive?.()) return;
    if (userInterrupted) return;

    const targetMinutes = getSermonMinutes();
    const elapsedMinutes = (Date.now() - getSermonStartMs()) / 60000;
    const maxContinuations = Math.max(6, Math.ceil(targetMinutes / 1.5));

    if (elapsedMinutes >= targetMinutes + 0.5 || continuationCount >= maxContinuations) {
      markSermonEnded();
      return;
    }

    clearContinuationTimer();
    continuationTimer = setTimeout(() => {
      continuationTimer = null;
      if (!isSermonActive() || !transport.voice?.isLive?.()) return;
      if (userInterrupted) return;

      continuationCount += 1;
      const prompt = buildContinuationPrompt(continuationCount, targetMinutes, elapsedMinutes);
      sendContinuation(prompt);

      if (elapsedMinutes >= targetMinutes - 0.75) {
        markSermonEnded();
      }
    }, 1200);
  });
}
