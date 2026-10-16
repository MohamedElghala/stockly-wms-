import openpyxl

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
wb.close()

# Print all items with Bal > 0 and Out == 0 that have a similar keyword in another item that HAS Out > 0!
out = []
zero_out = [it for it in items if it["bal"] > 0 and it["out"] == 0]
has_out = [it for it in items if it["out"] > 0]

out.append(f"Total items with Bal > 0 and Out == 0: {len(zero_out)} (out of {len([x for x in items if x['bal']>0])} positive items)")

for z in zero_out:
    z_words = [w for w in z["name"].replace("*", " ").replace("/", " ").replace(".", " ").split() if len(w) >= 3 and w not in ("بولي", "كومر", "كاسل", "ملي", "بوصة", "عدد", "لفة", "علبة", "كيلو", "متر", "قطعة", "كبير", "صغير", "حديد", "نحاس", "بلاستك", "بلاستيك")]
    if not z_words:
        continue
    cands = []
    for h in has_out:
        if h["dept"] != z["dept"] and z["dept"] != "قسم المستهلكات" and h["dept"] != "قسم المستهلكات":
            continue
        shared = [w for w in z_words if w in h["name"]]
        if len(shared) >= 2 or (len(z_words) == 1 and len(shared) == 1):
            cands.append((len(shared), h))
    if cands:
        cands.sort(key=lambda x: (-x[0], -x[1]["out"]))
        out.append(f"\n  UNTOUCHED [{z['code']}] ({z['dept']}) '{z['name']}': Open={z['open']:g}, In={z['in']:g}, Out=0, Bal={z['bal']:g}")
        for sh, h in cands[:3]:
            out.append(f"     ---> DISBURSED SIMILAR [{h['code']}] '{h['name']}': Open={h['open']:g}, In={h['in']:g}, Out={h['out']:g}, Bal={h['bal']:g}")

with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\untouched_vs_disbursed.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("Written lines:", len(out))
