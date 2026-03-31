import { NextResponse } from 'next/server';
export async function GET() {
  const k = process.env.EIA_API_KEY;
  if (!k) return NextResponse.json({ error: 'no key' });
  const r = await fetch(`https://api.eia.gov/v2/petroleum/sum/sndw/data/?api_key=${k}&frequency=weekly&data[0]=value&facets[duoarea][]=NUS&sort[0][column]=period&sort[0][direction]=desc&length=30`, { signal: AbortSignal.timeout(10000) });
  const j = await r.json();
  const rows = (j.response?.data || []) as Record<string, string>[];
  const descs = rows.filter(r => (r['series-description']||'').toLowerCase().includes('product supplied'))
    .map(r => ({ period: r.period, desc: r['series-description'], value: r.value, product: r.product }));
  return NextResponse.json({ total: descs.length, sample: descs.slice(0, 20) });
}
