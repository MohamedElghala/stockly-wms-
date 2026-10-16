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
  RotateCcw, ArrowRightLeft, Layers, FileText, ChevronLeft, ChevronRight, Barcode
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import { exportToExcel } from '@/lib/excelExport';
import DateFilterInput from '@/components/DateFilterInput';
import { ALL_WAREHOUSE_DEPARTMENTS, normalizeCategory } from '@/types/inventory';
import BarcodeScannerModal from '@/components/barcode/BarcodeScannerModal';

const CATEGORIES = [...ALL_WAREHOUSE_DEPARTMENTS];

interface NormalizedDisbursement {
  id: string;
  invoiceNo: string;
  date: string;
  department: string;
  destination: string;
  receiver: string;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  notes: string;
  category: string;
  createdAt: number;
}

type SortField = 'date' | 'invoiceNo' | 'itemCode' | 'itemName' | 'category' | 'qty' | 'department' | 'receiver' | 'destination';
type SortDir = 'asc' | 'desc';

export default function DisbursementsPage() {
  const { userData } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  // Data
  const [items, setItems] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<NormalizedDisbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Visibility
  const [showAddForm, setShowAddForm] = useState(false);

  // Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Print Mode State
  const [printItem, setPrintItem] = useState<NormalizedDisbursement | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
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

  // Clean afterprint listener
  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintItem(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintRow = (row: NormalizedDisbursement) => {
    setPrintItem(row);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintRegister = () => {
    setPrintItem(null);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Form State
  const [form, setForm] = useState({
    invoiceNo: '',
    department: 'أدوات كهربائية',
    destination: '',
    receiver: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
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

  const handleBarcodeScanned = (scannedCode: string) => {
    const trimmed = scannedCode.trim().toLowerCase();
    const found = items.find(i => 
      (i.code && String(i.code).toLowerCase() === trimmed) ||
      (i.id && String(i.id).toLowerCase() === trimmed) ||
      (i.name && String(i.name).toLowerCase().includes(trimmed))
    );

    if (found) {
      if (showAddForm) {
        const emptyRowIdx = rowItems.findIndex(r => !r.itemId);
        if (emptyRowIdx >= 0) {
          updateRow(emptyRowIdx, 'itemId', found.id);
        } else {
          setRowItems([...rowItems, { itemId: found.id, qty: 1 }]);
        }
        toast.success(language === 'ar' ? `تم إدراج الصنف في إذن الصرف: ${found.name}` : `Added to invoice: ${found.name}`, { icon: '📦' });
      } else {
        setSearchTerm(found.code || found.name);
        toast.success(language === 'ar' ? `تم تصفية السجل للصنف: ${found.name}` : `Filtered by item: ${found.name}`, { icon: '🔍' });
      }
    } else {
      setSearchTerm(scannedCode.trim());
      toast(language === 'ar' ? `لم يتم العثور على صنف مطابق، تم تطبيق البحث: ${scannedCode.trim()}` : `No match, searching: ${scannedCode.trim()}`, { icon: '🔍' });
    }
  };

  // Real-time Firestore Listener
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter((item: any) => item.name && item.name.trim() !== ''));
    });

    const unsubDisbursements = onSnapshot(collection(db, 'disbursements'), (snap) => {
      const list: NormalizedDisbursement[] = snap.docs.map(doc => {
        const d = doc.data();
        let dateStr = d.date || '';
        if (!dateStr && d.createdAt) {
          dateStr = new Date(d.createdAt).toISOString().split('T')[0];
        }
        if (!dateStr) dateStr = '2026-01-01';

        const dept = String(d.department || d.reason || '').trim();

        let rawInv = String(d.invoiceNo || d.reportNo || '').trim();
        if (rawInv.startsWith('#')) rawInv = rawInv.slice(1);

        return {
          id: doc.id,
          invoiceNo: rawInv,
          date: dateStr,
          department: dept || 'غير محدد',
          destination: (() => {
            const dest = String(d.destination || '').trim();
            return (dest && dest !== 'فني الصيانة' && dest !== '—') ? dest : '—';
          })(),
          receiver: (() => {
            const rec = String(d.receiver || '').trim();
            return (rec && rec !== 'فني الصيانة' && rec !== '—') ? rec : '—';
          })(),
          itemCode: String(d.itemCode || d.code || '').trim(),
          itemName: String(d.itemName || d.name || 'صنف غير محدد').trim(),
          unit: String(d.unit || 'عدد').trim(),
          qty: Number(d.qty || d.quantity || 0),
          notes: String(d.notes || '—').trim(),
          category: String(d.category || 'عام').trim(),
          createdAt: typeof d.createdAt === 'number' ? d.createdAt : new Date(dateStr).getTime()
        };
      });

      setDisbursements(list);
      setLoading(false);
    }, (err) => {
      console.error("Disbursements onSnapshot error:", err);
      setLoading(false);
    });

    return () => {
      unsubItems();
      unsubDisbursements();
    };
  }, []);

  // Compute Available Years & Departments
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    disbursements.forEach(d => {
      if (d.date && d.date.length >= 4) {
        years.add(d.date.slice(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [disbursements]);

  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    disbursements.forEach(d => {
      if (d.department && d.department !== 'غير محدد') {
        depts.add(d.department);
      }
    });
    return Array.from(depts).sort();
  }, [disbursements]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    return disbursements.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) {
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
        const invMatch = item.invoiceNo.toLowerCase().includes(q);
        const deptMatch = item.department.toLowerCase().includes(q);
        const destMatch = item.destination.toLowerCase().includes(q);
        const recMatch = item.receiver.toLowerCase().includes(q);
        const catMatch = item.category.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !invMatch && !deptMatch && !destMatch && !recMatch && !catMatch) return false;
      }

      return true;
    });
  }, [disbursements, selectedCategory, selectedDepartment, dateFilter, selectedYear, selectedMonth, searchTerm]);

  // Strict Chronological & Column Sorting
  const sortedData = useMemo(() => {
    const list = [...filteredData];

    list.sort((a, b) => {
      if (sortField === 'date') {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) {
          return sortDir === 'asc' ? dateCmp : -dateCmp;
        }
        const invA = Number(a.invoiceNo || 0);
        const invB = Number(b.invoiceNo || 0);
        if (!isNaN(invA) && !isNaN(invB) && invA !== invB) {
          return sortDir === 'asc' ? invA - invB : invB - invA;
        }
        return sortDir === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
      }

      if (sortField === 'invoiceNo') {
        const numA = Number(a.invoiceNo);
        const numB = Number(b.invoiceNo);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDir === 'asc' ? numA - numB : numB - numA;
        }
        return sortDir === 'asc' 
          ? a.invoiceNo.localeCompare(b.invoiceNo) 
          : b.invoiceNo.localeCompare(a.invoiceNo);
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
    const totalDisbursements = filteredData.length;
    const totalQty = filteredData.reduce((acc, curr) => acc + curr.qty, 0);
    const uniqueInvoices = new Set(filteredData.map(d => d.invoiceNo).filter(Boolean)).size;
    const uniqueDepts = new Set(filteredData.map(d => d.department).filter(d => d && d !== 'غير محدد')).size;

    return { totalDisbursements, totalQty, uniqueInvoices, uniqueDepts };
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
    setSelectedDepartment('all');
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
        { header: t('disbursements.invoiceNo'), key: 'invoiceNo', width: 15 },
        { header: t('disbursements.itemCode'), key: 'itemCode', width: 15 },
        { header: t('disbursements.itemName'), key: 'itemName', width: 35 },
        { header: t('disbursements.category'), key: 'category', width: 22 },
        { header: t('disbursements.qty'), key: 'qty', width: 15 },
        { header: t('common.unit'), key: 'unit', width: 12 },
        { header: t('disbursements.department'), key: 'department', width: 25 },
        { header: t('disbursements.receiver'), key: 'receiver', width: 20 },
        { header: t('disbursements.destination'), key: 'destination', width: 25 },
        { header: t('common.notes'), key: 'notes', width: 30 }
      ];

      const exportRows = sortedData.map((d, i) => ({
        seq: i + 1,
        date: d.date,
        invoiceNo: d.invoiceNo || '—',
        itemCode: d.itemCode,
        itemName: d.itemName,
        category: d.category,
        qty: d.qty,
        unit: d.unit,
        department: d.department,
        receiver: d.receiver,
        destination: d.destination,
        notes: d.notes
      }));

      await exportToExcel(
        t('disbursements.title'),
        'Disbursements',
        exportCols,
        exportRows,
        'Disbursements_Register'
      );
      toast.success(t('alerts.success'));
    } catch (e: any) {
      console.error(e);
      toast.error(t('alerts.error'));
    }
  };

  // Auto-Calculate Next Sequential Voucher Number
  const nextVoucherNumber = useMemo(() => {
    // Current active cycle started from #1 in May and reached #624 on Aug 30, 2026
    let maxNum = 0;
    disbursements.forEach(d => {
      const match = (d.invoiceNo || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum && num < 800) maxNum = num;
      }
    });
    return maxNum > 0 ? String(maxNum + 1) : '625';
  }, [disbursements]);

  // Pre-fill next sequential voucher number when opening form
  const handleOpenAddForm = () => {
    setForm(prev => ({
      ...prev,
      invoiceNo: prev.invoiceNo || nextVoucherNumber,
      date: new Date().toISOString().split('T')[0]
    }));
    setShowAddForm(true);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(t('disbursements.unauthorized'));
      return;
    }

    const validRows = rowItems.filter(r => r.itemId && r.qty > 0);
    if (validRows.length === 0) {
      toast.error(t('disbursements.validationError'));
      return;
    }

    // Frontend Stock Check
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
      const recordDisbursementFn = httpsCallable(functions, 'recordDisbursement');

      for (const row of validRows) {
        await recordDisbursementFn({
          itemId: row.itemId,
          qty: Number(row.qty),
          department: form.department,
          destination: form.destination.trim(),
          receiver: form.receiver.trim(),
          invoiceNo: form.invoiceNo.trim(),
          date: form.date,
          notes: form.notes.trim()
        });
      }

      toast.success(t('disbursements.saveSuccess'));
      setForm({ invoiceNo: '', department: 'أدوات كهربائية', destination: '', receiver: '', date: new Date().toISOString().split('T')[0], notes: '' });
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
      <div className="hide-on-print">
        
        {/* ──── PAGE HEADER ──── */}
        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <ArrowRightLeft size={26} />
              </div>
              <h1 className="heading-xl" style={{ margin: 0, fontWeight: 800 }}>{t('disbursements.title')}</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('disbursements.subtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isAdmin && (
              <>
                <button 
                  onClick={() => setShowAddForm(!showAddForm)} 
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', fontWeight: 700 }}
                >
                  <Plus size={18} /> {showAddForm ? t('disbursements.closeForm') : t('disbursements.recordDisbursement')}
                </button>

                <button 
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', fontWeight: 700, background: 'rgba(0, 229, 153, 0.08)' }}
                  title="مسح باركود الصنف لصرفه مباشرة"
                >
                  <Barcode size={18} /> {language === 'ar' ? 'مسح باركود' : 'Scan Barcode'}
                </button>
              </>
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
              onClick={handlePrintRegister} 
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
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('disbursements.statsDisbursements')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats.totalDisbursements.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>

          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('disbursements.statsQty')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{stats.totalQty.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>

          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('disbursements.statsVouchers')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{stats.uniqueInvoices.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>

          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('disbursements.statsDepts')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>{stats.uniqueDepts.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>
        </div>

        {/* ──── CREATE FORM (COLLAPSIBLE) ──── */}
        {isAdmin && showAddForm && (
          <form onSubmit={handleSubmit} className="enterprise-card animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', border: '2px solid #3b82f6' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <h2 className="heading-md" style={{ margin: 0, color: '#3b82f6' }}>{t('disbursements.formTitle')}</h2>
              <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)} style={{ padding: '0.4rem 1rem' }}>{t('common.cancel')}</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('disbursements.date')}</label>
                <input type="date" required className="input-field" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('disbursements.invoiceNo')}</label>
                <input type="text" required className="input-field" value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value})} placeholder="e.g. 2048" />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('disbursements.department')}</label>
                <select className="input-field" value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('disbursements.destination')}</label>
                <input type="text" required className="input-field" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="e.g. Building 4 - Unit 102" />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('disbursements.receiver')}</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={form.receiver} 
                  onChange={e => setForm({...form, receiver: e.target.value})} 
                  placeholder={language === 'ar' ? 'اسم الفني أو الشركة المستلمة...' : 'Technician or Company...'} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('common.notes')}</label>
                <input type="text" className="input-field" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder={t('disbursements.notesPlaceholder')} />
              </div>
            </div>

            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 className="heading-sm" style={{ margin: 0, fontWeight: 700 }}>{t('disbursements.disbursedItems')}</h3>
              <button type="button" className="btn btn-outline" onClick={addRow} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={16} /> {t('disbursements.addAnotherItem')}
              </button>
            </div>

            <div className="table-container" style={{ marginBottom: '1.5rem' }}>
              <table className="wms-table">
                <thead>
                  <tr>
                    <th>{t('common.item')}</th>
                    <th style={{ width: '180px' }}>{t('disbursements.qty')}</th>
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
                            <option value="">{t('disbursements.selectItemPlaceholder')}</option>
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
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: '#3b82f6', borderColor: '#3b82f6', padding: '0.75rem 2.5rem', fontWeight: 700 }}>
                {submitting ? t('disbursements.saving') : t('disbursements.saveBtn')}
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
                {t('disbursements.searchPlaceholder')}
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

            {/* Department */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                {t('disbursements.department')}
              </label>
              <select 
                className="input-field"
                value={selectedDepartment}
                onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
                style={{ width: '100%' }}
              >
                <option value="all">{t('monthlyReports.allDepartments')}</option>
                {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
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
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>{t('disbursements.loading')}</div>
          ) : sortedData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>{t('disbursements.emptyState')}</div>
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
                      onClick={() => handleSort('invoiceNo')} 
                      style={{ width: '110px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.5rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <span>{t('disbursements.invoiceNo')}</span>
                        {sortField === 'invoiceNo' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('itemCode')} 
                      style={{ width: '90px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.5rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <span>{t('disbursements.itemCode')}</span>
                        {sortField === 'itemCode' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('itemName')} 
                      style={{ minWidth: '220px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{t('disbursements.itemName')}</span>
                        {sortField === 'itemName' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('category')} 
                      style={{ width: '180px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{t('disbursements.category')}</span>
                        {sortField === 'category' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('qty')} 
                      style={{ width: '130px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.5rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <span>{t('disbursements.qty')}</span>
                        {sortField === 'qty' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('department')} 
                      style={{ width: '160px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{t('disbursements.department')}</span>
                        {sortField === 'department' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('receiver')} 
                      style={{ width: '160px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{t('disbursements.receiver')}</span>
                        {sortField === 'receiver' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleSort('destination')} 
                      style={{ minWidth: '160px', textAlign: language === 'ar' ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', padding: '0.75rem 0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{t('disbursements.destination')}</span>
                        {sortField === 'destination' ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
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
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {row.invoiceNo ? (
                            <span style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.08)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                              #{row.invoiceNo}
                            </span>
                          ) : '—'}
                        </td>
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
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.department || '—'}</td>
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>
                          {row.receiver && row.receiver !== 'فني الصيانة' ? row.receiver : '—'}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {row.destination && row.destination !== 'فني الصيانة' ? row.destination : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => handlePrintRow(row)} 
                            className="btn btn-outline" 
                            style={{ padding: '0.35rem 0.5rem', color: '#3b82f6', borderColor: 'var(--border-light)' }}
                            title={t('disbursements.printVoucher')}
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
        <div className="show-on-print-only official-document-paper" style={{ padding: '0', width: '100%', margin: '0', maxWidth: '100%', boxSizing: 'border-box' }}>
        <PrintHeader 
          title={t('disbursements.title')}
          subtitle={`${t('disbursements.subtitle')} - ${t('common.showing')}: ${stats.totalDisbursements} ${t('common.records')} (${stats.totalQty} ${t('common.quantity')})`}
          category={selectedCategory === 'all' ? t('common.allCategories') : selectedCategory}
        />

        <table className="wms-table official-print-table" style={{ width: '100%', maxWidth: '100%', minWidth: 0, marginTop: '0.75rem', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '8pt' }}>
          <thead>
            <tr>
              <th style={{ width: '4%' }}>{t('common.seq')}</th>
              <th style={{ width: '10%' }}>{t('common.date')}</th>
              <th style={{ width: '8%' }}>{t('disbursements.invoiceNo')}</th>
              <th style={{ width: '11%' }}>{t('disbursements.itemCode')}</th>
              <th style={{ width: '25%' }}>{t('disbursements.itemName')}</th>
              <th style={{ width: '13%' }}>{t('disbursements.category')}</th>
              <th style={{ width: '8%' }}>{t('disbursements.qty')}</th>
              <th style={{ width: '11%' }}>{t('disbursements.department')}</th>
              <th style={{ width: '10%' }}>{t('disbursements.receiver')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr key={row.id || idx} style={{ height: '22px' }}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ textAlign: 'center' }}>{row.date}</td>
                <td style={{ textAlign: 'center' }}>#{row.invoiceNo || '—'}</td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{row.itemCode}</td>
                <td style={{ fontWeight: 600 }}>{row.itemName}</td>
                <td style={{ fontSize: '7.5pt' }}>{row.category}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>-{row.qty} {row.unit}</td>
                <td style={{ fontSize: '7.5pt' }}>{row.department || '—'}</td>
                <td style={{ fontSize: '7.5pt' }}>{row.receiver && row.receiver !== 'فني الصيانة' ? row.receiver : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <PrintSignatures documentTitle="سجل حركات صرف المخزن" />
        </div>
      )}

      {/* ──── SINGLE ITEM VOUCHER PRINT VIEW (Centered Official Certificate Frame) ──── */}
      {printItem && (
        <div className="show-on-print-only official-document-paper" style={{ padding: '0', width: '100%', margin: '0', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div style={{ border: '2px solid var(--accent-primary)', borderRadius: '10px', padding: '1.25rem', background: '#ffffff', boxSizing: 'border-box' }}>
            <PrintHeader 
              title={t('disbursements.singleVoucherTitle')}
              subtitle={`${t('disbursements.invoiceNo')}: #${printItem.invoiceNo || '—'} - ${t('common.date')}: ${printItem.date}`}
              category={printItem.category}
            />

            <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '9.5pt' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div><strong>{t('disbursements.department')}:</strong> {printItem.department || '—'}</div>
                <div><strong>{t('disbursements.destination')}:</strong> {printItem.destination || '—'}</div>
                <div><strong>{t('disbursements.receiver')}:</strong> {printItem.receiver || '—'}</div>
                <div><strong>{t('common.notes')}:</strong> {printItem.notes || '—'}</div>
              </div>

              <table className="wms-table official-print-table" style={{ width: '100%', maxWidth: '100%', minWidth: 0, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '9pt' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ width: '16%' }}>{t('disbursements.itemCode')}</th>
                    <th style={{ width: '42%' }}>{t('disbursements.itemName')}</th>
                    <th style={{ width: '20%' }}>{t('disbursements.category')}</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>{t('disbursements.qty')}</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>{t('common.unit')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ height: '32px' }}>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{printItem.itemCode}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{printItem.itemName}</td>
                    <td>{printItem.category}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.15rem', color: '#ef4444' }}>-{printItem.qty}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{printItem.unit}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <PrintSignatures documentTitle={`إذن صرف رسمي معتمد #${printItem.invoiceNo || '—'}`} />
          </div>
        </div>
      )}

      {/* Barcode & QR Code Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="مسح باركود الأصناف للصرف"
        subtitle="امسح باركود الصنف ليتم إدراجه فوراً في إذن الصرف أو تصفية السجل"
      />

    </div>
  );
}
