import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'scripts\scratch\tree_reorganized_catalog.json', 'r', encoding='utf-8') as f:
    tree = json.load(f)

for d in ['1', '2', '3', '4']:
    print(f"=== Dept {d} ===")
    cats = {}
    for it in tree[d]:
        k = (it['tree_cat_id'], it['tree_cat_name'])
        cats.setdefault(k, []).append(it)
    for (cid, cname), items in sorted(cats.items()):
        disb_sum = sum(x['disb'] for x in items)
        stock_sum = sum(x['stock'] for x in items)
        print(f"  Branch {cid}: {cname} -> {len(items)} صنفاً | إجمالي المنصرف: {disb_sum:,.1f} | الرصيد: {stock_sum:,.1f}")
        for it in items[:4]:
            print(f"    - [كود {it['orig_code']}] {it['name']} (منصرف: {it['disb']} {it['unit']} | رصيد: {it['stock']})")
