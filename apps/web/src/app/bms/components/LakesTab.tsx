'use client';

import React, { useState } from 'react';
import { LakeAsset, FountainAsset } from '@stockly/domain';
import { 
  Waves, 
  Sparkles, 
  Power, 
  Activity, 
  ShieldAlert, 
  RefreshCw, 
  Search, 
  Lightbulb, 
  Gauge, 
  Sliders,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';

interface Props {
  lakes: LakeAsset[];
  fountains: FountainAsset[];
  onControlPump: (assetId: string, pumpId: string | null, state: 'running' | 'stopped', mode?: 'auto' | 'manual') => void;
  onToggleLight: (assetId: string, type: 'fountain' | 'building' | 'pool') => void;
}

export default function LakesTab({
  lakes,
  fountains,
  onControlPump,
  onToggleLight
}: Props) {
  const [search, setSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'lakes' | 'fountains'>('lakes');

  const filteredLakes = lakes.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.sector.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFountains = fountains.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.sector.toLowerCase().includes(search.toLowerCase()) ||
    f.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Subtabs & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('lakes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'lakes'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Waves size={16} />
            البحيرات الاصطناعية (14 بحيرة)
          </button>
          <button
            onClick={() => setActiveSubTab('fountains')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'fountains'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Sparkles size={16} />
            النوافير المائية (9 نوافير)
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو القطاع أو الكود..."
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* 1. LAKES SECTION (14 Lakes) */}
      {activeSubTab === 'lakes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLakes.map((lake) => {
            const isCritical = lake.status === 'critical';
            return (
              <div 
                key={lake.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                  isCritical 
                    ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {lake.code}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{lake.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{lake.sector}</p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isCritical
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isCritical ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
                      {isCritical ? 'إنذار حرج' : 'طبيعي'}
                    </span>
                  </div>

                  {/* Visual Water Level Tank Gauge */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 mb-4">
                    <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Waves size={14} className="text-sky-500" /> منسوب المياه الفعلي:
                      </span>
                      <span className={`font-mono font-bold text-sm ${
                        lake.waterLevelPct <= lake.lowLevelAlarmPct ? 'text-rose-500' : 'text-sky-600 dark:text-sky-400'
                      }`}>
                        {lake.waterLevelPct}%
                      </span>
                    </div>

                    {/* Animated Wave Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          lake.waterLevelPct <= lake.lowLevelAlarmPct
                            ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                            : 'bg-gradient-to-r from-blue-600 to-sky-400'
                        }`}
                        style={{ width: `${lake.waterLevelPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>حد الخطر الأدنى: {lake.lowLevelAlarmPct}%</span>
                      <span>المستهدف: {lake.targetWaterLevelPct}%</span>
                    </div>
                  </div>

                  {/* Pumps List & Controls */}
                  <div className="space-y-2 mb-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      طلمبات السحب والتغذية ({lake.pumps.length}):
                    </span>
                    {lake.pumps.map((pump) => {
                      const isRunning = pump.state === 'running';
                      const isTripped = pump.state === 'tripped';
                      return (
                        <div 
                          key={pump.id}
                          className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                              <span className={`w-2 h-2 rounded-full ${
                                isRunning ? 'bg-emerald-500 animate-pulse' : isTripped ? 'bg-rose-500' : 'bg-slate-400'
                              }`} />
                              <span>{pump.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                              <span>القدرة: {pump.powerKw} kW</span>
                              <span>التدفق: {pump.flowRateM3h} م³/س</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono uppercase">
                              {pump.mode}
                            </span>
                            <button
                              onClick={() => onControlPump(lake.id, pump.id, isRunning ? 'stopped' : 'running', 'manual')}
                              className={`p-1.5 rounded-lg font-bold text-xs transition-colors ${
                                isRunning
                                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                              title={isRunning ? 'إيقاف الطلمبة' : 'تشغيل الطلمبة'}
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>الأملاح الكلية (TDS): <strong className="text-slate-700 dark:text-slate-200">{lake.waterQualityTds} ppm</strong></span>
                  <span className={lake.filtrationActive ? 'text-emerald-500 font-semibold' : 'text-slate-400'}>
                    {lake.filtrationActive ? '🔄 الفلترة نشطة' : 'الفلترة متوقفة'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. FOUNTAINS SECTION (9 Fountains) */}
      {activeSubTab === 'fountains' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFountains.map((ft) => {
            const isRunning = ft.pumpState === 'running';
            return (
              <div 
                key={ft.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {ft.code}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{ft.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{ft.sector}</p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isRunning 
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {isRunning ? 'تعمل بنشاط' : 'متوقفة'}
                    </span>
                  </div>

                  {/* Fountain Status & Lighting */}
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5 mb-4 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">الجدول الزمني:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">{ft.schedule.startTime} - {ft.schedule.endTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">إضاءة الـ RGB المائية:</span>
                      <button
                        onClick={() => onToggleLight(ft.id, 'fountain')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          ft.rgbLighting.enabled
                            ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}
                      >
                        <Lightbulb size={13} />
                        {ft.rgbLighting.enabled ? 'مضاءة' : 'مطفأة'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">النمط: {ft.mode}</span>
                  <button
                    onClick={() => onControlPump(ft.id, null, isRunning ? 'stopped' : 'running', 'manual')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isRunning
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20'
                    }`}
                  >
                    <Power size={14} />
                    {isRunning ? 'إيقاف النافورة' : 'تشغيل النافورة'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
