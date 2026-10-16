import sys, os, openpyxl

sys.stdout.reconfigure(encoding="utf-8")

excel_path = r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx'
wb = openpyxl.load_workbook(excel_path, data_only=True)

ws_add = wb['الاضافة']
ws_disp = wb['الصرف']

# 1. ADDITIONS: rows 1581 to 1691 (vouchers 257 to 276)
add_headers = ["م (صف الإكسيل)", "التاريخ", "رقم الإذن", "كود الصنف", "اسم الصنف", "الوحدة", "الكمية", "نوع الحركة", "البيان / الملاحظات"]
add_rows = []

for r in range(1581, 1692):
    vals = [ws_add.cell(r, c).value for c in range(1, 10)]
    # format date
    d_val = vals[1]
    d_str = d_val.strftime("%Y-%m-%d") if hasattr(d_val, "strftime") else str(d_val or "")
    v_num = str(vals[2] if vals[2] is not None else "")
    code = str(vals[3] if vals[3] is not None else "")
    name = str(vals[4] if vals[4] is not None else "")
    unit = str(vals[5] if vals[5] is not None else "")
    qty = str(vals[6] if vals[6] is not None else "")
    move_type = str(vals[7] if vals[7] is not None else "")
    notes = str(vals[8] if vals[8] is not None else "")
    add_rows.append([str(r), d_str, v_num, code, name, unit, qty, move_type, notes])

# 2. DISBURSEMENTS: rows 2499 to 2646 (vouchers 698 to 745)
disp_headers = ["م (صف الإكسيل)", "التاريخ", "الجهة المنصرف إليها", "رقم الإذن", "كود الصنف", "اسم الصنف", "الوحدة", "الكمية", "نوع الحركة", "البيان / الملاحظات"]
disp_rows = []

for r in range(2499, 2647):
    vals = [ws_disp.cell(r, c).value for c in range(1, 11)]
    d_val = vals[1]
    d_str = d_val.strftime("%Y-%m-%d") if hasattr(d_val, "strftime") else str(d_val or "")
    dest = str(vals[2] if vals[2] is not None else "")
    v_num = str(vals[3] if vals[3] is not None else "")
    code = str(vals[4] if vals[4] is not None else "")
    name = str(vals[5] if vals[5] is not None else "")
    unit = str(vals[6] if vals[6] is not None else "")
    qty = str(vals[7] if vals[7] is not None else "")
    move_type = str(vals[8] if vals[8] is not None else "")
    notes = str(vals[9] if vals[9] is not None else "")
    disp_rows.append([str(r), d_str, dest, v_num, code, name, unit, qty, move_type, notes])

print(f"Collected {len(add_rows)} addition rows and {len(disp_rows)} disbursement rows.")

# Generate Markdown Content
md = []
md.append("# التوثيق الشامل والنهائي لكافة أذون الإضافة والصرف المملات (من البداية حتى النهاية)")
md.append("\n## 📌 الملخص الإحصائي المعتمد")
md.append("- **حركات الإضافة (الوارد):** تبدأ من **إذن إضافة رقم [257]** (صف إكسيل 1581، تاريخ 16/09/2026) حتى **إذن إضافة رقم [276]** (صف إكسيل 1691، تاريخ 29/09/2026).")
md.append("  * إجمالي الأذون: **20 إذناً** متصلة.")
md.append(f"  * إجمالي الحركات المقيدة: **{len(add_rows)} حركة وارد**.")
md.append("  * (كان آخر إذن إضافة قديم مسجل قبل بدء الإملاء هو إذن رقم [256] بتاريخ 15/09/2026).\n")
md.append("- **حركات الصرف (المنصرف):** تبدأ من **إذن صرف رقم [698]** (صف إكسيل 2499، تاريخ 15/09/2026) حتى **إذن صرف رقم [745]** (صف إكسيل 2646، تاريخ 29/09/2026).")
md.append("  * إجمالي الأذون: **48 إذناً** متصلة.")
md.append(f"  * إجمالي الحركات المقيدة: **{len(disp_rows)} حركة صرف**.")
md.append("  * (كان آخر إذن صرف قديم مسجل قبل بدء الإملاء هو إذن رقم [697] بتاريخ 15/09/2026).\n")
md.append("---\n")

# Table 1: Additions
md.append(f"## أولاً: جدول أذون الإضافة بالكامل (1:1 طبق الأصل من شيت الإضافة - إجمالي {len(add_rows)} حركة)\n")
md.append("| " + " | ".join(add_headers) + " |")
md.append("| " + " | ".join(["---"] * len(add_headers)) + " |")
for row in add_rows:
    md.append("| " + " | ".join(row) + " |")

md.append("\n---\n")

# Table 2: Disbursements
md.append(f"## ثانياً: جدول أذون الصرف بالكامل (1:1 طبق الأصل من شيت الصرف - إجمالي {len(disp_rows)} حركة)\n")
md.append("| " + " | ".join(disp_headers) + " |")
md.append("| " + " | ".join(["---"] * len(disp_headers)) + " |")
for row in disp_rows:
    md.append("| " + " | ".join(row) + " |")

content = "\n".join(md)

# Save to Excel_Database
out_path_1 = r'D:\The_Calm_WMS_V2.1\Excel_Database\ALL_DICTATED_VOUCHERS_FULL_AUDIT.md'
with open(out_path_1, 'w', encoding='utf-8') as f:
    f.write(content)

# Save to Brain Artifacts
out_path_2 = r'C:\Users\Mohamed Helmy\.gemini\antigravity\brain\4644325f-c2d1-44e5-8356-23b4b57cbdd3\all_dictated_vouchers_full_audit.md'
with open(out_path_2, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully generated files:\n1. {out_path_1}\n2. {out_path_2}")
