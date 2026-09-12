/**
 * Panel pengaturan — Konfigurasi Gemini API Key, Pilihan Suara AI, dan Persona Rohani.
 */

import { getEffectiveProfile, getRegionDisplayLabel } from "./localeProfile.js";
import { getGoogleKeyStatusMeta } from "./geminiConstants.js";
import { getSecurityTrustLine } from "./byokUx.js";
import { PRIVACY_POLICY_IN_APP } from "./legalUrls.js";
import { t } from "./uiStrings.js";

export function renderSettingsPanel(opts = {}) {
  const providerKeyStatus = opts.providerKeyStatus || {};
  const configured = providerKeyStatus.google;
  const placeholder = configured
    ? (t("settings.keySaved") || "Key saved — type new key to replace")
    : "AIza… — Google AI Studio";

  const savedVoice = (typeof localStorage !== "undefined" && localStorage.getItem("rhema-voice-name")) || "Puck";
  const savedPersona = (typeof localStorage !== "undefined" && localStorage.getItem("rhema-persona-id")) || "pastor";
  const localeProfile = getEffectiveProfile();
  const savedRegion = localeProfile.region || "indonesia";
  const savedBible = localeProfile.bibleVersion || (savedRegion === "global" ? "kjv" : "tb");

  const keyMeta = getGoogleKeyStatusMeta();
  const keyStatusLine = !keyMeta.configured
    ? t("settings.keyStatusMissing")
    : keyMeta.liveValidated
      ? t("settings.keyStatusLive")
      : t("settings.keyStatusActive");

  const apiKeySection = `
  <div class="settings-section settings-section-byok">
    <div class="settings-section-title">🔑 Gemini API Key (BYOK)</div>
    <p class="settings-hint">${configured ? t("settings.byokHintConfigured") : t("settings.byokHint")}</p>
    <p class="settings-hint byok-key-status" id="byok-key-status-line">${keyStatusLine}</p>
    <div class="settings-row byok-row">
      <label for="byok-google">API Key</label>
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
<div id="settings-panel" class="settings-panel hidden" role="dialog" aria-label="Pengaturan Rhema AI">
  <div class="settings-head-row">
    <h3>⚙️ ${t("settings.title")}</h3>
    <button id="btn-close-settings-panel" type="button" class="settings-close-icon" aria-label="Tutup">✕</button>
  </div>
  
  <!-- Section 0: Region Ibadah -->
  <div class="settings-section">
    <div class="settings-section-title">🌏 ${t("settings.region")}</div>
    <p class="settings-hint">${t("settings.regionHint")} ${getRegionDisplayLabel()}</p>
    <div class="settings-row">
      <label for="select-worship-region">Region</label>
      <select id="select-worship-region" class="settings-select">
        <option value="indonesia" ${savedRegion === "indonesia" ? "selected" : ""}>🇮🇩 Indonesia (TB · Kidung Jemaat)</option>
        <option value="global" ${savedRegion === "global" ? "selected" : ""}>🌏 Outside Indonesia (KJV · English)</option>
      </select>
    </div>
    <div class="settings-row">
      <label for="select-bible-version">Alkitab default</label>
      <select id="select-bible-version" class="settings-select">
        <option value="tb" ${savedBible === "tb" ? "selected" : ""}>TB (LAI) — Indonesia</option>
        <option value="kjv" ${savedBible === "kjv" ? "selected" : ""}>KJV — English</option>
      </select>
    </div>
    <button type="button" id="btn-reopen-region-onboard" class="btn-pill btn-soft byok-guide-btn">${t("settings.reopenRegion")}</button>
  </div>

  <!-- Section 1: Karakter Suara AI (Gemini Live) -->
  <div class="settings-section">
    <div class="settings-section-title">🎙️ ${t("settings.voiceTitle")}</div>
    <p class="settings-hint">Pilih warna suara alami yang paling nyaman untuk pendampingan ibadah dan doa Anda.</p>
    <div class="settings-row">
      <label for="select-voice-name">Karakter Suara</label>
      <select id="select-voice-name" class="settings-select">
        <option value="Charon" ${savedVoice === "Charon" ? "selected" : ""}>Charon (Pria Berwibawa &amp; Tenang — Pastoral)</option>
        <option value="Puck" ${savedVoice === "Puck" ? "selected" : ""}>Puck (Pria Hangat &amp; Komunikatif)</option>
        <option value="Kore" ${savedVoice === "Kore" ? "selected" : ""}>Kore (Wanita Teduh &amp; Menenangkan — Meditatif)</option>
        <option value="Aoede" ${savedVoice === "Aoede" ? "selected" : ""}>Aoede (Wanita Anggun &amp; Puitis)</option>
        <option value="Fenrir" ${savedVoice === "Fenrir" ? "selected" : ""}>Fenrir (Pria Tegas &amp; Kuat)</option>
      </select>
    </div>
  </div>

  <!-- Section 2: Persona & Peran Rohani AI -->
  <div class="settings-section">
    <div class="settings-section-title">🕊️ ${t("settings.personaTitle")}</div>
    <p class="settings-hint">Sesuaikan pendekatan teologis dan gaya bimbingan AI dalam berdiskusi firman Tuhan.</p>
    <div class="settings-row">
      <label for="select-persona-id">Peran Rohani AI</label>
      <select id="select-persona-id" class="settings-select">
        <option value="pastor" ${savedPersona === "pastor" ? "selected" : ""}>🕊️ Gembala &amp; Konselor (Empatik &amp; Doa)</option>
        <option value="theologian" ${savedPersona === "theologian" ? "selected" : ""}>📜 Guru Teologi &amp; Sejarah (Eksposisi &amp; Bahasa Asli)</option>
        <option value="worship_leader" ${savedPersona === "worship_leader" ? "selected" : ""}>🎸 Pemazmur &amp; Worship Leader (Raja Daud)</option>
        <option value="apostle_paul" ${savedPersona === "apostle_paul" ? "selected" : ""}>⚔️ Rasul Paulus (Doktrin Iman &amp; Misi)</option>
        <option value="prayer_intercessor" ${savedPersona === "prayer_intercessor" ? "selected" : ""}>🙏 Sahabat Doa &amp; Saat Teduh (Kontemplatif)</option>
        <option value="kids_storyteller" ${savedPersona === "kids_storyteller" ? "selected" : ""}>🎨 Kakak Sekolah Minggu (Cerita Alkitab Anak)</option>
      </select>
    </div>
  </div>

  ${apiKeySection}

  <div class="settings-section">
    <div class="settings-section-title">📄 ${t("settings.legalTitle")}</div>
    <p class="settings-hint">${t("settings.legal")}</p>
    <p class="settings-hint"><a href="${PRIVACY_POLICY_IN_APP}">Kebijakan Privasi / Privacy Policy ›</a></p>
  </div>

  <!-- Actions -->
  <div class="settings-actions">
    <button id="btn-save-gemini" type="button" class="primary full">💾 ${t("settings.save")}</button>
  </div>
  <p id="byok-save-status" class="settings-save-status" aria-live="polite"></p>
</div>`;
}
