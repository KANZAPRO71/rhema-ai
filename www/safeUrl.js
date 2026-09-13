/**
 * Allowlist URL untuk tautan markdown, openExternal, dan tel: krisis.
 */

/** @param {string} raw */
export function sanitizeHref(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    const proto = u.protocol.toLowerCase();
    if (proto === "https:") return u.href;
    if (proto === "mailto:") return s;
    if (proto === "tel:" && /^tel:[0-9+#*\-().\s]+$/i.test(s)) return s;
  } catch {
    /* ignore */
  }
  return "";
}

/** @param {string} raw */
export function isAllowedExternalUrl(raw) {
  const href = sanitizeHref(raw);
  return href.startsWith("https:");
}

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** @param {string} [mime] */
export function sanitizeImageMime(mime) {
  const t = String(mime || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  return ALLOWED_IMAGE_MIME.has(t) ? (t === "image/jpg" ? "image/jpeg" : t) : "";
}

/**
 * @param {{ mimeType?: string, data?: string }} img
 * @returns {string}
 */
export function sanitizeImageSrc(img) {
  const mime = sanitizeImageMime(img?.mimeType);
  const data = String(img?.data || "").replace(/[^A-Za-z0-9+/=]/g, "");
  if (!mime || !data) return "";
  return `data:${mime};base64,${data}`;
}
