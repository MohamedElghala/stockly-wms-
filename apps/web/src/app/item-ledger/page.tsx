'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { 
  Search, Printer, History, AlertTriangle, Package2, 
  ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Trash2,
  FileSpreadsheet, CheckCircle2, Layers, RotateCcw, Filter
} from 'lucide-react';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import { exportToExcel } from '@/lib/excelExport';
import toast from 'react-hot-toast';

interface LedgerRecord {
  id: string;
  date: string;
  timestamp: number;
  type: 'OPENING' | 'IN' | 'OUT' | 'SCRAP';
  qty: number;
  balance: number;
  invoiceNo?: string;
  reference?: string;
  notes?: string;
}

type TxFilter = 'ALL' | 'IN' | 'OUT' | 'SCRAP';

export default function ItemLedgerPage() {
  const { userData } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [txFilter, setTxFilter] = useState<TxFilter>('ALL');
  
  const [ledgerData, setLedgerData] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // ──── Roles: Super Admin Only ────
  const isAdmin = userData?.role === 'admin' || userData?.email?.toLowerCase() === 'mohamedalghala@gmail.com' || userData?.email?.toLowerCase().startsWith('admin');

  useEffect(() => {
    if (userData && !isAdmin) {
      router.replace('/dashboard');
      return;
    }
  }, [userData, isAdmin, router]);

  // Fetch Items
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((item: any) => item.name && item.name.trim() !== '');
      setItems(list);
    });
    return () => unsubItems();
  }, []);

  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId), [items, selectedItemId]);

  // Top Active Quick Pick Items
  const quickItems = useMemo(() => {
    return items.slice(0, 6);
  }, [items]);

  // Autocomplete Filter
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return items.filter(i => 
      (i.name && i.name.toLowerCase().includes(term)) || 
      (i.code && i.code.toLowerCase().includes(term)) ||
      (i.category && i.category.toLowerCase().includes(term))
    ).slice(0, 10);
  }, [items, searchTerm]);

  const handleSelect = (item: any) => {
    setSelectedItemId(item.id);
    setSearchTerm(`${item.name} (${item.code || ''})`);
  };

  // Fetch and Calculate Item Ledger
  const generateLedger = async () => {
    if (!selectedItem) return;
    setLoading(true);

    try {
      const records: Omit<LedgerRecord, 'balance'>[] = [];
      const itemCode = String(selectedItem.code || '').trim();
      const itemName = String(selectedItem.name || '').trim();

      // 1. Opening Balance
      records.push({
        id: 'opening',
        date: '2025-01-01',
        timestamp: new Date('2025-01-01').getTime(),
        type: 'OPENING',
        qty: Number(selectedItem.openingBalance || selectedItem.stock || 0),
        notes: t('itemLedger.typeOpening')
      });

      // 2. Fetch Additions (IN)
      const snapAdd = await getDocs(collection(db, 'additions'));
      snapAdd.forEach(doc => {
        const d = doc.data();
        const docCode = String(d.itemCode || d.code || '').trim();
        const docName = String(d.itemName || d.name || '').trim();

        if ((itemCode && docCode === itemCode) || (docName && docName === itemName)) {
          const dateStr = d.date || (d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '2026-01-01');
          records.push({
            id: doc.id,
            date: dateStr,
            timestamp: typeof d.createdAt === 'number' ? d.createdAt : new Date(dateStr).getTime(),
            type: 'IN',
            qty: Number(d.qty || d.quantity || 0),
            invoiceNo: String(d.invoiceNo || d.reportNo || '').trim(),
            reference: String(d.supplier || d.createdByName || '—').trim(),
            notes: String(d.notes || '—').trim()
          });
        }
      });

      // 3. Fetch Disbursements (OUT)
      const snapDisb = await getDocs(collection(db, 'disbursements'));
      snapDisb.forEach(doc => {
        const d = doc.data();
        const docCode = String(d.itemCode || d.code || '').trim();
        const docName = String(d.itemName || d.name || '').trim();

        if ((itemCode && docCode === itemCode) || (docName && docName === itemName)) {
          const dateStr = d.date || (d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '2026-01-01');
          const dept = String(d.department || d.reason || '').trim();
          const rawRec = String(d.receiver || '').trim();
          const rec = (rawRec && rawRec !== 'فني الصيانة' && rawRec !== '—') ? rawRec : '';
          const rawDest = String(d.destination || '').trim();
          const dest = (rawDest && rawDest !== 'فني الصيانة' && rawDest !== '—') ? rawDest : '';
          const refStr = [dept, rec, dest ? `(${dest})` : ''].filter(Boolean).join(' - ');

          records.push({
            id: doc.id,
            date: dateStr,
            timestamp: typeof d.createdAt === 'number' ? d.createdAt : new Date(dateStr).getTime(),
            type: 'OUT',
            qty: Number(d.qty || d.quantity || 0),
            invoiceNo: String(d.invoiceNo || d.reportNo || '').trim(),
            reference: refStr || '—',
            notes: String(d.notes || '—').trim()
          });
        }
      });

      // 4. Fetch Scrap (SCRAP)
      const snapScrap = await getDocs(collection(db, 'scrap'));
      snapScrap.forEach(doc => {
        const d = doc.data();
        const docCode = String(d.itemCode || d.code || '').trim();
        const docName = String(d.itemName || d.name || '').trim();

        if ((itemCode && docCode === itemCode) || (docName && docName === itemName)) {
          const dateStr = d.date || (d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '2026-01-01');
          records.push({
            id: doc.id,
            date: dateStr,
            timestamp: typeof d.createdAt === 'number' ? d.createdAt : new Date(dateStr).getTime(),
            type: 'SCRAP',
            qty: Number(d.qty || d.quantity || 0),
            invoiceNo: String(d.reportNo || '').trim(),
            reference: t('itemLedger.typeScrap'),
            notes: String(d.reason || d.notes || '—').trim()
          });
        }
      });

      // Strict Chronological Sort: Opening First, then Date ASC, timestamp ASC
      records.sort((a, b) => {
        if (a.type === 'OPENING') return -1;
        if (b.type === 'OPENING') return 1;
        const cmp = a.date.localeCompare(b.date);
        if (cmp !== 0) return cmp;
        return a.timestamp - b.timestamp;
      });

      // Calculate Running Balance
      let running = 0;
      const calculatedList: LedgerRecord[] = records.map(r => {
        if (r.type === 'OPENING' || r.type === 'IN') {
          running += r.qty;
        } else if (r.type === 'OUT' || r.type === 'SCRAP') {
          running -= r.qty;
        }
        return { ...r, balance: running };
      });

      setLedgerData(calculatedList);

    } catch (error) {
      console.error("Error generating ledger:", error);
      toast.error(t('alerts.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItemId) {
      generateLedger();
    } else {
      setLedgerData([]);
    }
  }, [selectedItemId]);

  // Statistics for Selected Item
  const itemStats = useMemo(() => {
    if (!selectedItem || ledgerData.length === 0) return null;

    const opening = ledgerData.find(r => r.type === 'OPENING')?.qty || 0;
    const totalIn = ledgerData.filter(r => r.type === 'IN').reduce((acc, c) => acc + c.qty, 0);
    const totalOut = ledgerData.filter(r => r.type === 'OUT').reduce((acc, c) => acc + c.qty, 0);
    const totalScrap = ledgerData.filter(r => r.type === 'SCRAP').reduce((acc, c) => acc + c.qty, 0);
    const finalCalculated = ledgerData[ledgerData.length - 1]?.balance || 0;
    const currentStock = Number(selectedItem.stock || 0);

    return {
      opening,
      totalIn,
      inCount: ledgerData.filter(r => r.type === 'IN').length,
      totalOut,
      outCount: ledgerData.filter(r => r.type === 'OUT').length,
      totalScrap,
      scrapCount: ledgerData.filter(r => r.type === 'SCRAP').length,
      finalCalculated,
      currentStock,
      isBalanced: finalCalculated === currentStock
    };
  }, [selectedItem, ledgerData]);

  // Filtered Display List
  const displayLedger = useMemo(() => {
    if (txFilter === 'ALL') return ledgerData;
    return ledgerData.filter(r => {
      if (txFilter === 'IN') return r.type === 'IN' || r.type === 'OPENING';
      if (txFilter === 'OUT') return r.type === 'OUT';
      if (txFilter === 'SCRAP') return r.type === 'SCRAP';
      return true;
    });
  }, [ledgerData, txFilter]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'OPENING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', fontWeight: 600, fontSize: '0.8rem' }}>
            <Package2 size={14} /> {t('itemLedger.typeOpening')}
          </span>
        );
      case 'IN':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontWeight: 600, fontSize: '0.8rem' }}>
            <ArrowDownToLine size={14} /> {t('itemLedger.typeIn')}
          </span>
        );
      case 'OUT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', fontWeight: 600, fontSize: '0.8rem' }}>
            <ArrowUpFromLine size={14} /> {t('itemLedger.typeOut')}
          </span>
        );
      case 'SCRAP':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>
            <Trash2 size={14} /> {t('itemLedger.typeScrap')}
          </span>
        );
      default:
        return null;
    }
  };

  const handleExportExcel = async () => {
    if (!selectedItem || ledgerData.length === 0) return;
    try {
      const cols = [
        { header: '#', key: 'seq', width: 8 },
        { header: t('common.date'), key: 'date', width: 14 },
        { header: t('itemLedger.transactionType'), key: 'type', width: 18 },
        { header: t('itemLedger.invoiceNo'), key: 'invoiceNo', width: 15 },
        { header: t('itemLedger.party'), key: 'reference', width: 28 },
        { header: t('itemLedger.inboundQty'), key: 'inQty', width: 14 },
        { header: t('itemLedger.outboundQty'), key: 'outQty', width: 14 },
        { header: t('itemLedger.runningBalance'), key: 'balance', width: 16 },
        { header: t('common.notes'), key: 'notes', width: 30 }
      ];

      const rows = ledgerData.map((r, idx) => ({
        seq: idx + 1,
        date: r.date,
        type: r.type === 'OPENING' ? t('itemLedger.typeOpening') : r.type === 'IN' ? t('itemLedger.typeIn') : r.type === 'OUT' ? t('itemLedger.typeOut') : t('itemLedger.typeScrap'),
        invoiceNo: r.invoiceNo ? `#${r.invoiceNo}` : '—',
        reference: r.reference || '—',
        inQty: r.type === 'OPENING' || r.type === 'IN' ? r.qty : 0,
        outQty: r.type === 'OUT' || r.type === 'SCRAP' ? r.qty : 0,
        balance: r.balance,
        notes: r.notes || '—'
      }));

      await exportToExcel(
        `${t('itemLedger.title')} - [${selectedItem.code || ''}] ${selectedItem.name}`,
        'ItemLedger',
        cols,
        rows,
        `Item_Ledger_${selectedItem.code || 'item'}`
      );
      toast.success(t('alerts.success'));
    } catch (e) {
      console.error(e);
      toast.error(t('alerts.error'));
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* ──── SCREEN VIEW (HIDDEN ON PRINT) ──── */}
      <div className="hide-on-print">
        
        {/* ──── PAGE HEADER ──── */}
        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'rgba(9, 154, 117, 0.12)', color: '#099A75' }}>
                <History size={26} />
              </div>
              <h1 className="heading-xl" style={{ margin: 0, fontWeight: 800 }}>{t('itemLedger.title')}</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('itemLedger.subtitle')}
            </p>
          </div>

          {selectedItem && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleExportExcel} 
                className="btn btn-outline" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', color: '#099A75', borderColor: '#099A75', fontWeight: 600 }}
              >
                <FileSpreadsheet size={18} /> {t('itemLedger.exportExcel')}
              </button>

              <button 
                onClick={() => { setTimeout(() => window.print(), 100); }} 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', fontWeight: 600 }}
              >
                <Printer size={18} /> {t('itemLedger.printLedger')}
              </button>
            </div>
          )}
        </div>

        {/* ──── SEARCH PANEL ──── */}
        <div className="enterprise-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {t('itemLedger.searchLabel')}
            </label>
            
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field"
                placeholder={t('itemLedger.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === '') setSelectedItemId('');
                }}
                style={{ 
                  [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '3rem', 
                  width: '100%', 
                  fontSize: '1rem', 
                  paddingTop: '0.85rem',
                  paddingBottom: '0.85rem'
                }}
              />
            </div>
            
            {/* Autocomplete Dropdown */}
            {searchTerm && !selectedItemId && filteredSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, 
                background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
                borderRadius: '10px', marginTop: '0.5rem', zIndex: 50,
                boxShadow: 'var(--shadow-lg)', maxHeight: '320px', overflowY: 'auto'
              }}>
                {filteredSuggestions.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => handleSelect(item)}
                    style={{
                      padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                    className="settings-menu-item"
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.category}</div>
                    </div>
                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                      <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(9, 154, 117, 0.1)', color: '#099A75', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                        {item.code || 'NO-CODE'}
                      </span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {t('inventory.stock')}: <strong>{item.stock}</strong> {item.unit || ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Pick Chips */}
            {!selectedItemId && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {t('itemLedger.quickSelect')}
                </span>
                {quickItems.map(qi => (
                  <button
                    key={qi.id}
                    type="button"
                    onClick={() => handleSelect(qi)}
                    className="btn btn-outline"
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', borderRadius: '16px' }}
                  >
                    [{qi.code}] {qi.name}
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          {t('common.loading')}
        </div>
      )}

      {/* Selected Item Ledger Display */}
      {selectedItem && !loading && itemStats && (
        <div className="official-document-paper enterprise-card animate-fade-in" style={{ padding: '2rem' }}>
          
          <PrintHeader 
            title={`${t('itemLedger.title')} - [${selectedItem.code || '-'}] ${selectedItem.name}`}
            subtitle={`${t('itemLedger.category')}: ${selectedItem.category} | ${t('itemLedger.unit')}: ${selectedItem.unit || 'عدد'} | ${t('itemLedger.currentStock')}: ${selectedItem.stock || 0} ${selectedItem.unit || ''}`}
            category={selectedItem.category}
          />

          {/* ──── ITEM KPI SUMMARY METRIC CARDS ──── */}
          <div className="hide-on-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
            
            {/* Current Stock */}
            <div className="enterprise-card" style={{ padding: '1rem 1.25rem', background: 'rgba(9, 154, 117, 0.04)', border: '1px solid rgba(9, 154, 117, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('itemLedger.currentStock')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#099A75', marginTop: '0.25rem' }}>
                {itemStats.currentStock.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {selectedItem.unit || ''}
              </div>
            </div>

            {/* Total Inbound */}
            <div className="enterprise-card" style={{ padding: '1rem 1.25rem', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('itemLedger.totalIn')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                +{itemStats.totalIn.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginInlineStart: '4px' }}>
                  ({itemStats.inCount})
                </span>
              </div>
            </div>

            {/* Total Outbound */}
            <div className="enterprise-card" style={{ padding: '1rem 1.25rem', background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('itemLedger.totalOut')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>
                -{itemStats.totalOut.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginInlineStart: '4px' }}>
                  ({itemStats.outCount})
                </span>
              </div>
            </div>

            {/* Total Scrap */}
            <div className="enterprise-card" style={{ padding: '1rem 1.25rem', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('itemLedger.totalScrap')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>
                -{itemStats.totalScrap.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginInlineStart: '4px' }}>
                  ({itemStats.scrapCount})
                </span>
              </div>
            </div>

          </div>

          {/* ──── TRANSACTION TYPE FILTER BUTTONS ──── */}
          <div className="hide-on-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setTxFilter('ALL')}
              className={`btn ${txFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {t('itemLedger.filterAll')} ({ledgerData.length})
            </button>
            <button
              onClick={() => setTxFilter('IN')}
              className={`btn ${txFilter === 'IN' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: txFilter === 'IN' ? undefined : '#10b981' }}
            >
              {t('itemLedger.filterIn')} ({itemStats.inCount + 1})
            </button>
            <button
              onClick={() => setTxFilter('OUT')}
              className={`btn ${txFilter === 'OUT' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: txFilter === 'OUT' ? undefined : '#3b82f6' }}
            >
              {t('itemLedger.filterOut')} ({itemStats.outCount})
            </button>
            <button
              onClick={() => setTxFilter('SCRAP')}
              className={`btn ${txFilter === 'SCRAP' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: txFilter === 'SCRAP' ? undefined : '#ef4444' }}
            >
              {t('itemLedger.filterScrap')} ({itemStats.scrapCount})
            </button>
          </div>

          {/* ──── TABLE CONTAINER ──── */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="wms-table official-print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '105px', textAlign: 'center' }}>{t('common.date')}</th>
                  <th style={{ width: '150px' }}>{t('itemLedger.transactionType')}</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>{t('itemLedger.invoiceNo')}</th>
                  <th>{t('itemLedger.party')}</th>
                  <th style={{ width: '95px', textAlign: 'center' }}>{t('itemLedger.inboundQty')}</th>
                  <th style={{ width: '95px', textAlign: 'center' }}>{t('itemLedger.outboundQty')}</th>
                  <th style={{ width: '120px', textAlign: 'center', background: 'rgba(9, 154, 117, 0.08)', color: '#099A75' }}>
                    {t('itemLedger.runningBalance')}
                  </th>
                  <th>{t('itemLedger.notes')}</th>
                </tr>
              </thead>

              <tbody>
                {displayLedger.map((row, idx) => {
                  const isIn = row.type === 'IN' || row.type === 'OPENING';
                  const isOut = row.type === 'OUT' || row.type === 'SCRAP';

                  return (
                    <tr key={`${row.id}-${idx}`} style={{ background: row.type === 'OPENING' ? 'rgba(139, 92, 246, 0.03)' : 'transparent' }}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.date}</td>
                      <td>{getTypeBadge(row.type)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                        {row.invoiceNo ? `#${row.invoiceNo}` : '—'}
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.reference || '—'}</td>
                      
                      {/* Inbound */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: isIn ? '#10b981' : 'var(--text-muted)' }}>
                        {isIn ? `+${row.qty}` : '—'}
                      </td>

                      {/* Outbound */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: isOut ? '#ef4444' : 'var(--text-muted)' }}>
                        {isOut ? `-${row.qty}` : '—'}
                      </td>

                      {/* Running Balance */}
                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#099A75', background: 'rgba(9, 154, 117, 0.03)' }}>
                        {row.balance}
                      </td>

                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.notes}</td>
                    </tr>
                  );
                })}

                {displayLedger.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('itemLedger.noMovements')}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer Summary */}
              {displayLedger.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-light)', background: 'var(--bg-tertiary)' }}>
                    <td colSpan={5} style={{ textAlign: language === 'ar' ? 'left' : 'right', fontWeight: 700, padding: '1rem' }}>
                      {t('itemLedger.finalCalculated')}:
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#10b981' }}>
                      +{itemStats.totalIn + itemStats.opening}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#ef4444' }}>
                      -{itemStats.totalOut + itemStats.totalScrap}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', color: '#099A75', background: 'rgba(9, 154, 117, 0.1)', padding: '1rem' }}>
                      {itemStats.finalCalculated} {selectedItem.unit || ''}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Audit Verification Check / Warning */}
          <div style={{ marginTop: '1.5rem' }}>
            {itemStats.isBalanced ? (
              <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={20} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {language === 'ar' 
                    ? 'المطابقة الدفترية سليمة: الرصيد التراكمي المحسوب يتطابق تماماً مع الرصيد المخزني الفعلي المسجل في النظام ✅'
                    : 'Audit Verified: Calculated running transaction balance matches current database inventory stock ✅'
                  }
                </span>
              </div>
            ) : (
              <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertTriangle size={20} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {t('itemLedger.auditMismatchWarning')
                    .replace('{calc}', String(itemStats.finalCalculated))
                    .replace('{stock}', String(itemStats.currentStock))
                  }
                </span>
              </div>
            )}
          </div>

          <div style={{ marginTop: '3rem' }}>
            <PrintSignatures documentTitle="كارت الصنف وحساب الأستاذ المخزني" />
          </div>

        </div>
      )}

      {/* Empty State when no item is selected */}
      {!selectedItem && !loading && (
        <div className="enterprise-card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <History size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: 'var(--text-primary)' }}>{t('itemLedger.title')}</h3>
          <p style={{ margin: 0, maxWidth: '450px', marginInline: 'auto' }}>{t('itemLedger.selectItemPrompt')}</p>
        </div>
      )}

    </div>
  );
}
