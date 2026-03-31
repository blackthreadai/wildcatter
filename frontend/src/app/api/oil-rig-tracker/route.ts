import { NextResponse } from 'next/server';
import rigCountData from '../../../../public/data/rig-count.json';

// Serve pre-built Baker Hughes rig count data
// Data committed as static JSON, updated weekly via scripts/update-rig-count.mjs
// Baker Hughes publishes new data every Friday

export async function GET() {
  try {
    if (!rigCountData || !(rigCountData as Record<string, unknown>).usTotals) {
      return NextResponse.json({ error: 'Rig count data not available' }, { status: 502 });
    }
    return NextResponse.json(rigCountData);
  } catch (error) {
    console.error('Oil rig tracker error:', error);
    return NextResponse.json({ error: 'Failed to load rig count data' }, { status: 502 });
  }
}
