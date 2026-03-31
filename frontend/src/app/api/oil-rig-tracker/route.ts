import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Serve pre-built Baker Hughes rig count data from public/data/rig-count.json
// This file is committed to the repo and updated weekly via CI or manually
// Baker Hughes publishes new data every Friday

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'data', 'rig-count.json');
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Oil rig tracker error:', error);
    return NextResponse.json(
      { error: 'Failed to load rig count data' },
      { status: 502 },
    );
  }
}
