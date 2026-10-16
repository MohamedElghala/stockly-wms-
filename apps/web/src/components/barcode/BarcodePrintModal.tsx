'use client';

import React, { useState } from 'react';
import { X, Printer, Check, Copy, Tag, Sliders } from 'lucide-react';
import { generateCode128Svg, generateQrCodeSvg, BarcodeStickerData } from '@/lib/barcodeEngine';
import toast from 'react-hot-toast';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BarcodeStickerData[];
}

export default function BarcodePrintModal({
  isOpen,
  onClose,
  items
}: BarcodePrintModalProps) {
  const [copies, setCopies] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<'STANDARD' | 'COMPACT' | 'SHELF'>('STANDARD');
  const [includeQr, setIncludeQr] = useState<boolean>(true);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[0]; // Primary preview item

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Interactive Modal UI */}
      <div 
        className="stockly-print-backdrop hide-on-print"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div 
          className="stockly-print-card"
          style={{
            width: '100%',
            maxWidth: '560px',
            background: '#041c18',
            border: '1px solid rgba(0, 223, 143, 0.3)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 223, 143, 0.15)',
            color: '#ffffff',
            fontFamily: "'Cairo', sans-serif",
            direction: 'rtl'
          }}
        >
          {/* Header */}
          <div 
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(0, 223, 143, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(180deg, rgba(0, 223, 143, 0.08) 0%, transparent 100%)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div 
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(0, 223, 143, 0.15)',
                  border: '1px solid rgba(0, 223, 143, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00DF8F'
                }}
              >
                <Tag size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                  طباعة ملصق الباركود و QR
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                  معاينة وطباعة ملصقات الرفوف والكراتين للطابعات الحرارية و A4
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div style={{ padding: '1.25rem' }}>
            
            {/* Live Sticker Preview Box */}
            <div 
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                margin: '0 auto 1.5rem',
                maxWidth: labelSize === 'COMPACT' ? '280px' : '360px',
                border: '2px solid #042F2C',
                position: 'relative'
              }}
            >
              {/* Sticker Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #00DF8F', paddingBottom: '6px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 900, fontSize: '13px', color: '#042F2C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📦 STOCKLY WMS</span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#00BF88', background: '#f0fdf4', padding: '2px 8px', borderRadius: '4px', border: '1px solid #86efac' }}>
                  {currentItem.category || 'عام'}
                </div>
              </div>

              {/* Item Name */}
              <div style={{ fontWeight: 900, fontSize: '15px', color: '#0f172a', marginBottom: '4px', lineHeight: '1.3' }}>
                {currentItem.name}
              </div>

              {/* Meta details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#475569', marginBottom: '8px' }}>
                <span>الوحدة: <strong>{currentItem.unit || 'عدد'}</strong></span>
                <span>المكان: <strong>{currentItem.zone || 'المستودع الرئيسي'}</strong></span>
              </div>

              {/* Visual Barcode & QR Area */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div 
                  style={{ flex: 1, textAlign: 'center' }}
                  dangerouslySetInnerHTML={{
                    __html: generateCode128Svg(currentItem.sku, {
                      width: labelSize === 'COMPACT' ? 180 : 220,
                      height: 55,
                      showText: true
                    })
                  }}
                />
                {includeQr && (
                  <div 
                    style={{ flexShrink: 0 }}
                    dangerouslySetInnerHTML={{
                      __html: generateQrCodeSvg(currentItem.sku, {
                        size: labelSize === 'COMPACT' ? 55 : 68
                      })
                    }}
                  />
                )}
              </div>
            </div>

            {/* Print Controls Toolbar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                  مقاس الملصق:
                </label>
                <select
                  value={labelSize}
                  onChange={(e: any) => setLabelSize(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: '#02100d',
                    border: '1.5px solid rgba(0, 223, 143, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="STANDARD">قياسي (70x40 مم - كراتين)</option>
                  <option value="COMPACT">مدمج (50x30 مم - قطع صغيرة)</option>
                  <option value="SHELF">رفوف ومواقع تخزين (مكبر)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                  عدد النسخ:
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: '#02100d',
                    border: '1.5px solid rgba(0, 223, 143, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

            </div>

            {/* Checkbox for QR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', cursor: 'pointer' }} onClick={() => setIncludeQr(!includeQr)}>
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  background: includeQr ? '#00DF8F' : 'transparent',
                  border: '1.5px solid #00DF8F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#041c18'
                }}
              >
                {includeQr && <Check size={14} strokeWidth={3} />}
              </div>
              <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                تضمين QR Code المباشر بجانب باركود Code 128
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: 'linear-gradient(135deg, #00DF8F 0%, #00BF88 100%)',
                  color: '#041c18',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 223, 143, 0.3)'
                }}
              >
                <Printer size={18} />
                <span>طباعة الملصق الآن (Print)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.8rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Pure Print-Only Rendering for Printers */}
      <div 
        className="stockly-print-labels-container show-on-print-only"
        style={{
          display: 'none',
          padding: 0,
          margin: 0
        }}
      >
        {items.flatMap((item) => 
          Array.from({ length: copies }).map((_, copyIndex) => (
            <div 
              key={`${item.sku}-${copyIndex}`}
              className="stockly-single-sticker-page"
              style={{
                width: labelSize === 'COMPACT' ? '50mm' : labelSize === 'SHELF' ? '100mm' : '70mm',
                padding: '3mm',
                margin: '0 auto 4mm',
                border: '1px solid #000',
                boxSizing: 'border-box',
                pageBreakInside: 'avoid',
                pageBreakAfter: 'always',
                fontFamily: "'Cairo', sans-serif",
                direction: 'rtl',
                background: '#fff',
                color: '#000'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: '1mm', marginBottom: '1.5mm', fontSize: '8pt', fontWeight: 'bold' }}>
                <span>📦 STOCKLY WMS</span>
                <span>{item.category}</span>
              </div>

              <div style={{ fontWeight: 'bold', fontSize: '9pt', marginBottom: '1.5mm', lineHeight: '1.2' }}>
                {item.name}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7pt', marginBottom: '1.5mm' }}>
                <span>الوحدة: {item.unit}</span>
                <span>المكان: {item.zone || 'المستودع الرئيسي'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2mm' }}>
                <div 
                  style={{ flex: 1, textAlign: 'center' }}
                  dangerouslySetInnerHTML={{
                    __html: generateCode128Svg(item.sku, {
                      width: labelSize === 'COMPACT' ? 140 : 190,
                      height: 45,
                      showText: true,
                      barColor: '#000000'
                    })
                  }}
                />
                {includeQr && (
                  <div 
                    style={{ flexShrink: 0 }}
                    dangerouslySetInnerHTML={{
                      __html: generateQrCodeSvg(item.sku, {
                        size: labelSize === 'COMPACT' ? 42 : 55,
                        color: '#000000',
                        bgColor: '#ffffff'
                      })
                    }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .stockly-print-labels-container, .stockly-print-labels-container * {
            visibility: visible !important;
          }
          .stockly-print-labels-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .hide-on-print {
            display: none !important;
          }
          @page {
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}
