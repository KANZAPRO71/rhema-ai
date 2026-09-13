/**
 * Setup Gemini Live ringan — Dengar ayat inline (mic off), probe BYOK.
 * gemini-3.1-flash-live-preview: teks pertama via clientContent + historyConfig.
 */
import {
  RHEMA_VOICE_LOCKED,
  geminiModelResource,
  resolveGeminiLiveModel,
} from "./geminiConstants.js";

/** @param {{ voiceName?: string }} [options] */
export function buildInlineListenSetup(options = {}) {
  const voiceName = options.voiceName || RHEMA_VOICE_LOCKED.voiceName;
  const modelId = resolveGeminiLiveModel();
  return {
    model: geminiModelResource(modelId),
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
    historyConfig: { initialHistoryInClientContent: true },
  };
}
