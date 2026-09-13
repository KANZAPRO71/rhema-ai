/**
 * Transport chat lokal — menggantikan WebSocket / PC server di app native.
 */
import { GEMINI_MODEL, setStoredGoogleKey, getStoredGoogleKey, googleKeyConfigured } from "./geminiConstants.js";
import { isAllowedExternalUrl } from "./safeUrl.js";
import { streamGeminiChat } from "./geminiClient.js";
import { providerKeyStatus } from "./appBackend.js";
import {
  addLocalMemoryEntry,
  formatInteractionMemoryForPrompt,
  isMemoryRecallQuery,
  buildMemoryRecallReply,
  parseExplicitMemory,
  loadLocalMemory,
} from "./memoryStore.js";
import { buildCreatorReply, isCreatorQuery } from "./rhemaAddressRule.js";

/**
 * @param {{ post: Function, broadcast: Function, onMessage?: Function, voiceProfile?: string }} transport
 * @param {{ handle: (msg: object) => boolean }} [voiceBridge]
 */
export function wireNativeBackend(transport, voiceBridge) {
  let settings = {
    model: GEMINI_MODEL,
    modelProvider: "google",
    mode: "agent",
    autoRun: "manual",
  };
  /** @type {AbortController | null} */
  let geminiAbort = null;

  function emit(msg) {
    transport.broadcast?.(msg);
  }

  async function sendBoot() {
    emit({
      type: "boot",
      cwd: "device",
      settings,
      hasApiKey: googleKeyConfigured(),
      providerKeyStatus: providerKeyStatus(),
      rules: [],
      sessions: [],
    });
  }

  async function handleSend(msg) {
    const key = getStoredGoogleKey();
    if (!key) {
      emit({ type: "error", message: "Gemini API key belum diset. Tempel key BYOK di onboarding atau Pengaturan." });
      return;
    }

    const text = String(msg.text ?? "").trim();
    const images = msg.images;
    if (!text && !(images?.length)) return;

    const toSave = parseExplicitMemory(text);
    if (toSave) {
      addLocalMemoryEntry(localStorage, toSave, "fact");
      const entries = loadLocalMemory(localStorage);
      emit({ type: "memorySaveLocal", entries });
      emit({ type: "runStarted", prompt: text, images });
      emit({
        type: "stream",
        event: { kind: "delta", update: { type: "text-delta", text: `Baik, saya ingat (disimpan lokal di perangkat Anda): ${toSave}` } },
      });
      emit({ type: "runComplete", status: "completed", durationMs: 0 });
      return;
    }

    if (isMemoryRecallQuery(text)) {
      const reply = buildMemoryRecallReply(loadLocalMemory(localStorage));
      emit({ type: "runStarted", prompt: text });
      emit({ type: "stream", event: { kind: "delta", update: { type: "text-delta", text: reply } } });
      emit({ type: "runComplete", status: "completed", durationMs: 0 });
      return;
    }

    if (isCreatorQuery(text)) {
      const reply = buildCreatorReply(false);
      emit({ type: "runStarted", prompt: text });
      emit({ type: "stream", event: { kind: "delta", update: { type: "text-delta", text: reply } } });
      emit({ type: "runComplete", status: "completed", durationMs: 0 });
      return;
    }

    geminiAbort?.abort();
    geminiAbort = new AbortController();
    const started = Date.now();
    emit({ type: "runStarted", prompt: text, images, regenerate: Boolean(msg.regenerate) });

    const recent = Array.isArray(msg.recentMessages) ? msg.recentMessages : [];
    const memoryCtx = formatInteractionMemoryForPrompt(localStorage);
    const historyCtx = recent
      .slice(-8)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text ?? ""}`)
      .join("\n");
    const context = [memoryCtx, historyCtx ? `=== RIWAYAT CHAT SESI INI ===\n${historyCtx}\n=== AKHIR RIWAYAT ===` : ""]
      .filter(Boolean)
      .join("\n\n");

    try {
      const model = GEMINI_MODEL;

      await streamGeminiChat({
        apiKey: key,
        model,
        prompt: text,
        context: context || undefined,
        images,
        signal: geminiAbort.signal,
        onModelFallback: (from, to) => {
          emit({
            type: "stream",
            event: {
              kind: "message",
              message: { type: "status", message: `Model ${from} sibuk — mencoba ${to}…` },
            },
          });
        },
        onDelta: (chunk) => {
          emit({
            type: "stream",
            event: { kind: "delta", update: { type: "text-delta", text: chunk } },
          });
        },
      });

      emit({ type: "runComplete", status: "completed", durationMs: Date.now() - started });
    } catch (err) {
      if (geminiAbort.signal.aborted) {
        emit({ type: "runComplete", status: "cancelled", durationMs: Date.now() - started });
        return;
      }
      emit({
        type: "runComplete",
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
      });
    }
  }

  transport.post = (msg) => {
    if (voiceBridge?.handle?.(msg)) return;
    void (async () => {
      switch (msg.type) {
        case "ready":
        case "init":
          if (msg.settings) settings = { ...settings, ...msg.settings };
          await sendBoot();
          break;
        case "send":
          if (msg.settings) settings = { ...settings, ...msg.settings };
          await handleSend(msg);
          break;
        case "cancel":
          geminiAbort?.abort();
          geminiAbort = null;
          emit({ type: "runComplete", status: "cancelled" });
          break;
        case "newChat":
          if (msg.settings) settings = { ...settings, ...msg.settings };
          emit({ type: "cleared" });
          await sendBoot();
          break;
        case "updateSettings":
          settings = { ...settings, ...(msg.settings ?? {}) };
          emit({ type: "settings", settings });
          break;
        case "saveProviderKey": {
          if (msg.provider === "google") {
            setStoredGoogleKey(String(msg.key ?? ""));
            emit({ type: "providerKeySaved", provider: "google", ok: true });
            emit({ type: "providerKeyStatus", providerKeyStatus: providerKeyStatus() });
            await sendBoot();
          }
          break;
        }
        case "saveSessions":
          break;
        case "mentionQuery":
          emit({ type: "mentionSuggestions", items: [], category: msg.category ?? "files" });
          break;
        case "openExternal": {
          const url = String(msg.url ?? "");
          if (!isAllowedExternalUrl(url)) break;
          if (window.Capacitor?.Plugins?.Browser?.open) {
            try {
              await window.Capacitor.Plugins.Browser.open({ url });
            } catch {
              window.open(url, "_blank", "noopener,noreferrer");
            }
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
          break;
        }
        default:
          break;
      }
    })();
  };

  void sendBoot();
  return transport;
}
