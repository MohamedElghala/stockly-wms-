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

# Group items into target departments
dept_items = {i: [] for i in range(1, 18)}

for item in catalog:
    code = item['orig_code']
    # Spelling corrections
    if code == '100262':
        item['name'] = 'تجميعة سرية نور ميدان'
    
    if code in consumables_codes:
        if code == '111105': # merge DW 40 into WD-40
            continue
        item['target_dept_id'] = 17
        dept_items[17].append(item)
    else:
        dept_items[item['orig_dept_id']].append(item)

# Summarize disbursements and top items for each department
with open(r'scripts\scratch\dept_summary.txt', 'w', encoding='utf-8') as f:
    for d_id in range(1, 18):
        items = dept_items[d_id]
        sorted_items = sorted(items, key=lambda x: -x['disb'])
        d_name = sorted_items[0]['orig_dept_name'] if sorted_items else f"Dept {d_id}"
        if d_id == 17:
            d_name = "قسم المستهلكات"
        f.write(f"=== القسم {d_id}: {d_name} (إجمالي الأصناف: {len(sorted_items)}) ===\n")
        total_disb = sum(x['disb'] for x in sorted_items)
        total_stock = sum(x['stock'] for x in sorted_items)
        f.write(f"إجمالي المنصرف: {total_disb:,.2f} | إجمالي الرصيد: {total_stock:,.2f}\n")
        f.write("أعلى 10 أصناف استهلاكاً بالقسم:\n")
        for idx, it in enumerate(sorted_items[:10], 1):
            f.write(f"  {idx}. [كود {it['orig_code']}] {it['name']} - منصرف: {it['disb']} {it['unit']} (رصيد: {it['stock']})\n")
        f.write("\n")

print("Dept summary generated at scripts/scratch/dept_summary.txt")
