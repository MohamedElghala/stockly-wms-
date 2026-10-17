'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Barcode,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Box,
  Truck,
  Compass,
  ChevronRight,
  TrendingUp,
  MapPin,
  Play
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import BarcodePrintModal from '@/components/barcode/BarcodePrintModal';
import { BarcodeStickerData } from '@/lib/barcodeEngine';
import toast from 'react-hot-toast';

export interface StorageBin {
  id: string; // e.g. A-01-01, B-02-03
  aisle: 'A' | 'B' | 'C' | 'D';
  rackNumber: number;
  tier: 1 | 2 | 3 | 4; // 1: Heavy Pallets, 2: Totes, 3: Cartons, 4: Top Reserves
  sku: string;
  itemNameAr: string;
  itemNameEn: string;
  category: string;
  currentStock: number;
  maxCapacity: number;
  status: 'OPTIMAL' | 'LOW' | 'EMPTY';
  lastMovement: string;
  velocityRating: 'Fast Moving' | 'Normal' | 'Slow Moving';
  drawsLast60: number;
}

// 4 Aisles x 2 Racks x 4 Tiers = 32 Detailed 3D Bins
export const WAREHOUSE_3D_BINS: StorageBin[] = [
  // Aisle A (Raw Materials & Heavy Tools)
  { id: 'A-01-01', aisle: 'A', rackNumber: 1, tier: 1, sku: 'RAW-101', itemNameAr: 'حديد تسليح عالي المقاومة 12مم', itemNameEn: 'Reinforced Steel Bars 12mm', category: 'رخام ومواد بناء', currentStock: 450, maxCapacity: 500, status: 'OPTIMAL', lastMovement: 'اليوم 14:20', velocityRating: 'Fast Moving', drawsLast60: 42 },
  { id: 'A-01-02', aisle: 'A', rackNumber: 1, tier: 2, sku: 'RAW-102', itemNameAr: 'أسمنت بورتلاندي معتمد 50كجم', itemNameEn: 'Portland Cement 50kg', category: 'رخام ومواد بناء', currentStock: 320, maxCapacity: 400, status: 'OPTIMAL', lastMovement: 'أمس 11:00', velocityRating: 'Fast Moving', drawsLast60: 38 },
  { id: 'A-01-03', aisle: 'A', rackNumber: 1, tier: 3, sku: 'RAW-103', itemNameAr: 'لفائف عزل مائي وبوليمر 4مم', itemNameEn: 'Waterproof Membrane Rolls', category: 'رخام ومواد بناء', currentStock: 18, maxCapacity: 150, status: 'LOW', lastMovement: 'منذ 3 أيام', velocityRating: 'Normal', drawsLast60: 14 },
  { id: 'A-01-04', aisle: 'A', rackNumber: 1, tier: 4, sku: 'RAW-104', itemNameAr: 'صفائح حماية فولاذية مجلفنة', itemNameEn: 'Galvanized Steel Sheets', category: 'رخام ومواد بناء', currentStock: 80, maxCapacity: 100, status: 'OPTIMAL', lastMovement: 'منذ يومين', velocityRating: 'Normal', drawsLast60: 11 },

  { id: 'A-02-01', aisle: 'A', rackNumber: 2, tier: 1, sku: 'RAW-201', itemNameAr: 'محبس فراشة هيدروليكي 4 بوصة', itemNameEn: 'Butterfly Valve 4 inch', category: 'أدوات وسباكة وشبكات', currentStock: 85, maxCapacity: 100, status: 'OPTIMAL', lastMovement: 'اليوم 16:10', velocityRating: 'Fast Moving', drawsLast60: 29 },
  { id: 'A-02-02', aisle: 'A', rackNumber: 2, tier: 2, sku: 'RAW-202', itemNameAr: 'وصلة تمدد مرنة ضغط عالي', itemNameEn: 'Flexible Expansion Joint', category: 'أدوات وسباكة وشبكات', currentStock: 0, maxCapacity: 80, status: 'EMPTY', lastMovement: 'منذ أسبوع', velocityRating: 'Slow Moving', drawsLast60: 2 },
  { id: 'A-02-03', aisle: 'A', rackNumber: 2, tier: 3, sku: 'RAW-203', itemNameAr: 'محابس سكينة برونز 2 بوصة', itemNameEn: 'Gate Valve Bronze 2 inch', category: 'أدوات وسباكة وشبكات', currentStock: 12, maxCapacity: 120, status: 'LOW', lastMovement: 'أمس 09:30', velocityRating: 'Normal', drawsLast60: 9 },
  { id: 'A-02-04', aisle: 'A', rackNumber: 2, tier: 4, sku: 'RAW-204', itemNameAr: 'شفاه لحام كربون ستيل Class 150', itemNameEn: 'Carbon Steel Flanges Class 150', category: 'أدوات وسباكة وشبكات', currentStock: 90, maxCapacity: 100, status: 'OPTIMAL', lastMovement: 'اليوم 12:40', velocityRating: 'Normal', drawsLast60: 16 },

  // Aisle B (Electrical & MRO Spare Parts)
  { id: 'B-01-01', aisle: 'B', rackNumber: 1, tier: 1, sku: 'ELE-301', itemNameAr: 'كابلات نحاس معزولة 4x16 مم', itemNameEn: 'Copper Cables 4x16mm', category: 'أدوات كهربائية وإلكترونيات', currentStock: 1200, maxCapacity: 1500, status: 'OPTIMAL', lastMovement: 'اليوم 10:45', velocityRating: 'Fast Moving', drawsLast60: 55 },
  { id: 'B-01-02', aisle: 'B', rackNumber: 1, tier: 2, sku: 'ELE-302', itemNameAr: 'قاطع تيار أوتوماتيك 3 فاز 63A', itemNameEn: 'Circuit Breaker 3P 63A', category: 'أدوات كهربائية وإلكترونيات', currentStock: 42, maxCapacity: 50, status: 'OPTIMAL', lastMovement: 'اليوم 12:00', velocityRating: 'Fast Moving', drawsLast60: 34 },
  { id: 'B-01-03', aisle: 'B', rackNumber: 1, tier: 3, sku: 'ELE-303', itemNameAr: 'مفتاح مغناطيسي كونتكتور 40A', itemNameEn: 'Magnetic Contactor 40A', category: 'أدوات كهربائية وإلكترونيات', currentStock: 6, maxCapacity: 60, status: 'LOW', lastMovement: 'منذ يومين', velocityRating: 'Normal', drawsLast60: 12 },
  { id: 'B-01-04', aisle: 'B', rackNumber: 1, tier: 4, sku: 'ELE-304', itemNameAr: 'محولات تحكم صناعية 220V/24V', itemNameEn: 'Control Transformers 220V/24V', category: 'أدوات كهربائية وإلكترونيات', currentStock: 25, maxCapacity: 30, status: 'OPTIMAL', lastMovement: 'اليوم 11:20', velocityRating: 'Normal', drawsLast60: 10 },

  { id: 'B-02-01', aisle: 'B', rackNumber: 2, tier: 1, sku: 'ELE-401', itemNameAr: 'محركات كهربائية حثية 5.5 حصان', itemNameEn: 'Electric Motor 5.5HP', category: 'أدوات ميكانيكا وصيانة', currentStock: 14, maxCapacity: 20, status: 'OPTIMAL', lastMovement: 'أمس 15:20', velocityRating: 'Normal', drawsLast60: 8 },
  { id: 'B-02-02', aisle: 'B', rackNumber: 2, tier: 2, sku: 'ELE-402', itemNameAr: 'سيور ناقلة ومسارات تشغيل V-Belt', itemNameEn: 'Industrial V-Belts', category: 'أدوات ميكانيكا وصيانة', currentStock: 0, maxCapacity: 100, status: 'EMPTY', lastMovement: 'منذ 5 أيام', velocityRating: 'Slow Moving', drawsLast60: 1 },
  { id: 'B-02-03', aisle: 'B', rackNumber: 2, tier: 3, sku: 'ELE-403', itemNameAr: 'رولمان بلي عالي السرعة SKF 6208', itemNameEn: 'Ball Bearing SKF 6208', category: 'أدوات ميكانيكا وصيانة', currentStock: 95, maxCapacity: 100, status: 'OPTIMAL', lastMovement: 'اليوم 13:15', velocityRating: 'Fast Moving', drawsLast60: 48 },
  { id: 'B-02-04', aisle: 'B', rackNumber: 2, tier: 4, sku: 'ELE-404', itemNameAr: 'طلمبات تزييت هيدروليكية مصغرة', itemNameEn: 'Hydraulic Lubrication Pumps', category: 'أدوات ميكانيكا وصيانة', currentStock: 18, maxCapacity: 25, status: 'OPTIMAL', lastMovement: 'اليوم 09:50', velocityRating: 'Normal', drawsLast60: 15 },

  // Aisle C (Finished Goods & Fast Moving FMCG)
  { id: 'C-01-01', aisle: 'C', rackNumber: 1, tier: 1, sku: 'FMC-501', itemNameAr: 'عبوات كراتين شحن مقوى مقاس A4', itemNameEn: 'Corrugated Shipping Cartons', category: 'مواد خام وتعبئة وتغليف', currentStock: 2400, maxCapacity: 3000, status: 'OPTIMAL', lastMovement: 'اليوم 17:00', velocityRating: 'Fast Moving', drawsLast60: 85 },
  { id: 'C-01-02', aisle: 'C', rackNumber: 1, tier: 2, sku: 'FMC-502', itemNameAr: 'رولات تغليف ستريتش فيلم حراري', itemNameEn: 'Stretch Film Rolls', category: 'مواد خام وتعبئة وتغليف', currentStock: 80, maxCapacity: 250, status: 'LOW', lastMovement: 'اليوم 14:10', velocityRating: 'Fast Moving', drawsLast60: 62 },
  { id: 'C-01-03', aisle: 'C', rackNumber: 1, tier: 3, sku: 'FMC-503', itemNameAr: 'شريط لاصق لوجستي شفاف 50 مم', itemNameEn: 'Packaging Tape 50mm', category: 'مواد خام وتعبئة وتغليف', currentStock: 650, maxCapacity: 800, status: 'OPTIMAL', lastMovement: 'أمس 16:40', velocityRating: 'Fast Moving', drawsLast60: 71 },
  { id: 'C-01-04', aisle: 'C', rackNumber: 1, tier: 4, sku: 'FMC-504', itemNameAr: 'زوايا كرتونية لحماية مشاتل البالتات', itemNameEn: 'Corner Edge Protectors', category: 'مواد خام وتعبئة وتغليف', currentStock: 950, maxCapacity: 1200, status: 'OPTIMAL', lastMovement: 'اليوم 10:15', velocityRating: 'Normal', drawsLast60: 22 },

  { id: 'C-02-01', aisle: 'C', rackNumber: 2, tier: 1, sku: 'FMC-601', itemNameAr: 'ملابس وأحذية أمان صناعي Safety Shoes', itemNameEn: 'Industrial Safety Shoes', category: 'مهمات السلامة والأمن الصناعي', currentStock: 110, maxCapacity: 120, status: 'OPTIMAL', lastMovement: 'اليوم 11:30', velocityRating: 'Fast Moving', drawsLast60: 36 },
  { id: 'C-02-02', aisle: 'C', rackNumber: 2, tier: 2, sku: 'FMC-602', itemNameAr: 'خوذات حماية رأس معتمدة EN397', itemNameEn: 'Safety Helmets EN397', category: 'مهمات السلامة والأمن الصناعي', currentStock: 0, maxCapacity: 75, status: 'EMPTY', lastMovement: 'منذ يومين', velocityRating: 'Normal', drawsLast60: 19 },
  { id: 'C-02-03', aisle: 'C', rackNumber: 2, tier: 3, sku: 'FMC-603', itemNameAr: 'نظارات واقية ضد الصدمات والغبار', itemNameEn: 'Safety Goggles Anti-Dust', category: 'مهمات السلامة والأمن الصناعي', currentStock: 8, maxCapacity: 100, status: 'LOW', lastMovement: 'اليوم 09:15', velocityRating: 'Normal', drawsLast60: 14 },
  { id: 'C-02-04', aisle: 'C', rackNumber: 2, tier: 4, sku: 'FMC-604', itemNameAr: 'قفازات جلدية معزولة للرافعات', itemNameEn: 'Heavy Duty Leather Gloves', category: 'مهمات السلامة والأمن الصناعي', currentStock: 140, maxCapacity: 150, status: 'OPTIMAL', lastMovement: 'أمس 14:00', velocityRating: 'Fast Moving', drawsLast60: 44 },

  // Aisle D (Tech Equipment & Hardware)
  { id: 'D-01-01', aisle: 'D', rackNumber: 1, tier: 1, sku: 'TCH-701', itemNameAr: 'أجهزة مسح باركود لاسلكية Zebra 2D', itemNameEn: 'Zebra 2D Barcode Scanners', category: 'مستلزمات تقنية وحاسب آلي', currentStock: 25, maxCapacity: 30, status: 'OPTIMAL', lastMovement: 'اليوم 15:50', velocityRating: 'Fast Moving', drawsLast60: 27 },
  { id: 'D-01-02', aisle: 'D', rackNumber: 1, tier: 2, sku: 'TCH-702', itemNameAr: 'طابعات باركود حرارية سطحية Zebra ZD', itemNameEn: 'Thermal Barcode Printers', category: 'مستلزمات تقنية وحاسب آلي', currentStock: 12, maxCapacity: 15, status: 'OPTIMAL', lastMovement: 'أمس 13:00', velocityRating: 'Normal', drawsLast60: 15 },
  { id: 'D-01-03', aisle: 'D', rackNumber: 1, tier: 3, sku: 'TCH-703', itemNameAr: 'راوترات صناعية وشبكات Wi-Fi 6', itemNameEn: 'Industrial Wi-Fi 6 AP', category: 'مستلزمات تقنية وحاسب آلي', currentStock: 3, maxCapacity: 20, status: 'LOW', lastMovement: 'منذ 4 أيام', velocityRating: 'Slow Moving', drawsLast60: 4 },
  { id: 'D-01-04', aisle: 'D', rackNumber: 1, tier: 4, sku: 'TCH-704', itemNameAr: 'شواحن بطاريات مسدسات الجرد المحمولة', itemNameEn: 'Handheld Scanner Battery Dock', category: 'مستلزمات تقنية وحاسب آلي', currentStock: 18, maxCapacity: 20, status: 'OPTIMAL', lastMovement: 'اليوم 11:00', velocityRating: 'Normal', drawsLast60: 12 },

  { id: 'D-02-01', aisle: 'D', rackNumber: 2, tier: 1, sku: 'TCH-801', itemNameAr: 'سلالم ألومنيوم متحركة 6 درجات', itemNameEn: 'Aluminum Safety Ladders', category: 'عدد ومعدات صناعية', currentStock: 18, maxCapacity: 20, status: 'OPTIMAL', lastMovement: 'اليوم 10:00', velocityRating: 'Normal', drawsLast60: 10 },
  { id: 'D-02-02', aisle: 'D', rackNumber: 2, tier: 2, sku: 'TCH-802', itemNameAr: 'تروللي ومعدات نقل يدوي 300كجم', itemNameEn: 'Hand Pallet Truck 300kg', category: 'عدد ومعدات صناعية', currentStock: 8, maxCapacity: 10, status: 'OPTIMAL', lastMovement: 'أمس 14:15', velocityRating: 'Normal', drawsLast60: 9 },
  { id: 'D-02-03', aisle: 'D', rackNumber: 2, tier: 3, sku: 'TCH-803', itemNameAr: 'أشرطة ربط شحنات بسقاطة 5 طن', itemNameEn: 'Ratchet Tie Down Straps', category: 'عدد ومعدات صناعية', currentStock: 0, maxCapacity: 50, status: 'EMPTY', lastMovement: 'منذ 3 أيام', velocityRating: 'Slow Moving', drawsLast60: 3 },
  { id: 'D-02-04', aisle: 'D', rackNumber: 2, tier: 4, sku: 'TCH-804', itemNameAr: 'حبال وأوناش رفع فولاذية معتمدة', itemNameEn: 'Steel Wire Lifting Slings', category: 'عدد ومعدات صناعية', currentStock: 35, maxCapacity: 40, status: 'OPTIMAL', lastMovement: 'اليوم 08:30', velocityRating: 'Normal', drawsLast60: 18 }
];

export default function WarehouseMapPage() {
  const { language } = useLanguage();
  const { userData } = useAuth();

  // Filters & State
  const [selectedAisle, setSelectedAisle] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'OPTIMAL' | 'LOW' | 'EMPTY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBin, setSelectedBin] = useState<StorageBin | null>(null);

  // Viewport Transform Controls
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'isometric' | 'top-down' | 'elevation'>('isometric');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Barcode Printing State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [stickerData, setStickerData] = useState<BarcodeStickerData | null>(null);

  // Zoom handlers
  const handleZoomIn = () => setZoomScale(prev => Math.min(2.5, +(prev + 0.2).toFixed(1)));
  const handleZoomOut = () => setZoomScale(prev => Math.max(0.4, +(prev - 0.2).toFixed(1)));
  const handleResetCamera = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mouse pan drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-bin-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Print Barcode Label
  const handlePrintBinBarcode = (bin: StorageBin) => {
    const data: BarcodeStickerData = {
      sku: bin.sku,
      name: language === 'ar' ? bin.itemNameAr : bin.itemNameEn,
      category: bin.category,
      unit: 'حبة',
      zone: `الممر ${bin.aisle}`,
      aisle: bin.aisle,
      rack: `R-${bin.rackNumber}`,
      shelf: `Tier-${bin.tier}`,
      binCode: bin.id,
      balance: bin.currentStock,
      barcode: bin.sku.replace(/\D/g, '') || '10293847'
    };
    setStickerData(data);
    setPrintModalOpen(true);
  };

  // Filter calculations
  const filteredBins = useMemo(() => {
    return WAREHOUSE_3D_BINS.filter(bin => {
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

  const stats = useMemo(() => {
    const total = WAREHOUSE_3D_BINS.length;
    const optimal = WAREHOUSE_3D_BINS.filter(b => b.status === 'OPTIMAL').length;
    const low = WAREHOUSE_3D_BINS.filter(b => b.status === 'LOW').length;
    const empty = WAREHOUSE_3D_BINS.filter(b => b.status === 'EMPTY').length;
    const occupancyRate = Math.round((optimal / total) * 100);
    return { total, optimal, low, empty, occupancyRate };
  }, []);

  return (
    <div className="warehouse-3d-page-wrapper" style={{ padding: '1.5rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      
      {/* ──── 1. EXECUTIVE CLEAN LIGHT HEADER ──── */}
      <div className="glass-card" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#FFFFFF', boxShadow: 'var(--shadow-enterprise)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <span style={{ display: 'inline-flex', padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-primary)' }}>
              <Compass size={22} />
            </span>
            <h1 className="heading-lg" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'التوأم الرقمي المعماري ثلاثي الأبعاد (Google SketchUp 3D Twin)' : '3D Architectural Digital Twin (SketchUp Model)'}
            </h1>
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-cobalt)', letterSpacing: '0.5px' }}>
              LIVE 3D AXONOMETRIC
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {language === 'ar' 
              ? 'محاكاة معمارية تفاعلية لممرات التخزين (A-D)، أدوار الأرفف (Tiers 1-4)، ومسارات الروبوتات الذكية AGV مع بطاقات AR عائمة.'
              : 'Interactive 3D isometric simulation of warehouse aisles (A-D), multi-tier racking (1-4), and AGV robotics with AR telemetry tags.'}
          </p>
        </div>

        {/* Viewport & Camera Quick Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {/* View Mode Switcher */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <button 
              onClick={() => setViewMode('isometric')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'isometric' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'isometric' ? 'var(--accent-cobalt)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'isometric' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {language === 'ar' ? '3D أيزومتري' : '3D Isometric'}
            </button>
            <button 
              onClick={() => setViewMode('top-down')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'top-down' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'top-down' ? 'var(--accent-cobalt)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'top-down' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {language === 'ar' ? '2D مسقط أفقي' : '2D Floor Plan'}
            </button>
            <button 
              onClick={() => setViewMode('elevation')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'elevation' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'elevation' ? 'var(--accent-cobalt)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'elevation' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {language === 'ar' ? 'مسقط رأسي' : 'Elevation'}
            </button>
          </div>

          {/* Zoom In/Out/Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <button onClick={handleZoomIn} title="Zoom In (+)" className="btn btn-outline" style={{ padding: '0.35rem', minWidth: '32px', height: '32px' }}>
              <ZoomIn size={16} />
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button onClick={handleZoomOut} title="Zoom Out (-)" className="btn btn-outline" style={{ padding: '0.35rem', minWidth: '32px', height: '32px' }}>
              <ZoomOut size={16} />
            </button>
            <button onClick={handleResetCamera} title="Reset Camera" className="btn btn-outline" style={{ padding: '0.35rem', minWidth: '32px', height: '32px' }}>
              <RotateCcw size={15} />
            </button>
          </div>

        </div>
      </div>

      {/* ──── 2. OCCUPANCY & CAPACITY TELEMETRY BAR ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        
        {/* Total Bins */}
        <div className="glass-card" style={{ padding: '1rem 1.25rem', background: '#FFFFFF', borderLeft: '4px solid var(--accent-cobalt)', boxShadow: 'var(--shadow-enterprise)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>إجمالي عيون التخزين</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {stats.total} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>عين تخزين (32 Tier)</span>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="glass-card" style={{ padding: '1rem 1.25rem', background: '#FFFFFF', borderLeft: '4px solid var(--accent-primary)', boxShadow: 'var(--shadow-enterprise)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>نسبة إشغال السعة الحالية</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
            {stats.occupancyRate}% <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>مستغلة بأمان</span>
          </div>
        </div>

        {/* Optimal Bins */}
        <div className="glass-card" style={{ padding: '1rem 1.25rem', background: '#FFFFFF', borderLeft: '4px solid #10B981', boxShadow: 'var(--shadow-enterprise)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>أرفف بحالة مثالية (رصيد آمن)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', marginTop: '0.25rem' }}>
            {stats.optimal} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>رف ممتلئ</span>
          </div>
        </div>

        {/* Low Stock Bins */}
        <div className="glass-card" style={{ padding: '1rem 1.25rem', background: '#FFFFFF', borderLeft: '4px solid #F59E0B', boxShadow: 'var(--shadow-enterprise)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>أرفف برصيد حرج (قارب للنفاد)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.25rem' }}>
            {stats.low} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>أرفف تحتاج توريد</span>
          </div>
        </div>

        {/* Empty Bins */}
        <div className="glass-card" style={{ padding: '1rem 1.25rem', background: '#FFFFFF', borderLeft: '4px solid #EF4444', boxShadow: 'var(--shadow-enterprise)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>أرفف شاغرة متاحة للتخزين</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EF4444', marginTop: '0.25rem' }}>
            {stats.empty} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>رف جاهز للاستلام</span>
          </div>
        </div>

      </div>

      {/* ──── 3. FILTER & SEARCH CONTROL STRIP ──── */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#FFFFFF', boxShadow: 'var(--shadow-enterprise)' }}>
        
        {/* Aisle Selection Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>الممر اللوجستي:</span>
          {(['ALL', 'A', 'B', 'C', 'D'] as const).map(aisle => (
            <button
              key={aisle}
              onClick={() => setSelectedAisle(aisle)}
              className="btn btn-outline"
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                borderRadius: '8px',
                background: selectedAisle === aisle ? 'var(--accent-cobalt)' : '#FFFFFF',
                color: selectedAisle === aisle ? '#FFFFFF' : 'var(--text-primary)',
                borderColor: selectedAisle === aisle ? 'var(--accent-cobalt)' : 'var(--border-light)',
                fontWeight: selectedAisle === aisle ? 800 : 600
              }}
            >
              {aisle === 'ALL' ? 'كافة الممرات (A-D)' : `ممر ${aisle}`}
            </button>
          ))}
        </div>

        {/* Status Pills & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setSelectedStatus(selectedStatus === 'OPTIMAL' ? 'ALL' : 'OPTIMAL')}
              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #10B981', background: selectedStatus === 'OPTIMAL' ? '#10B981' : 'rgba(16, 185, 129, 0.08)', color: selectedStatus === 'OPTIMAL' ? '#FFFFFF' : '#10B981', cursor: 'pointer' }}
            >
              ● رصيد كافٍ
            </button>
            <button
              onClick={() => setSelectedStatus(selectedStatus === 'LOW' ? 'ALL' : 'LOW')}
              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #F59E0B', background: selectedStatus === 'LOW' ? '#F59E0B' : 'rgba(245, 158, 11, 0.08)', color: selectedStatus === 'LOW' ? '#FFFFFF' : '#F59E0B', cursor: 'pointer' }}
            >
              ● رصيد حرج
            </button>
            <button
              onClick={() => setSelectedStatus(selectedStatus === 'EMPTY' ? 'ALL' : 'EMPTY')}
              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #EF4444', background: selectedStatus === 'EMPTY' ? '#EF4444' : 'rgba(239, 68, 68, 0.08)', color: selectedStatus === 'EMPTY' ? '#FFFFFF' : '#EF4444', cursor: 'pointer' }}
            >
              ● شاغر فارغ
            </button>
          </div>

          {/* Quick Search Input */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={15} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text"
              placeholder="بحث بالرمز أو الرف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingRight: '2rem', paddingLeft: '0.75rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.82rem', height: '34px' }}
            />
          </div>

        </div>

      </div>

      {/* ──── 4. GOOGLE SKETCHUP 3D SPATIAL CANVAS ──── */}
      <div 
        className="sketchup-3d-viewport-container glass-card"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'relative',
          height: '620px',
          width: '100%',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-enterprise)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
      >

        {/* Blueprint Floor Grid Background */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              radial-gradient(circle, #CBD5E1 1px, transparent 1px),
              linear-gradient(to right, rgba(203, 213, 225, 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(203, 213, 225, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            opacity: 0.75
          }}
        />

        {/* HUD Staging Zones Overlays */}
        <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '0.75rem', zIndex: 10 }}>
          <div style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.92)', border: '1.5px dashed #10B981', fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            منطقة الاستلام والتوريد (Inbound Staging Zone)
          </div>
          <div style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.92)', border: '1.5px dashed #2563EB', fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
            منطقة الصرف والشحن (Outbound Staging Zone)
          </div>
        </div>

        {/* Scalable & Pannable 3D World Container */}
        <div 
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            width: '1200px',
            height: '800px',
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: '-400px',
            marginLeft: '-600px',
          }}
        >

          {/* SVG Floor Markings: Yellow Walkways & AGV Forklift Tracks */}
          <svg width="1200" height="800" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <defs>
              {/* Yellow & Black Safety Chevron Pattern */}
              <pattern id="safety-stripes" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="20" stroke="#EAB308" strokeWidth="10" />
                <line x1="10" y1="0" x2="10" y2="20" stroke="#1E293B" strokeWidth="10" />
              </pattern>
            </defs>

            {/* Pedestrian Safety Walkways (Yellow borders) */}
            <rect x="80" y="80" width="1040" height="40" fill="#FEF08A" opacity="0.65" rx="6" />
            <rect x="80" y="680" width="1040" height="40" fill="#FEF08A" opacity="0.65" rx="6" />
            <rect x="80" y="80" width="40" height="640" fill="#FEF08A" opacity="0.65" rx="6" />
            <rect x="1080" y="80" width="40" height="640" fill="#FEF08A" opacity="0.65" rx="6" />

            {/* Autonomous AGV Robotic Track Loop (Cyan dashed animated pulse) */}
            <rect 
              x="160" y="150" width="880" height="500" 
              fill="none" 
              stroke="#00C2FF" 
              strokeWidth="3.5" 
              strokeDasharray="16, 12" 
              opacity="0.8"
              rx="24"
            />
            {/* AGV Crossings between Aisles */}
            <line x1="420" y1="150" x2="420" y2="650" stroke="#00C2FF" strokeWidth="2.5" strokeDasharray="12, 10" opacity="0.6" />
            <line x1="780" y1="150" x2="780" y2="650" stroke="#00C2FF" strokeWidth="2.5" strokeDasharray="12, 10" opacity="0.6" />
          </svg>

          {/* ──── 3D AISLES & RACKING STRUCTURES (A, B, C, D) ──── */}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            
            {(['A', 'B', 'C', 'D'] as const).map((aisle, aisleIdx) => {
              if (selectedAisle !== 'ALL' && selectedAisle !== aisle) return null;
              
              const aisleX = 220 + aisleIdx * 210;
              const aisleBins = WAREHOUSE_3D_BINS.filter(b => b.aisle === aisle);
              const optimalCount = aisleBins.filter(b => b.status === 'OPTIMAL').length;
              const totalCount = aisleBins.length;
              const aisleOccupancy = Math.round((optimalCount / totalCount) * 100);

              return (
                <div 
                  key={aisle}
                  style={{
                    position: 'absolute',
                    left: `${aisleX}px`,
                    top: '180px',
                    width: '170px',
                    height: '460px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  
                  {/* Floating AR Holographic Telemetry Tag above Aisle Apex */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: '-45px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: 30
                    }}
                  >
                    <div 
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        background: '#FFFFFF',
                        border: '1.5px solid #2563EB',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }} />
                      ممر {aisle} • {aisleOccupancy}% ممتلئ
                    </div>
                    {/* Conical Light Beam connecting to Rack Top */}
                    <svg width="40" height="20" style={{ overflow: 'visible' }}>
                      <polygon points="20,20 5,0 35,0" fill="rgba(37, 99, 235, 0.22)" />
                    </svg>
                  </div>

                  {/* Physical 3D Steel Rack Structure */}
                  <div 
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '2px solid #2563EB',
                      boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.12), inset 0 0 10px rgba(37, 99, 235, 0.05)',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    {/* Industrial Steel Frame Uprights (Blue & Orange Accents) */}
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '6px', width: '3px', background: '#1E40AF', borderRadius: '2px' }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, right: '6px', width: '3px', background: '#1E40AF', borderRadius: '2px' }} />

                    {/* 4 Vertical Tiers (Tiers 4 to 1 from Top to Bottom) */}
                    {[4, 3, 2, 1].map(tierNumber => {
                      const tierBins = aisleBins.filter(b => b.tier === tierNumber);
                      const tierNames = {
                        4: 'طابق 4 (احتياطي)',
                        3: 'طابق 3 (كراتين)',
                        2: 'طابق 2 (توتس)',
                        1: 'طابق 1 (باليتات ثقيلة)'
                      };

                      return (
                        <div 
                          key={tierNumber}
                          style={{
                            background: '#F8FAFC',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '5px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            position: 'relative'
                          }}
                        >
                          {/* Tier Level Header Label */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            <span>{tierNames[tierNumber as 1|2|3|4]}</span>
                            <span style={{ fontFamily: 'monospace' }}>T{tierNumber}</span>
                          </div>

                          {/* Bin Slots on this Tier */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                            {tierBins.map(bin => {
                              const isSelected = selectedBin?.id === bin.id;
                              const statusColor = bin.status === 'OPTIMAL' ? '#10B981' : bin.status === 'LOW' ? '#F59E0B' : '#EF4444';
                              
                              return (
                                <div
                                  key={bin.id}
                                  onClick={() => setSelectedBin(bin)}
                                  className="interactive-bin-node"
                                  style={{
                                    padding: '5px 4px',
                                    borderRadius: '6px',
                                    background: isSelected ? 'rgba(37, 99, 235, 0.12)' : '#FFFFFF',
                                    border: `1.5px solid ${isSelected ? '#2563EB' : statusColor}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease-out',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    boxShadow: isSelected ? '0 0 10px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)'
                                  }}
                                  title={`${bin.id}: ${bin.itemNameAr} (${bin.currentStock}/${bin.maxCapacity})`}
                                >
                                  {/* Bin ID & LED Indicator */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                                      {bin.id}
                                    </span>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                                  </div>

                                  {/* Item Code & Stock */}
                                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {bin.sku}
                                  </div>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: statusColor }}>
                                    {bin.currentStock} <span style={{ fontSize: '0.55rem', fontWeight: 500, color: 'var(--text-secondary)' }}>حبة</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      );
                    })}

                  </div>

                  {/* Aisle Floor Footing & Pedestrian Sign */}
                  <div style={{ marginTop: '8px', padding: '0.2rem 0.6rem', borderRadius: '4px', background: '#0F172A', color: '#FFFFFF', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px' }}>
                    AISLE {aisle}
                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </div>

      {/* ──── 5. SLIDING INSPECTION DRAWER (Selected Bin Details) ──── */}
      {selectedBin && (
        <div 
          className="sliding-inspection-drawer"
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            right: 0,
            width: '420px',
            maxWidth: '100vw',
            background: '#FFFFFF',
            boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.18)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--border-light)',
            animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          
          {/* Drawer Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-cobalt)' }}>
                <Box size={20} />
              </span>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>تفاصيل عين التخزين</div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {selectedBin.id}
                </h3>
              </div>
            </div>

            <button 
              onClick={() => setSelectedBin(null)}
              className="btn btn-outline"
              style={{ padding: '0.4rem', borderRadius: '50%', minWidth: '34px', height: '34px' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Status & Velocity Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>حالة الرف</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '2px', color: selectedBin.status === 'OPTIMAL' ? '#10B981' : selectedBin.status === 'LOW' ? '#F59E0B' : '#EF4444' }}>
                  {selectedBin.status === 'OPTIMAL' ? '● رصيد آمن' : selectedBin.status === 'LOW' ? '● رصيد حرج' : '● رف فارغ'}
                </div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>معدل سرعة الدوران</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '2px', color: 'var(--accent-cobalt)' }}>
                  {selectedBin.velocityRating}
                </div>
              </div>
            </div>

            {/* Item Specifications */}
            <div style={{ padding: '1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>بيانات الصنف المخزن</div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {selectedBin.itemNameAr}
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {selectedBin.itemNameEn}
              </p>
              
              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>رمز الصنف (SKU):</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedBin.sku}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>فئة المستودع:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedBin.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>الموقع الإحداثي:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-cobalt)' }}>الممر {selectedBin.aisle} • رصيف R-{selectedBin.rackNumber} • طابق Tier-{selectedBin.tier}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>حركات الصرف (آخر 60 يوماً):</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedBin.drawsLast60} حركة</strong>
                </div>
              </div>
            </div>

            {/* Stock Gauge Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>الرصيد الفعلي مقابل السعة القصوى</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedBin.currentStock} / {selectedBin.maxCapacity} حبة
                </span>
              </div>
              <div style={{ height: '10px', borderRadius: '5px', background: '#E2E8F0', overflow: 'hidden' }}>
                <div 
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (selectedBin.currentStock / selectedBin.maxCapacity) * 100)}%`,
                    background: selectedBin.status === 'OPTIMAL' ? '#10B981' : selectedBin.status === 'LOW' ? '#F59E0B' : '#EF4444',
                    borderRadius: '5px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>

          </div>

          {/* Drawer Actions Footer */}
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              type="button"
              onClick={() => handlePrintBinBarcode(selectedBin)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Printer size={18} />
              <span>طباعة ملصق الباركود الحراري (50x30 مم)</span>
            </button>
            <button 
              type="button"
              onClick={() => setSelectedBin(null)}
              className="btn btn-outline"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
            >
              إغلاق النافذة
            </button>
          </div>

        </div>
      )}

      {/* ──── 6. BARCODE THERMAL PRINT MODAL ──── */}
      {printModalOpen && stickerData && (
        <BarcodePrintModal 
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          items={[stickerData]}
        />
      )}

    </div>
  );
}
