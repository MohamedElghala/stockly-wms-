import sys, openpyxl

sys.stdout.reconfigure(encoding="utf-8")

excel_path = r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx'
wb = openpyxl.load_workbook(excel_path)

ws_master = wb['أرصدة المخزن']
ws_add = wb['الاضافة']
ws_disp = wb['الصرف']

# 1. Update master sheet: code 116126 -> "مسمار بواط"
for r in range(1, ws_master.max_row + 1):
    c_val = ws_master.cell(r, 1).value
    if c_val == 116126 or str(c_val) == '116126':
        ws_master.cell(r, 3, 'مسمار بواط')
        print(f"Master Row {r}: Updated Code 116126 to 'مسمار بواط'")

# 2. Update additions: code 116126 -> "مسمار بواط"
for r in range(1581, 1692):
    code = ws_add.cell(r, 4).value
    if code == 116126 or str(code) == '116126':
        ws_add.cell(r, 5, 'مسمار بواط')
        print(f"Add Row {r}: Updated Code 116126 to 'مسمار بواط'")

# 3. Update disbursements: code 116126 -> "مسمار بواط"
for r in range(2499, 2647):
    code = ws_disp.cell(r, 5).value
    if code == 116126 or str(code) == '116126':
        ws_disp.cell(r, 6, 'مسمار بواط')
        print(f"Disp Row {r}: Updated Code 116126 to 'مسمار بواط'")

wb.save(excel_path)
print("Saved The_Calm_WMS_V2.xlsx successfully!")
