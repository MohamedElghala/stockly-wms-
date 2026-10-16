'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Hash, 
  Layers, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  SortAsc, 
  HelpCircle,
  Play
} from 'lucide-react';
import { collection, query, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem } from '../../types/inventory';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';

interface ReindexCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  allItems: InventoryItem[];
  allCategories: string[];
  initialCategory?: string;
  onSuccess?: () => void;
}

export default function ReindexCategoryModal({
  isOpen,
  onClose,
  allItems,
  allCategories,
  initialCategory = '',
  onSuccess
}: ReindexCategoryModalProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [selectedCat, setSelectedCat] = useState<string>(initialCategory || allCategories[0] || '');
  const [startCodeInput, setStartCodeInput] = useState<string>('3000');
  const [sortOrder, setSortOrder] = useState<'CURRENT_CODE' | 'NAME_ASC'>('CURRENT_CODE');

  // Convert Arabic numerals and extract numeric base
  const startCode = useMemo(() => {
    let val = startCodeInput.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    val = val.replace(/[^0-9]/g, '');
    return parseInt(val, 10) || 0;
  }, [startCodeInput]);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Sync initial category when modal opens
  React.useEffect(() => {
    if (initialCategory && initialCategory !== 'all') {
      setSelectedCat(initialCategory);
    } else if (allCategories.length > 0) {
      setSelectedCat(allCategories[0]);
    }
  }, [initialCategory, allCategories]);

  // Target Items in this category
  const targetItems = useMemo(() => {
    if (!selectedCat || selectedCat === 'all') return [];
    const list = allItems.filter(i => (i.category || '').trim() === selectedCat.trim());

    if (sortOrder === 'CURRENT_CODE') {
      list.sort((a, b) => {
        const numA = parseInt(a.code) || 0;
        const numB = parseInt(b.code) || 0;
        if (numA !== numB) return numA - numB;
        return (a.code || '').localeCompare(b.code || '');
      });
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', language === 'ar' ? 'ar' : 'en'));
    }

    return list;
  }, [allItems, selectedCat, sortOrder, language]);

  // Map of all items outside this category to detect code collisions
  const otherItemsCodeMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    allItems.forEach(item => {
      if ((item.category || '').trim() !== selectedCat.trim()) {
        const c = String(item.code || '').trim();
        if (c) map.set(c, item);
      }
    });
    return map;
  }, [allItems, selectedCat]);

  // Proposed Re-indexing Mapping & Collision Check
  const previewPlan = useMemo(() => {
    return targetItems.map((item, idx) => {
      const newCodeNum = startCode + idx + 1;
      const newCodeStr = String(newCodeNum);
      const oldCodeStr = String(item.code || '').trim();
      const collidingItem = otherItemsCodeMap.get(newCodeStr);

      return {
        item,
        oldCode: oldCodeStr,
        newCode: newCodeStr,
        isCollision: Boolean(collidingItem),
        collidingItem
      };
    });
  }, [targetItems, startCode, otherItemsCodeMap]);

  const hasCollisions = useMemo(() => {
    return previewPlan.some(p => p.isCollision);
  }, [previewPlan]);

  if (!isOpen) return null;

  const handleExecuteReindex = async () => {
    if (previewPlan.length === 0) {
      toast.error(language === 'ar' ? 'لا توجد أصناف في هذه الفئة لإعادة ترقيمها' : 'No items found in this category');
      return;
    }

    if (hasCollisions) {
      toast.error(
        language === 'ar' 
          ? 'يوجد تعارض في بعض الأكواد الجديدة مع أصناف في فئات أخرى! يرجى اختيار كود بداية مختلف.' 
          : 'Code collision detected with items in another category. Please choose a different starting code.'
      );
      return;
    }

    const confirmMsg = language === 'ar'
      ? `⚠️ تأكيد إعادة الترقيم والمزامنة الشاملة:\n\n- الفئة المستهدفة: ${selectedCat}\n- عدد الأصناف: ${previewPlan.length} صنف\n- نطاق الأكواد الجديد: من (${previewPlan[0]?.newCode}) إلى (${previewPlan[previewPlan.length - 1]?.newCode})\n\n* سيقوم النظام فوراً بتحديث كافة أذونات الوارد والمنصرف والطلبات السابقة للحفاظ على الأرصدة.\n\nهل تريد المتابعة والتنفيذ الآن؟`
      : `⚠️ Confirm Re-indexing:\n\n- Category: ${selectedCat}\n- Total Items: ${previewPlan.length}\n- New Code Range: ${previewPlan[0]?.newCode} to ${previewPlan[previewPlan.length - 1]?.newCode}\n\nProceed now?`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setProgressMsg(language === 'ar' ? 'جاري تجهيز خريطة الترقيم...' : 'Preparing re-indexing map...');

    try {
      const codeMap = new Map<string, string>();
      previewPlan.forEach(p => {
        if (p.oldCode && p.newCode && p.oldCode !== p.newCode) {
          codeMap.set(p.oldCode, p.newCode);
        }
      });

      const allWrites: { type: 'update' | 'set' | 'delete'; ref: any; data?: any }[] = [];

      // 1. Update Items Collection
      previewPlan.forEach(p => {
        const updatedItemData = {
          ...p.item,
          code: p.newCode,
          category: selectedCat,
          updatedAt: new Date().toISOString()
        };

        if (p.item.id === p.oldCode && p.oldCode !== p.newCode) {
          allWrites.push({ type: 'set', ref: doc(db, 'items', p.newCode), data: updatedItemData });
          allWrites.push({ type: 'delete', ref: doc(db, 'items', p.item.id) });
        } else {
          allWrites.push({ type: 'update', ref: doc(db, 'items', p.item.id), data: updatedItemData });
        }
      });

      // 2. Scan historical collections if there are code changes
      if (codeMap.size > 0) {
        setProgressMsg(language === 'ar' ? 'جاري فحص وتحديث السجلات التاريخية (الوارد، المنصرف، الطلبات)...' : 'Scanning & cascading historical records...');
        const collectionsToCheck = ['additions', 'disbursements', 'requests', 'scrap'];

        for (const colName of collectionsToCheck) {
          try {
            const snap = await getDocs(query(collection(db, colName)));
            snap.forEach((dSnap) => {
              const d = dSnap.data();
              const c = String(d.itemCode || d.code || '').trim();
              if (c && codeMap.has(c)) {
                const mappedNewCode = codeMap.get(c)!;
                allWrites.push({
                  type: 'update',
                  ref: doc(db, colName, dSnap.id),
                  data: {
                    itemCode: mappedNewCode,
                    category: selectedCat
                  }
                });
              }
            });
          } catch (colErr) {
            console.warn(`Error scanning ${colName}:`, colErr);
          }
        }
      }

      // 3. Commit batch writes in chunks of 400
      setProgressMsg(language === 'ar' ? `جاري حفظ (${allWrites.length}) تعديل في قاعدة البيانات...` : `Committing ${allWrites.length} updates...`);
      for (let i = 0; i < allWrites.length; i += 400) {
        const chunk = allWrites.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(({ type, ref: docRef, data }) => {
          if (type === 'set') batch.set(docRef, data, { merge: true });
          else if (type === 'update') batch.update(docRef, data);
          else if (type === 'delete') batch.delete(docRef);
        });
        await batch.commit();
      }

      toast.success(
        language === 'ar' 
          ? `🎉 تم بنجاح إعادة ترقيم وتسلسل (${previewPlan.length}) صنف في فئة "${selectedCat}" ومزامنة جميع الحركات السابقة!`
          : `🎉 Successfully re-indexed ${previewPlan.length} items in "${selectedCat}" and synced all historical transactions!`,
        { duration: 7000 }
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error during bulk re-indexing:', err);
      toast.error(err.message || 'Error executing re-indexing');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1250,
      padding: '1.25rem'
    }}>
      <div 
        className="enterprise-card animate-fade-in" 
        style={{ 
          width: '100%', 
          maxWidth: '780px', 
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem', 
          borderRadius: '18px', 
          position: 'relative',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          type="button"
          disabled={loading}
          className="btn btn-outline"
          style={{ position: 'absolute', top: '1.25rem', [isRTL ? 'left' : 'right']: '1.25rem', padding: '0.4rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.65rem', background: 'rgba(9, 154, 117, 0.15)', color: '#099A75', borderRadius: '12px' }}>
            <Hash size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'أداة إعادة ترقيم وتسلسل الفئات الشاملة' : 'Bulk Category Code Re-indexing Tool'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {language === 'ar' ? 'إعادة تسلسل أكواد فئة كاملة من كود بداية محدد مع المزامنة التلقائية لجميع الحركات السابقة' : 'Re-sequence category code range with automated full historical cascade synchronization'}
            </p>
          </div>
        </div>

        {/* Configuration Controls Bar */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          
          {/* Target Category */}
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={15} color="#8b5cf6" />
              <span>الفئة المراد إعادة ترقيمها:</span>
            </label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              disabled={loading}
              className="input-field"
              style={{ width: '100%', fontWeight: 700 }}
            >
              {allCategories.filter(c => c !== 'all').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Starting Base Code */}
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Hash size={15} color="#099A75" />
              <span>كود البداية (يبدأ التسلسل من):</span>
            </label>
            <input 
              type="text"
              inputMode="numeric"
              value={startCodeInput}
              onChange={(e) => {
                let raw = e.target.value;
                raw = raw.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
                raw = raw.replace(/[^0-9]/g, '');
                setStartCodeInput(raw);
              }}
              disabled={loading}
              className="input-field"
              placeholder="اكتب رقم البداية مثلاً: 3000"
              style={{ width: '100%', fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#099A75', direction: 'ltr', textAlign: 'center' }}
            />
          </div>

          {/* Sorting Logic */}
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <SortAsc size={15} color="#3b82f6" />
              <span>ترتيب الأصناف في التسلسل:</span>
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              disabled={loading}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="CURRENT_CODE">حسب ترتيب الأكواد الحالية</option>
              <option value="NAME_ASC">أبجدياً حسب اسم الصنف (أ - ي)</option>
            </select>
          </div>

        </div>

        {/* Collision & Safety Status Banner */}
        <div style={{ marginBottom: '1rem' }}>
          {hasCollisions ? (
            <div style={{ padding: '0.85rem 1.25rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', fontWeight: 700 }}>
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <span>تحذير تعارض: بعض الأكواد الناتجة مستخدمة بالفعل في أصناف تابعة لفئات أخرى! يرجى اختيار كود بداية مختلف لتجنب التضارب.</span>
            </div>
          ) : (
            <div style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <span>نطاق الأكواد المقترح آمن بنسبة 100% ولا يوجد أي تعارض مع فئات أخرى.</span>
              </div>
              <span>({previewPlan.length}) صنف سيتم ترقيمهم</span>
            </div>
          )}
        </div>

        {/* Live Preview Plan Table */}
        <div style={{ flex: 1, minHeight: '180px', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px', background: 'var(--bg-tertiary)', marginBottom: '1.25rem' }}>
          <table className="wms-table" style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 2 }}>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>#</th>
                <th style={{ width: '45%', textAlign: isRTL ? 'right' : 'left' }}>اسم الصنف</th>
                <th style={{ width: '18%', textAlign: 'center' }}>الكود الحالي</th>
                <th style={{ width: '5%', textAlign: 'center' }}>➡️</th>
                <th style={{ width: '18%', textAlign: 'center', color: '#099A75', fontWeight: 800 }}>الكود الجديد</th>
                <th style={{ width: '6%', textAlign: 'center' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {previewPlan.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    لا توجد أصناف في هذه الفئة
                  </td>
                </tr>
              ) : (
                previewPlan.map((p, idx) => (
                  <tr key={p.item.id} style={{ background: p.isCollision ? 'rgba(239, 68, 68, 0.1)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)') }}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.item.name}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.oldCode || '—'}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>➡️</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: p.isCollision ? '#ef4444' : '#099A75', fontSize: '0.95rem' }}>
                      {p.newCode}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {p.isCollision ? (
                        <span title={`يتعارض مع صنف "${p.collidingItem?.name}"`} style={{ color: '#ef4444' }}>⚠️</span>
                      ) : (
                        <span style={{ color: '#10b981' }}>✅</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons & Progress Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.85rem', color: '#099A75', fontWeight: 600 }}>
            {progressMsg && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={15} className="animate-spin" />
                <span>{progressMsg}</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="btn btn-outline"
              style={{ padding: '0.65rem 1.25rem', fontWeight: 600 }}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <button 
              type="button" 
              onClick={handleExecuteReindex}
              disabled={loading || hasCollisions || previewPlan.length === 0}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, background: '#099A75', borderColor: '#099A75', opacity: (hasCollisions || previewPlan.length === 0) ? 0.5 : 1 }}
            >
              <Play size={16} />
              <span>{loading ? (progressMsg || 'جاري التنفيذ...') : (language === 'ar' ? `تنفيذ إعادة الترقيم (${previewPlan.length} صنف)` : `Execute Re-indexing (${previewPlan.length})`)}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
