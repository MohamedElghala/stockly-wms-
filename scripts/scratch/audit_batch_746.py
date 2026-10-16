import sys
import json
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

INDEX_FILE = r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\catalog_892_full_index.json"
EXCEL_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"

with open(INDEX_FILE, encoding="utf-8") as f:
    items = json.load(f)["items"]

print("=== ALL CLEANING ITEMS (مستلزمات نظافة) ===")
for it in items:
    if it["dept"] == "مستلزمات نظافة":
        print(f"  Row {it['row']:4d} | Code={it['code']} | Name={it['name']} | Unit={it['unit']} | In={it['in']} | Out={it['out']} | Bal={it['bal']}")

for kw in ["تفلون", "تيفلون", "بنطة", "بنطه", "سنسر", "سنسور", "حركة", "IR", "شحم", "سلكون", "سيليكون", "مناديل", "صابون", "ديتول", "شاور", "معطر"]:
    print(f"=== KEYWORD: {kw} ===")
    for it in items:
        if kw.lower() in it["name"].lower():
            print(f"  Row {it['row']:4d} | Code={it['code']} | Dept={it['dept']} | Name={it['name']} | Unit={it['unit']} | In={it['in']} | Out={it['out']} | Bal={it['bal']}")
