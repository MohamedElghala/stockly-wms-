import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'scripts\scratch\extracted_raw_catalog.json', 'r', encoding='utf-8') as f:
    cat = json.load(f)

print('First 10 items orig_code and type:')
for item in cat[:10]:
    print(repr(item['orig_code']), type(item['orig_code']), item['orig_row'])

# Look for 100133
for item in cat:
    if '100133' in str(item['orig_code']) or 'افيز' in item['name']:
        print("Found:", repr(item['orig_code']), repr(item['name']), item['orig_row'])
