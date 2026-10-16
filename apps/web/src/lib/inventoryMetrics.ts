export interface PackagingBreakdown {
  rawStockUnits: number;
  physicalStockUnits: number;
  piecesCount: number;
  completedPipesCount: number;
  completedRollsCount: number;
  packagesCount: number;
  fractionalMetersCount: number;
  shrinkageDelta: number;
}

export interface ItemPackagingInfo {
  ruleType: 'KOMAR_PIPE' | 'CASTLE_PIPE' | 'POLY_PIPE' | 'PE_PIPE' | 'WIRE_ROLL' | 'IRRIGATION_HOSE_400' | 'STANDARD_PIECE';
  bundleSize: number;
  bundleUnitName: string;
  rawUnit: string;
  completedBundles: number;
  remainingQuantity: number;
  completionPercent: number;
}

export function getItemPackagingInfo(item: any): ItemPackagingInfo {
  const name = String(item.name || '').trim();
  const unit = String(item.unit || 'عدد').trim();
  const stock = Number(item.stock) || 0;

  if (unit === 'متر' || unit.includes('متر')) {
    // 1. Komar Pipe: 6m
    if (name.includes('ماسورة') && name.includes('كومر')) {
      const completed = Math.floor(stock / 6);
      const rem = Number((stock % 6).toFixed(2));
      return {
        ruleType: 'KOMAR_PIPE',
        bundleSize: 6,
        bundleUnitName: 'عود كومر (6م)',
        rawUnit: 'متر',
        completedBundles: completed,
        remainingQuantity: rem,
        completionPercent: rem > 0 ? Math.round((rem / 6) * 100) : 0
      };
    }
    // 2. Castle Pipe: 3m
    if (name.includes('ماسورة') && name.includes('كاسل')) {
      const completed = Math.floor(stock / 3);
      const rem = Number((stock % 3).toFixed(2));
      return {
        ruleType: 'CASTLE_PIPE',
        bundleSize: 3,
        bundleUnitName: 'عود كاسل (3م)',
        rawUnit: 'متر',
        completedBundles: completed,
        remainingQuantity: rem,
        completionPercent: rem > 0 ? Math.round((rem / 3) * 100) : 0
      };
    }
    // 3. Poly (PPR) Pipe: 4m
    if (name.includes('ماسورة') && (name.includes('بولي') || name.toUpperCase().includes('PPR')) && !name.includes('ايثيلين') && !name.includes('إيثيلين')) {
      const completed = Math.floor(stock / 4);
      const rem = Number((stock % 4).toFixed(2));
      return {
        ruleType: 'POLY_PIPE',
        bundleSize: 4,
        bundleUnitName: 'عود بولي PPR (4م)',
        rawUnit: 'متر',
        completedBundles: completed,
        remainingQuantity: rem,
        completionPercent: rem > 0 ? Math.round((rem / 4) * 100) : 0
      };
    }
    // 4. Polyethylene Pipe: 6m
    if (name.includes('ماسورة') && (name.includes('ايثيلين') || name.includes('إيثيلين') || name.toUpperCase().includes('PE'))) {
      const completed = Math.floor(stock / 6);
      const rem = Number((stock % 6).toFixed(2));
      return {
        ruleType: 'PE_PIPE',
        bundleSize: 6,
        bundleUnitName: 'عود بولي إيثيلين (6م)',
        rawUnit: 'متر',
        completedBundles: completed,
        remainingQuantity: rem,
        completionPercent: rem > 0 ? Math.round((rem / 6) * 100) : 0
      };
    }
    // 5. Electrical Wires & Cables: 100m
    if (name.includes('سلك') || name.includes('كابل') || name.includes('ترمو')) {
      const completed = Math.floor(stock / 100);
      const rem = Number((stock % 100).toFixed(2));
      return {
        ruleType: 'WIRE_ROLL',
        bundleSize: 100,
        bundleUnitName: 'لفة سلك (100م)',
        rawUnit: 'متر',
        completedBundles: completed,
        remainingQuantity: rem,
        completionPercent: rem > 0 ? Math.round((rem / 100) * 100) : 0
      };
    }
    // 6. Plain Irrigation Hose 400m: Only 400m plain hose
    if (name.includes('خرطوم') && name.includes('400') && (name.includes('سادة') || name.includes('ساده'))) {
      const completed = Math.floor(stock / 400);
      const rem = Number((stock % 400).toFixed(2));
      return {
        ruleType: 'IRRIGATION_HOSE_400',
        bundleSize: 400,
        bundleUnitName: 'لفة خرطوم سادة (400م)',
        rawUnit: 'متر',
        completedBundles: completed,
        remainingQuantity: rem,
        completionPercent: rem > 0 ? Math.round((rem / 400) * 100) : 0
      };
    }
  }

  return {
    ruleType: 'STANDARD_PIECE',
    bundleSize: 1,
    bundleUnitName: unit || 'عدد',
    rawUnit: unit || 'عدد',
    completedBundles: stock,
    remainingQuantity: 0,
    completionPercent: 100
  };
}

export interface UnifiedMetricsResult {
  totalItems: number;
  totalStockUnits: number;
  physicalStockUnits: number;
  packagingBreakdown: PackagingBreakdown;
  outOfStockCount: number;
  severeCount: number;
  normalCount: number;
  stagnantCount: number;
  activeCount: number;
  assetsCount: number;
  stockHealthRate: number;
  categoryItemCounts: Record<string, number>;
  categoryConsumption: Record<string, number>;
  severeShortagesList: any[];
  outOfStockList: any[];
  stagnantList: any[];
  normalLowList: any[];
  activeList: any[];
  assetsList: any[];
}

// 41 Operational Fixed Assets & Strategic Equipment (Strictly excluded from shortage & stagnant analytics)
export const ON_DEMAND_ASSET_CODES = new Set([
  // Motors & Pumps (11 items)
  '103115', '103117', '103119', '103124', '103144', '103152', '103161', '103162', '103163', '103164', '103165',
  // Office & IT & Furniture (18 items)
  '110101', '110102', '110103', '110104', '110105', '110106', '110107', '110108', '110109', '110110', '110111', '110112', '110113', '110114', '110115', '110116', '110117', '110118',
  // Security, Telecom & Networks (7 items)
  '112101', '112102', '112104', '112106', '112107', '112109', '107122',
  // Appliances & Machinery (5 items)
  '107110', '100250', '100277', '100164', '115101'
]);

export function calculateInventoryMetrics(
  items: any[],
  disbursements: any[],
  filterMonth?: string
): UnifiedMetricsResult {
  const NOW = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const SEVERE_WINDOW_MS = 60 * DAY_MS; // 60 days
  const STAGNANT_WINDOW_MS = 90 * DAY_MS; // 90 days

  // Parse disbursement timestamp accurately
  const getDisbTimestamp = (d: any): number => {
    if (typeof d.timestamp === 'number' && d.timestamp > 0) return d.timestamp;
    if (typeof d.createdAt === 'number' && d.createdAt > 0) return d.createdAt;
    if (d.date) {
      const s = String(d.date).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const p = new Date(s).getTime();
        if (!isNaN(p)) return p;
      }
      const parts = s.split('/');
      if (parts.length === 3) {
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        let day = parseInt(parts[2], 10);
        if (y < 100) y = 2000 + y;
        const dt = new Date(y, m - 1, day);
        if (!isNaN(dt.getTime())) return dt.getTime();
      }
      const parsed = new Date(s).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  // Build an indexed map of disbursements per item
  const disbMap = new Map<string, Array<{ qty: number; timestamp: number; date: string }>>();
  const categoryConsumption: Record<string, number> = {};

  disbursements.forEach(d => {
    const code = String(d.itemCode || d.code || '').trim();
    if (!code) return;

    const ts = getDisbTimestamp(d);
    const qty = Number(d.qty || d.quantity || 0);

    // Apply month filter if provided
    if (filterMonth) {
      const dDate = new Date(ts);
      const dMonth = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
      if (dMonth !== filterMonth) return;
    }

    if (!disbMap.has(code)) disbMap.set(code, []);
    disbMap.get(code)!.push({
      qty,
      timestamp: ts,
      date: d.date || ''
    });

    const cat = String(d.department || d.category || 'عام').trim();
    categoryConsumption[cat] = (categoryConsumption[cat] || 0) + qty;
  });

  const categoryItemCounts: Record<string, number> = {};
  const severeShortagesList: any[] = [];
  const outOfStockList: any[] = [];
  const stagnantList: any[] = [];
  const normalLowList: any[] = [];
  const activeList: any[] = [];
  const assetsList: any[] = [];

  let severeCount = 0;
  let normalCount = 0;
  let stagnantCount = 0;
  let activeCount = 0;
  let outOfStockCount = 0;
  let assetsCount = 0;
  let totalStockUnits = 0;
  let physicalStockUnits = 0;
  let piecesCount = 0;
  let completedPipesCount = 0;
  let completedRollsCount = 0;
  let packagesCount = 0;
  let fractionalMetersCount = 0;

  const validItems = items.filter(item => {
    const name = String(item.name || '').trim();
    const code = String(item.code || '').trim();
    return name !== '' && name !== 'اسم الصنف' && code !== 'كود الصنف' && code !== 'code';
  });

  validItems.forEach(item => {
    const code = String(item.code || item.id || '').trim();
    const stock = Number(item.stock) || 0;
    totalStockUnits += stock;
    const cat = String(item.category || 'عام').trim();
    categoryItemCounts[cat] = (categoryItemCounts[cat] || 0) + 1;

    // Calculate packaging decomposition
    const pkg = getItemPackagingInfo(item);
    if (pkg.ruleType !== 'STANDARD_PIECE') {
      const shrinkage = pkg.completedBundles * (pkg.bundleSize - 1);
      const itemPhys = stock - shrinkage;
      physicalStockUnits += itemPhys;
      fractionalMetersCount += pkg.remainingQuantity;
      if (pkg.ruleType.includes('PIPE')) {
        completedPipesCount += pkg.completedBundles;
      } else {
        completedRollsCount += pkg.completedBundles;
      }
    } else {
      const u = String(item.unit || 'عدد').trim();
      if (u === 'عدد') {
        piecesCount += stock;
      } else {
        packagesCount += stock;
      }
      physicalStockUnits += stock;
    }

    // Get item disbursements
    const itemDisbs = disbMap.get(code) || [];
    itemDisbs.sort((a, b) => b.timestamp - a.timestamp);

    const lastDisb = itemDisbs[0] || null;
    const lastDisbursedAt = lastDisb 
      ? lastDisb.timestamp 
      : (typeof item.lastDisbursedAt === 'number' && item.lastDisbursedAt > 0 ? item.lastDisbursedAt : null);
    
    const lastDisbursedDate = lastDisb 
      ? (lastDisb.date || '') 
      : (item.lastDisbursedDate || (lastDisbursedAt ? new Date(lastDisbursedAt).toISOString().split('T')[0] : ''));

    const daysSinceLastDisb = lastDisbursedAt 
      ? Math.floor((NOW - lastDisbursedAt) / DAY_MS) 
      : (typeof item.daysSinceLastDisb === 'number' ? item.daysSinceLastDisb : 9999);

    // Compute withdrawal frequency in target analytical windows
    const inLast30Days = itemDisbs.filter(r => (NOW - r.timestamp) <= 30 * DAY_MS);
    const inLast60Days = itemDisbs.filter(r => (NOW - r.timestamp) <= SEVERE_WINDOW_MS);
    const inLast90Days = itemDisbs.filter(r => (NOW - r.timestamp) <= STAGNANT_WINDOW_MS);

    const qtyLast30 = inLast30Days.reduce((acc, r) => acc + r.qty, 0);
    const qtyLast60 = inLast60Days.reduce((acc, r) => acc + r.qty, 0);
    const qtyLast90 = inLast90Days.reduce((acc, r) => acc + r.qty, 0);

    const draws60 = itemDisbs.length > 0 ? inLast60Days.length : Number(item.drawsLast60 || 0);
    const draws90 = itemDisbs.length > 0 ? inLast90Days.length : Number(item.drawsLast90 || 0);
    const recentQty60 = itemDisbs.length > 0 ? qtyLast60 : Number(item.qtyLast60 || 0);

    const hasRecentDemand = itemDisbs.length > 0 
      ? (draws60 >= 1 || (draws90 >= 2 && recentQty60 > 0))
      : (draws60 >= 1 || (draws90 >= 2 && recentQty60 > 0) || item.hasRecentDemand === true);

    const totalOutCount = itemDisbs.length > 0 ? itemDisbs.length : Number(item.out_cnt || item.drawsCount || item.totalDraws || 0);
    const totalOutQty = Number(item.disb || item.totalOut || item.qtyLast90 || 0);

    const hasContinuousDemand = itemDisbs.length > 0
      ? (totalOutCount >= 3 || totalOutQty >= 20 || (daysSinceLastDisb <= 90 && totalOutQty > 0 && totalOutCount >= 2) || hasRecentDemand)
      : (totalOutCount >= 3 || totalOutQty >= 20 || (daysSinceLastDisb <= 90 && totalOutQty > 0 && totalOutCount >= 2) || hasRecentDemand || item.hasContinuousDemand === true);

    const enrichedItem = {
      ...item,
      lastDisbursedAt,
      lastDisbursedDate,
      daysSinceLastDisb,
      drawsLast60: draws60,
      drawsLast90: draws90,
      qtyLast30,
      qtyLast60: recentQty60,
      qtyLast90,
      hasRecentDemand,
      hasContinuousDemand,
      totalOutCount,
      totalOut: totalOutQty > 0 ? totalOutQty : Number(item.totalOut || 0),
      packagingInfo: pkg
    };

    // 1. ISOLATED ON-DEMAND ASSETS & STRATEGIC EQUIPMENT (41 Items + Managerial Overrides)
    const isAsset = ON_DEMAND_ASSET_CODES.has(code) || 
      item.isOnDemandAsset === true || 
      item.classification === 'ON_DEMAND_ASSET' ||
      item.classification === 'ON_DEMAND' ||
      item.shortageOverride === 'ON_DEMAND';

    if (isAsset) {
      assetsCount++;
      assetsList.push({
        ...enrichedItem,
        classification: 'ON_DEMAND_ASSET',
        assetReason: item.substituteNotes ? `له بديل متوفر: ${item.substituteNotes}` : 'أصل تشغيلي ثابت ومعدات استراتيجية توريد بالطلب الخاص'
      });
      return;
    }

    // STRICT MUTUALLY EXCLUSIVE CLASSIFICATION (ZERO DUPLICATES):
    if (item.shortageOverride === 'CRITICAL' || (stock < (item.alertLimit || 10) && hasContinuousDemand && item.shortageOverride !== 'NORMAL')) {
      // 2. Critical Shortage: Low stock AND continuous active withdrawals
      severeCount++;
      severeShortagesList.push({
        ...enrichedItem,
        classification: 'CRITICAL'
      });
    } else if (stock <= 0 && item.shortageOverride !== 'NORMAL') {
      // 3. Out of stock (0) without continuous demand
      outOfStockCount++;
      outOfStockList.push({
        ...enrichedItem,
        classification: 'OUT_OF_STOCK'
      });
    } else if (item.shortageOverride === 'NORMAL' || (stock > 0 && stock < (item.alertLimit || 10))) {
      // 4. Regular Shortage: Stock between 1 and 9 without continuous demand
      normalCount++;
      normalLowList.push({
        ...enrichedItem,
        classification: 'NORMAL'
      });
    } else if (daysSinceLastDisb >= 90 || (totalOutCount === 0 && Number(item.in_cnt || item.totalIn || 0) === 0)) {
      // 5. Stagnant: Capital tied up with zero demand in 90+ days (3-6 months) & Stock >= 10
      stagnantCount++;
      stagnantList.push({
        ...enrichedItem,
        classification: 'STAGNANT'
      });
    } else {
      // 6. Active: Healthy stock with normal movement in last 90 days
      activeCount++;
      activeList.push({
        ...enrichedItem,
        classification: 'ACTIVE'
      });
    }
  });

  const totalItems = validItems.length;
  // Weighted Supply Chain Health Index:
  // Safe Active: 100%, Assets: 100%, Normal Low: 60%, Stagnant: 50%, Critical Low: 15%, Out of Stock: 0%
  const weightedHealthPoints = (activeCount * 1.0) + (assetsCount * 1.0) + (normalCount * 0.6) + (stagnantCount * 0.5) + (severeCount * 0.15);
  const stockHealthRate = totalItems > 0 ? Math.round((weightedHealthPoints / totalItems) * 100) : 100;

  const shrinkageDelta = totalStockUnits - physicalStockUnits;
  const packagingBreakdown: PackagingBreakdown = {
    rawStockUnits: Number(totalStockUnits.toFixed(2)),
    physicalStockUnits: Number(physicalStockUnits.toFixed(2)),
    piecesCount: Number(piecesCount.toFixed(2)),
    completedPipesCount,
    completedRollsCount,
    packagesCount: Number(packagesCount.toFixed(2)),
    fractionalMetersCount: Number(fractionalMetersCount.toFixed(2)),
    shrinkageDelta: Number(shrinkageDelta.toFixed(2))
  };

  return {
    totalItems,
    totalStockUnits,
    physicalStockUnits: Number(physicalStockUnits.toFixed(2)),
    packagingBreakdown,
    outOfStockCount,
    severeCount,
    normalCount,
    stagnantCount,
    activeCount,
    assetsCount,
    stockHealthRate,
    categoryItemCounts,
    categoryConsumption,
    severeShortagesList,
    outOfStockList,
    stagnantList,
    normalLowList,
    activeList,
    assetsList
  };
}
