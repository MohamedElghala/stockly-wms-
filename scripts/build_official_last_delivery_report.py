import sys, os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.append(SCRIPT_DIR)
from official_document_template import (
    create_official_document, add_official_signatures_footer,
    set_cell_background, set_cell_margins, set_table_borders,
    make_table_rtl, set_p_rtl, add_arabic_run
)
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import win32com.client

doc, sig_info = create_official_document(
    subject="محضر فحص فني",
    date_str="28 / 9 / 2026",
    inspector_role="مشرف الكهرباء",
    inspector_name="م / محمود متولي",
    warehouse_keeper_name="أ / محمد حلمي",
    project_manager_name="م / محمد عدوي"
)

# Title & Subtitle
p_title = doc.add_paragraph()
set_p_rtl(p_title)
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title.paragraph_format.space_before = Pt(4)
p_title.paragraph_format.space_after = Pt(2)
add_arabic_run(p_title, "محضر فحص فني ومطابقة للمواصفات وتوريد مخزني", font_size=14, bold=True, color=RGBColor(31, 78, 121))

p_sub = doc.add_paragraph()
set_p_rtl(p_sub)
p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_sub.paragraph_format.space_after = Pt(8)
add_arabic_run(p_sub, "المورد: شركة جودة الكتريك | تاريخ التوريد: 28-09-2026 | أذون إضافة رقم [ 268 ، 269 ، 270 ]", font_size=10, italic=True, color=RGBColor(71, 85, 105))

# Meta Table
meta_tbl = doc.add_table(rows=2, cols=2)
make_table_rtl(meta_tbl)
meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
set_table_borders(meta_tbl, color="CBD5E1", sz="4")

meta_data = [
    [("المشروع:", "ذا كالم (The Calm)"), ("المورد:", "جودة الكتريك")],
    [("تاريخ التوريد والمعاينة:", "28 / 09 / 2026 م"), ("أذون الإضافة المخزنية:", "268 ، 269 ، 270 (إجمالي 20 صنفاً)")]
]

for row_idx, row in enumerate(meta_data):
    for col_idx, (lbl, val) in enumerate(row):
        c = meta_tbl.cell(row_idx, col_idx)
        set_cell_background(c, "F8FAFC" if col_idx == 0 else "FFFFFF")
        set_cell_margins(c, top=50, bottom=50, left=70, right=70)
        p = c.paragraphs[0]
        set_p_rtl(p)
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        add_arabic_run(p, lbl + " ", font_size=9, bold=True, color=RGBColor(31, 78, 121))
        add_arabic_run(p, val, font_size=9, bold=False, color=RGBColor(30, 41, 59))

# Statements Paragraph
p_stmts = doc.add_paragraph()
set_p_rtl(p_stmts)
p_stmts.paragraph_format.space_before = Pt(6)
p_stmts.paragraph_format.space_after = Pt(6)
add_arabic_run(p_stmts, "• إقرار الفحص والمعاينة الفنية (مشرف الكهرباء): ", font_size=9.5, bold=True, color=RGBColor(31, 78, 121))
add_arabic_run(p_stmts, "تمت المعاينة الفنية والظاهرية لكافة المهمات الموردة بتاريخ 28-09-2026 على الطبيعة، وثبتت مطابقتها التامة للمواصفات الفنية المعتمدة للمشروع وأصول الصنعة وخلوها من أي عيوب، وتم التصريح بإيداعها بالمخزن.\n", font_size=9, color=RGBColor(51, 65, 85))

add_arabic_run(p_stmts, "• إقرار الاستلام والتوريد المخزني (أمين المخزن): ", font_size=9.5, bold=True, color=RGBColor(31, 78, 121))
add_arabic_run(p_stmts, "تم استلام الأصناف الواردة أدناه فعلياً بالعدد والوزن، وتسكينها بمخازن المشروع وإضافتها إلكترونياً بالمنظومة بموجب أذون الإضافة الموضحة أدناه.", font_size=9, color=RGBColor(51, 65, 85))

# Table of 20 items
items_20 = [
    ("1", "2026-09-28", "268", "100101", "كشاف 20*20 غاطس ورم", "عدد", "290", "مطابق للمواصفات"),
    ("2", "2026-09-28", "268", "100110", "كشاف 15*15 مربع ورم", "عدد", "202", "مطابق للمواصفات"),
    ("3", "2026-09-28", "268", "100103", "كشاف 20*20 مدور ورم", "عدد", "300", "مطابق للمواصفات"),
    ("4", "2026-09-28", "268", "116125", "صامولة كلبس بواب 5 مم", "عدد", "4000", "مطابق للمواصفات"),
    ("5", "2026-09-28", "268", "100112", "خلية ضوئية", "عدد", "100", "مطابق للمواصفات"),
    ("6", "2026-09-28", "268", "116108", "سبراي أمير", "عدد", "10", "مطابق للمواصفات"),
    ("7", "2026-09-28", "268", "100109", "لفة سلك 100 م ترمو 3*3", "متر", "2", "مطابق للمواصفات"),
    ("8", "2026-09-28", "269", "100114", "لفة سلك 1.5مم", "لفة", "2", "مطابق للمواصفات"),
    ("9", "2026-09-28", "269", "100120", "اعواد دكت", "عدد", "120", "مطابق للمواصفات"),
    ("10", "2026-09-28", "269", "100319", "سلك سماعات 1 مم", "لفة", "1", "مطابق للمواصفات"),
    ("11", "2026-09-28", "269", "116132", "مسمار سن صاج 3 سم", "علبة", "4", "مطابق للمواصفات"),
    ("12", "2026-09-28", "269", "116121", "علبة فيشر 6 مم", "علبة", "4", "مطابق للمواصفات"),
    ("13", "2026-09-28", "269", "116122", "علبة فيشر 8 مم", "علبة", "4", "مطابق للمواصفات"),
    ("14", "2026-09-28", "269", "116126", "مسمار بواب (بواط)", "كيلو", "16", "مطابق للمواصفات"),
    ("15", "2026-09-28", "270", "116123", "مسمار حرف L 6 مم", "علبة", "11", "مطابق للمواصفات"),
    ("16", "2026-09-28", "270", "116124", "مسمار حرف L 8 مم", "علبة", "7", "مطابق للمواصفات"),
    ("17", "2026-09-28", "270", "116104", "لفة شريط لحام (10 بكرات)", "لفة", "20", "مطابق للمواصفات"),
    ("18", "2026-09-28", "270", "116107", "لاصق 2/1 سريع اسبرية كبير", "عدد", "10", "مطابق للمواصفات"),
    ("19", "2026-09-28", "270", "116105", "بكرة قصدير لحام", "بكرة", "10", "مطابق للمواصفات"),
    ("20", "2026-09-28", "270", "115105", "علبة مبرد", "عدد", "10", "مطابق للمواصفات"),
]

headers_cols = ["م", "التاريخ", "رقم الإذن", "كود الصنف", "اسم الصنف والمواصفة", "الوحدة", "الكمية", "الحالة الفنية"]
col_widths = [Inches(0.35), Inches(0.8), Inches(0.65), Inches(0.7), Inches(2.3), Inches(0.5), Inches(0.55), Inches(0.95)]

table = doc.add_table(rows=len(items_20) + 1, cols=len(headers_cols))
make_table_rtl(table)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
set_table_borders(table, color="B0C4DE", sz="4")

# Header Row
hdr_cells = table.rows[0].cells
for i, title in enumerate(headers_cols):
    hdr_cells[i].width = col_widths[i]
    set_cell_background(hdr_cells[i], "1F4E79")
    set_cell_margins(hdr_cells[i], top=50, bottom=50, left=40, right=40)
    p = hdr_cells[i].paragraphs[0]
    set_p_rtl(p)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_arabic_run(p, title, font_size=8.5, bold=True, color=RGBColor(255, 255, 255))

for r_idx, item in enumerate(items_20):
    row_cells = table.rows[r_idx + 1].cells
    bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
    for c_idx, val in enumerate(item):
        row_cells[c_idx].width = col_widths[c_idx]
        set_cell_background(row_cells[c_idx], bg_color)
        set_cell_margins(row_cells[c_idx], top=35, bottom=35, left=35, right=35)
        p = row_cells[c_idx].paragraphs[0]
        set_p_rtl(p)
        if c_idx == 4:
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            add_arabic_run(p, val, font_size=8.5, bold=True, color=RGBColor(30, 41, 59))
        else:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            if c_idx == 7:
                add_arabic_run(p, val, font_size=8, bold=True, color=RGBColor(22, 101, 52))
            else:
                add_arabic_run(p, val, font_size=8.5, color=RGBColor(51, 65, 85))

# Add official 3-column signatures footer
add_official_signatures_footer(doc, sig_info)

from config import REPORTS_DIR
out_docx = os.path.join(REPORTS_DIR, "تقرير_فحص_فني_اخر_توريدة_جودة_الكتريك_الرسمي.docx")
out_pdf = os.path.join(REPORTS_DIR, "تقرير_فحص_فني_اخر_توريدة_جودة_الكتريك_الرسمي.pdf")

doc.save(out_docx)
print("SUCCESS_SAVED_DOCX")

# Convert to PDF via Word COM
word = win32com.client.DispatchEx('Word.Application')
word.Visible = False
try:
    wdoc = word.Documents.Open(out_docx)
    wdoc.SaveAs(out_pdf, FileFormat=17)
    wdoc.Close()
    print("SUCCESS_SAVED_PDF")
finally:
    word.Quit()
