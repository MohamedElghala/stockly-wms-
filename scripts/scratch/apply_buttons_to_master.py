import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client as win32

master_path = os.path.abspath(r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx')

excel = win32.Dispatch('Excel.Application')
excel.Visible = False
excel.DisplayAlerts = False

try:
    wb = excel.Workbooks.Open(master_path)
    
    # 4 Primary Navigation Buttons: (Label, TargetSheet, ColorBGR/RGB)
    buttons = [
        ("📊 أرصدة المخزن", "'أرصدة المخزن'!A1", 0x1E3A8A),  # Deep Royal Blue
        ("📥 حركة الإضافة", "'الاضافة'!A1", 0x065F46),      # Emerald Green
        ("📤 حركة الصرف", "'الصرف'!A1", 0x991B1B),        # Crimson
        ("🔍 كارت الصنف", "'كارت الصنف'!A1", 0x5B21B6)     # Deep Purple
    ]
    
    for s_name in ['أرصدة المخزن', 'الاضافة', 'الصرف', 'كارت الصنف']:
        if s_name not in [s.Name for s in wb.Sheets]:
            continue
        ws = wb.Sheets(s_name)
        
        # Unprotect if protected
        try:
            ws.Unprotect()
        except:
            pass
            
        # Clear any lingering shapes
        while ws.Shapes.Count > 0:
            ws.Shapes(1).Delete()
            
        btn_width = 115
        btn_height = 28
        spacing = 10
        start_left = 60
        top_pos = 6
        
        for idx, (label, target, color) in enumerate(buttons):
            left_pos = start_left + idx * (btn_width + spacing)
            # 5 = msoShapeRoundedRectangle
            sh = ws.Shapes.AddShape(5, left_pos, top_pos, btn_width, btn_height)
            sh.Name = f"NavBtn_{idx+1}"
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
            
            # Hyperlink
            ws.Hyperlinks.Add(Anchor=sh, Address="", SubAddress=target, ScreenTip=f"انتقال إلى {label}")
            
        print(f"Sheet '{s_name}': Successfully added {ws.Shapes.Count} navigation buttons.")
        
    wb.Save()
    print("Master workbook saved successfully with navigation buttons!")
    wb.Close(False)
finally:
    excel.Quit()
