import re
import json
import html as htmlmod
import urllib.request
from pathlib import Path

URL = "https://www.kidung.co/Kidung"
raw = urllib.request.urlopen(URL, timeout=45).read().decode("utf-8", errors="replace")

for book in ["KJ", "PKJ", "NKB", "BE"]:
    pat = re.compile(rf"{book}\.?\s*(\d{{1,3}})\s*[-–—]\s*([^<\n]+)", re.I)
    items = []
    seen = set()
    for m in pat.finditer(raw):
        no = int(m.group(1))
        title = htmlmod.unescape(re.sub(r"\s+", " ", m.group(2)).strip())
        key = (no, title.lower())
        if key in seen:
            continue
        seen.add(key)
        items.append({"no": no, "title": title})
    items.sort(key=lambda x: x["no"])
    print(f"{book}: {len(items)}", items[:3], "...", items[-2:])
