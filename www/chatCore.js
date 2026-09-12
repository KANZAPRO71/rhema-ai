/**
 * Shared chat UI — dipakai webview (Cursor) dan browser.
 */
import { renderSettingsPanel } from "./settingsPanelMarkup.js?v=20260911-nolive";
import { renderMarkdown, setMarkdownEl } from "./markdown.js";
import { MENTION_CATEGORIES, parseMentionQuery, buildMentionInsert } from "./mentionMenu.js";
import { loadSessions, saveSessions, createSession, upsertSession, CURRENT_SESSION_KEY } from "./chatHistory.js";
import {
  addLocalMemoryEntry,
  loadLocalMemory,
  parseExplicitMemory,
  saveLocalMemory,
  syncLocalSessionMemory,
} from "./memoryStore.js";
import { buildCreatorReply, isCreatorQuery } from "./rhemaAddressRule.js";
import { saveLocaleProfile } from "./localeProfile.js";
import { openRegionOnboarding } from "./regionOnboarding.js";
import {
  clearStoredGoogleKey,
  setStoredGoogleKey,
  validateGoogleKeyForVoice,
  getGoogleKeyStatusMeta,
} from "./geminiConstants.js";
import { formatGeminiKeyError, pasteFromClipboard } from "./byokUx.js";
import { t } from "./uiStrings.js";
import { syncByokHomeBanner } from "./byokOnboarding.js";

const MODES = ["agent", "plan", "ask", "debug"];
const GOOGLE_KEY_FLAG = "rhema-ai-google-key-configured";

export function initChatApp(transport, options = {}) {
  const appMode = options.mode || "extension";
  const initialSettings = options.settings || {};
  const storage = options.storage || localStorage;
  const storedGoogleConfigured = storage.getItem?.(GOOGLE_KEY_FLAG) === "1";

  let cachedModels = [];

  ensureShell();

  const settingsWrap = document.querySelector(".settings-wrap");
  if (settingsWrap && !document.getElementById("settings-panel")) {
    settingsWrap.insertAdjacentHTML(
      "beforeend",
      renderSettingsPanel({
        settings: initialSettings,
        showApiKey: appMode === "browser",
        showExtensionActions: appMode === "extension",
        rules: options.rules || [],
        providerKeyStatus: {
          ...(options.providerKeyStatus || {}),
          google: options.providerKeyStatus?.google || storedGoogleConfigured,
        },
      }),
    );
  }

  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("input");
  const sendBtn = document.getElementById("btn-send");
  const stopBtn = document.getElementById("btn-stop");
  const newBtn = document.getElementById("btn-new");
  const statusPill = document.getElementById("status-pill");
  const hintEl = document.getElementById("hint");
  const usageBar = document.getElementById("usage-bar");
  const attachImgBtn = document.getElementById("btn-attach-image");
  const attachFileBtn = document.getElementById("btn-attach-file");
  const imageInput = document.getElementById("image-input");
  const mentionBox = document.getElementById("mention-box");
  const settingsBtn = document.getElementById("btn-settings");
  const settingsPanel = document.getElementById("settings-panel");
  const sessionDrawer = document.getElementById("session-drawer");
  const sessionListEl = document.getElementById("session-list");
  const approvalHost = document.getElementById("approval-host");
  const debugPanel = document.getElementById("debug-panel");
  const composerEl = document.querySelector(".composer");

  /** @type {{ textEl?: HTMLElement, raw?: string } | null} */
  let activeAssistant = null;
  /** @type {Map<string, HTMLElement>} */
  const toolCards = new Map();
  /** @type {Map<string, HTMLElement>} */
  const approvalCards = new Map();
  /** @type {Array<{data:string,mimeType:string,name?:string}>} */
  let pendingImages = [];
  /** @type {Array<{role:string,text:string,images?:unknown[]}>} */
  let transcript = [];
  let sessions = loadSessions(storage);
  let currentSession = sessions[0] || createSession();
  if (!sessions.length) sessions = [currentSession];

  let isRunning = false;
  let composerSettings = { ...initialSettings };
  let settingsOpen = false;
  let sessionsOpen = false;
  let lastUserPrompt = "";
  let lastUserImages = [];
  let mentionCategory = "all";
  let totalUsage = { inputTokens: 0, outputTokens: 0 };
  /** @type {import("./memoryStore.js").MemoryEntry[]} */
  let localMemoryEntries = loadLocalMemory(storage);

  function showSaveStatus(text, kind = "") {
    const el = document.getElementById("byok-save-status");
    if (!el) return;
    el.textContent = text;
    el.className = kind ? `settings-save-status ${kind}` : "settings-save-status";
    if (kind === "ok") {
      window.setTimeout(() => {
        el.textContent = "";
        el.className = "settings-save-status";
      }, 2500);
    }
  }

  function updateByokKeyStatusLine(configured = getGoogleKeyStatusMeta().configured) {
    const meta = getGoogleKeyStatusMeta();
    const line = document.getElementById("byok-key-status-line");
    const deleteBtn = document.getElementById("btn-delete-byok-key");
    if (line) {
      line.textContent = !meta.configured
        ? t("settings.keyStatusMissing")
        : meta.liveValidated
          ? t("settings.keyStatusLive")
          : t("settings.keyStatusActive");
    }
    if (deleteBtn) deleteBtn.toggleAttribute("disabled", !configured);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function ensureShell() {
    const app = document.getElementById("app");
    if (!app || document.getElementById("session-drawer")) return;

    if (!document.getElementById("btn-sessions")) {
      const headerActions = document.querySelector(".header-actions");
      headerActions?.insertAdjacentHTML(
        "afterbegin",
        '<button id="btn-sessions" type="button" title="Riwayat chat">☰</button>',
      );
    }

    app.insertAdjacentHTML(
      "afterbegin",
      `<aside id="session-drawer" class="session-drawer hidden" aria-label="Riwayat chat">
        <div class="session-drawer-head"><strong>Riwayat</strong><button id="btn-session-new" type="button">+ Baru</button></div>
        <ul id="session-list" class="session-list"></ul>
      </aside>`,
    );

    app.insertAdjacentHTML(
      "beforeend",
      `<div id="debug-panel" class="debug-panel hidden"><strong>Debug</strong><pre id="debug-log"></pre></div>`,
    );

    const viewChat = document.getElementById("view-chat");
    const composer = viewChat?.querySelector(".composer") || document.querySelector(".composer");
    if (composer && !document.getElementById("usage-bar")) {
      composer.insertAdjacentHTML(
        "beforebegin",
        `<div id="usage-bar" class="usage-bar"></div>`,
      );
    }
    if (!document.getElementById("approval-host")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div id="approval-host" class="approval-host"></div>`,
      );
    }

    if (composer && !document.getElementById("context-bar")) {
      composer.insertAdjacentHTML(
        "beforebegin",
        `<div id="context-bar" class="context-bar hidden" aria-live="polite"></div>`,
      );
    }

    document.getElementById("btn-sessions")?.addEventListener("click", () => toggleSessions());
    document.getElementById("btn-session-new")?.addEventListener("click", () => startNewSession());
  }

  function collectComposerSettings() {
    return { ...composerSettings };
  }

  function applySettingsToUi(s) {
    if (!s) return;
    composerSettings = { ...composerSettings, ...s };
    debugPanel?.classList.toggle("hidden", (s.mode || composerSettings.mode || "agent") !== "debug");
  }

  function pushSettings() {
    const next = collectComposerSettings();
    composerSettings = next;
    debugPanel?.classList.toggle("hidden", next.mode !== "debug");
    transport.post({ type: "updateSettings", settings: next });
    persistSessionMeta();
  }

  function wireSettingsControls() {
    function saveAllSettings() {
      const voiceSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById("select-voice-name"));
      const personaSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById("select-persona-id"));
      const regionSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById("select-worship-region"));
      const bibleSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById("select-bible-version"));
      const input = document.getElementById("byok-google");

      if (regionSelect) {
        const region = regionSelect.value === "global" ? "global" : "indonesia";
        const bibleVersion = bibleSelect?.value === "kjv" ? "kjv" : "tb";
        saveLocaleProfile({ region, bibleVersion, source: "settings" });
      }

      if (voiceSelect) {
        const v = voiceSelect.value;
        localStorage.setItem("rhema-voice-name", v);
      }
      if (personaSelect) {
        const p = personaSelect.value;
        localStorage.setItem("rhema-persona-id", p);
      }

      const key = input?.value?.trim();
      if (key) {
        showSaveStatus("Menyimpan…", "");
        transport.post({ type: "saveProviderKey", provider: "google", key });
        if (input) input.dataset.pendingSave = "1";
      } else {
        showSaveStatus("Pengaturan tersimpan ✓", "ok");
      }
    }

    document.getElementById("btn-save-gemini")?.addEventListener("click", saveAllSettings);
    document.getElementById("btn-reopen-region-onboard")?.addEventListener("click", () => {
      openRegionOnboarding();
    });
    document.getElementById("select-worship-region")?.addEventListener("change", (e) => {
      const region = /** @type {HTMLSelectElement} */ (e.target).value;
      const bibleSelectEl = /** @type {HTMLSelectElement|null} */ (document.getElementById("select-bible-version"));
      if (bibleSelectEl && !bibleSelectEl.dataset.userTouched) {
        bibleSelectEl.value = region === "global" ? "kjv" : "tb";
      }
    });
    document.getElementById("select-bible-version")?.addEventListener("change", (e) => {
      /** @type {HTMLSelectElement} */ (e.target).dataset.userTouched = "1";
    });
    document.getElementById("btn-close-settings-panel")?.addEventListener("click", () => toggleSettings(false));
    document.getElementById("byok-google")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveAllSettings();
      }
    });

    document.getElementById("btn-byok-paste")?.addEventListener("click", async () => {
      const input = /** @type {HTMLInputElement|null} */ (document.getElementById("byok-google"));
      const text = await pasteFromClipboard();
      if (!text) {
        showSaveStatus(t("byok.error.network"), "error");
        return;
      }
      if (input) input.value = text;
      showSaveStatus("", "");
      input?.focus();
    });

    document.getElementById("btn-check-byok-key")?.addEventListener("click", async () => {
      const input = /** @type {HTMLInputElement|null} */ (document.getElementById("byok-google"));
      const draft = input?.value?.trim();
      showSaveStatus(t("byok.validating"), "");
      if (draft && draft.length >= 16) {
        setStoredGoogleKey(draft);
        transport.post({ type: "saveProviderKey", provider: "google", key: draft });
      }
      const check = await validateGoogleKeyForVoice();
      if (check.ok) {
        updateByokKeyStatusLine(true);
        showSaveStatus(t("byok.validOk"), "ok");
        syncByokHomeBanner();
        return;
      }
      const errText =
        check.error === "no_key"
          ? t("byok.error.noKey")
          : formatGeminiKeyError(check.status, String(check.error || ""), String(check.kind || ""));
      updateByokKeyStatusLine(false);
      showSaveStatus(errText, "error");
    });

    document.getElementById("btn-delete-byok-key")?.addEventListener("click", () => {
      if (!window.confirm(t("settings.keyDeleteConfirm"))) return;
      clearStoredGoogleKey();
      storage.removeItem?.(GOOGLE_KEY_FLAG);
      const input = /** @type {HTMLInputElement|null} */ (document.getElementById("byok-google"));
      if (input) {
        input.value = "";
        input.placeholder = "AIza… — Google AI Studio";
      }
      transport.post({ type: "saveProviderKey", provider: "google", key: "" });
      updateByokKeyStatusLine(false);
      syncByokHomeBanner();
      showSaveStatus(t("settings.keyDeleted"), "ok");
    });

    settingsPanel?.querySelectorAll("[data-open]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const url = e.currentTarget.getAttribute("data-open");
        if (url) transport.post({ type: "openExternal", url });
      });
    });
  }

  function cycleMode(reverse = false) {
    const cur = composerSettings.mode || "agent";
    const idx = MODES.indexOf(cur);
    const next = MODES[(idx + (reverse ? MODES.length - 1 : 1)) % MODES.length];
    composerSettings = { ...composerSettings, mode: next };
    pushSettings();
    hintEl.textContent = `Mode: ${next} (Shift+Tab)`;
  }

  function toggleSettings(open) {
    settingsOpen = open ?? !settingsOpen;
    settingsPanel?.classList.toggle("hidden", !settingsOpen);
    settingsBtn?.classList.toggle("active", settingsOpen);
    document.dispatchEvent(
      new CustomEvent("rhema-subview", { detail: { id: "settings", open: settingsOpen } }),
    );
  }

  function toggleSessions(open) {
    sessionsOpen = open ?? !sessionsOpen;
    sessionDrawer?.classList.toggle("hidden", !sessionsOpen);
    if (sessionsOpen) renderSessionList();
    document.dispatchEvent(
      new CustomEvent("rhema-subview", { detail: { id: "sessions", open: sessionsOpen } }),
    );
  }

  settingsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleSettings();
  });

  document.addEventListener("click", (e) => {
    if (settingsOpen && settingsPanel) {
      const target = /** @type {Node} */ (e.target);
      const onSettingsTrigger = target instanceof Element && target.closest(
        "#btn-settings, #btn-open-settings, #btn-settings-close",
      );
      if (!settingsPanel.contains(target) && !onSettingsTrigger) {
        toggleSettings(false);
      }
    }
    if (sessionsOpen && sessionDrawer && !sessionDrawer.contains(e.target) && !e.target.closest("#btn-sessions")) {
      toggleSessions(false);
    }
  });

  settingsPanel?.addEventListener("click", (e) => e.stopPropagation());

  function rerenderSettingsPanel() {
    const panel = document.getElementById("settings-panel");
    if (!panel) return;
    const wasOpen = settingsOpen;
    const prevKey = /** @type {HTMLInputElement|null} */ (document.getElementById("byok-google"))?.value || "";
    panel.outerHTML = renderSettingsPanel({
      settings: initialSettings,
      showApiKey: appMode === "browser",
      showExtensionActions: appMode === "extension",
      rules: options.rules || [],
      providerKeyStatus: {
        ...(options.providerKeyStatus || {}),
        google: options.providerKeyStatus?.google || storedGoogleConfigured,
      },
    });
    settingsPanel = document.getElementById("settings-panel");
    wireSettingsControls();
    settingsPanel?.addEventListener("click", (e) => e.stopPropagation());
    const keyEl = document.getElementById("byok-google");
    if (keyEl && prevKey) keyEl.value = prevKey;
    if (wasOpen) toggleSettings(true);
  }

  document.addEventListener("rhema-locale-changed", rerenderSettingsPanel);

  wireSettingsControls();

  function setStatus(mode, label) {
    if (!statusPill) return;
    statusPill.textContent = label;
    const onAgentScreen =
      document.getElementById("screen-chat")?.classList.contains("active") ||
      document.getElementById("screen-cloud")?.classList.contains("active");
    statusPill.className = onAgentScreen ? `pill ${mode}` : `pill ${mode} hidden`;
  }

  function setRunning(running) {
    isRunning = running;
    if (sendBtn) sendBtn.disabled = running;
    if (stopBtn) stopBtn.disabled = !running;
    if (inputEl) inputEl.disabled = running;
    setStatus(running ? "running" : "idle", running ? "Agent…" : "Siap");
  }

  function updateUsageBar(usage) {
    if (!usageBar) return;
    if (usage?.inputTokens != null) totalUsage.inputTokens += usage.inputTokens;
    if (usage?.outputTokens != null) totalUsage.outputTokens += usage.outputTokens;
    usageBar.textContent = `Tokens: ↑${totalUsage.inputTokens} ↓${totalUsage.outputTokens}`;
  }

  function scrollBottom() {
    if (!messagesEl) return;
    const snap = () => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    };
    snap();
    requestAnimationFrame(() => {
      snap();
      messagesEl.lastElementChild?.scrollIntoView({ block: "end", behavior: "auto" });
    });
  }

  function ensureEmptyState() {
    if (messagesEl.children.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.id = "empty-state";
      empty.innerHTML =
        "<strong>Rhema Agent Chat</strong><br/>Paritas Composer: @file @Docs @Web @Codebase · markdown · riwayat · approval · diff inline.<br/><br/>Shift+Tab ganti mode.";
      messagesEl.appendChild(empty);
    }
  }

  function removeEmptyState() {
    document.getElementById("empty-state")?.remove();
  }

  function saveCurrentSessionId() {
    storage.setItem?.(CURRENT_SESSION_KEY, currentSession.id);
  }

  function persistSessionMeta() {
    currentSession.updatedAt = Date.now();
    currentSession.settings = collectComposerSettings();
    currentSession.messages = transcript.slice(-80);
    currentSession.title = currentSession.title || transcript.find((m) => m.role === "user")?.text?.slice(0, 40) || "Chat";
    sessions = upsertSession(sessions, currentSession);
    saveSessions(storage, sessions);
    saveCurrentSessionId();
    transport.post({ type: "saveSessions", sessions });
    if (transcript.length) {
      syncLocalSessionMemory(
        storage,
        currentSession.id,
        currentSession.title,
        transcript.slice(-12).map((m) => ({ role: m.role, text: m.text })),
      );
      localMemoryEntries = loadLocalMemory(storage);
    }
  }

  function recentMessagesPayload() {
    return transcript.slice(-16).map((m) => ({ role: m.role, text: m.text }));
  }

  function localMemoryPayload() {
    return loadLocalMemory(storage);
  }

  function trySaveExplicitMemory(text) {
    const fact = parseExplicitMemory(text);
    if (!fact) return null;
    addLocalMemoryEntry(storage, fact, "fact", currentSession.id);
    localMemoryEntries = loadLocalMemory(storage);
    return fact;
  }

  function renderSessionList() {
    if (!sessionListEl) return;
    sessionListEl.innerHTML = "";
    for (const s of sessions) {
      const li = document.createElement("li");
      li.className = `session-item${s.id === currentSession.id ? " active" : ""}`;
      li.innerHTML = `<span class="session-title">${escapeHtml(s.title || "Chat")}</span><span class="session-date">${new Date(s.updatedAt).toLocaleString()}</span>`;
      li.addEventListener("click", () => loadSession(s.id));
      sessionListEl.appendChild(li);
    }
  }

  function appendRestoredVoiceMessage(m) {
    removeEmptyState();
    const el = document.createElement("div");
    el.className = `msg voice-live ${m.role}`;
    const at = m.meta?.at || new Date().toISOString();
    const label = m.meta?.label || formatVoiceBubbleMeta(at);
    el.innerHTML = `<div class="role">${m.role === "user" ? "Anda" : "Rhema (live)"}</div><div class="body"></div><div class="msg-meta voice-meta" data-at="${escapeHtml(at)}">${escapeHtml(label)}</div>`;
    el.querySelector(".body").textContent = m.text || "";
    messagesEl.appendChild(el);
  }

  function restoreSessionUi(session) {
    currentSession = session;
    transcript = [...(session.messages || [])];
    messagesEl.innerHTML = "";
    toolCards.clear();
    activeAssistant = null;
    for (const m of transcript) {
      if (m.role === "user") appendUser(m.text, m.images, false);
      else if (m.role === "assistant") {
        if (m.meta?.mode === "live") appendRestoredVoiceMessage(m);
        else {
          beginAssistant();
          appendAssistantText(m.text || "");
          finishAssistant(false);
        }
      }
    }
    if (session.settings) applySettingsToUi(session.settings);
    if (transcript.length) removeEmptyState();
    else ensureEmptyState();
    saveCurrentSessionId();
    renderSessionList();
    scrollBottom();
  }

  function loadSession(id) {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    restoreSessionUi(s);
    toggleSessions(false);
  }

  function startNewSession() {
    persistSessionMeta();
    currentSession = createSession();
    sessions.unshift(currentSession);
    transcript = [];
    messagesEl.innerHTML = "";
    toolCards.clear();
    activeAssistant = null;
    transport.post({ type: "newChat", settings: collectComposerSettings() });
    saveCurrentSessionId();
    persistSessionMeta();
    ensureEmptyState();
    renderSessionList();
    toggleSessions(false);
  }

  function escapeHtml(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderPassiveContext(snapshot) {
    const bar = document.getElementById("context-bar");
    if (!bar) return;
    if (!snapshot || (!snapshot.activeFile && !snapshot.gitBranch && !snapshot.pendingEditCount)) {
      bar.classList.add("hidden");
      bar.innerHTML = "";
      return;
    }

    const pills = [];
    if (snapshot.activeFile) {
      const line = snapshot.activeLine ? `:${snapshot.activeLine}` : "";
      const sel =
        snapshot.hasSelection && snapshot.selectionLineCount
          ? ` · ${snapshot.selectionLineCount}L selected`
          : "";
      pills.push(`<span class="ctx-pill" title="Active editor">📄 ${escapeHtml(snapshot.activeFile)}${line}${sel}</span>`);
    }
    if (snapshot.gitBranch) {
      const dirty =
        snapshot.gitChangedFiles && snapshot.gitChangedFiles > 0
          ? ` · ${snapshot.gitChangedFiles} changed`
          : "";
      pills.push(`<span class="ctx-pill" title="Git branch">⎇ ${escapeHtml(snapshot.gitBranch)}${dirty}</span>`);
    }
    if (snapshot.diagnosticCount > 0) {
      pills.push(`<span class="ctx-pill warn" title="Problems">⚠ ${snapshot.diagnosticCount}</span>`);
    }
    if (snapshot.pendingEditCount > 0) {
      pills.push(
        `<button type="button" class="ctx-pill ctx-pill-btn" data-action="review" title="Review pending edits">◫ ${snapshot.pendingEditCount} pending</button>`,
      );
    }

    bar.innerHTML = pills.join("");
    bar.classList.remove("hidden");
    bar.querySelector('[data-action="review"]')?.addEventListener("click", () => {
      transport.post({ type: "reviewPendingEdits" });
    });
  }

  function renderImagePreview() {
    let bar = document.getElementById("image-preview-bar");
    if (!pendingImages.length) {
      bar?.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "image-preview-bar";
      bar.className = "image-preview-bar";
      inputEl.parentElement?.insertBefore(bar, inputEl);
    }
    bar.innerHTML = "";
    pendingImages.forEach((img, i) => {
      const chip = document.createElement("div");
      chip.className = "image-chip";
      chip.innerHTML = `<img src="data:${img.mimeType};base64,${img.data}" alt="" /><span>${img.name || "image"}</span><button type="button" data-i="${i}">×</button>`;
      chip.querySelector("button")?.addEventListener("click", () => {
        pendingImages.splice(i, 1);
        renderImagePreview();
      });
      bar.appendChild(chip);
    });
  }

  function appendUser(text, images, record = true) {
    removeEmptyState();
    const wrap = document.createElement("div");
    wrap.className = "msg user";
    wrap.innerHTML = `<div class="msg-head"><span class="msg-role">Anda</span><span class="msg-actions"><button type="button" class="msg-act" data-act="edit">Edit</button><button type="button" class="msg-act" data-act="regen">Regenerate</button></span></div><div class="msg-body"></div>`;
    if (images?.length) {
      wrap.innerHTML += `<div class="msg-images">${images.map((img) => `<img src="data:${img.mimeType};base64,${img.data}" alt="" />`).join("")}</div>`;
    }
    wrap.querySelector(".msg-body").textContent = text;
    wrap.querySelector('[data-act="edit"]')?.addEventListener("click", () => {
      inputEl.value = text;
      inputEl.focus();
    });
    wrap.querySelector('[data-act="regen"]')?.addEventListener("click", () => {
      transport.post({
        type: "send",
        text,
        images,
        settings: collectComposerSettings(),
        regenerate: true,
        recentMessages: recentMessagesPayload(),
        sessionId: currentSession.id,
        localMemory: localMemoryPayload(),
      });
    });
    messagesEl.appendChild(wrap);
    if (record) {
      transcript.push({ role: "user", text, images });
      persistSessionMeta();
    }
    scrollBottom();
  }

  function beginAssistant() {
    removeEmptyState();
    const el = document.createElement("div");
    el.className = "msg assistant";
    el.innerHTML = '<div class="msg-role">Agent</div><div class="msg-body md-body cursor-blink"></div>';
    activeAssistant = { textEl: el.querySelector(".msg-body"), raw: "" };
    messagesEl.appendChild(el);
    scrollBottom();
  }

  function appendAssistantText(text) {
    if (!activeAssistant?.textEl) beginAssistant();
    activeAssistant.raw = (activeAssistant.raw || "") + text;
    activeAssistant.textEl.classList.remove("cursor-blink");
    setMarkdownEl(activeAssistant.textEl, activeAssistant.raw, true);
    scrollBottom();
  }

  function finishAssistant(record = true) {
    if (activeAssistant?.textEl && activeAssistant.raw) {
      setMarkdownEl(activeAssistant.textEl, activeAssistant.raw, false);
      if (record) {
        transcript.push({ role: "assistant", text: activeAssistant.raw });
        persistSessionMeta();
      }
    }
    activeAssistant?.textEl?.classList.remove("cursor-blink");
    activeAssistant = null;
  }

  function showCloudPrBanner(prUrl) {
    let banner = document.getElementById("cloud-pr-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "cloud-pr-banner";
      banner.className = "cloud-pr-banner";
      messagesEl.appendChild(banner);
    }
    banner.innerHTML = `<span>☁ Cloud PR</span><button type="button" class="cloud-pr-open">Buka PR</button>`;
    banner.querySelector(".cloud-pr-open")?.addEventListener("click", () => {
      transport.post({ type: "openExternal", url: prUrl });
    });
    scrollBottom();
  }

  function showError(message) {
    const el = document.createElement("div");
    el.className = "error-banner";
    el.textContent = message;
    messagesEl.appendChild(el);
    scrollBottom();
    setStatus("error", "Error");
  }

  function showBlockingApproval(req) {
    if (!approvalHost || approvalCards.has(req.callId)) return;
    approvalHost.classList.add("blocking");
    setStatus("running", "Menunggu approval…");
    hintEl.textContent = req.reason || "Konfirmasi tool sebelum dijalankan";

    const card = document.createElement("div");
    card.className = "approval-card blocking-card";
    card.dataset.callId = req.callId;
    const autoRun = composerSettings.autoRun || "run-everything";
    card.innerHTML = `<div class="approval-title">${autoRun === "auto-review" ? "Auto-review" : "Izinkan tool?"}</div>
      <div class="approval-sub">${escapeHtml(req.reason || "Agent menunggu persetujuan Anda")}</div>
      <div class="approval-tool">${escapeHtml(req.name || "tool")}</div>
      <pre class="approval-args">${escapeHtml(JSON.stringify(req.args || {}, null, 2))}</pre>
      <div class="approval-actions">
        <button type="button" class="approval-allow">Allow</button>
        <button type="button" class="approval-allow-all">Allow all for run</button>
        <button type="button" class="approval-deny">Deny</button>
      </div>`;
    card.querySelector(".approval-allow")?.addEventListener("click", () => {
      transport.post({ type: "toolApproval", callId: req.callId, approved: true });
    });
    card.querySelector(".approval-allow-all")?.addEventListener("click", () => {
      transport.post({ type: "toolApprovalAll" });
      transport.post({ type: "toolApproval", callId: req.callId, approved: true });
    });
    card.querySelector(".approval-deny")?.addEventListener("click", () => {
      transport.post({ type: "toolApproval", callId: req.callId, approved: false });
    });
    approvalHost.appendChild(card);
    approvalCards.set(req.callId, card);
    scrollBottom();
  }

  function resolveApprovalUi(callId, approved) {
    approvalCards.get(callId)?.remove();
    approvalCards.delete(callId);
    if (!approvalCards.size) {
      approvalHost?.classList.remove("blocking");
      if (isRunning) setStatus("running", "Agent…");
    }
    if (!approved) hintEl.textContent = "Tool ditolak.";
  }

  function upsertTool(event, isSubagent) {
    const id = event.call_id || event.name || String(Math.random());
    let card = toolCards.get(id);
    if (!card) {
      card = document.createElement("div");
      card.className = isSubagent ? "tool-card subagent-card" : "tool-card";
      card.innerHTML =
        '<span class="tool-icon"></span><span class="tool-name"></span><span class="tool-status"></span><button type="button" class="subagent-stop" title="Interrupt subagent">■</button><pre class="tool-detail hidden"></pre>';
      if (isSubagent) {
        card.querySelector(".subagent-stop")?.addEventListener("click", () => {
          transport.post({ type: "interruptSubagent", callId: id });
        });
      } else {
        card.querySelector(".subagent-stop")?.remove();
      }
      messagesEl.appendChild(card);
      toolCards.set(id, card);
    }
    card.querySelector(".tool-icon").textContent = isSubagent ? "⎇" : "⚙";
    card.querySelector(".tool-name").textContent = event.name || "tool";
    card.querySelector(".tool-status").textContent = event.status || "…";
    if (event.args && typeof event.args === "object") {
      const detail = card.querySelector(".tool-detail");
      detail.textContent = JSON.stringify(event.args, null, 2);
      detail.classList.remove("hidden");
    }
    if (event.status === "completed" || event.status === "done") card.classList.add("done");
    logDebug(`tool ${event.name} ${event.status}`);
    scrollBottom();
  }

  function showDiff(event) {
    const card = document.createElement("div");
    card.className = "diff-card";
    const path = event.path || "file";
    card.innerHTML = `<div class="diff-header">📝 ${escapeHtml(path)}</div><pre class="diff-body"></pre>`;
    card.querySelector(".diff-body").textContent = event.preview || "(edit applied)";
    messagesEl.appendChild(card);
    scrollBottom();
  }

  function logDebug(line) {
    if ((composerSettings.mode || "agent") !== "debug") return;
    const pre = document.getElementById("debug-log");
    if (!pre) return;
    pre.textContent = `${pre.textContent}${line}\n`.slice(-4000);
    debugPanel?.classList.remove("hidden");
  }

  function isSubagentTool(name) {
    if (!name) return false;
    const n = name.toLowerCase();
    return n === "task" || n === "agent" || n.includes("subagent");
  }

  function handleStream(payload) {
    const { event } = payload;
    if (!event) return;

    if (event.kind === "step") {
      logDebug(`step: ${JSON.stringify(event.step).slice(0, 200)}`);
      return;
    }
    if (event.kind === "diff") {
      showDiff(event);
      return;
    }

    if (event.kind === "message" && event.message) {
      const msg = event.message;
      const showThink = event.showThinking !== false && composerSettings.showThinking !== false;
      switch (msg.type) {
        case "assistant":
          for (const block of msg.message?.content || []) {
            if (block.type === "text" && block.text) appendAssistantText(block.text);
          }
          break;
        case "thinking":
          if (showThink && msg.text) {
            const t = document.createElement("div");
            t.className = "thinking-card";
            t.textContent = msg.text;
            messagesEl.appendChild(t);
            scrollBottom();
          }
          break;
        case "tool_call":
          upsertTool(msg, isSubagentTool(msg.name));
          break;
        case "usage":
          updateUsageBar(msg.usage);
          break;
        case "status":
          hintEl.textContent = msg.status || msg.message || "…";
          logDebug(`status: ${msg.status || msg.message}`);
          break;
      }
    }

    if (event.kind === "delta" && event.update) {
      const u = event.update;
      const showThink = event.showThinking !== false && composerSettings.showThinking !== false;
      if (u.type === "text-delta" || u.type === "textDelta") {
        if (u.text) appendAssistantText(u.text);
      }
      if (showThink && (u.type === "thinking-delta" || u.type === "thinkingDelta") && u.text) {
        const t = document.createElement("div");
        t.className = "thinking-card inline";
        t.textContent = u.text;
        messagesEl.appendChild(t);
      }
      if (u.type === "tool-call-started" || u.type === "tool-call-completed") {
        upsertTool(
          { name: u.name, status: u.type.includes("completed") ? "completed" : "running", call_id: u.callId, args: u.args },
          isSubagentTool(u.name),
        );
      }
    }
  }

  /** Hindari duplikat user bubble saat teks diketik + inputTranscription Gemini */
  let suppressVoiceUserEcho = "";
  /** @type {{ timezone?: string, locale?: string, localTimeLabel?: string, workspace?: string } | null} */
  let voiceSessionMeta = null;

  function formatVoiceBubbleMeta(atIso) {
    if (!voiceSessionMeta?.timezone) return "live";
    const tz = voiceSessionMeta.timezone;
    const locale = voiceSessionMeta.locale || "id-ID";
    try {
      const at = atIso ? new Date(atIso) : new Date();
      if (/^UTC[+-]/.test(tz)) {
        const m = /^UTC([+-])(\d{2}):(\d{2})$/.exec(tz);
        if (m) {
          const sign = m[1] === "+" ? 1 : -1;
          const mins = sign * (Number(m[2]) * 60 + Number(m[3]));
          const local = new Date(at.getTime() + mins * 60_000);
          const t = new Intl.DateTimeFormat(locale, {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          }).format(local);
          return `${t} · ${tz} · live`;
        }
      }
      const t = new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
      }).format(at);
      return `${t} · ${tz} · live`;
    } catch {
      return voiceSessionMeta.localTimeLabel ? `${voiceSessionMeta.localTimeLabel} · live` : "live";
    }
  }

  function applyVoiceSessionMeta(meta) {
    if (!meta || typeof meta !== "object") return;
    voiceSessionMeta = meta;
    if (hintEl && meta.localTimeLabel && meta.timezone) {
      hintEl.textContent = `Live · ${meta.localTimeLabel} (${meta.timezone})`;
    }
  }

  function finalizeVoiceLiveBubble(liveId) {
    const el = document.getElementById(liveId);
    if (!el) return;
    el.id = "";
    el.classList.remove("voice-live");
    const body = el.querySelector(".body");
    const text = (body?.textContent || "").trim();
    const role = el.classList.contains("user") ? "user" : "assistant";
    const metaFooter = el.querySelector(".voice-meta");
    const at = metaFooter?.dataset?.at || new Date().toISOString();
    if (text) {
      transcript.push({
        role,
        text,
        meta: {
          mode: "live",
          at,
          label: metaFooter?.textContent || formatVoiceBubbleMeta(at),
          timezone: voiceSessionMeta?.timezone,
          workspace: voiceSessionMeta?.workspace,
        },
      });
      persistSessionMeta();
    }
  }

  function appendVoiceTranscript(role, delta, final, moduleId) {
    const liveId = role === "user" ? "voice-user-live" : "voice-assistant-live";

    if (role === "user" && delta) {
      const norm = delta.trim().toLowerCase();
      if (suppressVoiceUserEcho && norm === suppressVoiceUserEcho) {
        suppressVoiceUserEcho = "";
        finalizeVoiceLiveBubble("voice-user-live");
        return;
      }
      finalizeVoiceLiveBubble("voice-assistant-live");
    }

    if (!delta && !final) return;

    let el = document.getElementById(liveId);
    if (!el) {
      removeEmptyState();
      el = document.createElement("div");
      el.id = liveId;
      el.className = `msg voice-live ${role}${moduleId ? " voice-module" : ""}`;
      const at = new Date().toISOString();
      const modTag = moduleId ? ` · mod:${moduleId}` : "";
      el.innerHTML = `<div class="role">${role === "user" ? "Anda" : "Rhema (live)"}</div><div class="body"></div><div class="msg-meta voice-meta" data-at="${at}">${formatVoiceBubbleMeta(at)}${modTag}</div>`;
      messagesEl.appendChild(el);
    }

    const body = el.querySelector(".body");
    if (delta && body) {
      if (moduleId && role === "assistant") {
        body.textContent = delta;
      } else {
        const prev = body.textContent || "";
        if (role === "assistant" && prev && delta.startsWith(prev)) {
          body.textContent = delta;
        } else if (!prev.endsWith(delta)) {
          body.textContent = prev + delta;
        }
      }
    }

    if (final) finalizeVoiceLiveBubble(liveId);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function handleServerMessage(data) {
    switch (data.type) {
      case "boot": {
        const s = data.settings || {};
        applySettingsToUi(s);
        if (appMode === "browser") {
          if (!sessions.length && data.sessions?.length) {
            sessions = data.sessions;
            currentSession = sessions[0] || currentSession;
            saveSessions(storage, sessions);
          }
        } else if (data.sessions?.length) {
          sessions = data.sessions;
          currentSession = sessions[0] || currentSession;
        }
        if (data.rules?.length && $("active-rules")) {
          $("active-rules").innerHTML = data.rules.map((r) => `<option value="${r}">${r}</option>`).join("");
        }
        if (data.detectedCloudRepo && $("cloud-repo-url") && !($("cloud-repo-url").value || "").trim()) {
          $("cloud-repo-url").placeholder = data.detectedCloudRepo;
        }
        const cloudBit = data.cloudStatus && s.runtime === "cloud" ? ` · ${data.cloudStatus}` : "";
        hintEl.textContent = data.featureStats
          ? `Cursor parity ${data.featureStats.done}/${data.featureStats.total} · ${s.model || "composer-2.5"} · ${s.mode || "agent"}${cloudBit}`
          : `cwd: ${data.cwd} · ${s.model || "composer-2.5"} · ${s.mode || "agent"}${cloudBit}`;
        if (data.providerKeyStatus) applyProviderKeyStatus(data.providerKeyStatus);
        renderSessionList();
        ensureEmptyState();
        break;
      }
      case "sessions":
        sessions = data.sessions || sessions;
        saveSessions(storage, sessions);
        renderSessionList();
        break;
      case "settings":
        applySettingsToUi(data.settings);
        break;
      case "models":
        cachedModels = data.models || [];
        populateModels(cachedModels);
        break;
      case "providerKeyStatus":
        if (data.providerKeyStatus) applyProviderKeyStatus(data.providerKeyStatus);
        break;
      case "providerKeySaved":
        if (data.provider === "google" && data.ok) {
          const input = document.getElementById("byok-google");
          if (input?.dataset.pendingSave === "1") {
            input.value = "";
            delete input.dataset.pendingSave;
          }
          const hasKey = getGoogleKeyStatusMeta().configured;
          if (input && hasKey) input.placeholder = t("settings.keySaved");
          storage.setItem?.(GOOGLE_KEY_FLAG, hasKey ? "1" : "0");
          updateByokKeyStatusLine(hasKey);
          syncByokHomeBanner();
          showSaveStatus(hasKey ? `${t("settings.save")} ✓` : t("settings.keyDeleted"), hasKey ? "ok" : "");
        } else if (data.provider === "google") {
          showSaveStatus(t("byok.error.invalid"), "error");
        }
        break;
      case "prefill":
        inputEl.value = data.text || "";
        inputEl.focus();
        break;
      case "mentionSuggestions":
        renderMentions(data.items || [], data.category || mentionCategory);
        break;
      case "cleared":
        messagesEl.innerHTML = "";
        toolCards.clear();
        activeAssistant = null;
        transcript = [];
        pendingImages = [];
        renderImagePreview();
        ensureEmptyState();
        setRunning(false);
        approvalHost && (approvalHost.innerHTML = "");
        approvalCards.clear();
        approvalHost?.classList.remove("blocking");
        break;
      case "approvalRequest":
        showBlockingApproval(data);
        break;
      case "approvalResolved":
        resolveApprovalUi(data.callId, !!data.approved);
        break;
      case "approvalAllEnabled":
        hintEl.textContent = "Allow all aktif untuk run ini.";
        break;
      case "passiveContext":
        renderPassiveContext(data.snapshot);
        break;
      case "agenticLoop":
        renderAgenticLoopBar(data.state);
        break;
      case "runStarted":
        setRunning(true);
        if (!data.regenerate) appendUser(data.prompt, data.images);
        else beginAssistant();
        if (!data.regenerate) {
          lastUserPrompt = data.prompt;
          lastUserImages = data.images || [];
        }
        toolCards.clear();
        pendingImages = [];
        renderImagePreview();
        approvalHost && (approvalHost.innerHTML = "");
        approvalCards.clear();
        approvalHost?.classList.remove("blocking");
        break;
      case "stream":
        handleStream(data);
        break;
      case "runComplete":
        finishAssistant();
        setRunning(false);
        updateUsageBar(data.usage);
        if (activeAssistant?.raw) {
          transport.post({ type: "lastResponse", text: activeAssistant.raw });
        }
        if (data.status === "error" && data.error) showError(data.error);
        else if (data.status === "cancelled") hintEl.textContent = "Dibatalkan.";
        else {
          const u = data.usage;
          let hint = data.durationMs
            ? `Selesai (${Math.round(data.durationMs / 1000)}s) · ↑${u?.inputTokens ?? "?"} ↓${u?.outputTokens ?? "?"}`
            : "Selesai.";
          if (data.prUrl) {
            hint += " · PR siap";
            setStatus("idle", "Cloud PR");
            showCloudPrBanner(data.prUrl);
          }
          hintEl.textContent = hint;
        }
        persistSessionMeta();
        break;
      case "error":
        finishAssistant();
        setRunning(false);
        showError(data.message || "Unknown error");
        break;
      case "memorySaveLocal":
        if (Array.isArray(data.entries)) {
          saveLocalMemory(storage, data.entries);
          localMemoryEntries = data.entries;
        }
        break;
      case "voiceTranscript":
        appendVoiceTranscript(data.role, data.delta || "", data.final, data.moduleId);
        break;
      case "voiceTurnComplete":
        finalizeVoiceLiveBubble("voice-assistant-live");
        break;
      case "voiceSessionMeta":
        applyVoiceSessionMeta(data.meta);
        break;
      case "voiceStatus":
      case "voiceAudioOut":
      case "voiceInterrupt":
        break;
      case "requestLastResponse":
        if (activeAssistant?.raw) {
          transport.post({ type: "lastResponse", text: activeAssistant.raw });
        } else {
          const last = [...transcript].reverse().find((m) => m.role === "assistant");
          if (last?.text) transport.post({ type: "lastResponse", text: last.text });
        }
        break;
      case "loadSession": {
        const id = data.sessionId;
        if (id) loadSession(id);
        break;
      }
    }
  }

  function renderMentions(items, category) {
    if (!mentionBox) return;
    mentionBox.innerHTML = "";

    const tabs = document.createElement("div");
    tabs.className = "mention-tabs";
    for (const cat of MENTION_CATEGORIES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `mention-tab${category === cat.id || (category === "all" && cat.id === "files") ? " active" : ""}`;
      b.textContent = `${cat.icon} ${cat.label}`;
      b.addEventListener("click", () => {
        mentionCategory = cat.id;
        transport.post({ type: "mentionQuery", query: "", category: cat.id });
      });
      tabs.appendChild(b);
    }
    mentionBox.appendChild(tabs);

    if (!items.length) {
      mentionBox.classList.remove("hidden");
      return;
    }
    mentionBox.classList.remove("hidden");
    items.slice(0, 10).forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mention-item";
      btn.textContent = item;
      btn.addEventListener("click", () => {
        insertAtCursor(buildMentionInsert(category === "all" ? "files" : category, item));
        mentionBox.classList.add("hidden");
      });
      mentionBox.appendChild(btn);
    });
  }

  function insertAtCursor(text) {
    const start = inputEl.selectionStart ?? inputEl.value.length;
    const end = inputEl.selectionEnd ?? start;
    inputEl.value = inputEl.value.slice(0, start) + text + inputEl.value.slice(end);
    inputEl.focus();
    inputEl.selectionStart = inputEl.selectionEnd = start + text.length;
  }

  const PROVIDER_LABELS = {
    cursor: "Cursor / Composer",
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google Gemini",
    deepseek: "DeepSeek",
  };

  function applyProviderKeyStatus(status) {
    const input = document.getElementById("byok-google");
    if (input && status?.google) {
      input.placeholder = "Key tersimpan ✓ — ketik key baru untuk ganti";
      storage.setItem?.(GOOGLE_KEY_FLAG, "1");
    } else if (input && status && !status.google) {
      input.placeholder = "AIza… — API key Google AI Studio";
      storage.removeItem?.(GOOGLE_KEY_FLAG);
    }
  }

  function renderAgenticLoopBar(state) {
    const bar = document.getElementById("agentic-loop-bar");
    if (!state) {
      bar?.classList.add("hidden");
      return;
    }
    if (!bar) {
      const host = document.getElementById("context-bar")?.parentElement || document.querySelector(".composer")?.parentElement;
      if (!host) return;
      host.insertAdjacentHTML(
        "afterbegin",
        `<div id="agentic-loop-bar" class="agentic-loop-bar hidden" aria-live="polite"></div>`,
      );
    }
    const el = document.getElementById("agentic-loop-bar");
    if (!el) return;
    const active = !["idle", "done", "failed", "cancelled"].includes(state.phase);
    el.classList.toggle("hidden", !active && state.phase !== "done" && state.phase !== "failed");
    const err = state.errorHistory?.[state.errorHistory.length - 1];
    const phase = state.phase || "idle";
    const mode = state.mode || "fix";
    el.innerHTML = `<strong>Agentic Loop</strong> · ${mode} · ${phase} · iter ${state.iteration}/${state.maxIterations}${err ? ` · ${err.count} err` : ""}${state.message ? ` — ${state.message}` : ""}`;
    if (state.phase === "done") el.classList.remove("hidden");
    if (state.phase === "failed" || state.phase === "cancelled") el.classList.remove("hidden");
  }

  function populateModels(models) {
    const sel = $("model");
    if (!sel || !models.length) return;
    const current = sel.value;
    const providerFilter = $("model-provider")?.value || "all";
    const seen = new Set();
    sel.innerHTML = "";

    const filtered =
      providerFilter === "all"
        ? models
        : models.filter((m) => (m.provider || "cursor") === providerFilter);

    const groups = new Map();
    for (const m of filtered) {
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      const provider = m.provider || "cursor";
      if (!groups.has(provider)) groups.set(provider, []);
      groups.get(provider).push(m);
    }

    const appendOption = (m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name || m.id;
      sel.appendChild(opt);
    };

    if (providerFilter === "all") {
      for (const [provider, list] of groups) {
        const og = document.createElement("optgroup");
        og.label = PROVIDER_LABELS[provider] || provider;
        for (const m of list) {
          const opt = document.createElement("option");
          opt.value = m.id;
          opt.textContent = m.name || m.id;
          og.appendChild(opt);
        }
        sel.appendChild(og);
      }
    } else {
      for (const m of filtered) appendOption(m);
    }

    if (seen.has(current)) sel.value = current;
    else if (filtered.length) sel.value = filtered[0].id;
  }

  function appendCreatorReply(replyText) {
    removeEmptyState();
    const el = document.createElement("div");
    el.className = "msg assistant";
    el.innerHTML = `<div class="msg-role">Rhema</div><div class="msg-body"></div>`;
    el.querySelector(".msg-body").textContent = replyText;
    messagesEl.appendChild(el);
    transcript.push({ role: "assistant", text: replyText });
    persistSessionMeta();
    scrollBottom();
    hintEl.textContent = "Selesai.";
  }

  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isRunning) return;
    const images = pendingImages.slice();
    inputEl.value = "";
    pendingImages = [];
    renderImagePreview();

    if (isCreatorQuery(text)) {
      appendUser(text, images);
      appendCreatorReply(buildCreatorReply(false));
      return;
    }

    const useVoice =
      transport.voiceTextReplies &&
      transport.voice?.sendTextOrStart &&
      !images.length;

    if (useVoice) {
      finalizeVoiceLiveBubble("voice-assistant-live");
      const saved = trySaveExplicitMemory(text);
      if (saved) {
        appendUser(text, images);
        appendLocalMemoryAck(saved);
        return;
      }
      suppressVoiceUserEcho = text.trim().toLowerCase();
      appendUser(text, images);
      hintEl.textContent = transport.voice?.isLive?.()
        ? "Mengirim ke sesi suara…"
        : "Menyiapkan respons suara…";
      void transport.voice.sendTextOrStart(text);
      return;
    }

    const saved = trySaveExplicitMemory(text);
    if (saved) {
      appendUser(text, images);
      appendLocalMemoryAck(saved);
      return;
    }

    transport.post({
      type: "send",
      text,
      images,
      settings: collectComposerSettings(),
      recentMessages: recentMessagesPayload(),
      sessionId: currentSession.id,
      localMemory: localMemoryPayload(),
    });
  }

  function appendLocalMemoryAck(fact) {
    removeEmptyState();
    const el = document.createElement("div");
    el.className = "msg assistant";
    el.innerHTML = `<div class="msg-role">Rhema</div><div class="msg-body"></div>`;
    el.querySelector(".msg-body").textContent =
      `Baik, saya ingat (disimpan lokal di perangkat Anda): ${fact}`;
    messagesEl.appendChild(el);
    transcript.push({ role: "assistant", text: el.querySelector(".msg-body").textContent });
    persistSessionMeta();
    scrollBottom();
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve({ data: base64, mimeType: file.type || "image/png", name: file.name });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  attachImgBtn?.addEventListener("click", () => imageInput?.click());
  imageInput?.addEventListener("change", async () => {
    const files = imageInput.files;
    if (!files?.length) return;
    for (const file of files) {
      pendingImages.push(await readFileAsBase64(file));
    }
    imageInput.value = "";
    renderImagePreview();
  });

  attachFileBtn?.addEventListener("click", () => transport.post({ type: "pickFile" }));

  composerEl?.addEventListener("dragover", (e) => {
    e.preventDefault();
    composerEl.classList.add("drag-over");
  });
  composerEl?.addEventListener("dragleave", () => composerEl.classList.remove("drag-over"));
  composerEl?.addEventListener("drop", async (e) => {
    e.preventDefault();
    composerEl.classList.remove("drag-over");
    const files = [...(e.dataTransfer?.files || [])];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        pendingImages.push(await readFileAsBase64(file));
      } else {
        insertAtCursor(`@${file.name} `);
      }
    }
    renderImagePreview();
  });

  function bindComposerControls() {
    if (!inputEl || !sendBtn || !stopBtn || !newBtn) {
      const missing = [
        !inputEl && "#input",
        !sendBtn && "#btn-send",
        !stopBtn && "#btn-stop",
        !newBtn && "#btn-new",
      ].filter(Boolean);
      showError(`UI chat belum siap (elemen hilang: ${missing.join(", ")}). Hard refresh (Ctrl+Shift+R).`);
      return;
    }

    sendBtn.addEventListener("click", sendMessage);
    stopBtn.addEventListener("click", () => transport.post({ type: "cancel" }));
    newBtn.addEventListener("click", () => startNewSession());

    inputEl.addEventListener("paste", async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            pendingImages.push(await readFileAsBase64(file));
            renderImagePreview();
          }
        }
      }
    });

    inputEl.addEventListener("input", () => {
      const val = inputEl.value;
      const at = val.lastIndexOf("@");
      if (at >= 0) {
        const query = val.slice(at + 1);
        if (!query.includes(" ")) {
          const parsed = parseMentionQuery(query);
          mentionCategory = parsed.category;
          transport.post({ type: "mentionQuery", query: parsed.query, category: parsed.category });
        }
      } else {
        mentionBox?.classList.add("hidden");
      }
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        cycleMode(e.shiftKey);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  bindComposerControls();
  transport.onDisconnect?.(() => {
    setRunning(false);
    approvalHost?.classList.remove("blocking");
  });

  transport.onMessage(handleServerMessage);
  transport.post({ type: "ready", mode: appMode });
  setRunning(false);

  const savedSessionId = storage.getItem?.(CURRENT_SESSION_KEY);
  const sessionToRestore =
    (savedSessionId && sessions.find((x) => x.id === savedSessionId)) ||
    sessions.find((x) => x.messages?.length) ||
    currentSession;
  if (sessionToRestore?.messages?.length) {
    restoreSessionUi(sessionToRestore);
  } else {
    ensureEmptyState();
    renderSessionList();
    saveCurrentSessionId();
  }

  window.addEventListener("beforeunload", () => {
    persistSessionMeta();
  });

  return { insertAtCursor, setPendingImages: (imgs) => { pendingImages = imgs; renderImagePreview(); } };
}
