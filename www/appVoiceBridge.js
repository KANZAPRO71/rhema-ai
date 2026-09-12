/**
 * Voice proxy lokal di APK — jalur sama dengan dev localhost (:3000).
 */
import { createGeminiLiveSession } from "./geminiLiveClient.js?v=20260911-nolive";
import { handleLocalApi } from "./appBackend.js";
import { formatInteractionMemoryForPrompt, parseExplicitMemory, addLocalMemoryEntry } from "./memoryStore.js";
import { emitMemorySaveBroadcast, handleVoiceLocalCommand, VOICE_MEMORY_SESSION } from "./voiceLocalCommands.js";
import { haltNativePlayback, unlockNativeElementAudio, warmupNativePlayback } from "./nativeAudioPlayback.js";
import { speakIndonesianText } from "./ambientAudio.js";

/** @param {{ broadcast: (msg: object) => void, voiceProfile?: string }} transport */
export function wireAppVoiceBridge(transport) {
  /** @type {ReturnType<typeof createGeminiLiveSession> | null} */
  let session = null;
  let lastProfile = "alkitab-voice";
  let lastPersona = "pastor";

  function broadcast(ev) {
    transport.broadcast?.(ev);
  }

  function pushMemoryContext() {
    const ctx = formatInteractionMemoryForPrompt(localStorage);
    if (ctx && session?.isLive?.()) session.sendClientContext(ctx);
  }

  function apiSessionConfig() {
    const q = new URLSearchParams({
      profile: lastProfile,
      voiceName: "Puck",
      personaId: lastPersona,
    });
    return handleLocalApi(`/api/session-config?${q}`);
  }

  function getSession() {
    if (!session) {
      session = createGeminiLiveSession({
        externalPlayback: true,
        fetchSessionConfig: async () => {
          const res = await apiSessionConfig();
          const data = await res.json();
          if (!res.ok) return { error: data.error || `HTTP ${res.status}` };
          return data;
        },
        executeTool: async (call) => {
          const res = await handleLocalApi("/api/voice/tool", {
            method: "POST",
            body: JSON.stringify(call),
          });
          return res.json();
        },
        getMemoryContext: () => formatInteractionMemoryForPrompt(localStorage),
        tryHandleLocalQuery: (text) => {
          haltNativePlayback();
          document.dispatchEvent(
            new CustomEvent("rhema-audio-stop-all", { detail: { keepVoiceSession: true } }),
          );
          return handleVoiceLocalCommand(text, broadcast, { userAlreadyShown: true }).handled;
        },
        onUserTranscript: (text) => {
          const fact = parseExplicitMemory(text);
          if (fact) {
            addLocalMemoryEntry(localStorage, fact, "fact", VOICE_MEMORY_SESSION);
            emitMemorySaveBroadcast(broadcast);
            pushMemoryContext();
          }
        },
        emit: (ev) => {
          if (ev.type === "voiceModuleSpeak" && ev.text) {
            haltNativePlayback();
            speakIndonesianText(String(ev.text), { stopAmbientOnEnd: false });
          }
          if (ev.type === "voiceStatus" && ev.status === "live") {
            broadcast({
              type: "voiceStatus",
              status: "live",
              profile: ev.profile || lastProfile,
              audioInputRate: ev.audioInputRate ?? 16000,
              audioOutputRate: ev.audioOutputRate ?? 24000,
            });
            pushMemoryContext();
            return;
          }
          broadcast(ev);
        },
      });
    }
    return session;
  }

  document.addEventListener("rhema-memory-updated", () => pushMemoryContext());

  return {
    handle(msg) {
      const m = /** @type {{ type?: string, profile?: string, personaId?: string, pcmBase64?: string, text?: string }} */ (msg);
      switch (m.type) {
        case "voiceStart":
          lastProfile = m.profile || transport.voiceProfile || "alkitab-voice";
          if (m.personaId) lastPersona = m.personaId;
          if (session?.isActive?.() && !session.isLive?.()) {
            session.stop();
            session = null;
          }
          void getSession().start({ mic: false });
          return true;
        case "voiceStop":
          session?.stop();
          session = null;
          return true;
        case "voiceAudioChunk":
          if (m.pcmBase64) getSession().sendAudioChunk(m.pcmBase64);
          return true;
        case "voiceSendText": {
          lastProfile = m.profile || transport.voiceProfile || "alkitab-voice";
          const text = String(m.text ?? "").trim();
          if (!text) return true;
          unlockNativeElementAudio();
          if (handleVoiceLocalCommand(text, broadcast).handled) return true;
          const s = getSession();
          if (s.isLive()) {
            pushMemoryContext();
            s.sendText(text) || s.sendClientContent(text);
          } else {
            void s.start({ mic: false }).then(() => {
              pushMemoryContext();
              s.sendText(text) || s.sendClientContent(text);
            });
          }
          return true;
        }
        default:
          return false;
      }
    },
  };
}
