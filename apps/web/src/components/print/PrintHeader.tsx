'use client';

import React from 'react';
import BrandLogo from '@/components/common/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface PrintHeaderProps {
  title: string;
  documentNumber?: string;
  subtitle?: string;
  category?: string;
}

export default function PrintHeader({ title, documentNumber, subtitle, category }: PrintHeaderProps) {
  const { userData } = useAuth();
  const { language } = useLanguage();
  
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="print-official-header" style={{ width: '100%', direction: 'rtl', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '6px', marginBottom: '8px', boxSizing: 'border-box' }}>
      <div className="print-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl', width: '100%' }}>
        
        {/* 1. الجانب الأيمن (شعار النظام الرسمي المعتمد BrandLogo) */}
        <div className="print-logo-box" style={{ border: 'none', background: 'transparent', padding: 0, flexShrink: 0, direction: 'ltr' }}>
          <BrandLogo size="sm" showSubtitle={true} />
        </div>

        {/* 2. الوسط (عنوان المستند والتصنيف) */}
        <div className="print-title-box" style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
          <h2 className="print-title" style={{ fontSize: '13pt', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
            {title}
          </h2>
          {subtitle && (
            <p className="print-subtitle" style={{ fontSize: '7.5pt', fontWeight: 700, color: '#334155', margin: '3px 0 0 0', lineHeight: 1.3 }}>
              {subtitle}
            </p>
          )}
          {category && (
            <span className="print-category-badge" style={{ display: 'inline-block', fontSize: '8pt', fontWeight: 900, color: 'var(--accent-primary)', background: '#f0fdf4', border: '1.2px solid #86efac', padding: '1px 8px', borderRadius: '4px', marginTop: '3px' }}>
              القسم: {category}
            </span>
          )}
        </div>

        {/* 3. الجانب الأيسر (بيانات المستند والمستخدم) */}
        <div className="print-meta-box" style={{ textAlign: 'left', direction: 'rtl', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <div className="print-meta-row" style={{ fontSize: '7.5pt', color: '#475569', fontWeight: 700, lineHeight: 1.35 }}>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>كود المستند:</span> <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{documentNumber || `INV-DOC-${Date.now().toString().slice(-6)}`}</span>
          </div>
          <div className="print-meta-row" style={{ fontSize: '7.5pt', color: '#475569', fontWeight: 700, lineHeight: 1.35 }}>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>التاريخ:</span> {currentDate}
          </div>
          <div className="print-meta-row" style={{ fontSize: '7.5pt', color: '#475569', fontWeight: 700, lineHeight: 1.35 }}>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>المستخدم:</span> <span style={{ fontWeight: 800, color: '#0f172a' }}>{userData?.name || 'مسؤول النظام'}</span>
          </div>
        </div>

      </div>
      <div className="print-divider"></div>
    </div>
  );
}
