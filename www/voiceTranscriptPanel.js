/**
 * Voice transcript UI — riwayat percakapan live di tab Rhema AI.
 */
import { getSpeechLocale } from "./localeProfile.js";
import { escapeHtml } from "./markdown.js";
import { parseExplicitMemory, syncLocalSessionMemory } from "./memoryStore.js";
import { t } from "./uiStrings.js";

export const VOICE_HISTORY_STORAGE_KEY = "rhema-voice-conversation-history";
const VOICE_MEMORY_SESSION = "rhema-voice-live";

/** @returns {Array<{ id: string, role: "user" | "assistant", text: string, time: string }>} */
export function loadVoiceHistory() {
  try {
    const raw = localStorage.getItem(VOICE_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** @param {Array<{ id: string, role: "user" | "assistant", text: string, time: string }>} items */
export function saveVoiceHistory(items) {
  try {
    localStorage.setItem(VOICE_HISTORY_STORAGE_KEY, JSON.stringify(items.slice(-60)));
  } catch {
    /* quota / private mode */
  }
}

function voiceTimeLocale() {
  return getSpeechLocale();
}

export function voiceEmptyStateHtml() {
  return `
    <div class="voice-empty-state" id="voice-empty-state">
      <div class="empty-sacred-icon">🕊️</div>
      <p class="empty-title">${escapeHtml(t("voice.empty.title"))}</p>
      <p class="empty-desc">${escapeHtml(t("voice.empty.descClear"))}</p>
    </div>
  `;
}

/** Auto-scroll hanya jika user sudah di bagian bawah — biar bisa scroll riwayat saat live. */
function scrollVoiceTranscript(box, force = false) {
  if (!box) return;
  const gap = box.scrollHeight - box.scrollTop - box.clientHeight;
  if (force || gap < 96) box.scrollTop = box.scrollHeight;
}

export function initVoiceTranscriptHistory() {
  const box = document.getElementById("voice-transcript");
  if (!box) return;
  const history = loadVoiceHistory();
  if (!history.length) return;

  const empty = document.getElementById("voice-empty-state");
  if (empty) empty.style.display = "none";

  const existingBubbles = box.querySelectorAll(".vt-line");
  if (existingBubbles.length === history.length) return;

  box.innerHTML = "";
  for (const item of history) {
    renderVoiceTranscriptBubble(item.role, item.text, item.time, item.id);
  }
  scrollVoiceTranscript(box, true);
}

export function refreshVoiceTranscriptToTop() {
  const box = document.getElementById("voice-transcript");
  if (!box) return;
  const history = loadVoiceHistory();
  if (!history.length) return;

  const empty = document.getElementById("voice-empty-state");
  if (empty) empty.style.display = "none";

  box.innerHTML = "";
  for (const item of history) {
    renderVoiceTranscriptBubble(item.role, item.text, item.time, item.id);
  }
  box.scrollTo({ top: 0, behavior: "smooth" });
}

export function renderVoiceTranscriptBubble(role, text, timeStr, id) {
  const box = document.getElementById("voice-transcript");
  if (!box) return null;
  const empty = document.getElementById("voice-empty-state");
  if (empty) empty.style.display = "none";

  const isUser = role === "user";
  const itemId = id || "vmsg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const time = timeStr || new Date().toLocaleTimeString(voiceTimeLocale(), { hour: "2-digit", minute: "2-digit" });

  const line = document.createElement("div");
  line.className = `vt-line ${isUser ? "user" : "assistant"}`;
  line.id = itemId;
  line.innerHTML = `
    <div class="vt-meta-row">
      <span class="vt-role-tag">${isUser ? t("voice.role.user") : t("voice.role.assistant")}</span>
      <span class="vt-time-tag">${time}</span>
    </div>
    <div class="vt-bubble">${escapeHtml(text)}</div>
  `;

  box.appendChild(line);
  scrollVoiceTranscript(box, false);
  return line;
}

let liveAssistantBubble = null;
let liveAssistantText = "";
let liveUserBubble = null;
let liveUserText = "";
/** @type {ReturnType<typeof setTimeout> | null} */
let assistantSilenceTimer = null;
let suppressGeminiAssistantUntil = 0;

/** @param {number} [ms=12000] */
export function suppressGeminiAssistantFor(ms = 12000) {
  suppressGeminiAssistantUntil = Date.now() + ms;
}

export function handleVoiceTranscriptStream(role, delta, final = false, moduleId = "") {
  const box = document.getElementById("voice-transcript");
  if (!box) return;

  const isUser = role === "user";

  if (!isUser && moduleId) {
    finalizeLiveAssistant();
    finalizeLiveUser();
    renderVoiceTranscriptBubble("assistant", delta || "…");
    if (final && delta?.trim()) commitVoiceHistory("assistant", delta.trim());
    return;
  }

  if (!isUser && Date.now() < suppressGeminiAssistantUntil) {
    return;
  }

  if (isUser) {
    if (!liveUserBubble) {
      finalizeLiveAssistant();
      const id = "vmsg-live-user";
      liveUserBubble = renderVoiceTranscriptBubble("user", delta || "…", "", id);
      liveUserText = delta || "";
    } else {
      liveUserText = delta || liveUserText;
      const bubbleEl = liveUserBubble.querySelector(".vt-bubble");
      if (bubbleEl) bubbleEl.textContent = liveUserText;
      scrollVoiceTranscript(box);
    }
    if (final && liveUserText.trim()) {
      commitVoiceHistory("user", liveUserText.trim());
      if (liveUserBubble) liveUserBubble.id = "vmsg-" + Date.now();
      liveUserBubble = null;
      liveUserText = "";
    }
  } else {
    if (!liveAssistantBubble) {
      finalizeLiveUser();
      const id = "vmsg-live-assistant";
      liveAssistantText = delta || "";
      liveAssistantBubble = renderVoiceTranscriptBubble("assistant", liveAssistantText || "…", "", id);
    } else {
      const prev = liveAssistantText;
      if (delta && delta.startsWith(prev)) {
        liveAssistantText = delta;
      } else if (delta && !prev.endsWith(delta)) {
        liveAssistantText = prev + delta;
      }
      const bubbleEl = liveAssistantBubble.querySelector(".vt-bubble");
      if (bubbleEl) bubbleEl.textContent = liveAssistantText;
    }
    scrollVoiceTranscript(box);

    if (assistantSilenceTimer) clearTimeout(assistantSilenceTimer);
    assistantSilenceTimer = setTimeout(() => {
      finalizeLiveAssistant();
    }, 2200);

    if (final && liveAssistantText.trim()) {
      finalizeLiveAssistant();
    }
  }
}

export function finalizeLiveUser() {
  if (liveUserBubble && liveUserText.trim()) {
    commitVoiceHistory("user", liveUserText.trim());
    liveUserBubble.id = "vmsg-" + Date.now();
  }
  liveUserBubble = null;
  liveUserText = "";
}

export function finalizeLiveAssistant() {
  if (assistantSilenceTimer) {
    clearTimeout(assistantSilenceTimer);
    assistantSilenceTimer = null;
  }
  if (liveAssistantBubble && liveAssistantText.trim()) {
    commitVoiceHistory("assistant", liveAssistantText.trim());
    liveAssistantBubble.id = "vmsg-" + Date.now();
  }
  liveAssistantBubble = null;
  liveAssistantText = "";
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    finalizeLiveAssistant();
    finalizeLiveUser();
  });
}

export function commitVoiceHistory(role, text) {
  if (!text?.trim()) return;
  const history = loadVoiceHistory();
  history.push({
    id: "vmsg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    role,
    text: text.trim(),
    time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  });
  saveVoiceHistory(history);

  if (role === "user") {
    const fact = parseExplicitMemory(text);
    if (fact) {
      document.dispatchEvent(new CustomEvent("rhema-memory-updated"));
    }
  }
}

export function syncVoiceInteractionMemory() {
  const history = loadVoiceHistory().slice(-10);
  if (!history.length) return;
  syncLocalSessionMemory(
    localStorage,
    VOICE_MEMORY_SESSION,
    t("voice.memory.sessionTitle"),
    history.map((h) => ({ role: h.role, text: h.text })),
  );
  document.dispatchEvent(new CustomEvent("rhema-memory-updated"));
}

export function clearVoiceTranscriptHistory() {
  saveVoiceHistory([]);
  liveAssistantBubble = null;
  liveAssistantText = "";
  liveUserBubble = null;
  liveUserText = "";
  const box = document.getElementById("voice-transcript");
  if (box) box.innerHTML = voiceEmptyStateHtml();
}
