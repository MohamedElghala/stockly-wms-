import sys, openpyxl, os

sys.stdout.reconfigure(encoding="utf-8")

excel_path = r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx'
wb = openpyxl.load_workbook(excel_path, data_only=True)

ws_master = wb['أرصدة المخزن']
ws_add = wb['الاضافة']
ws_disp = wb['الصرف']

# 1. Build master catalog map: code -> (dept, name, unit)
master_catalog = {}
for r in range(1, ws_master.max_row + 1):
    c_val = ws_master.cell(r, 1).value
    if c_val is not None:
        try:
            c_int = int(c_val)
            dept = ws_master.cell(r, 2).value
            name = ws_master.cell(r, 3).value
            unit = ws_master.cell(r, 4).value
            master_catalog[c_int] = {
                'row': r,
                'dept': str(dept or '').strip(),
                'name': str(name or '').strip(),
                'unit': str(unit or '').strip()
            }
        except:
            pass

print(f"Loaded {len(master_catalog)} items from أرصدة المخزن.")

# 2. Check Additions (Rows 1581 to 1691)
print("\n" + "="*80)
print("AUDITING ADDITIONS (الاضافة: rows 1581 to 1691)")
print("="*80)

add_issues = []
for r in range(1581, 1692):
    row_vals = [ws_add.cell(r, c).value for c in range(1, 10)]
    d_val = row_vals[1]
    v_num = row_vals[2]
    code = row_vals[3]
    name = str(row_vals[4] or '').strip()
    unit = str(row_vals[5] or '').strip()
    qty = row_vals[6]
    notes = str(row_vals[8] or '').strip()

    try:
        code_int = int(code)
    except:
        code_int = None
        add_issues.append((r, v_num, code, name, "INVALID_CODE", f"Code {code} is not an integer"))
        continue

    if code_int not in master_catalog:
        add_issues.append((r, v_num, code_int, name, "CODE_NOT_IN_MASTER", f"Code {code_int} not found in أرصدة المخزن"))
    else:
        m_item = master_catalog[code_int]
        # check name similarity / exact match
        if m_item['name'] != name:
            add_issues.append((r, v_num, code_int, name, "NAME_MISMATCH", f"Excel sheet name: '{name}' != Master name: '{m_item['name']}'"))
        if m_item['unit'] != unit:
            add_issues.append((r, v_num, code_int, name, "UNIT_MISMATCH", f"Excel sheet unit: '{unit}' != Master unit: '{m_item['unit']}'"))

print(f"Total addition rows checked: {1691 - 1581 + 1}")
print(f"Total addition issues found: {len(add_issues)}")
for issue in add_issues:
    print(f"Row {issue[0]} | V:{issue[1]} | Code:{issue[2]} | Type:{issue[4]} | Details: {issue[5]}")

# 3. Check Disbursements (Rows 2499 to 2646)
print("\n" + "="*80)
print("AUDITING DISBURSEMENTS (الصرف: rows 2499 to 2646)")
print("="*80)

disp_issues = []
for r in range(2499, 2647):
    row_vals = [ws_disp.cell(r, c).value for c in range(1, 11)]
    d_val = row_vals[1]
    dest = str(row_vals[2] or '').strip()
    v_num = row_vals[3]
    code = row_vals[4]
    name = str(row_vals[5] or '').strip()
    unit = str(row_vals[6] or '').strip()
    qty = row_vals[7]
    notes = str(row_vals[9] or '').strip()

    try:
        code_int = int(code)
    except:
        code_int = None
        disp_issues.append((r, v_num, code, name, "INVALID_CODE", f"Code {code} is not an integer"))
        continue

    if code_int not in master_catalog:
        disp_issues.append((r, v_num, code_int, name, "CODE_NOT_IN_MASTER", f"Code {code_int} not found in أرصدة المخزن"))
    else:
        m_item = master_catalog[code_int]
        if m_item['name'] != name:
            disp_issues.append((r, v_num, code_int, name, "NAME_MISMATCH", f"Excel sheet name: '{name}' != Master name: '{m_item['name']}'"))
        if m_item['unit'] != unit:
            disp_issues.append((r, v_num, code_int, name, "UNIT_MISMATCH", f"Excel sheet unit: '{unit}' != Master unit: '{m_item['unit']}'"))

print(f"Total disbursement rows checked: {2646 - 2499 + 1}")
print(f"Total disbursement issues found: {len(disp_issues)}")
for issue in disp_issues:
    print(f"Row {issue[0]} | V:{issue[1]} | Code:{issue[2]} | Type:{issue[4]} | Details: {issue[5]}")
