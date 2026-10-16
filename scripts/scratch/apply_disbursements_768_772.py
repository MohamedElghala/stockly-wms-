import os
import shutil
import sys
import win32com.client

sys.stdout.reconfigure(encoding="utf-8")

EXCEL_C = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"
EXCEL_D = r"D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx"
SINGLE_BACKUP = r"D:\The_Calm_WMS_V2.1\Excel_Database\Historical_Backups_Archive\The_Calm_WMS_V2_SINGLE_SAFETY_BACKUP.xlsx"

ROWS = [
    # Voucher 768 (2026-10-07, الري بلوم)
    (2707, 2701, "2026-10-07", "الري بلوم", 768, 102103, 3, "حمام 4"),
    (2708, 2702, "2026-10-07", "الري بلوم", 768, 102101, 4, "حمام 4"),
    (2709, 2703, "2026-10-07", "الري بلوم", 768, 102102, 1, "حمام 4"),
    (2710, 2704, "2026-10-07", "الري بلوم", 768, 102105, 1, "حمام 4"),
    # Voucher 769 (2026-10-07, الري بلوم)
    (2711, 2705, "2026-10-07", "الري بلوم", 769, 102110, 300, "حمام 4"),
    (2712, 2706, "2026-10-07", "الري بلوم", 769, 102109, 9, "حمام 4 و6"),
    (2713, 2707, "2026-10-07", "الري بلوم", 769, 102108, 6, "بحيرة 3 و54"),
    # Voucher 770 (2026-10-07, الري سلطان)
    (2714, 2708, "2026-10-07", "الري سلطان", 770, 102103, 5, None),
    (2715, 2709, "2026-10-07", "الري سلطان", 770, 102101, 4, None),
    (2716, 2710, "2026-10-07", "الري سلطان", 770, 102102, 1, None),
    (2717, 2711, "2026-10-07", "الري سلطان", 770, 102110, 200, None),
    # Voucher 771 (2026-10-08, الصيانة كالم)
    (2718, 2712, "2026-10-08", "الصيانة كالم", 771, 101183, 2, None),
    (2719, 2713, "2026-10-08", "الصيانة كالم", 771, 101185, 1, None),
    # Voucher 772 (2026-10-10, النظافة كايرو)
    (2720, 2714, "2026-10-10", "النظافة كايرو", 772, 104102, 4, None),
    (2721, 2715, "2026-10-10", "النظافة كايرو", 772, 104101, 3, None),
    (2722, 2716, "2026-10-10", "النظافة كايرو", 772, 104104, 18, None),
]

shutil.copy2(EXCEL_C, SINGLE_BACKUP)
print("1. Updated single safety backup:", SINGLE_BACKUP, flush=True)

# Try attaching to active Excel first if workbook is open
excel = None
wb = None
attached_to_open = False

try:
    active_excel = win32com.client.GetActiveObject("Excel.Application")
    for w in active_excel.Workbooks:
        if os.path.abspath(w.FullName).lower() == os.path.abspath(EXCEL_C).lower():
            excel = active_excel
            wb = w
            attached_to_open = True
            print("2. Attached directly to user's open Excel workbook!", flush=True)
            break
except Exception:
    pass

if wb is None:
    excel = win32com.client.DispatchEx("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    wb = excel.Workbooks.Open(os.path.abspath(EXCEL_C))
    print("2. Opened workbook in background Excel instance.", flush=True)

try:
    ws_cat = wb.Sheets("أرصدة المخزن")
    ws_add = wb.Sheets("الاضافة")
    ws_dis = wb.Sheets("الصرف")

    for r, seq, dt_str, entity, inv, code, qty, notes in ROWS:
        ws_dis.Cells(r, 1).Value = seq
        ws_dis.Cells(r, 2).Value = dt_str
        ws_dis.Cells(r, 3).Value = entity
        ws_dis.Cells(r, 4).Value = inv
        ws_dis.Cells(r, 5).Value = code
        ws_dis.Cells(r, 8).Value = qty
        ws_dis.Cells(r, 9).Value = "صرف"
        ws_dis.Cells(r, 10).Value = notes

    excel.Calculate()

    print(f"3. Buttons check -> أرصدة المخزن: {ws_cat.Shapes.Count}, الاضافة: {ws_add.Shapes.Count}, الصرف: {ws_dis.Shapes.Count}", flush=True)
    print("\n4. Verifying calculated rows 2707..2722 in 'الصرف':", flush=True)
    for r in range(2707, 2723):
        seq_v = int(ws_dis.Cells(r, 1).Value)
        dt_v = str(ws_dis.Cells(r, 2).Value)[:10]
        ent_v = ws_dis.Cells(r, 3).Value
        inv_v = int(ws_dis.Cells(r, 4).Value)
        cod_v = int(ws_dis.Cells(r, 5).Value)
        nam_v = ws_dis.Cells(r, 6).Value
        uni_v = ws_dis.Cells(r, 7).Value
        qty_v = ws_dis.Cells(r, 8).Value
        typ_v = ws_dis.Cells(r, 9).Value
        not_v = ws_dis.Cells(r, 10).Value
        bal_v = ws_dis.Cells(r, 11).Value
        print(f"  Row {r} | م={seq_v} | {dt_v} | {ent_v} | إذن={inv_v} | كود={cod_v} | {nam_v} | {uni_v} | كمية={qty_v:g} | {typ_v} | ملاحظات={not_v} | متاح={bal_v:g}", flush=True)

    wb.Save()
    if not attached_to_open:
        wb.Close(SaveChanges=False)
finally:
    if not attached_to_open and excel is not None:
        excel.Quit()

shutil.copy2(EXCEL_C, EXCEL_D)
print("5. Synced to:", EXCEL_D, flush=True)
