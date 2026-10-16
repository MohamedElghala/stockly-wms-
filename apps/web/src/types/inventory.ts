export const ALL_WAREHOUSE_DEPARTMENTS = [
  'مواد خام وتعبئة وتغليف',       // 100 - Raw Materials & Packaging
  'قطع غيار ومهمات تشغيل',        // 101 - Spare Parts & MRO
  'منتجات تامة وسلع استهلاكية',   // 102 - Finished Goods & Retail
  'أدوات كهربائية وإلكترونيات',    // 103 - Electrical & Electronics
  'عدد ومعدات صناعية',            // 104 - Industrial Hardware & Tools
  'أدوات ومستلزمات عامة',          // 105 - General Warehouse Supplies
  'مهمات السلامة والأمن الصناعي', // 106 - PPE, Safety & Security
  'مستلزمات تقنية وحاسب آلي',     // 107 - IT & Tech Equipment
  'أدوات وسباكة وشبكات',          // 108 - Plumbing & Piping
  'أدوات وخامات نجارة وتشغيل',    // 109 - Carpentry & Woodwork
  'أدوات مكاتب وقرطاسية',         // 110 - Office Supplies & Stationery
  'أدوات ميكانيكا وصيانة',        // 111 - Mechanical & Maintenance
  'رخام ومواد بناء',              // 112 - Construction & Building Materials
  'ملابس ويونيفورم ومهمات',       // 113 - Apparel & Uniforms
  'قسم المستهلكات السريعة'        // 114 - Fast Moving Consumables
] as const;

export type ItemCategory = typeof ALL_WAREHOUSE_DEPARTMENTS[number] | string;

export const INVENTORY_CATEGORIES: string[] = [...ALL_WAREHOUSE_DEPARTMENTS];

export function normalizeCategory(cat?: string): string {
  if (!cat) return '';
  const trimmed = String(cat).trim();
  
  // Legacy facility mappings -> commercial WMS
  if (trimmed === 'أدوات خامات الري' || trimmed === 'ري' || trimmed === 'خامات ري') {
    return 'قطع غيار ومهمات تشغيل';
  }
  if (trimmed === 'حمامات سباحة' || trimmed === 'مسبح' || trimmed === 'مسابح') {
    return 'قسم المستهلكات السريعة';
  }
  if (trimmed === 'مستلزمات نظافة' || trimmed === 'نظافة' || trimmed === 'مواد نظافة') {
    return 'قسم المستهلكات السريعة';
  }
  if (trimmed === 'أدوات كهربائية' || trimmed === 'كهرباء') {
    return 'أدوات كهربائية وإلكترونيات';
  }
  if (trimmed === 'عدد و معدات' || trimmed === 'عدد ومعدات' || trimmed === 'معدات') {
    return 'عدد ومعدات صناعية';
  }
  if (trimmed === 'أدوات صحية وسباكة وشبكات' || trimmed === 'سباكة' || trimmed === 'صحي وسباكة' || trimmed === 'سباكة وشبكات' || trimmed === 'أدوات سباكة') {
    return 'أدوات وسباكة وشبكات';
  }
  if (trimmed === 'اداوات نقاشة' || trimmed === 'نقاشة' || trimmed === 'أدوات نقاشة') {
    return 'أدوات ومستلزمات عامة';
  }
  if (trimmed === 'أدوات نجارة' || trimmed === 'خامات نجارة' || trimmed === 'نجارة' || trimmed === 'أدوات وخامات نجارة') {
    return 'أدوات وخامات نجارة وتشغيل';
  }
  if (trimmed === 'ادات عامة' || trimmed === 'أدوات عامه' || trimmed === 'عامة') {
    return 'أدوات ومستلزمات عامة';
  }
  if (trimmed === 'اداوات مكاتب' || trimmed === 'مكاتب' || trimmed === 'أدوات مكاتب') {
    return 'أدوات مكاتب وقرطاسية';
  }
  if (trimmed === 'مسلزمات و أدوات الامن و كاميرات المراقبة' || trimmed === 'أمن وكاميرات' || trimmed === 'كاميرات مراقبة' || trimmed === 'أدوات الأمن وكاميرات المراقبة') {
    return 'مهمات السلامة والأمن الصناعي';
  }
  if (trimmed === 'قسم المستهلكات') {
    return 'قسم المستهلكات السريعة';
  }
  return trimmed;
}

export type ShortageOverride = 'AUTO' | 'NORMAL' | 'ON_DEMAND' | 'CRITICAL';

export interface InventoryItem {
  id: string; // The item code
  code: string;
  category: ItemCategory | string;
  name: string;
  unit: string;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  stock: number;
  status: any;
  classification?: string;
  shortageOverride?: ShortageOverride;
  substituteCode?: string;
  substituteNotes?: string;
  imageURL?: string;
  alertLimit?: number;
  updatedAt: any; // Firestore Timestamp
}
