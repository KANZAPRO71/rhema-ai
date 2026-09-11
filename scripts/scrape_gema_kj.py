import re
import urllib.request

url = "https://www.gema.sabda.org/id/daftar_lirik_kidung_jemaat"
html = urllib.request.urlopen(url, timeout=30).read().decode("utf-8", errors="replace")
# KJ 001. Title or KJ 024.a Title
pat = re.compile(r"KJ\s*(\d{1,3})([a-z])?\.\s*([^|<\n]+)", re.I)
items = []
for m in pat.finditer(html):
    no = int(m.group(1))
    variant = m.group(2) or None
    title = re.sub(r"\s+", " ", m.group(3)).strip(" .")
    if title and len(title) > 2:
        items.append((no, variant, title))
print("found", len(items))
for x in items[:20]:
    print(x)
print("...", items[-5:])
