import json
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'scripts\scratch\extracted_raw_catalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

# Identify the 32 consumables to move
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

# Categorize items into their target department
target_departments = {}
for i in range(1, 18):
    target_departments[i] = []

for item in catalog:
    code = item['orig_code']
    name = item['name']
    dept_id = item['orig_dept_id']
    
    # Check spelling fixes
    if code == '100262':
        item['name'] = 'تجميعة سرية نور ميدان'
    
    # Check move to consumables
    if code in consumables_codes:
        if code == '111105': # DW 40 merges into WD-40
            # will merge later
            continue
        item['target_dept_id'] = 17
        item['target_dept_name'] = 'قسم المستهلكات'
        target_departments[17].append(item)
    else:
        item['target_dept_id'] = dept_id
        item['target_dept_name'] = item['orig_dept_name']
        target_departments[dept_id].append(item)

print("Department item counts:")
for d_id in range(1, 18):
    d_name = target_departments[d_id][0]['target_dept_name'] if target_departments[d_id] else f"Dept {d_id}"
    print(f"Dept {d_id} ({d_name}): {len(target_departments[d_id])} items")

total_items = sum(len(items) for items in target_departments.values())
print(f"Total catalog after merge of DW 40: {total_items}")
