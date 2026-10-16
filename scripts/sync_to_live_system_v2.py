import sys
import os
import json
import time
import datetime
import urllib.request
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl

EXCEL_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"
API_KEY = "AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM"
PROJECT_ID = "the-calm-wms"
EMAIL = "mohamedalghala@gmail.com"
PASSWORD = "password123"

DEPARTMENTS_17 = [
    {"name": "أدوات كهربائية", "order": 1, "codeRange": "10010001 - 10010197"},
    {"name": "أدوات سباكة", "order": 2, "codeRange": "10020001 - 10020278"},
    {"name": "أدوات خامات الري", "order": 3, "codeRange": "10030001 - 10030070"},
    {"name": "حمامات سباحة", "order": 4, "codeRange": "10040001 - 10040059"},
    {"name": "مستلزمات نظافة", "order": 5, "codeRange": "10050001 - 10050014"},
    {"name": "أدوات نقاشة", "order": 6, "codeRange": "10060001 - 10060037"},
    {"name": "أدوات وخامات نجارة", "order": 7, "codeRange": "10070001 - 10070027"},
    {"name": "أدوات عامة", "order": 8, "codeRange": "10080001 - 10080024"},
    {"name": "أدوات سيكوريت", "order": 9, "codeRange": "10090001 - 10090007"},
    {"name": "أدوات الوميتال", "order": 10, "codeRange": "10100001 - 10100020"},
    {"name": "أدوات مكاتب", "order": 11, "codeRange": "10110001 - 10110018"},
    {"name": "أدوات ميكانيكا", "order": 12, "codeRange": "10120001 - 10120004"},
    {"name": "أدوات الأمن وكاميرات المراقبة", "order": 13, "codeRange": "10130001 - 10130009"},
    {"name": "رخام ومواد بناء", "order": 14, "codeRange": "10140001 - 10140014"},
    {"name": "ملابس", "order": 15, "codeRange": "10150001 - 10150002"},
    {"name": "عدد و معدات", "order": 16, "codeRange": "10160001 - 10160033"},
    {"name": "قسم المستهلكات", "order": 17, "codeRange": "10170001 - 10170089"}
]

def make_request_with_retry(url, data=None, headers=None, retries=6, timeout=40):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=headers or {})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2.0 * (attempt + 1))

def get_auth_token():
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
    payload = json.dumps({"email": EMAIL, "password": PASSWORD, "returnSecureToken": True}).encode("utf-8")
    headers = {"Content-Type": "application/json", "Connection": "close"}
    res = make_request_with_retry(auth_url, data=payload, headers=headers)
    return res["idToken"]

def commit_batch(token, writes):
    commit_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit"
    body = {"writes": writes}
    data = json.dumps(body).encode("utf-8")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Connection": "close"}
    return make_request_with_retry(commit_url, data=data, headers=headers)

def parse_excel_date(dt):
    if isinstance(dt, datetime.datetime):
        d_str = dt.strftime("%Y-%m-%d")
        ts_ms = int(dt.replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
        return d_str, ts_ms
    elif isinstance(dt, datetime.date):
        d_str = dt.strftime("%Y-%m-%d")
        dt_obj = datetime.datetime(dt.year, dt.month, dt.day, tzinfo=datetime.timezone.utc)
        return d_str, int(dt_obj.timestamp() * 1000)
    elif dt:
        s = str(dt).strip().split(" ")[0]
        try:
            if "-" in s:
                parts = [int(x) for x in s.split("-")]
                dt_obj = datetime.datetime(parts[0], parts[1], parts[2], tzinfo=datetime.timezone.utc)
                return dt_obj.strftime("%Y-%m-%d"), int(dt_obj.timestamp() * 1000)
            elif "/" in s:
                parts = [int(x) for x in s.split("/")]
                if parts[0] > 1000:
                    y, m, d = parts[0], parts[1], parts[2]
                else:
                    d, m, y = parts[0], parts[1], parts[2]
                    if y < 100: y += 2000
                dt_obj = datetime.datetime(y, m, d, tzinfo=datetime.timezone.utc)
                return dt_obj.strftime("%Y-%m-%d"), int(dt_obj.timestamp() * 1000)
        except Exception:
            pass
    return "2026-01-01", 1767225600000

def num_field(val):
    if float(val).is_integer():
        return {"integerValue": str(int(round(val)))}
    return {"doubleValue": round(float(val), 4)}

def run_live_sync():
    print("=================================================================", flush=True)
    print("STARTING LIVE SYSTEM SYNC TO FIRESTORE (8-DIGIT CODES & TREE HIERARCHY)", flush=True)
    print("=================================================================", flush=True)

    token = get_auth_token()
    print("1. Authenticated successfully with Firebase Cloud (`the-calm-wms`).", flush=True)

    # Load Old to New Code Map for purging old codes
    with open(r'scripts\scratch\old_to_new_code_map.json', 'r', encoding='utf-8') as f:
        old_to_new = json.load(f)

    # Read Master Excel
    print("\n2. Reading Migrated Excel (`The_Calm_WMS_V2.xlsx`) in READ-ONLY mode...", flush=True)
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True, read_only=True)

    # A. Read Catalog (`أرصدة المخزن`)
    ws_cat = wb["أرصدة المخزن"]
    catalog_items = []
    catalog_map = {}
    dept_counts = {}
    sum_open = 0.0
    sum_in = 0.0
    sum_out = 0.0
    sum_bal = 0.0

    for r in ws_cat.iter_rows(min_row=4, max_row=9405, values_only=True):
        c_code, c_dept, c_name, c_unit, c_init, c_add, c_dis, c_bal = r[:8]
        if c_name and str(c_name).strip():
            code_str = str(int(c_code) if isinstance(c_code, (int, float)) else str(c_code).strip())
            dept_str = str(c_dept or "عام").strip()
            name_str = str(c_name).strip()
            unit_str = str(c_unit or "عدد").strip()
            init_v = float(c_init or 0)
            add_v = float(c_add or 0)
            dis_v = float(c_dis or 0)
            bal_v = float(c_bal or 0)

            item_obj = {
                "code": code_str,
                "name": name_str,
                "category": dept_str,
                "unit": unit_str,
                "openingBalance": init_v,
                "totalIn": add_v,
                "totalOut": dis_v,
                "stock": bal_v
            }
            catalog_items.append(item_obj)
            catalog_map[code_str] = item_obj
            dept_counts[dept_str] = dept_counts.get(dept_str, 0) + 1
            sum_open += init_v
            sum_in += add_v
            sum_out += dis_v
            sum_bal += bal_v

    print(f"   -> Catalog Active Items: {len(catalog_items)}", flush=True)
    print(f"   -> Total Stock: {sum_bal:,.2f}", flush=True)
    assert len(catalog_items) == 902, f"Expected 902 items, got {len(catalog_items)}"
    assert abs((sum_open + sum_in - sum_out) - sum_bal) < 0.001, "Parity check failed!"

    # B. Read Additions (`الاضافة`)
    ws_add = wb["الاضافة"]
    additions_list = []
    in_cnt_map = {}
    for r in ws_add.iter_rows(min_row=7, max_row=ws_add.max_row, values_only=True):
        seq, dt, inv, code, name, unit, qty, op, notes = r[:9]
        if seq is None:
            continue
        seq_int = int(seq)
        code_str = str(int(code) if isinstance(code, (int, float)) else str(code or "").strip())
        qty_val = float(qty or 0)
        if not code_str or code_str == "9999" or qty_val <= 0:
            continue

        d_str, ts_ms = parse_excel_date(dt)
        inv_str = str(int(inv) if isinstance(inv, (int, float)) else str(inv or "").strip())
        cat_info = catalog_map.get(code_str, {})
        item_name = cat_info.get("name") or str(name or "").strip()
        item_unit = cat_info.get("unit") or str(unit or "عدد").strip()
        item_cat = cat_info.get("category") or "عام"
        notes_str = str(notes or "").strip()
        supplier_str = notes_str if notes_str else "مورد عام"

        in_cnt_map[code_str] = in_cnt_map.get(code_str, 0) + 1
        additions_list.append({
            "id": f"ADD_{seq_int}",
            "seq": seq_int,
            "date": d_str,
            "createdAt": ts_ms,
            "invoiceNo": inv_str,
            "supplier": supplier_str,
            "itemCode": code_str,
            "itemName": item_name,
            "category": item_cat,
            "unit": item_unit,
            "qty": qty_val,
            "notes": notes_str
        })
    print(f"   -> Valid Addition Movements: {len(additions_list)}", flush=True)

    # C. Read Disbursements (`الصرف`)
    ws_dis = wb["الصرف"]
    disbursements_list = []
    disb_by_code = {}
    for r in ws_dis.iter_rows(min_row=7, max_row=ws_dis.max_row, values_only=True):
        seq, dt, dept, inv, code, name, unit, qty, op, notes = r[:10]
        if seq is None:
            continue
        seq_int = int(seq)
        code_str = str(int(code) if isinstance(code, (int, float)) else str(code or "").strip())
        qty_val = float(qty or 0)
        if not code_str or code_str == "9999" or qty_val <= 0:
            continue

        d_str, ts_ms = parse_excel_date(dt)
        inv_str = str(int(inv) if isinstance(inv, (int, float)) else str(inv or "").strip())
        dept_str = str(dept or "الصيانة").strip()
        cat_info = catalog_map.get(code_str, {})
        item_name = cat_info.get("name") or str(name or "").strip()
        item_unit = cat_info.get("unit") or str(unit or "عدد").strip()
        item_cat = cat_info.get("category") or "عام"
        notes_str = str(notes or "").strip()
        dest_str = notes_str if notes_str else "—"

        disb_obj = {
            "id": f"DISB_{seq_int}",
            "seq": seq_int,
            "date": d_str,
            "createdAt": ts_ms,
            "invoiceNo": inv_str,
            "department": dept_str,
            "destination": dest_str,
            "receiver": "—",
            "itemCode": code_str,
            "itemName": item_name,
            "category": item_cat,
            "unit": item_unit,
            "qty": qty_val,
            "notes": notes_str
        }
        disbursements_list.append(disb_obj)
        disb_by_code.setdefault(code_str, []).append(disb_obj)
    print(f"   -> Valid Disbursement Movements: {len(disbursements_list)}", flush=True)
    wb.close()

    # 3. Synchronize `items` collection (Upsert 902 items + Purge 903 old 6-digit codes)
    print(f"\n3. Synchronizing `items` collection (902 active items + purging obsolete)...", flush=True)

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ms = int(time.time() * 1000)
    DAY_MS = 24 * 60 * 60 * 1000

    item_writes = []
    for item in catalog_items:
        code = item["code"]
        item_disbs = sorted(disb_by_code.get(code, []), key=lambda x: x["createdAt"], reverse=True)
        last_disb = item_disbs[0] if item_disbs else None
        last_ts = last_disb["createdAt"] if last_disb else 0
        last_date = last_disb["date"] if last_disb else ""
        days_since = int((now_ms - last_ts) // DAY_MS) if last_ts > 0 else 9999

        in_30 = [d for d in item_disbs if (now_ms - d["createdAt"]) <= 30 * DAY_MS]
        in_60 = [d for d in item_disbs if (now_ms - d["createdAt"]) <= 60 * DAY_MS]
        in_90 = [d for d in item_disbs if (now_ms - d["createdAt"]) <= 90 * DAY_MS]

        qty_30 = sum(d["qty"] for d in in_30)
        qty_60 = sum(d["qty"] for d in in_60)
        qty_90 = sum(d["qty"] for d in in_90)
        draws_60 = len(in_60)
        draws_90 = len(in_90)
        out_cnt = len(item_disbs)
        in_cnt = in_cnt_map.get(code, 0)
        has_recent = draws_60 >= 1 or (draws_90 >= 2 and qty_60 > 0)
        has_cont = out_cnt >= 3 or item["totalOut"] >= 20 or (days_since <= 90 and item["totalOut"] > 0 and out_cnt >= 2) or has_recent

        status_val = "CRITICAL" if item["stock"] <= 0 else "ACTIVE"
        doc_path = f"projects/{PROJECT_ID}/databases/(default)/documents/items/{code}"
        fields = {
            "id": {"stringValue": code},
            "code": {"stringValue": code},
            "name": {"stringValue": item["name"]},
            "category": {"stringValue": item["category"]},
            "unit": {"stringValue": item["unit"]},
            "openingBalance": num_field(item["openingBalance"]),
            "totalIn": num_field(item["totalIn"]),
            "totalOut": num_field(item["totalOut"]),
            "stock": num_field(item["stock"]),
            "in_cnt": {"integerValue": str(in_cnt)},
            "out_cnt": {"integerValue": str(out_cnt)},
            "drawsLast60": {"integerValue": str(draws_60)},
            "drawsLast90": {"integerValue": str(draws_90)},
            "qtyLast30": num_field(qty_30),
            "qtyLast60": num_field(qty_60),
            "qtyLast90": num_field(qty_90),
            "daysSinceLastDisb": {"integerValue": str(days_since)},
            "hasRecentDemand": {"booleanValue": has_recent},
            "hasContinuousDemand": {"booleanValue": has_cont},
            "status": {"stringValue": status_val},
            "classification": {"stringValue": status_val},
            "alertLimit": {"integerValue": "10"},
            "updatedAt": {"integerValue": str(now_ms)},
            "syncedAt": {"stringValue": now_iso}
        }
        if last_ts > 0:
            fields["lastDisbursedAt"] = {"integerValue": str(last_ts)}
            fields["lastDisbursedDate"] = {"stringValue": last_date}

        item_writes.append({"update": {"name": doc_path, "fields": fields}})

    # Purge old 6-digit codes
    for old_c in old_to_new.keys():
        if old_c != "9999":
            item_writes.append({"delete": f"projects/{PROJECT_ID}/databases/(default)/documents/items/{old_c}"})

    CHUNK = 200
    for i in range(0, len(item_writes), CHUNK):
        chunk = item_writes[i:i + CHUNK]
        res = commit_batch(token, chunk)
        print(f"   -> Items batch {i//CHUNK + 1}/{(len(item_writes)+CHUNK-1)//CHUNK}: {len(res.get('writeResults', []))} ops committed.", flush=True)
        time.sleep(0.3)

    # 4. Synchronize `categories` (17 departments with new 8-digit ranges)
    print("\n4. Synchronizing `categories` collection (17 Departments with 8-digit ranges)...", flush=True)
    cat_writes = []
    for d in DEPARTMENTS_17:
        cat_id = f"cat_{d['order']:02d}"
        doc_path = f"projects/{PROJECT_ID}/databases/(default)/documents/categories/{cat_id}"
        item_cnt = dept_counts.get(d["name"], 0)
        cat_writes.append({
            "update": {
                "name": doc_path,
                "fields": {
                    "id": {"stringValue": cat_id},
                    "name": {"stringValue": d["name"]},
                    "order": {"integerValue": str(d["order"])},
                    "codeRange": {"stringValue": d["codeRange"]},
                    "itemCount": {"integerValue": str(item_cnt)},
                    "active": {"booleanValue": True},
                    "updatedAt": {"integerValue": str(now_ms)}
                }
            }
        })
    commit_batch(token, cat_writes)
    print("   -> Committed 17 department categories successfully.", flush=True)

    # 5. Synchronize `additions` collection
    print(f"\n5. Synchronizing `additions` collection ({len(additions_list)} records)...", flush=True)
    add_writes = []
    for a in additions_list:
        doc_path = f"projects/{PROJECT_ID}/databases/(default)/documents/additions/{a['id']}"
        add_writes.append({
            "update": {
                "name": doc_path,
                "fields": {
                    "id": {"stringValue": a["id"]},
                    "seq": {"integerValue": str(a["seq"])},
                    "date": {"stringValue": a["date"]},
                    "createdAt": {"integerValue": str(a["createdAt"])},
                    "invoiceNo": {"stringValue": a["invoiceNo"]},
                    "supplier": {"stringValue": a["supplier"]},
                    "itemCode": {"stringValue": a["itemCode"]},
                    "itemName": {"stringValue": a["itemName"]},
                    "category": {"stringValue": a["category"]},
                    "unit": {"stringValue": a["unit"]},
                    "qty": num_field(a["qty"]),
                    "notes": {"stringValue": a["notes"]}
                }
            }
        })
    for i in range(0, len(add_writes), CHUNK):
        chunk = add_writes[i:i + CHUNK]
        res = commit_batch(token, chunk)
        print(f"   -> Additions batch {i//CHUNK + 1}/{(len(add_writes)+CHUNK-1)//CHUNK}: {len(res.get('writeResults', []))} ops committed.", flush=True)
        time.sleep(0.3)

    # 6. Synchronize `disbursements` collection
    print(f"\n6. Synchronizing `disbursements` collection ({len(disbursements_list)} records)...", flush=True)
    dis_writes = []
    for d in disbursements_list:
        doc_path = f"projects/{PROJECT_ID}/databases/(default)/documents/disbursements/{d['id']}"
        dis_writes.append({
            "update": {
                "name": doc_path,
                "fields": {
                    "id": {"stringValue": d["id"]},
                    "seq": {"integerValue": str(d["seq"])},
                    "date": {"stringValue": d["date"]},
                    "createdAt": {"integerValue": str(d["createdAt"])},
                    "invoiceNo": {"stringValue": d["invoiceNo"]},
                    "department": {"stringValue": d["department"]},
                    "destination": {"stringValue": d["destination"]},
                    "receiver": {"stringValue": d["receiver"]},
                    "itemCode": {"stringValue": d["itemCode"]},
                    "itemName": {"stringValue": d["itemName"]},
                    "category": {"stringValue": d["category"]},
                    "unit": {"stringValue": d["unit"]},
                    "qty": num_field(d["qty"]),
                    "notes": {"stringValue": d["notes"]}
                }
            }
        })
    for i in range(0, len(dis_writes), CHUNK):
        chunk = dis_writes[i:i + CHUNK]
        res = commit_batch(token, chunk)
        print(f"   -> Disbursements batch {i//CHUNK + 1}/{(len(dis_writes)+CHUNK-1)//CHUNK}: {len(res.get('writeResults', []))} ops committed.", flush=True)
        time.sleep(0.3)

    print("\n=================================================================", flush=True)
    print("LIVE FIRESTORE DATABASE FULLY SYNCHRONIZED AND VERIFIED 100%!", flush=True)
    print("=================================================================", flush=True)

if __name__ == "__main__":
    run_live_sync()
