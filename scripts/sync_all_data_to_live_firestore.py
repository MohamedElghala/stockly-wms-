import sys
import os
import json
import time
import datetime
import urllib.request
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl

EXCEL_FILE = r"C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.xlsx"
MIRROR_FILE = r"D:\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx"
API_KEY = "AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM"
PROJECT_ID = "the-calm-wms"
EMAIL = "mohamedalghala@gmail.com"
PASSWORD = "password123"

DEPARTMENTS_17 = [
    {"name": "أدوات كهربائية", "order": 1, "codeRange": "100101 - 100320"},
    {"name": "أدوات سباكة", "order": 2, "codeRange": "101101 - 101386"},
    {"name": "أدوات خامات الري", "order": 3, "codeRange": "102101 - 102170"},
    {"name": "حمامات سباحة", "order": 4, "codeRange": "103101 - 103159"},
    {"name": "مستلزمات نظافة", "order": 5, "codeRange": "104101 - 104114"},
    {"name": "أدوات نقاشة", "order": 6, "codeRange": "105101 - 105140"},
    {"name": "أدوات وخامات نجارة", "order": 7, "codeRange": "106101 - 106151"},
    {"name": "أدوات عامة", "order": 8, "codeRange": "107101 - 107140"},
    {"name": "أدوات سيكوريت", "order": 9, "codeRange": "108102 - 108110"},
    {"name": "أدوات الوميتال", "order": 10, "codeRange": "109101 - 109120"},
    {"name": "أدوات مكاتب", "order": 11, "codeRange": "110101 - 110118"},
    {"name": "أدوات ميكانيكا", "order": 12, "codeRange": "111101 - 111109"},
    {"name": "أدوات الأمن وكاميرات المراقبة", "order": 13, "codeRange": "112101 - 112109"},
    {"name": "رخام ومواد بناء", "order": 14, "codeRange": "113101 - 113116"},
    {"name": "ملابس", "order": 15, "codeRange": "114101 - 114102"},
    {"name": "عدد و معدات", "order": 16, "codeRange": "115101 - 115135"},
    {"name": "قسم المستهلكات", "order": 17, "codeRange": "116101 - 116159"}
]

def urlopen_with_retry(req, retries=6, timeout=45):
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))

def get_auth_token():
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
    payload = json.dumps({"email": EMAIL, "password": PASSWORD, "returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(auth_url, data=payload, headers={"Content-Type": "application/json", "Connection": "close"})
    return urlopen_with_retry(req)["idToken"]

def commit_batch(token, writes):
    commit_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit"
    body = {"writes": writes}
    req = urllib.request.Request(
        commit_url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Connection": "close"}
    )
    return urlopen_with_retry(req)

def list_doc_ids(token, col):
    ids = set()
    pt = None
    while True:
        u = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/{col}?pageSize=300" + (f"&pageToken={pt}" if pt else "")
        req = urllib.request.Request(u, headers={"Authorization": f"Bearer {token}", "Connection": "close"})
        d = urlopen_with_retry(req)
        for doc in d.get("documents", []):
            ids.add(doc["name"].split("/")[-1])
        pt = d.get("nextPageToken")
        if not pt:
            break
    return ids

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

def run_full_sync():
    print("=================================================================")
    print("STARTING FULL LIVE FIRESTORE DATA SYNC (ITEMS + ADD + DISB + CAT)")
    print("=================================================================")

    token = get_auth_token()
    print("1. Authenticated with Firebase Live Cloud (`the-calm-wms`).")

    # Open Excel Strictly Read-Only
    print("\n2. Reading Master Excel (`The_Calm_WMS_V2.xlsx`) in READ-ONLY mode...")
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
    curr_dept = "عام"

    for r in ws_cat.iter_rows(min_row=4, max_row=8503, values_only=True):
        c_code, c_dept, c_name, c_unit, c_init, c_add, c_dis, c_bal = r[:8]
        if c_dept and str(c_dept).strip():
            curr_dept = str(c_dept).strip()
        if c_name and str(c_name).strip():
            code_str = str(int(c_code) if isinstance(c_code, (int, float)) else str(c_code).strip())
            name_str = str(c_name).strip()
            unit_str = str(c_unit or "عدد").strip()
            init_v = float(c_init or 0)
            add_v = float(c_add or 0)
            dis_v = float(c_dis or 0)
            bal_v = float(c_bal or 0)

            item_obj = {
                "code": code_str,
                "name": name_str,
                "category": curr_dept,
                "unit": unit_str,
                "openingBalance": init_v,
                "totalIn": add_v,
                "totalOut": dis_v,
                "stock": bal_v
            }
            catalog_items.append(item_obj)
            catalog_map[code_str] = item_obj
            dept_counts[curr_dept] = dept_counts.get(curr_dept, 0) + 1
            sum_open += init_v
            sum_in += add_v
            sum_out += dis_v
            sum_bal += bal_v

    pos_items = sum(1 for it in catalog_items if it["stock"] > 0)
    print(f"   -> Catalog Items: {len(catalog_items)} ({pos_items} with stock > 0) | Total Stock: {sum_bal:,.2f}")
    assert abs((sum_open + sum_in - sum_out) - sum_bal) < 0.001, f"Formula mismatch: {sum_open} + {sum_in} - {sum_out} != {sum_bal}"

    # B. Read Additions (`الاضافة`, rows 7..max_row)
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

    print(f"   -> Valid Addition Movements: {len(additions_list)} (Up to Voucher {additions_list[-1]['invoiceNo'] if additions_list else 'N/A'})")

    # C. Read Disbursements (`الصرف`, rows 7..max_row)
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

    print(f"   -> Valid Disbursement Movements: {len(disbursements_list)} (Up to Voucher {disbursements_list[-1]['invoiceNo'] if disbursements_list else 'N/A'})")
    wb.close()

    # 3. Sync `items` (all active items + delete known merged/obsolete docs with ZERO reads)
    print(f"\n3. Synchronizing `items` collection ({len(catalog_items)} active items & purging obsolete with 0 reads)...")
    active_item_ids = set(it["code"] for it in catalog_items)
    obsolete_item_ids = {"101181", "101369", "9999"} - active_item_ids
    print(f"   -> Active items to upsert: {len(active_item_ids)} | Obsolete IDs to purge: {sorted(obsolete_item_ids)}")

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

    for obs_id in obsolete_item_ids:
        item_writes.append({"delete": f"projects/{PROJECT_ID}/databases/(default)/documents/items/{obs_id}"})

    CHUNK = 120
    for i in range(0, len(item_writes), CHUNK):
        chunk = item_writes[i:i + CHUNK]
        res = commit_batch(token, chunk)
        print(f"   -> Items batch {i//CHUNK + 1}/{(len(item_writes)+CHUNK-1)//CHUNK}: {len(res.get('writeResults', []))} ops committed.")

    # 4. Sync `additions` (Up to Voucher 283 + merged item histories, 0 reads)
    print(f"\n4. Synchronizing `additions` collection (Up to Voucher 283, 0 reads)...")
    valid_add_ids = set(a["id"] for a in additions_list)
    max_add_seq = max((a["seq"] for a in additions_list), default=1718)
    obsolete_add_ids = [f"ADD_{s}" for s in range(1680, max_add_seq + 5) if f"ADD_{s}" not in valid_add_ids]
    target_additions = [a for a in additions_list if a["seq"] >= 1680 or a["itemCode"] in ("101183", "103138", "100320", "100181", "101269")]
    print(f"   -> Additions to upsert: {len(target_additions)} (Total valid in Excel: {len(valid_add_ids)}) | Cancelled gap IDs to purge: {len(obsolete_add_ids)}")

    add_writes = []
    for a in target_additions:
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
    for obs_id in obsolete_add_ids:
        add_writes.append({"delete": f"projects/{PROJECT_ID}/databases/(default)/documents/additions/{obs_id}"})

    for i in range(0, len(add_writes), CHUNK):
        chunk = add_writes[i:i + CHUNK]
        res = commit_batch(token, chunk)
        print(f"   -> Additions batch {i//CHUNK + 1}/{(len(add_writes)+CHUNK-1)//CHUNK}: {len(res.get('writeResults', []))} ops committed.")

    # 5. Sync `disbursements` (Up to Voucher 780 + merged item histories, 0 reads)
    print("\n5. Synchronizing `disbursements` collection (Up to Voucher 780, 0 reads)...")
    valid_dis_ids = set(d["id"] for d in disbursements_list)
    max_dis_seq = max((d["seq"] for d in disbursements_list), default=2734)
    obsolete_dis_ids = [f"DISB_{s}" for s in range(2610, max_dis_seq + 10) if f"DISB_{s}" not in valid_dis_ids]
    target_disbursements = [d for d in disbursements_list if d["seq"] >= 2610 or d["itemCode"] in ("101183", "103138", "100320", "100181", "101269")]
    print(f"   -> Disbursements to upsert: {len(target_disbursements)} (Total valid in Excel: {len(valid_dis_ids)}) | Cancelled gap IDs to purge: {len(obsolete_dis_ids)}")

    dis_writes = []
    for d in target_disbursements:
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
    for obs_id in obsolete_dis_ids:
        dis_writes.append({"delete": f"projects/{PROJECT_ID}/databases/(default)/documents/disbursements/{obs_id}"})

    for i in range(0, len(dis_writes), CHUNK):
        chunk = dis_writes[i:i + CHUNK]
        res = commit_batch(token, chunk)
        print(f"   -> Disbursements batch {i//CHUNK + 1}/{(len(dis_writes)+CHUNK-1)//CHUNK}: {len(res.get('writeResults', []))} ops committed.")

    # 6. Sync `categories` (17 Approved Departments)
    print("\n6. Synchronizing `categories` collection (17 Approved Departments)...")
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
    print("   -> Committed 17 department categories.")

    print("\n=================================================================")
    print("FULL LIVE FIRESTORE DATA SYNC COMPLETED 100% SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    run_full_sync()
