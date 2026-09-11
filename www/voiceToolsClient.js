/**
 * Eksekusi tool Gemini Live — client-side (BYOK).
 */
import {
  getBookIntro,
  getLexiconForReference,
  getStrongsEntry,
  getTafsirForRef,
  lookupPassage,
  lookupVerse,
  parseVerseReference,
  searchTb,
  verifyVerse,
} from "./alkitabClient.js";
import { loadHymn } from "./laguData.js";
import { getLiveSessionTimeSnapshot } from "./voiceSessionTime.js";

export async function executeVoiceTool(req, sessionMeta) {
  const args = req.args ?? {};
  switch (req.name) {
    case "get_session_metadata": {
      const snap = getLiveSessionTimeSnapshot();
      return {
        timezone: snap.timezone,
        locale: snap.locale,
        utcOffsetMinutes: new Date().getTimezoneOffset(),
        dateLabel: snap.dateLabel,
        timeLabel: snap.timeLabel,
        dayPart: snap.dayPart,
        localTimeNow: snap.localTimeNow,
        iso: snap.iso,
        note: "Waktu dari jam perangkat pengguna — BYOK lokal.",
      };
    }
    case "lookup_verse": {
      const reference = String(args.reference ?? "").trim();
      const result = await lookupVerse(reference);
      if (result.found) return result;
      return {
        ...result,
        message:
          "Ayat tidak ditemukan di TB offline perangkat. Jangan panggil lookup_verse berulang untuk referensi yang sama — lanjutkan dengan TB yang Anda kenal atau minta referensi lain.",
      };
    }
    case "lookup_passage":
      return lookupPassage(String(args.reference ?? ""), {
        contextRadius: args.contextRadius != null ? Number(args.contextRadius) : undefined,
      });
    case "verify_verse":
      return verifyVerse(String(args.reference ?? ""), String(args.quotedText ?? ""));
    case "lookup_book_intro": {
      const ref = await parseVerseReference(`${String(args.book ?? "")} 1:1`);
      const intro = await getBookIntro(ref?.kode ?? String(args.book ?? ""));
      return intro ?? { found: false };
    }
    case "lookup_tafsir": {
      const ref = await parseVerseReference(String(args.reference ?? ""));
      if (!ref) return { found: false };
      const tafsir = await getTafsirForRef(ref);
      return tafsir ?? { found: false, reference: String(args.reference ?? "") };
    }
    case "lookup_lexicon": {
      const words = await getLexiconForReference(String(args.reference ?? ""));
      return words.length
        ? { found: true, reference: String(args.reference ?? ""), words }
        : { found: false, reference: String(args.reference ?? "") };
    }
    case "lookup_strongs": {
      const id = String(args.id ?? args.strongs ?? "");
      const entry = await getStrongsEntry(id);
      return entry ?? { found: false, id };
    }
    case "search_tb":
      return searchTb(String(args.query ?? args.q ?? ""), {
        limit: args.limit != null ? Number(args.limit) : undefined,
      });
    case "lookup_hymn": {
      const rawBook = String(args.book ?? "").trim().toUpperCase();
      const book = rawBook === "BE" || /ende/i.test(rawBook) ? "BE" : "KJ";
      const no = Number(args.number ?? args.no ?? 0);
      const h = await loadHymn(`${book} ${no}`);
      if (!h) return { found: false, book, number: no };
      return {
        found: true,
        id: h.id,
        book: h.book,
        number: h.no,
        title: h.title,
        lyrics: h.lyrics,
        key: h.key,
      };
    }
    default:
      return { error: `Tool tidak dikenal: ${req.name}` };
  }
}
