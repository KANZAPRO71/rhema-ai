/**
 * Contextual Memory & Threading — sesi live voice (JS, bukan Kotlin WS).
 * Menjaga kesinambungan curhat terputus-putus & tekanan internal antar giliran.
 */
import { formatChatHistory } from "./memoryStore.js";

export const VOICE_HISTORY_STORAGE_KEY = "rhema-voice-conversation-history";

const MAX_PERSISTED_ITEMS = 60;
const MAX_THREAD_TURNS = 10;

/** @typedef {{ role: "user" | "assistant", text: string, at?: number }} VoiceTurn */

/** @type {VoiceTurn[]} */
let inSessionTurns = [];

/** Reset memori in-session — panggil saat sesi live baru dimulai. */
export function beginVoiceSession() {
  inSessionTurns = [];
}

/** Kosongkan buffer sesi — panggil saat stop/disconnect. */
export function endVoiceSession() {
  inSessionTurns = [];
}

/** @returns {VoiceTurn[]} */
export function loadPersistedVoiceTurns(max = MAX_THREAD_TURNS) {
  try {
    const raw = localStorage.getItem(VOICE_HISTORY_STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return [];
    return items
      .filter((m) => m?.text?.trim() && (m.role === "user" || m.role === "assistant"))
      .slice(-max)
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        text: String(m.text).trim(),
      }));
  } catch {
    return [];
  }
}

/** @param {VoiceTurn[]} items */
export function savePersistedVoiceTurns(items) {
  try {
    localStorage.setItem(VOICE_HISTORY_STORAGE_KEY, JSON.stringify(items.slice(-MAX_PERSISTED_ITEMS)));
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {"user"|"assistant"} role
 * @param {string} text
 */
export function recordVoiceTurn(role, text) {
  const t = String(text || "").trim();
  if (!t || (role !== "user" && role !== "assistant")) return;
  inSessionTurns.push({ role, text: t, at: Date.now() });
  while (inSessionTurns.length > MAX_THREAD_TURNS * 2) inSessionTurns.shift();
}

/** @param {number} [max] @returns {VoiceTurn[]} */
export function getActiveThreadTurns(max = MAX_THREAD_TURNS) {
  const persisted = loadPersistedVoiceTurns(max);
  if (!inSessionTurns.length) return persisted.slice(-max);
  const budget = Math.max(0, max - inSessionTurns.length);
  return [...persisted.slice(-budget), ...inSessionTurns].slice(-max);
}

/** @param {VoiceTurn[]} turns */
function extractEmotionalThemes(turns) {
  const blob = turns
    .map((t) => t.text)
    .join(" ")
    .toLowerCase();
  /** @type {string[]} */
  const themes = [];
  if (/tekanan internal|inner critic|gagal|tidak berguna|begitu bodoh|burnout|beban/.test(blob)) {
    themes.push("tekanan internal");
  }
  if (/kecemasan|cemas|overthinking|eksistensial/.test(blob)) {
    themes.push("kecemasan");
  }
  if (/identitas|banding|media sosial|linkedin|fomo/.test(blob)) {
    themes.push("identitas digital");
  }
  if (/generasi|gen z|millennial/.test(blob)) {
    themes.push("lintas generasi");
  }
  return themes.join(", ");
}

/** Blok untuk systemInstruction saat setup sesi — max 10 giliran. */
export function getVoiceThreadContextForSetup() {
  const turns = getActiveThreadTurns(MAX_THREAD_TURNS);
  if (!turns.length) return "";
  const themes = extractEmotionalThemes(turns);
  const history = formatChatHistory(
    turns.map((t) => ({ role: t.role, text: t.text })),
    MAX_THREAD_TURNS,
  );
  return `[KONTEKS MEMORI PERCAKAPAN LIVE — threading state]
${themes ? `Tema emosional aktif: ${themes}.\n` : ""}${history}
Aturan threading: user mungkin bicara terputus-putus karena beban emosional — anggap fragment sebagai satu pergumulan. Jangan ulangi sapaan Shalom/perkenalan. Jangan mengulang validasi yang sama. Ingat luka batin yang sudah diungkapkan sebelumnya. Memori personal = thread sesi + localStorage perangkat + "ingat bahwa…" — jelaskan bila user minta, tanpa tanya balik "apa yang ingin diingat?".`;
}

/** Format turns untuk clientContent (teks prompt — bukan audio stream). */
export function getClientContentTurns(userText) {
  const t = String(userText || "").trim();
  if (!t) return [];
  const prior = getActiveThreadTurns(Math.max(0, MAX_THREAD_TURNS - 1));
  const turns = prior.map((item) => ({
    role: item.role === "user" ? "user" : "model",
    parts: [{ text: item.text }],
  }));
  turns.push({ role: "user", parts: [{ text: t }] });
  return turns.slice(-MAX_THREAD_TURNS);
}

export function hasVoiceThreadHistory() {
  return getActiveThreadTurns(1).length > 0;
}
