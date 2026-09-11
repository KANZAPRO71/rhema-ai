/**
 * Penyimpanan key BYOK terenkripsi di Android (EncryptedSharedPreferences via plugin native).
 * Di web/desktop: fallback localStorage biasa (ditangani geminiConstants).
 */

/** @returns {boolean} */
export function isSecureKeyStorageAvailable() {
  try {
    return Boolean(
      window.Capacitor?.isNativePlatform?.() &&
        window.Capacitor?.Plugins?.SecureKey?.setItem,
    );
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 * @returns {Promise<string>}
 */
export async function secureGetItem(key) {
  const plugin = window.Capacitor?.Plugins?.SecureKey;
  if (!plugin?.getItem) return "";
  try {
    const res = await plugin.getItem({ key });
    return String(res?.value || "").trim();
  } catch {
    return "";
  }
}

/**
 * @param {string} key
 * @param {string} value
 */
export async function secureSetItem(key, value) {
  const plugin = window.Capacitor?.Plugins?.SecureKey;
  if (!plugin?.setItem) return;
  await plugin.setItem({ key, value: String(value || "") });
}

/** @param {string} key */
export async function secureRemoveItem(key) {
  const plugin = window.Capacitor?.Plugins?.SecureKey;
  if (!plugin?.removeItem) return;
  await plugin.removeItem({ key });
}

/** Migrasi key legacy localStorage → EncryptedSharedPreferences (Android). */
export async function migrateLegacyKeyToSecure(storageKey) {
  if (!isSecureKeyStorageAvailable()) return "";
  const existing = await secureGetItem(storageKey);
  if (existing) return existing;
  let legacy = "";
  try {
    legacy = (localStorage.getItem(storageKey) || "").trim();
  } catch {
    /* ignore */
  }
  if (!legacy) return "";
  await secureSetItem(storageKey, legacy);
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
  return legacy;
}
