'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  FileText, 
  Check, 
  Eye, 
  TrendingDown, 
  Layers, 
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Clock,
  Building2,
  CheckCheck
} from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function NotificationBell() {
  const { user, userData } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Data states
  const [items, setItems] = useState<any[]>([]);
  const [additions, setAdditions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'SUPPLIES' | 'ANOMALIES' | 'REQUESTS'>('SUPPLIES');

  // Real-time Subscriptions
  useEffect(() => {
    // 1. Items subscription (to detect negative stock & shortages)
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setItems(list);
    });

    // 2. Additions subscription (recent supplies)
    const unsubAdditions = onSnapshot(collection(db, 'additions'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAdditions(list.slice(0, 30));
    });

    // 3. Requests subscription (pending requests)
    const unsubRequests = onSnapshot(collection(db, 'materialRequests'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.status === 'pending') {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRequests(list.slice(0, 20));
    });

    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubItems();
      unsubAdditions();
      unsubRequests();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Items map by code/name for quick lookup
  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach(i => {
      const c = String(i.code || i.id || '').trim();
      const n = String(i.name || '').trim();
      if (c) map.set(c, i);
      if (n) map.set(n, i);
    });
    return map;
  }, [items]);

  // 1. Negative Stock Anomalies (< 0)
  const negativeStockItems = useMemo(() => {
    return items.filter(i => (Number(i.stock) || 0) < 0);
  }, [items]);

  // 2. Supplies with remaining stock calculation
  const supplyBatches = useMemo(() => {
    return additions.map(add => {
      const itemCode = String(add.itemCode || add.code || '').trim();
      const itemName = String(add.itemName || add.name || '').trim();
      const item = itemsMap.get(itemCode) || itemsMap.get(itemName);
      
      const currentStock = item ? (Number(item.stock) || 0) : 0;
      const suppliedQty = Number(add.qty) || 0;
      const remainingInStock = Math.max(0, Math.min(suppliedQty, currentStock));
      const remainingPercent = suppliedQty > 0 ? Math.min(100, Math.round((remainingInStock / suppliedQty) * 100)) : 0;

      return {
        ...add,
        item,
        currentStock,
        suppliedQty,
        remainingInStock,
        remainingPercent,
        isVerified: Boolean(add.verified)
      };
    });
  }, [additions, itemsMap]);

  // Role & Department Filtering Logic
  const isSuperAdmin = user?.email === 'mohamedalghala@gmail.com' || userData?.role === 'admin' || userData?.role === 'management' || userData?.role === 'supervisor';
  const userCategory = (userData?.category || userData?.department || '').trim();

  // Filtered supplies according to user department
  const visibleSupplyBatches = useMemo(() => {
    if (isSuperAdmin || !userCategory || userCategory === 'all') {
      return supplyBatches;
    }
    return supplyBatches.filter(s => {
      const cat = (s.category || '').trim();
      return cat.includes(userCategory) || userCategory.includes(cat);
    });
  }, [supplyBatches, isSuperAdmin, userCategory]);

  // Filtered negative stock items
  const visibleNegativeStockItems = useMemo(() => {
    if (isSuperAdmin || !userCategory || userCategory === 'all') {
      return negativeStockItems;
    }
    return negativeStockItems.filter(i => {
      const cat = (i.category || '').trim();
      return cat.includes(userCategory) || userCategory.includes(cat);
    });
  }, [negativeStockItems, isSuperAdmin, userCategory]);

  // Filtered requests
  const visibleRequests = useMemo(() => {
    if (isSuperAdmin) {
      return requests;
    }
    return requests.filter(r => {
      const dept = (r.department || '').trim();
      const isOwner = r.userId === user?.uid;
      return isOwner || (userCategory && (dept.includes(userCategory) || userCategory.includes(dept)));
    });
  }, [requests, isSuperAdmin, user, userCategory]);

  // Total action alert badge count (Items needing settlement + Pending requests)
  const totalAlertsCount = visibleNegativeStockItems.length + visibleRequests.length;

  // Mark Supply as Verified
  const handleVerifySupply = async (supplyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'additions', supplyId), {
        verified: true,
        verifiedBy: userData?.name || 'أمين المخزن',
        verifiedAt: new Date().toISOString()
      });
      toast.success(language === 'ar' ? 'تم فحص واعتماد التوريدة بنجاح!' : 'Supply verified successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error verifying supply');
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative' }}>
      
      {/* Bell Trigger Button */}
      <button 
        className="btn btn-glass" 
        style={{ 
          position: 'relative', 
          padding: '0.6rem', 
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: visibleNegativeStockItems.length > 0 ? '#ef4444' : (totalAlertsCount > 0 ? 'var(--accent-primary)' : 'var(--text-primary)'),
          borderColor: visibleNegativeStockItems.length > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined,
          background: visibleNegativeStockItems.length > 0 ? 'rgba(239, 68, 68, 0.12)' : undefined
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="مركز الإشعارات وتنبيهات التوريدات والأرصدة"
      >
        <Bell size={20} className={visibleNegativeStockItems.length > 0 ? 'animate-bounce' : ''} />
        
        {/* Count Badge */}
        {totalAlertsCount > 0 && (
          <span 
            style={{
              position: 'absolute', 
              top: '-3px', 
              right: '-3px',
              background: visibleNegativeStockItems.length > 0 ? '#ef4444' : 'var(--accent-primary)', 
              color: 'white',
              borderRadius: '50%', 
              width: '20px', 
              height: '20px',
              fontSize: '0.72rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 800,
              boxShadow: '0 0 8px rgba(0,0,0,0.4)'
            }}
          >
            {totalAlertsCount > 9 ? '9+' : totalAlertsCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div 
          className="enterprise-card animate-fade-in notifications-dropdown-menu"
          style={{
            position: 'absolute', 
            top: 'calc(100% + 10px)', 
            right: isRTL ? '-60px' : '0',
            left: isRTL ? 'auto' : 'auto',
            width: '390px', 
            maxWidth: '90vw',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)', 
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(0, 229, 153, 0.15)', 
            zIndex: 1200,
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            direction: isRTL ? 'rtl' : 'ltr'
          }}
        >
          {/* Header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} color="var(--accent-primary)" />
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {language === 'ar' ? 'مركز التنبيهات ومتابعة التوريدات' : 'Notifications & Supply Tracker'}
              </strong>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(0, 229, 153, 0.12)', color: 'var(--accent-primary)', fontWeight: 700 }}>
              {totalAlertsCount} تنبيه
            </span>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-tertiary)' }}>
            
            {/* Supplies Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('SUPPLIES')}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                border: 'none',
                borderBottom: activeTab === 'SUPPLIES' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                background: activeTab === 'SUPPLIES' ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === 'SUPPLIES' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'SUPPLIES' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Package size={14} />
              <span>أحدث التوريدات ({visibleSupplyBatches.length})</span>
            </button>

            {/* Negative Stock Anomalies Tab (يتطلب تسوية) */}
            <button
              type="button"
              onClick={() => setActiveTab('ANOMALIES')}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                border: 'none',
                borderBottom: activeTab === 'ANOMALIES' ? '2px solid #ef4444' : '2px solid transparent',
                background: activeTab === 'ANOMALIES' ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === 'ANOMALIES' ? '#ef4444' : 'var(--text-muted)',
                fontWeight: activeTab === 'ANOMALIES' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <AlertTriangle size={14} />
              <span>يتطلب تسوية ({visibleNegativeStockItems.length})</span>
            </button>

            {/* Requests Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('REQUESTS')}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                border: 'none',
                borderBottom: activeTab === 'REQUESTS' ? '2px solid #3b82f6' : '2px solid transparent',
                background: activeTab === 'REQUESTS' ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === 'REQUESTS' ? '#3b82f6' : 'var(--text-muted)',
                fontWeight: activeTab === 'REQUESTS' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <FileText size={14} />
              <span>الطلبات ({visibleRequests.length})</span>
            </button>

          </div>
          
          {/* Tab Content List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
            
            {/* ──── 1. SUPPLIES TAB ──── */}
            {activeTab === 'SUPPLIES' && (
              <div>
                {visibleSupplyBatches.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    لا توجد توريدات مسجلة حالياً
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {visibleSupplyBatches.map(supply => (
                      <div 
                        key={supply.id}
                        onClick={() => { 
                          setIsOpen(false); 
                          router.push(`/additions?search=${encodeURIComponent(supply.invoiceNo || supply.itemCode)}&printId=${supply.id}`); 
                        }}
                        style={{
                          padding: '0.85rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-tertiary)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Supply Title Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                              فاتورة رقم: {supply.invoiceNo || '—'}
                            </span>
                            <h4 style={{ margin: '0.15rem 0 0 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {supply.itemName}
                            </h4>
                          </div>
                          
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {supply.date}
                          </span>
                        </div>

                        {/* Supplier & Category */}
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>المورد: {supply.supplier || '—'}</span>
                          <span>{supply.category}</span>
                        </div>

                        {/* Quantity & Remaining Progress */}
                        <div style={{ marginTop: '0.2rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                            <span>الكمية الموردة: <strong style={{ color: 'var(--text-primary)' }}>{supply.suppliedQty} {supply.unit}</strong></span>
                            <span style={{ color: supply.remainingInStock > 0 ? 'var(--accent-primary)' : '#ef4444', fontWeight: 700 }}>
                              المتبقي بالمخزن: {supply.remainingInStock} ({supply.remainingPercent}%)
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div style={{ height: '5px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${supply.remainingPercent}%`, background: supply.remainingPercent > 20 ? 'var(--accent-primary)' : '#ef4444', transition: 'width 0.3s' }}></div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──── 2. NEGATIVE STOCK & ANOMALIES TAB ──── */}
            {activeTab === 'ANOMALIES' && (
              <div>
                {visibleNegativeStockItems.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#10b981', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={32} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <strong>ممتاز! لا توجد أي أرصدة سالبة في المخزن</strong>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>جميع الأرصدة وحسابات الصرف والوارد سليمة 100%</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700 }}>
                      ⚠️ تحذير: تم رصد ({visibleNegativeStockItems.length}) صنف برصيد سالب! يرجى مراجعة رصيد أول المدة أو أذونات الوارد لتصحيحه.
                    </div>
                    {visibleNegativeStockItems.map(item => (
                      <div 
                        key={item.id}
                        style={{
                          padding: '0.85rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#ef4444', fontFamily: 'monospace', fontWeight: 700 }}>كود: {item.code}</div>
                          <h4 style={{ margin: '0.2rem 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الفئة: {item.category}</span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '1.15rem', fontWeight: 800, color: '#ef4444' }}>
                            {item.stock} {item.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setIsOpen(false); router.push('/inventory'); }}
                            className="btn btn-outline"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#ef4444', borderColor: '#ef4444', marginTop: '0.3rem', fontWeight: 700 }}
                          >
                            تصحيح الرصيد
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──── 3. REQUESTS TAB ──── */}
            {activeTab === 'REQUESTS' && (
              <div>
                {visibleRequests.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    لا توجد طلبات صرف معلقة حالياً
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {visibleRequests.map(req => (
                      <div 
                        key={req.id}
                        onClick={() => { setIsOpen(false); router.push('/requests'); }}
                        style={{
                          padding: '0.85rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-tertiary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                          <span style={{ color: '#3b82f6', fontWeight: 700 }}>طلب رقم: {req.requestNo || req.id}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{req.department || '—'}</span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {req.requesterName || req.userName || 'موظف'}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          عدد الأصناف المطلوبة: {req.items?.length || 1} صنف
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer Navigation */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => { setIsOpen(false); router.push('/additions'); }}
              className="btn btn-outline" 
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
            >
              <Package size={13} />
              <span>سجل الوارد والتوريدات</span>
            </button>

            <button 
              type="button" 
              onClick={() => { setIsOpen(false); router.push('/inventory'); }}
              className="btn btn-outline" 
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ExternalLink size={13} />
              <span>أرصدة المخزون</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
