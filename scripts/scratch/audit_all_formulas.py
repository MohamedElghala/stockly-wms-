# -*- coding: utf-8 -*-
import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx', data_only=False)

for sheet_name in ['الاضافة', 'الصرف']:
    ws = wb[sheet_name]
    print(f"\n=================== Sheet: {sheet_name} ===================")
    print("Row 3 headers:", [ws.cell(row=3, column=c).value for c in range(1, 12)])
    
    # Check column 5 (Code), column 6 (Name), column 7 (Unit)
    no_formula_col6 = []
    no_formula_col7 = []
    
    for r in range(4, ws.max_row + 1):
        code_val = ws.cell(row=r, column=5).value
        # If code is blank or row is empty template
        if code_val is None or str(code_val).strip() == '':
            continue
        
        c6_val = str(ws.cell(row=r, column=6).value or '')
        c7_val = str(ws.cell(row=r, column=7).value or '')
        voucher = ws.cell(row=r, column=4 if sheet_name == 'الصرف' else 3).value
        
        if not c6_val.startswith('='):
            no_formula_col6.append((r, voucher, code_val, c6_val))
        if not c7_val.startswith('='):
            no_formula_col7.append((r, voucher, code_val, c7_val))
            
    print(f"Total active rows with non-empty code: {ws.max_row - 3}")
    print(f"Rows where Col 6 is NOT formula: {len(no_formula_col6)}")
    for item in no_formula_col6:
        print(f"  Row {item[0]} | Voucher: {item[1]} | Code: {item[2]} | Val: {item[3]}")
        
    print(f"Rows where Col 7 is NOT formula: {len(no_formula_col7)}")
    for item in no_formula_col7:
        print(f"  Row {item[0]} | Voucher: {item[1]} | Code: {item[2]} | Val: {item[3]}")
