'use client';
import toast from 'react-hot-toast';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, Trash2, Printer, Search, Filter, Calendar, 
  ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, 
  RotateCcw, ShieldAlert, AlertTriangle, Layers, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import { exportToExcel } from '@/lib/excelExport';
import DateFilterInput from '@/components/DateFilterInput';
import { ALL_WAREHOUSE_DEPARTMENTS, normalizeCategory } from '@/types/inventory';

const CATEGORIES = [...ALL_WAREHOUSE_DEPARTMENTS];

interface NormalizedScrap {
  id: string;
  reportNo: string;
  date: string;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  reason: string;
  category: string;
  createdAt: number;
}

type SortField = 'date' | 'itemCode' | 'itemName' | 'category' | 'qty' | 'reason';
type SortDir = 'asc' | 'desc';

export default function ScrapPage() {
  const { userData } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  // Data
  const [items, setItems] = useState<any[]>([]);
  const [scraps, setScraps] = useState<NormalizedScrap[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Visibility
  const [showAddForm, setShowAddForm] = useState(false);

  // Print Mode State
  const [printItem, setPrintItem] = useState<NormalizedScrap | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Role Checks - Super Admin Only
  const isAdmin = userData?.role === 'admin' || userData?.email?.toLowerCase() === 'mohamedalghala@gmail.com' || userData?.email?.toLowerCase().startsWith('admin');
  const isManagement = userData?.role === 'management';

  useEffect(() => {
    if (userData && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [userData, isAdmin, router]);

  // Form State
  const [form, setForm] = useState({
    reportNo: `SCRAP-${Date.now().toString().slice(-6)}`,
    reason: 'Damaged / Broken during operation',
    date: new Date().toISOString().split('T')[0]
  });

  const [rowItems, setRowItems] = useState([
    { itemId: '', qty: 1 }
  ]);

  const addRow = () => setRowItems([...rowItems, { itemId: '', qty: 1 }]);
  const removeRow = (index: number) => setRowItems(rowItems.filter((_, i) => i !== index));
  const updateRow = (index: number, field: string, value: any) => {
    const newRows = [...rowItems];
    (newRows as any)[index][field] = value;
    setRowItems(newRows);
  };

  // Real-time Firestore Listener
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter((item: any) => item.name && item.name.trim() !== ''));
    });

    const unsubScraps = onSnapshot(collection(db, 'scrap'), (snap) => {
      const list: NormalizedScrap[] = snap.docs.map(doc => {
        const d = doc.data();
        let dateStr = d.date || '';
        if (!dateStr && d.createdAt) {
          dateStr = new Date(d.createdAt).toISOString().split('T')[0];
        }
        if (!dateStr) dateStr = '2026-01-01';

        return {
          id: doc.id,
          reportNo: String(d.reportNo || '').trim(),
          date: dateStr,
          itemCode: String(d.itemCode || d.code || '').trim(),
          itemName: String(d.itemName || d.name || 'صنف غير محدد').trim(),
          unit: String(d.unit || 'عدد').trim(),
          qty: Number(d.qty || d.quantity || 0),
          reason: String(d.reason || d.notes || '—').trim(),
          category: String(d.category || 'عام').trim(),
          createdAt: typeof d.createdAt === 'number' ? d.createdAt : new Date(dateStr).getTime()
        };
      });

      setScraps(list);
      setLoading(false);
    }, (err) => {
      console.error('Scrap onSnapshot error:', err);
      setLoading(false);
    });

    return () => {
      unsubItems();
      unsubScraps();
    };
  }, []);

  // Compute Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    scraps.forEach(s => {
      if (s.date && s.date.length >= 4) {
        years.add(s.date.slice(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [scraps]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    return scraps.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      if (dateFilter && item.date !== dateFilter) {
        return false;
      }

      if (selectedYear !== 'all' && !item.date.startsWith(selectedYear)) {
        return false;
      }

      if (selectedMonth !== 'all') {
        const itemMonth = item.date.split('-')[1];
        if (itemMonth !== selectedMonth) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const codeMatch = item.itemCode.toLowerCase().includes(q);
        const nameMatch = item.itemName.toLowerCase().includes(q);
        const reasonMatch = item.reason.toLowerCase().includes(q);
        const catMatch = item.category.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !reasonMatch && !catMatch) return false;
      }

      return true;
    });
  }, [scraps, selectedCategory, dateFilter, selectedYear, selectedMonth, searchTerm]);

  // Strict Chronological & Column Sorting
  const sortedData = useMemo(() => {
    const list = [...filteredData];

    list.sort((a, b) => {
      if (sortField === 'date') {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) {
          return sortDir === 'asc' ? dateCmp : -dateCmp;
        }
        return sortDir === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
      }

      if (sortField === 'qty') {
        return sortDir === 'asc' ? a.qty - b.qty : b.qty - a.qty;
      }

      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      const strCmp = valA.localeCompare(valB, 'ar');
      return sortDir === 'asc' ? strCmp : -strCmp;
    });

    return list;
  }, [filteredData, sortField, sortDir]);

  // Pagination Slice
  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    if (pageSize === 0) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // KPI Summary Statistics
  const stats = useMemo(() => {
    const totalRecords = filteredData.length;
    const totalQty = filteredData.reduce((acc, curr) => acc + curr.qty, 0);
    const uniqueItems = new Set(filteredData.map(d => d.itemCode || d.itemName)).size;
    const uniqueCategories = new Set(filteredData.map(d => d.category)).size;

    return { totalRecords, totalQty, uniqueItems, uniqueCategories };
  }, [filteredData]);

  // Sort Toggle Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Reset All Filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setDateFilter('');
    setCurrentPage(1);
  };

  // Excel Export Handler
  const handleExportExcel = async () => {
    try {
      const exportCols = [
        { header: '#', key: 'seq', width: 8 },
        { header: t('common.date'), key: 'date', width: 15 },
        { header: t('scrap.itemCode'), key: 'itemCode', width: 15 },
        { header: t('scrap.itemName'), key: 'itemName', width: 35 },
        { header: t('scrap.category'), key: 'category', width: 22 },
        { header: t('scrap.qty'), key: 'qty', width: 15 },
        { header: t('common.unit'), key: 'unit', width: 12 },
        { header: t('scrap.reason'), key: 'reason', width: 35 }
      ];

      const exportRows = sortedData.map((d, i) => ({
        seq: i + 1,
        date: d.date,
        itemCode: d.itemCode,
        itemName: d.itemName,
        category: d.category,
        qty: d.qty,
        unit: d.unit,
        reason: d.reason
      }));

      await exportToExcel(
        t('scrap.fullReportTitle'),
        'Scrap',
        exportCols,
        exportRows,
        'Scrap_Register'
      );
      toast.success(t('alerts.success'));
    } catch (e: any) {
      console.error(e);
      toast.error(t('alerts.error'));
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(t('scrap.unauthorized'));
      return;
    }

    const validRows = rowItems.filter(r => r.itemId && r.qty > 0);
    if (validRows.length === 0) {
      toast.error(t('scrap.validationError'));
      return;
    }

    // Frontend Stock Validation
    for (const row of validRows) {
      const dbItem = items.find(i => i.id === row.itemId);
      if (!dbItem) {
        toast.error('Item not found');
        return;
      }
      if ((dbItem.stock || 0) < row.qty) {
        toast.error(`${t('disbursements.stockNotEnough')} [${dbItem.name}]`);
        return;
      }
    }

    setSubmitting(true);
    
    try {
      const recordScrapFn = httpsCallable(functions, 'recordScrap');

      for (const row of validRows) {
        await recordScrapFn({
          itemId: row.itemId,
          qty: Number(row.qty),
          reason: form.reason.trim(),
          date: form.date,
        });
      }

      toast.success(t('scrap.successMsg'));
      setForm({ ...form, reportNo: `SCRAP-${Date.now().toString().slice(-6)}` });
      setRowItems([{ itemId: '', qty: 1 }]);
      setShowAddForm(false);

    } catch (error: any) {
      toast.error(error.message || t('alerts.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin && !isManagement) return null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* ──── SCREEN VIEW (HIDDEN ON PRINT) ──── */}
      <div className={printItem ? "hide-on-print" : ""}>
        
        {/* ──── PAGE HEADER ──── */}
        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                <AlertTriangle size={26} />
              </div>
              <h1 className="heading-xl" style={{ margin: 0, fontWeight: 800 }}>{t('scrap.title')}</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('scrap.subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button 
                onClick={() => setShowAddForm(!showAddForm)} 
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', fontWeight: 700 }}
              >
                <Plus size={18} /> {showAddForm ? t('scrap.closeForm') : t('scrap.recordScrap')}
              </button>
            )}

            <button 
              onClick={handleExportExcel} 
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', fontWeight: 600 }}
              title={t('common.exportExcel')}
            >
              <FileSpreadsheet size={18} /> {t('common.exportExcel')}
            </button>

            <button 
              onClick={() => { setPrintItem(null); setTimeout(() => window.print(), 100); }} 
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', fontWeight: 600 }}
            >
              <Printer size={18} /> {t('common.printRegister')}
            </button>
          </div>
        </div>

        {/* ──── KPI SUMMARY CARDS ──── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('scrap.statsRecords')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats.totalRecords.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>

          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('scrap.statsQty')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{stats.totalQty.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>

          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('scrap.statsDepts')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{stats.uniqueCategories.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>

          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('scrap.statsItems')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>{stats.uniqueItems.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>
        </div>

        {/* ──── CREATE FORM (COLLAPSIBLE) ──── */}
        {isAdmin && showAddForm && (
          <form onSubmit={handleSubmit} className="enterprise-card animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', border: '2px solid #ef4444' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <h2 className="heading-md" style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} /> {t('scrap.formTitle')}
              </h2>
              <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)} style={{ padding: '0.4rem 1rem' }}>{t('common.cancel')}</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('scrap.date')}</label>
                <input type="date" required className="input-field" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('scrap.reportNo')}</label>
                <input type="text" required className="input-field" value={form.reportNo} onChange={e => setForm({...form, reportNo: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('scrap.reason')}</label>
                <input type="text" required className="input-field" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder={t('scrap.reasonPlaceholder')} />
              </div>
            </div>

            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 className="heading-sm" style={{ margin: 0, fontWeight: 700 }}>{t('scrap.scrapItems')}</h3>
              <button type="button" className="btn btn-outline" onClick={addRow} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={16} /> {t('scrap.addAnotherItem')}
              </button>
            </div>

            <div className="table-container" style={{ marginBottom: '1.5rem' }}>
              <table className="wms-table">
                <thead>
                  <tr>
                    <th>{t('common.item')}</th>
                    <th style={{ width: '180px' }}>{t('scrap.qty')}</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rowItems.map((row, idx) => {
                    const selectedItem = items.find(i => i.id === row.itemId);
                    const maxStock = selectedItem ? selectedItem.stock : 999999;
                    const isOverStock = row.qty > maxStock;

                    return (
                      <tr key={idx} style={{ background: isOverStock ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                        <td>
                          <select required className="input-field" value={row.itemId} onChange={e => updateRow(idx, 'itemId', e.target.value)}>
                            <option value="">{t('scrap.selectItemPlaceholder')}</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id} disabled={item.stock <= 0}>
                                [{item.code}] {item.name} - ({t('disbursements.available')}: {item.stock} {item.unit || ''}) {item.stock <= 0 ? '🚫' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input 
                            required 
                            type="number" 
                            min="0.1" 
                            step="any"
                            className="input-field" 
                            value={row.qty} 
                            onChange={e => updateRow(idx, 'qty', Number(e.target.value))} 
                            style={{ borderColor: isOverStock ? '#ef4444' : undefined }}
                          />
                          {isOverStock && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: 600 }}>{t('disbursements.stockNotEnough')}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {rowItems.length > 1 && (
                            <button type="button" className="btn btn-outline" onClick={() => removeRow(idx)} style={{ color: 'var(--accent-danger)', borderColor: 'transparent', padding: '0.4rem' }}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: '#ef4444', borderColor: '#ef4444', padding: '0.75rem 2.5rem', fontWeight: 700 }}>
                {submitting ? t('scrap.saving') : t('scrap.confirmBtn')}
              </button>
            </div>
          </form>
        )}

        {/* ──── ADVANCED SMART FILTER BAR ──── */}
        <div className="enterprise-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            
            {/* Search Input */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('scrap.searchPlaceholder')}
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

            {/* Category */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('common.category')}
              </label>
              <div style={{ position: 'relative' }}>
                <Filter size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select 
                  className="input-field"
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.25rem', width: '100%' }}
                >
                  <option value="all">{t('common.allCategories')}</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Year */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('monthlyReports.selectYear')}
              </label>
              <select 
                className="input-field"
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                style={{ width: '100%' }}
              >
                <option value="all">{t('common.allYears')}</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Month */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('monthlyReports.selectMonth')}
              </label>
              <select 
                className="input-field"
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
                style={{ width: '100%' }}
              >
                <option value="all">{t('common.allMonths')}</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={String(i+1).padStart(2, '0')}>
                    {language === 'ar' ? `شهر ${i+1}` : `Month ${i+1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Exact Date */}
            <DateFilterInput 
              value={dateFilter} 
              onChange={(val) => { setDateFilter(val); setCurrentPage(1); }} 
            />

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

        {/* ──── DATA TABLE CONTAINER ──── */}
        <div className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
          
          {/* Table Header Bar */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {t('common.showing')} <strong style={{ color: 'var(--text-primary)' }}>{paginatedData.length}</strong> {t('common.of')} <strong style={{ color: 'var(--text-primary)' }}>{sortedData.length}</strong> {t('common.records')}
            </div>

            {/* Page Size Selector */}
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

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>{t('scrap.loading')}</div>
          ) : sortedData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>{t('scrap.emptyState')}</div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', maxHeight: '650px', position: 'relative' }}>
              <table className="wms-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-secondary)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>{t('common.seq')}</th>
                    
                    <th 
                      onClick={() => handleSort('date')} 
                      style={{ width: '120px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.5rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <span>{t('common.date')}</span>
                        {sortField === 'date' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('itemCode')} 
                      style={{ width: '100px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.5rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <span>{t('scrap.itemCode')}</span>
                        {sortField === 'itemCode' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('itemName')} 
                      style={{ minWidth: '220px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{t('scrap.itemName')}</span>
                        {sortField === 'itemName' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('category')} 
                      style={{ width: '180px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{t('scrap.category')}</span>
                        {sortField === 'category' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('qty')} 
                      style={{ width: '130px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.5rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <span>{t('scrap.qty')}</span>
                        {sortField === 'qty' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('reason')} 
                      style={{ minWidth: '200px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{t('scrap.reason')}</span>
                        {sortField === 'reason' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th style={{ width: '60px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>{t('common.print')}</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.map((row, idx) => {
                    const globalIdx = (currentPage - 1) * (pageSize || sortedData.length) + idx + 1;

                    return (
                      <tr key={row.id || idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{globalIdx}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.date}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {row.itemCode}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.itemName}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', fontSize: '0.8rem', color: '#3b82f6' }}>
                            {row.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                            -{row.qty} {row.unit}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.reason}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => { setPrintItem(row); setTimeout(() => window.print(), 100); }} 
                            className="btn btn-outline" 
                            style={{ padding: '0.35rem 0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                            title={t('scrap.printVoucher')}
                          >
                            <Printer size={15} />
                          </button>
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
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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

      </div>

      {/* ──── FULL REGISTER PRINT VIEW (A4) ──── */}
      {!printItem && (
        <div className="show-on-print-only official-document-paper" style={{ padding: '2rem' }}>
        <PrintHeader 
          title={t('scrap.fullReportTitle')}
          subtitle={`${t('scrap.subtitle')} - ${t('common.showing')}: ${stats.totalRecords} ${t('common.records')} (${stats.totalQty} ${t('common.quantity')})`}
          category={selectedCategory === 'all' ? t('common.allCategories') : selectedCategory}
        />

        <table className="wms-table official-print-table" style={{ width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>{t('common.seq')}</th>
              <th style={{ width: '100px' }}>{t('common.date')}</th>
              <th style={{ width: '90px' }}>{t('scrap.itemCode')}</th>
              <th>{t('scrap.itemName')}</th>
              <th style={{ width: '140px' }}>{t('scrap.category')}</th>
              <th style={{ width: '100px' }}>{t('scrap.qty')}</th>
              <th>{t('scrap.reason')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr key={row.id || idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ textAlign: 'center' }}>{row.date}</td>
                <td style={{ textAlign: 'center' }}>{row.itemCode}</td>
                <td style={{ fontWeight: 600 }}>{row.itemName}</td>
                <td>{row.category}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>-{row.qty} {row.unit}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <PrintSignatures documentTitle="محضر تكهين وهالك معتمد" />
        </div>
      )}

      {/* ──── SINGLE ITEM SCRAP VOUCHER PRINT VIEW ──── */}
      {printItem && (
        <div className="show-on-print-only official-document-paper" style={{ padding: '2.5rem' }}>
          <PrintHeader 
            title={t('scrap.singleVoucherTitle')}
            subtitle={`${t('scrap.reportNo')}: ${printItem.reportNo || 'SCR-' + printItem.createdAt} - ${t('common.date')}: ${printItem.date}`}
            category={printItem.category}
          />

          <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '1.05rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <strong>{t('scrap.reason')}:</strong> {printItem.reason || t('scrap.defaultReason')}
            </div>

            <table className="wms-table official-print-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>{t('scrap.itemCode')}</th>
                  <th>{t('scrap.itemName')}</th>
                  <th style={{ width: '160px' }}>{t('scrap.category')}</th>
                  <th style={{ width: '140px' }}>{t('scrap.qty')}</th>
                  <th style={{ width: '100px' }}>{t('common.unit')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{printItem.itemCode}</td>
                  <td style={{ fontWeight: 700, color: '#ef4444' }}>{printItem.itemName}</td>
                  <td>{printItem.category}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#ef4444' }}>-{printItem.qty}</td>
                  <td style={{ textAlign: 'center' }}>{printItem.unit}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <PrintSignatures documentTitle="محضر تكهين وهالك معتمد" />
        </div>
      )}

    </div>
  );
}
