import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx', data_only=False)

print("=== Checking Formulas in Sheets ===")
for name in wb.sheetnames:
    ws = wb[name]
    formulas = []
    for r in range(1, min(ws.max_row + 1, 50)):
        for c in range(1, ws.max_column + 1):
            val = str(ws.cell(r, c).value or '')
            if val.startswith('='):
                formulas.append((r, c, ws.cell(r, c).coordinate, val))
    print(f"Sheet '{name}' sample formulas ({len(formulas)} found in first 50 rows):")
    for item in formulas[:5]:
        print(f"  {item[2]}: {item[3]}")
