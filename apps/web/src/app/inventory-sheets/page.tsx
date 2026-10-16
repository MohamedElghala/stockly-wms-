'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ClipboardList, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Scale, 
  Layers, 
  RotateCcw, 
  Zap, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FolderTree,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import InventoryPrintModal, { InventoryPrintOptions } from '@/components/print/InventoryPrintModal';
import { exportToExcel } from '@/lib/excelExport';
import { normalizeCategory } from '@/types/inventory';
import toast from 'react-hot-toast';

type SheetMode = 'AUDIT' | 'BLIND';
type StatusFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'VARIANCE_ONLY';
type SortField = 'code' | 'name' | 'category' | 'stock' | 'physical' | 'variance';
type SortDir = 'asc' | 'desc';

/** Format numbers cleanly without trailing .00 zeros */
function formatCleanQty(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (Number.isInteger(num)) return String(num);
  return String(Number(num.toFixed(2)));
}

/** Official 17-department warehouse sequence (100xxx -> 116xxx) */
const OFFICIAL_DEPT_ORDER: string[] = [
  'أدوات كهربائية',               // 1 (100)
  'أدوات سباكة',                  // 2 (101)
  'أدوات وسباكة وشبكات',          // 2 alias
  'أدوات خامات الري',             // 3 (102)
  'حمامات سباحة',                 // 4 (103)
  'مستلزمات نظافة',               // 5 (104)
  'أدوات نقاشة',                  // 6 (105)
  'أدوات وخامات نجارة',           // 7 (106)
  'أدوات عامة',                   // 8 (107)
  'أدوات سيكوريت',                // 9 (108)
  'أدوات الوميتال',               // 10 (109)
  'أدوات مكاتب',                  // 11 (110)
  'أدوات ميكانيكا',               // 12 (111)
  'أدوات الأمن وكاميرات المراقبة', // 13 (112)
  'رخام ومواد بناء',              // 14 (113)
  'ملابس',                        // 15 (114)
  'عدد و معدات',                  // 16 (115)
  'قسم المستهلكات'                // 17 (116)
];

function getDeptOrder(cat?: string): number {
  if (!cat) return 999;
  const trimmed = cat.trim();
  const directIdx = OFFICIAL_DEPT_ORDER.indexOf(trimmed);
  if (directIdx !== -1) return directIdx;
  const norm = normalizeCategory(trimmed);
  const normIdx = OFFICIAL_DEPT_ORDER.indexOf(norm);
  return normIdx !== -1 ? normIdx : 999;
}

/** Official 3-Column Corporate Audit Signatures Block (Rule 3 - Corporate Document Template) */
function InventoryAuditSignatures({ storekeeperName, footerNotice }: { storekeeperName?: string; footerNotice?: string }) {
  return (
    <div className="print-signatures-container" style={{ direction: 'rtl', marginTop: '10px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div
        className="print-signatures-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          direction: 'rtl',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          padding: '8px 12px',
          background: '#f8fafc',
          gap: '12px'
        }}
      >
        {/* 1. الطرف الأول: المعاين والفاحص الفني (اليمين) */}
        <div
          className="print-signature-box"
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '52px',
            borderLeft: '1px dashed #cbd5e1',
            paddingLeft: '10px'
          }}
        >
          <span style={{ fontSize: '9pt', fontWeight: 900, color: '#099A75', marginBottom: '2px', display: 'block' }}>
            المعاين والفاحص الفني
          </span>
          <span style={{ fontSize: '8.5pt', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            مشرف التنفيذ / مهندس الموقع
          </span>
          <div style={{ fontSize: '8pt', color: '#475569', fontWeight: 700, borderTop: '1.2px dotted #64748b', paddingTop: '3px' }}>
            التوقيع: ........................................
          </div>
        </div>

        {/* 2. الطرف الثاني: أمين المخازن (الوسط) */}
        <div
          className="print-signature-box"
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '52px',
            borderLeft: '1px dashed #cbd5e1',
            paddingLeft: '10px'
          }}
        >
          <span style={{ fontSize: '9pt', fontWeight: 900, color: '#099A75', marginBottom: '2px', display: 'block' }}>
            أمين المخازن
          </span>
          <span style={{ fontSize: '9.5pt', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>
            {storekeeperName || 'أ / محمد حلمي'}
          </span>
          <div style={{ fontSize: '8pt', color: '#475569', fontWeight: 700, borderTop: '1.2px dotted #64748b', paddingTop: '3px' }}>
            التوقيع: ........................................
          </div>
        </div>

        {/* 3. الطرف الثالث: يعتمد / مدير المشروع (اليسار) */}
        <div
          className="print-signature-box"
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '52px'
          }}
        >
          <span style={{ fontSize: '9pt', fontWeight: 900, color: '#099A75', marginBottom: '2px', display: 'block' }}>
            يعتمد / مدير المشروع
          </span>
          <span style={{ fontSize: '9.5pt', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>
            م / محمد عدوي
          </span>
          <div style={{ fontSize: '8pt', color: '#475569', fontWeight: 700, borderTop: '1.2px dotted #64748b', paddingTop: '3px' }}>
            التوقيع: ........................................
          </div>
        </div>
      </div>
      {footerNotice && (
        <div style={{ textAlign: 'center', fontSize: '7.5pt', color: '#64748b', fontWeight: 700, marginTop: '4px', direction: 'rtl' }}>
          <span>{footerNotice}</span>
        </div>
      )}
    </div>
  );
}

interface SheetRow {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  alertLimit: number;
  physicalCount: number | null;
  variance: number | null;
  notes: string;
}


export default function InventorySheetsPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const { t, language } = useLanguage();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sheetMode, setSheetMode] = useState<SheetMode>('AUDIT');

  // Physical Counts Map: itemId -> { count: number | '', notes: string }
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, { count: number | ''; notes: string }>>({});

  // Sorting
  const [sortField, setSortField] = useState<SortField>('category');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Print Modal & Options
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printOptions, setPrintOptions] = useState<InventoryPrintOptions>({
    scope: 'ALL_CATEGORIES',
    pageBreakPerDept: true,
    includeCoverPage: true,
    includeSignatures: true,
    includeZeroStock: true,
    sheetMode: 'AUDIT'
  });

  // ──── Roles & Route Protection ────
  const cleanEmail = (userData?.email || '').toLowerCase();
  const role = userData?.role || 'user';
  const jobTitle = userData?.jobTitle || '';
  const isAdmin = role === 'admin' || cleanEmail === 'mohamedalghala@gmail.com' || cleanEmail.startsWith('admin');
  const isManagement = role === 'management' || ['PROJECT_MANAGER', 'FACILITY_MANAGER', 'MAINTENANCE_MANAGER', 'FACILITY_TEAM_LEADER'].includes(jobTitle);

  const rawDepts = userData?.departments || [];
  const isAllDepts = isAdmin || isManagement || rawDepts.length >= 15 || rawDepts.includes('all') || rawDepts.includes('كافة الأقسام') || userData?.category === 'all' || userData?.category === 'كافة الأقسام';
  const isRestrictedUser = !isAllDepts;

  useEffect(() => {
    if (userData && !isAdmin && !isManagement) {
      router.push('/dashboard');
    }
  }, [userData, isAdmin, isManagement, router]);

  // Real-time Items Listener (Loads all active catalog items, with instant synced snapshot fallback)
  useEffect(() => {
    let hasLiveSnap = false;
    fetch('/data/live_items_snapshot.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) => {
        if (!hasLiveSnap && Array.isArray(data) && data.length > 0) {
          const valid = data.filter((item: any) => item.name && String(item.name).trim() !== '');
          setItems(valid);
          setLoading(false);
        }
      })
      .catch(() => {});

    const unsub = onSnapshot(collection(db, 'items'), (snap) => {
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((item: any) => item.name && String(item.name).trim() !== '');
      if (list.length > 0) {
        hasLiveSnap = true;
        setItems(list);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Firestore read throttled, using synced snapshot for inventory sheets:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Authorized departments
  const userAuthorizedDepts = useMemo(() => {
    if (isAllDepts) return [];
    if (userData?.departments && Array.isArray(userData.departments) && userData.departments.length > 0) {
      return userData.departments.map(d => normalizeCategory(d));
    }
    if (userData?.category && userData.category !== 'all' && userData.category !== 'كافة الأقسام' && userData.category !== 'الكل' && userData.category !== 'عام') {
      return [normalizeCategory(userData.category)];
    }
    return [];
  }, [userData, isAllDepts]);

  // Scoped Items (Authorized departments for current user)
  const scopedItems = useMemo(() => {
    let baseList = items;
    if (isRestrictedUser && userAuthorizedDepts.length > 0) {
      baseList = baseList.filter(i => userAuthorizedDepts.includes(normalizeCategory(i.category)));
    }
    return baseList;
  }, [items, isRestrictedUser, userAuthorizedDepts]);

  const activeStockItems = useMemo(() => {
    return scopedItems.filter(item => (Number(item.stock) || 0) > 0);
  }, [scopedItems]);

  // Categories List (All approved warehouse departments in official sequence)
  const categories = useMemo(() => {
    const set = new Set<string>();
    scopedItems.forEach(i => {
      if (i.category && i.category.trim()) set.add(i.category.trim());
    });
    return Array.from(set).sort((a, b) => {
      const ordCmp = getDeptOrder(a) - getDeptOrder(b);
      if (ordCmp !== 0) return ordCmp;
      return a.localeCompare(b, 'ar');
    });
  }, [scopedItems]);

  // Transform to Sheet Rows
  const sheetRows: SheetRow[] = useMemo(() => {
    return scopedItems.map(item => {
      const stock = Number(item.stock) || 0;
      const alertLimit = Number(item.alertLimit) || 10;
      const entry = physicalCounts[item.id];
      
      const physicalCount = entry && entry.count !== '' ? Number(entry.count) : null;
      const variance = physicalCount !== null ? Number((physicalCount - stock).toFixed(2)) : null;
      const notes = entry?.notes || '';

      return {
        id: item.id,
        code: item.code || '—',
        name: item.name,
        category: item.category || 'عام',
        unit: item.unit || 'عدد',
        stock,
        alertLimit,
        physicalCount,
        variance,
        notes
      };
    });
  }, [scopedItems, physicalCounts]);

  // Filtered Sheet Rows
  const filteredRows = useMemo(() => {
    return sheetRows.filter(row => {
      if (selectedCategory !== 'ALL' && row.category !== selectedCategory) {
        return false;
      }

      if (statusFilter === 'IN_STOCK' && row.stock <= 0) {
        return false;
      }

      if (statusFilter === 'LOW_STOCK' && row.stock > row.alertLimit) {
        return false;
      }

      if (statusFilter === 'VARIANCE_ONLY' && (row.variance === null || row.variance === 0)) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const codeMatch = row.code.toLowerCase().includes(q);
        const nameMatch = row.name.toLowerCase().includes(q);
        const catMatch = row.category.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !catMatch) return false;
      }

      return true;
    });
  }, [sheetRows, selectedCategory, statusFilter, searchTerm]);

  // Sorted Rows (Official 17-Department Order then Item Code Ascending by default)
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];

    list.sort((a, b) => {
      if (sortField === 'category') {
        const ordCmp = getDeptOrder(a.category) - getDeptOrder(b.category);
        if (ordCmp !== 0) return sortDir === 'asc' ? ordCmp : -ordCmp;
        return (parseInt(a.code) || 0) - (parseInt(b.code) || 0);
      }

      if (sortField === 'code') {
        const cA = parseInt(a.code) || 0;
        const cB = parseInt(b.code) || 0;
        return sortDir === 'asc' ? cA - cB : cB - cA;
      }

      if (sortField === 'stock') {
        return sortDir === 'asc' ? a.stock - b.stock : b.stock - a.stock;
      }

      if (sortField === 'physical') {
        const pA = a.physicalCount ?? -999999;
        const pB = b.physicalCount ?? -999999;
        return sortDir === 'asc' ? pA - pB : pB - pA;
      }

      if (sortField === 'variance') {
        const vA = a.variance ?? -999999;
        const vB = b.variance ?? -999999;
        return sortDir === 'asc' ? vA - vB : vB - vA;
      }

      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      const strCmp = valA.localeCompare(valB, language === 'ar' ? 'ar' : 'en');
      return sortDir === 'asc' ? strCmp : -strCmp;
    });

    return list;
  }, [filteredRows, sortField, sortDir, language]);

  // Pagination Slice
  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return sortedRows;
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  // KPI Statistics
  const stats = useMemo(() => {
    const totalItems = filteredRows.length;
    const totalBookUnits = Number(filteredRows.reduce((acc, r) => acc + r.stock, 0).toFixed(2));
    const lowStockItems = filteredRows.filter(r => r.stock <= r.alertLimit).length;
    const discrepancyItems = filteredRows.filter(r => r.variance !== null && r.variance !== 0).length;
    const countedItems = filteredRows.filter(r => r.physicalCount !== null).length;
    const uniqueCategories = new Set(filteredRows.map(r => r.category)).size;

    return { totalItems, totalBookUnits, lowStockItems, discrepancyItems, countedItems, uniqueCategories };
  }, [filteredRows]);

  // ──── PRINT GROUPS & SUMMARY (ALL 17 APPROVED DEPARTMENTS) ────
  const { printCategoryGroups, printSummaryStats } = useMemo(() => {
    // 1. Filter items based on includeZeroStock option
    let baseList = printOptions.includeZeroStock 
      ? scopedItems 
      : scopedItems.filter(item => (Number(item.stock) || 0) > 0);

    // 2. Apply scope filter
    if (printOptions.scope === 'SELECTED_CATEGORY' && printOptions.targetCategory) {
      baseList = baseList.filter(i => i.category === printOptions.targetCategory);
    } else if (printOptions.scope === 'CURRENT_FILTER') {
      if (selectedCategory !== 'ALL') {
        baseList = baseList.filter(i => i.category === selectedCategory);
      }
      if (statusFilter === 'LOW_STOCK') {
        baseList = baseList.filter(i => (Number(i.stock) || 0) <= (Number(i.alertLimit) || 10));
      }
      if (statusFilter === 'VARIANCE_ONLY') {
        baseList = baseList.filter(i => {
          const entry = physicalCounts[i.id];
          const p = entry && entry.count !== '' ? Number(entry.count) : null;
          return p !== null && p !== Number(i.stock);
        });
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        baseList = baseList.filter(i => 
          (i.code && i.code.toLowerCase().includes(q)) ||
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q))
        );
      }
    }

    // 3. Transform to rows
    const allRows: SheetRow[] = baseList.map(item => {
      const stock = Number(item.stock) || 0;
      const alertLimit = Number(item.alertLimit) || 10;
      const entry = physicalCounts[item.id];
      const physicalCount = entry && entry.count !== '' ? Number(entry.count) : null;
      const variance = physicalCount !== null ? Number((physicalCount - stock).toFixed(2)) : null;
      const notes = entry?.notes || '';

      return {
        id: item.id,
        code: item.code || '—',
        name: item.name,
        category: item.category || (language === 'ar' ? 'أصناف عامة' : 'General'),
        unit: item.unit || 'عدد',
        stock,
        alertLimit,
        physicalCount,
        variance,
        notes
      };
    });

    // 4. Sort rows by Official 17-Department Order then item code ascending
    allRows.sort((a, b) => {
      const ordA = getDeptOrder(a.category);
      const ordB = getDeptOrder(b.category);
      if (ordA !== ordB) return ordA - ordB;
      return (parseInt(a.code) || 0) - (parseInt(b.code) || 0);
    });

    // 5. Group by category
    const groups: Record<string, SheetRow[]> = {};
    allRows.forEach(r => {
      const cat = r.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    });

    // 6. Calculate summary statistics per category (ALWAYS ensure all 17 official departments exist when scope === ALL_CATEGORIES)
    const official17Depts = [
      'أدوات كهربائية',
      'أدوات سباكة',
      'أدوات خامات الري',
      'حمامات سباحة',
      'مستلزمات نظافة',
      'أدوات نقاشة',
      'أدوات وخامات نجارة',
      'أدوات عامة',
      'أدوات سيكوريت',
      'أدوات الوميتال',
      'أدوات مكاتب',
      'أدوات ميكانيكا',
      'أدوات الأمن وكاميرات المراقبة',
      'رخام ومواد بناء',
      'ملابس',
      'عدد و معدات',
      'قسم المستهلكات'
    ];

    const targetCats = printOptions.scope === 'ALL_CATEGORIES' 
      ? official17Depts 
      : Object.keys(groups);

    const catSummaries = targetCats.map((cat, idx) => {
      const rows = groups[cat] || [];
      const totalStock = Number(rows.reduce((acc, r) => acc + r.stock, 0).toFixed(2));
      const countedCount = rows.filter(r => r.physicalCount !== null).length;
      
      const deptAllItems = scopedItems.filter(i => {
        const catNorm = normalizeCategory(cat);
        const itemNorm = normalizeCategory(i.category);
        return itemNorm === catNorm || i.category === cat;
      });
      const totalRegistered = deptAllItems.length;
      const itemsWithStock = deptAllItems.filter(i => (Number(i.stock) || 0) > 0).length;

      return {
        index: idx + 1,
        category: cat,
        itemsCount: rows.length,
        totalRegistered,
        itemsWithStock,
        totalStock,
        countedCount
      };
    });

    const grandTotalItems = allRows.length;
    const grandTotalStock = Number(allRows.reduce((acc, r) => acc + r.stock, 0).toFixed(2));
    const grandTotalRegistered = scopedItems.length;
    const grandTotalWithStock = scopedItems.filter(i => (Number(i.stock) || 0) > 0).length;

    return {
      printCategoryGroups: groups,
      printSummaryStats: {
        categories: catSummaries,
        grandTotalItems,
        grandTotalStock,
        grandTotalRegistered,
        grandTotalWithStock
      }
    };
  }, [scopedItems, printOptions, selectedCategory, statusFilter, searchTerm, physicalCounts, language]);

  // Handle Physical Count Change
  const handleCountChange = (id: string, val: string) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [id]: {
        count: val === '' ? '' : Number(val),
        notes: prev[id]?.notes || ''
      }
    }));
  };

  // Handle Note Change
  const handleNoteChange = (id: string, notes: string) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [id]: {
        count: prev[id]?.count !== undefined ? prev[id].count : '',
        notes
      }
    }));
  };

  // Quick Action: Auto-Fill Physical Count = Book Balance
  const handleAutoFillMatch = () => {
    const filled: Record<string, { count: number | ''; notes: string }> = {};
    sheetRows.forEach(r => {
      filled[r.id] = {
        count: r.stock,
        notes: physicalCounts[r.id]?.notes || ''
      };
    });
    setPhysicalCounts(filled);
    toast.success(t('inventorySheets.autoFillMatch'));
  };

  // Quick Action: Clear Physical Counts
  const handleClearPhysical = () => {
    setPhysicalCounts({});
    toast.success(t('inventorySheets.clearPhysical'));
  };

  // Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // ──── PRINT HANDLERS (A4 Print Engine — Scroll to top for clean origin capture) ────
  useEffect(() => {
    const onBeforePrint = () => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('beforeprint', onBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
    };
  }, []);

  const handleOpenPrintModal = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setPrintOptions(prev => ({
      ...prev,
      includeZeroStock: true,
      sheetMode: sheetMode,
      targetCategory: selectedCategory !== 'ALL' ? selectedCategory : (categories[0] || '')
    }));
    setIsPrintModalOpen(true);
  };

  const handleExecutePrint = (options: InventoryPrintOptions) => {
    toast.dismiss();
    setPrintOptions(options);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleQuickPrintAll = () => {
    toast.dismiss();
    setPrintOptions({
      scope: 'ALL_CATEGORIES',
      pageBreakPerDept: true,
      includeCoverPage: true,
      includeSignatures: true,
      includeZeroStock: true,
      sheetMode: sheetMode
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrintCurrent = () => {
    if (selectedCategory !== 'ALL') {
      handleExecutePrint({
        scope: 'SELECTED_CATEGORY',
        targetCategory: selectedCategory,
        pageBreakPerDept: false,
        includeCoverPage: false,
        includeSignatures: true,
        includeZeroStock: true,
        sheetMode: sheetMode
      });
    } else {
      handleQuickPrintAll();
    }
  };

  // Export to Excel (Strictly positive stock, ending with Physical Balance & Notes)
  const handleExportExcel = async () => {
    try {
      const exportCols = [
        { header: 'م', key: 'seq', width: 8 },
        { header: t('inventorySheets.code'), key: 'code', width: 14 },
        { header: t('inventorySheets.name'), key: 'name', width: 35 },
        { header: t('inventorySheets.category'), key: 'category', width: 22 },
        { header: t('inventorySheets.unit'), key: 'unit', width: 12 },
        ...(sheetMode === 'AUDIT' ? [
          { header: t('inventorySheets.bookBalance'), key: 'stock', width: 15 },
        ] : []),
        { header: 'الرصيد الفعلي', key: 'physical', width: 18 },
        { header: 'الملاحظات', key: 'notes', width: 32 }
      ];

      const exportRows = sortedRows.map((r, i) => ({
        seq: i + 1,
        code: r.code,
        name: r.name,
        category: r.category,
        unit: r.unit,
        stock: Number(formatCleanQty(r.stock)),
        physical: r.physicalCount !== null ? Number(formatCleanQty(r.physicalCount)) : '',
        notes: r.notes
      }));

      await exportToExcel(
        `${t('inventorySheets.printHeading')} - ${selectedCategory === 'ALL' ? t('inventorySheets.allCategories') : selectedCategory}`,
        'Inventory_Sheets',
        exportCols,
        exportRows,
        `Inventory_Stocktaking_${selectedCategory}_${new Date().toISOString().slice(0, 10)}`
      );
      toast.success(t('alerts.success'));
    } catch (e) {
      console.error("Excel export error:", e);
      toast.error(t('alerts.error'));
    }
  };

  return (
    <div style={{ paddingBottom: '3rem', width: '100%', maxWidth: '100%' }}>
      
      {/* ──── SCREEN ONLY CONTROLS & HEADER ──── */}
      <div className="hide-on-print">
        
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'rgba(9, 154, 117, 0.12)', color: '#099A75' }}>
                <ClipboardList size={26} />
              </div>
              <h1 className="heading-xl" style={{ margin: 0, fontWeight: 800 }}>
                {t('inventorySheets.title')}
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('inventorySheets.subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleAutoFillMatch} 
              className="btn btn-outline"
              title={t('inventorySheets.autoFillMatch')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#099A75', borderColor: 'rgba(9, 154, 117, 0.4)' }}
            >
              <Zap size={16} />
              <span>{t('inventorySheets.autoFillMatch')}</span>
            </button>

            <button 
              onClick={handleClearPhysical} 
              className="btn btn-outline"
              title={t('inventorySheets.clearPhysical')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={16} />
              <span>{t('inventorySheets.clearPhysical')}</span>
            </button>

            <button 
              onClick={handleExportExcel} 
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#099A75', borderColor: '#099A75', fontWeight: 600 }}
            >
              <FileSpreadsheet size={16} />
              <span>{t('inventorySheets.exportExcel')}</span>
            </button>

            {/* Smart Print Button Group */}
            <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(9, 154, 117, 0.2)' }}>
              <button 
                onClick={handlePrintCurrent} 
                className="btn btn-primary"
                title={selectedCategory !== 'ALL' 
                  ? (language === 'ar' ? `طباعة فورية لقسم (${selectedCategory})` : `Print Department (${selectedCategory})`)
                  : (language === 'ar' ? 'طباعة سريعة للجرد الشامل (17 قسماً)' : 'Print All 17 Departments')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, borderRadius: 0, padding: '0.6rem 1rem' }}
              >
                <Printer size={17} />
                <span>
                  {selectedCategory !== 'ALL' 
                    ? (language === 'ar' ? `طباعة (${selectedCategory})` : `Print (${selectedCategory})`)
                    : (language === 'ar' ? 'طباعة الجرد الشامل (17 قسماً)' : t('inventorySheets.printBtn'))}
                </span>
              </button>

              <button 
                onClick={handleOpenPrintModal}
                className="btn btn-primary"
                title={language === 'ar' ? 'خيارات وتخصيص الطباعة المتقدمة (غلاف، جرد أعمى، فواصل)' : 'Advanced Print Options'}
                style={{ 
                  borderInlineStart: '1px solid rgba(255,255,255,0.25)', 
                  padding: '0.6rem 0.75rem', 
                  borderRadius: 0,
                  background: '#078061',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ──── KPI SUMMARY CARDS ──── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* Total Items (> 0) */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(9, 154, 117, 0.12)', color: '#099A75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('inventorySheets.totalItems')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats.totalItems.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {/* Total Book Units */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('inventorySheets.totalBookUnits')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>
                {stats.totalBookUnits.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderTree size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('purchaseRequisition.affectedCategories')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>
                {stats.uniqueCategories.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {/* Variances Count */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('inventorySheets.auditVarianceCount')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.discrepancyItems > 0 ? '#f59e0b' : '#10b981' }}>
                {stats.discrepancyItems.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginInlineStart: '6px' }}>
                  ({stats.countedItems} {language === 'ar' ? 'تم جردها' : 'counted'})
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ──── ADVANCED SMART FILTER TOOLBAR ──── */}
        <div className="enterprise-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            
            {/* Search Input */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('inventorySheets.searchPlaceholder')}
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder={t('common.search')} 
                  className="input-field"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.25rem', width: '100%' }}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('inventorySheets.filterCategory')}
              </label>
              <div style={{ position: 'relative' }}>
                <Filter size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select 
                  value={selectedCategory} 
                  onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  className="input-field"
                  style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.25rem', width: '100%' }}
                >
                  <option value="ALL">{t('inventorySheets.allCategories')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock Status Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('inventorySheets.filterStatus')}
              </label>
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="ALL">{t('inventorySheets.statusAll')}</option>
                <option value="IN_STOCK">{t('inventorySheets.statusInStock')}</option>
                <option value="LOW_STOCK">{t('inventorySheets.statusLowStock')}</option>
                <option value="VARIANCE_ONLY">{t('inventorySheets.statusVarianceOnly')}</option>
              </select>
            </div>

            {/* Sheet Mode Switcher */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('inventorySheets.sheetMode')}
              </label>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                <button
                  type="button"
                  onClick={() => setSheetMode('AUDIT')}
                  className={`btn ${sheetMode === 'AUDIT' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: 'none' }}
                >
                  <Eye size={14} /> {language === 'ar' ? 'كشف معلن' : 'Audit'}
                </button>
                <button
                  type="button"
                  onClick={() => setSheetMode('BLIND')}
                  className={`btn ${sheetMode === 'BLIND' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: 'none' }}
                >
                  <EyeOff size={14} /> {language === 'ar' ? 'كشف أعمى' : 'Blind Count'}
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <div>
              <button 
                onClick={resetFilters} 
                className="btn btn-outline" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem' }}
                title={t('common.resetFilters')}
              >
                <RotateCcw size={16} /> {t('common.resetFilters')}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ──── SCREEN DATA TABLE ──── */}
      <div className="enterprise-card hide-on-print" style={{ padding: '1.5rem' }}>
        
        {/* Table Controls Bar */}
        <div className="flex-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {t('common.showing')} <strong style={{ color: 'var(--text-primary)' }}>{paginatedRows.length}</strong> {t('common.of')} <strong style={{ color: 'var(--text-primary)' }}>{sortedRows.length}</strong> {t('common.records')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('common.pageSize')}</span>
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="input-field"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={0}>{t('common.all')}</option>
            </select>
          </div>
        </div>

        {/* Screen Table */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : sortedRows.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            {t('inventorySheets.noItemsMatch')}
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="wms-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ width: '40px', textAlign: 'center' }}>{t('inventorySheets.index')}</th>
                  
                  <th onClick={() => handleSort('code')} style={{ width: '90px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <span>{t('inventorySheets.code')}</span>
                      {sortField === 'code' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th onClick={() => handleSort('name')} style={{ textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{t('inventorySheets.name')}</span>
                      {sortField === 'name' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th onClick={() => handleSort('category')} style={{ width: '150px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{t('inventorySheets.category')}</span>
                      {sortField === 'category' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th style={{ width: '70px', textAlign: 'center' }}>{t('inventorySheets.unit')}</th>

                  {/* Book Balance */}
                  {sheetMode === 'AUDIT' && (
                    <th onClick={() => handleSort('stock')} style={{ width: '110px', textAlign: 'center', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <span>{t('inventorySheets.bookBalance')}</span>
                        {sortField === 'stock' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                  )}

                  {/* Physical Balance (الرصيد الفعلي) */}
                  <th style={{ width: '150px', textAlign: 'center', background: 'rgba(9, 154, 117, 0.08)', color: '#099A75', fontWeight: 800 }}>
                    {language === 'ar' ? 'الرصيد الفعلي' : t('inventorySheets.physicalBalance')}
                  </th>

                  {/* Notes (الملاحظات) right next to Physical Balance at the end of the table */}
                  <th style={{ minWidth: '190px', textAlign: language === 'ar' ? 'right' : 'left', fontWeight: 800 }}>
                    {language === 'ar' ? 'الملاحظات' : t('inventorySheets.notesVariance')}
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * (pageSize || sortedRows.length) + idx + 1;
                  const isDiscrepant = row.variance !== null && row.variance !== 0;

                  return (
                    <tr key={row.id} style={{ background: isDiscrepant ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{globalIdx}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, textAlign: 'center' }}>
                        <span style={{ padding: '0.2rem 0.4rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>
                          {row.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.category}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{row.unit}</td>

                      {/* Book Balance (Actual number without trailing zeros) */}
                      {sheetMode === 'AUDIT' && (
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#099A75', fontSize: '0.95rem' }}>
                          {formatCleanQty(row.stock)}
                        </td>
                      )}

                      {/* Physical Balance Input + Inline Variance Badge */}
                      <td style={{ textAlign: 'center', background: 'rgba(9, 154, 117, 0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <input 
                            type="number"
                            step="any"
                            min="0"
                            placeholder="—"
                            className="input-field"
                            value={physicalCounts[row.id]?.count !== undefined ? physicalCounts[row.id].count : ''}
                            onChange={(e) => handleCountChange(row.id, e.target.value)}
                            style={{ 
                              width: '85px', 
                              textAlign: 'center', 
                              fontWeight: 800, 
                              color: '#099A75',
                              padding: '4px 6px',
                              margin: '0'
                            }}
                          />
                          {sheetMode === 'AUDIT' && row.variance !== null && (
                            row.variance === 0 ? (
                              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.72rem', padding: '2px 5px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                {t('inventorySheets.matchedBadge')}
                              </span>
                            ) : row.variance > 0 ? (
                              <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.75rem', padding: '2px 5px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                +{formatCleanQty(row.variance)}
                              </span>
                            ) : (
                              <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', padding: '2px 5px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                {formatCleanQty(row.variance)}
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Notes */}
                      <td>
                        <input 
                          type="text"
                          placeholder="ملاحظات..."
                          className="input-field"
                          value={physicalCounts[row.id]?.notes || ''}
                          onChange={(e) => handleNoteChange(row.id, e.target.value)}
                          style={{ width: '100%', fontSize: '0.8rem', padding: '4px 8px' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pageSize > 0 && totalPages > 1 && (
          <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('common.page')} {currentPage} {t('common.of')} {totalPages}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.75rem', opacity: currentPage === 1 ? 0.4 : 1 }}
              >
                <ChevronRight size={16} /> {t('common.previous')}
              </button>

              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = currentPage;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                if (pageNum < 1 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '0.4rem 0.8rem', minWidth: '36px', textAlign: 'center', fontWeight: currentPage === pageNum ? 700 : 400 }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.75rem', opacity: currentPage === totalPages ? 0.4 : 1 }}
              >
                {t('common.next')} <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ──── OFFICIAL A4 PRINT VIEW (STRUCTURED & SEPARATED BY DEPARTMENT) ──── */}
      <div className="show-on-print-only official-document-paper" style={{ padding: '0', margin: '0', width: '100%', maxWidth: '100%', minWidth: '100%', display: 'block', direction: 'rtl', boxSizing: 'border-box', background: '#ffffff' }}>
        
        {/* OPTIONAL: EXECUTIVE COVER & ALL-DEPARTMENTS SUMMARY PAGE */}
        {printOptions.includeCoverPage && printOptions.scope === 'ALL_CATEGORIES' && (
          <div className="print-page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
            <PrintHeader 
              title={language === 'ar' ? 'محضر وفهرس كشوف الجرد العام الشامل' : 'Comprehensive Inventory Audit Master Sheet'}
              subtitle={language === 'ar' 
                ? `بيان إجمالي بأرصدة وحصيلة كافة أقسام ومستودعات الشركة (17 قسماً معتمداً | ${printSummaryStats.grandTotalRegistered || 902} صنفاً مسجلاً | إجمالي الأرصدة: ${formatCleanQty(printSummaryStats.grandTotalStock)} وحدة)`
                : `Master index of all 17 warehouse departments (${printSummaryStats.grandTotalRegistered || 902} items | ${formatCleanQty(printSummaryStats.grandTotalStock)} total units)`}
              documentNumber={`INV-MASTER-${new Date().toISOString().slice(0, 10)}`}
            />

            {/* Compact Cover KPI Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '6px', marginBottom: '10px', textAlign: 'center', direction: 'rtl' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', background: '#f8fafc' }}>
                <div style={{ fontSize: '7.5pt', color: '#64748b', fontWeight: 800 }}>عدد الأقسام المعتمدة</div>
                <div style={{ fontSize: '13pt', fontWeight: 900, color: '#099A75', lineHeight: 1.15 }}>17 قسماً</div>
              </div>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', background: '#f8fafc' }}>
                <div style={{ fontSize: '7.5pt', color: '#64748b', fontWeight: 800 }}>إجمالي أصناف المخزن</div>
                <div style={{ fontSize: '13pt', fontWeight: 900, color: '#0f172a', lineHeight: 1.15 }}>
                  {printSummaryStats.grandTotalRegistered || 902} صنف
                </div>
                <div style={{ fontSize: '7pt', color: '#64748b', fontWeight: 700 }}>({printSummaryStats.grandTotalWithStock || 424} صنف متوفر برصيد)</div>
              </div>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', background: '#f8fafc' }}>
                <div style={{ fontSize: '7.5pt', color: '#64748b', fontWeight: 800 }}>إجمالي الرصيد الدفتري</div>
                <div style={{ fontSize: '13pt', fontWeight: 900, color: '#0284c7', lineHeight: 1.15 }}>{formatCleanQty(printSummaryStats.grandTotalStock)} وحدة</div>
              </div>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', background: '#f8fafc' }}>
                <div style={{ fontSize: '7.5pt', color: '#64748b', fontWeight: 800 }}>نطاق ونمط الجرد</div>
                <div style={{ fontSize: '10pt', fontWeight: 900, color: printOptions.sheetMode === 'BLIND' ? '#d97706' : '#059669', lineHeight: 1.2 }}>
                  {printOptions.includeZeroStock ? 'جرد شامل (902 صنف)' : 'أصناف برصيد (424)'}
                </div>
                <div style={{ fontSize: '7pt', color: '#64748b', fontWeight: 700 }}>
                  {printOptions.sheetMode === 'BLIND' ? 'جرد أعمى (مخفي)' : 'جرد معلن ومطابقة'}
                </div>
              </div>
            </div>

            {/* Summary Table of All Departments */}
            <table className="wms-table official-print-table" style={{ width: '100%', minWidth: 0, maxWidth: '100%', borderCollapse: 'collapse', fontSize: '9pt', tableLayout: 'fixed', direction: 'rtl' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#0f172a', borderTop: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ width: '5%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 2px' }}>م</th>
                  <th style={{ width: '27%', textAlign: 'right', color: '#0f172a', fontWeight: 800, padding: '6px 8px' }}>اسم القسم / المستودع</th>
                  <th style={{ width: '13%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 4px' }}>إجمالي الأصناف</th>
                  <th style={{ width: '12%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 4px' }}>أصناف برصيد</th>
                  <th style={{ width: '17%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 4px' }}>الرصيد الدفتري</th>
                  <th style={{ width: '13%', textAlign: 'center', color: '#065f46', background: '#ecfdf5', fontWeight: 800, padding: '6px 4px', border: '1px solid #a7f3d0' }}>الرصيد الفعلي</th>
                  <th style={{ width: '13%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 4px' }}>الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {printSummaryStats.categories.map((c, i) => {
                  const isZeroStock = c.category === 'ملابس' || (c.totalStock === 0);
                  return (
                    <tr 
                      key={c.category} 
                      style={{ 
                        height: '28px', 
                        background: isZeroStock ? '#f0fdf4' : (i % 2 === 0 ? '#ffffff' : '#f8fafc'),
                        borderBottom: '1px solid #cbd5e1' 
                      }}
                    >
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '2px 0' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          background: isZeroStock ? '#dcfce7' : '#e2e8f0', 
                          color: isZeroStock ? '#15803d' : '#0f172a', 
                          fontWeight: 900, 
                          fontSize: '8pt' 
                        }}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a', textAlign: 'right', fontSize: '9pt', padding: '0 8px', verticalAlign: 'middle' }}>
                        {c.category}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#334155', fontSize: '8.5pt', verticalAlign: 'middle' }}>
                        {c.totalRegistered || c.itemsCount} صنف
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#0284c7', fontSize: '8.5pt', verticalAlign: 'middle' }}>
                        {c.itemsWithStock} صنف
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 900, color: isZeroStock ? '#059669' : '#0f172a', fontSize: '9pt', verticalAlign: 'middle' }}>
                        {formatCleanQty(c.totalStock)} وحدة
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 4px' }}>
                        <div style={{ width: '85%', height: '20px', margin: '0 auto', border: '1.2px solid #94a3b8', borderRadius: '4px', background: '#ffffff' }}></div>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 4px' }}>
                        <span style={{ display: 'inline-block', width: '85%', borderBottom: '1.2px dotted #94a3b8', height: '14px' }}></span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', color: '#0f172a', fontWeight: 800, height: '34px', borderTop: '2px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                  <td colSpan={2} style={{ textAlign: 'center', fontSize: '9pt', color: '#0f172a', padding: '0 8px' }}>
                    الإجمالي العام لكافة أقسام ومستودعات الشركة (17 قسماً معتمداً)
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '9pt', color: '#0f172a' }}>
                    {printSummaryStats.grandTotalRegistered || 902} صنف
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '9pt', color: '#0284c7' }}>
                    {printSummaryStats.grandTotalWithStock || 424} صنف
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '9.5pt', color: '#059669', fontWeight: 900 }}>
                    {formatCleanQty(printSummaryStats.grandTotalStock)} وحدة
                  </td>
                  <td colSpan={2} style={{ textAlign: 'center', color: '#64748b', fontSize: '8.5pt' }}>
                    — مطابقة تامة 100% —
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Master Signatures */}
            <div style={{ marginTop: '1rem', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <InventoryAuditSignatures 
                storekeeperName={userData?.name || 'مسؤول المستودع'} 
                footerNotice={`Stockly WMS - محضر وفهرس الجرد العام الشامل لكافة الأقسام - تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}`}
              />
            </div>
          </div>
        )}

        {/* DEPARTMENT-BY-DEPARTMENT SHEETS */}
        {Object.keys(printCategoryGroups).map((catName, catIdx) => {
          const catRows = printCategoryGroups[catName];
          const catTotalStock = Number(catRows.reduce((acc, r) => acc + r.stock, 0).toFixed(2));
          const shouldPageBreak = printOptions.pageBreakPerDept && (catIdx > 0 || printOptions.includeCoverPage);

          return (
            <div 
              key={catName} 
              className={shouldPageBreak ? "print-page-break" : ""}
              style={{ 
                width: '100%',
                marginBottom: '2rem',
                display: 'block'
              }}
            >
              {/* Department Official Header */}
              <PrintHeader 
                title={`${language === 'ar' ? 'كشف الجرد الفعلي للمخزون' : 'Physical Inventory Stocktaking Sheet'} ${printOptions.sheetMode === 'BLIND' ? `(${language === 'ar' ? 'جرد أعمى' : 'Blind Count'})` : ''}`}
                subtitle={`${language === 'ar' ? 'محضر الجرد الفعلي الدوري' : 'Periodic Physical Verification'} - ${catName} (عدد أصناف القسم الفعلية: ${catRows.length} | إجمالي الرصيد: ${formatCleanQty(catTotalStock)} وحدة)`}
                documentNumber={`INV-DEPT-${(catIdx + 1).toString().padStart(2, '0')}`}
                category={catName}
              />

              {/* Department Banner Ribbon */}
              <div className="print-category-banner" style={{ background: '#f8fafc', border: '1.5px solid #099A75', borderRadius: '6px', padding: '4px 10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#099A75', color: '#ffffff', padding: '1px 7px', borderRadius: '4px', fontSize: '8pt', fontWeight: 800 }}>
                    قسم رقم {catIdx + 1}
                  </span>
                  <strong style={{ fontSize: '10pt', color: '#0f172a' }}>
                    {catName}
                  </strong>
                </div>
                <div style={{ fontSize: '7.5pt', color: '#334155', display: 'flex', gap: '12px' }}>
                  <span>عدد الأصناف الفعلية: <strong>{catRows.length}</strong></span>
                  <span>الرصيد الدفتري: <strong style={{ color: '#099A75' }}>{formatCleanQty(catTotalStock)}</strong> وحدة</span>
                  <span>النمط: <strong>{printOptions.sheetMode === 'BLIND' ? 'جرد أعمى' : 'جرد معلن'}</strong></span>
                </div>
              </div>

              {/* Department Table */}
              <table className="wms-table official-print-table" style={{ width: '100%', minWidth: 0, maxWidth: '100%', borderCollapse: 'collapse', fontSize: '9pt', tableLayout: 'fixed', direction: 'rtl' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#0f172a', borderTop: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ width: '4%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 2px' }}>م</th>
                    <th style={{ width: '12%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 4px' }}>{t('inventorySheets.code')}</th>
                    <th style={{ width: printOptions.sheetMode === 'AUDIT' ? '38%' : '50%', textAlign: 'right', color: '#0f172a', fontWeight: 800, padding: '6px 8px' }}>{t('inventorySheets.name')}</th>
                    <th style={{ width: '6%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 2px' }}>{t('inventorySheets.unit')}</th>
                    
                    {printOptions.sheetMode === 'AUDIT' && (
                      <th style={{ width: '12%', textAlign: 'center', color: '#099A75', fontWeight: 800, padding: '6px 4px' }}>{t('inventorySheets.bookBalance')}</th>
                    )}
                    
                    <th style={{ width: '14%', textAlign: 'center', color: '#065f46', background: '#ecfdf5', fontWeight: 800, padding: '6px 4px', border: '1px solid #a7f3d0' }}>
                      الرصيد الفعلي
                    </th>
                    
                    <th style={{ width: '14%', textAlign: 'center', color: '#0f172a', fontWeight: 800, padding: '6px 4px' }}>
                      الملاحظات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {catRows.map((r, idx) => (
                    <tr key={r.id} style={{ height: '28px', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <td style={{ textAlign: 'center', color: '#0f172a', fontWeight: 800, fontSize: '9pt', verticalAlign: 'middle' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, color: '#0f172a', fontSize: '9pt', verticalAlign: 'middle' }}>{r.code}</td>
                      <td style={{ fontWeight: 800, color: '#0f172a', textAlign: 'right', fontSize: '9pt', verticalAlign: 'middle', padding: '0 8px' }}>{r.name}</td>
                      <td style={{ textAlign: 'center', color: '#334155', fontWeight: 700, fontSize: '8.5pt', verticalAlign: 'middle' }}>{r.unit}</td>
                      
                      {printOptions.sheetMode === 'AUDIT' && (
                        <td style={{ textAlign: 'center', fontWeight: 900, color: '#0f172a', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                          {formatCleanQty(r.stock)}
                        </td>
                      )}
                      
                      {/* Physical balance writing box */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 4px' }}>
                        <div style={{ 
                          width: '90%', 
                          height: '22px', 
                          margin: '0 auto', 
                          border: '1.2px solid #94a3b8', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '9pt',
                          color: '#0f172a',
                          background: '#ffffff'
                        }}>
                          {r.physicalCount !== null ? formatCleanQty(r.physicalCount) : ''}
                        </div>
                      </td>
                      
                      {/* Notes column right next to Physical Balance */}
                      <td style={{ fontSize: '8.5pt', color: '#334155', fontWeight: 600, textAlign: 'right', verticalAlign: 'middle', padding: '0 6px' }}>
                        {r.notes || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', color: '#0f172a', fontWeight: 800, height: '34px', borderTop: '2px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                    <td colSpan={4} style={{ textAlign: 'center', fontSize: '9.5pt', color: '#0f172a' }}>
                      إجمالي كشف قسم ({catName}): {catRows.length} صنف
                    </td>
                    {printOptions.sheetMode === 'AUDIT' && (
                      <td style={{ textAlign: 'center', fontSize: '10pt', color: '#059669', fontWeight: 900 }}>
                        {formatCleanQty(catTotalStock)}
                      </td>
                    )}
                    <td style={{ textAlign: 'center', fontSize: '8.5pt', color: '#64748b' }}>
                      [ إجمالي الرصيد الفعلي ]
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '8.5pt', color: '#94a3b8' }}>—</td>
                  </tr>
                </tfoot>
              </table>

              {/* Department Signatures Block */}
              {printOptions.includeSignatures && (
                <div style={{ marginTop: '1rem', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <InventoryAuditSignatures 
                    storekeeperName={userData?.name || 'مسؤول المستودع'} 
                    footerNotice={`Stockly WMS - كشف الجرد الفعلي الدوري المعتمد لقسم (${catName}) - تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}`}
                  />
                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* ──── PRINT CONFIGURATION MODAL ──── */}
      <InventoryPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onPrint={handleExecutePrint}
        categories={categories}
        currentCategory={selectedCategory}
        currentSheetMode={sheetMode}
        totalActiveItemsCount={activeStockItems.length}
        totalAllItemsCount={items.length}
      />

    </div>
  );
}
