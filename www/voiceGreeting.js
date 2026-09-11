/**
 * Sapaan awal vs lanjut percakapan — sesi voice live.
 */

import { RHEMA_ADDRESS_RULE_SHORT } from "./rhemaAddressRule.js";
import { formatChatHistory } from "./memoryStore.js";

const VOICE_HISTORY_STORAGE_KEY = "rhema-voice-conversation-history";

export const VOICE_OPEN_GREETING_PROMPT = `[SAPAAN AWAL SESI]
${RHEMA_ADDRESS_RULE_SHORT}
Ucapkan dengan nada gembala yang hangat, singkat, dan natural:
"Shalom, saudara. Ada yang ingin ditanyakan, atau ingin dibahas mengenai firman Tuhan?"
Setelah itu DIAM dan dengarkan user. Jangan lanjut bicara tanpa input user.`;

/** @returns {Array<{ role: string, text: string }>} */
function loadRecentVoiceTurns(max = 8) {
  try {
    const raw = localStorage.getItem(VOICE_HISTORY_STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return [];
    return items
      .filter((m) => m?.text?.trim())
      .slice(-max)
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        text: String(m.text).trim(),
      }));
  } catch {
    return [];
  }
}

/** Ada riwayat percakapan — jangan ulang sapaan Shalom. */
export function hasVoiceConversationHistory() {
  return loadRecentVoiceTurns(1).length > 0;
}

function buildVoiceResumePrompt() {
  const history = formatChatHistory(loadRecentVoiceTurns(10), 10);
  return `[LANJUTKAN PERCAKAPAN LIVE — JANGAN SAPA ULANG]
${RHEMA_ADDRESS_RULE_SHORT}
Percakapan sebelumnya terputus (refresh / reconnect). JANGAN ulangi "Shalom", perkenalan diri, atau sapaan pembuka.
Lanjutkan thread/topik terakhir secara natural. DIAM dan dengarkan user — jangan bicara duluan kecuali user meminta lanjutkan.

${history || "(Riwayat singkat tersimpan di memori lokal.)"}`;
}

function sendVoiceSystemPrompt(transport, prompt) {
  const voice = transport.voice;
  if (!voice?.sendText && !voice?.sendClientContent) return false;
  if (voice.sendText?.(prompt)) return true;
  voice.sendClientContent?.(prompt);
  return true;
}

/** Lanjut sesi yang terputus — tanpa greeting pembuka. */
export function deliverVoiceResumeContext(transport) {
  if (window.__rhemaVoiceUserPromptPending) return;
  if (!hasVoiceConversationHistory()) {
    deliverVoiceOpenGreeting(transport);
    return;
  }
  sendVoiceSystemPrompt(transport, buildVoiceResumePrompt());
}

/**
 * @param {import("../shared/chatCore.js").ChatTransport & { voice?: { sendClientContent?: (t:string)=>boolean, sendText?: (t:string)=>boolean } }} transport
 */
export function deliverVoiceOpenGreeting(transport) {
  if (window.__rhemaVoiceUserPromptPending) return;
  if (hasVoiceConversationHistory()) {
    deliverVoiceResumeContext(transport);
    return;
  }
  sendVoiceSystemPrompt(transport, VOICE_OPEN_GREETING_PROMPT);
}
