import sys
import os
import shutil
from datetime import datetime
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client

EXCEL_C = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"
EXCEL_D = r"D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx"
SINGLE_BACKUP = r"D:\The_Calm_WMS_V2.1\Excel_Database\Historical_Backups_Archive\The_Calm_WMS_V2_SINGLE_SAFETY_BACKUP.xlsx"

def apply_changes():
    try:
        with open(EXCEL_C, "rb+"):
            pass
    except PermissionError:
        print("LOCKED: File is currently open in Excel! Please ask user to close it.", flush=True)
        return False

    os.makedirs(os.path.dirname(SINGLE_BACKUP), exist_ok=True)
    shutil.copy2(EXCEL_C, SINGLE_BACKUP)
    print(f"1. Single safety backup saved to: {SINGLE_BACKUP}", flush=True)

    excel = win32com.client.DispatchEx("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        print("2. Opening workbook in Excel COM...", flush=True)
        wb = excel.Workbooks.Open(os.path.abspath(EXCEL_C))
        if wb.ReadOnly:
            print("LOCKED: Workbook opened as ReadOnly in Excel COM.", flush=True)
            wb.Close(SaveChanges=False)
            return False

        ws_cat = wb.Sheets("أرصدة المخزن")
        ws_add = wb.Sheets("الاضافة")

        print(f"   -> Buttons count on أرصدة المخزن: {ws_cat.Shapes.Count}, الاضافة: {ws_add.Shapes.Count}", flush=True)

        # A. Add 6 new Electrical items (Rows 215..220, Codes 100312..100317)
        new_elec = [
            (215, 100312, "أدوات كهربائية", "ترانس ليد 400 وات", "عدد"),
            (216, 100313, "أدوات كهربائية", "لمبة كاسة 6 وات", "عدد"),
            (217, 100314, "أدوات كهربائية", "لمبة ديكور 4 وات", "عدد"),
            (218, 100315, "أدوات كهربائية", "مسطرة 220 فولت 20 وات", "عدد"),
            (219, 100316, "أدوات كهربائية", "لمبة G9 5 وات", "عدد"),
            (220, 100317, "أدوات كهربائية", "دواية G9", "عدد"),
        ]
        for r, code, dept, name, unit in new_elec:
            ws_cat.Cells(r, 1).Value = code
            ws_cat.Cells(r, 2).Value = dept
            ws_cat.Cells(r, 3).Value = name
            ws_cat.Cells(r, 4).Value = unit
            ws_cat.Cells(r, 5).Value = 0

        # B. Update 101164 (Row 567) to 'كوع 32 مم د 90 كاسل'
        ws_cat.Cells(567, 3).Value = "كوع 32 مم د 90 كاسل"

        # C. Merge 101181 (Row 584: مشترك 2*1 75 مم كاسل, Opening=1) into 101183 (Row 586: مشترك Y 75 مم كاسل)
        ws_cat.Cells(586, 5).Value = 1
        ws_cat.Cells(584, 3).Value = None
        ws_cat.Cells(584, 4).Value = None
        ws_cat.Cells(584, 5).Value = 0

        # D. Add 3 new Plumbing Castle items (Rows 787..789, Codes 101384..101386)
        new_plumb = [
            (787, 101384, "أدوات سباكة", "كوع 32 مم د 45 كاسل", "عدد"),
            (788, 101385, "أدوات سباكة", "مشترك Y 32 مم كاسل", "عدد"),
            (789, 101386, "أدوات سباكة", "مشترك Y 110 مم كاسل", "عدد"),
        ]
        for r, code, dept, name, unit in new_plumb:
            ws_cat.Cells(r, 1).Value = code
            ws_cat.Cells(r, 2).Value = dept
            ws_cat.Cells(r, 3).Value = name
            ws_cat.Cells(r, 4).Value = unit
            ws_cat.Cells(r, 5).Value = 0

        # E. Add 3 new Consumables items (Rows 8060..8062, Codes 116157..116159)
        new_cons = [
            (8060, 116157, "قسم المستهلكات", "مسمار صلب", "كيلو"),
            (8061, 116158, "قسم المستهلكات", "سلك رباط", "كيلو"),
            (8062, 116159, "قسم المستهلكات", "بنطة 110 مم", "عدد"),
        ]
        for r, code, dept, name, unit in new_cons:
            ws_cat.Cells(r, 1).Value = code
            ws_cat.Cells(r, 2).Value = dept
            ws_cat.Cells(r, 3).Value = name
            ws_cat.Cells(r, 4).Value = unit
            ws_cat.Cells(r, 5).Value = 0

        # F. Record Addition Vouchers 277, 278, 279, 280 in 'الاضافة' (Rows 1692..1714)
        vouchers_rows = [
            # Voucher 277 - 2026-10-01
            (1692, 1686, "2026-10-01", 277, 100312, 3, "وارد ذا كالم مشتريات"),
            (1693, 1687, "2026-10-01", 277, 100216, 1, "وارد ذا كالم مشتريات"),
            (1694, 1688, "2026-10-01", 277, 100313, 7, "وارد ذا كالم مشتريات"),
            (1695, 1689, "2026-10-01", 277, 100314, 1, "وارد ذا كالم مشتريات"),
            (1696, 1690, "2026-10-01", 277, 100315, 3, "وارد ذا كالم مشتريات"),
            (1697, 1691, "2026-10-01", 277, 100316, 2, "وارد ذا كالم مشتريات"),
            (1698, 1692, "2026-10-01", 277, 100317, 2, "وارد ذا كالم مشتريات"),
            # Voucher 278 - 2026-10-05
            (1699, 1693, "2026-10-05", 278, 101163, 39, "وارد ذا كالم مشتريات"),
            (1700, 1694, "2026-10-05", 278, 101384, 15, "وارد ذا كالم مشتريات"),
            (1701, 1695, "2026-10-05", 278, 101164, 5, "وارد ذا كالم مشتريات"),
            (1702, 1696, "2026-10-05", 278, 101385, 1, "وارد ذا كالم مشتريات"),
            (1703, 1697, "2026-10-05", 278, 101165, 4, "وارد ذا كالم مشتريات"),
            (1704, 1698, "2026-10-05", 278, 101386, 1, "وارد ذا كالم مشتريات"),
            (1705, 1699, "2026-10-05", 278, 101197, 1, "وارد ذا كالم مشتريات"),
            # Voucher 279 - 2026-10-05
            (1706, 1700, "2026-10-05", 279, 101191, 1, "وارد ذا كالم مشتريات"),
            (1707, 1701, "2026-10-05", 279, 101336, 22, "وارد ذا كالم مشتريات"),
            (1708, 1702, "2026-10-05", 279, 116157, 0.5, "وارد ذا كالم مشتريات"),
            (1709, 1703, "2026-10-05", 279, 116158, 0.5, "وارد ذا كالم مشتريات"),
            (1710, 1704, "2026-10-05", 279, 116115, 2, "وارد ذا كالم مشتريات"),
            (1711, 1705, "2026-10-05", 279, 116159, 1, "وارد ذا كالم مشتريات"),
            (1712, 1706, "2026-10-05", 279, 116152, 1, "وارد ذا كالم مشتريات"),
            # Voucher 280 - 2026-10-06
            (1713, 1707, "2026-10-06", 280, 101187, 15, "وارد ذا كالم مشتريات"),
            (1714, 1708, "2026-10-06", 280, 101102, 16, "وارد ذا كالم مشتريات"),
        ]

        for r, seq, dt_str, inv, code, qty, notes in vouchers_rows:
            ws_add.Cells(r, 1).Value = seq
            ws_add.Cells(r, 2).Value = dt_str
            ws_add.Cells(r, 3).Value = inv
            ws_add.Cells(r, 4).Value = code
            ws_add.Cells(r, 7).Value = qty
            ws_add.Cells(r, 8).Value = "إضافة"
            ws_add.Cells(r, 9).Value = notes

        print("3. Verifying calculated rows 1692..1714 in 'الاضافة':", flush=True)
        for r in range(1692, 1715):
            seq_v = int(ws_add.Cells(r, 1).Value)
            inv_v = int(ws_add.Cells(r, 3).Value)
            code_v = int(ws_add.Cells(r, 4).Value)
            name_v = ws_add.Cells(r, 5).Value
            unit_v = ws_add.Cells(r, 6).Value
            qty_v = ws_add.Cells(r, 7).Value
            print(f"   Row {r} (seq {seq_v}) | إذن {inv_v} | [{code_v}] {name_v} | {qty_v} {unit_v}", flush=True)

        print("\n4. Verifying updated & new items in 'أرصدة المخزن':", flush=True)
        for r in (215, 216, 217, 218, 219, 220, 567, 584, 586, 787, 788, 789, 8060, 8061, 8062):
            c_v = ws_cat.Cells(r, 1).Value
            n_v = ws_cat.Cells(r, 3).Value
            op_v = ws_cat.Cells(r, 5).Value
            in_v = ws_cat.Cells(r, 6).Value
            out_v = ws_cat.Cells(r, 7).Value
            bal_v = ws_cat.Cells(r, 8).Value
            print(f"   Cat Row {r} [{c_v}]: {n_v} | Open={op_v}, In={in_v}, Out={out_v}, Bal={bal_v}", flush=True)

        wb.Save()
        wb.Close(SaveChanges=True)
        print("5. Saved workbook cleanly via Excel COM!", flush=True)
    finally:
        excel.Quit()

    # Keep D:\ copy in 1:1 sync with C:\
    shutil.copy2(EXCEL_C, EXCEL_D)
    print("6. Synchronized D:\\The_Calm_WMS_V2.1\\Excel_Database\\The_Calm_WMS_V2.xlsx 1:1!", flush=True)
    return True

if __name__ == "__main__":
    apply_changes()
