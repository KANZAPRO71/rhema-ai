import re
import html as htmlmod
from pathlib import Path

for book, file in [
    ("PKJ", "pkj-lagupujian.html"),
    ("NKB", None),
]:
    if file:
        raw = Path(r"d:\Rhema AI\scripts") / file
        if not raw.exists():
            print(book, "missing file")
            continue
        text = raw.read_text(encoding="utf-8", errors="replace")
    else:
        continue
    # PKJ 308 – Title or PKJ 1 - Title
    pat = re.compile(rf"{book}\s*(\d{{1,3}})\s*[–—-]\s*([^<\n\"]+)", re.I)
    items = {}
    for m in pat.finditer(text):
        no = int(m.group(1))
        title = htmlmod.unescape(re.sub(r"\s+", " ", m.group(2)).strip())
        if len(title) > 2:
            items[no] = title
    nums = sorted(items)
    print(f"{book}: {len(nums)} songs, range {nums[0] if nums else '?'}–{nums[-1] if nums else '?'}")
    print(" first:", [(n, items[n]) for n in nums[:5]])
    print(" last:", [(n, items[n]) for n in nums[-5:]])
