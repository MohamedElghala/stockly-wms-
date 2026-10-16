import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(REPO_ROOT)

# Dynamic Excel File Resolution
D_EXCEL = os.path.join(PROJECT_ROOT, "Excel_Database", "The_Calm_WMS_V2.xlsx")
C_EXCEL = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"

if os.path.exists(D_EXCEL):
    EXCEL_FILE = D_EXCEL
elif os.path.exists(C_EXCEL):
    EXCEL_FILE = C_EXCEL
else:
    EXCEL_FILE = D_EXCEL

# Dynamic Logos & Assets Resolution
LOGOS_DIR = os.path.join(REPO_ROOT, "assets", "logos")

# Dynamic Reports Directory
D_REPORTS = os.path.join(PROJECT_ROOT, "Official_Reports")
if os.path.exists(D_REPORTS):
    REPORTS_DIR = D_REPORTS
else:
    REPORTS_DIR = os.path.join(REPO_ROOT, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)
