import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'no key' });

  const url = `https://api.eia.gov/v2/petroleum/pnp/wiup/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[duoarea][]=NUS&facets[duoarea][]=R30&sort[0][column]=period&sort[0][direction]=desc&length=20`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const json = await resp.json();
  const rows = json.response?.data || [];

  return NextResponse.json({
    total: rows.length,
    sample: rows.slice(0, 20).map((r: Record<string, string>) => ({
      period: r.period,
      area: r.duoarea,
      series: r.series,
      process: r.process,
      product: r.product,
      value: r.value,
      desc: r['series-description'],
    })),
  });
}
