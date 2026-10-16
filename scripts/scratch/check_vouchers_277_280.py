import json

with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\catalog_892_full_index.json", "r", encoding="utf-8") as f:
    items = json.load(f)["items"]

lines = []
lines.append("=== 1. ALL ELECTRICAL ITEMS (100101..100319) ===")
for it in items:
    if it["dept"] == "أدوات كهربائية":
        lines.append(f"[{it['code']}] Row {it['row']}: {it['name']} | {it['unit']} | Bal: {it['bal']}")

lines.append("\n=== 2. CASTLE & POLY PIPES/FITTINGS (101101..101206) ===")
for it in items:
    if 101101 <= int(it["code"]) <= 101206:
        lines.append(f"[{it['code']}] Row {it['row']}: {it['name']} | {it['unit']} | Bal: {it['bal']}")

lines.append("\n=== 3. CONSUMABLES (116101..116156) & TOOLS (115101..115135) & GENERAL (107101..107140) ===")
for it in items:
    if it["dept"] in ("قسم المستهلكات", "عدد و معدات", "أدوات عامة", "أدوات وخامات نجارة", "أدوات الوميتال", "أدوات سيكوريت", "رخام ومواد بناء"):
        lines.append(f"[{it['code']}] Row {it['row']} ({it['dept']}): {it['name']} | {it['unit']} | Bal: {it['bal']}")

with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\search_out_utf8.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(lines))

print(f"Wrote {len(lines)} lines.")
