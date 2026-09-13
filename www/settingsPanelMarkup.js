/**
 * Panel pengaturan — Konfigurasi Gemini API Key, Pilihan Suara AI, dan Persona Rohani.
 */

import { APP_LANGUAGES, getEffectiveProfile, getRegionDisplayLabel } from "./localeProfile.js";
import { getGoogleKeyStatusMeta } from "./geminiConstants.js";
import { getSecurityTrustLine } from "./byokUx.js";
import { PRIVACY_POLICY_IN_APP } from "./legalUrls.js";
import { t } from "./uiStrings.js";

export function renderSettingsPanel(opts = {}) {
  const providerKeyStatus = opts.providerKeyStatus || {};
  const configured = providerKeyStatus.google;
  const placeholder = configured ? t("settings.keySaved") : t("settings.keyPlaceholder");

  const savedVoice = (typeof localStorage !== "undefined" && localStorage.getItem("rhema-voice-name")) || "Puck";
  const rawPersona = (typeof localStorage !== "undefined" && localStorage.getItem("rhema-persona-id")) || "pastor";
  const savedPersona = rawPersona === "kids_storyteller" ? "pastor" : rawPersona;
  const localeProfile = getEffectiveProfile();
  const savedUiLang = localeProfile.uiLang || "en";
  const savedAiLang = localeProfile.aiLang || savedUiLang;
  const savedBible = localeProfile.bibleVersion || "kjv";

  const langOptions = (selected) =>
    APP_LANGUAGES.map(
      (l) =>
        `<option value="${l.id}"${l.id === selected ? " selected" : ""}>${l.flag} ${l.native}</option>`,
    ).join("");

  const keyMeta = getGoogleKeyStatusMeta();
  const keyStatusLine = !keyMeta.configured
    ? t("settings.keyStatusMissing")
    : keyMeta.liveValidated
      ? t("settings.keyStatusLive")
      : t("settings.keyStatusActive");

  const apiKeySection = `
  <div class="settings-section settings-section-byok">
    <div class="settings-section-title">🔑 ${t("settings.byokSection")}</div>
    <p class="settings-hint">${configured ? t("settings.byokHintConfigured") : t("settings.byokHint")}</p>
    <p class="settings-hint byok-key-status" id="byok-key-status-line">${keyStatusLine}</p>
    <div class="settings-row byok-row">
      <label for="byok-google">${t("settings.apiKeyLabel")}</label>
      <div class="byok-key-row settings-key-row">
        <input id="byok-google" type="password" data-provider="google" placeholder="${placeholder}" autocomplete="off" />
        <button type="button" id="btn-byok-paste" class="byok-paste-btn" aria-label="${t("settings.pasteKey")}">📋</button>
      </div>
    </div>
    <p class="settings-hint byok-security-trust">${getSecurityTrustLine("settings")}</p>
    <p class="settings-hint"><a href="#" data-open="https://aistudio.google.com/apikey">${t("settings.studioLink")}</a></p>
    <p class="settings-hint">${t("settings.bibleNoKey")}</p>
    <p class="settings-hint byok-quota-hint"><strong>${t("quota.help.title")}:</strong> ${t("quota.help.body")}</p>
    <div class="settings-byok-actions">
      <button type="button" id="btn-check-byok-key" class="btn-pill btn-soft byok-guide-btn">${t("settings.keyCheck")}</button>
      <button type="button" id="btn-delete-byok-key" class="btn-pill btn-soft byok-guide-btn byok-delete-btn"${configured ? "" : " disabled"}>${t("settings.keyDelete")}</button>
      <button type="button" id="btn-open-byok-guide" class="btn-pill btn-soft byok-guide-btn">${t("settings.byokGuide")}</button>
    </div>
  </div>`;

  return `
<div id="settings-panel" class="settings-panel hidden" role="dialog" aria-label="${t("settings.dialogAria")}">
  <div class="settings-head-row">
    <h3>⚙️ ${t("settings.title")}</h3>
    <button id="btn-close-settings-panel" type="button" class="settings-close-icon" aria-label="${t("settings.close")}">✕</button>
  </div>
  
  <!-- Section 0: Bahasa, Alkitab, percakapan AI -->
  <div class="settings-section">
    <div class="settings-section-title">🌏 ${t("settings.region")}</div>
    <p class="settings-hint">${t("settings.regionHint")} ${getRegionDisplayLabel()}</p>
    <div class="settings-row">
      <label for="select-ui-lang">${t("settings.uiLangLabel")}</label>
      <select id="select-ui-lang" class="settings-select">${langOptions(savedUiLang)}</select>
    </div>
    <div class="settings-row">
      <label for="select-bible-version">${t("settings.bibleLabel")}</label>
      <select id="select-bible-version" class="settings-select">
        <option value="kjv" ${savedBible === "kjv" ? "selected" : ""}>${t("settings.bibleKjv")}</option>
        <option value="tb" ${savedBible === "tb" ? "selected" : ""}>${t("settings.bibleTb")}</option>
      </select>
    </div>
    <div class="settings-row">
      <label for="select-ai-lang">${t("settings.aiLangLabel")}</label>
      <select id="select-ai-lang" class="settings-select">${langOptions(savedAiLang)}</select>
    </div>
    <button type="button" id="btn-reopen-region-onboard" class="btn-pill btn-soft byok-guide-btn">${t("settings.reopenRegion")}</button>
  </div>

  <!-- Section 1: Karakter Suara AI (Gemini Live) -->
  <div class="settings-section">
    <div class="settings-section-title">🎙️ ${t("settings.voiceTitle")}</div>
    <p class="settings-hint">${t("settings.voiceHint")}</p>
    <div class="settings-row">
      <label for="select-voice-name">${t("settings.voiceLabel")}</label>
      <select id="select-voice-name" class="settings-select">
        <option value="Charon" ${savedVoice === "Charon" ? "selected" : ""}>${t("settings.voiceOpt.charon")}</option>
        <option value="Puck" ${savedVoice === "Puck" ? "selected" : ""}>${t("settings.voiceOpt.puck")}</option>
        <option value="Kore" ${savedVoice === "Kore" ? "selected" : ""}>${t("settings.voiceOpt.kore")}</option>
        <option value="Aoede" ${savedVoice === "Aoede" ? "selected" : ""}>${t("settings.voiceOpt.aoede")}</option>
        <option value="Fenrir" ${savedVoice === "Fenrir" ? "selected" : ""}>${t("settings.voiceOpt.fenrir")}</option>
      </select>
    </div>
  </div>

  <!-- Section 2: Persona & Peran Rohani AI -->
  <div class="settings-section">
    <div class="settings-section-title">🕊️ ${t("settings.personaTitle")}</div>
    <p class="settings-hint">${t("settings.personaHint")}</p>
    <div class="settings-row">
      <label for="select-persona-id">${t("settings.personaLabel")}</label>
      <select id="select-persona-id" class="settings-select">
        <option value="pastor" ${savedPersona === "pastor" ? "selected" : ""}>${t("settings.persona.pastor")}</option>
        <option value="theologian" ${savedPersona === "theologian" ? "selected" : ""}>${t("settings.persona.theologian")}</option>
        <option value="worship_leader" ${savedPersona === "worship_leader" ? "selected" : ""}>${t("settings.persona.worship_leader")}</option>
        <option value="apostle_paul" ${savedPersona === "apostle_paul" ? "selected" : ""}>${t("settings.persona.apostle_paul")}</option>
        <option value="prayer_intercessor" ${savedPersona === "prayer_intercessor" ? "selected" : ""}>${t("settings.persona.prayer_intercessor")}</option>
      </select>
    </div>
  </div>

  ${apiKeySection}

  <div class="settings-section">
    <div class="settings-section-title">📄 ${t("settings.legalTitle")}</div>
    <p class="settings-hint">${t("settings.legal")}</p>
    <p class="settings-hint"><a href="${PRIVACY_POLICY_IN_APP}">${t("settings.privacyLink")}</a></p>
  </div>

  <!-- Actions -->
  <div class="settings-actions">
    <button id="btn-save-gemini" type="button" class="primary full">💾 ${t("settings.save")}</button>
  </div>
  <p id="byok-save-status" class="settings-save-status" aria-live="polite"></p>
</div>`;
}
