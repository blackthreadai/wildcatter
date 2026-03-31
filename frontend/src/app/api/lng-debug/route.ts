import { NextResponse } from 'next/server';
export async function GET() {
  const k = process.env.EIA_API_KEY;
  if (!k) return NextResponse.json({ error: 'no key' });
  // Check what routes are under natural-gas/move/expc
  const r = await fetch(`https://api.eia.gov/v2/natural-gas/move/expc/?api_key=${k}`, { signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  // Also check international LNG
  const r2 = await fetch(`https://api.eia.gov/v2/international/data/?api_key=${k}&frequency=monthly&data[0]=value&facets[productId][]=LNG&sort[0][column]=period&sort[0][direction]=desc&length=10`, { signal: AbortSignal.timeout(8000) });
  const j2 = await r2.json();
  return NextResponse.json({ 
    expcMeta: j.response, 
    intlLNG: (j2.response?.data || []).slice(0, 5)
  });
}
