/**
 * Backend lokal di app — router /api/* BYOK tanpa PC server.
 */
import {
  analyzeVision,
  buildLiveSessionConfig,
  generateDevotion,
  generateImage,
  generateSong,
} from "./geminiClient.js";
import {
  getBookIntro,
  getLexiconForReference,
  getStrongsEntry,
  getTafsirForRef,
  knowledgeMeta,
  lookupPassage,
  lookupVerse,
  lookupVerseFromQuery,
  parseVerseReference,
  searchTb,
  verifyVerse,
  verseOfTheDay,
} from "./alkitabClient.js";
import { executeVoiceTool } from "./voiceToolsClient.js";
import { getStoredGoogleKey, googleKeyConfigured } from "./geminiConstants.js";
import { isBrowserByokStandalone } from "./platform.js";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readBody(init) {
  if (!init?.body) return {};
  try {
    return JSON.parse(String(init.body));
  } catch {
    return {};
  }
}

function parseApiPath(input) {
  const u = typeof input === "string" ? new URL(input, location.origin) : new URL(input.url, location.origin);
  return { pathname: u.pathname, searchParams: u.searchParams };
}

/** @param {string} input @param {RequestInit} [init] */
export async function handleLocalApi(input, init = {}) {
  try {
    return await handleLocalApiInner(input, init);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

/** @param {string} input @param {RequestInit} [init] */
async function handleLocalApiInner(input, init = {}) {
  const { pathname, searchParams } = parseApiPath(input);
  const method = (init.method || "GET").toUpperCase();

  if (pathname === "/api/session-config") {
    const cfg = buildLiveSessionConfig({
      profileId: searchParams.get("profile") ?? undefined,
      voiceName: searchParams.get("voiceName") ?? undefined,
      personaId: searchParams.get("personaId") ?? undefined,
      mobileLean: isStandaloneApp(),
    });
    if (cfg.error) return jsonResponse(cfg, 401);
    return jsonResponse(cfg);
  }

  if (pathname === "/api/voice/tool" && method === "POST") {
    const body = await readBody(init);
    const result = await executeVoiceTool(body);
    return jsonResponse(result);
  }

  if (pathname === "/api/alkitab/today") {
    return jsonResponse(await verseOfTheDay());
  }

  if (pathname === "/api/alkitab/verse") {
    const ref = searchParams.get("ref") ?? searchParams.get("q") ?? "";
    const result = (await lookupVerseFromQuery(ref)) ?? (await lookupVerse(ref));
    return jsonResponse(result, result.found ? 200 : 404);
  }

  if (pathname === "/api/alkitab/passage") {
    const ref = searchParams.get("ref") ?? searchParams.get("q") ?? "";
    const radius = searchParams.get("contextRadius");
    return jsonResponse(
      await lookupPassage(ref, {
        contextRadius: radius != null ? Number(radius) : undefined,
      }),
    );
  }

  if (pathname === "/api/alkitab/verify" && method === "POST") {
    const body = await readBody(init);
    return jsonResponse(await verifyVerse(String(body.reference ?? ""), String(body.quotedText ?? "")));
  }

  if (pathname === "/api/alkitab/book-intro") {
    const book = searchParams.get("book") ?? searchParams.get("q") ?? "";
    const ref = await parseVerseReference(`${book} 1:1`);
    const intro = await getBookIntro(ref?.kode ?? book);
    return jsonResponse(intro ?? { found: false }, intro ? 200 : 404);
  }

  if (pathname === "/api/alkitab/tafsir") {
    const ref = searchParams.get("ref") ?? searchParams.get("q") ?? "";
    const parsed = await parseVerseReference(ref);
    const tafsir = parsed ? await getTafsirForRef(parsed) : null;
    return jsonResponse(tafsir ?? { found: false }, tafsir ? 200 : 404);
  }

  if (pathname === "/api/alkitab/lexicon") {
    const ref = searchParams.get("ref") ?? searchParams.get("q") ?? "";
    const words = await getLexiconForReference(ref);
    return jsonResponse(
      words.length ? { found: true, reference: ref, words } : { found: false, reference: ref },
      words.length ? 200 : 404,
    );
  }

  if (pathname === "/api/alkitab/strongs") {
    const id = searchParams.get("id") ?? searchParams.get("q") ?? "";
    const entry = await getStrongsEntry(id);
    return jsonResponse(entry ?? { found: false, id }, entry ? 200 : 404);
  }

  if (pathname === "/api/alkitab/search") {
    const q = searchParams.get("q") ?? searchParams.get("query") ?? "";
    const limit = searchParams.get("limit");
    return jsonResponse(
      await searchTb(q, { limit: limit != null ? Number(limit) : undefined }),
    );
  }

  if (pathname === "/api/rhema/knowledge") {
    return jsonResponse(await knowledgeMeta());
  }

  if (pathname === "/api/gemini/generate-devotion" && method === "POST") {
    const body = await readBody(init);
    try {
      const result = await generateDevotion(String(body.topic || "Kekuatan Tuhan hari ini"));
      return jsonResponse({ success: true, result });
    } catch (err) {
      return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  if (pathname === "/api/gemini/generate-song" && method === "POST") {
    const body = await readBody(init);
    try {
      const result = await generateSong(String(body.theme || "Penyembahan"));
      return jsonResponse({ success: true, result });
    } catch (err) {
      return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  if (pathname === "/api/gemini/analyze-vision" && method === "POST") {
    const body = await readBody(init);
    try {
      const result = await analyzeVision(String(body.imageBase64 ?? ""), String(body.mimeType ?? "image/jpeg"));
      return jsonResponse({ success: true, result });
    } catch (err) {
      return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  if (pathname === "/api/gemini/generate-image" && method === "POST") {
    const body = await readBody(init);
    try {
      const data = await generateImage(String(body.prompt ?? ""), String(body.aspectRatio ?? "9:16"));
      return jsonResponse(data);
    } catch (err) {
      return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  if (pathname === "/api/cloud-agents") {
    return jsonResponse({ agents: [], message: "Cloud agent hanya tersedia di VS Code extension." });
  }

  return jsonResponse({ error: "Not found" }, 404);
}

function isLocalApiUrl(input) {
  try {
    const u = typeof input === "string" ? new URL(input, location.origin) : new URL(input.url, location.origin);
    return u.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

/** Patch fetch agar /api/* dilayani lokal di app native. */
export function installAppBackend() {
  if (window.__rhemaAppBackendInstalled) return;
  window.__rhemaAppBackendInstalled = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    if (isLocalApiUrl(input)) {
      return handleLocalApi(input, init);
    }
    return nativeFetch(input, init);
  };
}

export function isStandaloneApp() {
  try {
    if (isBrowserByokStandalone()) return false;
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function providerKeyStatus() {
  const google = googleKeyConfigured();
  return { google, cursor: false, openai: false, anthropic: false, deepseek: false };
}

export { getStoredGoogleKey };
