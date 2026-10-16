import { NextResponse } from 'next/server';
import { bmsStore } from '@/lib/bms-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, assetId, pumpId, state, mode, type, levelPct, alarmId } = body;

    if (action === 'set_pump') {
      bmsStore.setPumpState(assetId, pumpId || null, state, mode);
    } else if (action === 'toggle_light') {
      bmsStore.toggleLighting(assetId, type);
    } else if (action === 'set_level') {
      bmsStore.updateWaterLevel(assetId, levelPct);
    } else if (action === 'ack_alarm') {
      bmsStore.acknowledgeAlarm(alarmId);
    } else if (action === 'resolve_alarm') {
      bmsStore.resolveAlarm(alarmId);
    } else {
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: bmsStore.getState() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
