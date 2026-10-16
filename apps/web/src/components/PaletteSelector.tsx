'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';

type PaletteType = 'emerald' | 'amber' | 'sapphire';

interface PaletteOption {
  id: PaletteType;
  nameAr: string;
  nameEn: string;
  color: string;
  accent: string;
}

const PALETTES: PaletteOption[] = [
  {
    id: 'emerald',
    nameAr: 'الزمرد السيبراني (الأصلي)',
    nameEn: 'Cyber Emerald',
    color: '#00E599',
    accent: '#00C2FF'
  },
  {
    id: 'amber',
    nameAr: 'عنبر السلامة الصناعية',
    nameEn: 'Industrial Amber',
    color: '#F59E0B',
    accent: '#10B981'
  },
  {
    id: 'sapphire',
    nameAr: 'ياقوت الشحن واللوجستيات',
    nameEn: 'Global Sapphire',
    color: '#2563EB',
    accent: '#06D6A0'
  }
];

export default function PaletteSelector() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<PaletteType>('emerald');
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem('stockly_palette') as PaletteType) || 'emerald';
    setCurrent(saved);
    document.documentElement.setAttribute('data-palette', saved);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (paletteId: PaletteType) => {
    setCurrent(paletteId);
    document.documentElement.setAttribute('data-palette', paletteId);
    localStorage.setItem('stockly_palette', paletteId);
    setOpen(false);
    toast.success(
      language === 'ar' ? 'تم تبديل باليتة الألوان بنجاح' : 'Theme palette updated',
      { icon: '🎨', duration: 2500 }
    );
  };

  if (!mounted) {
    return (
      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
    );
  }

  const activeOption = PALETTES.find(p => p.id === current) || PALETTES[0];

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-glass"
        style={{
          width: '38px',
          height: '38px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          color: activeOption.color,
          background: open ? 'var(--accent-primary-glass)' : 'var(--bg-tertiary)',
          borderColor: open ? activeOption.color : 'var(--border-light)',
          boxShadow: open ? `0 0 12px ${activeOption.color}40` : 'none',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        title={language === 'ar' ? 'تخصيص ألوان المنظومة' : 'Theme Palette'}
        aria-label="Theme Palette"
      >
        <Palette size={18} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: language === 'ar' ? 0 : 'auto',
            right: language === 'ar' ? 'auto' : 0,
            width: '230px',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5), 0 0 15px var(--accent-primary-glass)',
            padding: '8px',
            zIndex: 1000,
            animation: 'fadeInMenu 0.15s ease-out'
          }}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div 
            style={{ 
              padding: '6px 10px 8px 10px', 
              fontSize: '11px', 
              fontWeight: 800, 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              borderBottom: '1px solid var(--border-light)',
              marginBottom: '6px'
            }}
          >
            {language === 'ar' ? 'اختر مظهر وألوان المنظومة' : 'Select Theme Palette'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {PALETTES.map((p) => {
              const isSelected = p.id === current;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isSelected ? `1px solid ${p.color}50` : '1px solid transparent',
                    background: isSelected ? `${p.color}15` : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 500,
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
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: p.color,
                        boxShadow: `0 0 8px ${p.color}`,
                        display: 'inline-block',
                        flexShrink: 0
                      }}
                    />
                    <span>{language === 'ar' ? p.nameAr : p.nameEn}</span>
                  </div>

                  {isSelected && <Check size={16} color={p.color} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
