import { NextResponse } from 'next/server';
import { bmsStore } from '@/lib/bms-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { faultType, tick } = body;

    if (faultType) {
      bmsStore.injectSimulatedFault(faultType);
    } else if (tick) {
      // Periodic small realistic fluctuations (e.g. water evaporation, consumption)
      const state = bmsStore.getState();
      for (const lake of state.lakes) {
        if (lake.status === 'normal') {
          // slight drift
          const drift = (Math.random() - 0.48) * 0.4;
          lake.waterLevelPct = Number(Math.max(40, Math.min(98, lake.waterLevelPct + drift)).toFixed(1));
        }
      }
      for (const bld of state.buildings.slice(0, 50)) {
        if (bld.status === 'normal') {
          const delta = (Math.random() - 0.5) * 1.5;
          bld.roofTankLevelPct = Number(Math.max(25, Math.min(98, bld.roofTankLevelPct + delta)).toFixed(1));
          if (bld.roofTankLevelPct < 40) bld.boosterPump.state = 'running';
          else if (bld.roofTankLevelPct > 90) bld.boosterPump.state = 'stopped';
        }
      }
      bmsStore.recalculateMetrics();
    }

    return NextResponse.json({ success: true, data: bmsStore.getState() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
