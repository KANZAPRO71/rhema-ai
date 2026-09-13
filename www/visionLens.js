/**
 * AI Vision Spiritual Lens (Kamera Pewahyuan AI) — Memotret Situasi Hidup & Menghasilkan Rhema Firman Serta Doa Nubuat.
 */

import { geminiGenerateContentUrl, geminiRestHeaders, getStoredGoogleKey, GOOGLE_KEY_STORAGE } from "./geminiConstants.js";
import { isSecureKeyStorageAvailable, secureGetItem } from "./secureKeyStorage.js";
import { openVerseShareModal } from "./verseCardRenderer.js";

/**
 * Analisis gambar — langsung ke Google Gemini dengan key BYOK di perangkat.
 * Tidak mengirim foto atau API key ke server Rhema.
 * @param {string} base64Data
 * @param {string} mimeType
 * @returns {Promise<{ success: boolean, result?: any, error?: string }>}
 */
export async function analyzeVisionPhoto(base64Data, mimeType = "image/jpeg") {
  let apiKey = getStoredGoogleKey();
  if (!apiKey && isSecureKeyStorageAvailable()) {
    apiKey = await secureGetItem(GOOGLE_KEY_STORAGE);
  }

  if (apiKey) {
    try {
      const cleanB64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
      const apiUrl = geminiGenerateContentUrl();
      const systemInstruction = `Anda adalah Rohaniwan & Konselor Iman Alkitabiah Rhema AI. Analisis gambar/foto ini secara empati dan rohani.
Berikan respons dalam format JSON murni:
{
  "situation": "Penjelasan singkat situasi hidup yang teramati pada foto",
  "emotions": ["Kata Emosi 1", "Kata Emosi 2"],
  "passage": "Referensi Ayat Alkitab",
  "verseText": "Teks ayat Alkitab yang tepat",
  "reflection": "Renungan singkat 2-3 kalimat yang menguatkan hati",
  "prayer": "Doa pengurapan dan deklarasi kemenangan iman atas situasi di foto tersebut"
}`;

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: geminiRestHeaders(apiKey),
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: systemInstruction },
                { inlineData: { mimeType, data: cleanB64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        }),
      });

      const data = await resp.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
        return { success: true, result: parsed };
      }
      if (data.error?.message) return { success: false, error: data.error.message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return {
    success: false,
    error: "Gemini API key belum dikonfigurasi. Masukkan Google Gemini API key di menu Pengaturan (⚙).",
  };
}

/**
 * Membuka Modal Kamera Pewahyuan AI (Vision Lens)
 * @param {{ onVoicePray?: (analysis: object) => void }} [callbacks]
 */
export function openVisionLensModal(callbacks = {}) {
  let existing = document.getElementById("vision-lens-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "vision-lens-modal";
  modal.className = "apple-modal-overlay active";

  modal.innerHTML = `
    <div class="apple-modal-sheet vision-sheet">
      <div class="modal-handle-bar"></div>
      <div class="vision-header">
        <div>
          <span class="vision-badge">📷 Terobosan Gemini Vision</span>
          <h2 class="vision-title">Kamera Pewahyuan AI</h2>
          <p class="vision-sub">Foto situasi hidupmu · AI temukan ayat Rhema &amp; pimpin doa</p>
        </div>
        <button type="button" class="btn-modal-close" id="btn-close-vision">✕</button>
      </div>

      <!-- Upload / Camera Area -->
      <div class="vision-upload-box" id="vision-drop-zone">
        <input type="file" id="vision-file-input" accept="image/*" style="display:none;" />
        <div class="vision-prompt-wrap" id="vision-prompt-ui">
          <span class="vision-cam-icon">📸</span>
          <p class="vision-upload-title">Ambil Foto atau Unggah Gambar</p>
          <p class="vision-upload-desc">Meja kerja, keluarga, situasi sakit, pergumulan, atau pemandangan</p>
          <button type="button" class="btn-pill primary glow" id="btn-trigger-cam">Pilih foto</button>
        </div>
        <div class="vision-preview-wrap hidden" id="vision-preview-ui">
          <img id="vision-preview-img" alt="Preview foto" class="vision-img-tag" />
          <div class="vision-scan-overlay hidden" id="vision-scan-anim">
            <div class="vision-laser-beam"></div>
            <span class="vision-scanning-text">✨ Gemini AI sedang membaca situasi rohani…</span>
          </div>
        </div>
      </div>

      <!-- Analysis Results Area -->
      <div class="vision-result-body hidden" id="vision-result-wrap">
        <div class="vision-card-main glass-card">
          <div class="vision-situation-box">
            <span class="vbox-label">🔍 Situasi yang Teramati:</span>
            <p class="vbox-text" id="v-render-sit">—</p>
          </div>

          <div class="vision-verse-box">
            <span class="vbox-label gold">✨ Ayat Rhema Pegangan Hidup:</span>
            <h3 class="vbox-passage" id="v-render-pass">—</h3>
            <blockquote class="vbox-quote" id="v-render-versetext">—</blockquote>
          </div>

          <div class="vision-reflection-box">
            <span class="vbox-label">🕊️ Perenungan Firman:</span>
            <p class="vbox-text" id="v-render-ref">—</p>
          </div>

          <div class="vision-prayer-box">
            <span class="vbox-label purple">🙏 Doa Deklarasi Kemenangan:</span>
            <p class="vbox-text" id="v-render-prayer">—</p>
          </div>
        </div>

        <div class="vision-action-footer">
          <button type="button" class="btn-pill btn-soft" id="btn-v-share-card">🖼 Buat Wallpaper Emas</button>
          <button type="button" class="btn-pill primary glow" id="btn-v-voice-pray">🎙️ Pimpin Doa Suara Live</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const fileInput = modal.querySelector("#vision-file-input");
  const triggerBtn = modal.querySelector("#btn-trigger-cam");
  const promptUi = modal.querySelector("#vision-prompt-ui");
  const previewUi = modal.querySelector("#vision-preview-ui");
  const previewImg = modal.querySelector("#vision-preview-img");
  const scanAnim = modal.querySelector("#vision-scan-anim");
  const resultWrap = modal.querySelector("#vision-result-wrap");

  let currentAnalysis = null;

  modal.querySelector("#btn-close-vision")?.addEventListener("click", () => modal.remove());

  triggerBtn?.addEventListener("click", () => fileInput?.click());

  fileInput?.addEventListener("change", async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = String(reader.result || "");
      promptUi?.classList.add("hidden");
      previewUi?.classList.remove("hidden");
      if (previewImg) previewImg.src = dataUri;
      scanAnim?.classList.remove("hidden");

      const res = await analyzeVisionPhoto(dataUri, file.type || "image/jpeg");
      scanAnim?.classList.add("hidden");

      if (res.success && res.result) {
        currentAnalysis = res.result;
        resultWrap?.classList.remove("hidden");

        const sEl = modal.querySelector("#v-render-sit");
        const pEl = modal.querySelector("#v-render-pass");
        const vEl = modal.querySelector("#v-render-versetext");
        const rEl = modal.querySelector("#v-render-ref");
        const prEl = modal.querySelector("#v-render-prayer");

        if (sEl) sEl.textContent = res.result.situation || "Situasi kehidupan yang perlu penguatan firman.";
        if (pEl) pEl.textContent = res.result.passage || "Yesaya 41:10";
        if (vEl) vEl.textContent = `“${res.result.verseText || "Janganlah takut, sebab Aku menyertai engkau."}”`;
        if (rEl) rEl.textContent = res.result.reflection || "";
        if (prEl) prEl.textContent = res.result.prayer || "";
      } else {
        alert(res.error || "Gagal menganalisis gambar. Periksa koneksi atau Google API key.");
      }
    };
    reader.readAsDataURL(file);
  });

  modal.querySelector("#btn-v-share-card")?.addEventListener("click", () => {
    if (!currentAnalysis) return;
    openVerseShareModal({
      reference: currentAnalysis.passage,
      text: currentAnalysis.verseText,
    });
  });

  modal.querySelector("#btn-v-voice-pray")?.addEventListener("click", () => {
    if (!currentAnalysis) return;
    modal.remove();
    if (callbacks.onVoicePray) {
      callbacks.onVoicePray(currentAnalysis);
    } else {
      document.dispatchEvent(new CustomEvent("rhema-nav", { detail: "voice" }));
      document.dispatchEvent(
        new CustomEvent("rhema-ask-voice", {
          detail: `Pimpin doa syafaat dan pengurapan berdasarkan foto situasi "${currentAnalysis.situation}" dan ayat Rhema ${currentAnalysis.passage}: "${currentAnalysis.verseText}". Sampaikan dengan suara penuh damai dan penghiburan Roh Kudus.`,
        })
      );
    }
  });
}
