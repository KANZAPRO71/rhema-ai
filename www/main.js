import { initAccessibility } from "./accessibility.js";

import { initUiShell } from "./uiShell.js";

import {
  apiUrl,
  connectAppWebSocket,
  initNativeShell,
  useDirectByokRuntime,
  applyNativeFeatureGates,
} from "./platform.js";
import { initAmbientPickerUI } from "./ambientAudio.js";

import { installAppBackend } from "./appBackend.js";
import { wireNativeBackend } from "./appTransport.js";
import { applyBundledProviderKeys } from "./bundledProviderKeys.js";
import { initByokOnboarding } from "./byokOnboarding.js";
import { initGoogleKeySecureStorage } from "./geminiConstants.js";
import { initRegionOnboarding } from "./regionOnboarding.js";
import { initLocaleUi } from "./localeUi.js";
import { initAppStability } from "./appStability.js";
import { initNativeAppLifecycle } from "./nativeAppLifecycle.js";
import { initCrisisHotlineModal } from "./crisisHotlineModal.js";

applyBundledProviderKeys();

applyNativeFeatureGates();

console.info("[rhema] bundle 20260913-dengar13");

if (useDirectByokRuntime()) {
  installAppBackend();
}



initAccessibility();

initUiShell();



import { initChatApp } from "./chatCore.js?v=20260913-dengar13";

import { refreshCloud, initCloudPanel } from "./cloudPanel.js";

import { initAppShell } from "./appShell.js";

import { initAlkitabPanel, loadHome, loadRenungan, loadDoa, loadAlkitabProgram, initVoiceTranscriptHistory, refreshActiveScreen } from "./alkitabPanel.js?v=20260913-dengar13";
import { initVoiceIntelligenceUI } from "./voiceIntelligenceUI.js?v=20260819-1509";
import { initRealtimeVoiceClient } from "./realtimeVoiceClient.js?v=20260913-dengar13";
import { registerVoiceTextSpeech } from "./voiceTextSpeech.js";
import { initGlobalVoiceBar } from "./globalVoiceBar.js?v=20260819-1509";



const queue = [];

let connected = false;

/** @type {WebSocket | null} */

let ws = null;

/** @type {Set<(msg: unknown) => void>} */

const messageHandlers = new Set();

/** @type {Set<(reason: string) => void>} */

const disconnectHandlers = new Set();



function flushQueue() {

  while (queue.length && connected) {

    transport.post(queue.shift());

  }

}



function broadcast(msg) {

  for (const fn of messageHandlers) fn(msg);

}



function bindWebSocket(socket) {

  ws = socket;

  ws.addEventListener("message", (ev) => {

    let data;

    try {

      data = JSON.parse(ev.data);

    } catch {

      data = { type: "error", message: "Invalid server message" };

    }

    broadcast(data);

  });

  ws.addEventListener("close", () => {

    connected = false;

    for (const fn of disconnectHandlers) fn("close");

  });

  ws.addEventListener("error", () => {

    connected = false;

    for (const fn of disconnectHandlers) fn("error");

  });

}



const transport = {

  post: (msg) => {

    if (useDirectByokRuntime()) {
      queue.push(msg);
      return;
    }
    if (connected && ws) ws.send(JSON.stringify(msg));
    else queue.push(msg);

  },

  onMessage: (fn) => {

    messageHandlers.add(fn);

  },

  onDisconnect: (fn) => {

    disconnectHandlers.add(fn);

  },

  broadcast,

  voiceMode: useDirectByokRuntime() ? "direct" : "proxy",

  voiceProfile: "alkitab-voice",

  voiceTtsFallback: false,

  voiceTextReplies: true,

};



function initServerSettings() {
  /* server URL section dihapus/disembunyikan di native via applyNativeFeatureGates */
}



function initHeaderRefresh(getCurrentScreen) {
  const btn = document.getElementById("btn-header-refresh");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const screen = getCurrentScreen?.() || "home";
    btn.disabled = true;
    try {
      if (screen === "cloud") {
        await refreshCloud();
        document.dispatchEvent(new CustomEvent("rhema-screen-refresh", { detail: { screen } }));
        document.querySelector(`#screen-${screen} .mobile-scroll`)?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      await refreshActiveScreen(screen);
    } catch (err) {
      console.warn("[rhema-ai] header refresh error:", err);
    } finally {
      btn.disabled = false;
    }
  });
}



async function boot() {
  try {
    initAppStability();
    initNativeAppLifecycle(() => transport);
    initCrisisHotlineModal();
  } catch (err) {
    console.warn("[rhema-ai] stability/lifecycle init error:", err);
  }

  try {
    await initGoogleKeySecureStorage();
  } catch (err) {
    console.warn("[rhema-ai] initGoogleKeySecureStorage error:", err);
  }

  try {
    initLocaleUi();
  } catch (err) {
    console.warn("[rhema-ai] initLocaleUi error:", err);
  }

  void initNativeShell();
  initServerSettings();

  try {
    initChatApp(transport, { mode: "browser", showThinking: true });
  } catch (err) {
    console.warn("[rhema-ai] initChatApp error:", err);
  }

  let shell;
  try {
    shell = initAppShell(transport, {
      onHome: () => void loadHome(),
      onAlkitab: () => void loadAlkitabProgram(),
      onRenungan: () => void loadRenungan(),
      onDoa: () => void loadDoa(),
      onVoice: () => initVoiceTranscriptHistory(),
      onCloud: () => void refreshCloud(),
    });
  } catch (err) {
    console.error("[rhema-ai] initAppShell error:", err);
  }

  try {
    initGlobalVoiceBar(transport);
  } catch (err) {
    console.warn("[rhema-ai] initGlobalVoiceBar error:", err);
  }

  if (useDirectByokRuntime()) {
    wireNativeBackend(transport);
    connected = true;
    flushQueue();
  } else {
    connectAppWebSocket()
      .then((socket) => {
        bindWebSocket(socket);
        connected = true;
        flushQueue();
      })
      .catch((err) => {
        console.warn("[rhema-ai] WebSocket background:", err);
      });
  }

  try {
    initRealtimeVoiceClient(transport);
    registerVoiceTextSpeech(transport);
    if (shell) initVoiceIntelligenceUI(transport);
  } catch (err) {
    console.warn("[rhema-ai] Voice client gagal dimuat.", err);
  }

  try {
    initAlkitabPanel(transport, shell?.go || (() => {}));
    if (!window.__RHEMA_PANEL_READY) {
      console.error("[rhema-ai] initAlkitabPanel exited before ready — UI buttons may be dead");
    }
  } catch (err) {
    console.error("[rhema-ai] initAlkitabPanel error:", err);
  }

  initHeaderRefresh(shell?.getCurrentScreen);

  try {
    initAmbientPickerUI();
  } catch (err) {
    console.warn("[rhema-ai] initAmbientPickerUI error:", err);
  }

  try {
    initCloudPanel(transport, shell?.go || (() => {}));
  } catch (err) {
    console.warn("[rhema-ai] initCloudPanel error:", err);
  }

  try {
    initRegionOnboarding(transport);
  } catch (err) {
    console.warn("[rhema-ai] initRegionOnboarding error:", err);
  }

  try {
    initByokOnboarding(transport, {
      deferAutoOpen: true,
    });
  } catch (err) {
    console.warn("[rhema-ai] initByokOnboarding error:", err);
  }

  const bootHash = (location.hash || "").replace(/^#/, "");
  if (bootHash.startsWith("alkitab") && shell?.go) {
    shell.go("alkitab");
  } else if (bootHash === "doa" && shell?.go) {
    shell.go("doa");
  } else if (bootHash === "renungan" && shell?.go) {
    shell.go("renungan");
  } else if (shell?.go && shell.getCurrentScreen?.() !== "home") {
    shell.go("home", { force: true });
  }
}



void boot();



export { apiUrl, transport };


