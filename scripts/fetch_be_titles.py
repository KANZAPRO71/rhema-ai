#!/usr/bin/env python3
"""Fetch missing BE titles from sibirong.com/index?nomor=N."""

import json
import re
import html as htmlmod
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
CATALOG = SCRIPTS.parent / "www" / "data" / "hymns" / "catalog.js"
BE_TITLES = SCRIPTS / "be_titles.json"
UA = "RhemaAI-TitleFetch/1.0"


def load_catalog() -> list[dict]:
    raw = CATALOG.read_text(encoding="utf-8")
    return json.loads(raw.split("=", 1)[1].rsplit(";", 1)[0])


def fetch_title(no: int) -> tuple[int, str | None]:
    url = f"https://ende.sibirong.com/index?nomor={no}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        raw = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", errors="replace")
    except Exception:
        return no, None
    m = re.search(r"font-size: 150%[^>]*>([^<]+)", raw, re.I)
    if not m:
        return no, None
    return no, htmlmod.unescape(m.group(1).strip())


def main() -> None:
    cat = load_catalog()
    need = [c["no"] for c in cat if c["book"] == "BE" and c["title"].startswith("Ende No.")]
    titles: dict[str, str] = {}
    if BE_TITLES.exists():
        titles = json.loads(BE_TITLES.read_text(encoding="utf-8"))

    print(f"Fetching {len(need)} BE titles…")
    with ThreadPoolExecutor(max_workers=8) as pool:
        for fut in as_completed(pool.submit(fetch_title, n) for n in need):
            no, title = fut.result()
            if title:
                titles[str(no)] = title
                print(f"  BE {no}: {title}")

    BE_TITLES.write_text(json.dumps(titles, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(titles)} titles to {BE_TITLES}")


if __name__ == "__main__":
    main()
