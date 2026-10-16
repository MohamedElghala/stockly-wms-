'use client';

import React, { useState, useRef } from 'react';
import { X, Plus, Save, Camera, ImageIcon, Trash2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, db, storage } from '@/lib/firebase';
import { INVENTORY_CATEGORIES, ItemCategory } from '../../types/inventory';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string;
  userName: string;
  userCategory: string;
}

export default function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: INVENTORY_CATEGORIES[0] as ItemCategory,
    unit: 'عدد',
    openingBalance: 0
  });

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewURL(url);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewURL('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'openingBalance' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.name.trim()) throw new Error(t('inventory.nameRequired'));
      if (formData.openingBalance < 0) throw new Error(t('inventory.openingBalanceNegative'));

      // Call Cloud Function to generate unique code & create item
      const createItemFn = httpsCallable(functions, 'createItem');
      const result = await createItemFn({
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit.trim(),
        openingBalance: formData.openingBalance
      });

      const data = result.data as { success: boolean; code: string; message: string };

      // Upload image if provided
      if (selectedFile && data.code) {
        try {
          const storageRef = ref(storage, `items/${data.code}_${Date.now()}`);
          await uploadBytes(storageRef, selectedFile);
          const downloadUrl = await getDownloadURL(storageRef);
          await updateDoc(doc(db, 'items', data.code), {
            imageURL: downloadUrl
          });
        } catch (imgErr) {
          console.warn("Storage upload fallback in AddItem:", imgErr);
        }
      }

      // Reset and close
      setFormData({
        name: '',
        category: INVENTORY_CATEGORIES[0] as ItemCategory,
        unit: 'عدد',
        openingBalance: 0
      });
      setSelectedFile(null);
      setPreviewURL('');
      toast.success(`${data.message} - كود الصنف: ${data.code}`);
      onClose();
    } catch (err: any) {
      const message = err?.details?.message || err?.message || 'Error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div className="enterprise-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '2rem', borderRadius: '16px', position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)' }}>
        <button 
          onClick={onClose}
          type="button"
          className="btn btn-outline"
          style={{ position: 'absolute', top: '1.25rem', [isRTL ? 'left' : 'right']: '1.25rem', padding: '0.4rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={18} />
        </button>

        <h2 className="heading-lg" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Plus size={24} color="var(--accent-primary)" />
          <span>{t('inventory.addNewItem')}</span>
        </h2>

        {error && (
          <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Image Upload Box */}
          <div style={{ background: 'var(--bg-tertiary)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', border: '2px solid var(--accent-primary)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {previewURL ? (
                <img src={previewURL} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ImageIcon size={28} color="var(--text-muted)" />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {language === 'ar' ? 'صورة الصنف (اختياري):' : 'Item Image (Optional):'}
              </span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                >
                  <Camera size={13} />
                  <span>{previewURL ? (language === 'ar' ? 'تغيير' : 'Change') : (language === 'ar' ? 'رفع صورة' : 'Upload')}</span>
                </button>

                {previewURL && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="btn btn-outline"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)', fontWeight: 600 }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-secondary" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('inventory.name')}</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              className="input-field" 
              placeholder={t('inventory.namePlaceholder')}
              required
              style={{ width: '100%', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="text-secondary" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('inventory.category')}</label>
              <select 
                name="category" 
                value={formData.category}
                onChange={handleChange}
                className="input-field"
                style={{ width: '100%', fontWeight: 600 }}
              >
                {INVENTORY_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-secondary" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('inventory.unit')}</label>
              <input 
                type="text" 
                name="unit" 
                value={formData.unit}
                onChange={handleChange}
                className="input-field" 
                placeholder="عدد / متر / طقم"
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="text-secondary" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>{t('inventory.openingBalance')}</label>
            <input 
              type="number" 
              name="openingBalance" 
              min="0"
              value={formData.openingBalance}
              onChange={handleChange}
              className="input-field" 
              style={{ width: '100%', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <button 
              type="button" 
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: '0.65rem 1.25rem', fontWeight: 600 }}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ padding: '0.65rem 1.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Save size={16} />
              <span>{loading ? t('common.loading') : t('common.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
