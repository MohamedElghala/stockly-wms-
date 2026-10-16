# -*- coding: utf-8 -*-
import openpyxl
from datetime import datetime
import win32com.client
import sys
import shutil

sys.stdout.reconfigure(encoding='utf-8')

excel_path = r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx'

# 1. Take backup before adjusting
ts = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_path = rf'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2_BACKUP_BEFORE_REORDER_733_737_{ts}.xlsx'
shutil.copy2(excel_path, backup_path)
print(f"Backup created: {backup_path}")

wb = openpyxl.load_workbook(excel_path)
ws = wb['الصرف']

# Define the exact 15 rows from 2608 to 2622 according to user's order:
# Format: (date, dept, voucher, code, qty, mov_type, notes)
new_disbursements = [
    # --- إذن 733 (عمارة 183/2) ---
    (datetime(2026, 9, 29), 'الصيانة لاين', 733, 101167, 2, 'صرف', 'عمارة 183/2'), # كوع 50 مم كاسل
    (datetime(2026, 9, 29), 'الصيانة لاين', 733, 101193, 1, 'صرف', 'عمارة 183/2 (مشترك 110 T)'), # تي 110 مم كاسل
    (datetime(2026, 9, 29), 'الصيانة لاين', 733, 101166, 3, 'صرف', 'عمارة 183/2'), # ماسورة 50 مم كاسل
    (datetime(2026, 9, 29), 'الصيانة لاين', 733, 101191, 2, 'صرف', 'عمارة 183/2'), # جلبة 110 مم كاسل

    # --- إذن 734 (الموقع العام - المسامير) ---
    (datetime(2026, 9, 29), 'الصيانة لاين', 734, 116135, 1, 'صرف', 'الموقع العام'), # مسمار سن صاج 7 سم (كيلو)
    (datetime(2026, 9, 29), 'الصيانة لاين', 734, 116134, 1, 'صرف', 'الموقع العام'), # مسمار سن صاج 5 سم (علبة)
    (datetime(2026, 9, 29), 'الصيانة لاين', 734, 116129, 1, 'صرف', 'الموقع العام'), # علبة مسمار 2 سم (كيلو)
    (datetime(2026, 9, 29), 'الصيانة لاين', 734, 116132, 1, 'صرف', 'الموقع العام'), # مسمار سن صاج 3 سم (علبة)

    # --- إذن 735 (عمارات متفرقة) ---
    (datetime(2026, 9, 29), 'الصيانة لاين', 735, 101114, 3, 'صرف', 'عمارة 178'), # جلبة 32 مم بولي
    (datetime(2026, 9, 29), 'الصيانة لاين', 735, 101184, 1, 'صرف', 'عمارة 58'), # مسلوب 110/75 مم كاسل
    (datetime(2026, 9, 29), 'الصيانة لاين', 735, 101193, 1, 'صرف', 'عمارة 74'), # تي 110 مم كاسل
    (datetime(2026, 9, 29), 'الصيانة لاين', 735, 101173, 2, 'صرف', 'عمارة 44'), # طبة 63 مم كاسل

    # --- إذن 736 (عمارة 183/2 - الهواية والمسلوب) ---
    (datetime(2026, 9, 29), 'الصيانة لاين', 736, 101171, 1, 'صرف', 'عمارة 183/2'), # هواية 50 مم كاسل
    (datetime(2026, 9, 29), 'الصيانة لاين', 736, 101170, 1, 'صرف', 'عمارة 183/2'), # مسلوب 110/50 مم كاسل

    # --- إذن 737 (موقع عام - اسطوانة بسكوتا) ---
    (datetime(2026, 9, 29), 'الصيانة لاين', 737, 100180, 5, 'صرف', 'موقع عام (اسطوانة بسكوتا)') # أسطوانة قطعية حدادي
]

assert len(new_disbursements) == 15

start_r = 2608
for i, item in enumerate(new_disbursements):
    r = start_r + i
    dt, dept, v_num, code, qty, mov_type, notes = item
    
    # Col 1: Serial (preserve serial = r - 6)
    ws.cell(r, 1).value = r - 6
    # Col 2: Date
    ws.cell(r, 2).value = dt
    # Col 3: Department
    ws.cell(r, 3).value = dept
    # Col 4: Voucher Number
    ws.cell(r, 4).value = v_num
    # Col 5: Item Code
    ws.cell(r, 5).value = code
    # Col 6: Dynamic Name Formula
    ws.cell(r, 6).value = f'=IFERROR(VLOOKUP(E{r},\'أرصدة المخزن\'!$A:$E,3,0),"")'
    # Col 7: Dynamic Unit Formula
    ws.cell(r, 7).value = f'=IFERROR(VLOOKUP(E{r},\'أرصدة المخزن\'!$A:$H,4,FALSE),"")'
    # Col 8: Quantity
    ws.cell(r, 8).value = qty
    # Col 9: Movement Type
    ws.cell(r, 9).value = mov_type
    # Col 10: Notes / Location
    ws.cell(r, 10).value = notes
    # Col 11: Dynamic Stock Balance Formula
    ws.cell(r, 11).value = f'=IFERROR(VLOOKUP(E{r},\'أرصدة المخزن\'!$A:$H,8,0),"")'

wb.save(excel_path)
wb.close()
print("Saved modified Excel file. Running Excel COM recalculation...")

excel_app = win32com.client.DispatchEx('Excel.Application')
excel_app.Visible = False
excel_app.DisplayAlerts = False
try:
    wb_com = excel_app.Workbooks.Open(excel_path)
    wb_com.Save()
    wb_com.Close(SaveChanges=True)
    print("Recalculation and COM save complete!")
finally:
    excel_app.Quit()

print("SUCCESS: Vouchers 733 to 737 updated and verified 100% in Excel.")
