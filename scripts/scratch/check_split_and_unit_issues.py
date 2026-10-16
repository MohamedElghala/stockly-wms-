import openpyxl

wb = openpyxl.load_workbook(r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx", data_only=True, read_only=True)
ws_bal = wb["أرصدة المخزن"]

items = []
by_code = {}
for r_idx, row in enumerate(ws_bal.iter_rows(min_row=4, max_col=9, values_only=True), start=4):
    c, dept, name, unit, op, ti, to, bal = row[:8]
    if c is not None and name is not None and str(c).strip() != "":
        code_s = str(int(c)) if isinstance(c, (int, float)) else str(c).strip()
        it = {
            "row": r_idx,
            "code": code_s,
            "dept": str(dept).strip() if dept else "",
            "name": str(name).strip(),
            "unit": str(unit).strip() if unit else "",
            "open": float(op or 0),
            "in": float(ti or 0),
            "out": float(to or 0),
            "bal": float(bal or 0),
            "in_list": [],
            "out_list": [],
        }
        items.append(it)
        by_code[code_s] = it

ws_in = wb["الاضافة"]
for r_idx, row in enumerate(ws_in.iter_rows(min_row=7, max_col=9, values_only=True), start=7):
    seq, date, vno, c, name, unit, qty = row[:7]
    if c is None and qty is None:
        continue
    cs = str(int(c)) if isinstance(c, (int, float)) else (str(c).strip() if c else "")
    q = float(qty or 0) if isinstance(qty, (int, float)) else 0.0
    if cs in by_code:
        by_code[cs]["in_list"].append((vno, q))

ws_out = wb["الصرف"]
for r_idx, row in enumerate(ws_out.iter_rows(min_row=7, max_col=9, values_only=True), start=7):
    seq, date, rec, vno, c, name, unit, qty = row[:8]
    if c is None and qty is None:
        continue
    cs = str(int(c)) if isinstance(c, (int, float)) else (str(c).strip() if c else "")
    q = float(qty or 0) if isinstance(qty, (int, float)) else 0.0
    if cs in by_code:
        by_code[cs]["out_list"].append((vno, q))

wb.close()

lines = []
lines.append("=== 1. ALL NEGATIVE BALANCE ITEMS (Out > Open + In) & POTENTIAL MATCHING POSITIVE ITEMS ===")
neg_items = [it for it in items if it["bal"] < 0]
for it in neg_items:
    lines.append(f"  NEG [{it['code']}] ({it['dept']}) '{it['name']}' [Unit={it['unit']}]: Open={it['open']:g}, In={it['in']:g}, Out={it['out']:g}, Bal={it['bal']:g}")
    # Find any positive item in the same dept (or overall) sharing key words
    words = [w for w in it["name"].replace("*", " ").replace("/", " ").split() if len(w) >= 2 and w not in ("مم", "ملي", "بوصة", "كومر", "بولي", "كاسل", "عدد", "لفة", "علبة")]
    matches = []
    for cand in items:
        if cand["code"] == it["code"] or cand["bal"] <= 0:
            continue
        shared = sum(1 for w in words if w in cand["name"])
        if shared >= 2 or (len(words) == 1 and shared == 1):
            matches.append((shared, cand))
    matches.sort(key=lambda x: (-x[0], x[1]["code"]))
    for sh, cand in matches[:5]:
        lines.append(f"      ? POS CAND [{cand['code']}] ({cand['dept']}) '{cand['name']}': Open={cand['open']:g}, In={cand['in']:g}, Out={cand['out']:g}, Bal={cand['bal']:g}")

lines.append("\n=== 2. ITEMS WITH ROLL/METER OR BOX/PIECE DISCREPANCY BETWEEN ADDITION AND DISBURSEMENT ===")
for it in items:
    if it["in_list"] and it["out_list"]:
        max_in = max(q for _, q in it["in_list"])
        max_out = max(q for _, q in it["out_list"])
        min_out = min(q for _, q in it["out_list"] if q > 0) if any(q > 0 for _, q in it["out_list"]) else 0
        # e.g., added in 90/100/200/300/500 and disbursed in 1/2/3/4/5 (or vice versa)
        if (max_in >= 45 and max_out <= 15 and it["bal"] >= 40) or ("لفة" in it["name"] and it["bal"] > 20) or ("سلك" in it["name"] and it["bal"] > 20) or ("كابل" in it["name"] and it["bal"] > 20) or ("خرطوم" in it["name"] and it["bal"] > 20):
            lines.append(
                f"  [{it['code']}] '{it['name']}' (Unit={it['unit']}): Open={it['open']:g}, In={it['in']:g}, Out={it['out']:g}, Bal={it['bal']:g}"
                f" | In={it['in_list']} | Out={it['out_list'][:10]}"
            )

lines.append("\n=== 3. ITEMS ADDED IN VOUCHERS (In > 0) WITH ZERO DISBURSEMENTS (Out == 0) ===")
zero_out_in = [it for it in items if it["in"] > 0 and it["out"] == 0]
lines.append(f"Total items with In > 0 and Out == 0: {len(zero_out_in)}")
for it in zero_out_in:
    lines.append(f"  [{it['code']}] ({it['dept']}) '{it['name']}': Open={it['open']:g}, In={it['in']:g} (Vouchers={[v for v,_ in it['in_list']]}), Out=0, Bal={it['bal']:g}")

with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\split_and_unit_report.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("Report written! Lines:", len(lines))
