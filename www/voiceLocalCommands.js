/**
 * Perintah suara deterministik — tangani lokal tanpa Gemini (pencipta, ingatan).
 */
import {
  addLocalMemoryEntry,
  buildMemoryRecallReply,
  isMemoryRecallQuery,
  loadLocalMemory,
  parseExplicitMemory,
} from "./memoryStore.js";
import { buildCreatorReply, isCreatorQuery } from "./rhemaAddressRule.js";
import { buildTimeReply, isTimeQuery } from "./voiceSessionTime.js";

export const VOICE_MEMORY_SESSION = "rhema-voice-live";

/** @param {(msg: object) => void} broadcast */
export function emitMemorySaveBroadcast(broadcast) {
  const entries = loadLocalMemory(localStorage);
  broadcast?.({ type: "memorySaveLocal", entries });
  return entries;
}

/**
 * @param {string} text
 * @param {(msg: object) => void} broadcast
 * @param {{ speak?: boolean, userAlreadyShown?: boolean }} [opts]
 * @returns {{ handled: boolean, reply?: string, moduleId?: string }}
 */
export function handleVoiceLocalCommand(text, broadcast, opts = {}) {
  const t = text.trim();
  if (!t) return { handled: false };

  let reply = "";
  let moduleId = "";

  if (isCreatorQuery(t)) {
    reply = buildCreatorReply(true);
    moduleId = "creator";
  } else if (isTimeQuery(t)) {
    reply = buildTimeReply();
    moduleId = "time";
  } else {
    const toSave = parseExplicitMemory(t);
    if (toSave) {
      addLocalMemoryEntry(localStorage, toSave, "fact", VOICE_MEMORY_SESSION);
      emitMemorySaveBroadcast(broadcast);
      reply = `Baik, saya ingat (disimpan lokal di perangkat Anda): ${toSave}`;
      moduleId = "memory";
    } else if (isMemoryRecallQuery(t)) {
      reply = buildMemoryRecallReply(loadLocalMemory(localStorage));
      emitMemorySaveBroadcast(broadcast);
      moduleId = "memory";
    }
  }

  if (!reply) return { handled: false };

  if (!opts.userAlreadyShown) {
    broadcast?.({ type: "voiceTranscript", role: "user", delta: t, final: true, moduleId });
  }
  broadcast?.({ type: "voiceTranscript", role: "assistant", delta: reply, final: true, moduleId });
  broadcast?.({ type: "voiceLocalQueryHandled", moduleId });
  if (opts.speak !== false) {
    broadcast?.({ type: "voiceModuleSpeak", text: reply, moduleId });
  }
  broadcast?.({ type: "voiceTurnComplete" });
  return { handled: true, reply, moduleId };
}
