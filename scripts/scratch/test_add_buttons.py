import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client as win32

# Test on backup copy first
test_path = os.path.abspath(r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\Excel_Database\Historical_Backups_Archive\test_buttons.xlsx')
import shutil
shutil.copy2(r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx', test_path)

excel = win32.Dispatch('Excel.Application')
excel.Visible = False
excel.DisplayAlerts = False

try:
    wb = excel.Workbooks.Open(test_path)
    
    # Buttons definition: (Label, TargetSheet, ColorRGB)
    buttons = [
        ("📊 أرصدة المخزن", "'أرصدة المخزن'!A1", 0x1E3A8A),  # Deep Blue
        ("📥 حركة الإضافة", "'الاضافة'!A1", 0x065F46),      # Forest Green
        ("📤 حركة الصرف", "'الصرف'!A1", 0x991B1B),        # Crimson Red
        ("🔍 كارت الصنف", "'كارت الصنف'!A1", 0x5B21B6)     # Deep Purple
    ]
    
    for s_name in ['أرصدة المخزن', 'الاضافة', 'الصرف', 'كارت الصنف']:
        if s_name not in [s.Name for s in wb.Sheets]:
            continue
        ws = wb.Sheets(s_name)
        
        # Unprotect if needed
        try:
            ws.Unprotect()
        except:
            pass
            
        # Clear any existing shapes
        while ws.Shapes.Count > 0:
            ws.Shapes(1).Delete()
            
        # Add 4 buttons in row 1
        # Place them at Top = 5
        btn_width = 110
        btn_height = 28
        spacing = 10
        start_left = 50
        
        for idx, (label, target, color) in enumerate(buttons):
            left_pos = start_left + idx * (btn_width + spacing)
            # 5 = msoShapeRoundedRectangle
            sh = ws.Shapes.AddShape(5, left_pos, 5, btn_width, btn_height)
            sh.Name = f"Btn_{idx+1}"
            sh.TextFrame.Characters().Text = label
            sh.TextFrame.Characters().Font.Name = "Segoe UI"
            sh.TextFrame.Characters().Font.Size = 10
            sh.TextFrame.Characters().Font.Bold = True
            sh.TextFrame.Characters().Font.Color = 0xFFFFFF # White
            sh.TextFrame.HorizontalAlignment = -4108 # Center
            sh.TextFrame.VerticalAlignment = -4108   # Center
            sh.Fill.Solid()
            sh.Fill.ForeColor.RGB = color
            sh.Line.Visible = False
            
            # Add Hyperlink
            ws.Hyperlinks.Add(Anchor=sh, Address="", SubAddress=target, ScreenTip=f"انتقال إلى {label}")
            
        print(f"Sheet '{s_name}': Added {ws.Shapes.Count} navigation buttons.")
        
    wb.Save()
    print("Saved test workbook with buttons successfully!")
    wb.Close(False)
finally:
    excel.Quit()
