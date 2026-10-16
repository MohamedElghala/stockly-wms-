'use client';

import React from 'react';
import { BMSAlarm } from '@stockly/domain';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Clock, 
  CheckCheck,
  Bell
} from 'lucide-react';

interface Props {
  alarms: BMSAlarm[];
  onAcknowledge: (alarmId: string) => void;
  onResolve: (alarmId: string) => void;
}

export default function AlarmsTab({
  alarms,
  onAcknowledge,
  onResolve
}: Props) {
  const [audioEnabled, setAudioEnabled] = React.useState(true);
  const activeAlarms = alarms.filter(a => !a.resolved);
  const resolvedAlarms = alarms.filter(a => a.resolved);

  return (
    <div className="space-y-5">
      {/* Alarms Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              مركز الإنذارات والأعطال اللحظية (BMS Alarm Center)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              تنبيهات فورية عند انخفاض المنسوب، الأعطال الكهربائية، وتوقف المضخات.
            </p>
          </div>
        </div>

        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            audioEnabled
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}
        >
          {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {audioEnabled ? 'صوت الإنذارات مفعل' : 'صوت الإنذارات صامت'}
        </button>
      </div>

      {/* Active Alarms List */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={18} />
          الإنذارات النشطة ({activeAlarms.length}):
        </h3>

        {activeAlarms.length === 0 ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-8 text-center text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-500" />
            <h4 className="font-bold text-base">كافة الأنظمة والمرافق تعمل بكفاءة تامة 100%</h4>
            <p className="text-xs mt-1 text-emerald-600/80">لا توجد أي إنذارات حرجة أو أعطال نشطة في الوقت الحالي.</p>
          </div>
        ) : (
          activeAlarms.map((alm) => {
            const isCritical = alm.severity === 'critical';
            return (
              <div
                key={alm.id}
                className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                  isCritical
                    ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                    : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    isCritical 
                      ? 'bg-rose-500 text-white animate-bounce' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    {isCritical ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        isCritical ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200' : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                      }`}>
                        {alm.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {alm.assetName}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">{alm.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{alm.message}</p>
                    
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                      <Clock size={10} /> {new Date(alm.timestamp).toLocaleTimeString('ar-EG')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {!alm.acknowledged && (
                    <button
                      onClick={() => onAcknowledge(alm.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
                    >
                      تأكيد المعاينة (Acknowledge)
                    </button>
                  )}
                  <button
                    onClick={() => onResolve(alm.id)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 flex items-center gap-1"
                  >
                    <CheckCheck size={14} /> تم الإصلاح (Resolve)
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolved History Log */}
      {resolvedAlarms.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-emerald-500" />
            سجل الإنذارات المعالجة حديثاً ({resolvedAlarms.length}):
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {resolvedAlarms.map((alm) => (
              <div key={alm.id} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{alm.title}</span>
                  <span className="text-slate-400 mr-2">({alm.assetName})</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  تمت المعالجة بنجاح
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
