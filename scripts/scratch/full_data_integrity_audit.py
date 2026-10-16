import sys, openpyxl, datetime

sys.stdout.reconfigure(encoding="utf-8")

excel_path = r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx'
wb = openpyxl.load_workbook(excel_path, data_only=True)

ws_master = wb['أرصدة المخزن']
ws_add = wb['الاضافة']
ws_disp = wb['الصرف']

# 1. Master catalog
catalog = {}
for r in range(1, ws_master.max_row + 1):
    c_val = ws_master.cell(r, 1).value
    if c_val is not None:
        try:
            c_int = int(c_val)
            catalog[c_int] = {
                'row': r,
                'dept': str(ws_master.cell(r, 2).value or '').strip(),
                'name': str(ws_master.cell(r, 3).value or '').strip(),
                'unit': str(ws_master.cell(r, 4).value or '').strip(),
                'open_bal': ws_master.cell(r, 5).value,
                'in_qty': ws_master.cell(r, 6).value,
                'out_qty': ws_master.cell(r, 7).value,
                'cur_bal': ws_master.cell(r, 8).value
            }
        except:
            pass

print(f"Master Catalog Items: {len(catalog)}")

# Audit Additions (1581 to 1691)
print("\n" + "="*50 + " AUDITING ADDITIONS " + "="*50)
add_errors = []
prev_v = None
for r in range(1581, 1692):
    vals = [ws_add.cell(r, c).value for c in range(1, 10)]
    d = vals[1]
    v = vals[2]
    c = vals[3]
    name = vals[4]
    unit = vals[5]
    qty = vals[6]
    notes = vals[8]

    # check date
    if not isinstance(d, (datetime.date, datetime.datetime)):
        add_errors.append((r, v, "DATE_ERROR", f"Invalid date: {d}"))

    # check voucher
    try:
        v_int = int(v)
        if prev_v is not None and v_int < prev_v:
            add_errors.append((r, v, "VOUCHER_ORDER_ERROR", f"Voucher {v_int} less than previous {prev_v}"))
        prev_v = v_int
    except:
        add_errors.append((r, v, "VOUCHER_NOT_INT", f"Voucher {v} is not int"))

    # check code & catalog match
    try:
        c_int = int(c)
        if c_int not in catalog:
            add_errors.append((r, v, "CODE_NOT_FOUND", f"Code {c_int} not in master"))
        else:
            cat_name = catalog[c_int]['name']
            cat_unit = catalog[c_int]['unit']
            if cat_name != str(name or '').strip():
                add_errors.append((r, v, "NAME_MISMATCH", f"Code {c_int}: Excel '{name}' vs Catalog '{cat_name}'"))
            if cat_unit != str(unit or '').strip():
                add_errors.append((r, v, "UNIT_MISMATCH", f"Code {c_int}: Excel '{unit}' vs Catalog '{cat_unit}'"))
    except:
        add_errors.append((r, v, "CODE_NOT_INT", f"Code {c} is not int"))

    # check qty
    if qty is None or not isinstance(qty, (int, float)) or qty <= 0:
        add_errors.append((r, v, "INVALID_QTY", f"Quantity {qty} is invalid"))

print(f"Total Addition Errors: {len(add_errors)}")
for err in add_errors:
    print(err)

# Audit Disbursements (2499 to 2646)
print("\n" + "="*50 + " AUDITING DISBURSEMENTS " + "="*50)
disp_errors = []
prev_v = None
for r in range(2499, 2647):
    vals = [ws_disp.cell(r, c).value for c in range(1, 11)]
    d = vals[1]
    dest = vals[2]
    v = vals[3]
    c = vals[4]
    name = vals[5]
    unit = vals[6]
    qty = vals[7]
    notes = vals[9]

    # check date
    if not isinstance(d, (datetime.date, datetime.datetime)):
        disp_errors.append((r, v, "DATE_ERROR", f"Invalid date: {d}"))

    # check voucher
    try:
        v_int = int(v)
        if prev_v is not None and v_int < prev_v:
            disp_errors.append((r, v, "VOUCHER_ORDER_ERROR", f"Voucher {v_int} less than previous {prev_v}"))
        prev_v = v_int
    except:
        disp_errors.append((r, v, "VOUCHER_NOT_INT", f"Voucher {v} is not int"))

    # check destination
    if not dest or str(dest).strip() == '':
        disp_errors.append((r, v, "EMPTY_DEST", "Destination is empty"))

    # check code & catalog match
    try:
        c_int = int(c)
        if c_int not in catalog:
            disp_errors.append((r, v, "CODE_NOT_FOUND", f"Code {c_int} not in master"))
        else:
            cat_name = catalog[c_int]['name']
            cat_unit = catalog[c_int]['unit']
            if cat_name != str(name or '').strip():
                disp_errors.append((r, v, "NAME_MISMATCH", f"Code {c_int}: Excel '{name}' vs Catalog '{cat_name}'"))
            if cat_unit != str(unit or '').strip():
                disp_errors.append((r, v, "UNIT_MISMATCH", f"Code {c_int}: Excel '{unit}' vs Catalog '{cat_unit}'"))
    except:
        disp_errors.append((r, v, "CODE_NOT_INT", f"Code {c} is not int"))

    # check qty
    if qty is None or not isinstance(qty, (int, float)) or qty <= 0:
        disp_errors.append((r, v, "INVALID_QTY", f"Quantity {qty} is invalid"))

print(f"Total Disbursement Errors: {len(disp_errors)}")
for err in disp_errors:
    print(err)
