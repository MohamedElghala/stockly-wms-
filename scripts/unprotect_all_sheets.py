import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client

EXCEL_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"

def unprotect_all():
    print("==================================================")
    print("UNPROTECTING ALL SHEETS IN THE CALM WMS WORKBOOK")
    print("==================================================")

    if not os.path.exists(EXCEL_FILE):
        print(f"Error: File not found {EXCEL_FILE}")
        return False

    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        wb = excel.Workbooks.Open(os.path.abspath(EXCEL_FILE))
        if wb.ReadOnly:
            print("ERROR: File is currently open in Excel by the user (Read-Only).")
            print("Please close the Excel window so the file can be saved.")
            wb.Close(SaveChanges=False)
            return False

        for i in range(1, wb.Sheets.Count + 1):
            ws = wb.Sheets(i)
            ws.Unprotect()
            # Unlock all cells
            ws.Cells.Locked = False
            print(f"   -> Unprotected sheet: '{ws.Name}' (Protection: {ws.ProtectContents})")

        wb.Save()
        wb.Close(SaveChanges=True)
        print("\nAll sheets unprotected and unlocked successfully!")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        excel.Quit()

if __name__ == "__main__":
    unprotect_all()
