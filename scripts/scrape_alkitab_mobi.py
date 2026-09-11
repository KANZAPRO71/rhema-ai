import re
import json
import html as htmlmod
import urllib.request
import time
from pathlib import Path

BOOKS = [
    ("kj", "KJ", 478),
    ("pkj", "PKJ", 308),
    ("nkb", "NKB", 230),
    ("be", "BE", 864),
    ("pop", "POP", 100),  # may not exist
]

OUT = Path(r"d:\Rhema AI\scripts\mobi_catalogs.json")


def scrape_index(slug):
    url = f"https://alkitab.mobi/kidung/{slug}/"
    raw = urllib.request.urlopen(url, timeout=60).read().decode("utf-8", errors="replace")
    # PKJ 1 - Title or KJ 1 - Title
    book = slug.upper() if slug != "kj" else "KJ"
    if slug == "be":
        book = "BE"
    pat = re.compile(rf">{book}\s*(\d{{1,4}})\s*[-–—]\s*([^<]+)<", re.I)
    items = []
    for m in pat.finditer(raw):
        no = int(m.group(1))
        title = htmlmod.unescape(re.sub(r"\s+", " ", m.group(2)).strip())
        items.append({"no": no, "title": title})
    return items


def fetch_lyrics(slug, no):
    url = f"https://alkitab.mobi/kidung/{slug}/{no}/"
    try:
        raw = urllib.request.urlopen(url, timeout=30).read().decode("utf-8", errors="replace")
    except Exception:
        return None
    # lyrics often in <p> or pre tags
    parts = re.findall(r"<p[^>]*>(.*?)</p>", raw, re.S | re.I)
    lines = []
    for p in parts:
        t = re.sub(r"<[^>]+>", "", p)
        t = htmlmod.unescape(t.strip())
        if t and "alkitab.mobi" not in t.lower() and len(t) > 2:
            lines.append(t)
    if not lines:
        return None
    return "\n".join(lines[:40])


def main():
    out = {}
    for slug, book, expected in BOOKS:
        try:
            items = scrape_index(slug)
            print(f"{book}: index {len(items)} (expected {expected})")
            out[book] = {"slug": slug, "items": items}
        except Exception as e:
            print(f"{book}: index FAILED {e}")
            out[book] = {"slug": slug, "items": []}
        time.sleep(0.3)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
