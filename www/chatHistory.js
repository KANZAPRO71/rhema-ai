const STORAGE_KEY = "rhema-ai-sessions";
export const CURRENT_SESSION_KEY = "rhema-ai-current-session-id";

export function loadSessions(storage) {
  try {
    const raw = storage?.getItem?.(STORAGE_KEY) ?? storage?.get?.(STORAGE_KEY);
    if (!raw) return [];
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSessions(storage, sessions) {
  const json = JSON.stringify(sessions.slice(0, 50));
  if (storage?.setItem) storage.setItem(STORAGE_KEY, json);
  else if (storage?.update) storage.update(STORAGE_KEY, JSON.parse(json));
}

export function createSession(title = "Chat baru") {
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    settings: null,
  };
}

export function upsertSession(sessions, session) {
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  return sessions;
}
