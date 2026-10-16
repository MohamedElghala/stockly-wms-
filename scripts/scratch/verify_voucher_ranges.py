import sys, openpyxl
sys.stdout.reconfigure(encoding="utf-8")

wb = openpyxl.load_workbook(r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx', data_only=True)
ws_add = wb['الاضافة']
ws_disp = wb['الصرف']

# Additions check
add_rows = []
for r in range(1580, 1700):
    val = [ws_add.cell(r, c).value for c in range(1, 10)]
    v_num = val[2]
    if v_num is not None:
        try:
            v_int = int(v_num)
            if 257 <= v_int <= 276:
                add_rows.append((r, val))
        except:
            pass

print(f"Total Addition rows from 257 to 276: {len(add_rows)}")
print(f"Start row: {add_rows[0][0]}, End row: {add_rows[-1][0]}")

# Disbursements check
disp_rows = []
for r in range(2490, 2660):
    val = [ws_disp.cell(r, c).value for c in range(1, 11)]
    v_num = val[3]
    if v_num is not None:
        try:
            v_int = int(v_num)
            if 698 <= v_int <= 745:
                disp_rows.append((r, val))
        except:
            pass

print(f"Total Disbursement rows from 698 to 745: {len(disp_rows)}")
print(f"Start row: {disp_rows[0][0]}, End row: {disp_rows[-1][0]}")
