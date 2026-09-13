/**
 * Cloud agents dashboard — browser parity dengan sidebar extension.
 */

import { escapeAttr, escapeHtml } from "./markdown.js";
import { apiUrl, isStandaloneByok } from "./platform.js";

const POLL_MS = 30_000;

/** @type {ReturnType<typeof setInterval> | undefined} */
let pollTimer;
/** @type {import("../shared/chatCore.js").ChatTransport | null} */
let transport = null;
/** @type {((screen: string) => void) | null} */
let goScreen = null;

function cloudHeaders() {
  const key = document.getElementById("byok-cursor")?.value?.trim() || "";
  return key ? { "X-Rhema-Api-Key": key } : {};
}

function isCloudScreenActive() {
  return document.getElementById("screen-cloud")?.classList.contains("active") ?? false;
}

function statusClass(status) {
  if (status === "running") return "running";
  if (status === "error") return "error";
  return "finished";
}

function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function shortRepo(url) {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, "").slice(0, 48);
  } catch {
    return url.slice(0, 48);
  }
}

function renderAgents(agents, error) {
  const list = document.getElementById("cloud-list");
  const meta = document.getElementById("cloud-meta");
  if (!list || !meta) return;

  if (error) {
    meta.textContent = error;
    list.innerHTML = `<p class="cloud-empty">${escapeHtml(error)}</p>`;
    return;
  }

  meta.textContent = `${agents.length} agent${agents.length === 1 ? "" : "s"}`;

  if (!agents.length) {
    list.innerHTML = `<p class="cloud-empty">Belum ada cloud agent. Set runtime <strong>cloud</strong> di ⚙ lalu kirim prompt.</p>`;
    return;
  }

  list.innerHTML = agents
    .map(
      (a) => `
    <article class="cloud-card ${statusClass(a.status)}">
      <div class="cloud-card-head">
        <span class="cloud-name">${escapeHtml(a.name?.trim() || a.agentId.slice(0, 12))}</span>
        <span class="cloud-badge">${escapeHtml(a.status || "finished")}</span>
      </div>
      ${a.summary ? `<p class="cloud-summary">${escapeHtml(a.summary)}</p>` : ""}
      <div class="cloud-meta-row">
        <span>${formatTime(a.lastModified)}</span>
        ${a.repos?.[0] ? `<span class="cloud-repo">${escapeHtml(shortRepo(a.repos[0]))}</span>` : ""}
      </div>
      <code class="cloud-id">${escapeHtml(a.agentId)}</code>
      <div class="cloud-actions">
        <button type="button" class="cloud-act" data-act="resume" data-id="${escapeAttr(a.agentId)}">Lanjutkan</button>
        <button type="button" class="cloud-act" data-act="open" data-id="${escapeAttr(a.agentId)}">Cursor</button>
        <button type="button" class="cloud-act" data-act="copy" data-id="${escapeAttr(a.agentId)}">Salin ID</button>
      </div>
    </article>`,
    )
    .join("");

  list.querySelectorAll(".cloud-act").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id") || "";
      const act = btn.getAttribute("data-act") || "";
      if (act === "resume") void resumeCloudAgent(id);
      else if (act === "open") window.open(`https://cursor.com/agents/${id}`, "_blank", "noopener,noreferrer");
      else if (act === "copy") void copyAgentId(id, btn);
    });
  });
}

async function copyAgentId(id, btn) {
  try {
    await navigator.clipboard.writeText(id);
    const prev = btn.textContent;
    btn.textContent = "Tersalin ✓";
    setTimeout(() => {
      btn.textContent = prev;
    }, 1600);
  } catch {
    alert(id);
  }
}

async function resumeCloudAgent(agentId) {
  if (!agentId || !transport) return;
  goScreen?.("chat");
  transport.post({
    type: "resumeCloudAgent",
    agentId,
    settings: { runtime: "cloud" },
  });
}

export async function refreshCloud() {
  const meta = document.getElementById("cloud-meta");
  const list = document.getElementById("cloud-list");

  if (isStandaloneByok()) {
    if (meta) meta.textContent = "Tidak tersedia di app Android";
    if (list) {
      list.innerHTML =
        `<p class="cloud-empty">Cloud Agents hanya tersedia di <strong>Cursor VS Code extension</strong>. App Android memakai Gemini BYOK langsung di perangkat.</p>`;
    }
    return;
  }

  if (meta) meta.textContent = "Memuat…";

  try {
    const res = await fetch(apiUrl("/api/cloud-agents"), {
      headers: cloudHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    renderAgents(data.agents || [], undefined);
  } catch (err) {
    renderAgents([], err instanceof Error ? err.message : String(err));
  }
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(() => {
    if (isCloudScreenActive()) void refreshCloud();
  }, POLL_MS);
}

/** @param {import("../shared/chatCore.js").ChatTransport} t */
/** @param {(screen: string) => void} go */
export function initCloudPanel(t, go) {
  transport = t;
  goScreen = go;
  const btnRefresh = document.getElementById("btn-cloud-refresh");
  btnRefresh?.addEventListener("click", () => void refreshCloud());
  document.addEventListener("rhema-screen", (e) => {
    if (/** @type {CustomEvent} */ (e).detail?.screen === "cloud") void refreshCloud();
  });
  if (!isStandaloneByok()) startPoll();
}
