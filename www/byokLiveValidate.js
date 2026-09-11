/**
 * Validasi BYOK via handshake WebSocket Gemini Live (BidiGenerateContent).
 * Memastikan key mendukung gemini-3.1-flash-live-preview, bukan hanya REST.
 */
import {
  GEMINI_MODEL,
  geminiLiveWsUrl,
  geminiModelResource,
} from "./geminiConstants.js";
import {
  isNativeGeminiWsAvailable,
  nativeGeminiWsConnect,
  nativeGeminiWsDisconnect,
} from "./nativeGeminiWs.js";

/** Setup minimal untuk probe Live API — tanpa tools berat. */
export function buildByokLiveProbeSetup() {
  return {
    model: geminiModelResource(GEMINI_MODEL),
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
      },
    },
  };
}

/** @param {unknown} errorObj */
export function classifyLiveErrorKind(errorObj) {
  const msg = String(
    typeof errorObj === "object" && errorObj && "message" in errorObj
      ? errorObj.message
      : errorObj ?? "",
  ).toLowerCase();
  if (isQuotaLike(msg)) return "quota";
  if (/live.preview|live preview|bidi|websocket|not found|not enabled|unsupported model|model.*not/i.test(msg)) {
    return "live_not_enabled";
  }
  if (/api key|permission|authentication|invalid|denied|unauthorized/i.test(msg)) {
    return "invalid";
  }
  if (/network|timeout|offline|failed to fetch|websocket/i.test(msg)) {
    return "network";
  }
  return "unknown";
}

/** @param {string} msg */
function isQuotaLike(msg) {
  return /429|too many requests|rate limit|quota|resource_exhausted|resource exhausted/.test(
    String(msg).toLowerCase(),
  );
}

/**
 * @param {string} wsUrl
 * @param {object} setup
 * @param {number} [timeoutMs]
 */
function validateViaBrowserWebSocket(wsUrl, setup, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let done = false;
    /** @type {WebSocket | null} */
    let ws = null;

    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        ws?.close(1000, "byok-probe");
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const timer = setTimeout(
      () => finish({ ok: false, error: "timeout", kind: "timeout" }),
      timeoutMs,
    );

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      finish({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        kind: "network",
      });
      return;
    }

    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      ws?.send(JSON.stringify({ setup }));
    };
    ws.onmessage = (ev) => {
      try {
        const raw =
          typeof ev.data === "string"
            ? ev.data
            : ev.data instanceof ArrayBuffer
              ? new TextDecoder().decode(ev.data)
              : String(ev.data);
        const msg = JSON.parse(raw);
        if (msg.setupComplete !== undefined) {
          finish({ ok: true });
          return;
        }
        if (msg.error) {
          const errMsg = msg.error.message || "live_error";
          finish({
            ok: false,
            error: errMsg,
            kind: classifyLiveErrorKind(msg.error),
            status: msg.error.code,
          });
        }
      } catch {
        /* ignore parse errors until timeout/close */
      }
    };
    ws.onerror = () => finish({ ok: false, error: "websocket_failed", kind: "network" });
    ws.onclose = (ev) => {
      if (!done) {
        finish({
          ok: false,
          error: ev.reason || `closed:${ev.code}`,
          kind: ev.code === 1006 ? "live_not_enabled" : "network",
          code: ev.code,
        });
      }
    };
  });
}

/**
 * @param {string} wsUrl
 * @param {object} setup
 * @param {number} [timeoutMs]
 */
async function validateViaNativeProbe(wsUrl, setup, timeoutMs = 15000) {
  const plugin = window.Capacitor?.Plugins?.GeminiLive;
  if (!plugin?.probeLiveKey) return null;
  try {
    const result = await plugin.probeLiveKey({
      wsUrl,
      setupJson: JSON.stringify({ setup }),
      timeoutMs,
    });
    if (result?.ok) return { ok: true };
    return {
      ok: false,
      error: String(result?.error || "live_probe_failed"),
      kind: String(result?.kind || classifyLiveErrorKind(result?.error)),
      status: result?.status,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      kind: "network",
    };
  }
}

/**
 * Handshake WebSocket ke Gemini Live — validasi sebenarnya untuk Full Duplex.
 * @param {string} apiKey
 */
export async function validateGoogleKeyLiveWebSocket(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) return { ok: false, error: "no_key", kind: "no_key" };

  const wsUrl = geminiLiveWsUrl(key);
  const setup = buildByokLiveProbeSetup();

  if (isNativeGeminiWsAvailable()) {
    const nativeResult = await validateViaNativeProbe(wsUrl, setup);
    if (nativeResult?.ok) return { ok: true };
    if (nativeResult && nativeResult.kind !== "network") return nativeResult;
  }

  return validateViaBrowserWebSocket(wsUrl, setup);
}

/**
 * Probe native via listener (fallback jika probeLiveKey belum ada di plugin lama).
 * @param {string} wsUrl
 * @param {object} setup
 */
export async function validateViaNativeConnect(wsUrl, setup) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void nativeGeminiWsDisconnect().catch(() => {});
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ ok: false, error: "timeout", kind: "timeout" }),
      15000,
    );

    void nativeGeminiWsConnect(wsUrl, setup, {
      onMessage: (text) => {
        try {
          const msg = JSON.parse(text);
          if (msg.setupComplete !== undefined) {
            finish({ ok: true });
            return;
          }
          if (msg.error) {
            finish({
              ok: false,
              error: msg.error.message || "live_error",
              kind: classifyLiveErrorKind(msg.error),
            });
          }
        } catch {
          /* ignore */
        }
      },
      onError: (message) => {
        finish({
          ok: false,
          error: message,
          kind: classifyLiveErrorKind(message),
        });
      },
      onClose: (code) => {
        if (!done) {
          finish({
            ok: false,
            error: `closed:${code}`,
            kind: code === 1006 ? "live_not_enabled" : "network",
          });
        }
      },
    }).catch((err) => {
      finish({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        kind: "network",
      });
    });
  });
}
