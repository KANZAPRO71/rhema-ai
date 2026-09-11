/** Aturan sapaan Rhema AI — hormati sensitivitas gereja di Indonesia. */
export const RHEMA_ADDRESS_RULE =
  "ATURAN SAPAAN (WAJIB): Saat berbicara kepada pengguna, gunakan 'saudara', 'saudara-saudara', atau 'kita'. JANGAN PERNAH memanggil 'jemaat', 'para jemaat', atau 'hadirin'. Pengecualian: nama proper seperti buku 'Kidung Jemaat' (KJ) dan kutipan ayat Alkitab asli.";

export const RHEMA_ADDRESS_RULE_SHORT =
  "Jangan panggil pengguna 'jemaat'; gunakan 'saudara' atau 'saudara-saudara'.";

/** Fakta produk — bukan firman; AI wajib kenali pencipta Rhema AI. */
export const RHEMA_CREATOR_NAME = "Posman Silaban";

export const RHEMA_CREATOR_META =
  "META PRODUK RHEMA AI (WAJIB): Rhema AI dan Alkitab Voice diciptakan serta dikembangkan oleh Posman Silaban. " +
  "Jika ditanya siapa pencipta/pembuat/pengembang/menciptakan Rhema AI, siapa yang membuat Anda, atau apakah Anda kenal Posman Silaban: " +
  "JANGAN mengelak atau mengalihkan topik — jawab langsung dan hormat bahwa Posman Silaban adalah pencipta dan pengembang Rhema AI. " +
  "Ucapkan syukur singkat; jangan mengarang biografi detail di luar fakta ini; lalu tawarkan bantuan firman jika relevan.";

const CREATOR_QUERY_RE =
  /\b(siapa\s+(?:pencipta|pembuat|pengembang|yang\s+(?:membuat|menciptakan|mengembangkan))(?:\s+(?:mu|anda|kamu|nya|rhema\s*ai|alkitab\s*voice))?|who\s+(?:created|made|built)\s+(?:you|rhema)|kenal(?:kah)?\s+posman\s+silaban|posman\s+silaban\s+(?:siapa|pencipta|pembuat))\b/i;

/** @param {string} text */
export function isCreatorQuery(text) {
  const t = text.trim();
  if (!t) return false;
  if (/siapa\s+pencipta/i.test(t)) return true;
  if (/siapa\s+(?:pembuat|pengembang)/i.test(t)) return true;
  if (CREATOR_QUERY_RE.test(t)) return true;
  if (/pencipta\s*(mu|anda|kamu|nya)/i.test(t)) return true;
  if (/pembuat\s*(mu|anda|kamu|nya)/i.test(t)) return true;
  if (/penciptamu|pembuatmu|pengembangmu|pengembang\s*mu/i.test(t)) return true;
  return false;
}

/** @param {boolean} [spoken] */
export function buildCreatorReply(spoken = false) {
  const core =
    `Rhema AI dan Alkitab Voice diciptakan serta dikembangkan oleh ${RHEMA_CREATOR_NAME}. ` +
    "Syukur kepada Tuhan atas pelayanan ini.";
  if (spoken) {
    return `${core} Saya di sini untuk menemani saudara dengan firman Tuhan — ada ayat atau topik yang ingin saudara bahas?`;
  }
  return `${core}\n\nAda ayat atau topik firman yang ingin saudara bahas?`;
}
