/**
 * Post-process teks jawaban live — buang penutup gaya interviewer yang masih lolos model.
 * @param {string} text
 * @returns {string}
 */

/** @param {string} sentence */
function isInterviewerClosingSentence(sentence) {
  const s = String(sentence || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s || !s.endsWith("?")) return false;
  const markers = [
    "ingin saudara",
    "mau saudara",
    "bagaimana menurut saudara",
    "menurut saudara",
    "kita mulai dengan",
    "kita mulai",
    "kita dalami",
    "kita bahas",
    "kita fokuskan",
    "ada topik khusus",
    "ada satu topik",
    "ada hal lain",
    "topik khusus yang ingin",
    "kita diskusikan",
    "mau kita diskusikan",
    "ingin kita bahas",
    "mau mulai dari",
    "mau mulai dengan",
    "apakah bapak",
    "apakah ibu",
    "gimana menurut",
    "bagaimana?",
    "ada gambaran spesifik",
    "gambaran spesifik",
    "bagaimana kita bisa membantu",
    "bagaimana kita bisa",
    "gimana kita bisa",
    "mau kita bantu",
    "ingin saudara jelaskan",
    "usulan saya",
    "kita mulai dari topik",
    "mulai dari topik tentang",
    "langkah praktis apa yang bisa kita tawarkan",
    "ada ide lain",
    "topik spesifik yang ingin",
    "ingin kita bahas dulu",
    "ada bagian spesifik",
    "saudara pikirkan tentang",
    "perlu kita tambahkan",
    "ada di pikiran saudara",
    "nama penulis atau topik",
    "apakah ada satu contoh",
    "contoh kasus atau situasi",
    "memerlukan analogi",
    "menurut saudara memerlukan",
    "adakah satu hal",
    "perlu kita tingkatkan",
    "menurut saudara perlu",
    "satu hal yang menurut saudara",
    "hal pertama yang ingin saudara",
    "tentang karakter atau kebutuhan",
    "ingin dipastikan teringat",
    "pengalaman saudara yang ingin",
    "bagian spesifik dari percakapan",
  ];
  return markers.some((m) => s.includes(m));
}

/** Kalimat delegasi tanpa tanda tanya — tetap gaya interviewer. */
function isInterviewerDelegationSentence(sentence) {
  const s = String(sentence || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s) return false;
  const markers = [
    "usulan saya, kita mulai",
    "kita fokuskan perhatian kita",
    "memikirkan langkah praktis apa yang bisa kita tawarkan",
    "kita mulai dari topik tentang",
    "mari kita prioritaskan",
    "kita prioritaskan mereka",
    "kita bisa mengusahakan keseimbangan",
    "obrolan kita selanjutnya",
  ];
  return markers.some((m) => s.includes(m));
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeAssistantLiveText(text) {
  let out = String(text || "").trim();
  if (!out) return out;

  const stripPatterns = [
    /\s*Ada\s+(satu\s+)?topik khusus yang ingin saudara[^.?!]*[?]\s*$/i,
    /\s*Ada topik khusus yang ingin saudara[^.?!]*[?]\s*$/i,
    /\s*Nah,?\s*kita mulai dengan[^.?!]*[?]\s*$/i,
    /\s*Nah,?\s*kita[^.?!]*[?]\s*$/i,
    /\s*Apakah (Bapak|Ibu|saudara)[^.?!]*[?]\s*$/i,
    /\s*Bagaimana menurut saudara[^.?!]*[?]\s*$/i,
    /\s*Ada ide mau mulai dari[^.?!]*[?]\s*$/i,
    /\s*Kita fokuskan[^.?!]*[?]\s*$/i,
    /\s*Mau (kita )?mulai (dari|dengan)[^.?!]*[?]\s*$/i,
    /\s*Bagaimana\?\s*$/i,
    /\s*Gimana\?\s*$/i,
    /\s*Ada hal lain yang ingin saudara[^.?!]*[?]\s*$/i,
    /\s*Ada (sesuatu|hal) (yang )?ingin saudara[^.?!]*[?]\s*$/i,
    /\s*Ada gambaran spesifik[^.?!]*[?]\s*$/i,
    /\s*Bagaimana kita (bisa )?(membantu|menyikapi|mendekati)[^.?!]*[?]\s*$/i,
    /\s*Gimana kita (bisa )?(membantu|menyikapi|mendekati)[^.?!]*[?]\s*$/i,
    /\s*Usulan saya,?\s*kita mulai dari topik[^.?!]*[?]\s*(Bagaimana\?\s*)?$/i,
    /\s*Kita fokuskan perhatian kita[^.?!]*[.?!]\s*(Usulan saya[^.?!]*[?]\s*)?(Bagaimana\?\s*)?$/i,
    /\s*Ada ide lain[^.?!]*[?]\s*$/i,
    /\s*Apa ada bagian spesifik[^.?!]*[?]\s*$/i,
    /\s*Ada hal lain yang saudara pikirkan[^.?!]*[?]\s*$/i,
    /\s*Mari kita prioritaskan[^.?!]*[.?!]\s*(Itu bisa[^.?!]*[.?!]\s*)?(Ada ide[^.?!]*[?]\s*)?$/i,
    /\s*Apa ada nama penulis[^.?!]*[?]\s*$/i,
    /\s*Apakah ada (satu )?contoh kasus[^.?!]*[?]\s*$/i,
    /\s*Adakah satu hal[^.?!]*[?]\s*$/i,
    /\s*Apa ada hal pertama[^.?!]*[?]\s*$/i,
  ];

  for (const re of stripPatterns) {
    out = out.replace(re, "").trim();
  }

  const parts = out
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .filter((p) => !isInterviewerClosingSentence(p) && !isInterviewerDelegationSentence(p));
  out = parts.join(" ").trim();

  if (parts.length === 0 && isInterviewerClosingSentence(text)) {
    return "";
  }

  return out;
}

/**
 * Ucapan user terdengar terpotong — tunggu fragment lanjutan sebelum commit.
 * @param {string} text
 */
export function userUtteranceLooksIncomplete(text) {
  const norm = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!norm) return false;
  if (/selain\s+(gen\s*z|genji|gen z)\s*$/.test(norm)) return true;
  if (/^(bagaimana|gimana)\s+selain\b/.test(norm) && norm.split(/\s+/).length <= 6) return true;
  if (/^(dan|atau|sama|juga|tapi|tetapi|tekananmu|tekanannya)\s*$/.test(norm)) return true;
  if (/\bbukan hanya\b/.test(norm) && !/\b(tapi|melainkan|juga|melain|lebih)\b/.test(norm)) return true;
  if (/^(namun|tapi|tetapi|dan)\b/.test(norm) && norm.split(/\s+/).length <= 8) return true;
  if (/\bsaya harus jujur\b/.test(norm) && !/\bjujur\s+(ke|sama|pada|dengan)\s+\w+/i.test(norm)) return true;
  if (/\bjujur\s+sama\s*$/.test(norm)) return true;
  return false;
}

/** Respons assistant terpotong — jangan jadi bubble terpisah. */
export function isAssistantAckFragment(text) {
  const t = String(text || "").trim();
  if (!t || t.length >= 160) return false;
  if (/[?]$/.test(t)) return false;
  if (t.length < 52 && /^(betul|setuju|iya|ya|paham|benar|tentu|saya sangat setuju|saya mengerti)/i.test(t)) {
    return true;
  }
  if (t.length < 110 && !/[.!?]$/.test(t)) return true;
  if (
    t.length < 110 &&
    /\b(tantangan|menghadapi|persoalan|kompleks|unik|generasi muda|berbagai)\s*$/i.test(t)
  ) {
    return true;
  }
  return false;
}
