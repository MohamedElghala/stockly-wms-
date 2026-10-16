'use client';

import React from 'react';
import { PoolAsset } from '@stockly/domain';
import { 
  Droplets, 
  Thermometer, 
  Lightbulb, 
  Clock, 
  Power, 
  CheckCircle2, 
  ShieldCheck,
  Activity,
  Waves
} from 'lucide-react';

interface Props {
  pools: PoolAsset[];
  onControlPump: (assetId: string, pumpId: string | null, state: 'running' | 'stopped', mode?: 'auto' | 'manual') => void;
  onToggleLight: (assetId: string, type: 'fountain' | 'building' | 'pool') => void;
}

export default function PoolsTab({
  pools,
  onControlPump,
  onToggleLight
}: Props) {
  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Droplets size={24} className="text-cyan-200" />
            منظومة حمامات السباحة والنوادي (8 مسابح)
          </h2>
          <p className="text-xs text-cyan-100 mt-1 max-w-xl">
            مراقبة لحظية لمضخات التدوير والفلترة، جودة ونقاء المياه (نسبة الكلور ودرجة الحموضة pH)، أنظمة التدفئة، والإضاءات الغاطسة.
          </p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20">
            <span className="text-[10px] text-cyan-200 block">إجمالي المسابح</span>
            <span className="text-lg font-bold">{pools.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20">
            <span className="text-[10px] text-cyan-200 block">طلمبات الفلترة النشطة</span>
            <span className="text-lg font-bold">{pools.filter(p => p.circulationPump.state === 'running').length}</span>
          </div>
        </div>
      </div>

      {/* Pools Grid (8 Pools) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {pools.map((pool) => {
          const isPumpRunning = pool.circulationPump.state === 'running';
          return (
            <div 
              key={pool.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                      {pool.code}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">{pool.name}</h3>
                    <p className="text-xs text-slate-400">{pool.sector}</p>
                  </div>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
                      <Thermometer size={12} className="text-amber-500" /> الحرارة
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">{pool.temperatureC}°C</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
                      <ShieldCheck size={12} className="text-sky-500" /> الكلور
                    </span>
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5 block">{pool.chlorinePpm} ppm</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
                      <Activity size={12} className="text-emerald-500" /> الحموضة
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{pool.phLevel} pH</span>
                  </div>
                </div>

                {/* Circulation Pump & Lights Status */}
                <div className="space-y-2 mb-4 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">طلمبة التدوير والفلترة</span>
                      <span className="text-[10px] text-slate-400">القدرة: {pool.circulationPump.powerKw} kW</span>
                    </div>
                    <button
                      onClick={() => onControlPump(pool.id, null, isPumpRunning ? 'stopped' : 'running', 'manual')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        isPumpRunning
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                      title={isPumpRunning ? 'إيقاف الطلمبة' : 'تشغيل الطلمبة'}
                    >
                      <Power size={14} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">الإضاءة الغاطسة:</span>
                    <button
                      onClick={() => onToggleLight(pool.id, 'pool')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        pool.underwaterLights
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      <Lightbulb size={12} />
                      {pool.underwaterLights ? 'مضاءة' : 'مطفأة'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><Clock size={12} /> فترة التشغيل:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{pool.schedule.startTime} - {pool.schedule.endTime}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
