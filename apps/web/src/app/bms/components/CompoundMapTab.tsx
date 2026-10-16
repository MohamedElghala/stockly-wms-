'use client';

import React, { useState } from 'react';
import { 
  LakeAsset, 
  PoolAsset, 
  FountainAsset, 
  BuildingAsset 
} from '@stockly/domain';
import { 
  Waves, 
  Building2, 
  Sparkles, 
  Zap, 
  Droplets, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Info,
  Layers
} from 'lucide-react';

interface Props {
  lakes: LakeAsset[];
  pools: PoolAsset[];
  fountains: FountainAsset[];
  buildings: BuildingAsset[];
  onSelectAsset: (asset: any) => void;
}

export default function CompoundMapTab({
  lakes,
  pools,
  fountains,
  buildings,
  onSelectAsset
}: Props) {
  const [filterType, setFilterType] = useState<'all' | 'lakes' | 'pools' | 'fountains' | 'buildings'>('all');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const handlePinClick = (asset: any) => {
    setSelectedAsset(asset);
    onSelectAsset(asset);
  };

  return (
    <div className="space-y-4">
      {/* Map Control Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="text-sky-500" size={20} />
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">طبقات الخريطة التفاعلية:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'all'
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            الكل (الموقع العام)
          </button>
          <button
            onClick={() => setFilterType('lakes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterType === 'lakes'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Waves size={14} className="text-blue-400" />
            البحيرات ({lakes.length})
          </button>
          <button
            onClick={() => setFilterType('pools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterType === 'pools'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Droplets size={14} className="text-cyan-400" />
            حمامات السباحة ({pools.length})
          </button>
          <button
            onClick={() => setFilterType('fountains')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterType === 'fountains'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Sparkles size={14} className="text-purple-400" />
            النوافير ({fountains.length})
          </button>
          <button
            onClick={() => setFilterType('buildings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterType === 'buildings'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Building2 size={14} className="text-emerald-400" />
            العمارات (462)
          </button>
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-slate-950 rounded-2xl p-4 border border-slate-800 relative overflow-hidden shadow-xl min-h-[560px] flex items-center justify-center">
          {/* Background Grid & Architectural Blueprint Style */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
              backgroundSize: '40px 40px, 80px 80px, 80px 80px'
            }}
          />

          {/* Compound Outer Boundary Outline SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
            <rect x="5%" y="5%" width="90%" height="90%" rx="30" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="6 6" />
            {/* Roads & Pathways */}
            <path d="M 50% 5% L 50% 95%" stroke="#334155" strokeWidth="12" />
            <path d="M 5% 50% L 95% 50%" stroke="#334155" strokeWidth="10" />
            <circle cx="50%" cy="50%" r="90" stroke="#0284c7" strokeWidth="3" fill="none" opacity="0.5" />
          </svg>

          {/* Compound Sector Annotations */}
          <div className="absolute top-4 left-6 text-[11px] text-sky-400 font-mono tracking-wider bg-slate-900/80 px-2.5 py-1 rounded-md border border-sky-500/30">
            📍 المخطط العام للمنشأة والمستودعات (Facility & Warehouse Master Layout)
          </div>
          <div className="absolute bottom-4 right-6 text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
            البوابة الرئيسية (الجنوب) ⬇️
          </div>

          {/* Map Interactive Pins */}
          <div className="relative w-full h-[520px]">
            {/* 1. Buildings Points (Rendered as clustered dots or individual) */}
            {(filterType === 'all' || filterType === 'buildings') && buildings.map((bld) => {
              if (!bld.location) return null;
              const isWarning = bld.status === 'warning' || bld.status === 'critical';
              return (
                <button
                  key={bld.id}
                  onClick={() => handlePinClick(bld)}
                  style={{ left: `${bld.location.x}%`, top: `${bld.location.y}%` }}
                  title={`${bld.name} | خزان المياه: ${bld.roofTankLevelPct}%`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-transform hover:scale-150 group z-10 ${
                    isWarning 
                      ? 'bg-rose-500 shadow-md shadow-rose-500 animate-ping' 
                      : 'bg-emerald-400/80 hover:bg-emerald-300'
                  }`}
                />
              );
            })}

            {/* 2. Lakes Pins */}
            {(filterType === 'all' || filterType === 'lakes') && lakes.map((lake) => {
              if (!lake.location) return null;
              const isSelected = selectedAsset?.id === lake.id;
              const isCrit = lake.status === 'critical';
              return (
                <button
                  key={lake.id}
                  onClick={() => handlePinClick(lake)}
                  style={{ left: `${lake.location.x}%`, top: `${lake.location.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-all duration-300 ${
                    isSelected ? 'scale-125 ring-4 ring-sky-400' : 'hover:scale-110'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 ${
                    isCrit
                      ? 'bg-rose-600 border-rose-300 text-white animate-bounce'
                      : 'bg-blue-600 border-blue-300 text-white'
                  }`}>
                    <Waves size={16} />
                  </div>
                  <span className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-sky-200 border border-slate-700 text-[10px] px-2 py-0.5 rounded shadow">
                    {lake.name.split('(')[0].trim()}
                  </span>
                </button>
              );
            })}

            {/* 3. Pools Pins */}
            {(filterType === 'all' || filterType === 'pools') && pools.map((pool) => {
              if (!pool.location) return null;
              const isSelected = selectedAsset?.id === pool.id;
              return (
                <button
                  key={pool.id}
                  onClick={() => handlePinClick(pool)}
                  style={{ left: `${pool.location.x}%`, top: `${pool.location.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-all ${
                    isSelected ? 'scale-125 ring-4 ring-cyan-400' : 'hover:scale-110'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-cyan-600 border-2 border-cyan-200 text-white flex items-center justify-center shadow-lg">
                    <Droplets size={14} />
                  </div>
                  <span className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-cyan-200 border border-slate-700 text-[9px] px-1.5 py-0.5 rounded shadow">
                    {pool.name.split('(')[0].trim()}
                  </span>
                </button>
              );
            })}

            {/* 4. Fountains Pins */}
            {(filterType === 'all' || filterType === 'fountains') && fountains.map((ft) => {
              if (!ft.location) return null;
              const isSelected = selectedAsset?.id === ft.id;
              return (
                <button
                  key={ft.id}
                  onClick={() => handlePinClick(ft)}
                  style={{ left: `${ft.location.x}%`, top: `${ft.location.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-all ${
                    isSelected ? 'scale-125 ring-4 ring-purple-400' : 'hover:scale-110'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-purple-600 border border-purple-300 text-white flex items-center justify-center shadow-md">
                    <Sparkles size={12} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Asset Live Detail Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">تفاصيل النقطة المحددة</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-medium">
                متصل بالشبكة (Online)
              </span>
            </div>

            {selectedAsset ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{selectedAsset.name}</h4>
                  <p className="text-xs text-slate-400">{selectedAsset.sector} | الكود: {selectedAsset.code || selectedAsset.id}</p>
                </div>

                {/* Lake specific info */}
                {selectedAsset.type === 'lake' && (
                  <div className="space-y-3">
                    <div className="bg-sky-50 dark:bg-sky-950/40 p-3 rounded-xl border border-sky-100 dark:border-sky-900/50">
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1 font-medium">
                        <span>منسوب المياه الحقيقي:</span>
                        <span className="text-sky-600 dark:text-sky-400 font-bold">{selectedAsset.waterLevelPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-sky-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${selectedAsset.waterLevelPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>جودة المياه (TDS):</span>
                        <span className="font-mono font-bold">{selectedAsset.waterQualityTds} ppm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>عدد الطلمبات:</span>
                        <span className="font-bold">{selectedAsset.pumps.length} طلمبة</span>
                      </div>
                      <div className="flex justify-between">
                        <span>حالة الفلترة:</span>
                        <span className={selectedAsset.filtrationActive ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                          {selectedAsset.filtrationActive ? 'تعمل بنشاط' : 'متوقفة'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Building specific info */}
                {selectedAsset.type === 'building' && (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1 font-medium">
                        <span>خزان مياه السطح:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedAsset.roofTankLevelPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${selectedAsset.roofTankLevelPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>طلمبة الرفع:</span>
                        <span className={selectedAsset.boosterPump.state === 'running' ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                          {selectedAsset.boosterPump.state === 'running' ? 'تعمل (3.8 بار)' : 'متوقفة'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>إنارة المداخل والممرات:</span>
                        <span className={selectedAsset.corridorLighting ? 'text-amber-500 font-bold' : 'text-slate-400'}>
                          {selectedAsset.corridorLighting ? 'مضاءة' : 'مطفأة'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>استهلاك اليوم التقديري:</span>
                        <span className="font-mono font-bold">{selectedAsset.energyConsumptionKwhToday} kWh</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pool specific info */}
                {selectedAsset.type === 'pool' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">الحرارة</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedAsset.temperatureC}°C</span>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">نسبة الكلور</span>
                        <span className="text-sm font-bold text-sky-500">{selectedAsset.chlorinePpm} ppm</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Info size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">اضغط على أي بحيرة، حمام سباحة، نافورة، أو عمارة على الخريطة لعرض بياناتها المباشرة والتحكم بها.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>تحديث التيليمترية:</span>
            <span className="font-mono text-emerald-500">لحظي (Real-time)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
