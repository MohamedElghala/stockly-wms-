import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client

EXCEL_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"

DEPARTMENTS_LIST = (
    "أدوات كهربائية,أدوات سباكة,أدوات خامات الري,حمامات سباحة,"
    "مستلزمات نظافة,أدوات نقاشة,أدوات وخامات نجارة,أدوات عامة,"
    "أدوات سيكوريت,أدوات الوميتال,أدوات مكاتب,أدوات ميكانيكا,"
    "أدوات الأمن وكاميرات المراقبة,رخام ومواد بناء,ملابس,عدد و معدات,"
    "قسم المستهلكات,الصيانة,الزراعة,الأمن,المسطحات المائية,مكتب الإدارة"
)

def apply_validation(range_obj, formula_str):
    try:
        val = range_obj.Validation
        val.Delete()
        val.Add(Type=3, AlertStyle=1, Operator=1, Formula1=formula_str) # Type=3 is xlValidateList
        val.IgnoreBlank = True
        val.InCellDropdown = True
    except Exception as e:
        print(f"      [Warning] Could not set validation on {range_obj.Address}: {e}")

def execute_phase2():
    print("==================================================")
    print("STARTING PHASE 2: SAFEGUARDING & DATA VALIDATION")
    print("==================================================")

    if not os.path.exists(EXCEL_FILE):
        raise FileNotFoundError(f"Master file not found: {EXCEL_FILE}")

    print("1. Launching Excel COM Application...")
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        wb = excel.Workbooks.Open(os.path.abspath(EXCEL_FILE))
        print("   Workbook opened successfully.")

        # --- 1. Sheet: 'أرصدة المخزن' ---
        print("\n2. Securing 'أرصدة المخزن'...")
        ws_bal = wb.Sheets("أرصدة المخزن")
        ws_bal.Unprotect()
        # Default all cells to locked
        ws_bal.Cells.Locked = True
        # Unlock catalog data entry columns A to E for rows 4 to 8503
        ws_bal.Range("A4:E8503").Locked = False
        # Columns F, G, H remain Locked = True (SUMIFS & Balance formulas)
        ws_bal.Range("F4:H8503").Locked = True
        # Protect sheet without password
        ws_bal.Protect(
            DrawingObjects=False,
            Contents=True,
            Scenarios=True,
            AllowFormattingCells=True,
            AllowFormattingColumns=True,
            AllowFormattingRows=True,
            AllowSorting=True,
            AllowFiltering=True
        )
        print("   -> Protected formulas F:H, allowed editing in A:E, buttons unlocked.")

        # --- 2. Sheet: 'الاضافة' ---
        print("\n3. Securing 'الاضافة' & adding Data Validation...")
        ws_add = wb.Sheets("الاضافة")
        ws_add.Unprotect()
        ws_add.Cells.Locked = True
        # Search cell
        ws_add.Range("C4").Locked = False
        # Data entry columns: A..D (م، تاريخ، إذن، كود) and G..I (كمية، نوع، ملاحظات)
        ws_add.Range("A7:D3500").Locked = False
        ws_add.Range("G7:I3500").Locked = False
        # Formulas E (اسم الصنف) and F (الوحدة) remain Locked = True
        ws_add.Range("E7:F3500").Locked = True

        # Validation for movement type (Column H)
        apply_validation(ws_add.Range("H7:H3500"), "إضافة,مرتجع,تسوية جردية")

        ws_add.Protect(
            DrawingObjects=False,
            Contents=True,
            Scenarios=True,
            AllowFormattingCells=True,
            AllowFormattingColumns=True,
            AllowFormattingRows=True,
            AllowSorting=True,
            AllowFiltering=True
        )
        print("   -> Protected VLOOKUP formulas in E:F, unlocked data input A:D & G:I, added dropdown in H.")

        # --- 3. Sheet: 'الصرف' ---
        print("\n4. Securing 'الصرف' & adding Data Validation...")
        ws_dis = wb.Sheets("الصرف")
        ws_dis.Unprotect()
        ws_dis.Cells.Locked = True
        # Search cell
        ws_dis.Range("C4").Locked = False
        # Data entry columns: A..E and H..J
        ws_dis.Range("A7:E3500").Locked = False
        ws_dis.Range("H7:J3500").Locked = False
        # Formulas F (اسم الصنف), G (الوحدة), K (الرصيد المتاح) remain Locked = True
        ws_dis.Range("F7:G3500").Locked = True
        ws_dis.Range("K7:K3500").Locked = True

        # Validation for destination (Column C)
        apply_validation(ws_dis.Range("C7:C3500"), DEPARTMENTS_LIST)
        # Validation for movement type (Column I)
        apply_validation(ws_dis.Range("I7:I3500"), "صرف,تالف,تسوية جردية")

        ws_dis.Protect(
            DrawingObjects=False,
            Contents=True,
            Scenarios=True,
            AllowFormattingCells=True,
            AllowFormattingColumns=True,
            AllowFormattingRows=True,
            AllowSorting=True,
            AllowFiltering=True
        )
        print("   -> Protected formulas in F:G and K, unlocked data input, added dropdowns in C and I.")

        # --- 4. Sheet: 'الوارد من التشغيل (مستعمل)' ---
        print("\n5. Securing 'الوارد من التشغيل (مستعمل)' & adding Data Validation...")
        ws_used = wb.Sheets("الوارد من التشغيل (مستعمل)")
        ws_used.Unprotect()
        ws_used.Cells.Locked = True
        # Unlock data rows 7 to 500 for columns A to M
        ws_used.Range("A7:M500").Locked = False
        # Rows 1-5 (Title + KPI formulas) and Row 6 (Headers) remain Locked = True

        # Validation for Technical Condition (Column J)
        apply_validation(ws_used.Range("J7:J500"), "صالح للاستخدام,يحتاج صيانة,كهنة سكراب")
        # Validation for Department (Column E)
        apply_validation(ws_used.Range("E7:E500"), DEPARTMENTS_LIST)

        ws_used.Protect(
            DrawingObjects=False,
            Contents=True,
            Scenarios=True,
            AllowFormattingCells=True,
            AllowFormattingColumns=True,
            AllowFormattingRows=True,
            AllowSorting=True,
            AllowFiltering=True
        )
        print("   -> Protected KPI formulas, unlocked entry rows 7:500, added dropdowns for condition & department.")

        # --- 5. Sheet: 'الأذون الملغية' ---
        print("\n6. Securing 'الأذون الملغية'...")
        ws_void = wb.Sheets("الأذون الملغية")
        ws_void.Unprotect()
        ws_void.Cells.Locked = True
        ws_void.Protect(
            DrawingObjects=False,
            Contents=True,
            Scenarios=True,
            AllowFormattingCells=True,
            AllowFormattingColumns=True,
            AllowFormattingRows=True,
            AllowSorting=True,
            AllowFiltering=True
        )
        print("   -> Protected entire audit sheet as read-only archive.")

        # --- 6. Sheet: 'كارت الصنف' ---
        print("\n7. Securing 'كارت الصنف'...")
        ws_card = wb.Sheets("كارت الصنف")
        ws_card.Unprotect()
        # Find item code input cell in كارت الصنف
        ws_card.Cells.Locked = True
        # Unlock search code cell (typically B3 or C3 or similar)
        ws_card.Range("B3:C4").Locked = False
        ws_card.Protect(
            DrawingObjects=False,
            Contents=True,
            Scenarios=True,
            AllowFormattingCells=True,
            AllowFormattingColumns=True,
            AllowFormattingRows=True,
            AllowSorting=True,
            AllowFiltering=True
        )
        print("   -> Protected calculation cards, unlocked search cells.")

        # Save cleanly via Excel COM
        print("\n8. Saving protected workbook natively via Excel COM...")
        wb.Save()
        wb.Close(SaveChanges=True)
        print("   Workbook saved and closed cleanly.")

    finally:
        excel.Quit()
        print("9. Excel application closed.")

    print("\n==================================================")
    print("PHASE 2 COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    execute_phase2()
