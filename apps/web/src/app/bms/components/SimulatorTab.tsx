'use client';

import React, { useState } from 'react';
import { BMSOverallState } from '@stockly/domain';
import { 
  Sliders, 
  Cpu, 
  AlertOctagon, 
  Zap, 
  Droplets, 
  RotateCcw, 
  Play, 
  Pause, 
  CheckCircle2,
  ShieldCheck,
  Flame,
  Activity
} from 'lucide-react';

interface Props {
  bmsState: BMSOverallState;
  onInjectFault: (faultType: 'lake9_dry_run' | 'building_leak' | 'power_trip' | 'normal_reset') => void;
  onUpdateLevel: (assetId: string, levelPct: number) => void;
}

export default function SimulatorTab({
  bmsState,
  onInjectFault,
  onUpdateLevel
}: Props) {
  const [selectedLakeId, setSelectedLakeId] = useState('lake-9');
  const [selectedBuildingId, setSelectedBuildingId] = useState('bld-1');

  const selectedLake = bmsState.lakes.find(l => l.id === selectedLakeId) || bmsState.lakes[0];
  const selectedBuilding = bmsState.buildings.find(b => b.id === selectedBuildingId) || bmsState.buildings[0];

  return (
    <div className="space-y-6">
      {/* Simulator Intro Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-mono text-xs mb-1">
            <Cpu size={16} />
            <span>VIRTUAL IOT & HARDWARE TEST LAB (المحاكي الافتراضي التفاعلي)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            اختبار المنظومة وردود الأفعال بنسبة 100% قبل التوصيل الميداني
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            يمكنك من هنا حقن أعطال واقعية، تغيير قيم الحساسات يدوياً، ومراقبة استجابة محرك الأتمتة (الحماية التلقائية للطلمبات، قفل المحابس، وإرسال الإنذارات).
          </p>
        </div>

        <button
          onClick={() => onInjectFault('normal_reset')}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all shrink-0"
        >
          <RotateCcw size={16} />
          إعادة تعيين الحالة السليمة 100%
        </button>
      </div>

      {/* Fault Injection Scenarios */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
          <AlertOctagon className="text-rose-500" size={18} />
          سيناريوهات الطوارئ وحقن الأعطال الحية (Fault Injection Scenarios):
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scenario 1: Lake 9 Dry Run */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600">
                  <Droplets size={16} />
                </span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">جفاف بحيرة 9 وفصل الطلمبات</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                محاكاة انخفاض منسوب بحيرة 9 إلى 15% لاختبار نظام الحماية من التشغيل الجاف (Dry Run Trip) لمنع احتراق مواتير طلمبات الري.
              </p>
            </div>
            <button
              onClick={() => onInjectFault('lake9_dry_run')}
              className="w-full py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
            >
              تشغيل سيناريو انخفاض المنسوب
            </button>
          </div>

          {/* Scenario 2: Main Pool Overload */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600">
                  <Zap size={16} />
                </span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">فصل قاطع كهربي لطلمبة المسبح</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                محاكاة حدوث ارتفاع في الحمل الكهربائي وفصل قاطع الـ Overload لطلمبة تدوير الحمام الأولمبي (11kW).
              </p>
            </div>
            <button
              onClick={() => onInjectFault('power_trip')}
              className="w-full py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
            >
              تشغيل سيناريو العطل الكهربائي
            </button>
          </div>

          {/* Scenario 3: Building Leak */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600">
                  <Activity size={16} />
                </span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">تسريب مياه وكسر خط عمارة 1</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                محاكاة تسريب مياه مفاجئ بمعدل 45 م³/ساعة واختبار الإنذار اللحظي لفرق الصيانة.
              </p>
            </div>
            <button
              onClick={() => onInjectFault('building_leak')}
              className="w-full py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all"
            >
              تشغيل سيناريو تسريب المياه
            </button>
          </div>
        </div>
      </div>

      {/* Manual Sensor Control Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lake Level Slider */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Sliders className="text-blue-500" size={18} />
              التحكم اليدوي بمنسوب البحيرات:
            </h4>
            <select
              value={selectedLakeId}
              onChange={(e) => setSelectedLakeId(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
            >
              {bmsState.lakes.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">حساس المنسوب التراسونيك:</span>
              <span className="font-mono font-bold text-sky-600 text-base">{selectedLake.waterLevelPct}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={selectedLake.waterLevelPct}
              onChange={(e) => onUpdateLevel(selectedLake.id, Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-400">
              <span className="text-rose-500">0% (جفاف تام)</span>
              <span>30% (حد الخطر)</span>
              <span className="text-emerald-500">85% (المستوى المثالي)</span>
              <span>100% (امتلاء كامل)</span>
            </div>
          </div>
        </div>

        {/* Building Tank Slider */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Sliders className="text-emerald-500" size={18} />
              التحكم اليدوي بخزان مياه العمارات:
            </h4>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium max-w-[180px]"
            >
              {bmsState.buildings.slice(0, 30).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">مستوى خزان السطح:</span>
              <span className="font-mono font-bold text-emerald-600 text-base">{selectedBuilding.roofTankLevelPct}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={selectedBuilding.roofTankLevelPct}
              onChange={(e) => onUpdateLevel(selectedBuilding.id, Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-400">
              <span className="text-amber-500">أقل من 20% (تشغيل الطلمبة تلقائياً)</span>
              <span className="text-emerald-500">95% (فصل الطلمبة التلقائي)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
