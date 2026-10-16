import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client as win32

fpath = os.path.abspath(r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\Excel_Database\Historical_Backups_Archive\The_Calm_WMS_V2_KOMAR_TEST_WITH_BUTTONS.xlsx')
excel = win32.Dispatch('Excel.Application')
excel.Visible = False
excel.DisplayAlerts = False
try:
    wb = excel.Workbooks.Open(fpath)
    for s in wb.Sheets:
        print(f'Sheet {s.Name}: Shapes.Count = {s.Shapes.Count}')
        for i in range(1, s.Shapes.Count + 1):
            sh = s.Shapes(i)
            txt = ''
            try:
                txt = sh.TextFrame.Characters().Text
            except Exception as e:
                txt = str(e)
            sub_addr = ''
            try:
                sub_addr = sh.Hyperlink.SubAddress
            except Exception as e:
                sub_addr = str(e)
            print(f'   Shape {i}: Name={sh.Name}, Text="{txt}", Hyperlink="{sub_addr}", Left={sh.Left}, Top={sh.Top}, Width={sh.Width}, Height={sh.Height}')
    wb.Close(False)
finally:
    excel.Quit()
