import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'scripts\scratch\tree_reorganized_catalog.json', 'r', encoding='utf-8') as f:
    tree_catalog = json.load(f)

for d_id in range(1, 18):
    items = tree_catalog[str(d_id)]
    categories = {}
    for it in items:
        c_id = it['tree_cat_id']
        c_name = it['tree_cat_name']
        if (c_id, c_name) not in categories:
            categories[(c_id, c_name)] = []
        categories[(c_id, c_name)].append(it)
    
    print(f"=== Dept {d_id} ===")
    for (c_id, c_name), cat_items in sorted(categories.items()):
        disb_sum = sum(x['disb'] for x in cat_items)
        stock_sum = sum(x['stock'] for x in cat_items)
        print(f"  Branch {c_id}: {c_name} -> {len(cat_items)} أصناف | إجمالي المنصرف: {disb_sum:,.1f} | الرصيد: {stock_sum:,.1f}")
        # Top 3 items
        for it in cat_items[:3]:
            print(f"     - {it['name']} (منصرف: {it['disb']} {it['unit']})")
