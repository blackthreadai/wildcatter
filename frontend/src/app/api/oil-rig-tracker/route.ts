import { NextResponse } from 'next/server';
import rigCountData from './data.json';

// Serve pre-built Baker Hughes rig count data
// Updated weekly via scripts/update-rig-count.mjs
// Baker Hughes publishes new data every Friday

export async function GET() {
  try {
    return NextResponse.json(rigCountData);
  } catch (error) {
    console.error('Oil rig tracker error:', error);
    return NextResponse.json({ error: 'Failed to load rig count data' }, { status: 502 });
  }
}
