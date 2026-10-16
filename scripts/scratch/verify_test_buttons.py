import sys, os
import win32com.client as win32
sys.stdout.reconfigure(encoding='utf-8')

excel = win32.gencache.EnsureDispatch('Excel.Application')
excel.Visible = False
excel.DisplayAlerts = False

file_path = os.path.abspath(r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx')
try:
    wb = excel.Workbooks.Open(file_path)
    print('SUCCESS: Workbook opened cleanly!')
    for ws in wb.Worksheets:
        shapes = ws.Shapes
        print(f'Sheet [{ws.Name}]: has {shapes.Count} shapes/buttons')
        for i in range(1, shapes.Count + 1):
            sh = shapes.Item(i)
            txt = sh.TextFrame.Characters().Text
            print(f'   Shape {i}: Text="{txt}"')
    wb.Close(False)
except Exception as e:
    print('ERROR:', e)
finally:
    excel.Quit()
