/**
 * Platform bridge — browser vs Capacitor Android/iOS.
 * App native: backend lokal BYOK (tanpa PC server).
 */

const SERVER_KEY = "rhema-api-base";

/** @returns {boolean} */
export function isNativeApp() {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/** @returns {boolean} App standalone BYOK — backend di device */
export function isStandaloneByok() {
  return isNativeApp();
}

/** @returns {string} Base URL tanpa trailing slash; kosong = same-origin / backend lokal */
export function getApiBase() {
  const stored = (localStorage.getItem(SERVER_KEY) || "").trim().replace(/\/$/, "");
  if (stored) return stored;
  if (isStandaloneByok()) return "";
  return "";
}

/** @param {string} url */
export function setApiBase(url) {
  const t = String(url || "").trim().replace(/\/$/, "");
  if (t) localStorage.setItem(SERVER_KEY, t);
  else localStorage.removeItem(SERVER_KEY);
}

export function getStoredApiBase() {
  return localStorage.getItem(SERVER_KEY) || "";
}

/** @returns {string} WebSocket URL untuk voice + chat */
export function getWsUrl() {
  const base = getApiBase();
  if (!base) {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}/ws`;
  }
  const u = new URL(base);
  const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${u.host}/ws`;
}

/**
 * @param {string} path — mis. /api/alkitab/today
 * @returns {string}
 */
export function apiUrl(path) {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** @param {unknown} s */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inisialisasi UI native (status bar, splash, class body). */
const SPLASH_MIN_MS = 2600;

function syncLaunchSplashTitle() {
  const el = document.getElementById("rhema-launch-title");
  if (!el) return;
  const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  const title = meta?.getAttribute("content") || document.title || "Rhema AI";
  el.textContent = title.trim();
}

function dismissLaunchSplash() {
  const splash = document.getElementById("rhema-launch-splash");
  if (!splash || splash.classList.contains("rhema-launch-splash--hide")) return;
  splash.classList.add("rhema-launch-splash--hide");
  document.body.classList.add("rhema-app-ready");
  window.setTimeout(() => splash.remove(), 450);
}

async function hideNativeSplashAfterMinimum(plugins) {
  const bootAt = Number(window.__RHEMA_BOOT_AT) || Date.now();
  const waitMs = Math.max(0, SPLASH_MIN_MS - (Date.now() - bootAt));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  try {
    await plugins?.SplashScreen?.hide?.();
  } catch {
    /* ignore */
  }
  dismissLaunchSplash();
}

/** Sembunyikan fitur extension-only & perbaiki copy di app native BYOK. */
export function applyNativeFeatureGates() {
  if (!isStandaloneByok()) return;

  document.body.classList.add("rhema-native-app");

  document.getElementById("btn-open-cloud")?.classList.add("hidden");
  document.getElementById("btn-attach-file")?.classList.add("hidden");
  document.getElementById("server-settings-section")?.remove();

  const hint = document.getElementById("hint");
  if (hint) hint.textContent = "Tanya Rhema Agent — teks & gambar (BYOK Gemini)";

  const cloudMeta = document.getElementById("cloud-meta");
  if (cloudMeta && !cloudMeta.textContent?.trim()) {
    cloudMeta.textContent = "Hanya di Cursor extension";
  }
}

export async function initNativeShell() {
  syncLaunchSplashTitle();

  if (!isNativeApp()) {
    dismissLaunchSplash();
    return;
  }

  document.body.classList.add("capacitor-native");
  document.documentElement.classList.add("capacitor-native");

  const plugins = /** @type {Record<string, { setStyle?: (o: object) => Promise<void>; setBackgroundColor?: (o: object) => Promise<void>; hide?: () => Promise<void> }> | undefined} */ (
    window.Capacitor?.Plugins
  );

  try {
    await plugins?.StatusBar?.setStyle?.({ style: "LIGHT" });
    await plugins?.StatusBar?.setBackgroundColor?.({ color: "#f3eee6" });
  } catch {
    /* native only */
  }

  await hideNativeSplashAfterMinimum(plugins);

  try {
    const App = /** @type {{ addListener?: (ev: string, cb: () => void) => Promise<{ remove: () => void }> }} | undefined} */ (
      plugins?.App
    );
    App?.addListener?.("backButton", () => {
      document.dispatchEvent(new CustomEvent("rhema-hardware-back"));
    });
  } catch {
    /* native only */
  }
}

/** @returns {Promise<WebSocket>} */
export function connectAppWebSocket() {
  if (isStandaloneByok()) {
    return Promise.reject(new Error("App native memakai backend lokal — WebSocket PC tidak diperlukan."));
  }
  const url = getWsUrl();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const t = setTimeout(() => {
      ws.close();
      reject(new Error(`Timeout koneksi server (${url})`));
    }, 12000);
    ws.addEventListener("open", () => {
      clearTimeout(t);
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(t);
      reject(new Error(`Gagal konek ke ${url}. Cek URL server di Akun.`));
    });
  });
}
