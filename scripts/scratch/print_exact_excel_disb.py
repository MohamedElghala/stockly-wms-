import sys, openpyxl

sys.stdout.reconfigure(encoding="utf-8")

wb = openpyxl.load_workbook(r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx', data_only=True)
ws_disp = wb['الصرف']

print("--- EXACT DISBURSEMENTS ROWS 2499 TO 2646 FROM EXCEL ---")
for r in range(2499, 2647):
    row_vals = [ws_disp.cell(r, c).value for c in range(1, 11)]
    d_val = str(row_vals[1])[:10] if row_vals[1] else ''
    dest = str(row_vals[2] or '')
    v_num = str(row_vals[3] or '')
    code = str(row_vals[4] or '')
    name = str(row_vals[5] or '')
    unit = str(row_vals[6] or '')
    qty = str(row_vals[7] or '')
    move_type = str(row_vals[8] or '')
    notes = str(row_vals[9] or '')
    print(f"| {r} | {d_val} | {dest} | {v_num} | {code} | {name} | {unit} | {qty} | {move_type} | {notes} |")
