import re
import json
import html as htmlmod
import urllib.request
from pathlib import Path

BOOKS = [
    ("KJ", "daftar_lirik_kidung_jemaat", 478),
    ("PKJ", "daftar_lirik_pelengkap_kidung_jemaat", 308),
    ("NKB", "daftar_lirik_nyanyikanlah_kidung_baru", 230),
]

OUT = Path(r"d:\Rhema AI\scripts\gema_catalogs.json")


def scrape(book, path):
    url = f"https://www.gema.sabda.org/id/{path}"
    raw = urllib.request.urlopen(url, timeout=45).read().decode("utf-8", errors="replace")
    pat = re.compile(rf"{book}\s*(\d{{1,3}})([a-z])?\.\s*([^|<\n]+)", re.I)
    items = []
    for m in pat.finditer(raw):
        no = int(m.group(1))
        variant = m.group(2) or None
        title = htmlmod.unescape(re.sub(r"\s+", " ", m.group(3)).strip(" ."))
        if len(title) < 2:
            continue
        items.append({"no": no, "variant": variant, "title": title})
    return items


def main():
    out = {}
    for book, path, expected in BOOKS:
        try:
            items = scrape(book, path)
            print(f"{book}: scraped {len(items)} (expected ~{expected})")
            out[book] = items
        except Exception as e:
            print(f"{book}: FAILED {e}")
            out[book] = []
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
