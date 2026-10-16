import sys
import os
import shutil
import glob
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client

EXCEL_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"
DOWNLOADS_DIR = r"C:\Users\Mohamed Helmy\Downloads"
ARCHIVE_DIR = os.path.join(DOWNLOADS_DIR, "أرشيف_نسخ_الاحتياط_The_Calm")

def execute_phase1():
    print("==================================================")
    print("STARTING PHASE 1: DATA HYGIENE & WORKBOOK EXPANSION")
    print("==================================================")

    if not os.path.exists(EXCEL_FILE):
        raise FileNotFoundError(f"Master Excel file not found: {EXCEL_FILE}")

    # Launch Excel Application via COM
    print("1. Launching Excel COM Application...")
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        wb = excel.Workbooks.Open(os.path.abspath(EXCEL_FILE))
        print("   Workbook opened successfully.")

        # --- STEP 1: Fix Missing Units in 'أرصدة المخزن' ---
        print("\n2. Fixing Missing Units in 'أرصدة المخزن'...")
        ws_bal = wb.Sheets("أرصدة المخزن")
        
        # Verify and set Row 200 (Code 100297 - شلباية عمود نور بالترنس)
        code_200 = ws_bal.Cells(200, 1).Value
        name_200 = ws_bal.Cells(200, 3).Value
        print(f"   Row 200: Code={code_200}, Name={name_200}")
        ws_bal.Cells(200, 4).Value = "عدد"
        print("   -> Set Unit at Row 200 to 'عدد'.")

        # Verify and set Row 3054 (Code 106151 - مقعد خشبي)
        code_3054 = ws_bal.Cells(3054, 1).Value
        name_3054 = ws_bal.Cells(3054, 3).Value
        print(f"   Row 3054: Code={code_3054}, Name={name_3054}")
        ws_bal.Cells(3054, 4).Value = "عدد"
        print("   -> Set Unit at Row 3054 to 'عدد'.")

        # Verify and set Row 3543 (Code 107140 - شريط تحذير)
        code_3543 = ws_bal.Cells(3543, 1).Value
        name_3543 = ws_bal.Cells(3543, 3).Value
        print(f"   Row 3543: Code={code_3543}, Name={name_3543}")
        ws_bal.Cells(3543, 4).Value = "لفة"
        print("   -> Set Unit at Row 3543 to 'لفة'.")

        # --- STEP 2: Handle Voided Vouchers in 'الاضافة' & 'الصرف' ---
        print("\n3. Processing Voided Vouchers in 'الاضافة' and 'الصرف'...")
        ws_add = wb.Sheets("الاضافة")
        ws_dis = wb.Sheets("الصرف")

        void_add_records = []
        void_dis_records = []

        # Find and update in الاضافة (Code is in Column 4)
        last_row_add = ws_add.UsedRange.Rows.Count + 10
        for r in range(7, last_row_add):
            c_val = ws_add.Cells(r, 4).Value
            if c_val == 2345 or str(c_val).strip() == "2345":
                serial = ws_add.Cells(r, 1).Value
                dt = ws_add.Cells(r, 2).Value
                vnum = ws_add.Cells(r, 3).Value
                old_code = c_val
                old_name = ws_add.Cells(r, 5).Value
                qty = ws_add.Cells(r, 7).Value or 0
                mov_type = ws_add.Cells(r, 8).Value or "إضافة"
                notes = ws_add.Cells(r, 9).Value or "لاغي"

                void_add_records.append({
                    "row": r, "serial": serial, "date": dt, "voucher": vnum,
                    "code": 9999, "name": "إذن ملغي", "unit": "-", "qty": 0,
                    "type": mov_type, "notes": "إذن ملغي - مؤرشف بالسجل المستقل"
                })

                # Update in place
                ws_add.Cells(r, 4).Value = 9999
                ws_add.Cells(r, 5).Value = "إذن ملغي"
                ws_add.Cells(r, 6).Value = "-"
                ws_add.Cells(r, 7).Value = 0
                ws_add.Cells(r, 9).Value = "إذن ملغي - مؤرشف بالسجل المستقل"

        print(f"   -> Updated {len(void_add_records)} voided voucher rows in 'الاضافة' to Code 9999.")

        # Find and update in الصرف (Code is in Column 5)
        last_row_dis = ws_dis.UsedRange.Rows.Count + 10
        for r in range(7, last_row_dis):
            c_val = ws_dis.Cells(r, 5).Value
            if c_val == 2345 or str(c_val).strip() == "2345":
                serial = ws_dis.Cells(r, 1).Value
                dt = ws_dis.Cells(r, 2).Value
                dept = ws_dis.Cells(r, 3).Value or "-"
                vnum = ws_dis.Cells(r, 4).Value
                old_code = c_val
                old_name = ws_dis.Cells(r, 6).Value
                qty = ws_dis.Cells(r, 8).Value or 0
                mov_type = ws_dis.Cells(r, 9).Value or "صرف"
                notes = ws_dis.Cells(r, 10).Value or "لاغي"

                void_dis_records.append({
                    "row": r, "serial": serial, "date": dt, "dept": dept, "voucher": vnum,
                    "code": 9999, "name": "إذن ملغي", "unit": "-", "qty": 0,
                    "type": mov_type, "notes": "إذن ملغي - مؤرشف بالسجل المستقل"
                })

                # Update in place
                ws_dis.Cells(r, 5).Value = 9999
                ws_dis.Cells(r, 6).Value = "إذن ملغي"
                ws_dis.Cells(r, 7).Value = "-"
                ws_dis.Cells(r, 8).Value = 0
                ws_dis.Cells(r, 10).Value = "إذن ملغي - مؤرشف بالسجل المستقل"

        print(f"   -> Updated {len(void_dis_records)} voided voucher rows in 'الصرف' to Code 9999.")

        # --- STEP 3: Create Dedicated Sheet 'الأذون الملغية' ---
        print("\n4. Creating Dedicated Sheet 'الأذون الملغية'...")
        # Check if already exists, delete if so to rebuild cleanly
        for i in range(1, wb.Sheets.Count + 1):
            if wb.Sheets(i).Name == "الأذون الملغية":
                wb.Sheets(i).Delete()
                break

        ws_void = wb.Sheets.Add(After=wb.Sheets(wb.Sheets.Count))
        ws_void.Name = "الأذون الملغية"
        ws_void.DisplayRightToLeft = True

        # Sheet Header
        ws_void.Range("A1:J1").Merge()
        ws_void.Range("A1").Value = "سجل الأذون الملغية والمستبعدة من الحركة المخزنية - The Calm WMS"
        ws_void.Range("A1").Font.Name = "Calibri"
        ws_void.Range("A1").Font.Size = 16
        ws_void.Range("A1").Font.Bold = True
        ws_void.Range("A1").Font.Color = 0xFFFFFF
        ws_void.Range("A1").Interior.Color = 0x1F2937 # Dark Gray/Blue
        ws_void.Range("A1").HorizontalAlignment = -4108 # Center
        ws_void.Range("A1").VerticalAlignment = -4108

        ws_void.Range("A2:J2").Merge()
        ws_void.Range("A2").Value = "ملاحظة: تم تخصيص الكود الصوري 9999 لجميع الأذون الملغية مع الإبقاء على أرقامها بالدفاتر الأصلية لمنع أي فجوات رقمية"
        ws_void.Range("A2").Font.Name = "Calibri"
        ws_void.Range("A2").Font.Size = 11
        ws_void.Range("A2").Font.Italic = True
        ws_void.Range("A2").Interior.Color = 0xE5E7EB
        ws_void.Range("A2").HorizontalAlignment = -4108

        # --- Table 1: Voided Additions ---
        ws_void.Range("A4:H4").Merge()
        ws_void.Range("A4").Value = f"أولاً: أذون الإضافة الملغية (إجمالي {len(void_add_records)} أذون)"
        ws_void.Range("A4").Font.Bold = True
        ws_void.Range("A4").Font.Size = 13
        ws_void.Range("A4").Font.Color = 0xFFFFFF
        ws_void.Range("A4").Interior.Color = 0x065F46 # Dark Emerald
        ws_void.Range("A4").HorizontalAlignment = -4108

        add_headers = ["م", "التاريخ", "رقم إذن الإضافة", "الكود المخصص", "اسم الصنف", "الكمية", "نوع الحركة", "حالة الإلغاء والبيان"]
        for c_idx, h_text in enumerate(add_headers, start=1):
            cell = ws_void.Cells(5, c_idx)
            cell.Value = h_text
            cell.Font.Bold = True
            cell.Font.Size = 11
            cell.Interior.Color = 0xD1FAE5
            cell.HorizontalAlignment = -4108
            cell.Borders.LineStyle = 1

        curr_r = 6
        for item in void_add_records:
            ws_void.Cells(curr_r, 1).Value = item["serial"]
            ws_void.Cells(curr_r, 2).Value = item["date"]
            ws_void.Cells(curr_r, 3).Value = item["voucher"]
            ws_void.Cells(curr_r, 4).Value = item["code"]
            ws_void.Cells(curr_r, 5).Value = item["name"]
            ws_void.Cells(curr_r, 6).Value = item["qty"]
            ws_void.Cells(curr_r, 7).Value = item["type"]
            ws_void.Cells(curr_r, 8).Value = item["notes"]
            for c_idx in range(1, 9):
                c = ws_void.Cells(curr_r, c_idx)
                c.HorizontalAlignment = -4108
                c.Borders.LineStyle = 1
                if curr_r % 2 == 0:
                    c.Interior.Color = 0xF9FAFB
            curr_r += 1

        # --- Table 2: Voided Disbursements ---
        curr_r += 2
        ws_void.Range(f"A{curr_r}:I{curr_r}").Merge()
        ws_void.Range(f"A{curr_r}").Value = f"ثانياً: أذون الصرف الملغية (إجمالي {len(void_dis_records)} إذناً)"
        ws_void.Range(f"A{curr_r}").Font.Bold = True
        ws_void.Range(f"A{curr_r}").Font.Size = 13
        ws_void.Range(f"A{curr_r}").Font.Color = 0xFFFFFF
        ws_void.Range(f"A{curr_r}").Interior.Color = 0x991B1B # Dark Crimson
        ws_void.Range(f"A{curr_r}").HorizontalAlignment = -4108

        curr_r += 1
        dis_headers = ["م", "التاريخ", "الجهة المسجلة", "رقم إذن الصرف", "الكود المخصص", "اسم الصنف", "الكمية", "نوع الحركة", "حالة الإلغاء والبيان"]
        for c_idx, h_text in enumerate(dis_headers, start=1):
            cell = ws_void.Cells(curr_r, c_idx)
            cell.Value = h_text
            cell.Font.Bold = True
            cell.Font.Size = 11
            cell.Interior.Color = 0xFEE2E2
            cell.HorizontalAlignment = -4108
            cell.Borders.LineStyle = 1

        curr_r += 1
        for item in void_dis_records:
            ws_void.Cells(curr_r, 1).Value = item["serial"]
            ws_void.Cells(curr_r, 2).Value = item["date"]
            ws_void.Cells(curr_r, 3).Value = item["dept"]
            ws_void.Cells(curr_r, 4).Value = item["voucher"]
            ws_void.Cells(curr_r, 5).Value = item["code"]
            ws_void.Cells(curr_r, 6).Value = item["name"]
            ws_void.Cells(curr_r, 7).Value = item["qty"]
            ws_void.Cells(curr_r, 8).Value = item["type"]
            ws_void.Cells(curr_r, 9).Value = item["notes"]
            for c_idx in range(1, 10):
                c = ws_void.Cells(curr_r, c_idx)
                c.HorizontalAlignment = -4108
                c.Borders.LineStyle = 1
                if curr_r % 2 == 0:
                    c.Interior.Color = 0xF9FAFB
            curr_r += 1

        # Autofit columns
        ws_void.Columns("A:J").AutoFit()
        print("   -> Sheet 'الأذون الملغية' created and formatted successfully.")

        # --- STEP 4: Create Sheet 'الوارد من التشغيل (مستعمل)' ---
        print("\n5. Creating Sheet 'الوارد من التشغيل (مستعمل)'...")
        for i in range(1, wb.Sheets.Count + 1):
            if wb.Sheets(i).Name == "الوارد من التشغيل (مستعمل)":
                wb.Sheets(i).Delete()
                break

        # Place right after 'الصرف'
        ws_used = wb.Sheets.Add(After=wb.Sheets("الصرف"))
        ws_used.Name = "الوارد من التشغيل (مستعمل)"
        ws_used.DisplayRightToLeft = True

        # Main Banner
        ws_used.Range("A1:M1").Merge()
        ws_used.Range("A1").Value = "سجل الوارد من التشغيل والمهمات المستعملة (Operational Returns Ledger) - The Calm WMS"
        ws_used.Range("A1").Font.Name = "Calibri"
        ws_used.Range("A1").Font.Size = 16
        ws_used.Range("A1").Font.Bold = True
        ws_used.Range("A1").Font.Color = 0xFFFFFF
        ws_used.Range("A1").Interior.Color = 0x047857 # Calm Emerald
        ws_used.Range("A1").HorizontalAlignment = -4108
        ws_used.Range("A1").VerticalAlignment = -4108
        ws_used.Rows(1).RowHeight = 35

        # Sub-banner
        ws_used.Range("A2:M2").Merge()
        ws_used.Range("A2").Value = "شركة ذا كالم لإدارة المرافق والخدمات | موقع ستون رزيدنس - التجمع الخامس | قسم إدارة المخزون الفني"
        ws_used.Range("A2").Font.Name = "Calibri"
        ws_used.Range("A2").Font.Size = 11
        ws_used.Range("A2").Font.Bold = True
        ws_used.Range("A2").Font.Color = 0x1F2937
        ws_used.Range("A2").Interior.Color = 0xE6F4EA
        ws_used.Range("A2").HorizontalAlignment = -4108
        ws_used.Rows(2).RowHeight = 22

        # KPI Summary Cards (Rows 3-4)
        cards = [
            ("B3:C3", "B4:C4", "إجمالي الحركات المستلمة", '=COUNTA(C7:C500)', 0x1E3A8A, 0xDBEAFE),
            ("E3:F3", "E4:F4", "صالح لإعادة الاستخدام", '=COUNTIF(J7:J500, "صالح للاستخدام")', 0x065F46, 0xD1FAE5),
            ("H3:I3", "H4:I4", "يحتاج فحص وصيانة", '=COUNTIF(J7:J500, "يحتاج صيانة")', 0x92400E, 0xFEF3C7),
            ("K3:L3", "K4:L4", "كهنة وسكراب تالف", '=COUNTIF(J7:J500, "كهنة سكراب")', 0x991B1B, 0xFEE2E2),
        ]

        for title_rng, val_rng, title_txt, formula_val, dark_c, light_c in cards:
            ws_used.Range(title_rng).Merge()
            ws_used.Range(title_rng).Value = title_txt
            ws_used.Range(title_rng).Font.Bold = True
            ws_used.Range(title_rng).Font.Size = 10
            ws_used.Range(title_rng).Font.Color = 0xFFFFFF
            ws_used.Range(title_rng).Interior.Color = dark_c
            ws_used.Range(title_rng).HorizontalAlignment = -4108

            ws_used.Range(val_rng).Merge()
            ws_used.Range(val_rng).Formula = formula_val
            ws_used.Range(val_rng).Font.Bold = True
            ws_used.Range(val_rng).Font.Size = 14
            ws_used.Range(val_rng).Interior.Color = light_c
            ws_used.Range(val_rng).HorizontalAlignment = -4108
            ws_used.Range(val_rng).Borders.LineStyle = 1

        ws_used.Rows(3).RowHeight = 20
        ws_used.Rows(4).RowHeight = 26
        ws_used.Rows(5).RowHeight = 10

        # Table Column Headers (Row 6)
        used_headers = [
            "م", "التاريخ", "رقم إذن المرتجع", "الفني / الجهة المسلمة",
            "القسم التابع له", "كود الصنف المرجعي", "اسم الصنف المستعمل",
            "الوحدة", "الكمية المستلمة", "الحالة الفنية",
            "مكان التخزين الميداني", "رقم أمر الشغل / المحضر", "الملاحظات والبيان"
        ]

        for c_idx, h_text in enumerate(used_headers, start=1):
            cell = ws_used.Cells(6, c_idx)
            cell.Value = h_text
            cell.Font.Name = "Calibri"
            cell.Font.Bold = True
            cell.Font.Size = 11
            cell.Font.Color = 0xFFFFFF
            cell.Interior.Color = 0x064E3B # Deep Emerald
            cell.HorizontalAlignment = -4108
            cell.VerticalAlignment = -4108
            cell.Borders.LineStyle = 1

        ws_used.Rows(6).RowHeight = 28

        # Add 3 Initial Sample Demonstrative Entries
        sample_entries = [
            (1, "2026-09-15", "RET-2026-001", "أحمد إبراهيم (سباكة)", "أدوات سباكة", 101299, "محبس 6 بوصة بولندي (مستعمل بحالة جيدة)", "عدد", 1, "صالح للاستخدام", "مستودع الرجيع - رف B1", "WO-4412", "تم فكه من عمارة 120 بعد إحلال محبس أكبر، صالح تماماً"),
            (2, "2026-09-20", "RET-2026-002", "محمود متولي (كهرباء)", "أدوات كهربائية", 100297, "شلباية عمود نور بالترنس (تحتاج صيانة)", "عدد", 2, "يحتاج صيانة", "ورشة صيانة الكهرباء", "WO-4480", "مرتجع من أعمدة المنطقة 4، بحاجة لتغيير الترنس الداخلي"),
            (3, "2026-09-28", "RET-2026-003", "محمد حسن (ري)", "أدوات خامات الري", 102110, "حربة تثبيت 20 سم مكسورة (كهنة)", "عدد", 15, "كهنة سكراب", "ساحة تخريد المهمات", "WO-4530", "تالفة أثناء أعمال حفر خط الري الرئيسي، غير صالحة"),
        ]

        for idx, row_data in enumerate(sample_entries, start=7):
            for c_idx, val in enumerate(row_data, start=1):
                cell = ws_used.Cells(idx, c_idx)
                cell.Value = val
                cell.Font.Name = "Calibri"
                cell.Font.Size = 10
                cell.HorizontalAlignment = -4108
                cell.VerticalAlignment = -4108
                cell.Borders.LineStyle = 1
                if idx % 2 == 0:
                    cell.Interior.Color = 0xF9FAFB

        # Pre-format rows 10 to 100 for future data entry
        for r_idx in range(10, 101):
            ws_used.Cells(r_idx, 1).Value = r_idx - 6 # serial
            for c_idx in range(1, 14):
                c = ws_used.Cells(r_idx, c_idx)
                c.Font.Name = "Calibri"
                c.Font.Size = 10
                c.HorizontalAlignment = -4108
                c.VerticalAlignment = -4108
                c.Borders.LineStyle = 1
                if r_idx % 2 == 0:
                    c.Interior.Color = 0xF9FAFB

        # Set specific column widths for optimal display
        col_widths = {
            1: 6,   # م
            2: 13,  # التاريخ
            3: 16,  # رقم إذن المرتجع
            4: 24,  # الفني / الجهة
            5: 20,  # القسم التابع له
            6: 18,  # كود الصنف المرجعي
            7: 35,  # اسم الصنف المستعمل
            8: 10,  # الوحدة
            9: 14,  # الكمية المستلمة
            10: 18, # الحالة الفنية
            11: 24, # مكان التخزين الميداني
            12: 22, # رقم أمر الشغل
            13: 40  # الملاحظات والبيان
        }
        for col_num, width in col_widths.items():
            ws_used.Columns(col_num).ColumnWidth = width

        print("   -> Sheet 'الوارد من التشغيل (مستعمل)' created and formatted successfully.")

        # Save the workbook natively via Excel COM
        print("\n6. Saving Workbook natively via Excel COM...")
        wb.Save()
        wb.Close(SaveChanges=True)
        print("   Workbook saved and closed cleanly.")

    finally:
        excel.Quit()
        print("7. Excel application terminated cleanly.")

    # --- STEP 5: Organize Downloads Folder ---
    print("\n8. Organizing Downloads Folder...")
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    print(f"   Archive folder created/verified: {ARCHIVE_DIR}")

    # Patterns to move to archive
    archive_patterns = [
        "The_Calm_WMS_V2_BACKUP_*.xlsx",
        "The_Calm_WMS_V2_المحدث_*.xlsx",
        "The_Calm_WMS_V2_المضبوط_*.xlsx",
        "The_Calm_WMS_V2_النسخة_النهائية_*.xlsx",
        "The_Calm_WMS_V2_PRE_*.xlsx",
        "The_Calm_WMS_V2_RESTORED_*.xlsx",
        "The_Calm_WMS_V2_FIXED_*.xlsx",
    ]

    moved_count = 0
    for pat in archive_patterns:
        matches = glob.glob(os.path.join(DOWNLOADS_DIR, pat))
        for f in matches:
            # Don't move the master file itself
            if os.path.abspath(f) == os.path.abspath(EXCEL_FILE):
                continue
            dest = os.path.join(ARCHIVE_DIR, os.path.basename(f))
            try:
                if os.path.exists(dest):
                    os.remove(dest)
                shutil.move(f, dest)
                print(f"   -> Moved to archive: {os.path.basename(f)}")
                moved_count += 1
            except Exception as e:
                print(f"   -> Error moving {os.path.basename(f)}: {e}")

    # Delete temporary test files in Downloads
    temp_patterns = [
        "temp_saved_*.xlsx",
        "test_*.xlsx",
        "clean_output_*.xlsx",
        "*_TEST.xlsx",
        "The_Calm_WMS_V2_TEST_*.xlsx"
    ]
    deleted_count = 0
    for pat in temp_patterns:
        matches = glob.glob(os.path.join(DOWNLOADS_DIR, pat))
        for f in matches:
            if os.path.abspath(f) == os.path.abspath(EXCEL_FILE):
                continue
            try:
                os.remove(f)
                print(f"   -> Deleted temp file: {os.path.basename(f)}")
                deleted_count += 1
            except Exception as e:
                print(f"   -> Error deleting {os.path.basename(f)}: {e}")

    print(f"\nFolder Organization Complete: {moved_count} files archived, {deleted_count} temp files cleaned.")
    print("==================================================")
    print("PHASE 1 EXECUTION COMPLETE!")
    print("==================================================")

if __name__ == "__main__":
    execute_phase1()
