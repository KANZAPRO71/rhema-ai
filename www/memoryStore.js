/**
 * Ingatan jangka panjang — hanya lokal user (localStorage browser).
 * Tidak pernah diunggah ke cloud untuk disimpan; hanya dikirim ke model per-request.
 */

import { RHEMA_CREATOR_NAME } from "./rhemaAddressRule.js";

const STORAGE_KEY = "rhema-ai-local-memory";
const MAX_ENTRIES = 120;

/** @typedef {{ id: string, kind: "fact"|"preference"|"session", text: string, sessionId?: string, createdAt: string, updatedAt: string }} MemoryEntry */

/** Ingatan permanen produk — selalu disertakan, tidak dari localStorage user. */
export function getPermanentMemoryEntries() {
  return [
    {
      id: "permanent-rhema-creator",
      kind: "fact",
      text: `Pencipta dan pengembang Rhema AI serta Alkitab Voice adalah ${RHEMA_CREATOR_NAME}.`,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

/** @param {MemoryEntry[]} entries */
export function mergePermanentMemory(entries) {
  const permanent = getPermanentMemoryEntries();
  const rest = (entries ?? []).filter((e) => e.id !== "permanent-rhema-creator");
  return [...permanent, ...rest];
}

function newId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** @param {Storage|null|undefined} storage */
export function loadLocalMemory(storage) {
  try {
    const raw = storage?.getItem?.(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

/** @param {Storage|null|undefined} storage @param {MemoryEntry[]} entries */
export function saveLocalMemory(storage, entries) {
  if (!storage?.setItem) return;
  const payload = {
    version: 1,
    localOnly: true,
    storage: "browser-localStorage",
    updatedAt: new Date().toISOString(),
    entries: entries.slice(0, MAX_ENTRIES),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/** @param {MemoryEntry[]} entries @param {number} [max] */
export function formatMemoryForPrompt(entries, max = 20) {
  const pick = entries.slice(0, max);
  if (!pick.length) return "";
  const lines = pick.map((e) => `- [${e.kind}] ${e.text}`);
  return [
    "=== INGATAN (permanen + interaksi user, lokal perangkat, jangan simpan ke cloud) ===",
    ...lines,
    "=== AKHIR INGATAN ===",
  ].join("\n");
}

/** Ingatan untuk prompt — permanen + fakta/preferensi user + ringkasan percakapan. */
export function formatInteractionMemoryForPrompt(storage, max = 15) {
  const entries = mergePermanentMemory(loadLocalMemory(storage));
  const facts = entries.filter((e) => e.kind === "fact" || e.kind === "preference");
  const sessions = entries.filter((e) => e.kind === "session");
  return formatMemoryForPrompt([...facts, ...sessions].slice(0, max), max);
}

/** @param {Array<{role:string,text?:string}>} messages @param {number} [maxTurns] */
export function formatChatHistory(messages, maxTurns = 12) {
  const slice = messages.filter((m) => m.text?.trim()).slice(-maxTurns);
  if (!slice.length) return "";
  const lines = slice.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text.trim()}`);
  return ["=== RIWAYAT CHAT SESI INI ===", ...lines, "=== AKHIR RIWAYAT ==="].join("\n");
}

const SAVE_RE =
  /^(?:ingat(?:kan)?|remember|simpan(?:\s+ke\s+ingatan)?|catat)\s*(?:bahwa|:)?\s*(.+)$/is;

const RECALL_RE =
  /\b(apa\s+yang\s+(kamu\s+)?ingat|kamu\s+ingat\s+apa|what\s+do\s+you\s+remember|ingatan\s+jangka\s+panjang|memory\s+anda)\b/i;

/** @param {string} text */
export function parseExplicitMemory(text) {
  const m = SAVE_RE.exec(text.trim());
  return m?.[1]?.trim() || null;
}

/** @param {string} text */
export function isMemoryRecallQuery(text) {
  return RECALL_RE.test(text.trim());
}

/** @param {MemoryEntry[]} entries */
export function buildMemoryRecallReply(entries) {
  const merged = mergePermanentMemory(entries);
  if (!merged.length) {
    return "Belum ada ingatan lokal tersimpan. Anda bisa bilang: ingat bahwa …";
  }
  const facts = merged.filter((e) => e.kind !== "session").slice(0, 5);
  const sessions = entries.filter((e) => e.kind === "session").slice(0, 3);
  const parts = [];
  if (facts.length) {
    parts.push("Yang saya ingat (disimpan lokal di perangkat Anda):");
    for (const f of facts) parts.push(`• ${f.text}`);
  }
  if (sessions.length) {
    parts.push("Ringkasan chat sebelumnya:");
    for (const s of sessions) parts.push(`• ${s.text.slice(0, 160)}`);
  }
  return parts.join(" ");
}

/** @param {Storage|null|undefined} storage @param {string} text @param {"fact"|"preference"|"session"} [kind] @param {string} [sessionId] */
export function addLocalMemoryEntry(storage, text, kind = "fact", sessionId) {
  const t = text.trim();
  if (!t) return null;
  const entries = loadLocalMemory(storage);
  const now = new Date().toISOString();
  const dup = entries.find((e) => e.text.toLowerCase() === t.toLowerCase());
  if (dup) {
    dup.updatedAt = now;
    dup.text = t;
    saveLocalMemory(storage, entries);
    return dup;
  }
  const entry = {
    id: newId(),
    kind,
    text: t,
    sessionId,
    createdAt: now,
    updatedAt: now,
  };
  entries.unshift(entry);
  saveLocalMemory(storage, entries);
  return entry;
}

/** @param {Storage|null|undefined} storage @param {string} sessionId @param {string} title @param {Array<{role:string,text?:string}>} messages */
export function syncLocalSessionMemory(storage, sessionId, title, messages) {
  const lines = messages
    .filter((m) => m.text?.trim() && (m.role === "user" || m.role === "assistant"))
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Rhema"}: ${m.text.trim().slice(0, 200)}`);
  if (!lines.length) return;
  const summary = `[${title || "Chat"}] ${lines.join(" | ")}`.slice(0, 900);
  const entries = loadLocalMemory(storage);
  const idx = entries.findIndex((e) => e.kind === "session" && e.sessionId === sessionId);
  const now = new Date().toISOString();
  if (idx >= 0) {
    entries[idx].text = summary;
    entries[idx].updatedAt = now;
  } else {
    entries.unshift({
      id: newId(),
      kind: "session",
      text: summary,
      sessionId,
      createdAt: now,
      updatedAt: now,
    });
  }
  saveLocalMemory(storage, entries);
}
