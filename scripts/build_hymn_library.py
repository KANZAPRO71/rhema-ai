#!/usr/bin/env python3
"""Build full hymn catalog + per-song JSON shards for Rhema AI."""

from __future__ import annotations

import argparse
import html as htmlmod
import json
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

_be_title_lock = threading.Lock()

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
WWW = ROOT / "www"
OUT_DIR = WWW / "data" / "hymns"
SONGS_DIR = OUT_DIR / "songs"
CACHE_DIR = SCRIPTS / "lyric_cache"

MOBI = SCRIPTS / "mobi_catalogs.json"
BE_DELO = SCRIPTS / "be-delo.html"
BE_TITLES = SCRIPTS / "be_titles.json"
KJ_DB = SCRIPTS / "kidung-jemaat.db"
ENRICHED = SCRIPTS / "enriched_hymns.json"
BE_MAX = 864

DEFAULT_KEYS = ["C", "G", "D", "F", "Bb", "A", "E", "Am", "Em", "B", "Ab", "Eb"]
DEFAULT_PROG = {
    "KJ": ["C", "G", "Am", "F", "C", "G", "F", "C"],
    "PKJ": ["G", "D", "Em", "C", "G", "D", "C", "G"],
    "NKB": ["F", "C", "Dm", "Bb", "F", "C", "Bb", "F"],
    "BE": ["G", "C", "D", "G", "Em", "C", "D", "G"],
    "POP": ["G", "D", "Em", "C", "G", "D", "C", "G"],
}

USER_AGENT = "RhemaAI-HymnBuilder/1.0 (+local build script)"


def fetch_url(url: str, timeout: int = 30) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def clean_html_text(raw: str) -> str:
    t = re.sub(r"<br\s*/?>", "\n", raw, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = htmlmod.unescape(t)
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def normalize_verse_structure(text: str) -> str:
    """Gabung baris lirik per bait; pisah bait dengan baris kosong."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    raw_lines: list[str | None] = []
    for line in text.split("\n"):
        s = line.strip()
        if not s:
            raw_lines.append(None)
            continue
        if re.match(r"^(kj|pkj|nkb)\s+\d+\s*[-–—]", s, re.I):
            continue
        if re.fullmatch(r"\d+\.\s*", s):
            raw_lines.append(None)
            continue
        s = re.sub(r"^\d+\.\s*", "", s)
        raw_lines.append(s)

    verses: list[str] = []
    buf: list[str] = []
    for item in raw_lines:
        if item is None:
            if buf:
                verses.append("\n".join(buf))
                buf = []
        else:
            buf.append(item)
    if buf:
        verses.append("\n".join(buf))

    if len(verses) <= 1 and raw_lines and all(x is not None for x in raw_lines if x is not None):
        # Satu blok tanpa pemisah — pertahankan baris tunggal
        single = [x for x in raw_lines if x]
        if single:
            verses = ["\n".join(single)]

    return "\n\n".join(v for v in verses if v.strip())


def sanitize_lyrics(text: str, book: str = "", no: int = 0) -> str:
    if not text:
        return ""
    lines: list[str | None] = []
    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        s = line.strip()
        if not s:
            lines.append(None)
            continue
        low = s.lower()
        if low.startswith("copyright"):
            break
        if "yayasan lembaga sabda" in low or ("ylsa" in low and "@" in s):
            break
        if "bank bca" in low or "sabda.org" in low:
            break
        if re.match(r"^(kj|pkj|nkb)\s+\d+\s*[-–—]", s, re.I):
            continue
        if re.fullmatch(r"\d+\.\s*", s):
            lines.append(None)
            continue
        s = re.sub(r"^\d+\.\s*", "", s)
        lines.append(s)

    flat: list[str] = []
    for item in lines:
        if item is None:
            flat.append("")
        else:
            flat.append(item)
    out = normalize_verse_structure("\n".join(flat))
    if book == "BE" and no in (842, 843) and not out:
        return "Amen\nAmen"
    return out


def parse_mobi_lyrics(html: str) -> str | None:
    parts = re.findall(r"<p[^>]*>(.*?)</p>", html, re.S | re.I)
    verses: list[str] = []
    for p in parts:
        if "paragraphtitle" in p.lower():
            continue
        t = clean_html_text(p)
        if not t or len(t) < 4:
            continue
        low = t.lower()
        if "play" in low and "midi" in low:
            continue
        if "share facebook" in low:
            continue
        if low.startswith("copyright"):
            break
        verses.append(t)
    if not verses:
        return None
    return sanitize_lyrics("\n\n".join(verses))


def fix_mobi_cache_text(text: str) -> str:
    """Perbaiki cache lama yang punya baris kosong di antara baris lirik."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    chunks = re.split(r"\n(?=\d+\.\s*\n)", text)
    stanzas: list[str] = []
    for chunk in chunks:
        lines: list[str] = []
        for line in chunk.split("\n"):
            s = line.strip()
            if not s:
                continue
            if re.match(r"^(kj|pkj|nkb)\s+\d+", s, re.I):
                continue
            if re.fullmatch(r"\d+\.", s):
                continue
            s = re.sub(r"^\d+\.\s*", "", s)
            lines.append(s)
        if lines:
            stanzas.append("\n".join(lines))
    return "\n\n".join(stanzas)


def read_mobi_lyrics(slug: str, no: int, fetch: bool) -> str | None:
    cache = CACHE_DIR / f"mobi-{slug}-{no}.txt"
    if cache.exists():
        text = cache.read_text(encoding="utf-8")
        if text.strip():
            book = slug.upper()
            return sanitize_lyrics(fix_mobi_cache_text(text), book, no)
    if not fetch:
        return None
    html = fetch_url(f"https://alkitab.mobi/kidung/{slug}/{no}/")
    if not html:
        return None
    lyrics = parse_mobi_lyrics(html)
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(lyrics or "", encoding="utf-8")
    time.sleep(0.12)
    return lyrics


def parse_be_index(html: str) -> tuple[str | None, str | None]:
    title = None
    m = re.search(r"font-size: 150%[^>]*>([^<]+)", html, re.I)
    if m:
        title = htmlmod.unescape(m.group(1).strip())

    blocks = re.findall(
        r"<div class='ayat' data-id='\d+'[^>]*>\s*"
        r"<div[^>]*>\d+\.</div>\s*"
        r"<div style='overflow: hidden;'>(.*?)</div>",
        html,
        re.S | re.I,
    )
    if not blocks:
        blocks = re.findall(r"<p class='largefont'>(.*?)</p>", html, re.S | re.I)
    verses = [clean_html_text(b) for b in blocks if clean_html_text(b)]
    verses = [v for v in verses if len(v) >= 3]
    lyrics = sanitize_lyrics("\n\n".join(verses), "BE") if verses else None
    return title, lyrics


def fix_be_cache_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    stanzas = [s.strip() for s in re.split(r"\n\s*\n", text) if s.strip()]
    if len(stanzas) > 4 and all("\n" not in s for s in stanzas):
        lines = stanzas
        grouped: list[str] = []
        i = 0
        while i < len(lines):
            chunk = lines[i : i + 6]
            grouped.append("\n".join(chunk))
            i += 6
        return "\n\n".join(grouped)
    return normalize_verse_structure(text)


def load_be_title_map() -> dict[int, str]:
    titles: dict[int, str] = {}
    if BE_DELO.exists():
        raw = BE_DELO.read_text(encoding="utf-8", errors="replace")
        pat = re.compile(r"search\?logu=(\d+)'[^>]*>([^<]+)")
        for m in pat.finditer(raw):
            titles[int(m.group(1))] = htmlmod.unescape(m.group(2).strip())
    if BE_TITLES.exists():
        extra = json.loads(BE_TITLES.read_text(encoding="utf-8"))
        for k, v in extra.items():
            titles[int(k)] = v
    return titles


def save_be_title(no: int, title: str) -> None:
    if not title or title.startswith("Ende No."):
        return
    with _be_title_lock:
        data: dict[str, str] = {}
        if BE_TITLES.exists():
            data = json.loads(BE_TITLES.read_text(encoding="utf-8"))
        data[str(no)] = title
        BE_TITLES.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def read_be_lyrics(no: int, fetch: bool) -> tuple[str | None, str | None]:
    """Return (lyrics, title_override)."""
    cache = CACHE_DIR / f"be-{no}.txt"
    if cache.exists():
        text = cache.read_text(encoding="utf-8")
        if text.strip():
            return sanitize_lyrics(fix_be_cache_text(text), "BE", no), None
    if not fetch:
        return None, None
    html = fetch_url(f"https://ende.sibirong.com/index?nomor={no}")
    if not html:
        return None, None
    title, lyrics = parse_be_index(html)
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(lyrics or "", encoding="utf-8")
    if title:
        save_be_title(no, title)
    time.sleep(0.12)
    return lyrics, title


def words_from_content(content: str) -> list[str]:
    try:
        data = json.loads(content)
    except Exception:
        return []
    lines: list[str] = []
    for line in data:
        words = [item.get("word", "") for item in line if item.get("word")]
        if words:
            lines.append(" ".join(words))
    return lines


def fetch_kj_db_lyrics(no: int) -> str | None:
    if not KJ_DB.exists():
        return None
    db = sqlite3.connect(KJ_DB)
    cur = db.cursor()
    cur.execute(
        "SELECT verse_num, style_row, content FROM jdy_hymn_verces WHERE hymn_num=? ORDER BY verse_num, id",
        (no,),
    )
    rows = cur.fetchall()
    db.close()
    if not rows:
        return None
    verses: list[str] = []
    for _vn, _style, content in rows:
        lines = words_from_content(content)
        if lines:
            verses.append("\n".join(lines))
    return sanitize_lyrics("\n\n".join(verses), "KJ", no) if verses else None


def parse_be_catalog() -> list[dict]:
    titles = load_be_title_map()
    return [
        {"no": no, "title": titles.get(no) or f"Ende No. {no}"}
        for no in range(1, BE_MAX + 1)
    ]


def default_key(book: str, no: int) -> str:
    return DEFAULT_KEYS[(no + len(book)) % len(DEFAULT_KEYS)]


def default_chord(key: str) -> str:
    if key.endswith("m"):
        return f"{key} · G · C · D · Em · Am · D7 · {key[:-1] or key}"
    return f"{key} · G · Am · F · C · G · F · {key}"


def lyrics_preview(text: str, limit: int = 96) -> str:
    one = re.sub(r"\s+", " ", (text or "").strip())
    if len(one) <= limit:
        return one
    return one[: limit - 1].rstrip() + "…"


def load_enriched() -> dict[str, dict]:
    if not ENRICHED.exists():
        return {}
    items = json.loads(ENRICHED.read_text(encoding="utf-8"))
    return {h["id"].lower(): h for h in items}


def load_existing_catalog() -> list[dict]:
    js_path = OUT_DIR / "catalog.js"
    if not js_path.exists():
        return []
    raw = js_path.read_text(encoding="utf-8")
    try:
        return json.loads(raw.split("=", 1)[1].rsplit(";", 1)[0])
    except Exception:
        return []


def build_song(
    book: str,
    no: int,
    title: str,
    enriched: dict[str, dict],
    fetch: bool,
    fetch_book: str | None = None,
) -> dict:
    effective_fetch = fetch and (fetch_book is None or fetch_book == book)
    sid = f"{book.lower()}-{no}"
    base = enriched.get(sid, {})

    lyrics = base.get("lyrics") or ""
    if not lyrics:
        if book in ("KJ", "PKJ", "NKB"):
            slug = book.lower()
            lyrics = read_mobi_lyrics(slug, no, effective_fetch) or ""
            if not lyrics and book == "KJ":
                lyrics = fetch_kj_db_lyrics(no) or ""
        elif book == "BE":
            be_lyrics, be_title = read_be_lyrics(no, effective_fetch)
            lyrics = be_lyrics or ""
            if be_title and (title.startswith("Ende No.") or not title):
                title = be_title

    key = base.get("key") or default_key(book, no)
    progression = base.get("progression") or DEFAULT_PROG.get(book, DEFAULT_PROG["KJ"])
    chord = base.get("chord") or default_chord(key)
    lyrics = sanitize_lyrics(lyrics, book, no)

    return {
        "id": sid,
        "book": book,
        "no": no,
        "title": base.get("title") or title,
        "key": key,
        "chord": chord,
        "progression": progression,
        "lyrics": lyrics,
        "enriched": bool(base),
    }


def write_catalog_js(catalog: list[dict]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    js_path = OUT_DIR / "catalog.js"
    payload = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    js_path.write_text(
        f"/** Auto-generated — do not edit by hand. Run scripts/build_hymn_library.py */\n"
        f"export const HYMN_CATALOG = {payload};\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true", help="Download missing lyrics from web")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--book", help="Only build one book (KJ, PKJ, NKB, BE, POP)")
    args = parser.parse_args()

    mobi = json.loads(MOBI.read_text(encoding="utf-8"))
    enriched = load_enriched()
    SONGS_DIR.mkdir(parents=True, exist_ok=True)

    tasks: list[tuple[str, int, str]] = []

    for item in mobi["KJ"]["items"]:
        tasks.append(("KJ", item["no"], item["title"]))
    for item in mobi["PKJ"]["items"]:
        tasks.append(("PKJ", item["no"], item["title"]))
    for item in mobi["NKB"]["items"]:
        tasks.append(("NKB", item["no"], item["title"]))

    for item in parse_be_catalog():
        tasks.append(("BE", item["no"], item["title"]))

    for h in enriched.values():
        if h["book"] == "POP":
            tasks.append(("POP", h["no"], h["title"]))

    # de-dupe
    seen: set[tuple[str, int]] = set()
    unique_tasks: list[tuple[str, int, str]] = []
    for book, no, title in tasks:
        k = (book, no)
        if k in seen:
            continue
        seen.add(k)
        unique_tasks.append((book, no, title))

    book_filter = args.book.upper() if args.book else None
    if book_filter:
        unique_tasks = [t for t in unique_tasks if t[0] == book_filter]

    print(f"Building {len(unique_tasks)} hymns (fetch={'on' if args.fetch else 'off'})…")

    catalog: list[dict] = []
    stats = {"with_lyrics": 0, "enriched": 0}

    def work(task: tuple[str, int, str]) -> tuple[dict, dict]:
        book, no, title = task
        song = build_song(book, no, title, enriched, args.fetch, book_filter)
        return song, {
            "id": song["id"],
            "book": song["book"],
            "no": song["no"],
            "title": song["title"],
            "key": song["key"],
            "chord": song["chord"],
            "preview": lyrics_preview(song["lyrics"]),
            "hasLyrics": bool(song["lyrics"].strip()),
            "enriched": song["enriched"],
        }

    if args.fetch and args.workers > 1:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(work, t) for t in unique_tasks]
            done = 0
            for fut in as_completed(futures):
                song, entry = fut.result()
                (SONGS_DIR / f"{song['id']}.json").write_text(
                    json.dumps(
                        {
                            "id": song["id"],
                            "book": song["book"],
                            "no": song["no"],
                            "title": song["title"],
                            "key": song["key"],
                            "chord": song["chord"],
                            "progression": song["progression"],
                            "lyrics": song["lyrics"],
                        },
                        ensure_ascii=False,
                        indent=2,
                    ),
                    encoding="utf-8",
                )
                catalog.append(entry)
                if song["lyrics"].strip():
                    stats["with_lyrics"] += 1
                if song["enriched"]:
                    stats["enriched"] += 1
                done += 1
                if done % 100 == 0:
                    print(f"  …{done}/{len(unique_tasks)}")
    else:
        for i, task in enumerate(unique_tasks, 1):
            song, entry = work(task)
            (SONGS_DIR / f"{song['id']}.json").write_text(
                json.dumps(
                    {
                        "id": song["id"],
                        "book": song["book"],
                        "no": song["no"],
                        "title": song["title"],
                        "key": song["key"],
                        "chord": song["chord"],
                        "progression": song["progression"],
                        "lyrics": song["lyrics"],
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            catalog.append(entry)
            if song["lyrics"].strip():
                stats["with_lyrics"] += 1
            if song["enriched"]:
                stats["enriched"] += 1
            if i % 200 == 0:
                print(f"  …{i}/{len(unique_tasks)}")

    if book_filter:
        kept = [c for c in load_existing_catalog() if c["book"] != book_filter]
        new_ids = {c["id"] for c in catalog}
        kept = [c for c in kept if c["id"] not in new_ids]
        catalog = kept + catalog

    catalog.sort(key=lambda x: (x["book"], x["no"]))
    write_catalog_js(catalog)

    by_book: dict[str, int] = {}
    for c in catalog:
        by_book[c["book"]] = by_book.get(c["book"], 0) + 1

    print("Done.")
    print("  By book:", by_book)
    print(f"  With lyrics: {stats['with_lyrics']}/{len(catalog)}")
    print(f"  Enriched (chords): {stats['enriched']}")
    print(f"  Output: {OUT_DIR}")


if __name__ == "__main__":
    main()
