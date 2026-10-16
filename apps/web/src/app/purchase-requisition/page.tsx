'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ShoppingCart, 
  Printer, 
  FileSpreadsheet, 
  Layers, 
  AlertTriangle, 
  Filter, 
  CheckCircle2, 
  RefreshCw,
  Info,
  Search,
  Zap,
  ShieldAlert,
  SlidersHorizontal,
  PackageCheck
} from 'lucide-react';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import { exportToExcel } from '@/lib/excelExport';
import { normalizeCategory } from '@/types/inventory';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface RequisitionItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  alertLimit: number;
  totalOut: number;
  suggestedQty: number;
  requestedQty: number;
  urgency: 'CRITICAL' | 'HIGH' | 'NORMAL';
  notes: string;
}

type UrgencyFilterType = 'ALL' | 'ZERO_ONLY' | 'LOW_ONLY';
type StrategyType = 'STANDARD' | 'DEMAND';

export default function PurchaseRequisitionPage() {
  const { userData } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilterType>('ALL');
  const [strategy, setStrategy] = useState<StrategyType>('STANDARD');
  const [requisitionNumber, setRequisitionNumber] = useState<string>('');
  const [editableItems, setEditableItems] = useState<Record<string, { qty: number; notes: string }>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Generate Requisition Number on Mount
  useEffect(() => {
    const today = new Date();
    const prefix = `PR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setRequisitionNumber(`${prefix}-${randomSuffix}`);
  }, []);

  // Fetch Items from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'items'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(docs);
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching items for requisition:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ──── Roles & Department Scoping ────
  const cleanEmail = (userData?.email || '').toLowerCase();
  const role = userData?.role || 'user';
  const jobTitle = userData?.jobTitle || '';
  const isAdmin = role === 'admin' || cleanEmail === 'mohamedalghala@gmail.com' || cleanEmail.startsWith('admin');
  const isManagement = role === 'management' || ['PROJECT_MANAGER', 'FACILITY_MANAGER', 'MAINTENANCE_MANAGER', 'FACILITY_TEAM_LEADER'].includes(jobTitle);
  const isSupervisor = role === 'supervisor';

  const rawDepts = userData?.departments || [];
  const isAllDepts = isAdmin || isManagement || rawDepts.length >= 15 || rawDepts.includes('all') || rawDepts.includes('كافة الأقسام') || userData?.category === 'all' || userData?.category === 'كافة الأقسام';
  const isRestrictedUser = !isAllDepts;

  useEffect(() => {
    if (userData && userData.role === 'user') {
      router.replace('/dashboard');
    }
  }, [userData, router]);

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

  // Extract unique categories (Scoped to user permissions)
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const cat = (i.category || '').trim();
      if (!cat) return;
      if (isRestrictedUser && userAuthorizedDepts.length > 0 && !userAuthorizedDepts.includes(normalizeCategory(cat))) return;
      set.add(cat);
    });
    return Array.from(set).sort();
  }, [items, isRestrictedUser, userAuthorizedDepts]);

  // Compute Critical Shortage Items based on Strategy
  const criticalItems: RequisitionItem[] = useMemo(() => {
    return items
      .filter(item => item.name && item.name.trim() !== '')
      .filter(item => {
        if (isRestrictedUser && userAuthorizedDepts.length > 0 && !userAuthorizedDepts.includes(normalizeCategory(item.category))) {
          return false;
        }
        const stock = Number(item.stock) || 0;
        const alertLimit = Number(item.alertLimit) || 10;
        return stock <= alertLimit;
      })
      .map(item => {
        const stock = Number(item.stock) || 0;
        const alertLimit = Number(item.alertLimit) || 10;
        const totalOut = Number(item.totalOut) || 0;
        
        // Strategy Calculation
        let buffer = alertLimit * 2;
        if (strategy === 'DEMAND') {
          buffer = Math.max(alertLimit * 3, Math.ceil(totalOut * 0.25));
        }

        const suggestedQty = Math.max(1, buffer - Math.max(0, stock));
        const hasRecentDemand = item.hasRecentDemand === true || (item.drawsLast60 && item.drawsLast60 > 0);
        const isCritical = (stock <= 0 && hasRecentDemand) || item.classification === 'CRITICAL';
        const urgency: 'CRITICAL' | 'HIGH' | 'NORMAL' = isCritical 
          ? 'CRITICAL' 
          : (stock <= 0 ? 'HIGH' : (hasRecentDemand ? 'HIGH' : 'NORMAL'));

        const custom = editableItems[item.id];
        const requestedQty = custom !== undefined ? custom.qty : suggestedQty;
        const notes = custom !== undefined 
          ? custom.notes 
          : (isCritical 
              ? (language === 'ar' ? `نقص حرج - سحب نشط (${item.drawsLast60 || 1} مرات مؤخراً)` : `Critical Shortage (${item.drawsLast60 || 1} recent draws)`) 
              : (stock <= 0 
                  ? (language === 'ar' ? 'رصيد منتهي بالمخزن' : 'Out of Stock (Zero)') 
                  : (language === 'ar' ? 'أقل من حد الأمان' : 'Below Safety Stock Limit')
                )
            );

        return {
          id: item.id,
          code: item.code || '—',
          name: item.name,
          category: item.category || 'عام',
          unit: item.unit || 'عدد',
          stock,
          alertLimit,
          totalOut,
          suggestedQty,
          requestedQty,
          urgency,
          notes
        };
      });
  }, [items, editableItems, strategy, language, isRestrictedUser, userAuthorizedDepts]);

  // Filtered List
  const filteredList = useMemo(() => {
    return criticalItems.filter(item => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      if (urgencyFilter === 'ZERO_ONLY' && item.stock > 0) {
        return false;
      }

      if (urgencyFilter === 'LOW_ONLY' && (item.stock <= 0 || item.stock > item.alertLimit)) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const codeMatch = item.code.toLowerCase().includes(q);
        const nameMatch = item.name.toLowerCase().includes(q);
        const catMatch = item.category.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !catMatch) return false;
      }

      return true;
    });
  }, [criticalItems, selectedCategory, urgencyFilter, searchTerm]);

  // Overall Metrics
  const stats = useMemo(() => {
    const zeroStockItems = criticalItems.filter(i => i.stock <= 0).length;
    const lowStockItems = criticalItems.filter(i => i.stock > 0 && i.stock <= i.alertLimit).length;
    const totalRequiredQty = filteredList.reduce((acc, item) => acc + (Number(item.requestedQty) || 0), 0);
    const affectedCats = new Set(filteredList.map(i => i.category)).size;

    return { zeroStockItems, lowStockItems, totalRequiredQty, affectedCats };
  }, [criticalItems, filteredList]);

  // Handle Qty change
  const handleQtyChange = (id: string, qty: number) => {
    setEditableItems(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        qty: Math.max(0, qty),
        notes: prev[id]?.notes || ''
      }
    }));
  };

  // Handle Notes change
  const handleNotesChange = (id: string, notes: string) => {
    const currentItem = criticalItems.find(i => i.id === id);
    setEditableItems(prev => ({
      ...prev,
      [id]: {
        qty: prev[id]?.qty !== undefined ? prev[id].qty : (currentItem?.suggestedQty || 1),
        notes
      }
    }));
  };

  // Quick Action: Apply 20% Emergency Buffer
  const handleApplyEmergencyBuffer = () => {
    const updated: Record<string, { qty: number; notes: string }> = {};
    criticalItems.forEach(item => {
      const current = editableItems[item.id];
      const base = current ? current.qty : item.suggestedQty;
      const boosted = Math.ceil(base * 1.2);
      updated[item.id] = {
        qty: boosted,
        notes: current ? current.notes : item.notes
      };
    });
    setEditableItems(updated);
    toast.success(t('purchaseRequisition.bufferApplied'));
  };

  // Reset to auto-suggested quantities
  const handleResetSuggestions = () => {
    setEditableItems({});
    toast.success(t('purchaseRequisition.resetSmart'));
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const exportCols = [
        { header: '#', key: 'seq', width: 8 },
        { header: t('purchaseRequisition.tableCode'), key: 'code', width: 14 },
        { header: t('purchaseRequisition.tableName'), key: 'name', width: 35 },
        { header: t('purchaseRequisition.tableCategory'), key: 'category', width: 22 },
        { header: t('purchaseRequisition.tableUnit'), key: 'unit', width: 12 },
        { header: t('purchaseRequisition.tableCurrentStock'), key: 'stock', width: 15 },
        { header: t('purchaseRequisition.tableAlertLimit'), key: 'alertLimit', width: 14 },
        { header: t('purchaseRequisition.tableTotalOut'), key: 'totalOut', width: 14 },
        { header: t('purchaseRequisition.tableSuggested'), key: 'suggestedQty', width: 16 },
        { header: t('purchaseRequisition.tableRequested'), key: 'requestedQty', width: 18 },
        { header: t('purchaseRequisition.tableNotes'), key: 'notes', width: 35 }
      ];

      const exportRows = filteredList.map((item, index) => ({
        seq: index + 1,
        code: item.code,
        name: item.name,
        category: item.category,
        unit: item.unit,
        stock: item.stock,
        alertLimit: item.alertLimit,
        totalOut: item.totalOut,
        suggestedQty: item.suggestedQty,
        requestedQty: item.requestedQty,
        notes: item.notes
      }));

      await exportToExcel(
        `${t('purchaseRequisition.printHeaderTitle')} - ${requisitionNumber}`,
        'PurchaseRequisition',
        exportCols,
        exportRows,
        `Purchase_Requisition_${requisitionNumber}`
      );
      toast.success(t('alerts.success'));
    } catch (e) {
      console.error("Excel Export Error:", e);
      toast.error(t('alerts.error'));
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* ──── SCREEN ONLY CONTROLS & HEADER ──── */}
      <div className="hide-on-print">
        
        {/* Page Header */}
        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'rgba(0, 229, 153, 0.12)', color: 'var(--accent-primary)' }}>
                <ShoppingCart size={26} />
              </div>
              <h1 className="heading-xl" style={{ margin: 0, fontWeight: 800 }}>
                {t('purchaseRequisition.title')}
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('purchaseRequisition.subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleApplyEmergencyBuffer} 
              className="btn btn-outline"
              title={t('purchaseRequisition.applyBuffer')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
            >
              <Zap size={16} />
              <span>{t('purchaseRequisition.applyBuffer')}</span>
            </button>

            <button 
              onClick={handleResetSuggestions} 
              className="btn btn-outline"
              title={t('purchaseRequisition.resetTooltip')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={16} />
              <span>{t('purchaseRequisition.resetSmart')}</span>
            </button>

            <button 
              onClick={handleExportExcel} 
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', fontWeight: 600 }}
            >
              <FileSpreadsheet size={16} />
              <span>{t('purchaseRequisition.exportExcel')}</span>
            </button>

            <button 
              onClick={() => setTimeout(() => window.print(), 100)} 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Printer size={16} />
              <span>{t('purchaseRequisition.printDoc')}</span>
            </button>
          </div>
        </div>

        {/* ──── KPI SUMMARY CARDS ──── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* Zero Stock */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('purchaseRequisition.zeroStockCount')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
                {stats.zeroStockItems.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('purchaseRequisition.itemsCount')}
              </div>
            </div>
          </div>

          {/* Below Limit */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('purchaseRequisition.showBelowLimit')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
                {stats.lowStockItems.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('purchaseRequisition.itemsCount')}
              </div>
            </div>
          </div>

          {/* Total Units to Order */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(0, 229, 153, 0.12)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PackageCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('purchaseRequisition.totalRequiredQty')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {stats.totalRequiredQty.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('purchaseRequisition.unit')}
              </div>
            </div>
          </div>

          {/* Requisition Number & Affected Categories */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('purchaseRequisition.prNumber')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'monospace' }}>
                {requisitionNumber}
              </div>
            </div>
          </div>

        </div>

        {/* ──── SMART MULTI-FILTER TOOLBAR ──── */}
        <div className="enterprise-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            
            {/* Search Input */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('purchaseRequisition.searchPlaceholder')}
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder={t('common.search')} 
                  className="input-field"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.25rem', width: '100%' }}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('purchaseRequisition.selectCategory')}
              </label>
              <div style={{ position: 'relative' }}>
                <Filter size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field"
                  style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.25rem', width: '100%' }}
                >
                  <option value="ALL">{t('purchaseRequisition.allCategories')} ({criticalItems.length})</option>
                  {categories.map(cat => {
                    const count = criticalItems.filter(i => i.category === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        {cat} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Urgency Filter Multi-Buttons */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('purchaseRequisition.filterUrgency')}
              </label>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('ALL')}
                  className={`btn ${urgencyFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: 'none' }}
                >
                  {t('purchaseRequisition.filterAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('ZERO_ONLY')}
                  className={`btn ${urgencyFilter === 'ZERO_ONLY' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: 'none', color: urgencyFilter === 'ZERO_ONLY' ? undefined : '#ef4444' }}
                >
                  {t('purchaseRequisition.filterZero')}
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('LOW_ONLY')}
                  className={`btn ${urgencyFilter === 'LOW_ONLY' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', border: 'none', color: urgencyFilter === 'LOW_ONLY' ? undefined : '#f59e0b' }}
                >
                  {t('purchaseRequisition.filterLow')}
                </button>
              </div>
            </div>

            {/* Strategy Selector */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('purchaseRequisition.strategyLabel')}
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyType)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="STANDARD">{t('purchaseRequisition.strategyStandard')}</option>
                <option value="DEMAND">{t('purchaseRequisition.strategyDemand')}</option>
              </select>
            </div>

          </div>
        </div>

      </div>

      {/* ──── DOCUMENT TABLE & PRINT VIEW ──── */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        
        {/* Official Print Header */}
        <PrintHeader 
          title={t('purchaseRequisition.printHeaderTitle')}
          subtitle={t('purchaseRequisition.printHeaderSubtitle')}
          category={selectedCategory === 'ALL' ? t('purchaseRequisition.printHeaderAllCats') : selectedCategory}
          documentNumber={requisitionNumber}
        />

        {/* Informative Header on Screen */}
        <div className="hide-on-print" style={{ 
          background: 'rgba(0, 229, 153, 0.05)', 
          border: '1px solid rgba(0, 229, 153, 0.2)', 
          padding: '0.75rem 1rem', 
          borderRadius: 'var(--radius-md)', 
          margin: '1.25rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <Info size={18} color="var(--accent-primary)" />
          <span>{t('purchaseRequisition.infoMessage')}</span>
        </div>

        {/* Table of Requisition Items */}
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="wms-table official-print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ width: '40px', textAlign: 'center' }}>{t('purchaseRequisition.tableIndex')}</th>
                <th style={{ width: '80px', textAlign: 'center' }}>{t('purchaseRequisition.tableCode')}</th>
                <th style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t('purchaseRequisition.tableName')}</th>
                <th style={{ width: '130px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('purchaseRequisition.tableCategory')}</th>
                <th style={{ width: '65px', textAlign: 'center' }}>{t('purchaseRequisition.tableUnit')}</th>
                <th style={{ width: '85px', textAlign: 'center' }}>{t('purchaseRequisition.tableCurrentStock')}</th>
                <th style={{ width: '75px', textAlign: 'center' }}>{t('purchaseRequisition.tableAlertLimit')}</th>
                <th style={{ width: '85px', textAlign: 'center' }}>{t('purchaseRequisition.tableTotalOut')}</th>
                <th style={{ width: '90px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('purchaseRequisition.tableSuggested')}</th>
                <th style={{ width: '120px', textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 800 }}>{t('purchaseRequisition.tableRequested')}</th>
                <th style={{ minWidth: '180px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('purchaseRequisition.tableNotes')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t('purchaseRequisition.noShortages')}</div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  const isZeroStock = item.stock <= 0;
                  return (
                    <tr key={item.id} style={{ background: isZeroStock ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, textAlign: 'center' }}>
                        <span style={{ padding: '0.2rem 0.4rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>
                          {item.code}
                        </span>
                      </td>
                      <td>
                        <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{item.name}</strong>
                        {isZeroStock && (
                          <span className="hide-on-print" style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            background: 'rgba(239, 68, 68, 0.12)', 
                            color: '#ef4444', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            display: 'inline-block',
                            marginTop: '2px'
                          }}>
                            {t('purchaseRequisition.zeroStockBadge')}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.category}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.unit}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: isZeroStock ? '#ef4444' : '#f59e0b' }}>
                        {item.stock}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.alertLimit}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.totalOut}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                        {item.suggestedQty}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {/* Interactive on screen, static on print */}
                        <div className="hide-on-print">
                          <input 
                            type="number"
                            min="0"
                            className="input-field"
                            value={item.requestedQty}
                            onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                            style={{ 
                              width: '85px', 
                              textAlign: 'center', 
                              fontWeight: 800, 
                              color: 'var(--accent-primary)',
                              padding: '4px 8px'
                            }}
                          />
                        </div>
                        <span className="show-on-print-only" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                          {item.requestedQty}
                        </span>
                      </td>
                      <td>
                        {/* Interactive on screen, static on print */}
                        <div className="hide-on-print">
                          <input 
                            type="text"
                            className="input-field"
                            value={item.notes}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            style={{ width: '100%', fontSize: '0.8rem', padding: '4px 8px' }}
                          />
                        </div>
                        <span className="show-on-print-only" style={{ fontSize: '11px' }}>
                          {item.notes}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Total Summary Footer in Table */}
        {filteredList.length > 0 && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem 1.5rem', 
            background: 'var(--bg-tertiary)', 
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid var(--border-light)'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('purchaseRequisition.footerTotalItems')} </span>
              <strong>{filteredList.length} {t('purchaseRequisition.itemsCount')}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('purchaseRequisition.footerTotalUnits')} </span>
              <strong style={{ color: 'var(--accent-primary)', fontSize: '1.3rem', marginInlineStart: '6px' }}>
                {stats.totalRequiredQty.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {t('purchaseRequisition.unit')}
              </strong>
            </div>
          </div>
        )}

        {/* Official Signatures Box */}
        <div style={{ marginTop: '2.5rem' }}>
          <PrintSignatures documentTitle="طلب شراء نواقص وخامات معتمد" 
            preparedBy={userData?.name || 'محمد حلمي'} 
            preparedRole={userData?.jobTitle || (language === 'ar' ? 'أمين مخازن ومدير النظام' : 'Warehouse Keeper & System Admin')} 
          />
        </div>

      </div>

    </div>
  );
}
