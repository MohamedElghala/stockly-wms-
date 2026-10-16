'use client';
import BrandLoader from '@/components/common/BrandLoader';
import { calculateInventoryMetrics, getItemPackagingInfo, ItemPackagingInfo, PackagingBreakdown } from '@/lib/inventoryMetrics';
import { normalizeCategory } from '@/types/inventory';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Package, 
  TrendingDown, 
  ArrowRightLeft, 
  Archive, 
  Users, 
  Activity, 
  BarChart2, 
  PlusCircle, 
  ShoppingCart, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Percent,
  X,
  Info,
  Sparkles,
  Search,
  ChevronRight,
  Boxes
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area 
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function useCounter(end: number, duration: number = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);
  return count;
}

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedReqStatus, setSelectedReqStatus] = useState<string>('ALL');

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const { userData, loading: authLoading } = useAuth();
  
  const role = userData?.role || 'user';
  const jobTitle = userData?.jobTitle || '';
  const cleanEmail = (userData?.email || '').toLowerCase();

  const isAdmin = role === 'admin' || cleanEmail === 'mohamedalghala@gmail.com' || cleanEmail.startsWith('admin');
  const isManagement = role === 'management' || ['PROJECT_MANAGER', 'FACILITY_MANAGER', 'MAINTENANCE_MANAGER', 'FACILITY_TEAM_LEADER'].includes(jobTitle);

  const rawDepts = userData?.departments || [];
  const isAllDepts = isAdmin || isManagement || rawDepts.length >= 15 || rawDepts.includes('all') || rawDepts.includes('كافة الأقسام') || userData?.category === 'all' || userData?.category === 'كافة الأقسام';
  const isRestrictedUser = !isAllDepts;

  // Compute authorized departments
  const userAuthorizedDepts = useMemo(() => {
    if (isAllDepts) return [];
    if (userData?.departments && Array.isArray(userData.departments) && userData.departments.length > 0) {
      return userData.departments.map((d: string) => normalizeCategory(d));
    }
    if (userData?.category && userData.category !== 'all' && userData.category !== 'كافة الأقسام' && userData.category !== 'الكل' && userData.category !== 'عام') {
      return [normalizeCategory(userData.category)];
    }
    return [];
  }, [userData, isAllDepts]);

  const getFormattedUserRole = () => {
    if (isAdmin) return 'أمين المخازن';
    if (jobTitle === 'FACILITY_TEAM_LEADER') return 'قائد فريق المرافق (Facility Team Leader)';
    if (isManagement) return 'مدير إدارة المرافق';
    if (userData?.role === 'supervisor') {
      const depts = userAuthorizedDepts.length > 0 ? userAuthorizedDepts.join(' - ') : (userData?.category || '');
      return `مشرف قسم ${depts ? `(${depts})` : ''}`;
    }
    return userData?.category ? `فني / مستخدم (${userData.category})` : 'مستخدم المخزن';
  };

  const activeRole = {
    id: userData?.role || 'user',
    label: isAdmin ? t('users.roleAdmin') : isManagement ? t('users.roleManagement') : t('users.roleUser'),
    dept: isAllDepts ? (language === 'ar' ? 'كافة الأقسام' : 'All Departments') : userAuthorizedDepts.join(', '),
    isAdmin: isAdmin || isManagement
  };

  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Firestore error (items):", err);
      setItems([]);
    });

    const unsubDisb = onSnapshot(query(collection(db, 'disbursements'), orderBy('createdAt', 'desc')), (snap) => {
      setDisbursements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Firestore error (disbursements):", err);
      setDisbursements([]);
    });

    const unsubReqs = onSnapshot(collection(db, 'materialRequests'), (snap) => {
      const rawReqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sortedReqs = rawReqs.sort((a: any, b: any) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setRequests(sortedReqs);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore error (requests):", err);
      setRequests([]);
      setLoading(false);
    });

    return () => { unsubItems(); unsubDisb(); };
  }, []);

  const visibleItems = useMemo(() => {
    return items
      .filter(item => {
        const code = String(item.code || '').trim();
        const name = String(item.name || '').trim();
        if (!name || name === 'اسم الصنف' || code === 'كود الصنف') return false;
        
        if (isRestrictedUser && userAuthorizedDepts.length > 0) {
          return userAuthorizedDepts.includes(normalizeCategory(item.category));
        }
        return true;
      });
  }, [items, isRestrictedUser, userAuthorizedDepts]);

  const visibleRequests = useMemo(() => {
    if (!isRestrictedUser || userAuthorizedDepts.length === 0) return requests;
    return requests.filter(req => {
      const c = normalizeCategory(req.category);
      const d = normalizeCategory(req.dept);
      return userAuthorizedDepts.includes(c) || userAuthorizedDepts.includes(d);
    });
  }, [requests, isRestrictedUser, userAuthorizedDepts]);

  // Modals for Stock Breakdown & Item Movement Timeline
  const [showStockBreakdownModal, setShowStockBreakdownModal] = useState(false);
  const [selectedPackagingItem, setSelectedPackagingItem] = useState<any | null>(null);
  const [breakdownSearch, setBreakdownSearch] = useState('');

  // ──── UNIFIED FSN MATHEMATICAL CALCULATION ENGINE ────
  const metrics = useMemo(() => {
    const raw = calculateInventoryMetrics(visibleItems, disbursements);
    return {
      totalItems: raw.totalItems,
      totalStockUnits: raw.totalStockUnits,
      physicalStockUnits: raw.physicalStockUnits,
      packagingBreakdown: raw.packagingBreakdown,
      outOfStock: raw.outOfStockCount,
      severeShortages: raw.severeCount,
      normalShortages: raw.normalCount,
      exclusiveStagnant: raw.stagnantCount,
      activeInStock: raw.activeCount,
      stockHealthRate: raw.stockHealthRate,
      severeShortagesList: raw.severeShortagesList,
      outOfStockList: raw.outOfStockList,
      stagnantList: raw.stagnantList,
      normalLowList: raw.normalLowList
    };
  }, [visibleItems, disbursements]);

  // Filter items with active packaging rules
  const packagingItems = useMemo(() => {
    return visibleItems
      .map(item => {
        const pkg = getItemPackagingInfo(item);
        return { ...item, packagingInfo: pkg };
      })
      .filter(item => item.packagingInfo.ruleType !== 'STANDARD_PIECE');
  }, [visibleItems]);

  // Animated counters (integers only)
  const animatedTotalItems = useCounter(metrics.totalItems);
  const animatedPhysicalStockUnits = useCounter(Math.round(metrics.physicalStockUnits || metrics.totalStockUnits));
  const animatedRawStockUnits = useCounter(Math.round(metrics.totalStockUnits));
  const animatedHealthRate = useCounter(metrics.stockHealthRate);
  const animatedSevereShortages = useCounter(metrics.severeShortages);
  const animatedNormalShortages = useCounter(metrics.normalShortages);
  const animatedOutOfStock = useCounter(metrics.outOfStock);
  const animatedStagnant = useCounter(metrics.exclusiveStagnant);
  const animatedActiveInStock = useCounter(metrics.activeInStock);

  // 1. Inventory Status (Donut Chart - Exactly matching reports/page.tsx)
  const inventoryStatusData = [
    { name: t('reports.tabActive'), value: metrics.activeInStock, color: '#10b981', type: 'ACTIVE' }, 
    { name: t('reports.tabStagnant'), value: metrics.exclusiveStagnant, color: '#3b82f6', type: 'STAGNANT' }, 
    { name: t('reports.tabNormal'), value: metrics.normalShortages, color: '#eab308', type: 'NORMAL' }, 
    { name: t('reports.tabCritical'), value: metrics.severeShortages, color: '#ea580c', type: 'CRITICAL' }, 
    { name: t('reports.tabOutOfStock'), value: metrics.outOfStock, color: '#64748b', type: 'OUT_OF_STOCK' } 
  ].filter(d => d.value > 0);

  // Packaging Breakdown Donut Chart Data
  const breakdownChartData = useMemo(() => {
    const bd = metrics.packagingBreakdown;
    if (!bd) return [];
    return [
      { name: language === 'ar' ? 'قطع مستقلة (عدد)' : 'Individual Pieces', value: bd.piecesCount || 0, color: '#3b82f6' },
      { name: language === 'ar' ? 'أعواد مواسير مكتملة' : 'Completed Pipes', value: bd.completedPipesCount || 0, color: '#0284c7' },
      { name: language === 'ar' ? 'لفات أسلاك وخراطيم' : 'Wire & Hose Rolls', value: bd.completedRollsCount || 0, color: '#8b5cf6' },
      { name: language === 'ar' ? 'أكياس وعبوات' : 'Packages & Bags', value: bd.packagesCount || 0, color: '#f59e0b' },
      { name: language === 'ar' ? 'أمتار كسر جارية' : 'Fractional Meters', value: bd.fractionalMetersCount || 0, color: '#ec4899' }
    ].filter(d => d.value > 0);
  }, [metrics.packagingBreakdown, language]);

  // 2. Department Activity (Vertical Bar)
  const catActivity = visibleItems.reduce((acc, curr) => {
    if ((curr.totalOut || 0) > 0) {
      const cat = curr.category || (language === 'ar' ? 'عام' : 'General');
      acc[cat] = (acc[cat] || 0) + (curr.totalOut || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const deptActivityData = Object.keys(catActivity)
    .map(key => ({ name: key, count: catActivity[key] }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 7);

  // 3. Top 5 Items (Horizontal Bar)
  const topItemsData = visibleItems
    .filter(i => (i.totalOut || 0) > 0)
    .sort((a, b) => (b.totalOut || 0) - (a.totalOut || 0))
    .slice(0, 5)
    .map(i => ({ 
      name: i.name.length > 20 ? i.name.substring(0, 20) + '...' : i.name, 
      fullName: i.name,
      code: i.code,
      unit: i.unit || (language === 'ar' ? 'وحدة' : 'units'),
      count: i.totalOut || 0 
    }));

  // 4. Request Trends (Area Chart)
  const trendsMap = visibleRequests.reduce((acc, req) => {
    if (!req.createdAt) return acc;
    const d = typeof req.createdAt === 'number' ? new Date(req.createdAt) : req.createdAt.toDate ? req.createdAt.toDate() : new Date();
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const trendsData = Object.keys(trendsMap)
    .map(date => ({ date, count: trendsMap[date] }))
    .reverse();

  // Requests Status Filter Breakdown
  const reqStatusCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, issued: 0, cancelled: 0 };
    visibleRequests.forEach(r => {
      const s = r.status || 'pending';
      if (s === 'pending') counts.pending++;
      else if (s === 'approved' || s === 'issued_pending_final') counts.approved++;
      else if (s === 'issued') counts.issued++;
      else if (s === 'cancelled') counts.cancelled++;
    });
    return counts;
  }, [visibleRequests]);

  const filteredRequests = useMemo(() => {
    if (selectedReqStatus === 'ALL') return visibleRequests.slice(0, 7);
    return visibleRequests.filter(r => {
      if (selectedReqStatus === 'pending') return r.status === 'pending';
      if (selectedReqStatus === 'approved') return r.status === 'approved' || r.status === 'issued_pending_final';
      if (selectedReqStatus === 'issued') return r.status === 'issued';
      if (selectedReqStatus === 'cancelled') return r.status === 'cancelled';
      return true;
    }).slice(0, 7);
  }, [visibleRequests, selectedReqStatus]);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const d = typeof ts === 'number' ? new Date(ts) : ts.toDate ? ts.toDate() : new Date();
    return d.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="badge badge-warning">⏳ {t('dashboard.statusPending')}</span>;
      case 'approved': return <span className="badge badge-primary">📦 {t('dashboard.statusApproved')}</span>;
      case 'issued': return <span className="badge badge-success">✅ {t('dashboard.statusIssued')}</span>;
      case 'issued_pending_final': return <span className="badge badge-warning" style={{ border: '1px solid var(--accent-success)' }}>🟢 {t('dashboard.statusIssuedPendingFinal')}</span>;
      case 'cancelled': return <span className="badge badge-danger">❌ {t('dashboard.statusCancelled')}</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  if (!isMounted || authLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <div className="text-muted" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border-light)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1.5s linear infinite' }} />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Unified KPI Card Component for Consistent Luxury Design
  const KPICard = ({ 
    href, 
    label, 
    value, 
    icon: Icon, 
    themeColor, 
    bgTint,
    badge,
    onClick
  }: { 
    href?: string; 
    label: string; 
    value: number | string; 
    icon: any; 
    themeColor: string; 
    bgTint: string; 
    badge?: string;
    onClick?: () => void;
  }) => {
    const cardContent = (
      <div 
        className="enterprise-card kpi-card-inner"
        onClick={onClick}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle colored top accent indicator line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: themeColor, opacity: 0.9 }} />

        <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '0.65rem' }}>
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>{label}</p>
            {badge && (
              <span style={{ 
                display: 'inline-block', 
                marginTop: '4px', 
                fontSize: '0.72rem', 
                fontWeight: 700, 
                color: themeColor, 
                background: bgTint, 
                padding: '2px 8px', 
                borderRadius: '6px' 
              }}>
                {badge}
              </span>
            )}
          </div>
          <div style={{ padding: '0.45rem', background: bgTint, borderRadius: '8px', color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={17} strokeWidth={2.5} />
          </div>
        </div>

        <h2 className="kpi-card-value" style={{ margin: 0, color: themeColor, letterSpacing: '-0.5px', fontSize: '1.85rem', fontWeight: 800 }}>
          {value}
        </h2>
      </div>
    );

    if (onClick) {
      return (
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {cardContent}
        </div>
      );
    }

    return (
      <Link href={href || '/'} style={{ textDecoration: 'none', display: 'block', flex: 1, minWidth: 0, width: '100%' }}>
        {cardContent}
      </Link>
    );
  };

  return (
    <div className="dashboard-page-container">
      
      {/* ──── HEADER ──── */}
      <header className="flex-between animate-fade-in dashboard-header-container" style={{ padding: '0 0 1.5rem 0', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dashboard-main-title" style={{ margin: '0 0 0.25rem 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {t('dashboard.title')}
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
            {activeRole.isAdmin ? t('dashboard.subtitle_admin') : `${t('dashboard.subtitle_dept')}${activeRole.dept}`}
          </p>
        </div>

        {/* Right Section: Quick Action Buttons & Role Badge */}
        <div className="dashboard-quick-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          
          {/* Material Requests - For All Roles */}
          <Link href="/requests" className="btn btn-outline quick-action-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.4)', fontWeight: 600 }}>
            <ArrowRightLeft size={16} />
            <span>{t('nav.requests')}</span>
          </Link>

          {/* Purchase Requisition - For Admin, Management, and Supervisor */}
          {(isAdmin || isManagement || userData?.role === 'supervisor') && (
            <Link href="/purchase-requisition" className="btn btn-outline quick-action-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', fontWeight: 600 }}>
              <ShoppingCart size={16} />
              <span>{t('dashboard.quickPurchaseRequisition')}</span>
            </Link>
          )}

          {/* Inventory Sheets - Super Admin Only */}
          {isAdmin && (
            <Link href="/inventory-sheets" className="btn btn-outline quick-action-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <FileText size={16} />
              <span>{t('dashboard.quickInventorySheets')}</span>
            </Link>
          )}

          {/* Additions - Super Admin Only */}
          {isAdmin && (
            <Link href="/additions" className="btn btn-outline quick-action-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', fontWeight: 600 }}>
              <PlusCircle size={16} />
              <span>{t('dashboard.quickAddition')}</span>
            </Link>
          )}

          {/* Disbursements - Super Admin Only */}
          {isAdmin && (
            <Link href="/disbursements" className="btn btn-primary quick-action-btn primary-action" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <ArrowRightLeft size={16} />
              <span>{t('dashboard.quickDisbursement')}</span>
            </Link>
          )}

          <div className="dashboard-user-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(9, 154, 117, 0.12)', padding: '0.45rem 0.95rem', borderRadius: '8px', border: '1px solid rgba(9, 154, 117, 0.3)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            <Users size={16} />
            <span>{userData?.name ? `${userData.name} | ${getFormattedUserRole()}` : getFormattedUserRole()}</span>
          </div>
        </div>
      </header>

      {/* ──── EXECUTIVE ACTION ALERT BANNER ──── */}
      {(metrics.severeShortages > 0 || metrics.outOfStock > 0) && (
        <div 
          className="animate-fade-in"
          style={{
            marginBottom: '1.75rem',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.1) 0%, rgba(239, 68, 68, 0.06) 100%)',
            border: '1px solid rgba(234, 88, 12, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(234, 88, 12, 0.2)', color: '#ea580c' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                {t('dashboard.actionAlertTitle')}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {language === 'ar' ? (
                  <>
                    يوجد <strong style={{ color: '#ea580c' }}>{metrics.severeShortages}</strong> صنف نقص حرج و <strong style={{ color: '#ef4444' }}>{metrics.outOfStock}</strong> صنف رصيد منتهي، يستوجب التدخل الفوري وتأمين سلاسل الإمداد.
                  </>
                ) : (
                  <>
                    There are <strong style={{ color: '#ea580c' }}>{metrics.severeShortages}</strong> critical shortages and <strong style={{ color: '#ef4444' }}>{metrics.outOfStock}</strong> out-of-stock items requiring immediate replenishment.
                  </>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/purchase-requisition"
            className="btn btn-primary"
            style={{ 
              background: '#ea580c', 
              borderColor: '#ea580c', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontWeight: 700,
              fontSize: '0.875rem'
            }}
          >
            <ShoppingCart size={16} />
            <span>{t('dashboard.actionAlertBtn')}</span>
          </Link>
        </div>
      )}

      {/* ──── PERFECT 4x2 SYMMETRICAL KPI GRID (4 TOP + 4 BOTTOM) ──── */}
      <div className="animate-fade-in delay-100" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* ROW 1: General Overview & Health (Exactly 4 Cards) */}
        <div className="dashboard-kpi-grid" style={{ display: 'grid', gap: '1rem' }}>
          
          {/* 1. Total Unique Items */}
          <KPICard 
            href="/inventory"
            label={t('dashboard.totalItems')}
            value={animatedTotalItems.toLocaleString()}
            icon={Package}
            themeColor="var(--text-primary)"
            bgTint="rgba(255, 255, 255, 0.08)"
          />

          {/* 2. Total Stock Units */}
          <KPICard 
            label={language === 'ar' ? 'إجمالي العهدة والوحدات بالمخزن' : t('dashboard.totalStockUnits')}
            value={animatedPhysicalStockUnits.toLocaleString()}
            icon={Layers}
            themeColor="#3b82f6"
            bgTint="rgba(59, 130, 246, 0.12)"
            onClick={() => setShowStockBreakdownModal(true)}
          />

          {/* 3. Stock Health Rate (%) */}
          <KPICard 
            href="/reports"
            label={t('dashboard.stockHealthRate')}
            value={`${animatedHealthRate}%`}
            icon={ShieldCheck}
            themeColor="#10b981"
            bgTint="rgba(16, 185, 129, 0.12)"
          />

          {/* 4. Safe & Active Stock */}
          <KPICard 
            href="/reports"
            label={t('reports.tabActive')}
            value={animatedActiveInStock.toLocaleString()}
            icon={CheckCircle2}
            themeColor="#10b981"
            bgTint="rgba(16, 185, 129, 0.12)"
          />

        </div>

        {/* ROW 2: Inventory Status & Risks (Exactly 4 Cards) */}
        <div className="dashboard-kpi-grid" style={{ display: 'grid', gap: '1rem' }}>

          {/* 5. Severe Shortages */}
          <KPICard 
            href="/reports"
            label={t('reports.tabCritical')}
            value={animatedSevereShortages.toLocaleString()}
            icon={TrendingDown}
            themeColor="#ea580c"
            bgTint="rgba(234, 88, 12, 0.12)"
          />

          {/* 6. Normal Shortages */}
          <KPICard 
            href="/reports"
            label={t('reports.tabNormal')}
            value={animatedNormalShortages.toLocaleString()}
            icon={ShieldAlert}
            themeColor="#eab308"
            bgTint="rgba(234, 179, 8, 0.12)"
          />

          {/* 7. Out of Stock */}
          <KPICard 
            href="/reports"
            label={t('reports.tabOutOfStock')}
            value={animatedOutOfStock.toLocaleString()}
            icon={Activity}
            themeColor="#ef4444"
            bgTint="rgba(239, 68, 68, 0.12)"
          />

          {/* 8. Stagnant Stock */}
          <KPICard 
            href="/reports"
            label={t('reports.tabStagnant')}
            value={animatedStagnant.toLocaleString()}
            icon={Archive}
            themeColor="#60a5fa"
            bgTint="rgba(96, 165, 250, 0.12)"
          />

        </div>

      </div>

      {/* ──── ROW 1: TRENDS & INTERACTIVE INVENTORY STATUS DONUT ──── */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.75rem' }}>
        
        {/* 1. Request Trends Area Chart */}
        <div className="enterprise-card" style={{ padding: '1.5rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.15rem', fontWeight: 700 }}>
              <span style={{ width: '4px', height: '20px', background: 'var(--accent-primary)', borderRadius: '4px', display: 'inline-block' }}></span>
              {t('dashboard.requestTrends')}
            </h3>
            <Activity size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ flex: 1, width: '100%', direction: 'ltr', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData.length > 0 ? trendsData : [{date: t('common.noData'), count: 0}]} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#099A75" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#099A75" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} opacity={0.5} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}
                  itemStyle={{ color: '#099A75', fontWeight: '700' }}
                />
                <Area type="monotone" dataKey="count" stroke="#099A75" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Interactive Inventory Status Donut Chart */}
        <div className="enterprise-card" style={{ padding: '1.5rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.15rem', fontWeight: 700 }}>
              <span style={{ width: '4px', height: '20px', background: '#3b82f6', borderRadius: '4px', display: 'inline-block' }}></span>
              {t('dashboard.inventoryStatus')}
            </h3>
            <Link href="/reports" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>{t('dashboard.viewAll')}</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'center', flex: 1, gap: '1rem' }}>
            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push('/reports')}
                  >
                    {inventoryStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}
                    itemStyle={{ fontWeight: '700', color: 'var(--text-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Clickable Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {inventoryStatusData.map((entry, idx) => (
                <div 
                  key={idx} 
                  onClick={() => router.push('/reports')}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '0.875rem', 
                    cursor: 'pointer', 
                    padding: '0.25rem 0.4rem', 
                    borderRadius: '6px', 
                    transition: 'background 0.2s ease'
                  }}
                  title={t('dashboard.clickToViewReport')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: entry.color, flexShrink: 0 }}></span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{entry.name}</span>
                  </div>
                  <strong style={{ color: entry.color, marginInlineStart: '0.5rem' }}>{entry.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ──── ROW 2: TOP ITEMS & DEPARTMENTS ACTIVITY ──── */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* 1. Top 5 Items (Clickable to item-ledger) */}
        <div className="enterprise-card" style={{ padding: '1.5rem', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.15rem', fontWeight: 700 }}>
              <span style={{ width: '4px', height: '20px', background: '#8b5cf6', borderRadius: '4px', display: 'inline-block' }}></span>
              {t('dashboard.topWithdrawnItems')}
            </h3>
            <Link href="/item-ledger" style={{ fontSize: '0.8rem', color: '#8b5cf6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>{t('inventory.viewLedger')}</span>
              <ExternalLink size={12} />
            </Link>
          </div>
          <div style={{ flex: 1, width: '100%', direction: 'ltr', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                layout="vertical" 
                data={topItemsData.length > 0 ? topItemsData : [{ name: t('common.noData'), fullName: t('common.noData'), code: '', unit: '', count: 0 }]} 
                margin={{ top: 0, right: 30, left: 60, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} opacity={0.5} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} width={120} />
                <Tooltip 
                  cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}
                  formatter={(val: any, name: any, item: any) => [
                    `${Number(val).toLocaleString()} ${item?.payload?.unit || (language === 'ar' ? 'وحدة' : 'units')}`, 
                    item?.payload?.fullName || (language === 'ar' ? 'الكمية المنصرفة' : 'Disbursed Qty')
                  ]}
                />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]} 
                  barSize={22} 
                  fill="#8b5cf6" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push('/item-ledger')}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Department Activity */}
        <div className="enterprise-card" style={{ padding: '1.5rem', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.15rem', fontWeight: 700 }}>
              <span style={{ width: '4px', height: '20px', background: '#0284c7', borderRadius: '4px', display: 'inline-block' }}></span>
              {t('dashboard.departmentActivity')}
            </h3>
            <Link href="/monthly-reports" style={{ fontSize: '0.8rem', color: '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>{t('dashboard.viewAll')}</span>
              <ExternalLink size={12} />
            </Link>
          </div>
          <div style={{ flex: 1, width: '100%', direction: 'ltr', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptActivityData.length > 0 ? deptActivityData : [{name: t('common.noData'), count: 0}]} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} angle={-30} textAnchor="end" dy={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(2, 132, 199, 0.06)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}
                  itemStyle={{ color: '#0284c7', fontWeight: '700' }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]} 
                  barSize={28} 
                  fill="#0ea5e9"
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push('/monthly-reports')}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ──── RECENT REQUESTS TABLE WITH STATUS PILL COUNTERS ──── */}
      <div className="enterprise-card animate-fade-in delay-400" style={{ padding: '0', overflow: 'hidden', marginTop: '1.5rem' }}>
        
        {/* Table Header & Status Pills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.15rem', fontWeight: 700 }}>
              <span style={{ width: '4px', height: '20px', background: '#10b981', borderRadius: '4px', display: 'inline-block' }}></span>
              {t('dashboard.recentOrders')}
            </h3>

            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-tertiary)', padding: '0.2rem', borderRadius: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedReqStatus('ALL')}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedReqStatus === 'ALL' ? 'var(--accent-primary)' : 'transparent',
                  color: selectedReqStatus === 'ALL' ? '#fff' : 'var(--text-muted)'
                }}
              >
                {t('dashboard.statusAll')} ({visibleRequests.length})
              </button>

              <button
                onClick={() => setSelectedReqStatus('pending')}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedReqStatus === 'pending' ? '#f59e0b' : 'transparent',
                  color: selectedReqStatus === 'pending' ? '#fff' : '#f59e0b'
                }}
              >
                ⏳ {t('dashboard.statusPendingPill')} ({reqStatusCounts.pending})
              </button>

              <button
                onClick={() => setSelectedReqStatus('approved')}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedReqStatus === 'approved' ? '#3b82f6' : 'transparent',
                  color: selectedReqStatus === 'approved' ? '#fff' : '#3b82f6'
                }}
              >
                📦 {t('dashboard.statusApprovedPill')} ({reqStatusCounts.approved})
              </button>

              <button
                onClick={() => setSelectedReqStatus('issued')}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedReqStatus === 'issued' ? '#10b981' : 'transparent',
                  color: selectedReqStatus === 'issued' ? '#fff' : '#10b981'
                }}
              >
                ✅ {t('dashboard.statusIssuedPill')} ({reqStatusCounts.issued})
              </button>
            </div>
          </div>

          <Link href="/requests" className="btn btn-outline" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', fontWeight: 600 }}>
            {t('dashboard.viewAll')}
          </Link>
        </div>
        
        {/* Table Content */}
        <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table className="wms-table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'inherit' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{t('dashboard.orderNumber')}</th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{t('common.date')}</th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{t('dashboard.requester')}</th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{t('dashboard.department')}</th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{t('common.item')}</th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{t('common.quantity')}</th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req, i) => (
                <tr key={req.reqId} style={{ borderBottom: i !== filteredRequests.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <td style={{ padding: '0.85rem 1.5rem', color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'monospace' }}>{req.reqId}</td>
                  <td style={{ padding: '0.85rem 1.5rem', color: 'var(--text-secondary)' }}>{formatDate(req.createdAt)}</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{req.userName}</td>
                  <td style={{ padding: '0.85rem 1.5rem', color: 'var(--text-muted)' }}>{req.dept || req.category}</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{req.itemName}</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{req.qty}</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>{getStatusBadge(req.status)}</td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('dashboard.noRecentOrders')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ──── 1. STOCK BREAKDOWN MODAL (INTERACTIVE PACKAGING AUDIT) ──── */}
      {showStockBreakdownModal && (
        <div 
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowStockBreakdownModal(false)}
        >
          <div 
            className="enterprise-card animate-scale-up"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
              maxWidth: '880px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.45)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Boxes size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {language === 'ar' ? 'تشريح وحدات المخزن ومنطق الحزم القياسية' : 'Physical Inventory & Packaging Breakdown'}
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {language === 'ar' ? 'حساب الحزم المادية (أعواد المواسير ولفات الأسلاك) واحتساب الكسور قيد الاستهلاك' : 'Decomposition of raw units into complete bundles, pipes, rolls, and active meters'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowStockBreakdownModal(false)}
                style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Top Stat Comparison Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>
                  {language === 'ar' ? 'الرصيد المادي الفعلي (حزم وقطع)' : 'True Physical Units'}
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#3b82f6' }}>
                  {animatedPhysicalStockUnits.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {language === 'ar' ? 'محتسب بالأعواد واللفات المكتملة' : 'Bundled by standard packaging sizes'}
                </div>
              </div>

              <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {language === 'ar' ? 'الرصيد الرقمي الخام بالسجلات' : 'Raw Registered Balance'}
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {animatedRawStockUnits.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {language === 'ar' ? 'جمع الأمتار المباشر قبل منطق الحزم' : 'Linear sum of meters + pieces'}
                </div>
              </div>

              <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                  {language === 'ar' ? 'وفر الانكماش الذكي للوحدات' : 'Packaging Shrinkage'}
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#10b981' }}>
                  -{(metrics.packagingBreakdown?.shrinkageDelta || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {language === 'ar' ? 'أمتار مدمجة في لفات وأعواد كاملة' : 'Meters consolidated into packages'}
                </div>
              </div>
            </div>

            {/* Detailed Unit Distribution 5 Cards */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {language === 'ar' ? '📊 التوزيع المادي التفصيلي لوحدات المخزن:' : '📊 Detailed Physical Breakdown:'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🏷️</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {(metrics.packagingBreakdown?.piecesCount || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>قطع مستقلة (عدد)</div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>📏</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>
                    {metrics.packagingBreakdown?.completedPipesCount || 0} عود
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>مواسير مكتملة</div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🔌</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6' }}>
                    {metrics.packagingBreakdown?.completedRollsCount || 0} لفة
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>لفات أسلاك وخراطيم</div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>📦</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                    {(metrics.packagingBreakdown?.packagesCount || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>أكياس وعلب وجوالين</div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>⏳</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ec4899' }}>
                    {metrics.packagingBreakdown?.fractionalMetersCount || 0} م
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>كسور قيد الاستهلاك</div>
                </div>
              </div>
            </div>

            {/* Visual Breakdown Donut Chart */}
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {language === 'ar' ? '📈 المخطط البياني لتوزيع الحزم والوحدات الفيزيائية:' : '📈 Physical Packaging Breakdown Chart:'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ height: '190px', width: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdownChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {breakdownChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`${Number(val).toLocaleString()} وحدة`, 'الكمية']}
                        contentStyle={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)', borderRadius: '8px', fontSize: '0.8rem' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {breakdownChartData.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)' }}>{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Table of Bundled Items (Wires & Pipes) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {language === 'ar' ? '🔍 قائمة أصناف المواسير والأسلاك المجمعة (اضغط على أي صنف لفحص حركاته التراكمية):' : 'Consolidated Pipe & Wire Items:'}
                </h4>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <input
                    type="text"
                    placeholder={language === 'ar' ? 'بحث عن صنف أو كود...' : 'Search item...'}
                    value={breakdownSearch}
                    onChange={(e) => setBreakdownSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.85rem 0.45rem 2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem'
                    }}
                  />
                  <Search size={14} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: language === 'ar' ? 'auto' : '0.65rem', right: language === 'ar' ? '0.65rem' : 'auto', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'inherit' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-light)' }}>الكود</th>
                      <th style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-light)' }}>اسم الصنف</th>
                      <th style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-light)' }}>الرصيد بالمتر</th>
                      <th style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-light)' }}>الحزم المكتملة</th>
                      <th style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-light)' }}>الكسر المتبقي</th>
                      <th style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-light)', textAlign: 'center' }}>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packagingItems
                      .filter(it => !breakdownSearch || it.name?.toLowerCase().includes(breakdownSearch.toLowerCase()) || it.code?.includes(breakdownSearch))
                      .map((item) => {
                        const pkg = item.packagingInfo;
                        return (
                          <tr 
                            key={item.id || item.code}
                            style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.15s' }}
                            onClick={() => {
                              setSelectedPackagingItem(item);
                            }}
                          >
                            <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{item.code}</td>
                            <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                            <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.stock} متر</td>
                            <td style={{ padding: '0.65rem 1rem', color: '#10b981', fontWeight: 700 }}>
                              {pkg.completedBundles > 0 ? `${pkg.completedBundles} ${pkg.bundleUnitName}` : '—'}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', color: pkg.remainingQuantity > 0 ? '#ea580c' : 'var(--text-muted)', fontWeight: 600 }}>
                              {pkg.remainingQuantity > 0 ? `${pkg.remainingQuantity} متر (${pkg.completionPercent}%)` : 'مكتمل بالكامل'}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPackagingItem(item);
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-light)',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                فحص الحركات 🔍
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Link href="/inventory" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                الانتقال لجدول المخزن بالكامل
              </Link>
              <button type="button" onClick={() => setShowStockBreakdownModal(false)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── 2. ITEM PACKAGING & TIMELINE DRILL-DOWN MODAL ──── */}
      {selectedPackagingItem && (
        <div 
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setSelectedPackagingItem(null)}
        >
          <div 
            className="enterprise-card animate-scale-up"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', marginBottom: '6px', display: 'inline-block' }}>
                  كود الصنف: {selectedPackagingItem.code} | {selectedPackagingItem.category || 'عام'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedPackagingItem.name}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedPackagingItem(null)}
                style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Packaging Rule Box */}
            {(() => {
              const pkg = selectedPackagingItem.packagingInfo || getItemPackagingInfo(selectedPackagingItem);
              const itemDisbs = disbursements
                .filter(d => String(d.itemCode || d.code || '').trim() === String(selectedPackagingItem.code || '').trim())
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>قاعدة الحزمة المعتمدة</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                        {pkg.bundleUnitName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        كل {pkg.bundleSize} متر = 1 حزمة مكتملة
                      </div>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>الحزم المكتملة بالمخزن</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                        {pkg.completedBundles}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        تعادل {(pkg.completedBundles * pkg.bundleSize)} متر كاملة
                      </div>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>إجمالي الرصيد المسجل</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {selectedPackagingItem.stock} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>متر</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        متبقي {pkg.remainingQuantity} متر كسر قيد الاستهلاك
                      </div>
                    </div>
                  </div>

                  {/* Active Bundle Progress Bar */}
                  <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        حالة الحزمة الجارية قيد الاستهلاك:
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: pkg.remainingQuantity > 0 ? '#ea580c' : '#10b981' }}>
                        {pkg.remainingQuantity > 0 
                          ? `${pkg.remainingQuantity} متر متبقية من أصل ${pkg.bundleSize} م (${pkg.completionPercent}%)`
                          : 'الحزمة الأخيرة مكتملة 100%'}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'var(--border-light)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${pkg.remainingQuantity > 0 ? pkg.completionPercent : 100}%`, 
                          height: '100%', 
                          background: pkg.remainingQuantity > 0 ? 'linear-gradient(90deg, #ea580c, #f59e0b)' : '#10b981',
                          borderRadius: '5px',
                          transition: 'width 0.4s ease'
                        }} 
                      />
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      يتم الصرف بالمتر الفعلي، وبمجرد اكتمال تراكم استهلاك {pkg.bundleSize} متر يتم خصم لفة/عود كامل تلقائياً.
                    </p>
                  </div>

                  {/* Disbursement Movement History Timeline */}
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      📋 سجل حركات الصرف التي ساهمت في استهلاك الصنف ({itemDisbs.length} حركة):
                    </h4>

                    {itemDisbs.length > 0 ? (
                      <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'inherit' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', position: 'sticky', top: 0 }}>
                              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)' }}>التاريخ</th>
                              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)' }}>رقم الإذن</th>
                              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)' }}>الجهة / المستلم</th>
                              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)' }}>الكمية المنصرفة</th>
                              <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)' }}>الملاحظات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itemDisbs.map((d: any, idx: number) => (
                              <tr key={d.id || idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{d.date || formatDate(d.createdAt)}</td>
                                <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{d.invoiceNo || d.id}</td>
                                <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-primary)' }}>{d.destination || d.receiver || '—'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 800, color: '#ef4444' }}>{d.qty} متر</td>
                                <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{d.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        لا توجد حركات صرف حديثة مسجلة لهذا الصنف بالسحابة.
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setSelectedPackagingItem(null)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                      إغلاق
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
