'use client';

import React, { useState, useEffect } from 'react';
import { BMSOverallState } from '@stockly/domain';
import { 
  Building2, 
  Waves, 
  Droplets, 
  Sparkles, 
  AlertTriangle, 
  Layers, 
  Sliders, 
  Wrench, 
  Zap, 
  Gauge, 
  RefreshCw, 
  CheckCircle2, 
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Power
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import CompoundMapTab from './components/CompoundMapTab';
import LakesTab from './components/LakesTab';
import PoolsTab from './components/PoolsTab';
import BuildingsTab from './components/BuildingsTab';
import AlarmsTab from './components/AlarmsTab';
import SimulatorTab from './components/SimulatorTab';
import HardwareGuideTab from './components/HardwareGuideTab';

export default function BMSDashboardPage() {
  const [bmsState, setBmsState] = useState<BMSOverallState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'lakes' | 'pools' | 'buildings' | 'alarms' | 'simulator' | 'hardware'>('map');
  const [autoSimulate, setAutoSimulate] = useState(true);

  // Fetch BMS State
  const fetchState = async () => {
    try {
      const res = await fetch('/api/bms/state');
      const data = await res.json();
      if (data.success) {
        setBmsState(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch BMS state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Periodic Auto-Simulator Ticker (simulating live telemetry every 4 seconds)
  useEffect(() => {
    if (!autoSimulate) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/bms/simulator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tick: true })
        });
        const data = await res.json();
        if (data.success) {
          setBmsState(data.data);
        }
      } catch (err) {
        // silent fail on ticker
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [autoSimulate]);

  // Handler: Control Pump
  const handleControlPump = async (assetId: string, pumpId: string | null, state: 'running' | 'stopped', mode?: 'auto' | 'manual') => {
    try {
      const res = await fetch('/api/bms/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_pump', assetId, pumpId, state, mode })
      });
      const data = await res.json();
      if (data.success) {
        setBmsState(data.data);
        toast.success(state === 'running' ? 'تم تشغيل الطلمبة بنجاح' : 'تم إيقاف الطلمبة بنجاح');
      }
    } catch (err) {
      toast.error('فشل في إرسال أمر التحكم');
    }
  };

  // Handler: Toggle Light
  const handleToggleLight = async (assetId: string, type: 'fountain' | 'building' | 'pool') => {
    try {
      const res = await fetch('/api/bms/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_light', assetId, type })
      });
      const data = await res.json();
      if (data.success) {
        setBmsState(data.data);
        toast.success('تم تغيير حالة الإضاءة');
      }
    } catch (err) {
      toast.error('فشل في تغيير الإضاءة');
    }
  };

  // Handler: Update Level
  const handleUpdateLevel = async (assetId: string, levelPct: number) => {
    try {
      const res = await fetch('/api/bms/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_level', assetId, levelPct })
      });
      const data = await res.json();
      if (data.success) {
        setBmsState(data.data);
      }
    } catch (err) {
      toast.error('فشل في تعديل المنسوب');
    }
  };

  // Handler: Fault Injection
  const handleInjectFault = async (faultType: 'lake9_dry_run' | 'building_leak' | 'power_trip' | 'normal_reset') => {
    try {
      const res = await fetch('/api/bms/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faultType })
      });
      const data = await res.json();
      if (data.success) {
        setBmsState(data.data);
        if (faultType === 'normal_reset') {
          toast.success('تمت إعادة ضبط جميع الأنظمة إلى الحالة السليمة 100%');
        } else {
          toast.error('تم حقن السيناريو وتفعيل إشارات الإنذار والحماية التلقائية');
        }
      }
    } catch (err) {
      toast.error('فشل في تشغيل المحاكاة');
    }
  };

  // Handler: Acknowledge Alarm
  const handleAcknowledgeAlarm = async (alarmId: string) => {
    try {
      const res = await fetch('/api/bms/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ack_alarm', alarmId })
      });
      const data = await res.json();
      if (data.success) {
        setBmsState(data.data);
        toast.success('تم تأكيد معاينة الإنذار');
      }
    } catch (err) {
      toast.error('فشل في تأكيد الإنذار');
    }
  };

  // Handler: Resolve Alarm
  const handleResolveAlarm = async (alarmId: string) => {
    try {
      const res = await fetch('/api/bms/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_alarm', alarmId })
      });
      const data = await res.json();
      if (data.success) {
        setBmsState(data.data);
        toast.success('تم إغلاق ومعالجة الإنذار بنجاح');
      }
    } catch (err) {
      toast.error('فشل في إغلاق الإنذار');
    }
  };

  if (loading || !bmsState) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-500">
        <RefreshCw className="animate-spin text-sky-500 mb-3" size={36} />
        <h3 className="font-bold text-base text-slate-700 dark:text-slate-200">جاري تحميل نظام إدارة المرافق والمباني (BMS)...</h3>
        <p className="text-xs text-slate-400 mt-1">ستون ريزيدنس (462 عمارة | 14 بحيرة | 8 مسابح | 9 نوافير)</p>
      </div>
    );
  }

  const activeAlarmsCount = bmsState.alarms.filter(a => !a.resolved).length;

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto">
      <Toaster position="top-left" />

      {/* Main Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Building2 size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                النظام متصل ونشط 100%
              </span>
              <span className="text-xs text-slate-400 font-mono">Stockly Enterprise Facility & Logistics BMS</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
              نظام إدارة المرافق والمباني الذكي (BMS)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مراقبة وتحكم مركزي: 462 عمارة سكنية • 14 بحيرة صناعية • 8 حمامات سباحة • 9 نوافير • شبكات الري ومحطات الرفع
            </p>
          </div>
        </div>

        {/* Live Simulation Switch & Refresh */}
        <div className="flex items-center gap-2.5 self-end lg:self-center">
          <button
            onClick={() => setAutoSimulate(!autoSimulate)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              autoSimulate
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Activity size={16} className={autoSimulate ? 'animate-pulse text-sky-500' : ''} />
            {autoSimulate ? 'التيليمترية الحية (Live Auto)' : 'التيليمترية متوقفة مؤقتاً'}
          </button>
          
          <button
            onClick={fetchState}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Assets */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">إجمالي الأصول المدارة</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">493</span>
            <span className="text-[10px] text-slate-400">مرفق</span>
          </div>
          <span className="text-[10px] text-sky-500 mt-1 block font-mono">462 عمارة + 31 مسطح مائي</span>
        </div>

        {/* Active Pumps */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Gauge size={14} className="text-blue-500" /> الطلمبات النشطة
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{bmsState.metrics.activePumpsCount}</span>
            <span className="text-[10px] text-slate-400">طلمبة تعمل</span>
          </div>
          <span className="text-[10px] text-emerald-500 mt-1 block">مضخات الري والتدوير والرفع</span>
        </div>

        {/* Total Power Load */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Zap size={14} className="text-amber-500" /> الحمل الكهربي اللحظي
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{bmsState.metrics.totalPowerKw}</span>
            <span className="text-[10px] text-slate-400">kW</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">محطة الكهرباء والمحولات</span>
        </div>

        {/* Water Flow Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Waves size={14} className="text-sky-500" /> معدل ضخ وتدفق المياه
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">{bmsState.metrics.totalWaterFlowM3h}</span>
            <span className="text-[10px] text-slate-400">م³/ساعة</span>
          </div>
          <span className="text-[10px] text-sky-500 mt-1 block">شبكة الري وتغذية البحيرات</span>
        </div>

        {/* Alarms Count */}
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${
          activeAlarmsCount > 0 
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <AlertTriangle size={14} className="text-rose-500" /> الإنذارات النشطة
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-2xl font-black ${activeAlarmsCount > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
              {activeAlarmsCount}
            </span>
            <span className="text-[10px] text-slate-400">تنبيه</span>
          </div>
          <span className="text-[10px] text-rose-500 mt-1 block font-semibold">
            {activeAlarmsCount > 0 ? 'يتطلب متابعة سريعة' : 'لا توجد بلاغات'}
          </span>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-500" /> كفاءة المنظومة
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{bmsState.metrics.systemHealthPct}%</span>
          </div>
          <span className="text-[10px] text-emerald-500 mt-1 block">جاهزية تشغيلية كاملة</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'map'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers size={16} />
          خريطة الموقع العام التفاعلية
        </button>

        <button
          onClick={() => setActiveTab('lakes')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'lakes'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Waves size={16} />
          البحيرات والنوافير (14 بحيرة + 9 نوافير)
        </button>

        <button
          onClick={() => setActiveTab('pools')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'pools'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Droplets size={16} />
          حمامات السباحة (8 مسابح)
        </button>

        <button
          onClick={() => setActiveTab('buildings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'buildings'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 size={16} />
          العمارات والخزانات (462 عمارة)
        </button>

        <button
          onClick={() => setActiveTab('alarms')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            activeTab === 'alarms'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle size={16} />
          الإنذارات والأعطال
          {activeAlarmsCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono">
              {activeAlarmsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders size={16} />
          المحاكي الافتراضي واختبار الطوارئ
        </button>

        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'hardware'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Wrench size={16} />
          دليل التوصيل والعتاد الميداني
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'map' && (
          <CompoundMapTab
            lakes={bmsState.lakes}
            pools={bmsState.pools}
            fountains={bmsState.fountains}
            buildings={bmsState.buildings}
            onSelectAsset={(asset) => {
              if (asset.type === 'lake' || asset.type === 'fountain') setActiveTab('lakes');
              else if (asset.type === 'pool') setActiveTab('pools');
              else if (asset.type === 'building') setActiveTab('buildings');
            }}
          />
        )}

        {activeTab === 'lakes' && (
          <LakesTab
            lakes={bmsState.lakes}
            fountains={bmsState.fountains}
            onControlPump={handleControlPump}
            onToggleLight={handleToggleLight}
          />
        )}

        {activeTab === 'pools' && (
          <PoolsTab
            pools={bmsState.pools}
            onControlPump={handleControlPump}
            onToggleLight={handleToggleLight}
          />
        )}

        {activeTab === 'buildings' && (
          <BuildingsTab
            buildings={bmsState.buildings}
            onControlPump={handleControlPump}
            onToggleLight={handleToggleLight}
          />
        )}

        {activeTab === 'alarms' && (
          <AlarmsTab
            alarms={bmsState.alarms}
            onAcknowledge={handleAcknowledgeAlarm}
            onResolve={handleResolveAlarm}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorTab
            bmsState={bmsState}
            onInjectFault={handleInjectFault}
            onUpdateLevel={handleUpdateLevel}
          />
        )}

        {activeTab === 'hardware' && (
          <HardwareGuideTab />
        )}
      </div>
    </div>
  );
}
