import sys, openpyxl

sys.stdout.reconfigure(encoding="utf-8")

excel_path = r'D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx'
wb = openpyxl.load_workbook(excel_path)

ws_master = wb['أرصدة المخزن']
ws_add = wb['الاضافة']
ws_disp = wb['الصرف']

# 1. Fix "بواب" to "بواط" in أرصدة المخزن
# Code 116125: صامولة كلبس بواط 5 مم
# Code 116126: مسمار بواط 5 مم بالصامولة
# Code 101334: جوان 10 بوصة مخرم
fixed_master = 0
for r in range(1, ws_master.max_row + 1):
    c_val = ws_master.cell(r, 1).value
    if c_val == 116125 or str(c_val) == '116125':
        ws_master.cell(r, 3, 'صامولة كلبس بواط 5 مم')
        fixed_master += 1
    elif c_val == 116126 or str(c_val) == '116126':
        ws_master.cell(r, 3, 'مسمار بواط بالصامولة')
        fixed_master += 1
    elif c_val == 101334 or str(c_val) == '101334':
        ws_master.cell(r, 3, 'جوان 10 بوصة مخرم')
        fixed_master += 1

print(f"Fixed {fixed_master} items in أرصدة المخزن.")

# 2. Fix in الاضافة
fixed_add = 0
for r in range(1581, 1692):
    c_val = ws_add.cell(r, 3).value # code is col 4, wait! In ws_add: col 1 is serial, col 2 is date, col 3 is voucher, col 4 is code, col 5 is name
    code = ws_add.cell(r, 4).value
    if code == 116125 or str(code) == '116125':
        ws_add.cell(r, 5, 'صامولة كلبس بواط 5 مم')
        fixed_add += 1
    elif code == 116126 or str(code) == '116126':
        ws_add.cell(r, 5, 'مسمار بواط بالصامولة')
        fixed_add += 1

print(f"Fixed {fixed_add} items in الاضافة.")

# 3. Fix in الصرف
fixed_disp = 0
for r in range(2499, 2647):
    # col 1 is serial, col 2 is date, col 3 is dest, col 4 is voucher, col 5 is code, col 6 is name
    code = ws_disp.cell(r, 5).value
    if code == 116125 or str(code) == '116125':
        ws_disp.cell(r, 6, 'صامولة كلبس بواط 5 مم')
        fixed_disp += 1
    elif code == 116126 or str(code) == '116126':
        ws_disp.cell(r, 6, 'مسمار بواط بالصامولة')
        fixed_disp += 1
    elif code == 101334 or str(code) == '101334':
        ws_disp.cell(r, 6, 'جوان 10 بوصة مخرم')
        fixed_disp += 1

print(f"Fixed {fixed_disp} items in الصرف.")

# Save workbook safely
wb.save(excel_path)
print("Saved The_Calm_WMS_V2.xlsx successfully!")
