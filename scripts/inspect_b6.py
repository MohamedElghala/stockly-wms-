import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'scripts\scratch\tree_reorganized_catalog.json', 'r', encoding='utf-8') as f:
    tree = json.load(f)

print("Current Branch 6 items in Electrical:")
for it in tree['1']:
    if it['tree_cat_id'] == 6:
        print(f"Code {it['orig_code']} | Disb: {it['disb']} | {it['name']}")
