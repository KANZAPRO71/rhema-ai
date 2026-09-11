import re
import html as htmlmod
from pathlib import Path

raw = Path(r"d:\Rhema AI\scripts\be-delo.html").read_text(encoding="utf-8", errors="replace")
pat = re.compile(r"search\?logu=(\d+)'[^>]*>([^<]+)")
items = [(int(m.group(1)), htmlmod.unescape(m.group(2).strip())) for m in pat.finditer(raw)]
print("BE count", len(items), "range", items[0][0] if items else 0, items[-1][0] if items else 0)
print("sample", items[:5])
