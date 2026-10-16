import sys
import json
import urllib.request
sys.stdout.reconfigure(encoding='utf-8')

API_KEY = 'AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM'
PROJECT_ID = 'the-calm-wms'
EMAIL = 'mohamedalghala@gmail.com'
PASSWORD = 'password123'

# 1. Auth
auth_url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}'
payload = json.dumps({'email': EMAIL, 'password': PASSWORD, 'returnSecureToken': True}).encode('utf-8')
req = urllib.request.Request(auth_url, data=payload, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode('utf-8'))['idToken']

def parse_val(v):
    if not isinstance(v, dict): return v
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'doubleValue' in v: return float(v['doubleValue'])
    if 'booleanValue' in v: return v['booleanValue']
    return str(v)

# 2. Query all items live
active_by_dept = {}
total_stock = 0.0
active_count = 0
archived_count = 0

page_token = None
while True:
    url = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/items?pageSize=300'
    if page_token:
        url += f'&pageToken={page_token}'
    r = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(r) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        for doc in data.get('documents', []):
            fields = doc.get('fields', {})
            st = parse_val(fields.get('status'))
            cat = parse_val(fields.get('category')) or 'غير محدد'
            stock = float(parse_val(fields.get('stock')) or 0)

            if st == 'ARCHIVED':
                archived_count += 1
            else:
                active_count += 1
                total_stock += stock
                if cat not in active_by_dept:
                    active_by_dept[cat] = {'count': 0, 'stock': 0.0}
                active_by_dept[cat]['count'] += 1
                active_by_dept[cat]['stock'] += stock

        page_token = data.get('nextPageToken')
        if not page_token:
            break

print('=== LIVE FIRESTORE AUDIT SUMMARY ===')
print(f'Total Active Items in Cloud: {active_count}')
print(f'Total Archived Obsolete Items: {archived_count}')
print(f'Total Current Stock in Cloud: {total_stock:,.2f}')
print(f'Total Departments with Active Items: {len(active_by_dept)}')
print('\nExact Breakdown by Department (Live Cloud):')
for dept, stats in sorted(active_by_dept.items(), key=lambda x: x[1]['count'], reverse=True):
    cnt = stats['count']
    stk = stats['stock']
    print(f'  - {dept}: {cnt} items | Stock = {stk:,.2f}')
