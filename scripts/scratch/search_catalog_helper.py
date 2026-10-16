import sys
import json
import openpyxl
sys.stdout.reconfigure(encoding='utf-8')

EXCEL_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"
INDEX_FILE = r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\catalog_892_full_index.json"

def build_index():
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True, read_only=True)
    ws = wb["أرصدة المخزن"]
    items = []
    curr_dept = ""
    dept_ranges = {}
    for idx, r in enumerate(ws.iter_rows(min_row=4, max_row=8503, values_only=True), start=4):
        code, dept, name, unit, init, add_q, dis_q, bal = r[:8]
        if dept and str(dept).strip():
            curr_dept = str(dept).strip()
        if name and str(name).strip():
            c_str = str(int(code) if isinstance(code, (int, float)) else str(code).strip())
            n_str = str(name).strip()
            u_str = str(unit or "عدد").strip()
            b_val = float(bal or 0)
            items.append({
                "row": idx,
                "code": c_str,
                "dept": curr_dept,
                "name": n_str,
                "unit": u_str,
                "in": float(add_q or 0),
                "out": float(dis_q or 0),
                "bal": b_val
            })
            if curr_dept not in dept_ranges:
                dept_ranges[curr_dept] = {
                    "first_row": idx,
                    "last_row": idx,
                    "first_code": c_str,
                    "last_code": c_str,
                    "count": 0
                }
            dept_ranges[curr_dept]["last_row"] = idx
            dept_ranges[curr_dept]["last_code"] = c_str
            dept_ranges[curr_dept]["count"] += 1
    wb.close()

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump({"items": items, "dept_ranges": dept_ranges}, f, ensure_ascii=False, indent=2)

    print(f"Indexed {len(items)} items across {len(dept_ranges)} departments.")
    for d, info in dept_ranges.items():
        fc, lc, fr, lr, cnt = info["first_code"], info["last_code"], info["first_row"], info["last_row"], info["count"]
        print(f"  - {d}: {cnt} items | rows {fr}..{lr} | codes {fc}..{lc} (next row: {lr+1}, next code: {int(lc)+1})")

if __name__ == "__main__":
    build_index()
