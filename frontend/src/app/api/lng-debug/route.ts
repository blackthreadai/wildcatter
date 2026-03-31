import { NextResponse } from 'next/server';
export async function GET() {
  const k = process.env.EIA_API_KEY;
  if (!k) return NextResponse.json({ error: 'no key' });
  const r = await fetch(`https://api.eia.gov/v2/natural-gas/move/expc/data/?api_key=${k}&frequency=monthly&data[0]=value&facets[process][]=ENG&sort[0][column]=period&sort[0][direction]=desc&length=5`, { signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  return NextResponse.json({ rows: (j.response?.data || []).slice(0, 5) });
}
