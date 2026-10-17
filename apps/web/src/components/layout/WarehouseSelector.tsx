'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check, Layers } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';

export interface WarehouseBranch {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  capacity: string;
  badge: string;
}

export const WAREHOUSE_BRANCHES: WarehouseBranch[] = [
  {
    id: 'wh-hq',
    nameAr: 'المستودع المركزي العام (HQ)',
    nameEn: 'Central HQ Warehouse',
    code: 'WH-01',
    capacity: '12,500 م²',
    badge: 'رئيسي'
  },
  {
    id: 'wh-fast',
    nameAr: 'مستودع التوزيع السريع (FMCG)',
    nameEn: 'Fast Fulfillment Hub',
    code: 'WH-02',
    capacity: '6,200 م²',
    badge: 'توزيع'
  },
  {
    id: 'wh-raw',
    nameAr: 'مستودع المواد الخام والتعبئة',
    nameEn: 'Raw Materials & Storage',
    code: 'WH-03',
    capacity: '8,400 م²',
    badge: 'مواد خام'
  },
  {
    id: 'wh-all',
    nameAr: 'كافة المستودعات والفروع',
    nameEn: 'All Warehouse Branches',
    code: 'GLOBAL',
    capacity: '27,100 م²',
    badge: 'شامل'
  }
];

export default function WarehouseSelector() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeWhId, setActiveWhId] = useState<string>('wh-hq');
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('stockly_active_wh') || 'wh-hq';
    setActiveWhId(saved);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (branch: WarehouseBranch) => {
    setActiveWhId(branch.id);
    localStorage.setItem('stockly_active_wh', branch.id);
    setOpen(false);
    
    // Dispatch global event for listeners
    window.dispatchEvent(new CustomEvent('stockly_warehouse_changed', { detail: branch }));
    
    toast.success(
      language === 'ar' ? `تم التبديل إلى: ${branch.nameAr}` : `Active warehouse: ${branch.nameEn}`,
      { icon: '🏢', duration: 2500 }
    );
  };

  if (!mounted) {
    return (
      <div style={{ height: '36px', width: '160px', borderRadius: '8px', background: 'var(--bg-tertiary)' }} />
    );
  }

  const currentBranch = WAREHOUSE_BRANCHES.find(b => b.id === activeWhId) || WAREHOUSE_BRANCHES[0];

  return (
    <div ref={menuRef} style={{ position: 'relative' }} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '38px',
          padding: '0 12px',
          borderRadius: '10px',
          background: open ? 'var(--accent-primary-glass)' : 'var(--bg-tertiary)',
          border: '1px solid',
          borderColor: open ? 'var(--accent-primary)' : 'var(--border-light)',
          boxShadow: open ? '0 0 12px var(--accent-primary-glass)' : '0 1px 3px rgba(15, 23, 42, 0.05)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div 
          style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '6px', 
            background: 'var(--accent-primary-glass)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--accent-primary)' 
          }}
        >
          <Building2 size={14} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'start', lineHeight: 1.1 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {language === 'ar' ? currentBranch.nameAr : currentBranch.nameEn}
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
            {currentBranch.code} • {currentBranch.capacity}
          </span>
        </div>

        <ChevronDown 
          size={14} 
          style={{ 
            color: 'var(--text-muted)', 
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.2s ease',
            marginRight: language === 'ar' ? '4px' : 0,
            marginLeft: language === 'ar' ? 0 : '4px'
          }} 
        />
      </button>

      {/* Branches Dropdown Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: language === 'ar' ? 0 : 'auto',
            left: language === 'ar' ? 'auto' : 0,
            width: '280px',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px var(--accent-primary-glass)',
            padding: '8px',
            zIndex: 1000,
            animation: 'fadeInMenu 0.15s ease-out'
          }}
        >
          <div 
            style={{ 
              padding: '6px 10px 8px 10px', 
              fontSize: '11px', 
              fontWeight: 800, 
              color: 'var(--text-muted)', 
              letterSpacing: '1px',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--border-light)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{language === 'ar' ? 'الفروع والمستودعات النشطة' : 'Active Branches'}</span>
            <span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>Multi-Warehouse</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {WAREHOUSE_BRANCHES.map((b) => {
              const isSelected = b.id === activeWhId;
              return (
                <button
                  key={b.id}
                  onClick={() => handleSelect(b)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    background: isSelected ? 'var(--accent-primary-glass)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '6px', 
                        background: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                        color: isSelected ? '#060B14' : 'var(--text-muted)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '11px',
                        flexShrink: 0
                      }}
                    >
                      {b.code}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: isSelected ? 800 : 600 }}>
                        {language === 'ar' ? b.nameAr : b.nameEn}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {b.capacity} • {b.badge}
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check size={16} color="var(--accent-primary)" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
