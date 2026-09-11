/**
 * API key ter-embed hanya untuk build internal (scripts/build-apk-prekey.ps1).
 * Play Store / BYOK: biarkan google kosong — pengguna menempel key sendiri.
 */
export const BUNDLED_PROVIDER_KEYS = {
  google: "",
};

/** @returns {string} */
export function getBundledGoogleKey() {
  return String(BUNDLED_PROVIDER_KEYS.google || "").trim();
}

/** @returns {boolean} */
export function hasBundledGoogleKey() {
  return Boolean(getBundledGoogleKey());
}

/** Seed localStorage hanya jika user belum punya key. Tidak menimpa key BYOK. */
export function applyBundledProviderKeys() {
  const key = getBundledGoogleKey();
  if (!key) return false;
  try {
    const existing = (localStorage.getItem("rhema-google-key") || "").trim();
    if (existing) return false;
    localStorage.setItem("rhema-google-key", key);
    localStorage.setItem("rhema-ai-google-key-configured", "1");
    return true;
  } catch {
    return false;
  }
}
