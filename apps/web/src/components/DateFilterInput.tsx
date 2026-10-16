'use client';

import React, { useRef } from 'react';
import { Calendar, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DateFilterInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}

export default function DateFilterInput({ value, onChange, label }: DateFilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { language, t } = useLanguage();

  const displayLabel = label !== undefined ? label : t('common.specificDate');
  const placeholderText = language === 'ar' ? 'يوم / شهر / سنة' : 'DD / MM / YYYY';

  const handleOpenPicker = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === 'function') {
        try {
          inputRef.current.showPicker();
        } catch (e) {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {displayLabel && (
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
          {displayLabel}
        </label>
      )}
      <div 
        onClick={handleOpenPicker}
        className="input-field"
        style={{ 
          position: 'relative', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          minHeight: '42px',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: value ? 700 : 400, fontSize: '0.85rem', fontFamily: value ? 'monospace' : 'inherit' }}>
          <Calendar size={18} style={{ color: value ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
          <span>{value ? value : placeholderText}</span>
        </div>

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              padding: '2px', 
              display: 'flex', 
              alignItems: 'center' 
            }}
            title="مسح التاريخ"
          >
            <X size={16} />
          </button>
        )}

        <input 
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ 
            position: 'absolute', 
            opacity: 0, 
            pointerEvents: 'none', 
            width: '1px', 
            height: '1px', 
            bottom: 0, 
            right: 0 
          }}
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
