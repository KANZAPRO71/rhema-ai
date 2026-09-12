/**
 * Bridge Room SQLite — ayat Alkitab offline di Android (TB, KJV, …).
 */

/** @param {string} bibleVersionId tb | kjv | rvr | jfa | krv | ja1955 | cuv */
export function roomVersionFromBibleId(bibleVersionId) {
  const map = {
    tb: "TB",
    kjv: "KJV",
    rvr: "RVR1960",
    jfa: "ARC",
    arc: "ARC",
    krv: "KRV",
    ja1955: "JA1955",
    cuv: "CUV",
  };
  return map[String(bibleVersionId || "").toLowerCase()] || "KJV";
}

function getPlugin() {
  try {
    return window.Capacitor?.Plugins?.BibleDatabase ?? null;
  } catch {
    return null;
  }
}

export function isNativeBibleDbAvailable() {
  return Boolean(getPlugin()?.getVerse);
}

/**
 * Lookup satu ayat dari Room (Android).
 * @param {{ version: string, bookCode: string, chapter: number, verse: number }} opts
 */
export async function lookupVerseFromRoom(opts) {
  const plugin = getPlugin();
  if (!plugin?.getVerse) return null;
  try {
    const res = await plugin.getVerse({
      version: opts.version,
      bookCode: opts.bookCode,
      chapter: opts.chapter,
      verse: opts.verse,
    });
    if (res?.found && res.text) {
      return {
        found: true,
        text: res.text,
        reference: `${opts.bookCode} ${opts.chapter}:${opts.verse}`,
        version: opts.version,
        source: "room-sqlite",
      };
    }
  } catch {
    /* fallback JSON fetch */
  }
  return null;
}

/** @param {string} region worship region id */
export async function resolveRoomVersionForRegion(region) {
  const plugin = getPlugin();
  if (!plugin?.resolveVersionForRegion) return roomVersionFromBibleId("kjv");
  try {
    const res = await plugin.resolveVersionForRegion({ region });
    return res?.version || "KJV";
  } catch {
    return roomVersionFromBibleId("kjv");
  }
}

/** Trigger impor TB/KJV ke SQLite (background). */
export async function ensureNativeBibleImported() {
  const plugin = getPlugin();
  if (!plugin?.ensureImported) return;
  try {
    await plugin.ensureImported();
  } catch {
    /* ignore */
  }
}
