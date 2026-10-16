import sys
import json
import urllib.request
sys.stdout.reconfigure(encoding='utf-8')

API_KEY = 'AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM'
PROJECT_ID = 'the-calm-wms'
EMAIL = 'mohamedalghala@gmail.com'
PASSWORD = 'password123'

def get_auth_token():
    auth_url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}'
    payload = json.dumps({'email': EMAIL, 'password': PASSWORD, 'returnSecureToken': True}).encode('utf-8')
    req = urllib.request.Request(auth_url, data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))['idToken']

def parse_val(v):
    if not isinstance(v, dict): return v
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'doubleValue' in v: return float(v['doubleValue'])
    if 'booleanValue' in v: return v['booleanValue']
    return str(v)

def fetch_all_items(token):
    items = []
    page_token = None
    while True:
        url = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/items?pageSize=300'
        if page_token: url += f'&pageToken={page_token}'
        r = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(r) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for doc in data.get('documents', []):
                fields = {k: parse_val(v) for k, v in doc.get('fields', {}).items()}
                items.append(fields)
            page_token = data.get('nextPageToken')
            if not page_token: break
    return items

def update_item_override(token, code, override_type, notes=""):
    url = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/items/{code}?updateMask.fieldPaths=shortageOverride&updateMask.fieldPaths=classification&updateMask.fieldPaths=status&updateMask.fieldPaths=substituteNotes'
    
    body = {
        'fields': {
            'shortageOverride': {'stringValue': override_type},
            'classification': {'stringValue': override_type},
            'status': {'stringValue': override_type},
            'substituteNotes': {'stringValue': notes}
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode('utf-8'),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='PATCH'
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def list_shortages():
    print("=" * 65)
    print("THE CALM WMS - LIVE SHORTAGE & OVERRIDE MANAGEMENT")
    print("=" * 65)
    token = get_auth_token()
    print("1. Connected to Live Firestore.")
    print("2. Loading items...")
    items = fetch_all_items(token)
    print(f"   Loaded {len(items)} items from cloud database.\n")

    on_demand = [i for i in items if i.get('shortageOverride') == 'ON_DEMAND' or i.get('classification') == 'ON_DEMAND']
    normal_override = [i for i in items if i.get('shortageOverride') == 'NORMAL' or i.get('classification') == 'NORMAL']
    critical = [i for i in items if (float(i.get('stock') or 0) <= 0 or float(i.get('stock') or 0) <= float(i.get('alertLimit') or 10)) and i not in on_demand and i not in normal_override]

    print(f"Status Summary in Live Cloud:")
    print(f"  - الأصناف الحرجة (Critical): {len(critical)} صنف")
    print(f"  - مستثنى بالطلب / له بديل (On Demand): {len(on_demand)} صنف")
    print(f"  - مستثنى نقص عادي (Normal Override): {len(normal_override)} صنف\n")

    if on_demand:
        print("الأصناف المستثناة حالياً (بالطلب فقط / لها بدائل):")
        for it in on_demand:
            print(f"  * [{it.get('code')}] {it.get('name')} | الرصيد: {it.get('stock')} {it.get('unit')} | ملاحظة البديل: {it.get('substituteNotes')}")

if __name__ == '__main__':
    if len(sys.argv) > 2:
        code = sys.argv[1]
        override = sys.argv[2] # ON_DEMAND, NORMAL, AUTO, CRITICAL
        notes = sys.argv[3] if len(sys.argv) > 3 else ""
        token = get_auth_token()
        update_item_override(token, code, override, notes)
        print(f"Successfully set item {code} override to {override} with notes: {notes}")
    else:
        list_shortages()
