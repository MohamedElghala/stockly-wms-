import sys
import os
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

backup_dir = r"D:\The_Calm_WMS_V2.1\Excel_Database\Historical_Backups_Archive"
files_to_check = [
    ("1_BEFORE_709", os.path.join(backup_dir, "The_Calm_WMS_V2_BACKUP_BEFORE_DISBURSEMENT_709.xlsx")),
    ("2_BEFORE_RESTRUCTURE", os.path.join(backup_dir, "The_Calm_WMS_V2_BACKUP_BEFORE_CATALOG_RESTRUCTURE.xlsx")),
    ("3_AFTER_TAXONOMY_20260930", os.path.join(backup_dir, "The_Calm_WMS_V2_النسخة_النهائية_المضبوطة.xlsx")),
    ("4_BEFORE_BUTTONS_20261006", os.path.join(backup_dir, "The_Calm_WMS_V2_BACKUP_BEFORE_BUTTONS_20261006_165912.xlsx")),
    ("5_CURRENT", r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"),
]

snapshots = {}
for label, path in files_to_check:
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = wb["أرصدة المخزن"]
    items = {}
    total_open = 0.0
    for r_idx, row in enumerate(ws.iter_rows(min_row=4, max_row=8503, values_only=True), 4):
        code, dept, name, unit, op, in_q, out_q, bal = (list(row) + [None]*8)[:8]
        if name and str(name).strip():
            op_val = float(op or 0)
            total_open += op_val
            items[str(name).strip()] = (code, op_val, float(in_q or 0), float(out_q or 0), float(bal or 0), r_idx)
    wb.close()
    snapshots[label] = (total_open, items)
    print(f"{label}: {len(items)} items | Total Opening Balance = {total_open}")

print("\n=== DIFF BETWEEN 2_BEFORE_RESTRUCTURE AND 3_AFTER_TAXONOMY_20260930 ===")
s2 = snapshots["2_BEFORE_RESTRUCTURE"][1]
s3 = snapshots["3_AFTER_TAXONOMY_20260930"][1]
for name, (c3, op3, in3, out3, bal3, r3) in s3.items():
    if name in s2:
        c2, op2, in2, out2, bal2, r2 = s2[name]
        if op2 != op3:
            print(f"  CHANGED '{name}': Open {op2} -> {op3} (Code {c2} -> {c3})")
    elif op3 != 0:
        print(f"  NEW/RENAMED WITH OPEN != 0: '{name}' [{c3}] Open={op3}")

for name, (c2, op2, in2, out2, bal2, r2) in s2.items():
    if name not in s3 and op2 != 0:
        print(f"  REMOVED/RENAMED THAT HAD OPEN != 0: '{name}' [{c2}] Open={op2}")

print("\n=== DIFF BETWEEN 3_AFTER_TAXONOMY_20260930 AND 4_BEFORE_BUTTONS_20261006 ===")
s4 = snapshots["4_BEFORE_BUTTONS_20261006"][1]
for name, (c4, op4, in4, out4, bal4, r4) in s4.items():
    if name in s3:
        c3, op3, in3, out3, bal3, r3 = s3[name]
        if op3 != op4:
            print(f"  CHANGED '{name}': Open {op3} -> {op4}")

print("\n=== DIFF BETWEEN 4_BEFORE_BUTTONS_20261006 AND 5_CURRENT ===")
s5 = snapshots["5_CURRENT"][1]
for name, (c5, op5, in5, out5, bal5, r5) in s5.items():
    if name in s4:
        c4, op4, in4, out4, bal4, r4 = s4[name]
        if op4 != op5:
            print(f"  CHANGED '{name}': Open {op4} -> {op5}")
    elif op5 != 0:
        print(f"  NEW/RENAMED WITH OPEN != 0: '{name}' [{c5}] Open={op5}")
