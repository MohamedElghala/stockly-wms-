import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'scripts\scratch\extracted_raw_catalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

consumables_codes = {
    '100133', '100151', '100180', '100278', '100291', '100293', '100295',
    '101322', '101336', '101337', '101338', '101347', '101351',
    '105103', '105123',
    '106101', '106104', '106106', '106108', '106130', '106134', '106143',
    '107111', '107119', '107140',
    '111105', '111106', '111108', '111109',
    '113115',
    '115107', '115120'
}

elec_items = []
for item in catalog:
    if item['orig_dept_id'] == 1 and item['orig_code'] not in consumables_codes:
        elec_items.append(item)

print(f"Total Electrical items: {len(elec_items)}")

# Let's inspect the names to design the sub-families
with open(r'scripts\scratch\elec_items.txt', 'w', encoding='utf-8') as f:
    for item in sorted(elec_items, key=lambda x: -x['disb']):
        f.write(f"Row {item['orig_row']} | Code {item['orig_code']} | Disb: {item['disb']} | Stock: {item['stock']} | {item['name']}\n")

print("Saved elec_items.txt")
