import { NextResponse } from 'next/server';

// Cache for 12 hours
let cache: { data: any; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

// OPEC+ members with current voluntary production targets (kb/d)
const OPEC_MEMBERS = [
  { name: 'Saudi Arabia', iso: 'SAU', quota: 8978, capacity: 12000 },
  { name: 'Russia', iso: 'RUS', quota: 9478, capacity: 10200 },
  { name: 'Iraq', iso: 'IRQ', quota: 4431, capacity: 4800 },
  { name: 'UAE', iso: 'ARE', quota: 2912, capacity: 4200 },
  { name: 'Kuwait', iso: 'KWT', quota: 2548, capacity: 2800 },
  { name: 'Kazakhstan', iso: 'KAZ', quota: 1468, capacity: 1700 },
  { name: 'Algeria', iso: 'DZA', quota: 908, capacity: 1000 },
  { name: 'Oman', iso: 'OMN', quota: 761, capacity: 850 },
  { name: 'Nigeria', iso: 'NGA', quota: 1380, capacity: 1500 },
  { name: 'Angola', iso: 'AGO', quota: 1080, capacity: 1100 },
  { name: 'Libya', iso: 'LBY', quota: 0, capacity: 1200 },
  { name: 'Iran', iso: 'IRN', quota: 0, capacity: 3800 },
  { name: 'Venezuela', iso: 'VEN', quota: 0, capacity: 900 },
];

const MEETINGS_2026 = [
  { date: '2026-01-04', type: 'Eight-Country Review', description: 'Voluntary cut countries monthly review' },
  { date: '2026-02-01', type: 'Eight-Country Review', description: 'Voluntary cut countries monthly review' },
  { date: '2026-03-01', type: 'Eight-Country Review', description: 'Agreed to begin +206kb/d in April' },
  { date: '2026-04-05', type: 'Eight-Country Review', description: 'Monthly review of voluntary adjustments' },
  { date: '2026-06-07', type: 'OPEC+ Ministerial (ONOMM)', description: '41st OPEC and non-OPEC Ministerial Meeting' },
  { date: '2026-12-01', type: 'OPEC+ Ministerial (ONOMM)', description: '42nd Ministerial (expected)' },
];

// Fetch OPEC production from EIA International API (one call, tight timeout)
async function fetchProduction(): Promise<{ data: Record<string, { production: number; period: string }>; debug: string }> {
  let apiKey: string | undefined;
  try { apiKey = process.env.EIA_API_KEY; } catch { return { data: {}, debug: 'env error' }; }
  if (!apiKey) return { data: {}, debug: 'no key' };

  // Use only the top producers to keep response small and fast
  const isos = ['SAU', 'RUS', 'IRQ', 'ARE', 'KWT', 'IRN', 'NGA', 'LBY', 'AGO', 'VEN', 'DZA', 'KAZ', 'OMN'];
  const countryFacets = isos.map(c => `&facets[countryRegionId][]=${c}`).join('');
  
  const url = `https://api.eia.gov/v2/international/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[productId][]=57&facets[activityId][]=1${countryFacets}&sort[0][column]=period&sort[0][direction]=desc&length=50`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { data: {}, debug: `http${resp.status}:${text.substring(0, 80)}` };
    }

    const json = await resp.json();
    if (json?.error) {
      return { data: {}, debug: `api:${JSON.stringify(json.error).substring(0, 80)}` };
    }

    const records = json?.response?.data || [];
    const latest: Record<string, { production: number; period: string }> = {};
    
    for (const rec of records) {
      const c = rec.countryRegionId;
      if (c && !latest[c] && rec.value) {
        latest[c] = { production: parseFloat(rec.value), period: rec.period };
      }
    }

    if (Object.keys(latest).length > 0) {
      return { data: latest, debug: `intl:${Object.keys(latest).length}countries` };
    }
    return { data: {}, debug: `intl:0records_from_${records.length}` };
  } catch (e: any) {
    return { data: {}, debug: `fetch:${e?.message || e}`.substring(0, 80) };
  }
}

function getMeetings() {
  const now = new Date();
  const past = MEETINGS_2026.filter(m => new Date(m.date) <= now).sort((a, b) => b.date.localeCompare(a.date));
  const future = MEETINGS_2026.filter(m => new Date(m.date) > now).sort((a, b) => a.date.localeCompare(b.date));
  return {
    last: past[0] || MEETINGS_2026[0],
    next: future[0] || MEETINGS_2026[MEETINGS_2026.length - 1],
    schedule: MEETINGS_2026,
  };
}

function buildResponse(prodData: Record<string, { production: number; period: string }>, debug: string) {
  const meetings = getMeetings();
  const hasData = Object.keys(prodData).length > 0;

  const countries = OPEC_MEMBERS.map(m => {
    const eia = prodData[m.iso];
    const production = eia ? Math.round(eia.production) : 0;
    const compliance = m.quota > 0 && production > 0
      ? Math.round((1 - (production - m.quota) / m.quota) * 1000) / 10 : -1;
    return {
      country: m.name, iso: m.iso, quota: m.quota,
      production,
      compliance: m.quota > 0 ? Math.min(compliance, 200) : -1,
      spareCapacity: Math.max(0, m.capacity - (production || m.capacity)),
      overUnder: m.quota > 0 && production > 0 ? production - m.quota : 0,
      capacity: m.capacity,
      exempt: m.quota === 0,
      period: eia?.period || 'N/A',
    };
  }).filter(c => c.production > 0 || c.quota > 0);

  countries.sort((a, b) => b.production - a.production);

  const withQuota = countries.filter(c => c.quota > 0 && c.production > 0);
  const totalQuota = withQuota.reduce((s, c) => s + c.quota, 0);
  const totalProd = countries.reduce((s, c) => s + c.production, 0);
  const quotaProd = withQuota.reduce((s, c) => s + c.production, 0);
  const avgComp = totalQuota > 0 ? Math.round((1 - (quotaProd - totalQuota) / totalQuota) * 1000) / 10 : 0;

  return {
    countries,
    totals: {
      totalQuota, totalProduction: totalProd,
      avgCompliance: Math.min(avgComp, 200),
      totalSpareCapacity: countries.reduce((s, c) => s + c.spareCapacity, 0),
      quotaProduction: quotaProd,
      memberCount: countries.filter(c => c.production > 0).length,
    },
    meetings: { last: meetings.last, next: meetings.next, schedule: meetings.schedule },
    lastMeeting: meetings.last.date,
    nextMeeting: meetings.next.date,
    dataSource: hasData ? 'EIA (U.S. Energy Information Administration)' : 'Quotas only (EIA data pending)',
    debug,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const { data, debug } = await fetchProduction();
    const result = buildResponse(data, debug);

    if (Object.keys(data).length > 0) {
      cache = { data: result, ts: Date.now() };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(buildResponse({}, `error:${error?.message || error}`));
  }
}
