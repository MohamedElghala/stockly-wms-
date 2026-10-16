'use client';

import React, { useState } from 'react';
import { BuildingAsset } from '@stockly/domain';
import { 
  Building2, 
  Search, 
  Droplets, 
  Power, 
  Lightbulb, 
  Zap, 
  Gauge, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

interface Props {
  buildings: BuildingAsset[];
  onControlPump: (assetId: string, pumpId: string | null, state: 'running' | 'stopped', mode?: 'auto' | 'manual') => void;
  onToggleLight: (assetId: string, type: 'fountain' | 'building' | 'pool') => void;
}

export default function BuildingsTab({
  buildings,
  onControlPump,
  onToggleLight
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const sectors = [
    'all',
    'القطاع 1 (المدخل والشرق)',
    'القطاع 2 (الممشى الغربي)',
    'القطاع 3 (المنطقة المركزية والنوادي)',
    'القطاع 4 (المنطقة الشمالية)',
    'القطاع 5 (منطقة البحيرات والحدائق)',
    'القطاع 6 (المنطقة الجنوبية والغربية)'
  ];

  const filteredBuildings = buildings.filter((bld) => {
    const matchesSearch = 
      bld.buildingNumber.toString().includes(searchTerm) ||
      bld.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bld.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = selectedSector === 'all' || bld.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);
  const paginatedBuildings = filteredBuildings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-5">
      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="text-emerald-500" size={22} />
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                مراقبة عمارات الكمبوند (462 عمارة سكنية)
              </h2>
              <p className="text-[11px] text-slate-400">
                متابعة لحظية لخزانات المياه العلوية، مضخات الرفع، وإنارة ممرات الخدمات.
              </p>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="اكتب رقم العمارة (مثال: 1, 21, 462)..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Sector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1 ml-2">
            <Filter size={12} /> القطاعات:
          </span>
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => {
                setSelectedSector(sec);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                selectedSector === sec
                  ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {sec === 'all' ? 'جميع العمارات (462)' : sec}
            </button>
          ))}
        </div>
      </div>

      {/* Buildings Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
        {paginatedBuildings.map((bld) => {
          const isPumpOn = bld.boosterPump.state === 'running';
          const isLowWater = bld.roofTankLevelPct < 30;
          return (
            <div
              key={bld.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${
                isLowWater
                  ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{bld.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{bld.code}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isLowWater ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {bld.roofTankLevelPct}% مياه
                  </span>
                </div>

                {/* Tank Level Bar */}
                <div className="mb-3">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLowWater ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${bld.roofTankLevelPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block text-left">
                    خزان السطح: {bld.roofTankLevelPct}%
                  </span>
                </div>

                {/* Booster Pump & Lighting */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Gauge size={12} className="text-sky-500" /> المضخة:
                    </span>
                    <button
                      onClick={() => onControlPump(bld.id, null, isPumpOn ? 'stopped' : 'running', 'manual')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        isPumpOn
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {isPumpOn ? 'تعمل (3.8 بار)' : 'متوقفة'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Lightbulb size={12} className="text-amber-500" /> إنارة الممرات:
                    </span>
                    <button
                      onClick={() => onToggleLight(bld.id, 'building')}
                      className={`p-1 rounded transition-all ${
                        bld.corridorLighting
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      <Lightbulb size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Energy/Water stats */}
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>{bld.energyConsumptionKwhToday} kWh</span>
                <span>{bld.waterConsumptionM3Today} م³</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between text-xs">
          <span className="text-slate-500">
            عرض {paginatedBuildings.length} من أصل {filteredBuildings.length} عمارة (الصفحة {currentPage} من {totalPages})
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight size={16} />
            </button>
            <span className="px-3 font-mono font-bold">{currentPage}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
