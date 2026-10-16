'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Printer, ArrowDown, ArrowUp, FileSpreadsheet, Search, Filter, 
  RotateCcw, Layers, PackageCheck, ArrowRightLeft, Scale, 
  ArrowUpDown, LayoutList, FolderTree, FileText
} from 'lucide-react';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import { exportToExcel } from '@/lib/excelExport';
import toast from 'react-hot-toast';

type TabType = 'DISBURSEMENTS' | 'ADDITIONS';
type ViewMode = 'GROUPED' | 'FLAT';
type SortField = 'date' | 'invoiceNo' | 'itemCode' | 'itemName' | 'category' | 'qty' | 'department' | 'supplier';
type SortDir = 'asc' | 'desc';

interface MonthlyRecord {
  id: string;
  date: string;
  invoiceNo: string;
  itemCode: string;
  itemName: string;
  category: string;
  department: string;
  destination: string;
  receiver: string;
  supplier: string;
  qty: number;
  unit: string;
  notes: string;
  createdAt: number;
}

export default function MonthlyReportsPage() {
  const { userData, user } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [disbursementRecords, setDisbursementRecords] = useState<MonthlyRecord[]>([]);
  const [additionRecords, setAdditionRecords] = useState<MonthlyRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('DISBURSEMENTS');
  const [viewMode, setViewMode] = useState<ViewMode>('GROUPED');

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const isSupervisor = userData?.role === 'supervisor';
  const isAdmin = userData?.role === 'admin';
  const isMgmt = userData?.role === 'management';

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [selectedMonth, selectedYear, user, userData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthStr = selectedMonth.toString().padStart(2, '0');
      const startPrefix = `${selectedYear}-${monthStr}`;
      
      // 1. Fetch Disbursements
      const dSnap = await getDocs(collection(db, 'disbursements'));
      const dData: MonthlyRecord[] = [];
      dSnap.forEach(doc => {
        const data = doc.data() as any;
        const rawDate = data.date || (data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 10) : '');
        const dateStr = typeof rawDate === 'string' ? rawDate.trim() : '';
        
        if (dateStr.startsWith(startPrefix)) {
          const dept = String(data.department || data.reason || '—').trim();
          const record: MonthlyRecord = {
            id: doc.id,
            date: dateStr,
            invoiceNo: String(data.invoiceNo || data.reportNo || '').trim(),
            itemCode: String(data.itemCode || '').trim(),
            itemName: String(data.itemName || '').trim(),
            category: String(data.category || '').trim(),
            department: dept,
            destination: (() => {
              const dest = String(data.destination || '').trim();
              return (dest && dest !== 'فني الصيانة' && dest !== '—') ? dest : '';
            })(),
            receiver: (() => {
              const rec = String(data.receiver || '').trim();
              return (rec && rec !== 'فني الصيانة' && rec !== '—') ? rec : '';
            })(),
            supplier: '',
            qty: Number(data.qty || 0),
            unit: String(data.unit || 'عدد').trim(),
            notes: String(data.notes || '').trim(),
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
          };

          const authorizedDepts = userData?.departments && userData.departments.length > 0 
            ? userData.departments 
            : (userData?.category ? [userData.category] : []);

          if (isSupervisor) {
            if (authorizedDepts.includes(dept) || authorizedDepts.includes(record.category)) {
              dData.push(record);
            }
          } else if (isAdmin || isMgmt) {
            dData.push(record);
          }
        }
      });

      setDisbursementRecords(dData);

      // 2. Fetch Additions
      const aSnap = await getDocs(collection(db, 'additions'));
      const aData: MonthlyRecord[] = [];
      aSnap.forEach(doc => {
        const data = doc.data() as any;
        const rawDate = data.date || (data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 10) : '');
        const dateStr = typeof rawDate === 'string' ? rawDate.trim() : '';

        if (dateStr.startsWith(startPrefix)) {
          const cat = String(data.category || '—').trim();
          const record: MonthlyRecord = {
            id: doc.id,
            date: dateStr,
            invoiceNo: String(data.invoiceNo || data.reportNo || '').trim(),
            itemCode: String(data.itemCode || '').trim(),
            itemName: String(data.itemName || '').trim(),
            category: cat,
            department: '',
            destination: '',
            receiver: '',
            supplier: String(data.supplier || data.createdByName || '').trim(),
            qty: Number(data.qty || 0),
            unit: String(data.unit || 'عدد').trim(),
            notes: String(data.notes || '').trim(),
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
          };

          if (isSupervisor) {
            if (cat === userData?.category) {
              aData.push(record);
            }
          } else if (isAdmin || isMgmt) {
            aData.push(record);
          }
        }
      });

      setAdditionRecords(aData);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Compute Available Departments / Categories for Filter
  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    disbursementRecords.forEach(d => {
      if (d.department && d.department !== '—') depts.add(d.department);
      if (d.category && d.category !== '—') depts.add(d.category);
    });
    additionRecords.forEach(a => {
      if (a.category && a.category !== '—') depts.add(a.category);
    });
    return Array.from(depts).sort();
  }, [disbursementRecords, additionRecords]);

  // Filter Active Dataset
  const activeDataset = useMemo(() => {
    return activeTab === 'DISBURSEMENTS' ? disbursementRecords : additionRecords;
  }, [activeTab, disbursementRecords, additionRecords]);

  const filteredDataset = useMemo(() => {
    return activeDataset.filter(item => {
      if (selectedDeptFilter !== 'all') {
        const matchesDept = item.department === selectedDeptFilter;
        const matchesCat = item.category === selectedDeptFilter;
        if (!matchesDept && !matchesCat) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const codeMatch = item.itemCode.toLowerCase().includes(q);
        const nameMatch = item.itemName.toLowerCase().includes(q);
        const invMatch = item.invoiceNo.toLowerCase().includes(q);
        const deptMatch = item.department.toLowerCase().includes(q);
        const destMatch = item.destination.toLowerCase().includes(q);
        const recMatch = item.receiver.toLowerCase().includes(q);
        const suppMatch = item.supplier.toLowerCase().includes(q);
        const catMatch = item.category.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !invMatch && !deptMatch && !destMatch && !recMatch && !suppMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });
  }, [activeDataset, selectedDeptFilter, searchTerm]);

  // Sort Filtered Dataset
  const sortedDataset = useMemo(() => {
    const list = [...filteredDataset];

    list.sort((a, b) => {
      if (sortField === 'date') {
        const cmp = a.date.localeCompare(b.date);
        if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
        const numA = Number(a.invoiceNo || 0);
        const numB = Number(b.invoiceNo || 0);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return sortDir === 'asc' ? numA - numB : numB - numA;
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
  }, [filteredDataset, sortField, sortDir]);

  // Overall Month Statistics
  const monthStats = useMemo(() => {
    const totalDisbQty = disbursementRecords.reduce((acc, curr) => acc + curr.qty, 0);
    const totalAddQty = additionRecords.reduce((acc, curr) => acc + curr.qty, 0);
    const netFlow = totalAddQty - totalDisbQty;
    
    const activeItemCodes = new Set([
      ...disbursementRecords.map(d => d.itemCode || d.itemName),
      ...additionRecords.map(a => a.itemCode || a.itemName)
    ]).size;

    return {
      totalDisbQty,
      disbCount: disbursementRecords.length,
      totalAddQty,
      addCount: additionRecords.length,
      netFlow,
      activeItemCodes
    };
  }, [disbursementRecords, additionRecords]);

  // Grouped by Department / Category
  const groupedData = useMemo(() => {
    const groups: Record<string, MonthlyRecord[]> = {};
    sortedDataset.forEach(r => {
      const key = activeTab === 'DISBURSEMENTS' ? (r.department || '—') : (r.category || '—');
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [sortedDataset, activeTab]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDeptFilter('all');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    const isDisb = activeTab === 'DISBURSEMENTS';
    if (sortedDataset.length === 0) {
      toast.error(t('common.noData'));
      return;
    }

    if (isDisb) {
      const cols = [
        { header: '#', key: 'seq', width: 8 },
        { header: t('common.date'), key: 'date', width: 14 },
        { header: t('disbursements.invoiceNo'), key: 'invoiceNo', width: 16 },
        { header: t('disbursements.itemCode'), key: 'itemCode', width: 14 },
        { header: t('disbursements.itemName'), key: 'itemName', width: 30 },
        { header: t('disbursements.category'), key: 'category', width: 22 },
        { header: t('disbursements.qty'), key: 'qty', width: 15 },
        { header: t('common.unit'), key: 'unit', width: 12 },
        { header: t('disbursements.department'), key: 'department', width: 22 },
        { header: t('disbursements.destination'), key: 'destination', width: 25 },
        { header: t('disbursements.receiver'), key: 'receiver', width: 20 },
      ];
      const data = sortedDataset.map((row, idx) => ({
        seq: idx + 1,
        date: row.date,
        invoiceNo: row.invoiceNo || '—',
        itemCode: row.itemCode || '—',
        itemName: row.itemName,
        category: row.category,
        qty: row.qty,
        unit: row.unit,
        department: row.department || '—',
        destination: row.destination || '—',
        receiver: row.receiver || '—'
      }));
      await exportToExcel(
        `${t('monthlyReports.disbursementsTab')} - ${selectedMonth}/${selectedYear}`,
        'Disbursements',
        cols,
        data,
        `Monthly_Disbursements_${selectedYear}_${selectedMonth}`
      );
      toast.success(t('alerts.success'));
    } else {
      const cols = [
        { header: '#', key: 'seq', width: 8 },
        { header: t('common.date'), key: 'date', width: 14 },
        { header: t('additions.invoiceNo'), key: 'invoiceNo', width: 18 },
        { header: t('additions.itemCode'), key: 'itemCode', width: 14 },
        { header: t('additions.itemName'), key: 'itemName', width: 30 },
        { header: t('additions.category'), key: 'category', width: 22 },
        { header: t('additions.qty'), key: 'qty', width: 15 },
        { header: t('common.unit'), key: 'unit', width: 12 },
        { header: t('additions.supplier'), key: 'supplier', width: 25 },
        { header: t('common.notes'), key: 'notes', width: 25 }
      ];
      const data = sortedDataset.map((row, idx) => ({
        seq: idx + 1,
        date: row.date,
        invoiceNo: row.invoiceNo || '—',
        itemCode: row.itemCode || '—',
        itemName: row.itemName,
        category: row.category,
        qty: row.qty,
        unit: row.unit,
        supplier: row.supplier || '—',
        notes: row.notes || '—'
      }));
      await exportToExcel(
        `${t('monthlyReports.additionsTab')} - ${selectedMonth}/${selectedYear}`,
        'Additions',
        cols,
        data,
        `Monthly_Additions_${selectedYear}_${selectedMonth}`
      );
      toast.success(t('alerts.success'));
    }
  };

  if (!isAdmin && !isMgmt && !isSupervisor) {
    return <div className="p-8 text-center text-muted">{t('common.noData')}</div>;
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* ──── SCREEN VIEW (HIDDEN ON PRINT) ──── */}
      <div className="hide-on-print">
        
        {/* ──── PAGE HEADER ──── */}
        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'rgba(9, 154, 117, 0.12)', color: '#099A75' }}>
                <FileText size={26} />
              </div>
              <h1 className="heading-xl" style={{ margin: 0, fontWeight: 800 }}>{t('monthlyReports.title')}</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('monthlyReports.subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Year / Month Selectors */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <select 
                className="input-field" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(Number(e.target.value))} 
                style={{ minWidth: '130px', fontWeight: 600 }}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>
                    {language === 'ar' ? `شهر ${i+1}` : `Month ${i+1}`}
                  </option>
                ))}
              </select>
              
              <select 
                className="input-field" 
                value={selectedYear} 
                onChange={e => setSelectedYear(Number(e.target.value))} 
                style={{ minWidth: '95px', fontWeight: 600 }}
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleExportExcel} 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', color: '#099A75', borderColor: '#099A75', fontWeight: 600 }}
              title={t('common.exportExcel')}
            >
              <FileSpreadsheet size={18} /> {t('common.exportExcel')}
            </button>

            <button 
              onClick={handlePrint} 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', fontWeight: 600 }}
            >
              <Printer size={18} /> {t('common.printReport')}
            </button>
          </div>
        </div>

        {/* ──── KPI SUMMARY CARDS ──── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* Total Disbursed */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('monthlyReports.totalDisbursedQty')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
                {monthStats.totalDisbQty.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginInlineStart: '6px' }}>
                  ({monthStats.disbCount} {t('monthlyReports.movements')})
                </span>
              </div>
            </div>
          </div>

          {/* Total Inbound */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PackageCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('monthlyReports.totalAddedQty')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                {monthStats.totalAddQty.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginInlineStart: '6px' }}>
                  ({monthStats.addCount} {t('monthlyReports.movements')})
                </span>
              </div>
            </div>
          </div>

          {/* Net Flow */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('monthlyReports.netFlow')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: monthStats.netFlow >= 0 ? '#10b981' : '#f59e0b' }}>
                {monthStats.netFlow >= 0 ? `+${monthStats.netFlow.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}` : monthStats.netFlow.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {/* Active Items */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('monthlyReports.activeItems')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>
                {monthStats.activeItemCodes.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

        </div>

        {/* ──── SMART FILTER TOOLBAR ──── */}
        <div className="enterprise-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            
            {/* Search Input */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('monthlyReports.searchPlaceholder')}
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

            {/* Department / Category Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('disbursements.department')} / {t('common.category')}
              </label>
              <div style={{ position: 'relative' }}>
                <Filter size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select 
                  className="input-field"
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.25rem', width: '100%' }}
                >
                  <option value="all">{t('monthlyReports.allDepartments')}</option>
                  {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('monthlyReports.viewMode')}
              </label>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('GROUPED')}
                  className={`btn ${viewMode === 'GROUPED' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', border: 'none' }}
                >
                  <FolderTree size={14} /> {t('monthlyReports.viewGrouped')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('FLAT')}
                  className={`btn ${viewMode === 'FLAT' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', border: 'none' }}
                >
                  <LayoutList size={14} /> {t('monthlyReports.viewFlat')}
                </button>
              </div>
            </div>

            {/* Reset Filter Button */}
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

        {/* ──── TABS ──── */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <button 
            className={`btn ${activeTab === 'DISBURSEMENTS' ? 'btn-primary' : 'btn-glass'}`}
            onClick={() => setActiveTab('DISBURSEMENTS')}
            style={{ padding: '0.7rem 1.75rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}
          >
            <ArrowRightLeft size={18} style={{ display: 'inline', marginInlineEnd: '8px' }} />
            {t('monthlyReports.disbursementsTab')} ({disbursementRecords.length.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')})
          </button>
          
          <button 
            className={`btn ${activeTab === 'ADDITIONS' ? 'btn-primary' : 'btn-glass'}`}
            onClick={() => setActiveTab('ADDITIONS')}
            style={{ padding: '0.7rem 1.75rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}
          >
            <PackageCheck size={18} style={{ display: 'inline', marginInlineEnd: '8px' }} />
            {t('monthlyReports.additionsTab')} ({additionRecords.length.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')})
          </button>
        </div>

      </div>

      {/* ──── DATA DISPLAY (SCREEN & PRINT) ──── */}
      <div className="official-document-paper enterprise-card" style={{ padding: '2rem' }}>
        
        <PrintHeader 
          title={`${t('monthlyReports.title')} (${activeTab === 'DISBURSEMENTS' ? t('monthlyReports.disbursementsTab') : t('monthlyReports.additionsTab')})`}
          subtitle={`${t('common.month')}: ${selectedMonth} / ${selectedYear} - ${t('common.showing')}: ${sortedDataset.length} ${t('common.records')}`}
          category={isSupervisor ? userData?.category : t('monthlyReports.allDepartments')}
        />

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : sortedDataset.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {activeTab === 'DISBURSEMENTS' ? t('monthlyReports.noDisbursements') : t('monthlyReports.noAdditions')}
          </div>
        ) : viewMode === 'GROUPED' ? (
          /* GROUPED VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
            {Object.keys(groupedData).map(groupKey => {
              const groupRows = groupedData[groupKey];
              const groupTotalQty = groupRows.reduce((acc, curr) => acc + curr.qty, 0);

              return (
                <div key={groupKey} style={{ border: '1px solid var(--border-light)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1.25rem', background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {activeTab === 'DISBURSEMENTS' ? t('disbursements.department') : t('additions.category')}: <strong>{groupKey}</strong>
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ({groupRows.length} {t('common.records')} | {t('common.quantity')}: <strong>{groupTotalQty}</strong>)
                    </span>
                  </div>

                  <table className="wms-table official-print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>{t('common.seq')}</th>
                        <th style={{ width: '105px', textAlign: 'center' }}>{t('common.date')}</th>
                        <th style={{ width: '95px', textAlign: 'center' }}>{t('disbursements.invoiceNo')}</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>{t('disbursements.itemCode')}</th>
                        <th style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t('disbursements.itemName')}</th>
                        <th style={{ width: '130px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t('common.category')}</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>{t('common.quantity')}</th>
                        <th style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                          {activeTab === 'DISBURSEMENTS' ? t('disbursements.destination') : t('additions.supplier')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupRows.map((row, idx) => (
                        <tr key={row.id}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.date}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.invoiceNo ? `#${row.invoiceNo}` : '—'}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.itemCode || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{row.itemName}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{row.category}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: activeTab === 'DISBURSEMENTS' ? '#ef4444' : '#10b981' }}>
                            {activeTab === 'DISBURSEMENTS' ? `-${row.qty}` : `+${row.qty}`} {row.unit}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {activeTab === 'DISBURSEMENTS' 
                              ? [row.receiver, row.destination ? `(${row.destination})` : ''].filter(Boolean).join(' ') || '—'
                              : `${row.supplier} ${row.notes ? `(${row.notes})` : ''}`.trim() || '—'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ) : (
          /* FLAT CHRONOLOGICAL VIEW */
          <div className="table-container" style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
            <table className="wms-table official-print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>{t('common.seq')}</th>
                  
                  <th onClick={() => handleSort('date')} style={{ width: '110px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <span>{t('common.date')}</span>
                      {sortField === 'date' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th onClick={() => handleSort('invoiceNo')} style={{ width: '100px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <span>{t('disbursements.invoiceNo')}</span>
                      {sortField === 'invoiceNo' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th onClick={() => handleSort('itemCode')} style={{ width: '90px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <span>{t('disbursements.itemCode')}</span>
                      {sortField === 'itemCode' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th onClick={() => handleSort('itemName')} style={{ textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{t('disbursements.itemName')}</span>
                      {sortField === 'itemName' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th onClick={() => handleSort('category')} style={{ width: '140px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{t('common.category')}</span>
                      {sortField === 'category' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th onClick={() => handleSort('qty')} style={{ width: '110px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <span>{t('common.quantity')}</span>
                      {sortField === 'qty' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>

                  <th style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                    {activeTab === 'DISBURSEMENTS' ? `${t('disbursements.department')} / ${t('disbursements.destination')}` : `${t('additions.supplier')} / ${t('common.notes')}`}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDataset.map((row, idx) => (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.date}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.invoiceNo ? `#${row.invoiceNo}` : '—'}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.itemCode || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{row.itemName}</td>
                    <td>{row.category}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: activeTab === 'DISBURSEMENTS' ? '#ef4444' : '#10b981' }}>
                      {activeTab === 'DISBURSEMENTS' ? `-${row.qty}` : `+${row.qty}`} {row.unit}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {activeTab === 'DISBURSEMENTS'
                        ? [row.department, row.receiver, row.destination ? `(${row.destination})` : ''].filter(Boolean).join(' - ') || '—'
                        : `${row.supplier} ${row.notes ? `(${row.notes})` : ''}`.trim() || '—'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PrintSignatures documentTitle="التقرير الشهري لحركة المخزون" />
      </div>

    </div>
  );
}
