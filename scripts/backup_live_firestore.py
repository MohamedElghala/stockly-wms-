import urllib.request
import urllib.parse
import json
import os
import sys

API_KEY = "AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM"
PROJECT_ID = "the-calm-wms"
EMAIL = "mohamedalghala@gmail.com"
PASSWORD = "password123"

def get_auth_token():
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
    payload = json.dumps({
        "email": EMAIL,
        "password": PASSWORD,
        "returnSecureToken": True
    }).encode("utf-8")
    req = urllib.request.Request(auth_url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data["idToken"]

def parse_firestore_value(val):
    if not isinstance(val, dict):
        return val
    if "stringValue" in val:
        return val["stringValue"]
    if "integerValue" in val:
        return int(val["integerValue"])
    if "doubleValue" in val:
        return float(val["doubleValue"])
    if "booleanValue" in val:
        return val["booleanValue"]
    if "timestampValue" in val:
        return val["timestampValue"]
    if "nullValue" in val:
        return None
    if "mapValue" in val:
        fields = val["mapValue"].get("fields", {})
        return {k: parse_firestore_value(v) for k, v in fields.items()}
    if "arrayValue" in val:
        values = val["arrayValue"].get("values", [])
        return [parse_firestore_value(v) for v in values]
    return str(val)

def fetch_collection(token, col_name):
    docs = []
    page_token = None
    base_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/{col_name}"
    
    while True:
        url = f"{base_url}?pageSize=300"
        if page_token:
            url += f"&pageToken={urllib.parse.quote(page_token)}"
            
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw_docs = data.get("documents", [])
                for d in raw_docs:
                    doc_name = d.get("name", "").split("/")[-1]
                    raw_fields = d.get("fields", {})
                    parsed_fields = {k: parse_firestore_value(v) for k, v in raw_fields.items()}
                    docs.append({
                        "_id": doc_name,
                        "_createTime": d.get("createTime"),
                        "_updateTime": d.get("updateTime"),
                        "data": parsed_fields,
                        "_raw": d
                    })
                page_token = data.get("nextPageToken")
                if not page_token:
                    break
        except urllib.error.HTTPError as e:
            print(f"Error fetching {col_name}: HTTP {e.code} - {e.reason}")
            break
        except Exception as e:
            print(f"Error fetching {col_name}: {e}")
            break
            
    return docs

def main():
    print("1. Authenticating with Firebase...")
    token = get_auth_token()
    print("Authentication successful.")

    collections = ["items", "additions", "disbursements", "users", "materialRequests", "categories"]
    full_backup = {
        "metadata": {
            "projectId": PROJECT_ID,
            "backupDate": "2026-10-02T02:45:00+03:00",
            "environment": "live_production"
        },
        "collections": {}
    }

    total_docs = 0
    for col in collections:
        print(f"Fetching collection: '{col}'...")
        docs = fetch_collection(token, col)
        full_backup["collections"][col] = docs
        print(f"  -> Retrieved {len(docs)} documents from '{col}'.")
        total_docs += len(docs)

    out_dir = os.path.join(os.path.dirname(__file__), "scratch")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "live_firestore_backup_20261002.json")

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(full_backup, f, ensure_ascii=False, indent=2)

    file_size = os.path.getsize(out_file)
    print(f"\n=======================================================")
    print(f"BACKUP COMPLETE:")
    print(f"Destination: {out_file}")
    print(f"Total Collections: {len(collections)}")
    print(f"Total Documents: {total_docs}")
    print(f"File Size: {file_size:,} bytes")
    print(f"=======================================================")

if __name__ == "__main__":
    main()
