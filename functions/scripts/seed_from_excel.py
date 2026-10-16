import pandas as pd
import firebase_admin
from firebase_admin import firestore
import os
import math
from google.auth.credentials import AnonymousCredentials

os.environ["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080"
try:
    # Use AnonymousCredentials to bypass Google Auth when using Emulator
    cred = AnonymousCredentials()
    firebase_admin.initialize_app(cred, options={'projectId': 'demo-calm-wms'})
except Exception as e:
    pass

db = firestore.client()

def wipe_collection(collection_name):
    print(f"Wiping {collection_name}...")
    try:
        docs = db.collection(collection_name).limit(1000).stream()
        count = 0
        for doc in docs:
            doc.reference.delete()
            count += 1
        print(f"Deleted {count} from {collection_name}")
    except Exception as e:
        print(f"Failed wiping {collection_name}: {e}")

def extract_table(df, key_column):
    # Check if columns are already correct
    if key_column in df.columns:
        return df.dropna(how='all')
        
    header_idx = -1
    for idx, row in df.iterrows():
        vals = [str(x).strip() for x in row.values if pd.notna(x)]
        if key_column in vals:
            header_idx = idx
            break
    if header_idx == -1:
        # Fallback if specific exact string is not found, try substring
        for idx, row in df.iterrows():
            vals = [str(x).strip() for x in row.values if pd.notna(x)]
            if any(key_column in v for v in vals):
                header_idx = idx
                break
    
    if header_idx == -1:
        return pd.DataFrame()
    
    new_header = df.iloc[header_idx]
    df = df.iloc[header_idx+1:].copy()
    df.columns = new_header
    df = df.dropna(how='all')
    return df

def safe_float(val, default=0.0):
    try:
        if pd.isna(val): return default
        return float(val)
    except:
        return default

def safe_str(val):
    if pd.isna(val): return ""
    return str(val).strip()

def run():
    file_path = r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\The_Calm_WMS_V2.1.xlsx'
    if not os.path.exists(file_path):
        print("Excel file not found!")
        return
        
    print("Starting Clean Wipe...")
    wipe_collection('items')
    wipe_collection('materialRequests')
    wipe_collection('scrap')
    wipe_collection('transactions')
    wipe_collection('users')
    
    print("Reading Excel...")
    xls = pd.ExcelFile(file_path)
    
    # 1. Users
    if 'المستخدمين' in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name='المستخدمين')
        df = extract_table(df, 'كود المستخدم')
        count = 0
        for _, row in df.iterrows():
            uid = safe_str(row.get('كود المستخدم', ''))
            if uid and uid.lower() != 'nan':
                db.collection('users').document(uid).set({
                    'id': uid,
                    'name': safe_str(row.get('الاسم', '')),
                    'password': safe_str(row.get('كلمة المرور', '')),
                    'department': safe_str(row.get('التخصص', '')),
                    'category': safe_str(row.get('التخصص', '')),
                    'role': safe_str(row.get('الصلاحية', '')),
                    'job': safe_str(row.get('الوظيفة', ''))
                })
                count += 1
        print(f"Imported {count} users.")
        
    # 2. Inventory (items)
    if 'الرصيد الحالي' in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name='الرصيد الحالي')
        df = extract_table(df, 'كود الصنف')
        count = 0
        for _, row in df.iterrows():
            item_id = safe_str(row.get('كود الصنف', ''))
            if item_id and item_id.lower() != 'nan':
                db.collection('items').document(item_id).set({
                    'id': item_id,
                    'code': item_id,
                    'name': safe_str(row.get('اسم الصنف', '')),
                    'stock': safe_float(row.get('الكمية', row.get('الرصيد', 0))),
                    'category': safe_str(row.get('الفئة', '')),
                    'minLevel': safe_float(row.get('الحد الأدنى', 5)),
                    'status': 'متوفر',
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
                count += 1
        print(f"Imported {count} inventory items.")
        
    # 3. Pending Requests
    if 'الطلبات المعلقة' in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name='الطلبات المعلقة')
        df = extract_table(df, 'رقم الطلب')
        count = 0
        for _, row in df.iterrows():
            req_id = safe_str(row.get('رقم الطلب', ''))
            if req_id and req_id.lower() != 'nan':
                db.collection('materialRequests').document(req_id).set({
                    'id': req_id,
                    'reqId': req_id,
                    'itemId': safe_str(row.get('كود الصنف', '')),
                    'name': safe_str(row.get('اسم الصنف', '')),
                    'qty': safe_float(row.get('الكمية المطلوبة', 0)),
                    'dept': safe_str(row.get('التخصص', '')),
                    'category': safe_str(row.get('التخصص', '')),
                    'status': 'pending',
                    'user': safe_str(row.get('المستخدم', '')),
                    'createdAt': firestore.SERVER_TIMESTAMP
                })
                count += 1
        print(f"Imported {count} pending requests.")
        
    # 4. Archived Requests
    if 'أرشيف الطلبات' in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name='أرشيف الطلبات')
        df = extract_table(df, 'رقم الطلب')
        count = 0
        for _, row in df.iterrows():
            req_id = safe_str(row.get('رقم الطلب', ''))
            if req_id and req_id.lower() != 'nan':
                db.collection('materialRequests').document(req_id).set({
                    'id': req_id,
                    'reqId': req_id,
                    'itemId': safe_str(row.get('كود الصنف', '')),
                    'name': safe_str(row.get('اسم الصنف', '')),
                    'qty': safe_float(row.get('الكمية المطلوبة', 0)),
                    'dept': safe_str(row.get('التخصص', '')),
                    'category': safe_str(row.get('التخصص', '')),
                    'status': 'archived',
                    'user': safe_str(row.get('المستخدم', '')),
                    'createdAt': firestore.SERVER_TIMESTAMP
                })
                count += 1
        print(f"Imported {count} archived requests.")
        
    print("Migration finished successfully!")

if __name__ == '__main__':
    run()
