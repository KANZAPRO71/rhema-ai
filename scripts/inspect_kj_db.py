import sqlite3
import json

db = sqlite3.connect(r"d:\Rhema AI\scripts\kidung-jemaat.db")
cur = db.cursor()

def words_from_content(content):
    try:
        data = json.loads(content)
    except Exception:
        return []
    lines = []
    for line in data:
        words = []
        for item in line:
            w = item.get("word", "")
            if w:
                words.append(w)
        if words:
            lines.append(" ".join(words))
    return lines

cur.execute("SELECT hymn_num, verse_num, style_row, content FROM jdy_hymn_verces WHERE hymn_num=1 ORDER BY verse_num, id")
print("=== hymn 1 verses ===")
for r in cur.fetchall():
    lines = words_from_content(r[3])
    print(f"verse {r[1]} style {r[2]}:", " | ".join(lines))

cur.execute("SELECT DISTINCT style_row FROM jdy_hymn_verces ORDER BY style_row")
print("style rows:", [r[0] for r in cur.fetchall()])

# variants
cur.execute("SELECT hymn_number, hymn_variant, title FROM jdy_hymn WHERE hymn_variant IS NOT NULL LIMIT 10")
print("variants:", cur.fetchall())
