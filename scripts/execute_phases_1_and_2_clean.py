import sys
import os
import shutil
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client

MASTER_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"
BACKUP_FILE = r"C:\Users\Mohamed Helmy\Downloads\أرشيف_نسخ_الاحتياط_The_Calm\The_Calm_WMS_V2_BACKUP_BEFORE_PHASE1_CLEANUP.xlsx"

DEPARTMENTS = [
    "أدوات كهربائية",
    "أدوات سباكة",
    "أدوات خامات الري",
    "حمامات سباحة",
    "مستلزمات نظافة",
    "أدوات نقاشة",
    "أدوات وخامات نجارة",
    "أدوات عامة",
    "أدوات سيكوريت",
    "أدوات الوميتال",
    "أدوات مكاتب",
    "أدوات ميكانيكا",
    "أدوات الأمن وكاميرات المراقبة",
    "رخام ومواد بناء",
    "ملابس",
    "عدد و معدات",
    "قسم المستهلكات",
    "الصيانة",
    "الزراعة",
    "الأمن",
    "المسطحات المائية",
    "مكتب الإدارة"
]

def apply_validation_list(range_obj, formula_or_list):
    try:
        val = range_obj.Validation
        val.Delete()
        val.Add(Type=3, AlertStyle=1, Operator=1, Formula1=formula_or_list)
        val.IgnoreBlank = True
        val.InCellDropdown = True
    except Exception as e:
        print(f"      [Validation Warning] {range_obj.Address}: {e}")

def run_pipeline():
    print("==================================================")
    print("EXECUTING CLEAN PHASE 1 & 2 PIPELINE")
    print("==================================================")

    # 1. Restore pristine copy from backup
    print("1. Restoring master file from verified safety backup...")
    shutil.copy2(BACKUP_FILE, MASTER_FILE)
    print("   Restored cleanly.")

    # 2. Launch Excel COM
    print("2. Launching Excel COM Application...")
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        wb = excel.Workbooks.Open(os.path.abspath(MASTER_FILE))
        print("   Workbook opened via Excel COM.")

        # ==================================================
        # PHASE 1: DATA HYGIENE
        # ==================================================
        print("\n--- PHASE 1: DATA HYGIENE ---")
        ws_bal = wb.Sheets("أرصدة المخزن")
        ws_bal.Cells(200, 4).Value = "عدد"
        ws_bal.Cells(3054, 4).Value = "عدد"
        ws_bal.Cells(3543, 4).Value = "لفة"
        print("   -> Set 3 missing units (Rows 200, 3054, 3543).")

        # Voided vouchers in الاضافة
        ws_add = wb.Sheets("الاضافة")
        void_add_records = []
        for r in range(7, ws_add.UsedRange.Rows.Count + 10):
            c_val = ws_add.Cells(r, 4).Value
            if c_val == 2345 or str(c_val).strip() == "2345":
                void_add_records.append({
                    "serial": ws_add.Cells(r, 1).Value,
                    "date": ws_add.Cells(r, 2).Value,
                    "voucher": ws_add.Cells(r, 3).Value,
                    "code": 9999,
                    "name": "إذن ملغي",
                    "qty": 0,
                    "type": ws_add.Cells(r, 8).Value or "إضافة",
                    "notes": "إذن ملغي - مؤرشف بالسجل المستقل"
                })
                ws_add.Cells(r, 4).Value = 9999
                ws_add.Cells(r, 5).Value = "إذن ملغي"
                ws_add.Cells(r, 6).Value = "-"
                ws_add.Cells(r, 7).Value = 0
                ws_add.Cells(r, 9).Value = "إذن ملغي - مؤرشف بالسجل المستقل"

        print(f"   -> Updated {len(void_add_records)} void rows in 'الاضافة' to code 9999.")

        # Voided vouchers in الصرف
        ws_dis = wb.Sheets("الصرف")
        void_dis_records = []
        for r in range(7, ws_dis.UsedRange.Rows.Count + 10):
            c_val = ws_dis.Cells(r, 5).Value
            if c_val == 2345 or str(c_val).strip() == "2345":
                void_dis_records.append({
                    "serial": ws_dis.Cells(r, 1).Value,
                    "date": ws_dis.Cells(r, 2).Value,
                    "dept": ws_dis.Cells(r, 3).Value or "-",
                    "voucher": ws_dis.Cells(r, 4).Value,
                    "code": 9999,
                    "name": "إذن ملغي",
                    "qty": 0,
                    "type": ws_dis.Cells(r, 9).Value or "صرف",
                    "notes": "إذن ملغي - مؤرشف بالسجل المستقل"
                })
                ws_dis.Cells(r, 5).Value = 9999
                ws_dis.Cells(r, 6).Value = "إذن ملغي"
                ws_dis.Cells(r, 7).Value = "-"
                ws_dis.Cells(r, 8).Value = 0
                ws_dis.Cells(r, 10).Value = "إذن ملغي - مؤرشف بالسجل المستقل"

        print(f"   -> Updated {len(void_dis_records)} void rows in 'الصرف' to code 9999.")

        # Create sheet 'الأذون الملغية'
        for i in range(1, wb.Sheets.Count + 1):
            if wb.Sheets(i).Name == "الأذون الملغية":
                wb.Sheets(i).Delete()
                break

        ws_void = wb.Sheets.Add(After=wb.Sheets(wb.Sheets.Count))
        ws_void.Name = "الأذون الملغية"
        ws_void.DisplayRightToLeft = True

        ws_void.Range("A1:J1").Merge()
        ws_void.Range("A1").Value = "سجل الأذون الملغية والمستبعدة من الحركة المخزنية - The Calm WMS"
        ws_void.Range("A1").Font.Name = "Calibri"
        ws_void.Range("A1").Font.Size = 16
        ws_void.Range("A1").Font.Bold = True
        ws_void.Range("A1").Font.Color = 0xFFFFFF
        ws_void.Range("A1").Interior.Color = 0x1F2937
        ws_void.Range("A1").HorizontalAlignment = -4108

        ws_void.Range("A2:J2").Merge()
        ws_void.Range("A2").Value = "ملاحظة: تم تخصيص الكود الصوري 9999 لجميع الأذون الملغية مع الإبقاء على أرقامها بالدفاتر الأصلية لمنع أي فجوات رقمية"
        ws_void.Range("A2").Font.Name = "Calibri"
        ws_void.Range("A2").Font.Size = 11
        ws_void.Range("A2").Font.Italic = True
        ws_void.Range("A2").Interior.Color = 0xE5E7EB
        ws_void.Range("A2").HorizontalAlignment = -4108

        # Table 1: Additions
        ws_void.Range("A4:H4").Merge()
        ws_void.Range("A4").Value = f"أولاً: أذون الإضافة الملغية (إجمالي {len(void_add_records)} أذون)"
        ws_void.Range("A4").Font.Bold = True
        ws_void.Range("A4").Font.Size = 13
        ws_void.Range("A4").Font.Color = 0xFFFFFF
        ws_void.Range("A4").Interior.Color = 0x065F46
        ws_void.Range("A4").HorizontalAlignment = -4108

        add_headers = ["م", "التاريخ", "رقم إذن الإضافة", "الكود المخصص", "اسم الصنف", "الكمية", "نوع الحركة", "حالة الإلغاء والبيان"]
        for c_idx, h_text in enumerate(add_headers, start=1):
            cell = ws_void.Cells(5, c_idx)
            cell.Value = h_text
            cell.Font.Bold = True
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

        # Table 2: Disbursements
        curr_r += 2
        ws_void.Range(f"A{curr_r}:I{curr_r}").Merge()
        ws_void.Range(f"A{curr_r}").Value = f"ثانياً: أذون الصرف الملغية (إجمالي {len(void_dis_records)} إذناً)"
        ws_void.Range(f"A{curr_r}").Font.Bold = True
        ws_void.Range(f"A{curr_r}").Font.Size = 13
        ws_void.Range(f"A{curr_r}").Font.Color = 0xFFFFFF
        ws_void.Range(f"A{curr_r}").Interior.Color = 0x991B1B
        ws_void.Range(f"A{curr_r}").HorizontalAlignment = -4108

        curr_r += 1
        dis_headers = ["م", "التاريخ", "الجهة المسجلة", "رقم إذن الصرف", "الكود المخصص", "اسم الصنف", "الكمية", "نوع الحركة", "حالة الإلغاء والبيان"]
        for c_idx, h_text in enumerate(dis_headers, start=1):
            cell = ws_void.Cells(curr_r, c_idx)
            cell.Value = h_text
            cell.Font.Bold = True
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

        ws_void.Columns("A:J").AutoFit()
        print("   -> Sheet 'الأذون الملغية' created successfully.")

        # Create sheet 'الوارد من التشغيل (مستعمل)'
        for i in range(1, wb.Sheets.Count + 1):
            if wb.Sheets(i).Name == "الوارد من التشغيل (مستعمل)":
                wb.Sheets(i).Delete()
                break

        ws_used = wb.Sheets.Add(After=wb.Sheets("الصرف"))
        ws_used.Name = "الوارد من التشغيل (مستعمل)"
        ws_used.DisplayRightToLeft = True

        ws_used.Range("A1:M1").Merge()
        ws_used.Range("A1").Value = "سجل الوارد من التشغيل والمهمات المستعملة (Operational Returns Ledger) - The Calm WMS"
        ws_used.Range("A1").Font.Name = "Calibri"
        ws_used.Range("A1").Font.Size = 16
        ws_used.Range("A1").Font.Bold = True
        ws_used.Range("A1").Font.Color = 0xFFFFFF
        ws_used.Range("A1").Interior.Color = 0x047857
        ws_used.Range("A1").HorizontalAlignment = -4108
        ws_used.Rows(1).RowHeight = 35

        ws_used.Range("A2:M2").Merge()
        ws_used.Range("A2").Value = "شركة ذا كالم لإدارة المرافق والخدمات | موقع ستون رزيدنس - التجمع الخامس | قسم إدارة المخزون الفني"
        ws_used.Range("A2").Font.Name = "Calibri"
        ws_used.Range("A2").Font.Size = 11
        ws_used.Range("A2").Font.Bold = True
        ws_used.Range("A2").Font.Color = 0x1F2937
        ws_used.Range("A2").Interior.Color = 0xE6F4EA
        ws_used.Range("A2").HorizontalAlignment = -4108
        ws_used.Rows(2).RowHeight = 22

        # KPI cards
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

        used_headers = [
            "م", "التاريخ", "رقم إذن المرتجع", "الفني / الجهة المسلمة",
            "القسم التابع له", "كود الصنف المرجعي", "اسم الصنف المستعمل",
            "الوحدة", "الكمية المستلمة", "الحالة الفنية",
            "مكان التخزين الميداني", "رقم أمر الشغل / المحضر", "الملاحظات والبيان"
        ]
        for c_idx, h_text in enumerate(used_headers, start=1):
            cell = ws_used.Cells(6, c_idx)
            cell.Value = h_text
            cell.Font.Bold = True
            cell.Font.Color = 0xFFFFFF
            cell.Interior.Color = 0x064E3B
            cell.HorizontalAlignment = -4108
            cell.VerticalAlignment = -4108
            cell.Borders.LineStyle = 1

        ws_used.Rows(6).RowHeight = 28

        sample_entries = [
            (1, "2026-09-15", "RET-2026-001", "أحمد إبراهيم (سباكة)", "أدوات سباكة", 101299, "محبس 6 بوصة بولندي (مستعمل بحالة جيدة)", "عدد", 1, "صالح للاستخدام", "مستودع الرجيع - رف B1", "WO-4412", "تم فكه من عمارة 120 بعد إحلال محبس أكبر، صالح تماماً"),
            (2, "2026-09-20", "RET-2026-002", "محمود متولي (كهرباء)", "أدوات كهربائية", 100297, "شلباية عمود نور بالترنس (تحتاج صيانة)", "عدد", 2, "يحتاج صيانة", "ورشة صيانة الكهرباء", "WO-4480", "مرتجع من أعمدة المنطقة 4، بحاجة لتغيير الترنس الداخلي"),
            (3, "2026-09-28", "RET-2026-003", "محمد حسن (ري)", "أدوات خامات الري", 102110, "حربة تثبيت 20 سم مكسورة (كهنة)", "عدد", 15, "كهنة سكراب", "ساحة تخريد المهمات", "WO-4530", "تالفة أثناء أعمال حفر خط الري الرئيسي، غير صالحة"),
        ]
        for idx, row_data in enumerate(sample_entries, start=7):
            for c_idx, val in enumerate(row_data, start=1):
                cell = ws_used.Cells(idx, c_idx)
                cell.Value = val
                cell.HorizontalAlignment = -4108
                cell.Borders.LineStyle = 1
                if idx % 2 == 0:
                    cell.Interior.Color = 0xF9FAFB

        for r_idx in range(10, 101):
            ws_used.Cells(r_idx, 1).Value = r_idx - 6
            for c_idx in range(1, 14):
                c = ws_used.Cells(r_idx, c_idx)
                c.HorizontalAlignment = -4108
                c.Borders.LineStyle = 1
                if r_idx % 2 == 0:
                    c.Interior.Color = 0xF9FAFB

        col_widths = {
            1: 6, 2: 13, 3: 16, 4: 24, 5: 20, 6: 18, 7: 35,
            8: 10, 9: 14, 10: 18, 11: 24, 12: 22, 13: 40
        }
        for col_num, width in col_widths.items():
            ws_used.Columns(col_num).ColumnWidth = width

        print("   -> Sheet 'الوارد من التشغيل (مستعمل)' created successfully.")

        # ==================================================
        # PHASE 2: SAFEGUARDING & DATA VALIDATION
        # ==================================================
        print("\n--- PHASE 2: SAFEGUARDING & DATA VALIDATION ---")

        # 1. Populate Department Reference List in 'أرصدة المخزن' Column O
        ws_bal.Cells(3, 15).Value = "قائمة الأقسام المعتمدة"
        ws_bal.Cells(3, 15).Font.Bold = True
        for d_idx, d_name in enumerate(DEPARTMENTS, start=4):
            ws_bal.Cells(d_idx, 15).Value = d_name

        dept_range_formula = "='أرصدة المخزن'!$O$4:$O$" + str(3 + len(DEPARTMENTS))
        print(f"   -> Created Department Reference List in O4:O{3 + len(DEPARTMENTS)}.")

        # 2. Data Validation
        print("   -> Applying clean standard Data Validation...")
        # 'الوارد من التشغيل (مستعمل)' Column J: Technical Condition (Inline string < 255 chars)
        apply_validation_list(ws_used.Range("J7:J500"), "صالح للاستخدام,يحتاج صيانة,كهنة سكراب")
        # 'الوارد من التشغيل (مستعمل)' Column E: Department (Range formula)
        apply_validation_list(ws_used.Range("E7:E500"), dept_range_formula)

        # 'الاضافة' Column H: Movement Type (Inline string < 255 chars)
        apply_validation_list(ws_add.Range("H7:H3500"), "إضافة,مرتجع,تسوية جردية")

        # 'الصرف' Column I: Movement Type (Inline string < 255 chars)
        apply_validation_list(ws_dis.Range("I7:I3500"), "صرف,تالف,تسوية جردية")
        # 'الصرف' Column C: Destination Department (Range formula)
        apply_validation_list(ws_dis.Range("C7:C3500"), dept_range_formula)

        print("   -> Data validation rules applied successfully.")

        # 3. Cell Protection & Sheet Safeguarding
        print("   -> Applying cell protection and unlocking entry ranges...")

        # 'أرصدة المخزن'
        ws_bal.Unprotect()
        ws_bal.Cells.Locked = True
        ws_bal.Range("A4:E8503").Locked = False # Unlocked for catalog info & init bal
        ws_bal.Range("F4:H8503").Locked = True  # Locked SUMIFS & Balance
        ws_bal.Protect(DrawingObjects=False, Contents=True, Scenarios=True,
                       AllowFormattingCells=True, AllowFormattingColumns=True, AllowFormattingRows=True,
                       AllowSorting=True, AllowFiltering=True)

        # 'الاضافة'
        ws_add.Unprotect()
        ws_add.Cells.Locked = True
        ws_add.Range("C4").Locked = False      # Search box
        ws_add.Range("A7:D3500").Locked = False # Serial, Date, Voucher, Code
        ws_add.Range("G7:I3500").Locked = False # Qty, Type, Notes
        ws_add.Range("E7:F3500").Locked = True  # VLOOKUP formulas
        ws_add.Protect(DrawingObjects=False, Contents=True, Scenarios=True,
                       AllowFormattingCells=True, AllowFormattingColumns=True, AllowFormattingRows=True,
                       AllowSorting=True, AllowFiltering=True)

        # 'الصرف'
        ws_dis.Unprotect()
        ws_dis.Cells.Locked = True
        ws_dis.Range("C4").Locked = False       # Search box
        ws_dis.Range("A7:E3500").Locked = False # Serial, Date, Dept, Voucher, Code
        ws_dis.Range("H7:J3500").Locked = False # Qty, Type, Notes
        ws_dis.Range("F7:G3500").Locked = True  # VLOOKUP formulas
        ws_dis.Range("K7:K3500").Locked = True  # Balance formula
        ws_dis.Protect(DrawingObjects=False, Contents=True, Scenarios=True,
                       AllowFormattingCells=True, AllowFormattingColumns=True, AllowFormattingRows=True,
                       AllowSorting=True, AllowFiltering=True)

        # 'الوارد من التشغيل (مستعمل)'
        ws_used.Unprotect()
        ws_used.Cells.Locked = True
        ws_used.Range("A7:M500").Locked = False # Full entry allowed
        ws_used.Protect(DrawingObjects=False, Contents=True, Scenarios=True,
                        AllowFormattingCells=True, AllowFormattingColumns=True, AllowFormattingRows=True,
                        AllowSorting=True, AllowFiltering=True)

        # 'الأذون الملغية'
        ws_void.Unprotect()
        ws_void.Cells.Locked = True
        ws_void.Protect(DrawingObjects=False, Contents=True, Scenarios=True,
                        AllowFormattingCells=True, AllowFormattingColumns=True, AllowFormattingRows=True,
                        AllowSorting=True, AllowFiltering=True)

        # 'كارت الصنف'
        ws_card = wb.Sheets("كارت الصنف")
        ws_card.Unprotect()
        ws_card.Cells.Locked = True
        ws_card.Range("B3:C4").Locked = False
        ws_card.Protect(DrawingObjects=False, Contents=True, Scenarios=True,
                        AllowFormattingCells=True, AllowFormattingColumns=True, AllowFormattingRows=True,
                        AllowSorting=True, AllowFiltering=True)

        print("   -> Protection applied across all sheets cleanly.")

        # Save workbook cleanly via Excel COM
        print("\n3. Saving workbook via Excel COM...")
        wb.Save()
        wb.Close(SaveChanges=True)
        print("   Workbook saved and closed cleanly.")

    finally:
        excel.Quit()
        print("4. Excel application terminated cleanly.")

    print("\n==================================================")
    print("PIPELINE EXECUTED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_pipeline()
