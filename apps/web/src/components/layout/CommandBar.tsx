'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Layers, 
  Package2, 
  ArrowRightLeft, 
  ClipboardCheck, 
  ClipboardList, 
  BarChart3, 
  Barcode, 
  Palette, 
  Building2, 
  History, 
  X,
  Command,
  CornerDownLeft,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CommandItem {
  id: string;
  titleAr: string;
  titleEn: string;
  categoryAr: string;
  categoryEn: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

export default function CommandBar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { language } = useLanguage();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open_stockly_command_bar', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open_stockly_command_bar', handleCustomOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setSearch('');
    }
  }, [open]);

  const commands: CommandItem[] = [
    {
      id: 'warehouse-map',
      titleAr: 'خريطة المستودع ثلاثية الأبعاد (Digital Twin)',
      titleEn: '3D Warehouse Digital Twin Map',
      categoryAr: 'العمليات اللوجستية',
      categoryEn: 'Operations',
      icon: <Layers size={18} color="#00E599" />,
      action: () => { router.push('/warehouse-map'); setOpen(false); },
      shortcut: 'M'
    },
    {
      id: 'dashboard',
      titleAr: 'مركز العمليات والمراقبة الحية (Mission Control)',
      titleEn: 'Mission Control Dashboard',
      categoryAr: 'العمليات اللوجستية',
      categoryEn: 'Operations',
      icon: <BarChart3 size={18} color="#00C2FF" />,
      action: () => { router.push('/dashboard'); setOpen(false); },
      shortcut: 'D'
    },
    {
      id: 'inventory',
      titleAr: 'مصفوفة المخزون والأرصدة الحية',
      titleEn: 'Smart Inventory Matrix',
      categoryAr: 'إدارة المخزون',
      categoryEn: 'Inventory',
      icon: <Package2 size={18} color="#00E599" />,
      action: () => { router.push('/inventory'); setOpen(false); },
      shortcut: 'I'
    },
    {
      id: 'additions',
      titleAr: 'رصيف الاستلام وأذون التوريد (Inbound)',
      titleEn: 'Inbound Receiving & Additions',
      categoryAr: 'حركة البضائع',
      categoryEn: 'Movement',
      icon: <ArrowRightLeft size={18} color="#10B981" />,
      action: () => { router.push('/additions'); setOpen(false); }
    },
    {
      id: 'disbursements',
      titleAr: 'رصيف الصرف ومسار الشحن والتوزيع (Outbound)',
      titleEn: 'Outbound Dispatch & Disbursements',
      categoryAr: 'حركة البضائع',
      categoryEn: 'Movement',
      icon: <ArrowRightLeft size={18} color="#F59E0B" />,
      action: () => { router.push('/disbursements'); setOpen(false); }
    },
    {
      id: 'cycle-count',
      titleAr: 'محرك الجرد الدوري والأعمى (Cycle Counting)',
      titleEn: 'Blind Cycle Count & Auditing',
      categoryAr: 'الحوكمة والمطابقة',
      categoryEn: 'Governance',
      icon: <ClipboardList size={18} color="#3B82F6" />,
      action: () => { router.push('/inventory-sheets'); setOpen(false); }
    },
    {
      id: 'item-ledger',
      titleAr: 'كارت الصنف والمسار الزمني للحركات',
      titleEn: 'Item Ledger & Bin Card Timeline',
      categoryAr: 'الحوكمة والمطابقة',
      categoryEn: 'Governance',
      icon: <History size={18} color="#A855F7" />,
      action: () => { router.push('/item-ledger'); setOpen(false); }
    },
    {
      id: 'qc-records',
      titleAr: 'محاضر الفحص الفني والاستلام والعهد',
      titleEn: 'Technical Inspection & Custody Records',
      categoryAr: 'الحوكمة والمطابقة',
      categoryEn: 'Governance',
      icon: <ClipboardCheck size={18} color="#00C2FF" />,
      action: () => { router.push('/completion-records'); setOpen(false); }
    },
    {
      id: 'barcode-scan',
      titleAr: 'تشغيل ماسح الباركود والـ QR بالكاميرا',
      titleEn: 'Launch Camera Barcode / QR Scanner',
      categoryAr: 'أدوات سريعة',
      categoryEn: 'Quick Tools',
      icon: <Barcode size={18} color="#00E599" />,
      action: () => { 
        router.push('/inventory?scan=1'); 
        setOpen(false); 
      },
      shortcut: 'B'
    }
  ];

  const filtered = commands.filter(c => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      c.titleAr.toLowerCase().includes(query) ||
      c.titleEn.toLowerCase().includes(query) ||
      c.categoryAr.toLowerCase().includes(query) ||
      c.categoryEn.toLowerCase().includes(query)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100005,
        backgroundColor: 'rgba(6, 11, 20, 0.82)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fadeInOverlay 0.15s ease-out'
      }}
      onClick={() => setOpen(false)}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'rgba(12, 21, 36, 0.95)',
          border: '1px solid rgba(0, 229, 153, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 229, 153, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
          animation: 'scaleInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '12px'
          }}
        >
          <Search size={22} color="var(--accent-primary)" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            placeholder={language === 'ar' ? 'ابحث عن شاشة، كود صنف، رقم إذن، أو أمر سريع...' : 'Search screens, SKUs, transactions, or commands...'}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FFFFFF',
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'inherit'
            }}
          />
          <kbd
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
              {language === 'ar' ? 'لم يتم العثور على نتائج مطابقة' : 'No matching commands found'}
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(0, 229, 153, 0.14)' : 'transparent',
                    border: isSelected ? '1px solid rgba(0, 229, 153, 0.35)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(0, 229, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {item.icon}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 800 : 600, color: '#FFFFFF' }}>
                        {language === 'ar' ? item.titleAr : item.titleEn}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: isSelected ? 'var(--accent-primary)' : '#64748B' }}>
                        {language === 'ar' ? item.categoryAr : item.categoryEn}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.shortcut && (
                      <kbd
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#94A3B8',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <CornerDownLeft size={16} color="var(--accent-primary)" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div
          style={{
            padding: '10px 18px',
            background: 'rgba(6, 11, 20, 0.65)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>↑↓ {language === 'ar' ? 'للتنقل' : 'to navigate'}</span>
            <span>↵ {language === 'ar' ? 'للاختيار' : 'to select'}</span>
          </div>
          <span>Stockly Omni-Command HUD</span>
        </div>
      </div>
    </div>
  );
}
