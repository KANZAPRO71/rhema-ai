/**
 * Probe Gemini Live WebSocket — inline setup (sama dengan Dengar ayat).
 * Usage: set GOOGLE_API_KEY=AIza... && node dev/test-live-ws.mjs
 */
import { buildInlineListenSetup } from "../www/geminiInlineSetup.js";
import { geminiLiveWsUrl } from "../www/geminiConstants.js";

const key = process.env.GOOGLE_API_KEY?.trim();
if (!key) {
  console.error("Set GOOGLE_API_KEY env var");
  process.exit(1);
}

const setup = buildInlineListenSetup();
const wsUrl = geminiLiveWsUrl(key);
const payload = JSON.stringify({ setup });

console.log("Connecting…", wsUrl.replace(key, "***"));
console.log("Setup bytes:", payload.length);

const ws = new WebSocket(wsUrl);
const timer = setTimeout(() => {
  console.error("TIMEOUT — no setupComplete in 15s");
  ws.close();
  process.exit(2);
}, 15000);

ws.onopen = () => {
  console.log("WS open — sending setup");
  ws.send(payload);
};

ws.onmessage = (ev) => {
  const raw = typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString("utf8");
  console.log("MSG:", raw.slice(0, 240));
  try {
    const msg = JSON.parse(raw);
    if (msg.setupComplete !== undefined) {
      clearTimeout(timer);
      console.log("OK — setupComplete received");
      ws.close(1000, "probe ok");
      process.exit(0);
    }
    if (msg.error) {
      clearTimeout(timer);
      console.error("ERROR:", msg.error);
      process.exit(3);
    }
  } catch {
    /* ignore */
  }
};

ws.onerror = () => {
  clearTimeout(timer);
  console.error("WS error");
  process.exit(4);
};

ws.onclose = (ev) => {
  clearTimeout(timer);
  console.error("WS closed", ev.code, ev.reason || "");
  process.exit(5);
};
