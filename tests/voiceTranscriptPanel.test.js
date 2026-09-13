import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

/** @type {Map<string, string>} */
const store = new Map();
/** @type {Storage | undefined} */
let prevStorage;

before(() => {
  prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
});

after(() => {
  globalThis.localStorage = prevStorage;
  store.clear();
});

describe("voiceTranscriptPanel", () => {
  it("persists and loads voice history", async () => {
    const { loadVoiceHistory, saveVoiceHistory, VOICE_HISTORY_STORAGE_KEY } = await import(
      "../www/voiceTranscriptPanel.js"
    );
    assert.equal(VOICE_HISTORY_STORAGE_KEY, "rhema-voice-conversation-history");
    saveVoiceHistory([
      { id: "v1", role: "user", text: "Halo", time: "10:00" },
      { id: "v2", role: "assistant", text: "Shalom", time: "10:01" },
    ]);
    const items = loadVoiceHistory();
    assert.equal(items.length, 2);
    assert.equal(items[1].text, "Shalom");
  });
});
