import openpyxl
import json
import sys
import os
import shutil
import zipfile
import re
import win32com.client
from copy import copy

sys.stdout.reconfigure(encoding='utf-8')

backup_path = r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2_BACKUP_BEFORE_TREE_AND_8DIGIT_EXECUTION.xlsx'
target_path = r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx'

print("=== Starting Migration Execution ===")
print("Backup source:", backup_path)
print("Target file:", target_path)

shutil.copy(backup_path, target_path)
print("Restored clean target from backup.")

# Load tree catalog and code map
with open(r'scripts\scratch\tree_reorganized_catalog.json', 'r', encoding='utf-8') as f:
    tree_catalog = json.load(f)

with open(r'scripts\scratch\old_to_new_code_map.json', 'r', encoding='utf-8') as f:
    old_to_new = json.load(f)

dept_names = [
    (1, "أدوات كهربائية"),
    (2, "أدوات سباكة"),
    (3, "أدوات خامات الري"),
    (4, "حمامات سباحة"),
    (5, "مستلزمات نظافة"),
    (6, "أدوات نقاشة"),
    (7, "أدوات وخامات نجارة"),
    (8, "أدوات عامة"),
    (9, "أدوات سيكوريت"),
    (10, "أدوات الوميتال"),
    (11, "أدوات مكاتب"),
    (12, "أدوات ميكانيكا"),
    (13, "أدوات الأمن وكاميرات المراقبة"),
    (14, "رخام ومواد بناء"),
    (15, "ملابس"),
    (16, "عدد و معدات"),
    (17, "قسم المستهلكات"),
]

# Open workbook with openpyxl
wb = openpyxl.load_workbook(target_path, data_only=False)

# 1. Update أرصدة المخزن
ws_stock = wb['أرصدة المخزن']
print(f"Original max_row in أرصدة المخزن: {ws_stock.max_row}")

# Sample styling from row 4
sample_cells = [ws_stock.cell(4, c) for c in range(1, 9)]

current_row = 4
for d_id, d_name in dept_names:
    items = tree_catalog[str(d_id)]
    num_items = len(items)
    
    # Contiguous active items
    for idx, it in enumerate(items, 1):
        new_code = f"{1000 + d_id:04d}{idx:04d}"
        r = current_row
        
        ws_stock.cell(r, 1).value = int(new_code)
        ws_stock.cell(r, 2).value = d_name
        ws_stock.cell(r, 3).value = it['name']
        ws_stock.cell(r, 4).value = it['unit']
        ws_stock.cell(r, 5).value = it['open_bal']
        ws_stock.cell(r, 6).value = f'=SUMIFS(الاضافة!$G$7:$G$60000,الاضافة!$H$7:$H$60000,"*اضاف*",الاضافة!$E$7:$E$60000,\'أرصدة المخزن\'!C{r})'
        ws_stock.cell(r, 7).value = f'=SUMIFS(الصرف!$H$7:$H$60000,الصرف!$F$7:$F$60000,\'أرصدة المخزن\'!C{r})'
        ws_stock.cell(r, 8).value = f'=E{r}+F{r}-G{r}'
        
        # Apply standard formatting
        for c in range(1, 9):
            cell = ws_stock.cell(r, c)
            src = sample_cells[c - 1]
            if src.font: cell.font = copy(src.font)
            if src.border: cell.border = copy(src.border)
            if src.alignment: cell.alignment = copy(src.alignment)
            if src.number_format: cell.number_format = src.number_format
            
        current_row += 1
        
    # Exactly 500 Blank Template Rows
    for blank_idx in range(num_items + 1, num_items + 501):
        blank_code = f"{1000 + d_id:04d}{blank_idx:04d}"
        r = current_row
        
        ws_stock.cell(r, 1).value = int(blank_code)
        ws_stock.cell(r, 2).value = d_name
        ws_stock.cell(r, 3).value = ""
        ws_stock.cell(r, 4).value = ""
        ws_stock.cell(r, 5).value = 0
        ws_stock.cell(r, 6).value = f'=SUMIFS(الاضافة!$G$7:$G$60000,الاضافة!$H$7:$H$60000,"*اضاف*",الاضافة!$E$7:$E$60000,\'أرصدة المخزن\'!C{r})'
        ws_stock.cell(r, 7).value = f'=SUMIFS(الصرف!$H$7:$H$60000,الصرف!$F$7:$F$60000,\'أرصدة المخزن\'!C{r})'
        ws_stock.cell(r, 8).value = f'=E{r}+F{r}-G{r}'
        
        for c in range(1, 9):
            cell = ws_stock.cell(r, c)
            src = sample_cells[c - 1]
            if src.font: cell.font = copy(src.font)
            if src.border: cell.border = copy(src.border)
            if src.alignment: cell.alignment = copy(src.alignment)
            if src.number_format: cell.number_format = src.number_format
            
        current_row += 1

print(f"New stock catalog completed up to row {current_row - 1} (Expected 9405)")

# 2. Update الاضافة
ws_add = wb['الاضافة']
# Update search bar row 4
for c in range(1, ws_add.max_column + 1):
    val = str(ws_add.cell(4, c).value or '')
    if '8503' in val:
        ws_add.cell(4, c).value = val.replace('8503', '60000')

# Update transaction codes
add_updated = 0
for r in range(7, ws_add.max_row + 1):
    c_val = str(ws_add.cell(r, 4).value or '').strip()
    if c_val:
        if c_val in old_to_new:
            new_c = old_to_new[c_val]
            ws_add.cell(r, 4).value = int(new_c) if new_c.isdigit() else new_c
            add_updated += 1
print(f"Updated {add_updated} transaction codes in الاضافة")

# 3. Update الصرف
ws_disb = wb['الصرف']
# Update search bar row 4
for c in range(1, ws_disb.max_column + 1):
    val = str(ws_disb.cell(4, c).value or '')
    if '8503' in val:
        ws_disb.cell(4, c).value = val.replace('8503', '60000')

# Update transaction codes
disb_updated = 0
for r in range(7, ws_disb.max_row + 1):
    c_val = str(ws_disb.cell(r, 5).value or '').strip()
    if c_val:
        if c_val in old_to_new:
            new_c = old_to_new[c_val]
            ws_disb.cell(r, 5).value = int(new_c) if new_c.isdigit() else new_c
            disb_updated += 1
print(f"Updated {disb_updated} transaction codes in الصرف")

# 4. Update كارت الصنف
ws_kart = wb['كارت الصنف']
old_b3 = str(ws_kart.cell(3, 2).value or '').strip()
if old_b3 in old_to_new:
    ws_kart.cell(3, 2).value = int(old_to_new[old_b3]) if old_to_new[old_b3].isdigit() else old_to_new[old_b3]
else:
    ws_kart.cell(3, 2).value = 10010001

# Expand D column formulas in كارت الصنف from 3006 to 60000
kart_formulas_updated = 0
for r in range(6, 372):
    f_val = str(ws_kart.cell(r, 4).value or '')
    if '3006' in f_val:
        ws_kart.cell(r, 4).value = f_val.replace('3006', '60000')
        kart_formulas_updated += 1
print(f"Updated {kart_formulas_updated} formulas in كارت الصنف")

# 5. Update أصناف بدون حركة
ws_idle = wb['أصناف بدون حركة']
idle_updated = 0
for r in range(2, ws_idle.max_row + 1):
    old_c = str(ws_idle.cell(r, 4).value or '').strip()
    if old_c in old_to_new:
        new_c = old_to_new[old_c]
        ws_idle.cell(r, 4).value = int(new_c) if new_c.isdigit() else new_c
        idle_updated += 1
print(f"Updated {idle_updated} codes in أصناف بدون حركة")

# 6. Update الوارد من التشغيل (مستعمل)
ws_ret = wb['الوارد من التشغيل (مستعمل)']
ret_updated = 0
for r in range(7, ws_ret.max_row + 1):
    c_ref = str(ws_ret.cell(r, 6).value or '').strip()
    if c_ref in old_to_new:
        new_c = old_to_new[c_ref]
        ws_ret.cell(r, 6).value = int(new_c) if new_c.isdigit() else new_c
        ret_updated += 1
print(f"Updated {ret_updated} reference codes in الوارد من التشغيل (مستعمل)")

# Save modified workbook to target path
temp_openpyxl_save = r'scripts\scratch\migrated_temp.xlsx'
wb.save(temp_openpyxl_save)
wb.close()
print("Saved openpyxl changes to temp file.")

# 7. Restore drawings and hyperlink buttons from backup
print("Restoring drawing XMLs and relationships...")
backup_zip = zipfile.ZipFile(backup_path, 'r')
temp_zip = zipfile.ZipFile(temp_openpyxl_save, 'r')

final_zip_path = target_path
final_zip = zipfile.ZipFile(final_zip_path, 'w', compression=zipfile.ZIP_DEFLATED)

# List of files in temp
temp_files = temp_zip.namelist()

# Copy all temp files except worksheets 1..3 which we will ensure have drawings
for item in temp_files:
    data = temp_zip.read(item)
    
    if item == 'xl/worksheets/sheet1.xml':
        xml_str = data.decode('utf-8')
        if 'xmlns:r=' not in xml_str:
            xml_str = xml_str.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ')
        if '<drawing' not in xml_str:
            xml_str = xml_str.replace('</worksheet>', '<drawing r:id="rId2"/></worksheet>')
        data = xml_str.encode('utf-8')
        
    elif item == 'xl/worksheets/sheet2.xml':
        xml_str = data.decode('utf-8')
        if 'xmlns:r=' not in xml_str:
            xml_str = xml_str.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ')
        if '<drawing' not in xml_str:
            xml_str = xml_str.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>')
        data = xml_str.encode('utf-8')
        
    elif item == 'xl/worksheets/sheet3.xml':
        xml_str = data.decode('utf-8')
        if 'xmlns:r=' not in xml_str:
            xml_str = xml_str.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ')
        if '<drawing' not in xml_str:
            xml_str = xml_str.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>')
        data = xml_str.encode('utf-8')
        
    final_zip.writestr(item, data)

# Add drawings and drawing rels from backup
backup_files = backup_zip.namelist()
for b_file in backup_files:
    if b_file.startswith('xl/drawings/') or b_file.startswith('xl/worksheets/_rels/'):
        if b_file not in final_zip.namelist():
            final_zip.writestr(b_file, backup_zip.read(b_file))

# Ensure [Content_Types].xml includes drawing override
content_types = final_zip.read('[Content_Types].xml').decode('utf-8')
if 'drawing+xml' not in content_types:
    override = '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/drawings/drawing2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/drawings/drawing3.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
    content_types = content_types.replace('</Types>', f'{override}</Types>')
    # rewrite [Content_Types].xml
    # We can create a new zip or rewrite
    pass

final_zip.close()
temp_zip.close()
backup_zip.close()

# Re-inject [Content_Types].xml cleanly
with zipfile.ZipFile(final_zip_path, 'r') as zin:
    entries = {e: zin.read(e) for e in zin.namelist()}

ct = entries['[Content_Types].xml'].decode('utf-8')
if 'drawing+xml' not in ct:
    override = '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/drawings/drawing2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/drawings/drawing3.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
    ct = ct.replace('</Types>', f'{override}</Types>')
    entries['[Content_Types].xml'] = ct.encode('utf-8')

with zipfile.ZipFile(final_zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    for k, v in entries.items():
        zout.writestr(k, v)

print("Drawings and Content-Types restored successfully.")

# 8. Open in Microsoft Excel COM, Recalculate, Validate, and Save
print("Opening in Microsoft Excel COM for full calculation and verification...")
excel = win32com.client.Dispatch('Excel.Application')
excel.Visible = False
excel.DisplayAlerts = False

try:
    wb_com = excel.Workbooks.Open(os.path.abspath(target_path))
    excel.CalculateFull()
    
    ws_com_stock = wb_com.Worksheets('أرصدة المخزن')
    
    # Calculate totals
    total_open = excel.WorksheetFunction.Sum(ws_com_stock.Range("E4:E9405"))
    total_add = excel.WorksheetFunction.Sum(ws_com_stock.Range("F4:F9405"))
    total_disb = excel.WorksheetFunction.Sum(ws_com_stock.Range("G4:G9405"))
    total_stock = excel.WorksheetFunction.Sum(ws_com_stock.Range("H4:H9405"))
    
    print("=== Excel COM Verification Results ===")
    print(f"Total Opening Balance: {total_open:,.2f} (Expected: 6,080.00)")
    print(f"Total Added:           {total_add:,.2f} (Expected: 60,593.50)")
    print(f"Total Disbursed:       {total_disb:,.2f} (Expected: 51,940.25)")
    print(f"Total Current Stock:   {total_stock:,.2f} (Expected: 14,733.25)")
    
    diff = round(total_stock - 14733.25, 4)
    print(f"Parity Difference:     {diff:.2f}")
    
    if diff == 0.0:
        print(">>> SUCCESS: 100% PERFECT PARITY ACHIEVED! <<<")
    else:
        print(">>> WARNING: Parity mismatch! <<<")
        
    wb_com.Save()
    wb_com.Close()
    print("Workbook calculated and saved cleanly via Excel COM.")
finally:
    excel.Quit()

print("=== Migration Completed Successfully! ===")
