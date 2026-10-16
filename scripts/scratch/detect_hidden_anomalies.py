import openpyxl
from difflib import SequenceMatcher

wb = openpyxl.load_workbook(r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx", data_only=True, read_only=True)
ws_bal = wb["أرصدة المخزن"]

items = []
for r_idx, row in enumerate(ws_bal.iter_rows(min_row=4, max_col=9, values_only=True), start=4):
    c, dept, name, unit, op, ti, to, bal = row[:8]
    if c is not None and name is not None and str(c).strip() != "":
        items.append({
            "row": r_idx,
            "code": str(int(c)) if isinstance(c, (int, float)) else str(c).strip(),
            "dept": str(dept).strip() if dept else "",
            "name": str(name).strip(),
            "unit": str(unit).strip() if unit else "",
            "open": float(op or 0),
            "in": float(ti or 0),
            "out": float(to or 0),
            "bal": float(bal or 0),
        })

out_lines = []

# CHECK A: Similar item names in catalog where one has stock (bal > 0) and another was disbursed (out > 0)
out_lines.append("=== CHECK A: SIMILAR ITEM NAMES IN CATALOG (Potential Split between two codes) ===")
pairs = []
for i in range(len(items)):
    for j in range(i + 1, len(items)):
        a, b = items[i], items[j]
        # Remove digits to avoid matching 32mm vs 50mm unless digits also match
        import re
        nums_a = re.findall(r"\d+(?:\.\d+)?", a["name"])
        nums_b = re.findall(r"\d+(?:\.\d+)?", b["name"])
        if nums_a != nums_b:
            continue
        ratio = SequenceMatcher(None, a["name"], b["name"]).ratio()
        if ratio >= 0.72:
            pairs.append((ratio, a, b))

pairs.sort(key=lambda x: -x[0])
for ratio, a, b in pairs[:80]:
    out_lines.append(
        f"  [{ratio:.2f}] [{a['code']}] '{a['name']}' (Op={a['open']:g}, In={a['in']:g}, Out={a['out']:g}, Bal={a['bal']:g})"
        f"  <-->  [{b['code']}] '{b['name']}' (Op={b['open']:g}, In={b['in']:g}, Out={b['out']:g}, Bal={b['bal']:g})"
    )

# CHECK B: Missing/Skipped Voucher Numbers in الصرف and الاضافة
ws_in = wb["الاضافة"]
in_vnos = []
for row in ws_in.iter_rows(min_row=7, max_col=9, values_only=True):
    v = row[2]
    c = row[3]
    if v is not None and isinstance(v, (int, float)):
        in_vnos.append((int(v), str(c)))

ws_out = wb["الصرف"]
out_vnos = []
for row in ws_out.iter_rows(min_row=7, max_col=9, values_only=True):
    v = row[3]
    c = row[4]
    if v is not None and isinstance(v, (int, float)):
        out_vnos.append((int(v), str(c)))

# Check sequence 1..767 in الصرف
out_set_new = set(v for v, c in out_vnos if 1 <= v <= 767)
missing_out = [v for v in range(1, 768) if v not in out_set_new]
cancelled_out = sorted(set(v for v, c in out_vnos if c in ("9999", "9999.0", "2345", "2345.0")))

out_lines.append(f"\n=== CHECK B: VOUCHER GAPS IN الصرف (1..767) ===")
out_lines.append(f"  Missing voucher numbers in 1..767 ({len(missing_out)}): {missing_out}")
out_lines.append(f"  Cancelled voucher numbers (code 9999) in الصرف ({len(cancelled_out)}): {cancelled_out}")

# CHECK D: Roll / Meter mismatch in الاضافة vs الصرف (e.g. 'لفة' in name, or big vs small numbers)
out_lines.append(f"\n=== CHECK D: POTENTIAL UNIT MISMATCH (Roll vs Meter / Box vs Piece) ===")
for it in items:
    if ("لفة" in it["name"] or "بكرة" in it["name"] or "علبة" in it["name"] or "كرتونة" in it["name"] or "كيس" in it["name"] or it["unit"] in ("متر", "لفة")):
        if (it["open"] + it["in"]) >= 50 and 0 < it["out"] <= 20 and it["bal"] >= 40:
            out_lines.append(
                f"  [{it['code']}] '{it['name']}' (Unit={it['unit']}): Open={it['open']:g}, In={it['in']:g}, Out={it['out']:g}, Bal={it['bal']:g}"
            )

wb.close()
with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\anomalies_report.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))
print("Anomalies report written! Lines:", len(out_lines))
