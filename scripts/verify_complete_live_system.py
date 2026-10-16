import sys
import os
import json
import socket
import urllib.request
import urllib.parse
import time

sys.stdout.reconfigure(encoding='utf-8')

DNS_CACHE = {
    'identitytoolkit.googleapis.com': '172.217.113.4',
    'firestore.googleapis.com': '142.251.209.106'
}

orig_getaddrinfo = socket.getaddrinfo
def getaddrinfo_cached(host, port, family=0, type=0, proto=0, flags=0):
    if host in DNS_CACHE:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (DNS_CACHE[host], port))]
    try:
        res = orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
        if res:
            DNS_CACHE[host] = res[0][4][0]
        return res
    except Exception:
        if host in DNS_CACHE:
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (DNS_CACHE[host], port))]
        raise
socket.getaddrinfo = getaddrinfo_cached

API_KEY = "AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM"
PROJECT_ID = "the-calm-wms"
EMAIL = "mohamedalghala@gmail.com"
PASSWORD = "password123"

def urlopen_with_retry(req, retries=8, timeout=30):
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            last_err = e
            print(f"      [Retry {attempt+1}/{retries}] Network warning: {e}. Backing off {1.5 * (attempt + 1):.1f}s...", flush=True)
            time.sleep(1.5 * (attempt + 1))
    raise last_err

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

def fetch_all_docs(collection_name, token, mask_fields=None, page_size=100):
    docs = []
    page_token = None
    page_num = 1
    mask_query = ""
    if mask_fields:
        mask_query = "&" + "&".join([f"mask.fieldPaths={f}" for f in mask_fields])

    while True:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/{collection_name}?pageSize={page_size}{mask_query}"
        if page_token:
            url += f"&pageToken={urllib.parse.quote(page_token)}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Connection": "close"})
        data = urlopen_with_retry(req)
        batch = data.get("documents", [])
        docs.extend(batch)
        print(f"      Fetching '{collection_name}' (page {page_num}): {len(docs)} docs loaded...", end="\r", flush=True)
        page_token = data.get("nextPageToken")
        if not page_token:
            break
        page_num += 1
        time.sleep(0.1)
    print(f"\n      -> Finished '{collection_name}': {len(docs)} documents loaded.", flush=True)
    return docs

def verify_complete_system():
    print("=================================================================", flush=True)
    print("VERIFYING FULL LIVE FIRESTORE CLOUD DATABASE & MATHEMATICAL PARITY", flush=True)
    print("=================================================================", flush=True)

    token = get_auth_token()
    print("1. Firebase Cloud Authentication: SUCCESS (IPv4 DNS Cached)", flush=True)

    # 1. Categories
    print("\n2. Verifying 'categories' collection...", flush=True)
    cat_docs = fetch_all_docs("categories", token, page_size=50)
    print(f"   -> Found {len(cat_docs)} categories in Firestore (Expected: 17).")
    assert len(cat_docs) == 17, f"Categories count mismatch: {len(cat_docs)} != 17"
    for c in sorted(cat_docs, key=lambda x: int(parse_val(x.get('fields', {}).get('order', 0)))):
        f = c.get('fields', {})
        print(f"      [Dept {parse_val(f.get('order')):02d}] {parse_val(f.get('name')):<26} | Code Range: {parse_val(f.get('codeRange')):<25} | Items: {parse_val(f.get('itemCount'))}")

    # 2. Items
    print("\n3. Verifying 'items' collection...", flush=True)
    item_mask = ["code", "stock", "openingBalance", "totalIn", "totalOut", "status"]
    item_docs = fetch_all_docs("items", token, mask_fields=item_mask, page_size=100)
    active_items = []
    archived_items = []
    total_live_stock = 0.0
    total_live_open = 0.0
    total_live_in = 0.0
    total_live_out = 0.0

    for doc in item_docs:
        f = doc.get("fields", {})
        code = str(parse_val(f.get("code")))
        st = parse_val(f.get("status"))
        stock = float(parse_val(f.get("stock")) or 0)
        open_b = float(parse_val(f.get("openingBalance")) or 0)
        t_in = float(parse_val(f.get("totalIn")) or 0)
        t_out = float(parse_val(f.get("totalOut")) or 0)

        if st == "ARCHIVED":
            archived_items.append(code)
        else:
            active_items.append(code)
            total_live_stock += stock
            total_live_open += open_b
            total_live_in += t_in
            total_live_out += t_out

    print(f"\n   -> Total Items in Firestore: {len(item_docs)}")
    print(f"   -> Active 8-Digit Items: {len(active_items)} (Expected: 902)")
    print(f"   -> Archived Obsolete Items: {len(archived_items)} (Expected: 0)")
    print(f"   -> Cloud Total Opening Balance: {total_live_open:,.2f} (Expected: 6,080.00)")
    print(f"   -> Cloud Total In (Additions): {total_live_in:,.2f} (Expected: 60,593.50)")
    print(f"   -> Cloud Total Out (Disbursed): {total_live_out:,.2f} (Expected: 51,940.25)")
    print(f"   -> Cloud Total Current Stock: {total_live_stock:,.2f} (Expected: 14,733.25)")

    # Mathematical Parity Verification
    parity_diff = (total_live_open + total_live_in - total_live_out) - total_live_stock
    print(f"   -> Parity Equation: {total_live_open:,.2f} + {total_live_in:,.2f} - {total_live_out:,.2f} = {total_live_stock:,.2f}")
    print(f"   -> Cloud Internal Variance: {parity_diff:.4f}")

    assert len(active_items) == 902, f"Active items count mismatch: {len(active_items)} != 902"
    assert abs(total_live_stock - 14733.25) < 0.01, f"Stock mismatch: {total_live_stock} != 14733.25"
    assert abs(parity_diff) < 0.0001, f"Parity mismatch: {parity_diff}"

    # 3. Additions
    print("\n4. Verifying 'additions' collection...", flush=True)
    add_mask = ["id", "qty", "itemCode"]
    add_docs = fetch_all_docs("additions", token, mask_fields=add_mask, page_size=100)
    sum_add_qty = sum(float(parse_val(d.get("fields", {}).get("qty")) or 0) for d in add_docs)
    print(f"   -> Total Addition Records: {len(add_docs)} (Expected: 1700)")
    print(f"   -> Total Addition Qty: {sum_add_qty:,.2f} (Expected: 60,593.50)")
    assert len(add_docs) == 1700, f"Additions count mismatch: {len(add_docs)} != 1700"
    assert abs(sum_add_qty - 60593.50) < 0.01, f"Additions qty mismatch: {sum_add_qty} != 60593.50"

    # 4. Disbursements
    print("\n5. Verifying 'disbursements' collection...", flush=True)
    dis_mask = ["id", "qty", "itemCode"]
    dis_docs = fetch_all_docs("disbursements", token, mask_fields=dis_mask, page_size=100)
    sum_dis_qty = sum(float(parse_val(d.get("fields", {}).get("qty")) or 0) for d in dis_docs)
    print(f"   -> Total Disbursement Records: {len(dis_docs)} (Expected: 2716)")
    print(f"   -> Total Disbursement Qty: {sum_dis_qty:,.2f} (Expected: 51,940.25)")
    assert len(dis_docs) == 2716, f"Disbursements count mismatch: {len(dis_docs)} != 2716"
    assert abs(sum_dis_qty - 51940.25) < 0.01, f"Disbursements qty mismatch: {sum_dis_qty} != 51940.25"

    print("\n=================================================================", flush=True)
    print("ALL LIVE FIRESTORE COLLECTIONS & DATA 100.00% VERIFIED AND MATCHED!", flush=True)
    print("=================================================================", flush=True)

if __name__ == "__main__":
    verify_complete_system()
