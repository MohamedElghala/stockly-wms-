import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'scripts\scratch\tree_reorganized_catalog.json', 'r', encoding='utf-8') as f:
    tree_catalog = json.load(f)

old_to_new = {}
catalog_with_new_codes = []

for d_id in range(1, 18):
    items = tree_catalog[str(d_id)]
    for idx, it in enumerate(items, 1):
        new_code = f"{1000 + d_id:04d}{idx:04d}"
        it['new_code'] = new_code
        it['target_dept_id'] = d_id
        old_to_new[it['orig_code']] = new_code
        catalog_with_new_codes.append(it)

# DW 40 (111105) merges into WD-40 (116113)
wd40_item = next(it for it in catalog_with_new_codes if 'WD-40' in it['name'] or it['orig_code'] == '116113')
old_to_new['111105'] = wd40_item['new_code']
old_to_new['9999'] = '9999'

print(f"Total mapped items: {len(catalog_with_new_codes)}")
print(f"WD-40 new code: {wd40_item['new_code']}")
print(f"DW 40 mapped to: {old_to_new['111105']}")

with open(r'scripts\scratch\old_to_new_code_map.json', 'w', encoding='utf-8') as f:
    json.dump(old_to_new, f, ensure_ascii=False, indent=2)

with open(r'scripts\scratch\catalog_with_new_codes.json', 'w', encoding='utf-8') as f:
    json.dump(catalog_with_new_codes, f, ensure_ascii=False, indent=2)

print("Generated mapping files successfully.")
