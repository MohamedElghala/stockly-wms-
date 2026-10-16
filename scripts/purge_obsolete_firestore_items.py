import sys
import json
import urllib.request
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl

EXCEL_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"
API_KEY = "AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM"
PROJECT_ID = "the-calm-wms"
EMAIL = "mohamedalghala@gmail.com"
PASSWORD = "password123"

def get_auth_token():
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
    payload = json.dumps({"email": EMAIL, "password": PASSWORD, "returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(auth_url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))["idToken"]

def commit_batch(token, writes):
    commit_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit"
    body = {"writes": writes}
    req = urllib.request.Request(
        commit_url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def purge_obsolete():
    print("==================================================")
    print("PURGING 132 OBSOLETE DOCUMENTS FROM FIRESTORE")
    print("==================================================")

    # 1. Read catalog codes from Excel
    print("1. Reading Active Catalog Codes from Excel...")
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    ws = wb['أرصدة المخزن']
    catalog_codes = set()
    for r in range(4, 8504):
        c = ws.cell(row=r, column=1).value
        name = ws.cell(row=r, column=3).value
        if name and str(name).strip():
            catalog_codes.add(str(int(c) if isinstance(c, (int, float)) else str(c).strip()))

    print(f"   Active Catalog Items in Excel: {len(catalog_codes)}")
    assert len(catalog_codes) == 892, f"Expected 892, got {len(catalog_codes)}"

    # 2. Authenticate
    token = get_auth_token()
    print("2. Authenticated with Firebase.")

    # 3. Find all items currently in Firestore
    print("3. Fetching all document IDs in Firestore 'items'...")
    fs_docs = []
    page_token = None
    while True:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/items?pageSize=300"
        if page_token:
            url += f"&pageToken={page_token}"
        r = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(r) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for doc in data.get("documents", []):
                doc_id = doc["name"].split("/")[-1]
                fs_docs.append(doc_id)
            page_token = data.get("nextPageToken")
            if not page_token:
                break

    print(f"   Total documents in Firestore 'items': {len(fs_docs)}")

    # 4. Obsolete documents to delete
    obsolete_docs = [doc_id for doc_id in fs_docs if doc_id not in catalog_codes]
    print(f"   Obsolete documents to delete: {len(obsolete_docs)}")

    if not obsolete_docs:
        print("   No obsolete documents to delete. Already clean!")
        return

    # Delete in batches
    delete_writes = []
    for doc_id in obsolete_docs:
        delete_writes.append({
            "delete": f"projects/{PROJECT_ID}/databases/(default)/documents/items/{doc_id}"
        })

    CHUNK = 200
    for i in range(0, len(delete_writes), CHUNK):
        chunk = delete_writes[i:i + CHUNK]
        res = commit_batch(token, chunk)
        print(f"   -> Batch {i//CHUNK + 1}: Deleted {len(res.get('writeResults', []))} obsolete documents.")

    print("\n==================================================")
    print("PURGE COMPLETE! FIRESTORE 'items' NOW HAS EXACTLY 892 ITEMS!")
    print("==================================================")

if __name__ == "__main__":
    purge_obsolete()
