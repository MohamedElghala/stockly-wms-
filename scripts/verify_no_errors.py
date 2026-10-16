import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

target_path = r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx'
wb = openpyxl.load_workbook(target_path, data_only=True)

error_types = {'#N/A', '#VALUE!', '#REF!', '#NAME?', '#DIV/0!', '#NUM!'}

total_errors = 0
for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    sheet_errors = []
    for r in range(1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            val = str(ws.cell(r, c).value or '')
            if val in error_types:
                sheet_errors.append((ws.cell(r, c).coordinate, val))
    print(f"Sheet '{sheet_name}': {len(sheet_errors)} errors found.")
    if sheet_errors:
        for it in sheet_errors[:10]:
            print(f"   Cell {it[0]}: {it[1]}")
    total_errors += len(sheet_errors)

print(f"\nTotal formula evaluation errors across entire workbook: {total_errors}")
if total_errors == 0:
    print(">>> 100% CLEAN WORKBOOK: ZERO ERRORS FOUND! <<<")
