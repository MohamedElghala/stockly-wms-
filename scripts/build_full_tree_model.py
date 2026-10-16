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

# Spelling fixes
spelling_map = {
    '100116': 'اسبوت غاطس 3 وات ليد',
    '100131': 'مفتاح ثلاثي شنايدر C25',
    '100176': 'أدابتور 12 فولت 2 أمبير',
    '100177': 'خرطوم فلكسبل 16 مم',
    '100178': 'كابل 2×1 مم شعر',
    '100236': 'بنطة هيلتي 35 مم',
    '100255': 'كابل كمبيوتر',
    '100256': 'لفة خرطوم فلكسبل 16 مم',
    '100262': 'تجميعة سرية نور ميدان',
    '100285': 'لقمة بريزة سانشي',
    '100286': 'مفتاح قاطع تيار (بلمبات إشارة) NP تركي',
    '100287': 'مفتاح دفيتير',
    '100290': 'مفتاح دفيتير بتشينو',
    '100291': 'كيس أفيز بلاستيك صغير',
    '100295': 'قصدير 750',
    '100303': 'ريلي فيندر 14 طرف بقاعدة 220 فولت',
    '100306': 'صباع سيليكون',
    '101135': 'أفيز معدن 1 بوصة بالكاوتش والفيشر',
    '101323': 'جوان 4 جيبولت زهر',
    '101324': 'جوان 6 جيبولت زهر',
    '101357': 'مشترك زهر 6/4 بوصة',
    '102103': 'لفة خرطوم مورفو 400 متر 50 سم PC',
    '102107': 'سادل 32 / نص بوصة',
    '102135': 'محبس 1.5 بوصة الشريف باللاكور',
    '103156': 'مضخة أسترال Astral Pool 200M 220V 2HP',
    '106128': 'صبغة نجارة',
    '106145': 'كورنر زاوية حديد',
    '107124': 'بطانية حريق',
    '108106': 'مقبض باب سيكوريت',
    '111104': 'سير 13×1120 A',
    '112107': 'باور سبلاي (Power Supply)',
    '113103': 'جردل مونة',
    '113107': 'براويطة',
    '115107': 'علبة سلاح كتر',
    '116107': 'لاصق 2×1 سريع إسبراي كبير',
    '116113': 'إسبراي مزيل صدأ (WD-40)',
    '116149': 'صامولة مسمار إستانلس',
}

# Group into target depts
dept_items = {i: [] for i in range(1, 18)}

wd40_merged = False
for item in catalog:
    code = item['orig_code']
    if code in spelling_map:
        item['name'] = spelling_map[code]
        
    if code in consumables_codes:
        if code == '111105': # DW 40
            # Merge with 116113 WD-40
            wd40_merged = True
            continue
        item['target_dept_id'] = 17
        dept_items[17].append(item)
    else:
        dept_items[item['orig_dept_id']].append(item)

# Classification functions for tree order within each department
def classify_electrical(it):
    name = it['name']
    code = it['orig_code']
    # 1. القواطع والمفاتيح ولوحات التشغيل واللقم والبرايز
    if any(k in name for k in ['قاطع', 'مفتاح', 'هيربشن', 'سلكتور', 'لقمة', 'بريزة', 'شاسية', 'سدادة', 'بوش بوتن', 'كوبس', 'تكييف 32', 'دفيتير']):
        if not any(k in name for k in ['ترنس', 'سنسر', 'تايمر', 'كونتاكتور', 'اوفرلود', 'ريلي', 'ربلاي', 'رليه']):
            return (1, "القواطع والمفاتيح ولوحات التشغيل واللقم والبرايز")
    # 2. التحكم الآلي والمؤقتات والريليهات والكونتاكتورات والحساسات
    if any(k in name for k in ['سنسر', 'تايمر', 'خلية ضوئية', 'كونتاكتور', 'كنتاكتور', 'اوفرلود', 'اوفر لود', 'ريلي', 'ريليه', 'رليه', 'ربلاي', 'ماكينة سلم']):
        return (2, "التحكم الآلي والمؤقتات والريليهات والكونتاكتورات والحساسات")
    # 3. الإنارة والكشافات واللمبات والليد ومصادر التغذية والترانسات
    if any(k in name for k in ['كشاف', 'اسبوط', 'اسبوت', 'لمبة', 'ليد', 'ترنس', 'ترانس', 'دواية', 'دويل', 'أبليك', 'ابليك', 'ابلايت', 'مسطرة 220', 'شلباية', 'بولر', 'بولارد', 'نور ميدان', 'بور صبلاي', 'سكونس']):
        return (3, "الإنارة والكشافات واللمبات والليد ومصادر التغذية")
    # 4. الكابلات والأسلاك والخراطيم ومجاري التمديد
    if any(k in name for k in ['سلك', 'كابل', 'خرطوم', 'خراطيم', 'خطوم', 'نت كات']):
        return (4, "الكابلات والأسلاك والخراطيم ومجاري التمديد")
    # 5. اللوحات والبواطات ومستلزمات التجميع والوصلات
    if any(k in name for k in ['لوحة', 'لو حة', 'بواط', 'علبة', 'بارة', 'ريكم', 'سرفيل', 'سرافيل', 'ضفدعة', 'ترملة', 'ترامل', 'كوسية', 'روزتات', 'رزتات', 'مشترك', 'فيشة', 'بلاج', 'دكت']):
        return (5, "اللوحات والبواطات والروزتات ومستلزمات التجميع والتأريض")
    # 6. التجهيزات والأجهزة الكهربائية والميكانيكية الملحقة
    return (6, "التجهيزات والأجهزة الكهربائية والميكانيكية الملحقة")

def classify_plumbing(it):
    name = it['name']
    code = it['orig_code']
    # 7. كهرباء بالسباكة
    if code in ['101380', '101381', '101382', '101383']:
        return (7, "مهمات وتمديدات كهربائية ملحقة بشبكة السباكة")
    # 1. شبكة كومر (Komer)
    if 'كومر' in name:
        return (1, "شبكة مواسير وقطع كومر (Komer PVC-U)")
    # 2. شبكة بولي بروبلين (PPR)
    if any(k in name for k in ['بولي', 'بولى', 'بي بي']) and 'كومر' not in name:
        return (2, "شبكة مواسير ولوازم بولي بروبلين وبولي إيثيلين (PPR & HDPE)")
    # 3. المحابس والمحابس العمومية والردادات
    if any(k in name for k in ['محبس', 'رداد', 'سكس بالف', 'فلانشة', 'سكينة']):
        return (3, "المحابس العمومية ومحابس البلية والردادات والفلانشات")
    # 4. اللوازم والمشتركات والكيعان والجلنزات النحاسية والحديدية
    if any(k in name for k in ['جلبة', 'كوع', 'مشترك', 'نيبل', 'لاكور', 'بوش', 'طبة', 'كرنك', 'نبل', 'تيه', 'وصلة']):
        return (4, "لوازم وقطع الربط والمشتركات والكيعان والنيبل")
    # 5. الأدوات الصحية والخلاطات وسيفونات ومستلزمات الصرف
    if any(k in name for k in ['خلاط', 'حنفية', 'سيفون', 'دش', 'شطاف', 'مرحاض', 'حوض', 'قاعدة', 'عامود', 'زبادية', 'بلية', 'خرطوم', 'سماعة']):
        return (5, "الأدوات الصحية والخلاطات والسيفونات ومستلزمات الحمام")
    # 6. أفيز وجوانات ومستلزمات التثبيت والعزل
    return (6, "مستلزمات التثبيت والجوانات والشبكات العامة")

def classify_irrigation(it):
    name = it['name']
    if any(k in name for k in ['حربة', 'رشاش', 'فونيا', 'فونية', 'هانتر', 'برو']):
        return (1, "الحراب والرشاشات والفونيات والموزعات (Hunter/Rainbird)")
    if any(k in name for k in ['خرطوم', 'مورفو', 'لفة']):
        return (2, "الخراطيم الزراعية وشبكات التنقيط والري السطحي")
    if any(k in name for k in ['سادل', 'تي', 'كوع', 'نهاية', 'وصلة', 'شريحة', 'منقط']):
        return (3, "قطع ولوازم شبكة 16 مم والسادل والوصلات")
    if any(k in name for k in ['محبس', 'فلتر', 'محابس']):
        return (4, "المحابس الكهربائية واليدوية والفلاتر")
    return (5, "مستلزمات وعوازل كابلات الري التخصصية (DBRY)")

def classify_pools(it):
    name = it['name']
    if any(k in name for k in ['فلتر', 'كيس فلتر', 'باسكت', 'أسطوان', 'طوق']):
        return (1, "الفلاتر وأكياس وأسطوانات وباسكت تنقية المسابح")
    if any(k in name for k in ['كلور', 'الجا', 'حبوب', 'قياس', 'PH', 'حامض']):
        return (2, "الكيماويات وأقراص واختبارات فحص جودة المياه")
    if any(k in name for k in ['مضخة', 'ماتور', 'امبلر', 'ميكانيكل', 'سيل']):
        return (3, "طلمبات ومحركات ومضخات المسابح وقطع غيارها")
    return (4, "النوافير والنزل وفتحات الدفع والسحب والإكسسوارات")

def classify_cleaning(it):
    name = it['name']
    if any(k in name for k in ['مناديل', 'أكياس قمامة', 'كيس']):
        return (1, "الورقيات وأكياس المهملات والنفايات")
    if any(k in name for k in ['معطر', 'صابون', 'شاور', 'كلور', 'دتوول', 'ديتول']):
        return (2, "المنظفات والمعطرات والمطهرات السائلة")
    return (3, "الأدوات والمستلزمات وسلال النظافة")

def classify_painting(it):
    name = it['name']
    if any(k in name for k in ['رولة', 'فرشة', 'يد']):
        return (1, "الفرش والرولات وأدوات الفرد والدهان")
    if any(k in name for k in ['سلر', 'ورنيش', 'لون', 'سبغة', 'لاكيه', 'معجون', 'بلاستيك']):
        return (2, "الدهانات والسيلر والورنيش والصبغات والمركزات")
    return (3, "المذيبات والتنر وخامات التجهيز")

def classify_carpentry(it):
    name = it['name']
    if any(k in name for k in ['لوح', 'ابلاكاش', 'خشب', 'كونتر']):
        return (1, "الأخشاب والألواح والكونتر والأبلاكاش")
    return (2, "المفصلات والزوايا والأوكر ومستلزمات التجميع الخشبية")

def classify_general(it):
    name = it['name']
    if any(k in name for k in ['طفاية', 'طفايات', 'بطانية حريق']):
        return (1, "مهمات السلامة والإطفاء ومكافحة الحريق")
    if any(k in name for k in ['مروحة', 'ستارة كهرباء', 'مكبر صوت']):
        return (2, "أجهزة الخدمة والتهوية والصوتيات العامة")
    return (3, "المستلزمات الخدمية والميدانية والشماسات والإسمنت")

def classify_securit(it):
    name = it['name']
    if any(k in name for k in ['باب', 'ماكينة']):
        return (1, "أبواب السيكوريت وماكينات الأرضي")
    return (2, "الكوالين والسلندرات والمقابض والمفصلات والإكسسوارات")

def classify_aluminum(it):
    name = it['name']
    if any(k in name for k in ['زجاج', 'بكتة', 'قطاع', 'علاية']):
        return (1, "الزجاج والقطاعات والباكتات والإكسسوارات")
    return (2, "المقابض والأوكر والكوالين والسلندرات والمفصلات")

def classify_office(it):
    name = it['name']
    if any(k in name for k in ['مكتب', 'وحدة ادراج', 'دولاب', 'مكتبة']):
        return (1, "المكاتب ووحدات الأدراج والدواليب والمكتبات")
    if any(k in name for k in ['كرسي', 'كنبة']):
        return (2, "الكراسي والكنب والفرش المكتبي")
    return (3, "الأجهزة والستائر والتجهيزات المكتبية")

def classify_mechanics(it):
    name = it['name']
    if any(k in name for k in ['مكثف', 'سير']):
        return (1, "المكثفات وسيور الحركة والمحركات")
    return (2, "البلي والموانع الميكانيكية (Bearings & Seals)")

def classify_security(it):
    name = it['name']
    if any(k in name for k in ['كامرا', 'كاميرات', 'سويتش']):
        return (1, "كاميرات المراقبة والسويتشات والشبكات")
    return (2, "بوابات الدخول والأجهزة والحساسات وأجهزة اللاسلكي")

def classify_marble(it):
    name = it['name']
    if any(k in name for k in ['رخام']):
        return (1, "قطع وألواح الرخام بمقاساتها الهندسية")
    return (2, "معجون ومواد جلي وتركيب الرخام")

def classify_clothing(it):
    return (1, "الزي الموحد والفيستات الفنية")

def classify_tools(it):
    name = it['name']
    if any(k in name for k in ['ماكينة', 'مكواة', 'سيخ']):
        return (1, "الماكينات والمعدات الكهربائية وماكينات اللحام والتسليك")
    if any(k in name for k in ['مفتاح', 'مقص', 'كوريك', 'جاروف']):
        return (2, "العدد اليدوية والمفاتيح والمقصات وأدوات الحفر")
    return (3, "البنط والمبارد والعدد التخصصية والدقيقة")

def classify_consumables(it):
    name = it['name']
    if any(k in name for k in ['مسمار', 'صامولة', 'وردة', 'كلبس', 'افيز', 'فشر', 'فيشر']):
        return (1, "المسامير والصواميل والورد وأطقم التثبيت والأفيزات والفيشر")
    if any(k in name for k in ['تيب', 'تفلون', 'شريط لحام', 'عريض']):
        return (2, "أشرطة اللحام وبكر التفلون ومستلزمات العزل والشاش")
    if any(k in name for k in ['اسبراي', 'اسبرية', 'WD-40', 'اكاي', 'سليكون', 'سيليكون', 'سيكافلكس', 'شحم']):
        return (3, "الإسبرايات ومزيلات الصدأ والشحوم والسيليكون واللواصق")
    if any(k in name for k in ['سنفرة', 'أسطوانة', 'اسطوانة', 'منشار', 'كتر', 'سلاح']):
        return (4, "خامات الصنفرة وأسطوانات القطعية وصفائح المنشار وسلاح الكتر")
    return (5, "المستهلكات الكيماوية والسوائل والغراء (Adibond, Glue, etc.)")

classifiers = {
    1: classify_electrical,
    2: classify_plumbing,
    3: classify_irrigation,
    4: classify_pools,
    5: classify_cleaning,
    6: classify_painting,
    7: classify_carpentry,
    8: classify_general,
    9: classify_securit,
    10: classify_aluminum,
    11: classify_office,
    12: classify_mechanics,
    13: classify_security,
    14: classify_marble,
    15: classify_clothing,
    16: classify_tools,
    17: classify_consumables
}

# Run classification and sorting
tree_catalog = {}
for d_id in range(1, 18):
    fn = classifiers[d_id]
    items = dept_items[d_id]
    # classify each item
    for it in items:
        cat_id, cat_name = fn(it)
        it['tree_cat_id'] = cat_id
        it['tree_cat_name'] = cat_name
    
    # Sort by tree_cat_id ASC, then by disb DESC, then stock DESC, then orig_row ASC
    sorted_d_items = sorted(items, key=lambda x: (x['tree_cat_id'], -x['disb'], -x['stock'], x['orig_row']))
    tree_catalog[d_id] = sorted_d_items

# Verify counts and parity
print("=== Reorganization Summary ===")
total_reorg_items = sum(len(tree_catalog[d]) for d in range(1, 18))
print(f"Total catalog items: {total_reorg_items}")
assert total_reorg_items == 902, f"Expected 902 items, got {total_reorg_items}"

# Check balance parity
sum_open = sum(it['open_bal'] for d in range(1, 18) for it in tree_catalog[d])
sum_added = sum(it['added'] for d in range(1, 18) for it in tree_catalog[d])
sum_disb = sum(it['disb'] for d in range(1, 18) for it in tree_catalog[d])
sum_stock = sum(it['stock'] for d in range(1, 18) for it in tree_catalog[d])

print(f"Total Opening: {sum_open:,.2f}")
print(f"Total Added: {sum_added:,.2f}")
print(f"Total Disbursed: {sum_disb:,.2f}")
print(f"Total Current Stock: {sum_stock:,.2f}")
print("Parity Check (Open + Added - Disb):", f"{sum_open + sum_added - sum_disb:,.2f} vs Stock: {sum_stock:,.2f}")

# Save detailed tree plan to JSON
with open(r'scripts\scratch\tree_reorganized_catalog.json', 'w', encoding='utf-8') as f:
    json.dump(tree_catalog, f, ensure_ascii=False, indent=2)

print("Saved tree catalog to scripts/scratch/tree_reorganized_catalog.json")
