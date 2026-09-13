/** WebSocket Gemini Live via plugin native Android (OkHttp) — hindari bug WebView WSS. */

/** @returns {boolean} */
export function isNativeGeminiWsAvailable() {
  try {
    return Boolean(
      window.Capacitor?.isNativePlatform?.() &&
        window.Capacitor?.Plugins?.GeminiLive?.connect,
    );
  } catch {
    return false;
  }
}

/** @type {import("@capacitor/core").PluginListenerHandle | null} */
let listenerHandle = null;
/** 0 = tolak semua; -1 = terima gen berikutnya; >0 = hanya gen itu */
let allowedGen = 0;

/**
 * @param {string} wsUrl
 * @param {object} setup
 * @param {{
 *   onOpen?: () => void,
 *   onMessage?: (text: string) => void,
 *   onError?: (message: string) => void,
 *   onClose?: (code: number, reason: string) => void,
 * }} callbacks
 */
export async function nativeGeminiWsConnect(wsUrl, setup, callbacks) {
  const plugin = window.Capacitor?.Plugins?.GeminiLive;
  if (!plugin?.connect) throw new Error("GeminiLive plugin tidak tersedia");

  if (listenerHandle) {
    await listenerHandle.remove();
    listenerHandle = null;
  }

  allowedGen = -1;

  listenerHandle = await plugin.addListener("geminiWsEvent", (ev) => {
    const gen = Number(ev?.gen || 0);
    if (allowedGen === 0) return;
    if (allowedGen > 0 && gen && gen !== allowedGen) return;
    if (allowedGen === -1 && gen) allowedGen = gen;

    const type = String(ev?.type || "");
    if (type === "open") {
      callbacks.onOpen?.();
      return;
    }
    if (type === "message" && ev.data) {
      callbacks.onMessage?.(String(ev.data));
      return;
    }
    if (type === "error") {
      callbacks.onError?.(String(ev.message || ev.data || "WebSocket gagal"));
      return;
    }
    if (type === "close") {
      callbacks.onClose?.(Number(ev.code || 0), String(ev.reason || ""));
    }
  });

  const ret = await plugin.connect({
    wsUrl,
    setupJson: JSON.stringify({ setup }),
  });
  const gen = Number(ret?.gen || 0);
  if (gen) allowedGen = gen;
}

/** @param {string} json */
export async function nativeGeminiWsSend(json) {
  const plugin = window.Capacitor?.Plugins?.GeminiLive;
  if (!plugin?.send) return;
  await plugin.send({ json });
}

export async function nativeGeminiWsDisconnect() {
  allowedGen = 0;
  const plugin = window.Capacitor?.Plugins?.GeminiLive;
  if (plugin?.disconnect) {
    await plugin.disconnect();
  }
  if (listenerHandle) {
    await listenerHandle.remove();
    listenerHandle = null;
  }
}
