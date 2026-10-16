export const ALL_WAREHOUSE_DEPARTMENTS = [
  'أدوات كهربائية',               // 100
  'أدوات وسباكة وشبكات',          // 101
  'أدوات خامات الري',             // 102
  'حمامات سباحة',                 // 103
  'مستلزمات نظافة',               // 104
  'أدوات نقاشة',                  // 105
  'أدوات وخامات نجارة',           // 106
  'أدوات عامة',                   // 107
  'أدوات سيكوريت',                // 108
  'أدوات الوميتال',               // 109
  'أدوات مكاتب',                  // 110
  'أدوات ميكانيكا',               // 111
  'أدوات الأمن وكاميرات المراقبة', // 112
  'رخام ومواد بناء',              // 113
  'ملابس',                        // 114
  'عدد و معدات',                  // 115
  'قسم المستهلكات'                // 116
] as const;

export type ItemCategory = typeof ALL_WAREHOUSE_DEPARTMENTS[number] | string;

export const INVENTORY_CATEGORIES: string[] = [...ALL_WAREHOUSE_DEPARTMENTS];

export function normalizeCategory(cat?: string): string {
  if (!cat) return '';
  const trimmed = String(cat).trim();
  if (trimmed === 'أدوات صحية وسباكة وشبكات' || trimmed === 'سباكة' || trimmed === 'صحي وسباكة' || trimmed === 'سباكة وشبكات' || trimmed === 'أدوات سباكة') {
    return 'أدوات وسباكة وشبكات';
  }
  if (trimmed === 'اداوات نقاشة' || trimmed === 'نقاشة') {
    return 'أدوات نقاشة';
  }
  if (trimmed === 'أدوات نجارة' || trimmed === 'خامات نجارة' || trimmed === 'نجارة') {
    return 'أدوات وخامات نجارة';
  }
  if (trimmed === 'ادات عامة' || trimmed === 'أدوات عامه' || trimmed === 'عامة') {
    return 'أدوات عامة';
  }
  if (trimmed === 'اداوات مكاتب' || trimmed === 'مكاتب') {
    return 'أدوات مكاتب';
  }
  if (trimmed === 'مسلزمات و أدوات الامن و كاميرات المراقبة' || trimmed === 'أمن وكاميرات' || trimmed === 'كاميرات مراقبة') {
    return 'أدوات الأمن وكاميرات المراقبة';
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
