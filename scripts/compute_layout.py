import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'scripts\scratch\tree_reorganized_catalog.json', 'r', encoding='utf-8') as f:
    tree_catalog = json.load(f)

dept_names = [
    (1, "أدوات كهربائية"),
    (2, "أدوات سباكة"),
    (3, "أدوات خامات الري"),
    (4, "حمامات سباحة"),
    (5, "مستلزمات نظافة"),
    (6, "أدوات نقاشة"),
    (7, "أدوات وخامات نجارة"),
    (8, "أدوات عامة"),
    (9, "أدوات سيكوريت"),
    (10, "أدوات الوميتال"),
    (11, "أدوات مكاتب"),
    (12, "أدوات ميكانيكا"),
    (13, "أدوات الأمن وكاميرات المراقبة"),
    (14, "رخام ومواد بناء"),
    (15, "ملابس"),
    (16, "عدد و معدات"),
    (17, "قسم المستهلكات"),
]

current_row = 4
dept_blocks = []

for d_id, d_name in dept_names:
    items = tree_catalog[str(d_id)]
    num_items = len(items)
    
    # Items range
    item_row_start = current_row
    item_row_end = current_row + num_items - 1
    
    code_start = f"{1000 + d_id:04d}0001"
    code_items_end = f"{1000 + d_id:04d}{num_items:04d}"
    
    # 500 Blank template rows
    blank_row_start = item_row_end + 1
    blank_row_end = blank_row_start + 500 - 1
    blank_code_start = f"{1000 + d_id:04d}{num_items + 1:04d}"
    blank_code_end = f"{1000 + d_id:04d}{num_items + 500:04d}"
    
    total_block_rows = num_items + 500
    block_row_start = item_row_start
    block_row_end = blank_row_end
    
    dept_blocks.append({
        'dept_id': d_id,
        'dept_name': d_name,
        'num_items': num_items,
        'item_row_range': f"{item_row_start} .. {item_row_end}",
        'item_codes': f"{code_start} .. {code_items_end}",
        'blank_rows': 500,
        'blank_row_range': f"{blank_row_start} .. {blank_row_end}",
        'blank_codes': f"{blank_code_start} .. {blank_code_end}",
        'total_rows': total_block_rows,
        'total_block_range': f"{block_row_start} .. {block_row_end}"
    })
    
    current_row = blank_row_end + 1

with open(r'scripts\scratch\dept_blocks_layout.json', 'w', encoding='utf-8') as f:
    json.dump(dept_blocks, f, ensure_ascii=False, indent=2)

print(f"Final catalog ends at row: {current_row - 1}")
for b in dept_blocks:
    print(f"Dept {b['dept_id']:2d} | {b['dept_name']:<25} | Items: {b['num_items']:3d} (Rows {b['item_row_range']:<12}) | Blanks: {b['blank_rows']} (Rows {b['blank_row_range']:<14}) | Codes: {b['item_codes']}")
