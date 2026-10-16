'use client';
import BrandLoader from '@/components/common/BrandLoader';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { 
  PackageOpen, 
  Search, 
  Plus, 
  Filter, 
  Printer, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Layers, 
  RotateCcw, 
  History, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  Upload,
  Wrench,
  Edit3,
  Trash2,
  Sparkles,
  ShoppingCart,
  Barcode,
  X
} from 'lucide-react';
import { InventoryItem, INVENTORY_CATEGORIES, ALL_WAREHOUSE_DEPARTMENTS, normalizeCategory } from '../../types/inventory';
import AddItemModal from './AddItemModal';
import EditItemModal from './EditItemModal';
import ReindexCategoryModal from './ReindexCategoryModal';
import BarcodeScannerModal from '@/components/barcode/BarcodeScannerModal';
import BarcodePrintModal from '@/components/barcode/BarcodePrintModal';
import { BarcodeStickerData } from '@/lib/barcodeEngine';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import { exportToExcel } from '@/lib/excelExport';
import { getItemPackagingInfo } from '@/lib/inventoryMetrics';
import toast from 'react-hot-toast';

type StatusFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'ZERO_STOCK';
type SortStrategy = 'CODE_ASC' | 'NAME_ASC' | 'STOCK_DESC' | 'STOCK_ASC' | 'OUT_DESC';

export default function InventoryPage() {
  const { userData, user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortStrategy, setSortStrategy] = useState<SortStrategy>('CODE_ASC');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReindexModalOpen, setIsReindexModalOpen] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; name: string; code: string } | null>(null);

  // Barcode & QR States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [printStickerItem, setPrintStickerItem] = useState<BarcodeStickerData | null>(null);

  const handleBarcodeScanned = (scannedCode: string) => {
    const trimmed = scannedCode.trim().toLowerCase();
    const found = items.find(i => 
      (i.code && i.code.toLowerCase() === trimmed) ||
      (i.id && i.id.toLowerCase() === trimmed) ||
      (i.name && i.name.toLowerCase().includes(trimmed))
    );
    if (found) {
      setSearchTerm(found.code || found.name);
      toast.success(language === 'ar' ? `تم العثور على الصنف: ${found.name}` : `Found item: ${found.name}`, { icon: '📦' });
    } else {
      setSearchTerm(scannedCode.trim());
      toast(language === 'ar' ? `تم البحث عن الكود: ${scannedCode.trim()}` : `Searching for: ${scannedCode.trim()}`, { icon: '🔍' });
    }
  };

  // ──── Roles & Department Scoping ────
  const cleanEmail = (userData?.email || user?.email || '').toLowerCase();
  const isSuperAdmin = cleanEmail === 'mohamedalghala@gmail.com' || cleanEmail.startsWith('admin');
  const role = userData?.role || 'user';
  const jobTitle = userData?.jobTitle || '';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const isManagement = role === 'management' || ['PROJECT_MANAGER', 'FACILITY_MANAGER', 'MAINTENANCE_MANAGER', 'FACILITY_TEAM_LEADER'].includes(jobTitle);
  const isSupervisor = role === 'supervisor';
  const isUserRole = role === 'user';

  const rawDepts = userData?.departments || [];
  const isAllDepts = isAdmin || isManagement || rawDepts.length >= 15 || rawDepts.includes('all') || rawDepts.includes('كافة الأقسام') || userData?.category === 'all' || userData?.category === 'كافة الأقسام';
  const isRestrictedUser = !isAllDepts;

  // Compute authorized departments for this user
  const userAuthorizedDepts = useMemo(() => {
    if (isAllDepts) return [];
    if (userData?.departments && Array.isArray(userData.departments) && userData.departments.length > 0) {
      return userData.departments.map(d => normalizeCategory(d));
    }
    if (userData?.category && userData.category !== 'all' && userData.category !== 'كافة الأقسام' && userData.category !== 'الكل' && userData.category !== 'عام') {
      return [normalizeCategory(userData.category)];
    }
    if (userData?.department && userData.department !== 'all' && userData.department !== 'كافة الأقسام' && userData.department !== 'الكل' && userData.department !== 'عام') {
      return [normalizeCategory(userData.department)];
    }
    return [];
  }, [userData, isAllDepts]);

  useEffect(() => {
    let hasLiveSnap = false;
    fetch('/data/live_items_snapshot.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: InventoryItem[]) => {
        if (!hasLiveSnap && Array.isArray(data) && data.length > 0) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch(() => {});

    const q = query(collection(db, 'items'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: InventoryItem[] = [];
      snapshot.forEach((doc) => {
        const itemData = { id: doc.id, ...doc.data() } as InventoryItem;
        const code = String(itemData.code || '').trim();
        const name = String(itemData.name || '').trim();
        if (code === 'كود الصنف' || name === 'اسم الصنف' || code === 'code' || name === 'name') {
          return;
        }
        data.push(itemData);
      });
      if (data.length > 0) {
        hasLiveSnap = true;
        setItems(data);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firestore read throttled, using synced snapshot for inventory:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Scoped Items strictly visible to this user
  const scopedItems = useMemo(() => {
    return items.filter(item => {
      if (!item.name || item.name.trim() === '' || item.name === 'اسم الصنف') return false;
      if (isRestrictedUser) {
        if (userAuthorizedDepts.length > 0) {
          return userAuthorizedDepts.includes(normalizeCategory(item.category));
        }
        return true;
      }
      return true;
    });
  }, [items, isRestrictedUser, userAuthorizedDepts]);

  // Category item counts (Scoped to user permissions)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedItems.forEach(item => {
      const cat = (item.category || '').trim();
      if (!cat) return;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [scopedItems]);

  // Extract Categories dynamically (Scoped to user permissions)
  const categories = useMemo(() => {
    const set = new Set<string>();
    scopedItems.forEach(i => {
      const cat = (i.category || '').trim();
      if (cat && cat !== 'الفئة' && cat !== 'all' && cat !== 'category') {
        set.add(cat);
      }
    });
    return Array.from(set).sort();
  }, [scopedItems]);

  // Filter Logic (Filtered from scoped items)
  const filteredItems = useMemo(() => {
    return scopedItems.filter(item => {
      // 1. Dropdown category filter
      if (selectedCategory !== 'all' && normalizeCategory(item.category) !== normalizeCategory(selectedCategory)) {
        return false;
      }

      // 2. Status Filter
      const stock = Number(item.stock) || 0;
      const alertLimit = Number((item as any).alertLimit) || 10;

      if (statusFilter === 'IN_STOCK' && stock <= 0) return false;
      if (statusFilter === 'LOW_STOCK' && (stock <= 0 || stock > alertLimit)) return false;
      if (statusFilter === 'ZERO_STOCK' && stock > 0) return false;

      // 3. Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const codeMatch = String(item.code || '').toLowerCase().includes(q);
        const catMatch = String(item.category || '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !catMatch) return false;
      }

      return true;
    });
  }, [scopedItems, selectedCategory, statusFilter, searchTerm]);

  // Sorted Items
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];

    list.sort((a, b) => {
      if (sortStrategy === 'CODE_ASC') {
        const numA = parseInt(a.code) || 0;
        const numB = parseInt(b.code) || 0;
        if (numA !== numB) return numA - numB;
        return (a.code || '').localeCompare(b.code || '');
      }

      if (sortStrategy === 'NAME_ASC') {
        return (a.name || '').localeCompare(b.name || '', language === 'ar' ? 'ar' : 'en');
      }

      if (sortStrategy === 'STOCK_DESC') {
        return (b.stock || 0) - (a.stock || 0);
      }

      if (sortStrategy === 'STOCK_ASC') {
        return (a.stock || 0) - (b.stock || 0);
      }

      if (sortStrategy === 'OUT_DESC') {
        return (b.totalOut || 0) - (a.totalOut || 0);
      }

      return 0;
    });

    return list;
  }, [filteredItems, sortStrategy, language]);

  // Pagination Slice
  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    if (pageSize === 0) return sortedItems;
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // Global KPIs strictly for scoped items
  const stats = useMemo(() => {
    const totalUnique = scopedItems.length;
    const totalUnits = scopedItems.reduce((acc, i) => acc + (Number(i.stock) || 0), 0);
    const zeroStockCount = scopedItems.filter(i => (Number(i.stock) || 0) <= 0).length;
    const lowStockCount = scopedItems.filter(i => {
      const s = Number(i.stock) || 0;
      const limit = Number((i as any).alertLimit) || 10;
      return s > 0 && s <= limit;
    }).length;
    const totalInUnits = scopedItems.reduce((acc, i) => acc + (Number(i.totalIn) || 0), 0);
    const totalOutUnits = scopedItems.reduce((acc, i) => acc + (Number(i.totalOut) || 0), 0);

    return { totalUnique, totalUnits, zeroStockCount, lowStockCount, totalInUnits, totalOutUnits };
  }, [scopedItems]);

  const getStatusBadge = (stock: number, alertLimit = 10) => {
    if (stock <= 0) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', whiteSpace: 'nowrap' }}>
          {t('inventory.outOfStock')}
        </span>
      );
    }
    if (stock <= alertLimit) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', whiteSpace: 'nowrap' }}>
          {t('inventory.low')}
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', whiteSpace: 'nowrap' }}>
        {t('inventory.safe')}
      </span>
    );
  };

  // Export to Excel (Grouped & Classified by Department)
  const handleExport = async () => {
    try {
      const exportCols = [
        { header: '#', key: 'seq', width: 8 },
        { header: t('inventory.code'), key: 'code', width: 14 },
        { header: t('inventory.name'), key: 'name', width: 36 },
        { header: t('inventory.category'), key: 'category', width: 22 },
        { header: t('inventory.unit'), key: 'unit', width: 12 },
        { header: t('inventory.openingBalance'), key: 'openingBalance', width: 16 },
        { header: t('inventory.totalIn'), key: 'totalIn', width: 16 },
        { header: t('inventory.totalOut'), key: 'totalOut', width: 16 },
        { header: t('inventory.currentStock'), key: 'stock', width: 18 },
        { header: t('inventory.status'), key: 'status', width: 16 }
      ];

      // Group items by category to build an organized classified workbook
      const categoryMap = new Map<string, typeof sortedItems>();
      sortedItems.forEach(item => {
        const cat = item.category || (language === 'ar' ? 'عام' : 'General');
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat)!.push(item);
      });

      const exportRows: any[] = [];
      let globalIdx = 1;

      categoryMap.forEach((itemsInCat, catName) => {
        const catStock = itemsInCat.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
        const catOut = itemsInCat.reduce((sum, i) => sum + (Number(i.totalOut) || 0), 0);
        const catLow = itemsInCat.filter(i => (Number(i.stock) || 0) <= (i.alertLimit || 10)).length;

        // Executive Department Divider Banner
        exportRows.push({
          _isGroupHeader: true,
          groupTitle: `📁 قسم: ${catName} — [إجمالي: ${itemsInCat.length} صنف • رصيد متوفر: ${catStock.toLocaleString('ar-EG')} • إجمالي منصرف: ${catOut.toLocaleString('ar-EG')}${catLow > 0 ? ` • نواقص: ${catLow}` : ''}]`
        });

        itemsInCat.forEach(item => {
          const stock = Number(item.stock) || 0;
          const statusText = stock <= 0 ? t('inventory.outOfStock') : stock <= (item.alertLimit || 10) ? t('inventory.low') : t('inventory.safe');
          exportRows.push({
            seq: globalIdx++,
            code: item.code,
            name: item.name,
            category: item.category,
            unit: item.unit,
            openingBalance: item.openingBalance || 0,
            totalIn: item.totalIn || 0,
            totalOut: item.totalOut || 0,
            stock: stock,
            status: statusText
          });
        });
      });

      await exportToExcel(
        `${t('inventory.printHeaderTitle')} - ${selectedCategory === 'all' ? (language === 'ar' ? 'كافة الأقسام مصنفة' : 'All Classified Depts') : selectedCategory}`,
        'Inventory_Stock',
        exportCols,
        exportRows,
        `Inventory_Balances_${new Date().toISOString().slice(0, 10)}`
      );
      toast.success(t('alerts.success'));
    } catch (err) {
      console.error('Export error:', err);
      toast.error(t('alerts.error'));
    }
  };

  // Import from Excel (Smart Import v2)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      const safeText = (cell: any): string => {
        if (!cell) return '';
        try {
          const v = cell.value;
          if (v == null) return '';
          if (typeof v === 'object') {
            if ('result' in v && v.result != null) return String(v.result).trim();
            if ('formula' in v || 'sharedFormula' in v) return '';
            if ('richText' in v && Array.isArray(v.richText)) return v.richText.map((r: any) => r.text || '').join('').trim();
          }
          return String(cell.text || v || '').trim();
        } catch { try { return String(cell.value || '').trim(); } catch { return ''; } }
      };

      const safeNum = (cell: any): number => {
        if (!cell) return 0;
        try {
          let v = cell.value;
          if (v == null) return 0;
          if (typeof v === 'number') return isNaN(v) ? 0 : v;
          if (typeof v === 'object') {
            if ('result' in v) { const r = Number(v.result); return isNaN(r) ? 0 : r; }
            if ('formula' in v || 'sharedFormula' in v) return 0;
          }
          let str = safeText(cell);
          str = str.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
          str = str.replace(/[,\s]/g, '');
          const n = parseFloat(str);
          return isNaN(n) ? 0 : n;
        } catch { return 0; }
      };

      const findHeader = (sheet: any, keywords: string[]): number => {
        for (let r = 1; r <= 10; r++) {
          const row = sheet.getRow(r);
          let matches = 0;
          for (let c = 1; c <= 20; c++) {
            const text = safeText(row.getCell(c)).toLowerCase().replace(/\s+/g, ' ');
            for (const kw of keywords) {
              if (text.includes(kw)) { matches++; break; }
            }
          }
          if (matches >= 2) return r;
        }
        return -1;
      };

      const findCol = (sheet: any, headerRow: number, keywords: string[]): number => {
        const row = sheet.getRow(headerRow);
        for (let c = 1; c <= 25; c++) {
          const text = safeText(row.getCell(c)).toLowerCase().replace(/\s+/g, ' ');
          for (const kw of keywords) {
            if (text.includes(kw)) return c;
          }
        }
        return -1;
      };

      const invSheet = workbook.worksheets.find((s: any) => s.name.includes('الرصيد الحالي')) || workbook.worksheets.find((s: any) => s.name.includes('مخزون'));
      if (!invSheet) throw new Error('شيت "الرصيد الحالي" غير موجود في الملف!');

      const invHeader = findHeader(invSheet, ['كود', 'اسم', 'رصيد']);
      if (invHeader === -1) throw new Error('لم يتم العثور على عناوين الأعمدة في شيت الرصيد الحالي');

      const colCode = findCol(invSheet, invHeader, ['كود', 'الكود', 'code']);
      const colName = findCol(invSheet, invHeader, ['اسم الصنف', 'الصنف', 'البيان', 'name', 'item']);
      const colCat = findCol(invSheet, invHeader, ['فئة', 'الفئة', 'القسم', 'مجموعة', 'category']);
      const colUnit = findCol(invSheet, invHeader, ['وحدة', 'الوحدة', 'unit']);
      const colOpening = findCol(invSheet, invHeader, ['اول المدة', 'أول المدة', 'افتتاحي', 'opening']);

      if (colCode === -1 || colName === -1) throw new Error('أعمدة كود الصنف واسم الصنف مطلوبة!');

      const itemsMap = new Map<string, any>();
      for (let r = invHeader + 1; r <= invSheet.rowCount; r++) {
        const row = invSheet.getRow(r);
        const code = safeText(row.getCell(colCode));
        const name = safeText(row.getCell(colName));
        if (!code && !name) continue;
        if (code === 'كود الصنف' || name === 'اسم الصنف') continue;

        const category = colCat !== -1 ? (safeText(row.getCell(colCat)) || 'عام') : 'عام';
        const unit = colUnit !== -1 ? (safeText(row.getCell(colUnit)) || 'عدد') : 'عدد';
        const opening = colOpening !== -1 ? safeNum(row.getCell(colOpening)) : 0;

        itemsMap.set(code || name, {
          code: code || '',
          name,
          category,
          unit,
          openingBalance: opening,
          totalIn: 0,
          totalOut: 0,
          stock: opening,
          alertLimit: 10,
          updatedAt: new Date().toISOString()
        });
      }

      const allWrites: { ref: any; data: any }[] = [];
      itemsMap.forEach((item, key) => {
        allWrites.push({ ref: doc(db, 'items', key), data: item });
      });

      for (let i = 0; i < allWrites.length; i += 450) {
        const chunk = allWrites.slice(i, i + 450);
        const batch = writeBatch(db);
        chunk.forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
        await batch.commit();
      }

      toast.success(t('alerts.success'));
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || t('alerts.error'));
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Developer Mode Actions
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    const isConfirmed = window.confirm(
      language === 'ar'
        ? `⚠️ تحذير أمني خاص بوضع المطور:\n\nهل أنت متأكد تماماً من حذف الصنف التالي نهائياً من قاعدة البيانات؟\n- اسم الصنف: ${item.name}\n- كود الصنف: ${item.code}\n- الفئة: ${item.category}\n- الرصيد الحالي: ${item.stock}\n\n* هذا الإجراء لا يمكن التراجع عنه!`
        : `⚠️ Security Warning (Dev Mode):\n\nAre you sure you want to permanently delete this item from the database?\n- Name: ${item.name}\n- Code: ${item.code}\n- Category: ${item.category}\n- Current Stock: ${item.stock}\n\n* This action cannot be undone!`
    );
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'items', item.id));
      toast.success(language === 'ar' ? `تم حذف الصنف "${item.name}" نهائياً بنجاح!` : `Item "${item.name}" deleted successfully!`);
    } catch (err: any) {
      console.error("Error deleting item:", err);
      toast.error(err.message || 'Error deleting item');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setStatusFilter('ALL');
    setSortStrategy('CODE_ASC');
    setCurrentPage(1);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* ──── SCREEN CONTROLS & HEADER ──── */}
      <div className="hide-on-print">
        
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'rgba(9, 154, 117, 0.12)', color: '#099A75' }}>
                <PackageOpen size={26} />
              </div>
              <h1 className="heading-xl" style={{ margin: 0, fontWeight: 800 }}>
                {t('inventory.title')}
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('inventory.subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setTimeout(() => window.print(), 100)} 
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Printer size={16} />
              <span>{t('inventory.printOfficial')}</span>
            </button>

            {(isAdmin || isManagement) && (
              <>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  id="import-excel" 
                  style={{ display: 'none' }}
                  onChange={handleImport}
                />
                <button 
                  onClick={() => document.getElementById('import-excel')?.click()}
                  className="btn btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#099A75', borderColor: '#099A75', fontWeight: 600 }}
                  title={t('inventory.importExcel')}
                >
                  <Upload size={16} />
                  <span>{t('inventory.importExcel')}</span>
                </button>

                <button 
                  onClick={handleExport}
                  className="btn btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#099A75', borderColor: '#099A75', fontWeight: 600, background: 'rgba(9, 154, 117, 0.05)' }}
                  title={language === 'ar' ? 'تصدير أرصدة المخزون بالكامل في ملف إكسيل مصنف ومبوب لكل قسم' : t('inventory.exportExcel')}
                >
                  <FileSpreadsheet size={16} />
                  <span>{language === 'ar' ? 'تصدير إكسيل (مصنف بالأقسام)' : t('inventory.exportExcel')}</span>
                </button>
              </>
            )}

            {/* Autonomous Barcode & QR Scanner */}
            <button 
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00DF8F', borderColor: '#00DF8F', fontWeight: 700, background: 'rgba(0, 223, 143, 0.08)' }}
              title={language === 'ar' ? 'مسح الباركود بالكاميرا أو القارئ اللاسلكي' : 'Scan Barcode or QR'}
            >
              <Barcode size={18} />
              <span>{language === 'ar' ? 'مسح باركود' : 'Scan Barcode'}</span>
            </button>

            {isAdmin && (
              <>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                >
                  <Plus size={18} />
                  <span>{t('inventory.addNewItem')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextState = !devMode;
                    setDevMode(nextState);
                    if (nextState) {
                      toast.success(language === 'ar' ? 'تم تفعيل وضع أمين المخزن (صلاحيات التعديل والحذف متاحة) 🔓' : 'Storekeeper Master Mode Enabled 🔓', { icon: '🛡️', duration: 4000 });
                    } else {
                      toast(language === 'ar' ? 'تم إغلاق وضع أمين المخزن 🔒' : 'Storekeeper Mode Closed 🔒', { icon: '🔒' });
                    }
                  }}
                  className={`btn ${devMode ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    background: devMode ? '#ea580c' : 'rgba(245, 158, 11, 0.12)',
                    borderColor: devMode ? '#ea580c' : '#f59e0b',
                    color: devMode ? '#fff' : '#f59e0b',
                    boxShadow: devMode ? '0 0 12px rgba(234, 88, 12, 0.4)' : undefined
                  }}
                  title="وضع أمين المخزن للتحكم الشامل بالأصناف (تعديل الاسم والكود، نقل الفئات، وحذف الأصناف)"
                >
                  <Wrench size={16} />
                  <span>{devMode ? (language === 'ar' ? 'أمين المخزن (مفعّل 🔓)' : 'Storekeeper (Active 🔓)') : (language === 'ar' ? 'أمين المخزن' : 'Storekeeper')}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ──── TOP KPI METRIC CARDS ──── */}
        <div className="inventory-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* Total Unique Items */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(9, 154, 117, 0.12)', color: '#099A75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PackageOpen size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('inventory.totalUniqueItems')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats.totalUnique.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {/* Total Available Units */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('inventory.totalStockUnits')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>
                {stats.totalUnits.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div 
            onClick={() => setStatusFilter(prev => prev === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
            className="enterprise-card" 
            style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', border: statusFilter === 'LOW_STOCK' ? '2px solid #f59e0b' : undefined }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('inventory.lowStockItems')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
                {stats.lowStockCount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {/* Out of Stock Items */}
          <div 
            onClick={() => setStatusFilter(prev => prev === 'ZERO_STOCK' ? 'ALL' : 'ZERO_STOCK')}
            className="enterprise-card" 
            style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', border: statusFilter === 'ZERO_STOCK' ? '2px solid #ef4444' : undefined }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('inventory.outOfStockItems')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
                {stats.zeroStockCount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

        </div>

        {/* ──── STOREKEEPER MASTER MODE ACTIVE BANNER ──── */}
        {devMode && (
          <div className="animate-fade-in" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', borderRadius: '12px', background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', color: '#ea580c', fontWeight: 600, fontSize: '0.92rem', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.4rem', background: '#ea580c', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wrench size={18} />
              </div>
              <span>{language === 'ar' ? 'وضع أمين المخزن مفعّل 🔓: يمكنك تعديل وحذف الأصناف، أو إعادة ترقيم وتسلسل فئة كاملة بكبسة زر واحدة.' : 'Storekeeper Master Mode Active 🔓: You can edit/delete items or bulk re-index whole categories.'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => setIsReindexModalOpen(true)}
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', background: '#099A75', borderColor: '#099A75', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
              >
                <Sparkles size={14} />
                <span>{language === 'ar' ? '🔢 إعادة ترقيم فئة كاملة' : '🔢 Re-index Category'}</span>
              </button>
              <button onClick={() => setDevMode(false)} className="btn btn-outline" style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', color: '#ea580c', borderColor: '#ea580c', background: 'var(--bg-secondary)', fontWeight: 700 }}>
                {language === 'ar' ? 'إغلاق وضع أمين المخزن 🔒' : 'Exit Storekeeper Mode 🔒'}
              </button>
            </div>
          </div>
        )}

        {/* ──── SMART MULTI-FILTER TOOLBAR ──── */}
        <div className="enterprise-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div className="filter-toolbar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            
            {/* Search Input */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('inventory.searchPlaceholder')}
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
                {t('inventory.category')}
              </label>
              <div style={{ position: 'relative' }}>
                <Filter size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select 
                  value={selectedCategory} 
                  onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  className="input-field"
                  style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.25rem', width: '100%' }}
                  disabled={isUserRole}
                >
                  <option value="all">{isRestrictedUser ? (userAuthorizedDepts.length === 1 ? userAuthorizedDepts[0] : (language === 'ar' ? 'كافة الأقسام المصرحة' : 'All Authorized Departments')) : t('inventory.allCategories')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Status Multi-Buttons */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('inventory.quickFilters')}
              </label>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.4rem', fontSize: '0.78rem', border: 'none' }}
                >
                  {t('inventory.filterAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('IN_STOCK')}
                  className={`btn ${statusFilter === 'IN_STOCK' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.4rem', fontSize: '0.78rem', border: 'none', color: statusFilter === 'IN_STOCK' ? undefined : '#10b981' }}
                >
                  {t('inventory.filterInStock')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('LOW_STOCK')}
                  className={`btn ${statusFilter === 'LOW_STOCK' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.4rem', fontSize: '0.78rem', border: 'none', color: statusFilter === 'LOW_STOCK' ? undefined : '#f59e0b' }}
                >
                  {t('inventory.filterLow')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ZERO_STOCK')}
                  className={`btn ${statusFilter === 'ZERO_STOCK' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.4rem', fontSize: '0.78rem', border: 'none', color: statusFilter === 'ZERO_STOCK' ? undefined : '#ef4444' }}
                >
                  {t('inventory.filterZero')}
                </button>
              </div>
            </div>

            {/* Sort Strategy */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('inventory.sortBy')}
              </label>
              <select
                value={sortStrategy}
                onChange={(e) => setSortStrategy(e.target.value as SortStrategy)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="CODE_ASC">{t('inventory.sortCode')}</option>
                <option value="NAME_ASC">{t('inventory.sortName')}</option>
                <option value="STOCK_DESC">{t('inventory.sortStockDesc')}</option>
                <option value="STOCK_ASC">{t('inventory.sortStockAsc')}</option>
                <option value="OUT_DESC">{t('inventory.sortOutDesc')}</option>
              </select>
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

      {/* ──── INTERACTIVE CATEGORY TABS BAR ──── */}
      <div className="hide-on-print" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Layers size={16} color="#099A75" />
            <span>{language === 'ar' ? 'أقسام وفئات المخزن:' : 'Warehouse Categories:'}</span>
          </div>

          {devMode && selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setIsReindexModalOpen(true)}
              className="btn btn-outline animate-fade-in"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#099A75', borderColor: '#099A75', fontWeight: 700, background: 'rgba(9, 154, 117, 0.08)' }}
            >
              <Sparkles size={13} />
              <span>{language === 'ar' ? `إعادة تسلسل وترقيم فئة (${selectedCategory})` : `Re-index (${selectedCategory})`}</span>
            </button>
          )}
        </div>

        {/* Scrollable Tabs Track */}
        <div 
          className="inventory-categories-track"
          style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            overflowX: 'auto', 
            paddingBottom: '0.5rem',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* All Categories Tab / Authorized Depts */}
          {(categories.length > 1 || !isRestrictedUser) && (
            <button
              type="button"
              onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: selectedCategory === 'all' ? 800 : 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                background: selectedCategory === 'all' ? 'rgba(9, 154, 117, 0.15)' : 'var(--bg-secondary)',
                border: selectedCategory === 'all' ? '1.5px solid #099A75' : '1px solid var(--border-light)',
                color: selectedCategory === 'all' ? '#099A75' : 'var(--text-secondary)',
                boxShadow: selectedCategory === 'all' ? '0 0 10px rgba(9, 154, 117, 0.2)' : 'none'
              }}
            >
              <span>{isRestrictedUser ? (language === 'ar' ? 'كافة الأقسام المصرحة' : 'All Authorized Depts') : t('inventory.allCategories')}</span>
              <span 
                style={{ 
                  fontSize: '0.72rem', 
                  padding: '1px 6px', 
                  borderRadius: '6px', 
                  background: selectedCategory === 'all' ? '#099A75' : 'var(--bg-tertiary)', 
                  color: selectedCategory === 'all' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700
                }}
              >
                {scopedItems.length}
              </span>
            </button>
          )}

          {/* Individual Category Tabs */}
          {categories.map(cat => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 800 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  background: isSelected ? 'rgba(9, 154, 117, 0.15)' : 'var(--bg-secondary)',
                  border: isSelected ? '1.5px solid #099A75' : '1px solid var(--border-light)',
                  color: isSelected ? '#099A75' : 'var(--text-secondary)',
                  boxShadow: isSelected ? '0 0 10px rgba(9, 154, 117, 0.2)' : 'none'
                }}
              >
                <span>{cat}</span>
                <span 
                  style={{ 
                    fontSize: '0.72rem', 
                    padding: '1px 6px', 
                    borderRadius: '6px', 
                    background: isSelected ? '#099A75' : 'var(--bg-tertiary)', 
                    color: isSelected ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ──── SCREEN DATA TABLE ──── */}
      <div className="official-document-paper enterprise-card hide-on-print" style={{ padding: '1.5rem' }}>
        
        {/* Official Print Header */}
        <PrintHeader 
          title={t('inventory.printHeaderTitle')}
          subtitle={`${t('inventory.printHeaderSubtitle')} - ${selectedCategory === 'all' ? t('inventory.printHeaderAllCats') : selectedCategory}`}
          category={selectedCategory === 'all' ? t('inventory.printHeaderAllCats') : selectedCategory}
        />

        {/* Table Controls (Screen Only) */}
        <div className="hide-on-print flex-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {t('common.showing')} <strong style={{ color: 'var(--text-primary)' }}>{paginatedItems.length}</strong> {t('common.of')} <strong style={{ color: 'var(--text-primary)' }}>{sortedItems.length}</strong> {t('common.records')}
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

        {/* Table Container */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : sortedItems.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            {t('common.noData')}
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="wms-table official-print-table" style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ width: '45px', minWidth: '45px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '90px', minWidth: '90px', textAlign: 'center' }}>{t('inventory.code')}</th>
                  <th style={{ minWidth: '240px', maxWidth: '340px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('inventory.name')}</th>
                  <th style={{ minWidth: '140px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('inventory.category')}</th>
                  <th style={{ width: '65px', minWidth: '65px', textAlign: 'center' }}>{t('inventory.unit')}</th>
                  <th style={{ width: '85px', minWidth: '85px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('inventory.openingBalance')}</th>
                  <th style={{ width: '85px', minWidth: '85px', textAlign: 'center', color: '#10b981' }}>{t('inventory.totalIn')}</th>
                  <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', color: '#3b82f6', whiteSpace: 'nowrap' }}>{t('inventory.totalOut')}</th>
                  <th style={{ width: '105px', minWidth: '105px', textAlign: 'center', background: 'rgba(9, 154, 117, 0.08)', color: '#099A75', fontWeight: 800, whiteSpace: 'nowrap' }}>{t('inventory.currentStock')}</th>
                  <th style={{ width: '130px', minWidth: '130px', textAlign: 'center', whiteSpace: 'nowrap' }}>{t('inventory.status')}</th>
                  <th className="hide-on-print" style={{ width: devMode ? '130px' : '90px', minWidth: devMode ? '130px' : '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>{t('inventory.actions')}</th>
                </tr>
              </thead>

              <tbody>
                {paginatedItems.map((item: any, idx) => {
                  const globalIdx = (currentPage - 1) * (pageSize || sortedItems.length) + idx + 1;
                  const stock = Number(item.stock) || 0;
                  const isZero = stock <= 0;
                  const pkg = getItemPackagingInfo(item);

                  return (
                    <tr key={item.id} style={{ background: isZero ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{globalIdx}</td>
                      
                      {/* Code with click to ledger */}
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span 
                          onClick={() => router.push('/item-ledger')}
                          style={{ padding: '0.25rem 0.5rem', background: 'rgba(9, 154, 117, 0.1)', color: '#099A75', borderRadius: '4px', cursor: 'pointer', display: 'inline-block' }}
                          title={t('inventory.viewLedger')}
                        >
                          {item.code || '—'}
                        </span>
                      </td>

                      {/* Name with Image Thumbnail */}
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'normal', whiteSpace: 'normal', minWidth: '240px', padding: '0.65rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          
                          {/* Image Thumbnail */}
                          {item.imageURL ? (
                            <div 
                              onClick={() => setPreviewModalImage({ url: item.imageURL!, name: item.name, code: item.code })}
                              style={{ width: '34px', height: '34px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1.5px solid var(--accent-primary)', cursor: 'pointer', background: 'var(--bg-secondary)', transition: 'transform 0.2s' }}
                              title={language === 'ar' ? 'اضغط لتكبير صورة الصنف' : 'Click to preview full image'}
                            >
                              <img src={item.imageURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <div 
                              onClick={() => handleOpenEditModal(item)}
                              style={{ width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0, background: 'var(--bg-tertiary)', border: '1px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.7, cursor: 'pointer', transition: 'all 0.2s' }}
                              title={language === 'ar' ? 'اضغط لإضافة صورة لهذا الصنف' : 'Click to add image'}
                            >
                              <PackageOpen size={16} />
                            </div>
                          )}

                          <span style={{ lineHeight: '1.4', wordBreak: 'normal' }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', padding: '0.75rem 0.5rem' }}>
                        {item.category}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{item.unit}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.openingBalance || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#10b981', whiteSpace: 'nowrap' }}>{item.totalIn ? `+${item.totalIn}` : 0}</td>
                      
                      {/* Total Out (Blue Outflow) */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#3b82f6', whiteSpace: 'nowrap', minWidth: '95px' }}>
                        {item.totalOut ? `-${item.totalOut}` : 0}
                      </td>
                      
                      {/* Current Stock */}
                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: isZero ? '#ef4444' : '#099A75', background: 'rgba(9, 154, 117, 0.03)', whiteSpace: 'nowrap', minWidth: '105px' }}>
                        <div>{stock}</div>
                        {pkg.ruleType !== 'STANDARD_PIECE' && stock > 0 && (
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', marginTop: '2px' }} title={`${pkg.bundleUnitName} (كل ${pkg.bundleSize}م)`}>
                            {pkg.completedBundles > 0 ? `${pkg.completedBundles} ${pkg.bundleUnitName}` : ''}
                            {pkg.remainingQuantity > 0 ? ` (+${pkg.remainingQuantity}م)` : ''}
                          </div>
                        )}
                      </td>

                      {/* Status (Yellow / Red / Green Badge) */}
                      <td style={{ textAlign: 'center', padding: '0.5rem 0.5rem', whiteSpace: 'nowrap', minWidth: '130px' }}>
                        <span className="hide-on-print">{getStatusBadge(stock, item.alertLimit || 10)}</span>
                        <span className="show-on-print-only" style={{ fontWeight: 700, fontSize: '0.85rem', color: isZero ? '#ef4444' : '#10b981' }}>
                          {isZero ? 'منتهي' : stock <= 10 ? 'منخفض' : 'آمن'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="hide-on-print" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                          
                          {/* Request Material Button */}
                          <button
                            type="button"
                            onClick={() => router.push(`/requests?itemId=${item.id}&dept=${encodeURIComponent(item.category || '')}`)}
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600, background: '#099A75', borderColor: '#099A75' }}
                            title={language === 'ar' ? 'طلب صرف لهذا الصنف' : 'Request this item'}
                          >
                            <ShoppingCart size={13} />
                            <span>{language === 'ar' ? 'طلب صرف' : 'Request'}</span>
                          </button>

                          {/* Ledger Button (Admin only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => router.push('/item-ledger')}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                              title={t('inventory.viewLedger')}
                            >
                              <History size={13} />
                              <span>{language === 'ar' ? 'كارت' : 'Card'}</span>
                            </button>
                          )}

                          {/* Barcode & QR Sticker Print Button */}
                          <button
                            type="button"
                            onClick={() => setPrintStickerItem({
                              sku: item.code || item.id,
                              name: item.name,
                              category: item.category || 'عام',
                              unit: item.unit || 'عدد',
                              zone: 'المستودع الرئيسي',
                              balance: Number(stock) || 0
                            })}
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#00DF8F', borderColor: 'rgba(0, 223, 143, 0.4)' }}
                            title={language === 'ar' ? 'طباعة ملصق الباركود و QR للصنف' : 'Print Barcode Sticker'}
                          >
                            <Barcode size={13} />
                            <span>{language === 'ar' ? 'ملصق' : 'Label'}</span>
                          </button>

                          {/* Dev Mode Edit Button */}
                          {devMode && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                              title={language === 'ar' ? 'تعديل بيانات الصنف ونقل الفئة' : 'Edit item details & move category'}
                            >
                              <Edit3 size={13} />
                              <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                            </button>
                          )}

                          {/* Dev Mode Delete Button */}
                          {devMode && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                              title={language === 'ar' ? 'حذف الصنف نهائياً' : 'Delete item permanently'}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                        </div>
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
          <div className="hide-on-print" style={{ padding: '1rem 0', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
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

        {/* Print Signatures */}
        <div style={{ marginTop: '3rem' }}>
          <PrintSignatures documentTitle="كشف أرصدة المخزن الرسمي" 
            preparedBy={userData?.name || 'محمد حلمي'} 
            preparedRole={userData?.jobTitle || (language === 'ar' ? 'أمين مخازن ومدير النظام' : 'Warehouse Keeper & Admin')} 
          />
        </div>

      </div>

            {/* ──── DEDICATED COMPLETE PRINT REGISTER (ALL SORTED ITEMS) ──── */}
      <div className="show-on-print-only official-document-paper" style={{ padding: '1.5rem' }}>
        <PrintHeader 
          title={t('inventory.title')}
          subtitle={`${t('inventory.subtitle')} - ${selectedCategory === 'all' ? (isRestrictedUser && userAuthorizedDepts.length > 0 ? (language === 'ar' ? 'كافة الأقسام المصرحة' : 'All Authorized Departments') : t('inventory.allCategories')) : selectedCategory} (${sortedItems.length} ${t('common.records')} - ${stats.totalUnits} ${t('common.quantity')})`}
          category={selectedCategory === 'all' ? (isRestrictedUser && userAuthorizedDepts.length > 0 ? userAuthorizedDepts.join(' - ') : t('common.allCategories')) : selectedCategory}
        />

        <table className="wms-table official-print-table" style={{ width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ width: '35px', textAlign: 'center' }}>#</th>
              <th style={{ width: '85px', textAlign: 'center' }}>{t('inventory.code')}</th>
              <th style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t('inventory.name')}</th>
              <th style={{ width: '140px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('inventory.category')}</th>
              <th style={{ width: '60px', textAlign: 'center' }}>{t('inventory.unit')}</th>
              <th style={{ width: '75px', textAlign: 'center' }}>{t('inventory.openingBalance')}</th>
              <th style={{ width: '75px', textAlign: 'center' }}>{t('inventory.totalIn')}</th>
              <th style={{ width: '75px', textAlign: 'center' }}>{t('inventory.totalOut')}</th>
              <th style={{ width: '85px', textAlign: 'center', fontWeight: 800 }}>{t('inventory.currentStock')}</th>
              <th style={{ width: '75px', textAlign: 'center' }}>{t('inventory.status')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item: any, idx: number) => {
              const stock = Number(item.stock) || 0;
              const isZero = stock <= 0;
              return (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{item.code || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{item.category}</td>
                  <td style={{ textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ textAlign: 'center' }}>{item.openingBalance || 0}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.totalIn ? `+${item.totalIn}` : 0}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.totalOut ? `-${item.totalOut}` : 0}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: isZero ? '#ef4444' : '#099A75' }}>{stock}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: isZero ? '#ef4444' : '#10b981' }}>
                    {isZero ? 'منتهي' : stock <= 10 ? 'منخفض' : 'آمن'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '2.5rem' }}>
          <PrintSignatures documentTitle="كشف أرصدة المخزن الرسمي" 
            preparedBy={userData?.name || 'محمد حلمي'} 
            preparedRole={userData?.jobTitle || (language === 'ar' ? 'أمين مخازن ومدير النظام' : 'Warehouse Keeper & Admin')} 
          />
        </div>
      </div>

      <AddItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userUid={user?.uid || ''}
        userName={userData?.name || t('inventory.systemUser')}
        userCategory={userData?.category || ''}
      />

      {/* Edit Item Modal for Storekeeper */}
      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingItem(null); }}
        item={editingItem}
        allCategories={categories}
      />

      {/* Bulk Category Re-indexing Tool */}
      <ReindexCategoryModal
        isOpen={isReindexModalOpen}
        onClose={() => setIsReindexModalOpen(false)}
        allItems={items}
        allCategories={categories}
        initialCategory={selectedCategory !== 'all' ? selectedCategory : categories[0]}
        onSuccess={() => {
          // Keep current category selected
        }}
      />

      {/* Image Lightbox Modal */}
      {previewModalImage && (
        <div 
          onClick={() => setPreviewModalImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '1.5rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="enterprise-card animate-fade-in"
            style={{ maxWidth: '500px', width: '100%', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', position: 'relative', textAlign: 'center' }}
          >
            <button 
              onClick={() => setPreviewModalImage(null)}
              className="btn btn-outline"
              style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }}
            >
              <X size={16} />
            </button>
            <div style={{ width: '100%', height: '320px', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={previewModalImage.url} alt={previewModalImage.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{previewModalImage.name}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontFamily: 'monospace', fontWeight: 700 }}>كود الصنف: {previewModalImage.code}</span>
          </div>
        </div>
      )}

      {/* Barcode & QR Code Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="مسح باركود الأصناف والمخزون"
        subtitle="وجه الكاميرا أو استخدم قارئ الباركود اللاسلكي للبحث الفوري عن الصنف"
      />

      {/* Barcode & QR Code Sticker Print Modal */}
      {printStickerItem && (
        <BarcodePrintModal
          isOpen={Boolean(printStickerItem)}
          onClose={() => setPrintStickerItem(null)}
          items={[printStickerItem]}
        />
      )}

    </div>
  );
}
