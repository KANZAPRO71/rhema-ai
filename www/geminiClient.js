/**
 * Gemini API client-side — BYOK langsung dari device.
 */
import {
  GEMINI_IMAGE_MODEL,
  GEMINI_MODEL,
  GEMINI_REST_MODEL,
  GEMINI_BROWSER_CHAT_MODEL,
  geminiChatModelCandidates,
  geminiGenerateContentUrl,
  geminiImageGenerateContentUrl,
  geminiModelResource,
  geminiRestHeaders,
  getStoredGoogleKey,
  noteGeminiModelSuccess,
} from "./geminiConstants.js";
import { buildSessionConfigResponse } from "./voiceProfiles.js";
import { RHEMA_ADDRESS_RULE, RHEMA_CREATOR_META } from "./rhemaAddressRule.js";
import { getAlkitabChatSystemBase } from "./localeProfile.js";

function buildAlkitabChatSystem() {
  return [getAlkitabChatSystemBase(), RHEMA_CREATOR_META, RHEMA_ADDRESS_RULE].join(" ");
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("cancelled"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("cancelled"));
    }, { once: true });
  });
}

function isRetryable(status, body) {
  if ([404, 429, 502, 503, 504].includes(status)) return true;
  try {
    const p = JSON.parse(body);
    const code = p.error?.status ?? "";
    return ["NOT_FOUND", "UNAVAILABLE", "RESOURCE_EXHAUSTED"].includes(code);
  } catch {
    return false;
  }
}

async function streamOnce({ apiKey, model, prompt, context, images, signal, onDelta, systemInstruction }) {
  const modelId = model.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse`;
  const userText = [context, prompt].filter(Boolean).join("\n\n");
  const parts = [{ text: userText }];
  for (const img of images ?? []) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: geminiRestHeaders(apiKey),
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction || buildAlkitabChatSystem() }] },
      contents: [{ role: "user", parts }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
    err.status = res.status;
    err.retryable = isRetryable(res.status, errText);
    throw err;
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Gemini: respons kosong");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (chunk) {
          fullText += chunk;
          onDelta?.(chunk);
        }
      } catch {
        /* skip */
      }
    }
  }
  return { text: fullText };
}

export async function streamGeminiChat(options) {
  const candidates = geminiChatModelCandidates(options.model);
  let lastError;
  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    if (i > 0) {
      options.onModelFallback?.(candidates[i - 1], model);
      await sleep(120, options.signal);
    }
    try {
      const result = await streamOnce({ ...options, model });
      noteGeminiModelSuccess(model);
      return { ...result, model };
    } catch (err) {
      if (options.signal?.aborted) throw err;
      lastError = err;
      if (!err.retryable || i === candidates.length - 1) break;
    }
  }
  throw lastError ?? new Error("Gemini: model gagal merespons");
}

export async function geminiGenerateJson(prompt, options = {}) {
  const key = options.apiKey || getStoredGoogleKey();
  if (!key) throw new Error("Gemini API key belum diset. Buka ⚙ Pengaturan → Simpan.");
  const model = options.model || GEMINI_REST_MODEL;
  const url = geminiGenerateContentUrl(model);
  const res = await fetch(url, {
    method: "POST",
    headers: geminiRestHeaders(key),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: options.temperature ?? 0.7,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `Gemini ${res.status}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini: respons kosong");
  return JSON.parse(text);
}

export function buildLiveSessionConfig(params) {
  const key = getStoredGoogleKey();
  if (!key) return { error: "Gemini API key belum diset. Buka ⚙ Pengaturan → Simpan." };
  return buildSessionConfigResponse({ apiKey: key, ...params });
}

export async function generateDevotion(topic) {
  const prompt = `Anda adalah Hamba Tuhan Rhema AI. Buat renungan harian Alkitab untuk topik: "${topic}".
Gunakan ayat asli Alkitab.
Field "reflection": 2-3 paragraf tafsir hidup — bahasa Indonesia sehari-hari, mudah dicerna; jelaskan makna ayat; hubungkan ke realita kehidupan Indonesia sekarang (ekonomi, keluarga, lelah kerja, media sosial, perantau, kesehatan); sertakan sudut kerinduan hati yang menyentuh; hindari jargon teologi dan gaya khotbah monoton.
Field "practicalAction": satu langkah iman spesifik hari ini.
Field "guidedPrayer": kerangka doa penutup yang melanjutkan refleksi — jujur, spesifik, penuh pengharapan (bukan doa template generik).
Format JSON murni:
{"theme":"","passage":"","verseText":"","reflection":"","practicalAction":"","guidedPrayer":"","tags":[]}`;
  return geminiGenerateJson(prompt);
}

export async function generateSong(theme) {
  const prompt = `Anda adalah Pencipta Kidung Rhema AI. Ciptakan lagu pujian untuk tema: "${theme}".
Format JSON murni:
{"title":"","theme":"","key":"C","tempo":"","lyrics":"","chordProgression":""}`;
  return geminiGenerateJson(prompt);
}

export async function analyzeVision(imageBase64, mimeType) {
  const key = getStoredGoogleKey();
  if (!key) throw new Error("Gemini API key belum diset.");
  const url = geminiGenerateContentUrl();
  const systemInstruction = `Analisis foto secara rohani. JSON: {"situation":"","emotions":[],"passage":"","verseText":"","reflection":"","prayer":""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: geminiRestHeaders(key),
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: systemInstruction },
          { inlineData: { mimeType, data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, "") } },
        ],
      }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `Gemini ${res.status}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini: respons vision kosong");
  return JSON.parse(text);
}

function extractImagePart(data) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mime = part.inlineData.mimeType || "image/png";
      return `data:${mime};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export function normalizeImageAspectRatio(ratioKey) {
  const map = {
    story: "9:16",
    portrait: "4:5",
    square: "1:1",
  };
  if (map[ratioKey]) return map[ratioKey];
  if (["9:16", "4:5", "1:1", "16:9", "3:4", "4:3"].includes(ratioKey)) return ratioKey;
  return "9:16";
}

export async function generateImage(prompt, aspectRatio = "9:16") {
  const key = getStoredGoogleKey();
  if (!key) {
    throw new Error("Gemini API key belum diset. Buka Akun → ⚙ Pengaturan & API Key → Simpan.");
  }

  const aspect = normalizeImageAspectRatio(aspectRatio);
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) throw new Error("Prompt lukisan kosong.");

  const modelId = GEMINI_IMAGE_MODEL;
  const url = geminiImageGenerateContentUrl(modelId);
  const res = await fetch(url, {
    method: "POST",
    headers: geminiRestHeaders(key),
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: `Sacred biblical fine art oil painting (${aspect}): ${cleanPrompt}` }],
      }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: aspect },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Gemini image ${res.status}`);
  }
  const dataUri = extractImagePart(data);
  if (!dataUri) {
    throw new Error(`${modelId} tidak mengembalikan data gambar — coba lagi.`);
  }
  return { success: true, dataUri, model: modelId };
}

export { GEMINI_MODEL, GEMINI_BROWSER_CHAT_MODEL, geminiModelResource };
