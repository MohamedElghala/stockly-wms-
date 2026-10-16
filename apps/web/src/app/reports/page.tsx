'use client';
import BrandLoader from '@/components/common/BrandLoader';
import { calculateInventoryMetrics } from '@/lib/inventoryMetrics';
import { normalizeCategory } from '@/types/inventory';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  PackageCheck, 
  Flame, 
  Printer, 
  ShoppingCart,
  FileSpreadsheet,
  History,
  CheckCircle2,
  BarChart3,
  Layers,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  Wrench,
  Droplets,
  Sparkles,
  Hammer,
  LayoutGrid,
  FolderTree,
  SlidersHorizontal,
  Table as TableIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { Item, Disbursement } from '@stockly/domain';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import { exportToExcel, exportMultiSheetExcel } from '@/lib/excelExport';
import toast from 'react-hot-toast';
import EditItemModal from '@/app/inventory/EditItemModal';

type ReportType = 'CRITICAL' | 'NORMAL' | 'OUT_OF_STOCK' | 'STAGNANT' | 'ACTIVE' | 'ASSETS' | 'TOP';

export default function ReportsPage() {
  const { userData } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  
  const [items, setItems] = useState<Item[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);

  // Managerial Override Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [activeReport, setActiveReport] = useState<ReportType>('CRITICAL');
  const [filterMonth, setFilterMonth] = useState<string>(''); // YYYY-MM format, empty means last 3 months
  const [chartViewMode, setChartViewMode] = useState<'ITEMS_COUNT' | 'CONSUMPTION'>('ITEMS_COUNT');
  
  // Department Grouping & View State
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [showMatrixOverview, setShowMatrixOverview] = useState<boolean>(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  
  // Print State
  const [printMode, setPrintMode] = useState<'CURRENT' | 'ALL' | null>(null);

  useEffect(() => {
    const onAfterPrint = () => setPrintMode(null);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  // ──── Roles & Department Scoping ────
  const cleanEmail = (userData?.email || '').toLowerCase();
  const role = userData?.role || 'user';
  const jobTitle = userData?.jobTitle || '';
  const isAdmin = role === 'admin' || cleanEmail === 'mohamedalghala@gmail.com' || cleanEmail.startsWith('admin');
  const isManagement = role === 'management' || ['PROJECT_MANAGER', 'FACILITY_MANAGER', 'MAINTENANCE_MANAGER', 'FACILITY_TEAM_LEADER'].includes(jobTitle);

  const rawDepts = userData?.departments || [];
  const isAllDepts = isAdmin || isManagement || rawDepts.length >= 15 || rawDepts.includes('all') || rawDepts.includes('كافة الأقسام') || userData?.category === 'all' || userData?.category === 'كافة الأقسام';
  const isRestrictedUser = !isAllDepts;
  const userCategory = userData?.category || '';

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

  useEffect(() => {
    let loadedItems = false;
    let loadedDisb = false;

    const checkLoading = () => {
      if (loadedItems && loadedDisb) {
        setLoading(false);
      }
    };

    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)));
      loadedItems = true;
      checkLoading();
    }, (err) => {
      console.warn("Error loading items:", err);
      loadedItems = true;
      checkLoading();
    });

    const unsubDisb = onSnapshot(query(collection(db, 'disbursements'), orderBy('createdAt', 'desc')), (snap) => {
      setDisbursements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Disbursement)));
      loadedDisb = true;
      checkLoading();
    }, (err) => {
      console.warn("Error loading disbursements:", err);
      loadedDisb = true;
      checkLoading();
    });

    return () => { unsubItems(); unsubDisb(); };
  }, []);

  // ──── Compute Global Unified Metrics Engine ────
  const scopedItems = useMemo(() => {
    return items
      .filter(item => item.name && item.name.trim() !== '' && item.name !== 'اسم الصنف' && item.code !== 'كود الصنف')
      .filter(item => {
        if (isRestrictedUser && userAuthorizedDepts.length > 0 && !userAuthorizedDepts.includes(normalizeCategory(item.category))) {
          return false;
        }
        return true;
      });
  }, [items, isRestrictedUser, userAuthorizedDepts]);

  const metrics = useMemo(() => {
    return calculateInventoryMetrics(scopedItems, disbursements, filterMonth);
  }, [scopedItems, disbursements, filterMonth]);

  // Backward compatibility alias for any component expecting processedItems
  const processedItems = useMemo(() => {
    return [
      ...metrics.severeShortagesList,
      ...metrics.normalLowList,
      ...metrics.outOfStockList,
      ...metrics.stagnantList,
      ...metrics.activeList
    ];
  }, [metrics]);

  // ──── Calculate BI Chart Data (Matching Dashboard Exact Logic & Colors) ────
  const chartData = useMemo(() => {
    const pieData = [
      { name: t('reports.tabActive'), value: metrics.activeCount, color: '#10b981', type: 'ACTIVE' as ReportType },
      { name: t('reports.tabStagnant'), value: metrics.stagnantCount, color: '#3b82f6', type: 'STAGNANT' as ReportType },
      { name: t('reports.tabNormal'), value: metrics.normalCount, color: '#eab308', type: 'NORMAL' as ReportType },
      { name: t('reports.tabCritical'), value: metrics.severeCount, color: '#ea580c', type: 'CRITICAL' as ReportType },
      { name: t('reports.tabOutOfStock'), value: metrics.outOfStockCount, color: '#64748b', type: 'OUT_OF_STOCK' as ReportType },
      { name: t('reports.tabAssets'), value: metrics.assetsCount, color: '#8b5cf6', type: 'ASSETS' as ReportType },
    ].filter(d => d.value > 0);

    const sourceData = chartViewMode === 'ITEMS_COUNT' ? metrics.categoryItemCounts : metrics.categoryConsumption;
    const barData = Object.entries(sourceData)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 10);

    const BAR_COLORS = [
      '#099A75', '#3b82f6', '#10b981', '#8b5cf6', 
      '#f59e0b', '#ec4899', '#06b6d4', '#14b8a6',
      '#6366f1', '#84cc16'
    ];

    const barLegendPayload = barData.map((entry, index) => ({
      id: entry.name,
      type: 'square' as const,
      value: entry.name,
      val: entry.val,
      color: BAR_COLORS[index % BAR_COLORS.length]
    }));

    return { 
      pieData, 
      barData, 
      BAR_COLORS, 
      barLegendPayload,
      counts: { 
        severeCount: metrics.severeCount, 
        normalCount: metrics.normalCount, 
        outOfStockCount: metrics.outOfStockCount, 
        stagnantCount: metrics.stagnantCount, 
        activeCount: metrics.activeCount,
        assetsCount: metrics.assetsCount
      } 
    };
  }, [metrics, chartViewMode, t]);

  // ──── Custom Pie Legend (Matching Dashboard) ────
  const CustomPieLegend = () => {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '0.5rem', 
        padding: '0.5rem 0',
        width: '100%'
      }}>
        {chartData.pieData.map((entry) => {
          const isSelected = activeReport === entry.type;
          return (
            <div 
              key={entry.name} 
              onClick={() => { setActiveReport(entry.type); setSelectedDeptFilter('all'); }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? `1px solid ${entry.color}` : '1px solid var(--border-light)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 10, height: 10, backgroundColor: entry.color, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }}></span>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>{entry.name}</span>
              </div>
              <span style={{ 
                background: `${entry.color}20`, 
                color: entry.color, 
                padding: '0.15rem 0.5rem', 
                borderRadius: '6px', 
                fontSize: '0.78rem', 
                fontWeight: 800,
                fontFamily: 'monospace'
              }}>
                {entry.value} {language === 'ar' ? 'صنف' : 'items'}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ──── Custom Bar Legend ────
  const CustomBarLegend = () => {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '0.5rem', 
        padding: '0.5rem 0',
        width: '100%'
      }}>
        {chartData.barLegendPayload.map((entry, index) => (
          <div 
            key={`bar-${index}`} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-light)',
              fontSize: '0.85rem' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              <span style={{ width: 10, height: 10, backgroundColor: entry.color, borderRadius: '3px', display: 'inline-block', flexShrink: 0 }}></span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{entry.value}</span>
            </div>
            <span style={{ 
              background: 'rgba(9, 154, 117, 0.12)', 
              color: '#099A75', 
              padding: '0.15rem 0.5rem', 
              borderRadius: '6px', 
              fontSize: '0.78rem', 
              fontWeight: 800,
              fontFamily: 'monospace',
              flexShrink: 0,
              marginInlineStart: '0.5rem'
            }}>
              {entry.val.toLocaleString()} {chartViewMode === 'ITEMS_COUNT' ? (language === 'ar' ? 'صنف' : 'items') : (language === 'ar' ? 'وحدة' : 'units')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ──── Apply Report Filter ────
  const reportData = useMemo(() => {
    let list: any[] = [];
    switch (activeReport) {
      case 'CRITICAL':
        list = [...metrics.severeShortagesList];
        list.sort((a, b) => (b.qtyLast60 || 0) - (a.qtyLast60 || 0));
        break;
      case 'NORMAL':
        list = [...metrics.normalLowList];
        list.sort((a, b) => (a.stock || 0) - (b.stock || 0));
        break;
      case 'OUT_OF_STOCK':
        list = [...metrics.outOfStockList];
        list.sort((a, b) => (b.drawsLast60 || 0) - (a.drawsLast60 || 0));
        break;
      case 'STAGNANT':
        list = [...metrics.stagnantList];
        list.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        break;
      case 'ACTIVE':
        list = [...metrics.activeList];
        list.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        break;
      case 'ASSETS':
        list = [...metrics.assetsList];
        list.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        break;
      case 'TOP':
        list = [...scopedItems];
        list.sort((a, b) => (b.qtyLast60 || b.totalOut || 0) - (a.qtyLast60 || a.totalOut || 0));
        break;
      default:
        list = [...scopedItems];
    }
    return list;
  }, [metrics, activeReport, scopedItems]);

  // Category Icons & Badges
  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('كهرب')) return <Zap size={16} color="#f59e0b" />;
    if (c.includes('سباك') || c.includes('صحية')) return <Wrench size={16} color="#06b6d4" />;
    if (c.includes('ري')) return <Droplets size={16} color="#10b981" />;
    if (c.includes('سباح')) return <Layers size={16} color="#3b82f6" />;
    if (c.includes('نقاش')) return <Sparkles size={16} color="#ec4899" />;
    if (c.includes('نجار')) return <Hammer size={16} color="#d97706" />;
    if (c.includes('نظاف')) return <Sparkles size={16} color="#14b8a6" />;
    return <LayoutGrid size={16} color="#099A75" />;
  };

  // Master Matrix Breakdown by Department
  const matrixData = useMemo(() => {
    const categoriesSet = new Set<string>();
    scopedItems.forEach(i => categoriesSet.add(i.category || 'عام'));
    const allCategories = Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, 'ar'));

    const criticalSet = new Set(metrics.severeShortagesList.map(i => i.id));
    const normalSet = new Set(metrics.normalLowList.map(i => i.id));
    const outSet = new Set(metrics.outOfStockList.map(i => i.id));
    const stagnantSet = new Set(metrics.stagnantList.map(i => i.id));
    const activeSet = new Set(metrics.activeList.map(i => i.id));
    const assetSet = new Set(metrics.assetsList.map(i => i.id));

    return allCategories.map(cat => {
      const catItems = scopedItems.filter(i => (i.category || 'عام') === cat);
      return {
        category: cat,
        total: catItems.length,
        critical: catItems.filter(i => criticalSet.has(i.id)).length,
        normal: catItems.filter(i => normalSet.has(i.id)).length,
        outOfStock: catItems.filter(i => outSet.has(i.id)).length,
        stagnant: catItems.filter(i => stagnantSet.has(i.id)).length,
        active: catItems.filter(i => activeSet.has(i.id)).length,
        assets: catItems.filter(i => assetSet.has(i.id)).length,
      };
    }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  }, [scopedItems, metrics]);

  // Counts of each category present in the currently selected report
  const categoryCountsInReport = useMemo(() => {
    const counts: Record<string, number> = {};
    reportData.forEach(item => {
      const c = item.category || 'عام';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [reportData]);

  // Grouped report data for the active report
  const groupedReportData = useMemo(() => {
    const filtered = selectedDeptFilter === 'all'
      ? reportData
      : reportData.filter(item => (item.category || 'عام') === selectedDeptFilter);

    const map: Record<string, typeof reportData> = {};
    filtered.forEach(item => {
      const cat = item.category || 'عام';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });

    return Object.entries(map).map(([cat, catItems]) => {
      const totalStock = catItems.reduce((acc, curr) => acc + (curr.stock || 0), 0);
      const zeroCount = catItems.filter(i => (i.stock || 0) <= 0).length;
      const totalConsumption = catItems.reduce((acc, curr) => acc + (curr.totalOut || 0), 0);
      return {
        category: cat,
        items: catItems,
        totalStock,
        zeroCount,
        totalConsumption
      };
    }).sort((a, b) => b.items.length - a.items.length);
  }, [reportData, selectedDeptFilter]);

  const dataToPrint = useMemo(() => {
    if (printMode === 'ALL') {
      return (isAdmin || isManagement || !isRestrictedUser) 
        ? scopedItems 
        : (userAuthorizedDepts.length > 0 
            ? scopedItems.filter(item => userAuthorizedDepts.includes(normalizeCategory(item.category || '')))
            : scopedItems
          );
    }
    return reportData;
  }, [printMode, scopedItems, reportData, isAdmin, isManagement, isRestrictedUser, userAuthorizedDepts]);

  const printGroupedData = useMemo(() => {
    const map: Record<string, typeof dataToPrint> = {};
    dataToPrint.forEach(item => {
      const c = item.category || 'عام';
      if (!map[c]) map[c] = [];
      map[c].push(item);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], 'ar'));
  }, [dataToPrint]);

  const getReportTitle = (type: ReportType | 'ALL') => {
    switch (type) {
      case 'CRITICAL': return t('reports.tabCritical');
      case 'NORMAL': return t('reports.tabNormal');
      case 'OUT_OF_STOCK': return t('reports.tabOutOfStock');
      case 'STAGNANT': return t('reports.tabStagnant');
      case 'ACTIVE': return t('reports.tabActive');
      case 'ASSETS': return t('reports.tabAssets');
      case 'TOP': return t('reports.tabTop');
      case 'ALL': return language === 'ar' ? 'تقرير الأرصدة الشامل (كافة الأصناف)' : 'Full Inventory Report (All Items)';
      default: return t('reports.title');
    }
  };

  // Export to Excel for Current Active Report Tab
  const handleExport = async () => {
    try {
      const isAssetsTab = activeReport === 'ASSETS';
      const exportCols = [
        { header: '#', key: 'seq', width: 8 },
        { header: t('common.code'), key: 'code', width: 15 },
        { header: t('common.item'), key: 'name', width: 35 },
        { header: t('common.category'), key: 'category', width: 22 },
        { header: t('common.unit'), key: 'unit', width: 12 },
        { header: t('inventory.currentStock'), key: 'stock', width: 16 },
        { 
          header: isAssetsTab 
            ? (language === 'ar' ? 'سبب الاستثناء / النوع' : 'Exclusion Reason') 
            : (language === 'ar' ? 'حد الطلب (الأمان)' : 'Alert Limit'), 
          key: isAssetsTab ? 'assetReason' : 'alertLimit', 
          width: isAssetsTab ? 32 : 16 
        },
        { header: language === 'ar' ? 'تاريخ آخر صرف' : 'Last Withdrawal Date', key: 'lastDisbursedDate', width: 20 },
        { header: language === 'ar' ? 'الأيام المنقضية' : 'Days Elapsed', key: 'daysSinceDisbText', width: 16 },
        { header: language === 'ar' ? 'مرات السحب (آخر 60 يوم)' : '60d Draws Count', key: 'drawsLast60', width: 20 },
        { header: t('reports.totalOutConsumption'), key: 'totalOut', width: 18 }
      ];

      // Group active report items by department
      const categoryMap = new Map<string, typeof reportData>();
      reportData.forEach(item => {
        const cat = item.category || (language === 'ar' ? 'عام' : 'General');
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat)!.push(item);
      });

      const exportRows: any[] = [];
      let globalSeq = 1;

      categoryMap.forEach((itemsInCat, catName) => {
        const catStock = itemsInCat.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
        const catOut = itemsInCat.reduce((sum, i) => sum + (Number(i.totalOut) || 0), 0);

        exportRows.push({
          _isGroupHeader: true,
          groupTitle: `📁 قسم: ${catName} — [إجمالي: ${itemsInCat.length} صنف • رصيد متوفر: ${catStock.toLocaleString('ar-EG')} • منصرف: ${catOut.toLocaleString('ar-EG')}]`
        });

        itemsInCat.forEach(item => {
          exportRows.push({
            seq: globalSeq++,
            code: item.code,
            name: item.name,
            category: item.category,
            unit: item.unit,
            stock: item.stock || 0,
            alertLimit: item.alertLimit || 10,
            assetReason: item.assetReason || (language === 'ar' ? 'أصل تشغيلي بالطلب' : 'On-Demand Asset'),
            lastDisbursedDate: item.lastDisbursedDate || (language === 'ar' ? 'لا يوجد صرف مسجل' : 'None'),
            daysSinceDisbText: item.daysSinceLastDisb !== undefined && item.daysSinceLastDisb < 999 
              ? (language === 'ar' ? `${item.daysSinceLastDisb} يوم` : `${item.daysSinceLastDisb}d`)
              : (language === 'ar' ? 'غير مسجل' : 'N/A'),
            drawsLast60: item.drawsLast60 || 0,
            qtyLast60: item.qtyLast60 || 0,
            totalOut: item.totalOut || 0
          });
        });
      });

      const filterSuffix = selectedDeptFilter !== 'all' ? ` - قسم (${selectedDeptFilter})` : '';
      await exportToExcel(
        `${t('reports.title')} - ${getReportTitle(activeReport)}${filterSuffix} (مصنف ومبوب بالأقسام)`,
        `Report_${activeReport}`,
        exportCols,
        exportRows,
        `Report_${activeReport}_${selectedDeptFilter === 'all' ? 'All_Depts' : selectedDeptFilter}`
      );
      toast.success(language === 'ar' ? 'تم تصدير التقرير الحالي بنجاح ومبوباً لكل قسم ✅' : 'Current report exported successfully ✅');
    } catch (error) {
      console.error('Export Error:', error);
      toast.error(t('alerts.error'));
    }
  };

  // Export Full Master Workbook (All Reports in Dedicated Sheets & Departmentally Classified)
  const handleExportComprehensive = async () => {
    try {
      const getSheetCols = (isAsset = false) => [
        { header: '#', key: 'seq', width: 8 },
        { header: t('common.code'), key: 'code', width: 15 },
        { header: t('common.item'), key: 'name', width: 36 },
        { header: t('common.category'), key: 'category', width: 24 },
        { header: t('common.unit'), key: 'unit', width: 12 },
        { header: t('inventory.currentStock'), key: 'stock', width: 16 },
        { 
          header: isAsset ? (language === 'ar' ? 'سبب الاستثناء' : 'Reason') : (language === 'ar' ? 'حد الطلب' : 'Alert Limit'), 
          key: isAsset ? 'assetReason' : 'alertLimit', 
          width: isAsset ? 30 : 15 
        },
        { header: language === 'ar' ? 'تاريخ آخر صرف' : 'Last Out Date', key: 'lastDisbursedDate', width: 18 },
        { header: language === 'ar' ? 'الأيام المنقضية' : 'Days Elapsed', key: 'daysSinceDisbText', width: 16 },
        { header: language === 'ar' ? 'إجمالي المنصرف' : 'Total Out', key: 'totalOut', width: 16 }
      ];

      const formatRows = (rawList: any[], isAsset = false) => {
        const catMap = new Map<string, any[]>();
        rawList.forEach(item => {
          const cat = item.category || (language === 'ar' ? 'عام' : 'General');
          if (!catMap.has(cat)) catMap.set(cat, []);
          catMap.get(cat)!.push(item);
        });

        const rows: any[] = [];
        let seq = 1;
        const sortedCats = Array.from(catMap.keys()).sort((a, b) => a.localeCompare(b, 'ar'));

        sortedCats.forEach(catName => {
          const itemsInCat = catMap.get(catName)!;
          const totalStock = itemsInCat.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
          const totalOut = itemsInCat.reduce((sum, i) => sum + (Number(i.totalOut) || 0), 0);

          rows.push({
            _isGroupHeader: true,
            groupTitle: `📁 قسم: ${catName} — [إجمالي: ${itemsInCat.length} صنف • رصيد متوفر: ${totalStock.toLocaleString('ar-EG')} • منصرف: ${totalOut.toLocaleString('ar-EG')}]`
          });

          itemsInCat.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));

          itemsInCat.forEach(item => {
            rows.push({
              seq: seq++,
              code: item.code,
              name: item.name,
              category: item.category,
              unit: item.unit,
              stock: item.stock || 0,
              alertLimit: item.alertLimit || 10,
              assetReason: item.assetReason || (language === 'ar' ? 'أصل تشغيلي بالطلب' : 'On-Demand Asset'),
              lastDisbursedDate: item.lastDisbursedDate || (language === 'ar' ? 'لا يوجد صرف مسجل' : 'None'),
              daysSinceDisbText: item.daysSinceLastDisb !== undefined && item.daysSinceLastDisb < 999 
                ? (language === 'ar' ? `${item.daysSinceLastDisb} يوم` : `${item.daysSinceLastDisb}d`)
                : (language === 'ar' ? 'غير مسجل' : 'N/A'),
              totalOut: item.totalOut || 0
            });
          });
        });
        return rows;
      };

      const topConsumedList = [...scopedItems]
        .filter(i => (i.totalOut || 0) > 0 || ((i as any).qtyLast60 || 0) > 0)
        .sort((a, b) => (((b as any).qtyLast60 || b.totalOut || 0) - ((a as any).qtyLast60 || a.totalOut || 0)));

      const formatFullInventoryRows = (rawList: any[]) => {
        const catMap = new Map<string, any[]>();
        rawList.forEach(item => {
          const cat = item.category || (language === 'ar' ? 'عام' : 'General');
          if (!catMap.has(cat)) catMap.set(cat, []);
          catMap.get(cat)!.push(item);
        });

        const rows: any[] = [];
        let seq = 1;
        const sortedCats = Array.from(catMap.keys()).sort((a, b) => a.localeCompare(b, 'ar'));

        sortedCats.forEach(catName => {
          const itemsInCat = catMap.get(catName)!;
          const catStock = itemsInCat.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
          const catOut = itemsInCat.reduce((sum, i) => sum + (Number(i.totalOut) || 0), 0);
          const catZero = itemsInCat.filter(i => (Number(i.stock) || 0) <= 0).length;
          const catLow = itemsInCat.filter(i => (Number(i.stock) || 0) > 0 && (Number(i.stock) || 0) <= (i.alertLimit || 10)).length;

          rows.push({
            _isGroupHeader: true,
            groupTitle: `📁 قسم: ${catName} — [إجمالي: ${itemsInCat.length} صنف • رصيد متوفر: ${catStock.toLocaleString('ar-EG')} • إجمالي منصرف: ${catOut.toLocaleString('ar-EG')}${catZero + catLow > 0 ? ` • نواقص: ${catZero + catLow}` : ''}]`
          });

          itemsInCat.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));

          itemsInCat.forEach(item => {
            const stock = Number(item.stock) || 0;
            const statusText = stock <= 0 
              ? (language === 'ar' ? 'منتهي (رصيد صفر)' : 'Out of Stock') 
              : stock <= (item.alertLimit || 10) 
              ? (language === 'ar' ? 'منخفض (تحت الأمان)' : 'Low Stock') 
              : (language === 'ar' ? 'آمن ومستقر' : 'Safe');

            rows.push({
              seq: seq++,
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
        return rows;
      };

      const fullInvCols = [
        { header: '#', key: 'seq', width: 8 },
        { header: t('common.code'), key: 'code', width: 15 },
        { header: t('common.item'), key: 'name', width: 36 },
        { header: t('common.category'), key: 'category', width: 24 },
        { header: t('common.unit'), key: 'unit', width: 12 },
        { header: language === 'ar' ? 'رصيد أول المدة' : 'Opening', key: 'openingBalance', width: 16 },
        { header: language === 'ar' ? 'إجمالي الوارد' : 'Total In', key: 'totalIn', width: 16 },
        { header: language === 'ar' ? 'إجمالي المنصرف' : 'Total Out', key: 'totalOut', width: 16 },
        { header: t('inventory.currentStock'), key: 'stock', width: 18 },
        { header: language === 'ar' ? 'الحالة التشغيلية' : 'Status', key: 'status', width: 18 }
      ];

      const sheets = [
        {
          sheetName: language === 'ar' ? 'مصفوفة الحصر' : 'Summary Matrix',
          title: language === 'ar' ? 'مصفوفة حصر وتوزيع الأرصدة الشاملة حسب الأقسام' : 'Inventory Department Summary Matrix',
          columns: [
            { header: '#', key: 'seq', width: 8 },
            { header: language === 'ar' ? 'القسم / الفئة' : 'Department', key: 'category', width: 28 },
            { header: language === 'ar' ? 'إجمالي الأصناف' : 'Total Items', key: 'total', width: 15 },
            { header: language === 'ar' ? 'نقص حرج' : 'Critical', key: 'critical', width: 14 },
            { header: language === 'ar' ? 'رصيد صفر' : 'Zero Stock', key: 'outOfStock', width: 14 },
            { header: language === 'ar' ? 'نقص عادي' : 'Normal Low', key: 'normal', width: 14 },
            { header: language === 'ar' ? 'الرواكد' : 'Stagnant', key: 'stagnant', width: 14 },
            { header: language === 'ar' ? 'أصناف نشطة' : 'Active', key: 'active', width: 14 },
            { header: language === 'ar' ? 'أصول بالطلب' : 'Assets', key: 'assets', width: 14 }
          ],
          data: matrixData.map((dept, idx) => ({
            seq: idx + 1,
            category: dept.category,
            total: dept.total,
            critical: dept.critical,
            outOfStock: dept.outOfStock,
            normal: dept.normal,
            stagnant: dept.stagnant,
            active: dept.active,
            assets: dept.assets
          }))
        },
        {
          sheetName: language === 'ar' ? 'نقص حرج' : 'Critical Shortages',
          title: language === 'ar' ? 'تقرير النواقص الحرجة (رصيد < 10 مع سحب نشط مستمر) - مصنف بالأقسام' : 'Critical Shortages Report',
          columns: getSheetCols(false),
          data: formatRows(metrics.severeShortagesList)
        },
        {
          sheetName: language === 'ar' ? 'رصيد منتهي صفر' : 'Out of Stock Zero',
          title: language === 'ar' ? 'تقرير الأصناف منتهية الرصيد (رصيد = 0 بدون سحب مستمر) - مصنف بالأقسام' : 'Out of Stock Items',
          columns: getSheetCols(false),
          data: formatRows(metrics.outOfStockList)
        },
        {
          sheetName: language === 'ar' ? 'نقص عادي' : 'Regular Shortages',
          title: language === 'ar' ? 'تقرير النواقص العادية (رصيد 1 - 9 بدون سحب مستمر) - مصنف بالأقسام' : 'Regular Low Stock Report',
          columns: getSheetCols(false),
          data: formatRows(metrics.normalLowList)
        },
        {
          sheetName: language === 'ar' ? 'الرواكد' : 'Stagnant Stock',
          title: language === 'ar' ? 'تقرير الرواكد (رصيد >= 10 وبدون حركة من 3 إلى 6 شهور) - مصنف بالأقسام' : 'Stagnant Stock Report',
          columns: getSheetCols(false),
          data: formatRows(metrics.stagnantList)
        },
        {
          sheetName: language === 'ar' ? 'أصناف نشطة' : 'Active Items',
          title: language === 'ar' ? 'تقرير الأصناف النشطة والصحية (رصيد كافٍ مع حركة منتظمة) - مصنف بالأقسام' : 'Active Healthy Items Report',
          columns: getSheetCols(false),
          data: formatRows(metrics.activeList)
        },
        {
          sheetName: language === 'ar' ? 'الأكثر استهلاكاً' : 'Top Outflow',
          title: language === 'ar' ? 'تقرير الأصناف الأكثر استهلاكاً وسحباً من المخزن - مصنف بالأقسام' : 'Top Outflow Items Report',
          columns: getSheetCols(false),
          data: formatRows(topConsumedList)
        },
        {
          sheetName: language === 'ar' ? 'أصول ومعدات بالطلب' : 'On-Demand Assets',
          title: language === 'ar' ? 'سجل الأصول والمعدات الاستراتيجية المستثناة (توريد بالطلب الخاص) - مصنف بالأقسام' : 'Excluded Assets & Equipment',
          columns: getSheetCols(true),
          data: formatRows(metrics.assetsList, true)
        },
        {
          sheetName: language === 'ar' ? 'الجرد العام للأصناف' : 'All Items Inventory',
          title: language === 'ar' ? 'تقرير الجرد العام الشامل للأرصدة لكافة الأصناف - مصنف ومبوب بالأقسام' : 'Full Inventory Report',
          columns: fullInvCols,
          data: formatFullInventoryRows(scopedItems)
        }
      ];

      await exportMultiSheetExcel(sheets, 'Stockly_WMS_Master_Inventory_All_Reports');
      toast.success(language === 'ar' ? 'تم تصدير المصنف الشامل بنجاح: تم إنشاء 9 شيتات مستقلة ومبوبة لكل قسم ✅' : 'Master workbook exported with 9 classified sheets ✅');
    } catch (error) {
      console.error('Master Export Error:', error);
      toast.error(t('alerts.error'));
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* ──── SCREEN CONTROLS & HEADER ──── */}
      <div className="hide-on-print">
        
        {/* Page Header */}
        <header className="dashboard-header flex-between enterprise-card" style={{ padding: '1.5rem 2rem', marginBottom: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{t('reports.title')}</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>{t('reports.subtitle')}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link 
              href="/purchase-requisition"
              className="btn btn-outline"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                borderColor: '#f59e0b', 
                color: '#f59e0b',
                fontWeight: 600
              }}
            >
              <ShoppingCart size={18} />
              <span>{t('reports.quickShortageOrder')}</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-panel)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <label style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('reports.timeRange')}</label>
              <input 
                type="month" 
                className="input-field" 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
                style={{ width: '160px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              />
              <button 
                className={`btn ${filterMonth === '' ? 'btn-primary' : 'btn-outline'}`} 
                onClick={() => setFilterMonth('')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {t('reports.last3Months')}
              </button>
            </div>
            
            <button 
              onClick={() => { setPrintMode('ALL'); setTimeout(() => window.print(), 100); }}
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title={t('reports.printAllTooltip')}
            >
              <Printer size={18} />
              <span>{t('reports.printAll')}</span>
            </button>
            
            <button 
              onClick={() => { setPrintMode('CURRENT'); setTimeout(() => window.print(), 100); }}
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
            >
              <Printer size={18} />
              <span>{t('reports.printCurrent')}</span>
            </button>

            {/* Primary Master Export All Reports Button */}
            <button 
              onClick={handleExportComprehensive}
              className="btn" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.6rem', 
                background: 'linear-gradient(135deg, #099A75 0%, #065F46 100%)', 
                color: '#ffffff', 
                fontWeight: 800, 
                boxShadow: '0 4px 14px rgba(9, 154, 117, 0.35)',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title={language === 'ar' ? 'تصدير مصنف إكسيل شامل يضم كافة التقارير الـ 9 في صفحات مستقلة ومبوبة لكل قسم' : 'Export multi-sheet master workbook (9 classified sheets)'}
            >
              <Layers size={19} />
              <span>{language === 'ar' ? '📊 تصدير الكل (كافة التقارير إكسيل)' : '📊 Export All Reports (Master)'}</span>
            </button>

            {/* Current Active Tab Export Button */}
            <button 
              onClick={handleExport}
              className="btn btn-outline" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                color: '#099A75', 
                borderColor: '#099A75', 
                fontWeight: 700,
                background: 'rgba(9, 154, 117, 0.06)',
                padding: '0.65rem 1.15rem',
                borderRadius: '8px'
              }}
              disabled={reportData.length === 0}
              title={language === 'ar' ? `تصدير تقرير (${getReportTitle(activeReport)}) الحالي إكسيل مبوباً لكل قسم` : `Export current report (${getReportTitle(activeReport)}) to Excel`}
            >
              <FileSpreadsheet size={18} />
              <span>{language === 'ar' ? `📄 تصدير تقرير (${getReportTitle(activeReport)})` : `📄 Export (${getReportTitle(activeReport)})`}</span>
            </button>
          </div>
        </header>

        {/* ──── SPACIOUS HIGH-RESOLUTION CHARTS ──── */}
        <div className="reports-charts-grid" style={{ display: 'grid', gap: '1.75rem', marginBottom: '2rem' }}>
          
          {/* 1. Stock Health Donut Chart (Matching Dashboard Colors) */}
          <div className="enterprise-card" style={{ padding: '1.75rem', minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
            <h2 className="heading-md" style={{ margin: '0 0 1.25rem 0', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', textAlign: 'center' }}>
              {t('reports.stockDistribution')}
            </h2>
            
            <div className="reports-donut-container" style={{ display: 'grid', alignItems: 'center', flex: 1, gap: '1rem' }}>
              <div style={{ width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.pieData.map((entry, index) => (
                        <Cell key={`donut-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid rgba(255, 255, 255, 0.15)', 
                        borderRadius: '10px', 
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                        padding: '0.65rem 0.95rem',
                        direction: 'rtl',
                        textAlign: 'right'
                      }}
                      labelStyle={{ color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.25rem' }}
                      itemStyle={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}
                      formatter={(val: any) => [`${val} ${t('reports.itemCount')}`, t('reports.count')]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Spacious Matching Dashboard Legend */}
              <CustomPieLegend />
            </div>
          </div>

          {/* 2. Category Distribution Bar Chart */}
          <div className="enterprise-card" style={{ padding: '1.75rem', minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                {t('reports.categoryDist')}
              </h2>

              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-panel)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                <button
                  onClick={() => setChartViewMode('ITEMS_COUNT')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: chartViewMode === 'ITEMS_COUNT' ? 'var(--accent-primary)' : 'transparent',
                    color: chartViewMode === 'ITEMS_COUNT' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {language === 'ar' ? 'عدد الأصناف' : 'Item Count'}
                </button>
                <button
                  onClick={() => setChartViewMode('CONSUMPTION')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: chartViewMode === 'CONSUMPTION' ? 'var(--accent-primary)' : 'transparent',
                    color: chartViewMode === 'CONSUMPTION' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {language === 'ar' ? 'معدل الاستهلاك' : 'Outflow'}
                </button>
              </div>
            </div>

            <div className="reports-donut-container" style={{ display: 'grid', alignItems: 'center', flex: 1, gap: '1rem' }}>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.barData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.08} vertical={false} />
                    <XAxis dataKey="name" tick={false} tickLine={false} axisLine={{ stroke: 'var(--border-light)' }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-light)' }} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(9, 154, 117, 0.08)', radius: 6 }}
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid rgba(255, 255, 255, 0.15)', 
                        borderRadius: '10px', 
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                        padding: '0.65rem 0.95rem',
                        direction: 'rtl',
                        textAlign: 'right'
                      }}
                      labelStyle={{ color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.25rem' }}
                      itemStyle={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}
                      formatter={(val: any) => [`${val.toLocaleString()} ${chartViewMode === 'ITEMS_COUNT' ? (language === 'ar' ? 'صنف' : 'items') : (language === 'ar' ? 'وحدة' : 'units')}`, chartViewMode === 'ITEMS_COUNT' ? (language === 'ar' ? 'عدد الأصناف' : 'Count') : (language === 'ar' ? 'معدل الاستهلاك' : 'Draws')]}
                    />
                    <Bar dataKey="val" radius={[4, 4, 0, 0]} barSize={24}>
                      {chartData.barData.map((_, index) => (
                        <Cell key={`bar-spacious-${index}`} fill={chartData.BAR_COLORS[index % chartData.BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Spacious Category Legend without scrollbar */}
              <CustomBarLegend />
            </div>
          </div>

        </div>

        {/* ──── MASTER MATRIX OVERVIEW (Collapsible Department Breakdown) ──── */}
        <div className="enterprise-card hide-on-print" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap', gap: '0.75rem' }}
            onClick={() => setShowMatrixOverview(!showMatrixOverview)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(9, 154, 117, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#099A75' }}>
                <FolderTree size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {language === 'ar' ? 'جدول حصر وتوزيع الأصناف والتقارير بالأقسام (نظرة شاملة)' : 'Departmental Inventory & Status Matrix'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {language === 'ar' ? 'انقر على رقم أي خلية لفتح التقرير وفلترة القسم مباشرة' : 'Click any cell to open the report tab and category'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem', borderRadius: '12px', background: 'rgba(9, 154, 117, 0.1)', color: '#099A75', fontWeight: 700 }}>
                {scopedItems.length} {language === 'ar' ? 'صنفاً إجمالياً' : 'total items'}
              </span>
              <button 
                type="button"
                className="btn btn-outline" 
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {showMatrixOverview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span>{showMatrixOverview ? (language === 'ar' ? 'طي الجدول' : 'Collapse') : (language === 'ar' ? 'عرض الجدول' : 'Expand')}</span>
              </button>
            </div>
          </div>

          {showMatrixOverview && (
            <div className="table-container" style={{ marginTop: '1.25rem', overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
              <table className="wms-table reports-matrix-table" style={{ width: '100%', minWidth: '780px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ textAlign: language === 'ar' ? 'right' : 'left', width: '220px' }}>{language === 'ar' ? 'القسم / التخصص' : 'Department'}</th>
                    <th style={{ color: '#ea580c' }}>{language === 'ar' ? 'نقص حرج' : 'Critical'}</th>
                    <th style={{ color: '#eab308' }}>{language === 'ar' ? 'نقص عادي (1-9)' : 'Normal Low'}</th>
                    <th style={{ color: '#64748b' }}>{language === 'ar' ? 'رصيد صفر' : 'Out of Stock'}</th>
                    <th style={{ color: '#3b82f6' }}>{language === 'ar' ? 'رواكد' : 'Stagnant'}</th>
                    <th style={{ color: '#10b981' }}>{language === 'ar' ? 'رصيد كافٍ' : 'Active'}</th>
                    <th style={{ color: '#8b5cf6' }}>{language === 'ar' ? 'أصول بالطلب' : 'Assets'}</th>
                    <th style={{ background: 'rgba(255, 255, 255, 0.04)', fontWeight: 800 }}>{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.map(row => (
                    <tr key={row.category} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ textAlign: language === 'ar' ? 'right' : 'left', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {getCategoryIcon(row.category)}
                          <span>{row.category}</span>
                        </div>
                      </td>

                      {/* Critical */}
                      <td>
                        {row.critical > 0 ? (
                          <span 
                            onClick={() => { setActiveReport('CRITICAL'); setSelectedDeptFilter(row.category); }}
                            style={{ cursor: 'pointer', padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', fontWeight: 700 }}
                            title="انقر لعرض النواقص الحرجة لهذا القسم"
                          >
                            {row.critical}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                      </td>

                      {/* Normal Low */}
                      <td>
                        {row.normal > 0 ? (
                          <span 
                            onClick={() => { setActiveReport('NORMAL'); setSelectedDeptFilter(row.category); }}
                            style={{ cursor: 'pointer', padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.12)', color: '#eab308', fontWeight: 700 }}
                            title="انقر لعرض النواقص العادية لهذا القسم"
                          >
                            {row.normal}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                      </td>

                      {/* Out of stock */}
                      <td>
                        {row.outOfStock > 0 ? (
                          <span 
                            onClick={() => { setActiveReport('OUT_OF_STOCK'); setSelectedDeptFilter(row.category); }}
                            style={{ cursor: 'pointer', padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(100, 116, 139, 0.12)', color: '#94a3b8', fontWeight: 700 }}
                            title="انقر لعرض الأصناف منتهية الرصيد لهذا القسم"
                          >
                            {row.outOfStock}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                      </td>

                      {/* Stagnant */}
                      <td>
                        {row.stagnant > 0 ? (
                          <span 
                            onClick={() => { setActiveReport('STAGNANT'); setSelectedDeptFilter(row.category); }}
                            style={{ cursor: 'pointer', padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', fontWeight: 700 }}
                            title="انقر لعرض رواكد هذا القسم"
                          >
                            {row.stagnant}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                      </td>

                      {/* Active */}
                      <td>
                        {row.active > 0 ? (
                          <span 
                            onClick={() => { setActiveReport('ACTIVE'); setSelectedDeptFilter(row.category); }}
                            style={{ cursor: 'pointer', padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontWeight: 700 }}
                            title="انقر لعرض الأصناف النشطة لهذا القسم"
                          >
                            {row.active}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                      </td>

                      {/* Assets */}
                      <td>
                        {row.assets > 0 ? (
                          <span 
                            onClick={() => { setActiveReport('ASSETS'); setSelectedDeptFilter(row.category); }}
                            style={{ cursor: 'pointer', padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', fontWeight: 700 }}
                            title="انقر لعرض الأصول والمعدات لهذا القسم"
                          >
                            {row.assets}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                      </td>

                      {/* Total */}
                      <td style={{ fontWeight: 800, background: 'rgba(255, 255, 255, 0.02)' }}>
                        <span 
                          onClick={() => setSelectedDeptFilter(row.category)}
                          style={{ cursor: 'pointer', padding: '0.2rem 0.55rem', borderRadius: '6px', color: 'var(--text-primary)' }}
                          title="فلترة التقرير الحالي لهذا القسم"
                        >
                          {row.total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ──── REPORT TABS ──── */}
        <div className="report-tabs hide-on-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button 
            className={`btn ${activeReport === 'CRITICAL' ? '' : 'btn-outline'}`} 
            style={activeReport === 'CRITICAL' ? { background: '#ea580c', color: 'white', borderColor: '#ea580c' } : { color: '#ea580c', borderColor: 'rgba(234, 88, 12, 0.4)' }}
            onClick={() => { setActiveReport('CRITICAL'); setSelectedDeptFilter('all'); }}
          >
            <AlertTriangle size={18} />
            <span>{t('reports.tabCritical')} ({chartData.counts.severeCount})</span>
          </button>

          <button 
            className={`btn ${activeReport === 'NORMAL' ? '' : 'btn-outline'}`} 
            style={activeReport === 'NORMAL' ? { background: '#eab308', color: '#1e293b', borderColor: '#eab308' } : { color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.4)' }}
            onClick={() => { setActiveReport('NORMAL'); setSelectedDeptFilter('all'); }}
          >
            <TrendingDown size={18} />
            <span>{t('reports.tabNormal')} ({chartData.counts.normalCount})</span>
          </button>

          <button 
            className={`btn ${activeReport === 'OUT_OF_STOCK' ? '' : 'btn-outline'}`} 
            style={activeReport === 'OUT_OF_STOCK' ? { background: '#64748b', color: 'white', borderColor: '#64748b' } : { color: '#64748b', borderColor: 'rgba(100, 116, 139, 0.4)' }}
            onClick={() => { setActiveReport('OUT_OF_STOCK'); setSelectedDeptFilter('all'); }}
          >
            <AlertTriangle size={18} />
            <span>{t('reports.tabOutOfStock')} ({chartData.counts.outOfStockCount})</span>
          </button>

          <button 
            className={`btn ${activeReport === 'STAGNANT' ? '' : 'btn-outline'}`} 
            style={activeReport === 'STAGNANT' ? { background: '#3b82f6', color: 'white', borderColor: '#3b82f6' } : { color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.4)' }}
            onClick={() => { setActiveReport('STAGNANT'); setSelectedDeptFilter('all'); }}
          >
            <Clock size={18} />
            <span>{t('reports.tabStagnant')} ({chartData.counts.stagnantCount})</span>
          </button>

          <button 
            className={`btn ${activeReport === 'ACTIVE' ? '' : 'btn-outline'}`} 
            style={activeReport === 'ACTIVE' ? { background: '#10b981', color: 'white', borderColor: '#10b981' } : { color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
            onClick={() => { setActiveReport('ACTIVE'); setSelectedDeptFilter('all'); }}
          >
            <PackageCheck size={18} />
            <span>{t('reports.tabActive')} ({chartData.counts.activeCount})</span>
          </button>

          <button 
            className={`btn ${activeReport === 'ASSETS' ? '' : 'btn-outline'}`} 
            style={activeReport === 'ASSETS' ? { background: '#8b5cf6', color: 'white', borderColor: '#8b5cf6' } : { color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.4)' }}
            onClick={() => { setActiveReport('ASSETS'); setSelectedDeptFilter('all'); }}
          >
            <Layers size={18} />
            <span>{t('reports.tabAssets')} ({chartData.counts.assetsCount})</span>
          </button>

          <button 
            className={`btn ${activeReport === 'TOP' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => { setActiveReport('TOP'); setSelectedDeptFilter('all'); }}
          >
            <Flame size={18} />
            <span>{t('reports.tabTop')}</span>
          </button>
        </div>

      </div>

      {/* ──── REPORT TABLE & PRINT VIEW ──── */}
      <div className="official-document-paper enterprise-card" style={{ padding: '2rem' }}>

        {/* Executive Action Toolbar (Always Visible Above Table) */}
        <div className="hide-on-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem', 
          paddingBottom: '1.25rem', 
          marginBottom: '1.5rem', 
          borderBottom: '1px solid var(--border-color)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: activeReport === 'CRITICAL' ? '#EF4444' : activeReport === 'OUT_OF_STOCK' ? '#DC2626' : activeReport === 'NORMAL' ? '#F59E0B' : activeReport === 'STAGNANT' ? '#3B82F6' : activeReport === 'ASSETS' ? '#8B5CF6' : '#10B981',
              boxShadow: '0 0 8px currentColor'
            }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {getReportTitle(activeReport)}
            </h2>
            <span style={{ 
              background: 'rgba(9, 154, 117, 0.12)', 
              color: '#099A75', 
              padding: '0.2rem 0.65rem', 
              borderRadius: '12px', 
              fontSize: '0.85rem', 
              fontWeight: 800 
            }}>
              {reportData.length} {language === 'ar' ? 'صنف' : 'items'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Master Export All Button */}
            <button 
              onClick={handleExportComprehensive}
              className="btn" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                background: 'linear-gradient(135deg, #099A75 0%, #065F46 100%)', 
                color: '#ffffff', 
                fontWeight: 800, 
                boxShadow: '0 3px 10px rgba(9, 154, 117, 0.3)',
                border: 'none',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
              title={language === 'ar' ? 'تصدير مصنف إكسيل شامل يضم كافة التقارير الـ 9 في صفحات مستقلة ومبوبة لكل قسم' : 'Export multi-sheet master workbook (9 classified sheets)'}
            >
              <Layers size={17} />
              <span>{language === 'ar' ? '📊 تصدير الكل (كافة التقارير إكسيل)' : '📊 Export All Reports (Master)'}</span>
            </button>

            {/* Current Report Export Button */}
            <button 
              onClick={handleExport}
              className="btn btn-outline" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                color: '#099A75', 
                borderColor: '#099A75', 
                fontWeight: 700, 
                background: 'rgba(9, 154, 117, 0.05)',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
              disabled={reportData.length === 0}
              title={language === 'ar' ? `تصدير تقرير (${getReportTitle(activeReport)}) الحالي إكسيل مبوباً بالأقسام` : 'Export current report to Excel'}
            >
              <FileSpreadsheet size={16} />
              <span>{language === 'ar' ? `📄 تصدير تقرير (${getReportTitle(activeReport)})` : `📄 Export (${getReportTitle(activeReport)})`}</span>
            </button>

            {/* Print Current Tab */}
            <button 
              onClick={() => { setPrintMode('CURRENT'); setTimeout(() => window.print(), 100); }}
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, padding: '0.55rem 0.9rem', fontSize: '0.875rem' }}
              title={t('reports.printCurrent')}
            >
              <Printer size={16} />
              <span>{t('common.print')}</span>
            </button>
          </div>
        </div>

        {/* Informative banners for specific operational contexts */}
        {activeReport === 'ASSETS' && (
          <div style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <Layers size={22} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#8b5cf6', display: 'block', fontSize: '1rem', marginBottom: '0.35rem' }}>
                {t('reports.assetsAlertTitle')}
              </strong>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {t('reports.assetsAlertDesc')}
              </p>
            </div>
          </div>
        )}

        {activeReport === 'STAGNANT' && (
          <div style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {language === 'ar' ? 'أصناف ذات أرصدة متوفرة (10 وحدات فأكثر) لم تسجل أي حركة صرف أو إضافة منذ 3 إلى 6 أشهر (90 يوماً فأكثر).' : 'Items with available stock (>= 10 units) that have not moved in 3 to 6 months.'}
            </p>
          </div>
        )}
        
        {loading ? (
          <BrandLoader size="sm" text="جاري تحليل واستخراج بيانات التقرير..." />
        ) : reportData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            {t('reports.noReportData')}
          </div>
        ) : (
          <div>
            {/* Quick Department Filter Pills */}
            <div className="reports-dept-pills hide-on-print" style={{ marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setSelectedDeptFilter('all')}
                className={`btn ${selectedDeptFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: '20px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', gap: '0.4rem' }}
              >
                <LayoutGrid size={14} />
                <span>{language === 'ar' ? 'كافة الأقسام' : 'All Departments'}</span>
                <span style={{ 
                  background: selectedDeptFilter === 'all' ? 'rgba(255,255,255,0.25)' : 'rgba(9, 154, 117, 0.15)', 
                  color: selectedDeptFilter === 'all' ? '#fff' : '#099A75',
                  padding: '0.1rem 0.45rem', 
                  borderRadius: '10px', 
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  {reportData.length}
                </span>
              </button>

              {Object.keys(categoryCountsInReport).sort((a, b) => categoryCountsInReport[b] - categoryCountsInReport[a]).map(cat => {
                const isSelected = selectedDeptFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedDeptFilter(isSelected ? 'all' : cat)}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                    style={{ 
                      borderRadius: '20px', 
                      padding: '0.4rem 0.9rem', 
                      fontSize: '0.8rem', 
                      gap: '0.4rem',
                      borderColor: isSelected ? undefined : 'var(--border-light)'
                    }}
                  >
                    {getCategoryIcon(cat)}
                    <span>{cat}</span>
                    <span style={{ 
                      background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255, 255, 255, 0.08)', 
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      padding: '0.1rem 0.45rem', 
                      borderRadius: '10px', 
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}>
                      {categoryCountsInReport[cat]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Switcher & Summary Bar */}
            <div className="hide-on-print" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '0.75rem', 
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              border: '1px solid var(--border-light)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>
                  {t('reports.totalItemsInReport')}{' '}
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {selectedDeptFilter === 'all' ? reportData.length : groupedReportData.reduce((acc, curr) => acc + curr.items.length, 0)}
                  </strong>{' '}
                  {t('reports.itemCount')}
                </span>
                {selectedDeptFilter !== 'all' && (
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.35rem', 
                    background: 'rgba(9, 154, 117, 0.12)', 
                    color: '#099A75', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '6px', 
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    <span>{selectedDeptFilter}</span>
                    <button 
                      onClick={() => setSelectedDeptFilter('all')} 
                      style={{ background: 'none', border: 'none', color: '#099A75', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title="إلغاء الفلتر"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('grouped')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'grouped' ? 'var(--bg-surface)' : 'transparent',
                      color: viewMode === 'grouped' ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: viewMode === 'grouped' ? 700 : 500,
                      boxShadow: viewMode === 'grouped' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FolderTree size={14} />
                    <span>{language === 'ar' ? 'مفصل بالأقسام' : 'Grouped'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('flat')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'flat' ? 'var(--bg-surface)' : 'transparent',
                      color: viewMode === 'flat' ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: viewMode === 'flat' ? 700 : 500,
                      boxShadow: viewMode === 'flat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <TableIcon size={14} />
                    <span>{language === 'ar' ? 'جدول متصل' : 'Flat Table'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Rendering: Grouped or Flat */}
            {viewMode === 'grouped' ? (
              <div className="reports-grouped-wrapper">
                {groupedReportData.map((group) => {
                  const isCollapsed = collapsedCategories[group.category];
                  return (
                    <div key={group.category} className="reports-category-card">
                      <div 
                        className="reports-category-header"
                        onClick={() => setCollapsedCategories(prev => ({ ...prev, [group.category]: !prev[group.category] }))}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '8px', background: 'rgba(9, 154, 117, 0.12)' }}>
                            {getCategoryIcon(group.category)}
                          </span>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {group.category}
                          </h3>
                          <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', background: 'rgba(9, 154, 117, 0.15)', color: '#099A75', fontSize: '0.8rem', fontWeight: 700 }}>
                            {group.items.length} {language === 'ar' ? 'صنف' : 'items'}
                          </span>
                          <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {language === 'ar' ? `إجمالي الرصيد: ${group.totalStock.toLocaleString()}` : `Total Stock: ${group.totalStock.toLocaleString()}`}
                          </span>
                          {group.zeroCount > 0 && (
                            <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700 }}>
                              {language === 'ar' ? `${group.zeroCount} صنف رصيد صفر` : `${group.zeroCount} out of stock`}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsedCategories(prev => ({ ...prev, [group.category]: !prev[group.category] }));
                            }}
                          >
                            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                            <span className="hide-on-mobile">{isCollapsed ? (language === 'ar' ? 'عرض الأصناف' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}</span>
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="table-container" style={{ margin: 0, borderRadius: 0, borderTop: '1px solid var(--border-light)' }}>
                          <table className="wms-table official-print-table" style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={{ width: '45px', minWidth: '45px', textAlign: 'center' }}>#</th>
                                <th style={{ width: '95px', minWidth: '95px', textAlign: 'center' }}>{t('common.code')}</th>
                                <th style={{ minWidth: '240px', width: '280px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('common.item')}</th>
                                <th style={{ width: '65px', minWidth: '65px', textAlign: 'center' }}>{t('common.unit')}</th>
                                <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', background: 'rgba(9, 154, 117, 0.08)', color: '#099A75', fontWeight: 800 }}>{t('inventory.currentStock')}</th>
                                <th style={{ width: activeReport === 'ASSETS' ? '130px' : '95px', minWidth: activeReport === 'ASSETS' ? '130px' : '95px', textAlign: 'center', color: activeReport === 'ASSETS' ? '#8b5cf6' : '#ea580c' }}>
                                  {activeReport === 'ASSETS' ? (language === 'ar' ? 'نوع الأصل' : 'Asset Type') : (language === 'ar' ? 'حد الطلب' : 'Alert Limit')}
                                </th>
                                <th style={{ width: '120px', minWidth: '120px', textAlign: 'center', color: '#3b82f6' }}>{language === 'ar' ? 'آخر صرف' : 'Last Draw'}</th>
                                <th style={{ width: '115px', minWidth: '115px', textAlign: 'center', color: 'var(--text-primary)' }}>
                                  {activeReport === 'STAGNANT' 
                                    ? (language === 'ar' ? 'أيام الركود' : 'Days Stagnant') 
                                    : activeReport === 'ASSETS' 
                                      ? (language === 'ar' ? 'الأيام المنقضية' : 'Days Elapsed') 
                                      : (language === 'ar' ? 'سحب (60 يوم)' : '60d Draws')}
                                </th>
                                 <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('reports.totalOutConsumption')}</th>
                                 <th className="hide-on-print" style={{ width: '90px', minWidth: '90px', textAlign: 'center' }}>{t('inventory.actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item, index) => (
                                <tr key={item.id}>
                                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                                  <td style={{ fontFamily: 'monospace', fontWeight: 700, textAlign: 'center' }}>
                                    <span 
                                      onClick={() => router.push('/item-ledger')}
                                      style={{ padding: '0.2rem 0.4rem', background: 'rgba(9, 154, 117, 0.1)', color: '#099A75', borderRadius: '4px', cursor: 'pointer' }}
                                      title={t('inventory.viewLedger')}
                                    >
                                      {item.code}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'normal', minWidth: '240px', lineHeight: 1.5 }}>{item.name}</td>
                                  <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.unit}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: item.stock <= 0 ? '#ef4444' : (item.stock <= (item.alertLimit || 10) ? '#ea580c' : '#099A75'), background: 'rgba(9, 154, 117, 0.03)' }}>
                                    {item.stock}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 600, color: activeReport === 'ASSETS' ? '#8b5cf6' : '#ea580c', fontSize: activeReport === 'ASSETS' ? '0.78rem' : '0.875rem' }}>
                                    {activeReport === 'ASSETS' ? (item.assetReason || (language === 'ar' ? 'بالطلب الخاص' : 'On-Demand')) : (item.alertLimit || 10)}
                                  </td>
                                  <td style={{ textAlign: 'center', fontSize: '0.8rem', color: item.lastDisbursedDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {item.lastDisbursedDate && item.lastDisbursedDate !== '—' && item.lastDisbursedDate !== 'None' ? (
                                      <div>
                                        <strong>{item.lastDisbursedDate}</strong>
                                        {item.daysSinceLastDisb !== undefined && item.daysSinceLastDisb < 999 && (
                                          <div style={{ fontSize: '0.72rem', color: item.daysSinceLastDisb <= 30 ? '#10b981' : item.daysSinceLastDisb <= 60 ? '#f59e0b' : '#64748b' }}>
                                            ({language === 'ar' ? `منذ ${item.daysSinceLastDisb} يوم` : `${item.daysSinceLastDisb}d ago`})
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span>—</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 700 }}>
                                    {activeReport === 'STAGNANT' ? (
                                      <span style={{ color: '#3b82f6' }}>
                                        {item.daysSinceLastDisb !== undefined && item.daysSinceLastDisb < 999 ? `${item.daysSinceLastDisb} ${language === 'ar' ? 'يوم' : 'd'}` : (language === 'ar' ? 'بدون حركة' : 'No Movement')}
                                      </span>
                                    ) : activeReport === 'ASSETS' ? (
                                      <span style={{ color: 'var(--text-muted)' }}>
                                        {item.daysSinceLastDisb !== undefined && item.daysSinceLastDisb < 999 ? `${item.daysSinceLastDisb} ${language === 'ar' ? 'يوم' : 'd'}` : '—'}
                                      </span>
                                    ) : item.drawsLast60 > 0 ? (
                                      <span style={{ color: '#099A75' }}>
                                        {item.drawsLast60} مرات ({item.qtyLast60 || 0})
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.totalOut || 0}</td>
                                  <td className="hide-on-print" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    <button
                                      type="button"
                                      onClick={() => router.push('/item-ledger')}
                                      className="btn btn-outline"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                      title={t('inventory.viewLedger')}
                                    >
                                      <History size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingItem(item);
                                        setIsEditModalOpen(true);
                                      }}
                                      className="btn btn-outline"
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        borderColor: '#00f0ff',
                                        color: '#00f0ff',
                                        background: 'rgba(0, 240, 255, 0.08)',
                                        marginRight: language === 'ar' ? '0' : '0.35rem',
                                        marginLeft: language === 'ar' ? '0.35rem' : '0'
                                      }}
                                      title="تعديل وتحديد الرؤية الإدارية والبدائل (مفتاح التحكم 🔧)"
                                    >
                                      <Wrench size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat View */
              <div className="table-container print-no-border">
                <table className="wms-table official-print-table" style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ width: '45px', minWidth: '45px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '95px', minWidth: '95px', textAlign: 'center' }}>{t('common.code')}</th>
                      <th style={{ minWidth: '240px', width: '280px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('common.item')}</th>
                      <th style={{ width: '140px', minWidth: '140px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('common.category')}</th>
                      <th style={{ width: '65px', minWidth: '65px', textAlign: 'center' }}>{t('common.unit')}</th>
                      <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', background: 'rgba(9, 154, 117, 0.08)', color: '#099A75', fontWeight: 800 }}>{t('inventory.currentStock')}</th>
                      <th style={{ width: activeReport === 'ASSETS' ? '130px' : '95px', minWidth: activeReport === 'ASSETS' ? '130px' : '95px', textAlign: 'center', color: activeReport === 'ASSETS' ? '#8b5cf6' : '#ea580c' }}>
                        {activeReport === 'ASSETS' ? (language === 'ar' ? 'نوع الأصل' : 'Asset Type') : (language === 'ar' ? 'حد الطلب' : 'Alert Limit')}
                      </th>
                      <th style={{ width: '120px', minWidth: '120px', textAlign: 'center', color: '#3b82f6' }}>{language === 'ar' ? 'آخر صرف' : 'Last Draw'}</th>
                      <th style={{ width: '115px', minWidth: '115px', textAlign: 'center', color: 'var(--text-primary)' }}>
                        {activeReport === 'STAGNANT' 
                          ? (language === 'ar' ? 'أيام الركود' : 'Days Stagnant') 
                          : activeReport === 'ASSETS' 
                            ? (language === 'ar' ? 'الأيام المنقضية' : 'Days Elapsed') 
                            : (language === 'ar' ? 'سحب (60 يوم)' : '60d Draws')}
                      </th>
                      <th style={{ width: '95px', minWidth: '95px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('reports.totalOutConsumption')}</th>
                      <th className="hide-on-print" style={{ width: '90px', minWidth: '90px', textAlign: 'center' }}>{t('inventory.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDeptFilter === 'all' ? reportData : reportData.filter(i => (i.category || 'عام') === selectedDeptFilter)).map((item, index) => (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, textAlign: 'center' }}>
                          <span 
                            onClick={() => router.push('/item-ledger')}
                            style={{ padding: '0.2rem 0.4rem', background: 'rgba(9, 154, 117, 0.1)', color: '#099A75', borderRadius: '4px', cursor: 'pointer' }}
                            title={t('inventory.viewLedger')}
                          >
                            {item.code}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'normal', minWidth: '240px', lineHeight: 1.5 }}>{item.name}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{item.category}</td>
                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.unit}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: item.stock <= 0 ? '#ef4444' : (item.stock <= (item.alertLimit || 10) ? '#ea580c' : '#099A75'), background: 'rgba(9, 154, 117, 0.03)' }}>
                          {item.stock}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: activeReport === 'ASSETS' ? '#8b5cf6' : '#ea580c', fontSize: activeReport === 'ASSETS' ? '0.78rem' : '0.875rem' }}>
                          {activeReport === 'ASSETS' ? (item.assetReason || (language === 'ar' ? 'بالطلب الخاص' : 'On-Demand')) : (item.alertLimit || 10)}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem', color: item.lastDisbursedDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {item.lastDisbursedDate && item.lastDisbursedDate !== '—' && item.lastDisbursedDate !== 'None' ? (
                            <div>
                              <strong>{item.lastDisbursedDate}</strong>
                              {item.daysSinceLastDisb !== undefined && item.daysSinceLastDisb < 999 && (
                                <div style={{ fontSize: '0.72rem', color: item.daysSinceLastDisb <= 30 ? '#10b981' : item.daysSinceLastDisb <= 60 ? '#f59e0b' : '#64748b' }}>
                                  ({language === 'ar' ? `منذ ${item.daysSinceLastDisb} يوم` : `${item.daysSinceLastDisb}d ago`})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 700 }}>
                          {activeReport === 'STAGNANT' ? (
                            <span style={{ color: '#3b82f6' }}>
                              {item.daysSinceLastDisb !== undefined && item.daysSinceLastDisb < 999 ? `${item.daysSinceLastDisb} ${language === 'ar' ? 'يوم' : 'd'}` : (language === 'ar' ? 'بدون حركة' : 'No Movement')}
                            </span>
                          ) : activeReport === 'ASSETS' ? (
                            <span style={{ color: 'var(--text-muted)' }}>
                              {item.daysSinceLastDisb !== undefined && item.daysSinceLastDisb < 999 ? `${item.daysSinceLastDisb} ${language === 'ar' ? 'يوم' : 'd'}` : '—'}
                            </span>
                          ) : item.drawsLast60 > 0 ? (
                            <span style={{ color: '#099A75' }}>
                              {item.drawsLast60} مرات ({item.qtyLast60 || 0})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.totalOut || 0}</td>
                        <td className="hide-on-print" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => router.push('/item-ledger')}
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title={t('inventory.viewLedger')}
                          >
                            <History size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsEditModalOpen(true);
                            }}
                            className="btn btn-outline"
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              borderColor: '#00f0ff',
                              color: '#00f0ff',
                              background: 'rgba(0, 240, 255, 0.08)',
                              marginRight: language === 'ar' ? '0' : '0.35rem',
                              marginLeft: language === 'ar' ? '0.35rem' : '0'
                            }}
                            title="تعديل وتحديد الرؤية الإدارية والبدائل (مفتاح التحكم 🔧)"
                          >
                            <Wrench size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Print Signatures */}
        <div style={{ marginTop: '3rem' }}>
          <PrintSignatures 
            preparedBy={userData?.name || 'محمد حلمي'} 
            preparedRole={userData?.jobTitle || (language === 'ar' ? 'أمين مخازن ومدير النظام' : 'Warehouse Keeper & Admin')} 
          />
        </div>

      </div>

      {/* ──── PRINT LAYOUT (Hidden on screen) ──── */}
      {printMode && (
        <div className="show-on-print-only official-document-paper" style={{ padding: '0', width: '100%', margin: '0', maxWidth: '100%', boxSizing: 'border-box' }}>
          <PrintHeader 
            title={getReportTitle(printMode === 'ALL' ? 'ALL' : activeReport)}
            subtitle={printMode === 'ALL' ? (language === 'ar' ? 'سجل شامل لجميع الأصناف' : 'Full Inventory Report') : `${t('reports.totalItemsInReport')} ${dataToPrint.length}`}
            category={(isAdmin || isManagement) ? (language === 'ar' ? 'شامل كافة الأقسام' : 'All Departments') : userCategory}
          />
          
          <table className="wms-table official-print-table" style={{ marginTop: '0.75rem', width: '100%', maxWidth: '100%', minWidth: 0, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ width: '40px', textAlign: 'center' }}>م</th>
                <th>{t('common.code')}</th>
                <th>{t('common.item')}</th>
                <th>{t('common.category')}</th>
                <th style={{ textAlign: 'center' }}>{t('inventory.currentStock')}</th>
                <th style={{ textAlign: 'center' }}>{t('common.unit')}</th>
                <th style={{ textAlign: 'center' }}>{t('reports.totalOutConsumption')}</th>
              </tr>
            </thead>
            <tbody>
              {printGroupedData.map(([cat, itemsInCat]) => (
                <React.Fragment key={cat}>
                  <tr style={{ background: '#f1f5f9', fontWeight: 800, color: '#099A75', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={7} style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}>
                      📁 {cat} ({itemsInCat.length} {language === 'ar' ? 'صنف' : 'items'})
                    </td>
                  </tr>
                  {itemsInCat.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item.code}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: item.stock <= 0 ? '#dc2626' : undefined }}>{item.stock}</td>
                      <td style={{ textAlign: 'center' }}>{item.unit}</td>
                      <td style={{ textAlign: 'center' }}>{item.totalOut || 0}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {dataToPrint.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>{t('reports.noReportData')}</td>
                </tr>
              )}
            </tbody>
          </table>

          <PrintSignatures documentTitle="التقرير التحليلي الشامل للمخزون" />
        </div>
      )}

      {/* ──── Managerial Edit Modal ──── */}
      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
      />

    </div>
  );
}
