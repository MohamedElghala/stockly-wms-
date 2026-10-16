'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Save, 
  Layers, 
  Tag, 
  Package, 
  Hash, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowLeftRight,
  ShieldAlert,
  Ban
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem, INVENTORY_CATEGORIES, ShortageOverride } from '../../types/inventory';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onItemUpdated?: () => void;
  allCategories?: string[];
}

export default function EditItemModal({ isOpen, onClose, item, onItemUpdated, allCategories }: EditItemModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    unit: 'عدد',
    stock: 0,
    alertLimit: 10,
    shortageOverride: 'AUTO' as ShortageOverride,
    substituteNotes: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open so the background page stays completely fixed
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      // Determine initial shortage override
      let initialOverride: ShortageOverride = (item.shortageOverride as ShortageOverride) || 'AUTO';
      if (!item.shortageOverride) {
        if (item.classification === 'ON_DEMAND') initialOverride = 'ON_DEMAND';
        else if (item.classification === 'NORMAL') initialOverride = 'NORMAL';
        else if (item.classification === 'CRITICAL') initialOverride = 'AUTO';
      }

      setFormData({
        code: item.code || item.id || '',
        name: item.name || '',
        category: item.category || '',
        unit: item.unit || 'عدد',
        stock: Number(item.stock) || 0,
        alertLimit: Number(item.alertLimit) || 10,
        shortageOverride: initialOverride,
        substituteNotes: item.substituteNotes || ''
      });
    }
  }, [item]);

  if (!isOpen || !item || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const itemRef = doc(db, 'items', item.id);
      
      // Calculate effective classification based on override
      let newClassification = 'ACTIVE';
      if (formData.shortageOverride === 'ON_DEMAND') {
        newClassification = 'ON_DEMAND';
      } else if (formData.shortageOverride === 'NORMAL') {
        newClassification = 'NORMAL';
      } else if (formData.shortageOverride === 'CRITICAL') {
        newClassification = 'CRITICAL';
      } else {
        // AUTO
        newClassification = formData.stock <= 0 ? 'CRITICAL' : (formData.stock <= formData.alertLimit ? 'CRITICAL' : 'ACTIVE');
      }

      await updateDoc(itemRef, {
        name: formData.name.trim(),
        category: formData.category.trim(),
        unit: formData.unit.trim(),
        alertLimit: Number(formData.alertLimit) || 10,
        shortageOverride: formData.shortageOverride,
        classification: newClassification,
        status: newClassification,
        substituteNotes: formData.substituteNotes.trim(),
        updatedAt: Date.now(),
        lastManualOverrideAt: new Date().toISOString()
      });

      if (onItemUpdated) onItemUpdated();
      alert(`تم تحديث الصنف [${formData.code} - ${formData.name}] وتطبيق تصنيف النواقص بنجاح!`);
      onClose();
    } catch (err: any) {
      console.error('Error updating item:', err);
      alert(`حدث خطأ أثناء حفظ التعديل: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '1rem',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          direction: 'rtl',
          color: '#f8fafc',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(0, 240, 255, 0.15)',
              padding: '0.6rem',
              borderRadius: '12px',
              color: '#00f0ff'
            }}>
              <Package size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>تعديل وتصنيف الصنف</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                كود الصنف: <span style={{ color: '#00f0ff', fontWeight: 700 }}>{formData.code}</span>
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form 
          onSubmit={handleSubmit} 
          style={{ 
            padding: '1.5rem',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 85px)'
          }}
        >
          
          {/* Section 1: Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                اسم الصنف
              </label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                الوحدة
              </label>
              <input 
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                القسم / الفئة
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              >
                {INVENTORY_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                الرصيد الفعلي
              </label>
              <input 
                type="number"
                value={formData.stock}
                disabled
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: '#94a3b8',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                حد الأمان (الإنذار)
              </label>
              <input 
                type="number"
                min="0"
                value={formData.alertLimit}
                onChange={(e) => setFormData({ ...formData, alertLimit: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fbbf24',
                  fontSize: '0.95rem',
                  fontWeight: 700
                }}
              />
            </div>
          </div>

          {/* Section 2: Managerial Shortage Override (الرؤية الإدارية) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1.5px solid rgba(0, 240, 255, 0.25)',
            borderRadius: '14px',
            padding: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <ArrowLeftRight size={18} color="#00f0ff" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#00f0ff' }}>
                الرؤية الإدارية للنواقص والبدائل (استثناء الصنف)
              </h3>
            </div>
            
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              يمكنك استثناء الصنف من النقص الحرج أو إزالته تماماً من طلبات الشراء لتوفير السيولة ومنع التكدس (خاصة إذا كان له بديل متاح بالموقع أو يُطلب فقط عند الحاجة).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              
              {/* Option 1: AUTO */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: '10px',
                background: formData.shortageOverride === 'AUTO' ? 'rgba(0, 240, 255, 0.12)' : 'rgba(30, 41, 59, 0.6)',
                border: formData.shortageOverride === 'AUTO' ? '1.5px solid #00f0ff' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
              }}>
                <input 
                  type="radio" 
                  name="shortageOverride"
                  value="AUTO"
                  checked={formData.shortageOverride === 'AUTO'}
                  onChange={() => setFormData({ ...formData, shortageOverride: 'AUTO' })}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>تلقائي (حسب السيستم)</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>حساب النقص تلقائياً حسب السحب</div>
                </div>
              </label>

              {/* Option 2: NORMAL (له بديل / غير حرج) */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: '10px',
                background: formData.shortageOverride === 'NORMAL' ? 'rgba(250, 204, 21, 0.12)' : 'rgba(30, 41, 59, 0.6)',
                border: formData.shortageOverride === 'NORMAL' ? '1.5px solid #facc15' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
              }}>
                <input 
                  type="radio" 
                  name="shortageOverride"
                  value="NORMAL"
                  checked={formData.shortageOverride === 'NORMAL'}
                  onChange={() => setFormData({ ...formData, shortageOverride: 'NORMAL' })}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#facc15' }}>استثناء: نقص عادي</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>تنزيل من الحرج للعادي (غير طارئ)</div>
                </div>
              </label>

              {/* Option 3: ON_DEMAND (بالطلب فقط / له بديل) */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: '10px',
                background: formData.shortageOverride === 'ON_DEMAND' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                border: formData.shortageOverride === 'ON_DEMAND' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
              }}>
                <input 
                  type="radio" 
                  name="shortageOverride"
                  value="ON_DEMAND"
                  checked={formData.shortageOverride === 'ON_DEMAND'}
                  onChange={() => setFormData({ ...formData, shortageOverride: 'ON_DEMAND' })}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#c084fc' }}>مستثنى: بالطلب فقط</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>استبعاد تام من النواقص والشراء</div>
                </div>
              </label>

              {/* Option 4: CRITICAL (حرج إلزامي) */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: '10px',
                background: formData.shortageOverride === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                border: formData.shortageOverride === 'CRITICAL' ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
              }}>
                <input 
                  type="radio" 
                  name="shortageOverride"
                  value="CRITICAL"
                  checked={formData.shortageOverride === 'CRITICAL'}
                  onChange={() => setFormData({ ...formData, shortageOverride: 'CRITICAL' })}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f87171' }}>حرج إلزامي (استراتيجي)</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>تنبيه أحمر دائم عند الصفر أو النقص</div>
                </div>
              </label>

            </div>

            {/* Substitute Notes Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                بيان الصنف البديل / سبب الاستثناء:
              </label>
              <input 
                type="text"
                placeholder="مثال: له بديل متوفر كود 116126 مسمار بواب (14 كيلو بالمخزن) أو بالطلب لمشروع خاص"
                value={formData.substituteNotes}
                onChange={(e) => setFormData({ ...formData, substituteNotes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)',
                border: 'none',
                color: '#0f172a',
                cursor: 'pointer',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(0, 240, 255, 0.3)'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  جاري الحفظ بالسستم اللايف...
                </>
              ) : (
                <>
                  <Save size={18} />
                  حفظ وتطبيق الرؤية الإدارية
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

