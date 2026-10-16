import json

with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\catalog_892_full_index.json", "r", encoding="utf-8") as f:
    items = json.load(f)["items"]

lines = []
for it in items:
    c = int(it["code"])
    if (101207 <= c <= 101383) or it["dept"] in ("أدوات خامات الري", "حمامات سباحة", "مستلزمات نظافة", "أدوات نقاشة", "أدوات مكاتب", "أدوات ميكانيكا", "أدوات الأمن وكاميرات المراقبة", "ملابس") or c >= 116150:
        lines.append(f"[{it['code']}] Row {it['row']} ({it['dept']}): {it['name']} | {it['unit']} | Bal: {it['bal']}")

with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\search_out_part2_utf8.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(lines))

print(f"Wrote {len(lines)} lines.")
