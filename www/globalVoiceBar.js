/**
 * Global stop untuk suara AI / TTS / musik — tanpa floating HUD.
 */

import { stopSpeaking, ambientEngine, forceStopAmbientAndSpeech } from "./ambientAudio.js";
import { stopWorshipAccompanist, stopContinuousWorshipPad } from "./worshipAccompanist.js";
import { haltNativePlayback } from "./nativeAudioPlayback.js";

let globalTransport = null;

export function initGlobalVoiceBar(transport) {
  globalTransport = transport;
  document.addEventListener("rhema-audio-stop-all", (e) => {
    const detail = /** @type {CustomEvent<{ keepVoiceSession?: boolean, forceAmbientStop?: boolean, keepAmbient?: boolean }> | undefined} */ (e).detail;
    stopAllVoiceAndAudio({
      keepVoiceSession: Boolean(detail?.keepVoiceSession),
      forceAmbientStop: Boolean(detail?.forceAmbientStop),
      keepAmbient: Boolean(detail?.keepAmbient || window.__rhemaNightPodAmbientActive),
    });
  });
}

/** @param {{ keepVoiceSession?: boolean, forceAmbientStop?: boolean, keepAmbient?: boolean }} [opts] */
export function stopAllVoiceAndAudio({ keepVoiceSession = false, forceAmbientStop = false, keepAmbient = false } = {}) {
  if (!keepVoiceSession) {
    try {
      globalTransport?.voice?.stop?.();
    } catch {
      /* ignore */
    }
    haltNativePlayback();
  }

  stopSpeaking();
  stopWorshipAccompanist();
  stopContinuousWorshipPad();
  if (forceAmbientStop) {
    window.__rhemaNightPodAmbientActive = false;
    window.__rhemaNightPodAmbientPreset = "";
    forceStopAmbientAndSpeech();
  } else if (!window.__rhemaDevotionSilentPhase && !keepAmbient) {
    ambientEngine.stop();
  }

  document.querySelectorAll(".btn-pill.active, .btn-tool-pill.active, .btn-voice-send.active, #btn-alkitab-voice.active, #btn-voice-composer-mic.active, #btn-voice-composer-stop.active").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.querySelectorAll(".active-prompter-line").forEach((el) => el.classList.remove("active-prompter-line"));

  if (forceAmbientStop || (!window.__rhemaDevotionSilentPhase && !keepAmbient)) {
    document.dispatchEvent(new CustomEvent("rhema-devotion-podcast-reset"));
  }
}
