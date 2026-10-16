import sys
import os
import json
import urllib.request
sys.stdout.reconfigure(encoding='utf-8')

API_KEY = "AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM"
PROJECT_ID = "the-calm-wms"
EMAIL = "mohamedalghala@gmail.com"
PASSWORD = "password123"

import time

def urlopen_with_retry(req, retries=6, timeout=45):
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))

def get_auth_token():
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
    payload = json.dumps({"email": EMAIL, "password": PASSWORD, "returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(auth_url, data=payload, headers={"Content-Type": "application/json", "Connection": "close"})
    return urlopen_with_retry(req)["idToken"]

def parse_val(v):
    if not isinstance(v, dict): return v
    if "stringValue" in v: return v["stringValue"]
    if "integerValue" in v: return int(v["integerValue"])
    if "doubleValue" in v: return float(v["doubleValue"])
    if "booleanValue" in v: return v["booleanValue"]
    return str(v)

def verify_sync():
    print("==================================================")
    print("VERIFYING LIVE FIRESTORE CLOUD SYNCHRONIZATION")
    print("==================================================")

    token = get_auth_token()
    print("1. Authenticated successfully.")

    # 1. Fetch categories
    print("\n2. Checking 'categories' collection in Firestore...")
    cat_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/categories?pageSize=50"
    req = urllib.request.Request(cat_url, headers={"Authorization": f"Bearer {token}", "Connection": "close"})
    d = urlopen_with_retry(req)
    cat_docs = d.get("documents", [])
    print(f"   Found {len(cat_docs)} categories in Firestore (Expected: 17).")
    assert len(cat_docs) == 17, f"Expected 17 categories, got {len(cat_docs)}"
    for c in cat_docs:
        f = c.get("fields", {})
        print(f"   -> Category {parse_val(f.get('order'))}: {parse_val(f.get('name'))} (Items: {parse_val(f.get('itemCount'))})")

    # Read expected counts & totals directly from Master Excel
    import openpyxl, shutil
    shutil.copyfile(r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx", r"D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx")
    wb = openpyxl.load_workbook(r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx", data_only=True, read_only=True)
    ws_cat = wb["أرصدة المخزن"]
    exp_items = 0
    exp_pos_items = 0
    exp_stock = 0.0
    for r in ws_cat.iter_rows(min_row=4, max_row=8503, values_only=True):
        c_code, c_dept, c_name, c_unit, c_init, c_add, c_dis, c_bal = r[:8]
        if c_name and str(c_name).strip():
            exp_items += 1
            bal_v = float(c_bal or 0)
            exp_stock += bal_v
            if bal_v > 0:
                exp_pos_items += 1
    wb.close()

    # 2. Fetch and verify items
    print("\n3. Checking 'items' collection in Firestore...")
    active_items_count = 0
    pos_items_count = 0
    archived_items_count = 0
    total_live_stock = 0.0

    page_token = None
    while True:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/items?pageSize=300"
        if page_token:
            url += f"&pageToken={page_token}"
        r = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Connection": "close"})
        data = urlopen_with_retry(r)
        for doc in data.get("documents", []):
            fields = doc.get("fields", {})
            st = parse_val(fields.get("status"))
            stock = float(parse_val(fields.get("stock")) or 0)
            if st == "ARCHIVED":
                archived_items_count += 1
            else:
                active_items_count += 1
                total_live_stock += stock
                if stock > 0:
                    pos_items_count += 1

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    print(f"\nFirestore Items Verification Summary:")
    print(f"   Active Items Count: {active_items_count} (Expected: {exp_items})")
    print(f"   Positive Stock Items (> 0): {pos_items_count} (Expected: {exp_pos_items})")
    print(f"   Archived Obsolete Items Count: {archived_items_count} (Expected: 0)")
    print(f"   Total Active Stock in Cloud: {total_live_stock:,.2f} (Expected: {exp_stock:,.2f})")
    print(f"   Variance vs Excel Master: {total_live_stock - exp_stock:.4f}")

    assert active_items_count == exp_items, f"Active items count mismatch: {active_items_count} != {exp_items}"
    assert pos_items_count == exp_pos_items, f"Positive stock items mismatch: {pos_items_count} != {exp_pos_items}"
    assert abs(total_live_stock - exp_stock) < 0.001, f"Live stock variance: {total_live_stock} != {exp_stock}"

    print("\n==================================================")
    print("LIVE CLOUD SYNC VERIFIED: 100.00% MATCH WITH EXCEL!")
    print("==================================================")

if __name__ == "__main__":
    verify_sync()
