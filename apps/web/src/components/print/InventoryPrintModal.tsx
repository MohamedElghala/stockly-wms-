'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, 
  CheckCircle2, 
  FolderTree, 
  Eye, 
  EyeOff, 
  X, 
  BookmarkCheck
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface InventoryPrintOptions {
  scope: 'ALL_CATEGORIES' | 'CURRENT_FILTER' | 'SELECTED_CATEGORY';
  targetCategory?: string;
  pageBreakPerDept: boolean;
  includeCoverPage: boolean;
  includeSignatures: boolean;
  includeZeroStock: boolean;
  sheetMode: 'AUDIT' | 'BLIND';
}

interface InventoryPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (options: InventoryPrintOptions) => void;
  categories: string[];
  currentCategory: string;
  currentSheetMode: 'AUDIT' | 'BLIND';
  totalActiveItemsCount: number;
  totalAllItemsCount: number;
}

export default function InventoryPrintModal({
  isOpen,
  onClose,
  onPrint,
  categories,
  currentCategory,
  currentSheetMode,
  totalActiveItemsCount,
  totalAllItemsCount,
}: InventoryPrintModalProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [mounted, setMounted] = useState(false);

  const [scope, setScope] = useState<'ALL_CATEGORIES' | 'CURRENT_FILTER' | 'SELECTED_CATEGORY'>('ALL_CATEGORIES');
  const [targetCategory, setTargetCategory] = useState<string>(currentCategory !== 'ALL' ? currentCategory : (categories[0] || ''));
  const [pageBreakPerDept, setPageBreakPerDept] = useState<boolean>(true);
  const [includeCoverPage, setIncludeCoverPage] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeZeroStock, setIncludeZeroStock] = useState<boolean>(true);
  const [sheetMode, setSheetMode] = useState<'AUDIT' | 'BLIND'>(currentSheetMode);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSheetMode(currentSheetMode);
      if (currentCategory && currentCategory !== 'ALL') {
        setTargetCategory(currentCategory);
        setScope('SELECTED_CATEGORY');
        setIncludeCoverPage(false);
      } else {
        setScope('ALL_CATEGORIES');
        setIncludeCoverPage(true);
        if (categories.length > 0 && !targetCategory) {
          setTargetCategory(categories[0]);
        }
      }
    }
  }, [isOpen, currentCategory, currentSheetMode, categories]);

  if (!isOpen || !mounted) return null;

  const handleStartPrint = () => {
    onPrint({
      scope,
      targetCategory: scope === 'SELECTED_CATEGORY' ? targetCategory : undefined,
      pageBreakPerDept,
      includeCoverPage,
      includeSignatures,
      includeZeroStock,
      sheetMode
    });
    onClose();
  };

  const modalContent = (
    <div 
      className="modal-backdrop hide-on-print"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '3vh 1rem 1rem 1rem',
        overflowY: 'auto',
        direction: isAr ? 'rtl' : 'ltr'
      }}
    >
      <div 
        className="enterprise-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          borderRadius: '20px',
          padding: '1.5rem 1.75rem',
          border: '1.5px solid rgba(0, 229, 153, 0.4)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
          marginTop: 0
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0, 229, 153, 0.12)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Printer size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {isAr ? 'تنسيق وطباعة كشوف الجرد الفعلي' : 'Inventory Sheets Print Manager'}
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isAr ? 'تخصيص فصل الأقسام، صفحات الغلاف، ونمط الجرد بجودة رسمية جاهزة للطباعة' : 'Configure department separation, cover sheets, and print mode'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-outline"
            style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Print Scope Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
            {isAr ? '1. نطاق الأقسام المراد طباعتها:' : '1. Department Print Scope:'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
            
            {/* Scope: All Categories */}
            <div 
              onClick={() => setScope('ALL_CATEGORIES')}
              style={{
                border: scope === 'ALL_CATEGORIES' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
                background: scope === 'ALL_CATEGORIES' ? 'rgba(0, 229, 153, 0.08)' : 'var(--bg-tertiary)',
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {scope === 'ALL_CATEGORIES' && (
                <div style={{ position: 'absolute', top: '8px', [isAr ? 'left' : 'right']: '8px', color: 'var(--accent-primary)' }}>
                  <CheckCircle2 size={18} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <FolderTree size={18} color="var(--accent-primary)" />
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {isAr ? 'كافة الأقسام (الكل دفعة واحدة)' : 'All Departments (All-in-One)'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {isAr ? 'طباعة شاملة لجميع أقسام المستودع مع فصل وتنسيق كشف كل قسم مستقلاً.' : 'Print all departments separated with distinct headers and counts.'}
              </p>
              <div style={{ marginTop: '0.5rem', display: 'inline-block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(0, 229, 153, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                {isAr ? 'موصى به للجرد الدوري' : 'Recommended for Audit'}
              </div>
            </div>

            {/* Scope: Selected Category Only */}
            <div 
              onClick={() => setScope('SELECTED_CATEGORY')}
              style={{
                border: scope === 'SELECTED_CATEGORY' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
                background: scope === 'SELECTED_CATEGORY' ? 'rgba(0, 229, 153, 0.08)' : 'var(--bg-tertiary)',
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {scope === 'SELECTED_CATEGORY' && (
                <div style={{ position: 'absolute', top: '8px', [isAr ? 'left' : 'right']: '8px', color: 'var(--accent-primary)' }}>
                  <CheckCircle2 size={18} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <BookmarkCheck size={18} color="#3b82f6" />
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {isAr ? 'قسم محدد فقط' : 'Specific Department'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {isAr ? 'طباعة كشف مخصص لقسم واحد لتسليمه للفني أو رئيس قسم معين.' : 'Print a dedicated sheet for a single selected department.'}
              </p>
              {scope === 'SELECTED_CATEGORY' && (
                <div style={{ marginTop: '0.6rem' }} onClick={e => e.stopPropagation()}>
                  <select
                    value={targetCategory}
                    onChange={e => setTargetCategory(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 2. Mode of Stocktaking (Audit vs Blind) */}
        <div style={{ marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.6rem' }}>
            {isAr ? '2. نوع ونمط كشف الجرد المطبوع:' : '2. Stocktaking Sheet Format Mode:'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            
            <button
              type="button"
              onClick={() => setSheetMode('AUDIT')}
              className={`btn ${sheetMode === 'AUDIT' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.65rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Eye size={16} />
              <span>{isAr ? 'كشف معلن (بالأرصدة الدفترية)' : 'Standard Audit (With Balance)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSheetMode('BLIND')}
              className={`btn ${sheetMode === 'BLIND' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.65rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <EyeOff size={16} />
              <span>{isAr ? 'كشف أعمى (مخفي الأرصدة للنزاهة)' : 'Blind Count (Hidden Balances)'}</span>
            </button>

          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {sheetMode === 'AUDIT' 
              ? (isAr ? '✓ يطبع الرصيد المسجل بالدفتر بجانب خانة فارغة لكتابة الرصيد الفعلي وحساب الفارق.' : '✓ Prints the book balance alongside a space for manual count.')
              : (isAr ? '✓ يخفي الرصيد الدفتري تماماً لمنع الاعتماد على الأرقام الدفترية وإلزام لجنة الجرد بالعد الفعلي.' : '✓ Leaves count column blank for strict physical verification.')}
          </p>
        </div>

        {/* 3. Formatting & Separation Options */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>
            {isAr ? '3. خيارات التنسيق والفصل الذكي:' : '3. Separation & Layout Options:'}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Page Break Per Department */}
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border-light)' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>
                  {isAr ? 'فصل كل قسم في صفحة جديدة (Page Break)' : 'Start each department on a new page'}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isAr ? 'يبدأ كشف كل قسم بصفحة مستقلة لتسهيل تسليم الكشوف للجان الفنية المختلفة.' : 'Ensures clean physical distribution to different teams.'}
                </span>
              </div>
              <input 
                type="checkbox"
                checked={pageBreakPerDept}
                onChange={e => setPageBreakPerDept(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </label>

            {/* Executive Cover Page */}
            {scope === 'ALL_CATEGORIES' && (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border-light)' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>
                    {isAr ? 'تضمين صفحة غلاف وفهرس إجمالي للمخزن' : 'Include Executive Cover & Summary Page'}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {isAr ? 'صفحة أولى رسمية تتضمن جدولاً ملخصاً لكافة أقسام المستودع وإجمالي الأرصدة.' : 'Front-page index table summarizing all departments.'}
                  </span>
                </div>
                <input 
                  type="checkbox"
                  checked={includeCoverPage}
                  onChange={e => setIncludeCoverPage(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </label>
            )}

            {/* Signatures Block per department */}
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border-light)' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>
                  {isAr ? 'تضمين أختام وتوقيعات لجنة الجرد لكل قسم' : 'Include Signatures & Approvals per Department'}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isAr ? 'مربعات توقيع معتمدة لأمين المخزن، فني القسم، ورئيس لجنة الجرد بنهاية كل كشف.' : 'Official signature boxes at the end of each department section.'}
                </span>
              </div>
              <input 
                type="checkbox"
                checked={includeSignatures}
                onChange={e => setIncludeSignatures(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </label>

            {/* Stock Scope: Full Catalog (902 items) vs Active Stock Only (424 items) */}
            <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>
                  {isAr ? 'نطاق شمولية الأصناف بالكشوف المطبوعة:' : 'Printed Items Stock Scope:'}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isAr ? 'حدد ما إذا كنت تريد جرد كافة أصناف المستودع بالكامل أو حصر البضاعة المتوفرة برصيد فقط.' : 'Choose whether to audit all catalog items or only items in stock.'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIncludeZeroStock(true)}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: includeZeroStock ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
                    background: includeZeroStock ? 'rgba(0, 229, 153, 0.12)' : 'transparent',
                    color: includeZeroStock ? 'var(--accent-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span>{isAr ? '✓ كافة الأصناف (جرد شامل)' : '✓ All Items (Full Audit)'}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.85 }}>
                    {isAr ? `الـ ${totalAllItemsCount || 902} صنفاً بالـ 17 قسماً (بما فيها الصفرية)` : `All ${totalAllItemsCount || 902} items across 17 depts`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeZeroStock(false)}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: !includeZeroStock ? '2px solid #0284c7' : '1px solid var(--border-light)',
                    background: !includeZeroStock ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                    color: !includeZeroStock ? '#0284c7' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span>{isAr ? 'الأصناف المتوفرة برصيد فقط' : 'In-Stock Items Only'}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.85 }}>
                    {isAr ? `فقط الـ ${totalActiveItemsCount || 424} صنفاً ذات الرصيد > 0` : `Only ${totalActiveItemsCount || 424} items with balance > 0`}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
          <button 
            type="button"
            onClick={onClose} 
            className="btn btn-outline"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          <button 
            type="button"
            onClick={handleStartPrint}
            className="btn btn-primary"
            style={{ 
              padding: '0.65rem 1.5rem', 
              fontSize: '0.95rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)'
            }}
          >
            <Printer size={18} />
            <span>{isAr ? 'بدء الطباعة الآن' : 'Print Sheets Now'}</span>
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

