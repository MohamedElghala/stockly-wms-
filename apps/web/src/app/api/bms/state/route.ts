import { NextResponse } from 'next/server';
import { bmsStore } from '@/lib/bms-store';

export async function GET() {
  try {
    const state = bmsStore.getState();
    return NextResponse.json({ success: true, data: state });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === 'reset') {
      bmsStore.injectSimulatedFault('normal_reset');
    }
    return NextResponse.json({ success: true, data: bmsStore.getState() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
