'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import BrandLogo from '@/components/common/BrandLogo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package2, 
  ArrowRightLeft, 
  Users, 
  Settings, 
  FileText, 
  PieChart, 
  ChevronDown, 
  LogOut, 
  Menu, 
  X, 
  Globe, 
  ClipboardList,
  ClipboardCheck,
  PackageCheck,
  Wrench,
  User,
  ShoppingCart,
  History,
  Building2,
  Sparkles
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Topbar() {
  const pathname = usePathname();
  const { userData } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const handleLogout = async () => {
    document.cookie = 'userRole=; path=/; max-age=0';
    document.cookie = 'roleClass=; path=/; max-age=0';
    await auth.signOut();
    window.location.href = '/login';
  };

  // Close settings dropdown on click/touch outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setSettingsOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const role = userData?.role;
  const jobTitle = userData?.jobTitle || '';
  const cleanEmail = (userData?.email || '').toLowerCase();
  const isAdmin = role === 'admin' || cleanEmail === 'mohamedalghala@gmail.com' || cleanEmail.startsWith('admin');
  const isManagement = role === 'management' || ['PROJECT_MANAGER', 'FACILITY_MANAGER', 'MAINTENANCE_MANAGER', 'FACILITY_TEAM_LEADER'].includes(jobTitle);
  const isSupervisor = role === 'supervisor';

  const navGroups = [
    {
      label: t('nav.masterData'),
      icon: <Package2 size={18} />,
      items: [
        { href: '/inventory', label: t('nav.inventory'), icon: <Package2 size={16} /> },
      ]
    },
    {
      label: t('nav.transactions'),
      icon: <ArrowRightLeft size={18} />,
      items: [
        { href: '/requests', label: t('nav.requests'), icon: <ArrowRightLeft size={16} /> },
        ...(isAdmin ? [
          { href: '/additions', label: t('nav.additions'), icon: <Package2 size={16} /> },
          { href: '/disbursements', label: t('nav.disbursements'), icon: <ArrowRightLeft size={16} /> },
          { href: '/scrap', label: t('nav.scrap'), icon: <Package2 size={16} /> },
        ] : []),
      ]
    },
    {
      label: t('nav.officialRecords'),
      icon: <ClipboardCheck size={18} />,
      items: [
        { href: '/completion-records?tab=inspection', label: t('nav.technicalInspection'), icon: <ClipboardCheck size={16} /> },
        { href: '/completion-records?tab=receipt', label: t('nav.custodyRecords'), icon: <PackageCheck size={16} /> },
        { href: '/completion-records?tab=completion', label: t('nav.workCompletionRecords'), icon: <Wrench size={16} /> },
      ]
    },
    {
      label: t('nav.analytics'),
      icon: <PieChart size={18} />,
      items: [
        { href: '/reports', label: t('nav.reports'), icon: <FileText size={16} /> },
        { href: '/monthly-reports', label: t('nav.monthlyReports'), icon: <FileText size={16} /> },
        ...(isAdmin ? [{ href: '/item-ledger', label: t('nav.itemLedger'), icon: <History size={16} /> }] : []),
        { href: '/purchase-requisition', label: t('nav.purchaseRequisition'), icon: <ShoppingCart size={16} /> },
        ...((isAdmin || isManagement) ? [{ href: '/inventory-sheets', label: t('nav.inventorySheets'), icon: <ClipboardList size={16} /> }] : []),
      ]
    }
  ];

  const mobileTabsTrackRef = useRef<HTMLDivElement>(null);

  const mobileTabs = useMemo(() => [
    { href: '/dashboard', label: t('nav.home'), icon: <LayoutDashboard size={15} /> },
    { href: '/completion-records?tab=inspection', label: 'محضر الفحص الفني', icon: <ClipboardCheck size={15} /> },
    { href: '/completion-records?tab=receipt', label: 'محاضر الاستلام والعهد', icon: <PackageCheck size={15} /> },
    { href: '/inventory', label: t('nav.inventory'), icon: <Package2 size={15} /> },
    { href: '/requests', label: t('nav.requests'), icon: <ArrowRightLeft size={15} /> },
    ...(isAdmin ? [
      { href: '/additions', label: t('nav.additions'), icon: <Package2 size={15} /> },
      { href: '/disbursements', label: t('nav.disbursements'), icon: <ArrowRightLeft size={15} /> },
      { href: '/item-ledger', label: t('nav.itemLedger'), icon: <History size={15} /> },
      { href: '/scrap', label: t('nav.scrap'), icon: <Package2 size={15} /> },
    ] : []),
    ...((isAdmin || isManagement) ? [
      { href: '/inventory-sheets', label: t('nav.inventorySheets'), icon: <ClipboardList size={15} /> },
    ] : []),
    { href: '/purchase-requisition', label: t('nav.purchaseRequisition'), icon: <ShoppingCart size={15} /> },
    { href: '/reports', label: t('nav.reports'), icon: <FileText size={15} /> },
    { href: '/monthly-reports', label: t('nav.monthlyReports'), icon: <FileText size={15} /> },
  ], [isAdmin, isManagement, t]);

  useEffect(() => {
    if (mobileTabsTrackRef.current) {
      const activeEl = mobileTabsTrackRef.current.querySelector('.mobile-tab-pill.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [pathname]);

  const formatJobTitle = (jobTitle?: string, role?: string): string => {
    const map: Record<string, string> = {
      'CHAIRMAN': 'رئيس مجلس الإدارة',
      'EXECUTIVE': 'المدير التنفيذي (CEO)',
      'SUPPLY_CHAIN_DIRECTOR': 'مدير عام سلاسل الإمداد',
      'WAREHOUSE_MANAGER': 'مدير عام المستودعات',
      'INVENTORY_CONTROLLER': 'مراقب عام المخزون والجرد',
      'INBOUND_SUPERVISOR': 'مشرف الاستلام والتوريد (Inbound)',
      'OUTBOUND_SUPERVISOR': 'مشرف الصرف والتوزيع (Outbound)',
      'QC_INSPECTOR': 'أخصائي فحص جودة ومطابقة',
      'PROJECT_MANAGER': 'مدير العمليات التشغيلية',
      'FACILITY_TEAM_LEADER': 'مشرف قطاع المستودعات',
      'STOREKEEPER': 'أمين المستودع',
      'IRRIGATION_ENGINEER': 'مهندس تشغيل ودعم فني',
      'SITE_ENGINEER': 'مهندس موقع ومستودعات',
      'DEPARTMENT_SUPERVISOR': 'مشرف قسم المخازن',
      'CLEANING_SUPERVISOR': 'مشرف مناولة ونظافة المستودع',
      'LOGISTICS_COORDINATOR': 'منسق العمليات اللوجستية',
      'FORKLIFT_OPERATOR': 'فني مناولة ورافعات',
      'HELP_DESK': 'مكتب الدعم اللوجستي والمساعدة',
      'TECHNICIAN': 'فني تشغيل ومناولة',
      'WORKER': 'فني ومساعد مستودع',
      'SUPER_ADMIN': 'مدير النظام والمستودعات'
    };
    if (jobTitle && map[jobTitle]) return map[jobTitle];
    if (jobTitle) return jobTitle;
    if (role === 'admin') return 'مدير عام المستودعات';
    if (role === 'management') return 'مدير العمليات وسلاسل الإمداد';
    if (role === 'supervisor') return 'مشرف قسم المخازن';
    return 'فني / مستخدم المستودع';
  };

  const getRoleLabel = () => {
    if (isAdmin) return t('users.roleAdmin');
    if (jobTitle === 'FACILITY_TEAM_LEADER' || jobTitle === 'WAREHOUSE_MANAGER') return 'مدير المستودعات';
    if (isManagement) return t('users.roleManagement');
    if (role === 'supervisor') return t('users.roleSupervisor');
    return t('users.roleUser');
  };

  return (
    <header 
      className="topbar-header-container hide-on-print"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%'
      }}
    >
      <nav 
        className="topbar glass-panel" 
        style={{ 
          padding: '0.6rem 1.25rem', 
          display: 'flex', 
          flexDirection: 'row',
          direction: 'ltr', // Force LTR so layout doesn't flip when language changes
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid var(--border-light)',
        }}
      >
      {/* 1. Left Section: Logo Area */}
      <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="hide-on-mobile">
          <BrandLogo size="md" showSubtitle={true} />
        </div>
        <div className="show-on-mobile" style={{ display: 'none' }}>
          <BrandLogo size="compact" showSubtitle={false} />
        </div>
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-end', marginBottom: '2px' }}>
          <span style={{ fontSize: '8px', padding: '1px 5px', background: 'rgba(0, 208, 151, 0.12)', color: '#00D097', borderRadius: '4px', fontWeight: 800 }}>
            v2.1
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', padding: '1px 5px', background: 'rgba(52, 211, 153, 0.12)', color: '#34D399', borderRadius: '4px', fontWeight: 800 }}>
            <span style={{ width: '5px', height: '5px', background: '#34D399', borderRadius: '50%', boxShadow: '0 0 5px #34D399' }}></span>
            LIVE
          </span>
        </div>
      </Link>

      {/* 2. Middle Section: Desktop Navigation (Always Fixed in the Middle) */}
      <div 
        className="desktop-nav" 
         
        style={{ 
          display: 'flex', 
          flexDirection: 'row',
          gap: '1.25rem', 
          alignItems: 'center',
          
        }}
      >
        {/* Dedicated Home Tab (Dashboard Only) */}
        <Link 
          href="/dashboard" 
          style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            borderRadius: 'var(--radius-md)', 
            textDecoration: 'none', 
            color: pathname === '/dashboard' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
            background: pathname === '/dashboard' ? 'var(--accent-primary-glass)' : 'transparent', 
            border: pathname === '/dashboard' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            fontWeight: pathname === '/dashboard' ? 700 : 500, 
            transition: 'all 0.2s ease',
            boxShadow: pathname === '/dashboard' ? '0 0 12px var(--accent-primary-glass)' : 'none'
          }}
          className="nav-home-tab"
        >
          <LayoutDashboard size={17} />
          <span>{t('nav.home')}</span>
        </Link>
        {navGroups.map((group, idx) => (
          <React.Fragment key={idx}>
            <div className="nav-group" style={{ position: 'relative' }}>
              <div 
                className="nav-group-trigger" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'row',
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer', 
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--radius-md)', 
                  transition: 'background 0.2s', 
                  color: 'var(--text-secondary)', 
                  fontWeight: 500 
                }}
              >
                {group.icon}
                <span>{group.label}</span>
                <ChevronDown size={14} />
              </div>
              <div 
                className="nav-group-dropdown glass-card" 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: 0, 
                  right: 'auto', 
                  marginTop: '0.5rem', 
                  minWidth: '220px', 
                  padding: '0.5rem', 
                  zIndex: 10,
                  direction: language === 'ar' ? 'rtl' : 'ltr',
                }}
              >
                {group.items.map((item, itemIdx) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      href={item.href} 
                      key={itemIdx} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'row',
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '0.75rem 1rem', 
                        borderRadius: 'var(--radius-sm)', 
                        textDecoration: 'none', 
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                        background: isActive ? 'var(--bg-tertiary)' : 'transparent', 
                        transition: 'all 0.2s', 
                        fontWeight: isActive ? 600 : 500 
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* 3. Right Section: Utilities (Language, Theme, Settings Gear - Always Fixed on the Right in this exact order) */}
      <div 
         
        style={{ 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center', 
          gap: '0.75rem',
          
        }}
      >
        {/* Button 1: Language Switcher */}
        <button 
          onClick={toggleLanguage} 
          className="btn btn-glass" 
          title={t('nav.switchLanguage')} 
          style={{ 
            padding: '0.45rem 0.65rem', 
            borderRadius: 'var(--radius-full)', 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            gap: '0.35rem', 
            height: '38px',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 700
          }}
        >
          <Globe size={18} color="var(--accent-primary)" />
          <span className="hide-on-mobile">{language.toUpperCase()}</span>
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Button 2: Theme Toggle */}
        <ThemeToggle />

        {/* Button 3: Settings & Admin Gear Dropdown (Available on Mobile & Desktop) */}
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="btn btn-glass"
            style={{
              padding: '0.45rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              color: settingsOpen ? 'var(--accent-primary)' : 'var(--text-primary)',
              background: settingsOpen ? 'var(--accent-primary-glass)' : 'var(--bg-tertiary)',
              borderColor: settingsOpen ? 'var(--accent-primary)' : 'var(--border-light)',
              boxShadow: settingsOpen ? '0 0 12px var(--accent-primary-glass)' : 'none',
              transition: 'all 0.2s ease'
            }}
            title={t('nav.settings')}
            aria-label="Settings"
          >
            <Settings 
              size={19} 
              style={{ 
                transform: settingsOpen ? 'rotate(60deg)' : 'rotate(0deg)', 
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} 
            />
          </button>

          {/* Settings Menu Popup (Anchored directly below the Gear icon on the right) */}
          {settingsOpen && (
            <div 
              className="glass-card animate-fade-in settings-dropdown-menu" 
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                left: 'auto',
                width: 'min(285px, calc(100vw - 20px))',
                padding: '0.75rem',
                zIndex: 1100,
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(0, 240, 255, 0.15)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--bg-primary)',
                direction: language === 'ar' ? 'rtl' : 'ltr',
              }}
            >
              {/* User Identity Header */}
              {userData && (
                <div style={{ padding: '0.75rem', marginBottom: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--accent-primary), #3b82f6)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontWeight: 700, 
                    fontSize: '1rem',
                    boxShadow: '0 2px 8px rgba(0,240,255,0.3)',
                    flexShrink: 0
                  }}>
                    {userData.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1, textAlign: language === 'ar' ? 'right' : 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {userData.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {formatJobTitle(userData.jobTitle, userData.role)}
                      {userData.departments && userData.departments.length > 0 ? ` (${userData.departments.join(' - ')})` : (userData.category ? ` (${userData.category})` : '')}
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                
                {/* Profile & Account Settings - Available to ALL users */}
                <Link
                  href="/settings"
                  onClick={() => setSettingsOpen(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.7rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    color: pathname === '/settings' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    background: pathname === '/settings' ? 'var(--accent-primary-glass)' : 'transparent',
                    transition: 'all 0.2s',
                    fontWeight: pathname === '/settings' ? 600 : 500,
                    textAlign: language === 'ar' ? 'right' : 'left'
                  }}
                  className="settings-menu-item"
                >
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    background: 'rgba(9, 154, 117, 0.12)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'var(--accent-primary)',
                    flexShrink: 0
                  }}>
                    <User size={17} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{t('nav.profileSettings')}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('settings.subtitle')}</span>
                  </div>
                </Link>

                {/* User Management & Permissions - ONLY for isAdmin */}
                {isAdmin && (
                  <Link
                    href="/users"
                    onClick={() => setSettingsOpen(false)}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.7rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      color: pathname === '/users' ? 'var(--accent-primary)' : 'var(--text-primary)',
                      background: pathname === '/users' ? 'var(--accent-primary-glass)' : 'transparent',
                      transition: 'all 0.2s',
                      fontWeight: pathname === '/users' ? 600 : 500,
                      textAlign: language === 'ar' ? 'right' : 'left'
                    }}
                    className="settings-menu-item"
                  >
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      background: 'rgba(59, 130, 246, 0.15)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#3b82f6',
                      flexShrink: 0
                    }}>
                      <Users size={17} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{t('nav.userManagement')}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('users.subtitle')}</span>
                    </div>
                  </Link>
                )}

                <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.4rem 0' }} />

                {/* Replay Intro Motion Button */}
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    sessionStorage.removeItem('stockly_intro_seen');
                    window.location.reload();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '8px',
                    color: '#00e599',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'inherit',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 229, 153, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    background: 'rgba(0, 229, 153, 0.15)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#00e599',
                    flexShrink: 0 
                  }}>
                    <Sparkles size={17} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>عرض إنترو Stockly الموشن</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>إعادة تشغيل الإقلاع ثلاثي الأبعاد</span>
                  </div>
                </button>

                <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.4rem 0' }} />

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    handleLogout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-danger)',
                    background: 'transparent',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    textAlign: language === 'ar' ? 'right' : 'left'
                  }}
                  className="settings-menu-item-danger"
                >
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    background: 'var(--accent-danger-glass)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'var(--accent-danger)',
                    flexShrink: 0
                  }}>
                    <LogOut size={17} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{t('nav.logout')}</span>
                  </div>
                </button>

              </div>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu Toggle */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="btn btn-glass mobile-only-btn" 
          style={{ 
            padding: '0.45rem', 
            borderRadius: 'var(--radius-md)', 
            width: '38px', 
            height: '38px', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            border: mobileMenuOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
            color: mobileMenuOpen ? 'var(--accent-primary)' : 'var(--text-primary)'
          }}
          aria-label="القائمة الرئيسية"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div 
          className="mobile-drawer animate-fade-in" 
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-light)',
            padding: '1.25rem 1rem 4rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            direction: language === 'ar' ? 'rtl' : 'ltr'
          }}
        >
          {/* Mobile User Profile Card */}
          {userData && (
            <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                {userData.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {userData.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {formatJobTitle(userData.jobTitle, userData.role)}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Home Tab */}
          <Link 
            href="/dashboard" 
            onClick={() => setMobileMenuOpen(false)}
            style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: '0.65rem', 
              padding: '0.75rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              background: pathname === '/dashboard' ? 'var(--accent-primary-glass)' : 'var(--bg-tertiary)', 
              color: pathname === '/dashboard' ? 'var(--accent-primary)' : 'var(--text-primary)',
              fontSize: '0.92rem',
              fontWeight: 700,
              textDecoration: 'none',
              border: pathname === '/dashboard' ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)'
            }}
          >
            <LayoutDashboard size={18} />
            <span>{t('nav.home')}</span>
          </Link>

          {navGroups.map((group, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {group.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {group.items.map((item, itemIdx) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      href={item.href} 
                      key={itemIdx} 
                      onClick={() => setMobileMenuOpen(false)}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'row',
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.65rem 0.75rem', 
                        borderRadius: 'var(--radius-md)', 
                        background: isActive ? 'var(--accent-primary-glass)' : 'var(--bg-tertiary)', 
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent'
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick User & Settings Links for Mobile */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}
            >
              <User size={18} color="var(--accent-primary)" />
              <span>{t('nav.profileSettings')}</span>
            </Link>
            {isAdmin && (
              <Link
                href="/users"
                onClick={() => setMobileMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                <Users size={18} color="var(--accent-primary)" />
                <span>{t('nav.userManagement')}</span>
              </Link>
            )}
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-danger-glass)', color: 'var(--accent-danger)', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700, cursor: 'pointer', textAlign: language === 'ar' ? 'right' : 'left' }}
            >
              <LogOut size={18} />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Internal CSS for Dropdowns and Responsive Views */}
      <style dangerouslySetInnerHTML={{__html: `
        .mobile-only-btn {
          display: none !important;
        }
        .nav-home-tab:hover {
          background: var(--bg-tertiary) !important;
          color: var(--accent-primary) !important;
          border-color: var(--accent-primary) !important;
        }
        .nav-group:hover .nav-group-dropdown {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(0) !important;
        }
        .nav-group-trigger:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary) !important;
        }
        .nav-group-dropdown a:hover {
          background: var(--bg-tertiary) !important;
          color: var(--text-primary) !important;
        }
        .settings-menu-item:hover {
          background: var(--bg-tertiary) !important;
          color: var(--accent-primary) !important;
          transform: translateX(4px);
        }
        .settings-menu-item-danger:hover {
          background: var(--accent-danger-glass) !important;
          transform: translateX(4px);
        }
        @media screen and (max-width: 900px) {
          .topbar {
            padding: 0.5rem 0.75rem !important;
          }
          .desktop-nav {
            display: none !important;
          }
          .mobile-only-btn {
            display: flex !important;
          }
          .mobile-tabs-strip {
            display: block !important;
            width: 100% !important;
            max-width: 100vw !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            padding: 0.35rem 0.5rem !important;
          }
          .mobile-tabs-track {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            white-space: nowrap !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .mobile-tab-pill {
            flex-shrink: 0 !important;
            white-space: nowrap !important;
            display: inline-flex !important;
          }
          .settings-dropdown-menu {
            position: fixed !important;
            top: 56px !important;
            right: 12px !important;
            left: auto !important;
            width: min(300px, calc(100vw - 24px)) !important;
            max-width: calc(100vw - 24px) !important;
            z-index: 99999 !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .show-on-mobile {
            display: block !important;
          }
        }
        @media print {
          .topbar-header-container,
          .topbar,
          .mobile-tabs-strip {
            display: none !important;
          }
        }
        .mobile-tabs-strip {
          display: none;
        }
        .mobile-tabs-track::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}} />
      </nav>

      {/* Mobile Sticky Horizontal Navigation Tabs Bar (Always Visible on Mobile/Tablet <= 900px) */}
      <div 
        className="mobile-tabs-strip hide-on-print animate-fade-in"
        style={{
          width: '100%',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-light)',
          padding: '0.35rem 0.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div 
          className="mobile-tabs-track" 
          ref={mobileTabsTrackRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            width: '100%',
            direction: language === 'ar' ? 'rtl' : 'ltr'
          }}
        >
          {mobileTabs.map((tab, idx) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={idx}
                href={tab.href}
                className={`mobile-tab-pill ${isActive ? 'active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 800 : 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isActive ? 'rgba(9, 154, 117, 0.22)' : 'var(--bg-tertiary)',
                  border: isActive ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 0 10px rgba(9, 154, 117, 0.3)' : 'none'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
