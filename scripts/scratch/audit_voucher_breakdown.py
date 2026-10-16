import sys, openpyxl, json

sys.stdout.reconfigure(encoding="utf-8")

excel_path = r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx'
wb = openpyxl.load_workbook(excel_path, data_only=True)
ws_add = wb['الاضافة']
ws_disp = wb['الصرف']
ws_master = wb['أرصدة المخزن']

# Group addition rows by voucher number
add_by_v = {}
for r in range(1581, 1692):
    vals = [ws_add.cell(r, c).value for c in range(1, 10)]
    v = vals[2]
    if v not in add_by_v:
        add_by_v[v] = []
    add_by_v[v].append((r, vals))

# Group disbursement rows by voucher number
disp_by_v = {}
for r in range(2499, 2647):
    vals = [ws_disp.cell(r, c).value for c in range(1, 11)]
    v = vals[3]
    if v not in disp_by_v:
        disp_by_v[v] = []
    disp_by_v[v].append((r, vals))

print(f"Addition Vouchers Count: {len(add_by_v)} (from {min(add_by_v.keys())} to {max(add_by_v.keys())})")
print(f"Disbursement Vouchers Count: {len(disp_by_v)} (from {min(disp_by_v.keys())} to {max(disp_by_v.keys())})")

# Print summary of each voucher
print("\n--- ADDITION VOUCHERS SUMMARY ---")
for v in sorted(add_by_v.keys()):
    rows = add_by_v[v]
    date_str = str(rows[0][1][1])[:10]
    supplier = rows[0][1][8]
    items = [f"{r[1][4]} ({r[1][6]} {r[1][5]})" for r in rows]
    print(f"إذن إضافة [{v}] ({date_str}) - مورد: {supplier} - عدد البنود: {len(rows)}")
    for it in items:
        print(f"   * {it}")

print("\n--- DISBURSEMENT VOUCHERS SUMMARY ---")
for v in sorted(disp_by_v.keys()):
    rows = disp_by_v[v]
    date_str = str(rows[0][1][1])[:10]
    dept = rows[0][1][2]
    items = [f"{r[1][5]} ({r[1][7]} {r[1][6]}) -> {r[1][9]}" for r in rows]
    print(f"إذن صرف [{v}] ({date_str}) - جهة: {dept} - عدد البنود: {len(rows)}")
    for it in items:
        print(f"   * {it}")
