'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Filter, 
  Printer, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Building2, 
  ArrowRightLeft, 
  Sparkles, 
  Info,
  X,
  History,
  QrCode,
  Barcode
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import BarcodePrintModal from '@/components/barcode/BarcodePrintModal';
import { BarcodeStickerData } from '@/lib/barcodeEngine';
import toast from 'react-hot-toast';

interface StorageBin {
  id: string;
  aisle: 'A' | 'B' | 'C' | 'D';
  rackNumber: number;
  level: 1 | 2 | 3;
  sku: string;
  itemNameAr: string;
  itemNameEn: string;
  category: string;
  currentStock: number;
  maxCapacity: number;
  status: 'OPTIMAL' | 'LOW' | 'EMPTY';
  lastMovement: string;
}

// Generate realistic warehouse bins
const GENERATED_BINS: StorageBin[] = [
  // Aisle A (Raw Materials & Heavy Tools)
  { id: 'A-01-L1', aisle: 'A', rackNumber: 1, level: 1, sku: 'RAW-101', itemNameAr: 'حديد تسليح عالي المقاومة 12مم', itemNameEn: 'Reinforced Steel Bars 12mm', category: 'رخام ومواد بناء', currentStock: 450, maxCapacity: 500, status: 'OPTIMAL', lastMovement: 'اليوم 14:20' },
  { id: 'A-01-L2', aisle: 'A', rackNumber: 1, level: 2, sku: 'RAW-102', itemNameAr: 'أسمنت بورتلاندي معتمد 50كجم', itemNameEn: 'Portland Cement 50kg', category: 'رخام ومواد بناء', currentStock: 320, maxCapacity: 400, status: 'OPTIMAL', lastMovement: 'أمس 11:00' },
  { id: 'A-01-L3', aisle: 'A', rackNumber: 1, level: 3, sku: 'RAW-103', itemNameAr: 'لفائف عزل مائي وبوليمر 4مم', itemNameEn: 'Waterproof Membrane Rolls', category: 'رخام ومواد بناء', currentStock: 18, maxCapacity: 150, status: 'LOW', lastMovement: 'منذ 3 أيام' },
  { id: 'A-02-L1', aisle: 'A', rackNumber: 2, level: 1, sku: 'RAW-201', itemNameAr: 'محبس فراشة هيدروليكي 4 بوصة', itemNameEn: 'Butterfly Valve 4 inch', category: 'أدوات وسباكة وشبكات', currentStock: 85, maxCapacity: 100, status: 'OPTIMAL', lastMovement: 'اليوم 16:10' },
  { id: 'A-02-L2', aisle: 'A', rackNumber: 2, level: 2, sku: 'RAW-202', itemNameAr: 'وصلة تمدد مرنة ضغط عالي', itemNameEn: 'Flexible Expansion Joint', category: 'أدوات وسباكة وشبكات', currentStock: 0, maxCapacity: 80, status: 'EMPTY', lastMovement: 'منذ أسبوع' },
  { id: 'A-02-L3', aisle: 'A', rackNumber: 2, level: 3, sku: 'RAW-203', itemNameAr: 'محابس سكينة برونز 2 بوصة', itemNameEn: 'Gate Valve Bronze 2 inch', category: 'أدوات وسباكة وشبكات', currentStock: 12, maxCapacity: 120, status: 'LOW', lastMovement: 'أمس 09:30' },

  // Aisle B (Electrical & MRO Spare Parts)
  { id: 'B-01-L1', aisle: 'B', rackNumber: 1, level: 1, sku: 'ELE-301', itemNameAr: 'كابلات نحاس معزولة 4x16 مم', itemNameEn: 'Copper Cables 4x16mm', category: 'أدوات كهربائية وإلكترونيات', currentStock: 1200, maxCapacity: 1500, status: 'OPTIMAL', lastMovement: 'اليوم 10:45' },
  { id: 'B-01-L2', aisle: 'B', rackNumber: 1, level: 2, sku: 'ELE-302', itemNameAr: 'قاطع تيار أوتوماتيك 3 فاز 63A', itemNameEn: 'Circuit Breaker 3P 63A', category: 'أدوات كهربائية وإلكترونيات', currentStock: 42, maxCapacity: 50, status: 'OPTIMAL', lastMovement: 'اليوم 12:00' },
  { id: 'B-01-L3', aisle: 'B', rackNumber: 1, level: 3, sku: 'ELE-303', itemNameAr: 'مفتاح مغناطيسي كونتكتور 40A', itemNameEn: 'Magnetic Contactor 40A', category: 'أدوات كهربائية وإلكترونيات', currentStock: 6, maxCapacity: 60, status: 'LOW', lastMovement: 'منذ يومين' },
  { id: 'B-02-L1', aisle: 'B', rackNumber: 2, level: 1, sku: 'ELE-401', itemNameAr: 'محركات كهربائية حثية 5.5 حصان', itemNameEn: 'Electric Motor 5.5HP', category: 'أدوات ميكانيكا وصيانة', currentStock: 14, maxCapacity: 20, status: 'OPTIMAL', lastMovement: 'أمس 15:20' },
  { id: 'B-02-L2', aisle: 'B', rackNumber: 2, level: 2, sku: 'ELE-402', itemNameAr: 'سيور ناقلة ومسارات تشغيل V-Belt', itemNameEn: 'Industrial V-Belts', category: 'أدوات ميكانيكا وصيانة', currentStock: 0, maxCapacity: 100, status: 'EMPTY', lastMovement: 'منذ 5 أيام' },
  { id: 'B-02-L3', aisle: 'B', rackNumber: 2, level: 3, sku: 'ELE-403', itemNameAr: 'رولمان بلي عالي السرعة SKF 6208', itemNameEn: 'Ball Bearing SKF 6208', category: 'أدوات ميكانيكا وصيانة', currentStock: 95, maxCapacity: 100, status: 'OPTIMAL', lastMovement: 'اليوم 13:15' },

  // Aisle C (Finished Goods & Fast Moving FMCG)
  { id: 'C-01-L1', aisle: 'C', rackNumber: 1, level: 1, sku: 'FMC-501', itemNameAr: 'عبوات كراتين شحن مقوى مقاس A4', itemNameEn: 'Corrugated Shipping Cartons', category: 'مواد خام وتعبئة وتغليف', currentStock: 2400, maxCapacity: 3000, status: 'OPTIMAL', lastMovement: 'اليوم 17:00' },
  { id: 'C-01-L2', aisle: 'C', rackNumber: 1, level: 2, sku: 'FMC-502', itemNameAr: 'رولات تغليف ستريتش فيلم حراري', itemNameEn: 'Stretch Film Rolls', category: 'مواد خام وتعبئة وتغليف', currentStock: 80, maxCapacity: 250, status: 'LOW', lastMovement: 'اليوم 14:10' },
  { id: 'C-01-L3', aisle: 'C', rackNumber: 1, level: 3, sku: 'FMC-503', itemNameAr: 'شريط لاصق لوجستي شفاف 50 مم', itemNameEn: 'Packaging Tape 50mm', category: 'مواد خام وتعبئة وتغليف', currentStock: 650, maxCapacity: 800, status: 'OPTIMAL', lastMovement: 'أمس 16:40' },
  { id: 'C-02-L1', aisle: 'C', rackNumber: 2, level: 1, sku: 'FMC-601', itemNameAr: 'ملابس وأحذية أمان صناعي Safety Shoes', itemNameEn: 'Industrial Safety Shoes', category: 'مهمات السلامة والأمن الصناعي', currentStock: 110, maxCapacity: 120, status: 'OPTIMAL', lastMovement: 'اليوم 11:30' },
  { id: 'C-02-L2', aisle: 'C', rackNumber: 2, level: 2, sku: 'FMC-602', itemNameAr: 'خوذات حماية رأس معتمدة EN397', itemNameEn: 'Safety Helmets EN397', category: 'مهمات السلامة والأمن الصناعي', currentStock: 0, maxCapacity: 75, status: 'EMPTY', lastMovement: 'منذ يومين' },
  { id: 'C-02-L3', aisle: 'C', rackNumber: 2, level: 3, sku: 'FMC-603', itemNameAr: 'نظارات واقية ضد الصدمات والغبار', itemNameEn: 'Safety Goggles Anti-Dust', category: 'مهمات السلامة والأمن الصناعي', currentStock: 8, maxCapacity: 100, status: 'LOW', lastMovement: 'اليوم 09:15' },

  // Aisle D (Tech Equipment & Hardware)
  { id: 'D-01-L1', aisle: 'D', rackNumber: 1, level: 1, sku: 'TCH-701', itemNameAr: 'أجهزة مسح باركود لاسلكية Zebra 2D', itemNameEn: 'Zebra 2D Barcode Scanners', category: 'مستلزمات تقنية وحاسب آلي', currentStock: 25, maxCapacity: 30, status: 'OPTIMAL', lastMovement: 'اليوم 15:50' },
  { id: 'D-01-L2', aisle: 'D', rackNumber: 1, level: 2, sku: 'TCH-702', itemNameAr: 'طابعات باركود حرارية سطحية Zebra ZD', itemNameEn: 'Thermal Barcode Printers', category: 'مستلزمات تقنية وحاسب آلي', currentStock: 12, maxCapacity: 15, status: 'OPTIMAL', lastMovement: 'أمس 13:00' },
  { id: 'D-01-L3', aisle: 'D', rackNumber: 1, level: 3, sku: 'TCH-703', itemNameAr: 'راوترات صناعية وشبكات Wi-Fi 6', itemNameEn: 'Industrial Wi-Fi 6 AP', category: 'مستلزمات تقنية وحاسب آلي', currentStock: 3, maxCapacity: 20, status: 'LOW', lastMovement: 'منذ 4 أيام' },
  { id: 'D-02-L1', aisle: 'D', rackNumber: 2, level: 1, sku: 'TCH-801', itemNameAr: 'سلالم ألومنيوم متحركة 6 درجات', itemNameEn: 'Aluminum Safety Ladders', category: 'عدد ومعدات صناعية', currentStock: 18, maxCapacity: 20, status: 'OPTIMAL', lastMovement: 'اليوم 10:00' },
  { id: 'D-02-L2', aisle: 'D', rackNumber: 2, level: 2, sku: 'TCH-802', itemNameAr: 'تروللي ومعدات نقل يدوي 300كجم', itemNameEn: 'Hand Pallet Truck 300kg', category: 'عدد ومعدات صناعية', currentStock: 8, maxCapacity: 10, status: 'OPTIMAL', lastMovement: 'أمس 14:15' },
  { id: 'D-02-L3', aisle: 'D', rackNumber: 2, level: 3, sku: 'TCH-803', itemNameAr: 'أشرطة ربط شحنات بسقاطة 5 طن', itemNameEn: 'Ratchet Tie Down Straps', category: 'عدد ومعدات صناعية', currentStock: 0, maxCapacity: 50, status: 'EMPTY', lastMovement: 'منذ 3 أيام' }
];

export default function WarehouseMapPage() {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const [selectedAisle, setSelectedAisle] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'OPTIMAL' | 'LOW' | 'EMPTY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBin, setSelectedBin] = useState<StorageBin | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [stickerData, setStickerData] = useState<BarcodeStickerData | null>(null);

  // Filter Bins
  const filteredBins = useMemo(() => {
    return GENERATED_BINS.filter(bin => {
      if (selectedAisle !== 'ALL' && bin.aisle !== selectedAisle) return false;
      if (selectedStatus !== 'ALL' && bin.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = bin.id.toLowerCase().includes(q);
        const matchesSku = bin.sku.toLowerCase().includes(q);
        const matchesName = bin.itemNameAr.toLowerCase().includes(q) || bin.itemNameEn.toLowerCase().includes(q);
        if (!matchesId && !matchesSku && !matchesName) return false;
      }
      return true;
    });
  }, [selectedAisle, selectedStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = GENERATED_BINS.length;
    const optimal = GENERATED_BINS.filter(b => b.status === 'OPTIMAL').length;
    const low = GENERATED_BINS.filter(b => b.status === 'LOW').length;
    const empty = GENERATED_BINS.filter(b => b.status === 'EMPTY').length;
    const occupancyRate = Math.round(((total - empty) / total) * 100);
    return { total, optimal, low, empty, occupancyRate };
  }, []);

  const handlePrintBinBarcode = (bin: StorageBin) => {
    setStickerData({
      code: bin.sku,
      name: bin.itemNameAr,
      category: `${bin.category} • رف ${bin.id}`,
      unit: 'حبة'
    });
    setPrintModalOpen(true);
  };

  return (
    <div 
      className="warehouse-map-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '0 0.5rem 3rem 0.5rem',
        color: '#FFFFFF'
      }}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 1. Header & Live Telemetry HUD */}
      <div 
        style={{
          background: 'rgba(12, 21, 36, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(0, 229, 153, 0.15)',
                border: '1px solid rgba(0, 229, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00E599',
                boxShadow: '0 0 16px rgba(0, 229, 153, 0.25)'
              }}
            >
              <Layers size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '0.5px' }}>
                  {language === 'ar' ? 'التوأم الرقمي لخريطة المستودع والأرفف' : '3D Warehouse Digital Twin Map'}
                </h1>
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #00C2FF, #00E599)',
                    color: '#060B14',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '1px'
                  }}
                >
                  LIVE 3D HUD
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                {language === 'ar' ? 'مراقبة حية للممرات، الستاندات، عيون التخزين، ومسارات الرافعات الشوكية الذكية' : 'Real-time interactive spatial mapping for aisles, storage racks, and automated logistics paths'}
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Search size={16} style={{ position: 'absolute', right: language === 'ar' ? '12px' : 'auto', left: language === 'ar' ? 'auto' : '12px', color: '#64748B' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'بحث بكود الرف أو الصنف...' : 'Search bin or SKU...'}
                style={{
                  background: 'rgba(18, 30, 52, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: language === 'ar' ? '8px 36px 8px 14px' : '8px 14px 8px 36px',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '220px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Telemetry Counter Badges */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          {/* Total Bins */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>إجمالي عيون التخزين</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>
              {stats.total} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>عين تخزين</span>
            </div>
          </div>

          {/* Occupancy Rate */}
          <div style={{ background: 'rgba(0, 229, 153, 0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(0, 229, 153, 0.2)' }}>
            <span style={{ fontSize: '0.72rem', color: '#00E599', fontWeight: 600 }}>نسبة إشغال السعة</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00E599', marginTop: '2px' }}>
              {stats.occupancyRate}% <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8' }}>مستغلة</span>
            </div>
          </div>

          {/* Optimal Bins */}
          <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>أرفف بحالة مثالية</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>
              {stats.optimal} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8' }}>رف ممتلئ</span>
            </div>
          </div>

          {/* Low Stock Bins */}
          <div style={{ background: 'rgba(245, 158, 11, 0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 600 }}>أرفف برصيد حرج (قارب للنفاد)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F59E0B', marginTop: '2px' }}>
              {stats.low} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8' }}>رف</span>
            </div>
          </div>

          {/* Empty Bins */}
          <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600 }}>أرفف شاغرة متاحة للتخزين</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#EF4444', marginTop: '2px' }}>
              {stats.empty} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8' }}>رف متاح</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Aisle & Status Filter Ribbon */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Aisle Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', marginRight: '4px' }}>الممر اللوجستي:</span>
          {(['ALL', 'A', 'B', 'C', 'D'] as const).map(aisle => {
            const isSelected = selectedAisle === aisle;
            const labels: Record<string, string> = {
              'ALL': 'كافة الممرات (A-D)',
              'A': 'ممر A (مواد خام ومهمات)',
              'B': 'ممر B (كهرباء وصيانة)',
              'C': 'ممر C (بضائع تامة وتعبئة)',
              'D': 'ممر D (معدات وتقنية)'
            };
            return (
              <button
                key={aisle}
                onClick={() => setSelectedAisle(aisle)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #00E599' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(0, 229, 153, 0.15)' : 'rgba(12, 21, 36, 0.65)',
                  color: isSelected ? '#00E599' : '#94A3B8',
                  boxShadow: isSelected ? '0 0 12px rgba(0, 229, 153, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {labels[aisle]}
              </button>
            );
          })}
        </div>

        {/* Status Legend Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'OPTIMAL' ? 'ALL' : 'OPTIMAL')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              background: selectedStatus === 'OPTIMAL' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10B981',
              color: '#10B981',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span>رصيد كافٍ</span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'LOW' ? 'ALL' : 'LOW')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              background: selectedStatus === 'LOW' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.1)',
              border: '1px solid #F59E0B',
              color: '#F59E0B',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px #F59E0B' }} />
            <span>رصيد حرج</span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'EMPTY' ? 'ALL' : 'EMPTY')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              background: selectedStatus === 'EMPTY' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px #EF4444' }} />
            <span>شاغر فارغ</span>
          </button>
        </div>
      </div>

      {/* 3. The 3D Isometric Interactive Warehouse Floor Canvas */}
      <div 
        style={{
          background: 'radial-gradient(ellipse at center, rgba(12, 24, 45, 0.8) 0%, rgba(6, 11, 20, 0.95) 80%)',
          border: '1px solid rgba(0, 229, 153, 0.2)',
          borderRadius: '20px',
          padding: '2rem 1.5rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 229, 153, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Cyber Floor Grid Lines */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(0, 229, 153, 0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 229, 153, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            pointerEvents: 'none'
          }} 
        />

        {/* AGV Forklift Central Track */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '2px',
            background: 'repeating-linear-gradient(90deg, #00C2FF, #00C2FF 15px, transparent 15px, transparent 30px)',
            opacity: 0.4,
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }} 
        />

        {/* Bins Grid Display */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            position: 'relative',
            zIndex: 2
          }}
        >
          {filteredBins.map(bin => {
            const isSelected = selectedBin?.id === bin.id;
            const statusColors = {
              OPTIMAL: { text: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: '#10B981', label: 'رصيد آمن' },
              LOW: { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B', label: 'رصيد منخفض' },
              EMPTY: { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: '#EF4444', label: 'شاغر فارغ' }
            };
            const s = statusColors[bin.status];

            return (
              <div
                key={bin.id}
                onClick={() => setSelectedBin(bin)}
                style={{
                  background: isSelected ? 'rgba(0, 229, 153, 0.12)' : 'rgba(15, 23, 42, 0.85)',
                  border: isSelected ? '1.5px solid #00E599' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '14px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 0 20px rgba(0, 229, 153, 0.35)' : '0 4px 12px rgba(0, 0, 0, 0.4)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(0, 229, 153, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {/* Top Row: Rack Coordinates & LED Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      style={{
                        background: '#060B14',
                        border: '1px solid rgba(0, 229, 153, 0.35)',
                        color: '#00E599',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 900,
                        letterSpacing: '1px'
                      }}
                    >
                      {bin.id}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                      ممر {bin.aisle} • رف {bin.rackNumber} • طابق {bin.level}
                    </span>
                  </div>

                  {/* Pulsing Status LED */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span 
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: s.text,
                        boxShadow: `0 0 10px ${s.text}`,
                        display: 'inline-block'
                      }} 
                    />
                    <span style={{ fontSize: '10px', color: s.text, fontWeight: 700 }}>{s.label}</span>
                  </div>
                </div>

                {/* Center: Item SKU & Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.3 }}>
                    {bin.itemNameAr}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748B' }}>
                    <span>كود: <b style={{ color: '#94A3B8' }}>{bin.sku}</b></span>
                    <span>•</span>
                    <span>{bin.category}</span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#94A3B8' }}>الرصيد الفعلي: <b style={{ color: s.text }}>{bin.currentStock}</b></span>
                    <span style={{ color: '#64748B' }}>السعة: {bin.maxCapacity}</span>
                  </div>
                  <div style={{ height: '6px', width: '100%', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                    <div 
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (bin.currentStock / bin.maxCapacity) * 100)}%`,
                        background: s.text,
                        boxShadow: `0 0 8px ${s.text}`,
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>
                </div>

                {/* Bottom Barcode Quick Action Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintBinBarcode(bin);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#E2E8F0',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00E599'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                  >
                    <Barcode size={14} color="#00E599" />
                    <span>طباعة ملصق الرف</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Sliding Details Drawer Modal for Selected Bin */}
      {selectedBin && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100010,
            background: 'rgba(6, 11, 20, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setSelectedBin(null)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'rgba(12, 21, 36, 0.95)',
              border: '1px solid rgba(0, 229, 153, 0.4)',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(0, 229, 153, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span 
                  style={{
                    background: '#060B14',
                    border: '1px solid #00E599',
                    color: '#00E599',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 900
                  }}
                >
                  {selectedBin.id}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: 700 }}>
                  بطاقة عين التخزين الرقمية
                </span>
              </div>
              <button
                onClick={() => setSelectedBin(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Item Title & SKU */}
            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                {selectedBin.itemNameAr}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#00C2FF' }}>
                {selectedBin.itemNameEn}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#94A3B8' }}>
                <span>كود الصنف (SKU): <b style={{ color: '#FFFFFF' }}>{selectedBin.sku}</b></span>
                <span>•</span>
                <span>القسم: <b style={{ color: '#FFFFFF' }}>{selectedBin.category}</b></span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>الرصيد الفعلي الحالي</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#00E599', marginTop: '2px' }}>
                  {selectedBin.currentStock} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>حبة</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>السعة التخزينية القصوى</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#E2E8F0', marginTop: '2px' }}>
                  {selectedBin.maxCapacity} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>حبة</span>
                </div>
              </div>
            </div>

            {/* Last Movement Timestamp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94A3B8', background: 'rgba(0, 194, 255, 0.06)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0, 194, 255, 0.2)' }}>
              <History size={16} color="#00C2FF" />
              <span>آخر حركة توريد/صرف مسجلة: <b style={{ color: '#00C2FF' }}>{selectedBin.lastMovement}</b></span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
              <button
                onClick={() => handlePrintBinBarcode(selectedBin)}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00E599, #00C2FF)',
                  color: '#060B14',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Barcode size={18} />
                <span>طباعة ملصق الرف الحراري</span>
              </button>

              <button
                onClick={() => setSelectedBin(null)}
                style={{
                  padding: '0 16px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal Integration */}
      <BarcodePrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        stickerData={stickerData}
      />
    </div>
  );
}
