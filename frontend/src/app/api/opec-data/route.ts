import { NextResponse } from 'next/server';

// Cache for 12 hours (OPEC/EIA data updates monthly)
let cache: { data: any; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

// OPEC+ members with current voluntary production targets (kb/d)
// Quotas from OPEC+ DoC agreement, effective Q1 2026
// Capacity estimates from EIA STEO + industry consensus
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

// 2026 OPEC+ meeting schedule (from opec.org)
const MEETINGS_2026 = [
  { date: '2026-01-04', type: 'Eight-Country Review', description: 'Voluntary cut countries monthly review' },
  { date: '2026-02-01', type: 'Eight-Country Review', description: 'Voluntary cut countries monthly review' },
  { date: '2026-03-01', type: 'Eight-Country Review', description: 'Agreed to begin +206kb/d in April' },
  { date: '2026-04-05', type: 'Eight-Country Review', description: 'Monthly review of voluntary adjustments' },
  { date: '2026-06-07', type: 'OPEC+ Ministerial (ONOMM)', description: '41st OPEC and non-OPEC Ministerial Meeting' },
  { date: '2026-12-01', type: 'OPEC+ Ministerial (ONOMM)', description: '42nd Ministerial (expected)' },
];

// EIA STEO series for crude oil production by country (million b/d)
const STEO_SERIES: Record<string, string> = {
  'SAU': 'COPR_SAU', 'RUS': 'COPR_RUS', 'IRQ': 'COPR_IRQ',
  'IRN': 'COPR_IRN', 'ARE': 'COPR_ARE', 'KWT': 'COPR_KWT',
  'NGA': 'COPR_NGA', 'AGO': 'COPR_AGO', 'LBY': 'COPR_LBY',
  'VEN': 'COPR_VEN', 'DZA': 'COPR_DZA',
};

async function fetchEIAProduction(): Promise<{ data: Record<string, { production: number; period: string }>; debug: string }> {
  let eiaApiKey: string | undefined;
  
  try {
    eiaApiKey = process.env.EIA_API_KEY;
  } catch (e) {
    return { data: {}, debug: 'env access error' };
  }

  if (!eiaApiKey || eiaApiKey === 'your_eia_key_here' || eiaApiKey === '') {
    return { data: {}, debug: 'no valid EIA API key' };
  }

  console.log('🛢️ OPEC: EIA API key available');

  // Strategy 1: Try EIA International API (actuals, most recent)
  try {
    const intlResult = await fetchInternational(eiaApiKey);
    if (Object.keys(intlResult).length >= 5) {
      console.log(`✅ OPEC: International API returned ${Object.keys(intlResult).length} countries`);
      return { data: intlResult, debug: 'international' };
    }
    console.log(`⚠️ OPEC: International API returned only ${Object.keys(intlResult).length} countries`);
  } catch (e) {
    console.log(`❌ OPEC: International API error: ${e}`);
  }

  // Strategy 2: Try STEO (forecasts + recent actuals)
  try {
    const steoResult = await fetchSTEO(eiaApiKey);
    if (Object.keys(steoResult).length >= 5) {
      console.log(`✅ OPEC: STEO API returned ${Object.keys(steoResult).length} countries`);
      return { data: steoResult, debug: 'steo' };
    }
    console.log(`⚠️ OPEC: STEO returned only ${Object.keys(steoResult).length} countries`);
  } catch (e) {
    console.log(`❌ OPEC: STEO API error: ${e}`);
  }

  // Strategy 3: Fetch each country individually from International
  try {
    const individualResult = await fetchIndividualCountries(eiaApiKey);
    if (Object.keys(individualResult).length >= 3) {
      console.log(`✅ OPEC: Individual fetches returned ${Object.keys(individualResult).length} countries`);
      return { data: individualResult, debug: 'individual' };
    }
  } catch (e) {
    console.log(`❌ OPEC: Individual fetch error: ${e}`);
  }

  return { data: {}, debug: 'all strategies failed' };
}

// Collect debug errors for diagnosis
const debugErrors: string[] = [];

async function fetchInternational(apiKey: string): Promise<Record<string, { production: number; period: string }>> {
  const countries = OPEC_MEMBERS.map(m => m.iso);
  const countryFacets = countries.map(c => `&facets[countryRegionId][]=${c}`).join('');
  
  const url = `https://api.eia.gov/v2/international/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[productId][]=57&facets[activityId][]=1${countryFacets}&sort[0][column]=period&sort[0][direction]=desc&length=200`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    debugErrors.push(`intl:${resp.status}:${text.substring(0, 100)}`);
    return {};
  }

  const json = await resp.json();
  if (json?.error) {
    debugErrors.push(`intl:api_error:${JSON.stringify(json.error).substring(0, 100)}`);
    return {};
  }
  const records = json?.response?.data || [];

  const latest: Record<string, { production: number; period: string }> = {};
  for (const rec of records) {
    const country = rec.countryRegionId;
    if (!latest[country] && rec.value) {
      latest[country] = {
        production: parseFloat(rec.value),
        period: rec.period,
      };
    }
  }
  return latest;
}

async function fetchSTEO(apiKey: string): Promise<Record<string, { production: number; period: string }>> {
  const seriesIds = Object.values(STEO_SERIES).map(s => `&facets[seriesId][]=${s}`).join('');
  
  const url = `https://api.eia.gov/v2/steo/data/?api_key=${apiKey}&frequency=monthly&data[0]=value${seriesIds}&sort[0][column]=period&sort[0][direction]=desc&length=50`;

  console.log('🌐 OPEC: Fetching STEO:', url.replace(apiKey, '[KEY]').substring(0, 200));

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
    signal: AbortSignal.timeout(15000),
  });

  console.log('📡 OPEC STEO response:', resp.status);

  if (!resp.ok) {
    const text = await resp.text();
    debugErrors.push(`steo:${resp.status}:${text.substring(0, 100)}`);
    return {};
  }

  const json = await resp.json();
  if (json?.error) {
    debugErrors.push(`steo:api_error:${JSON.stringify(json.error).substring(0, 100)}`);
    return {};
  }
  const records = json?.response?.data || [];
  console.log(`📊 OPEC STEO: ${records.length} records`);

  // Build reverse lookup: seriesId -> iso
  const isoFromSeries: Record<string, string> = {};
  for (const [iso, series] of Object.entries(STEO_SERIES)) {
    isoFromSeries[series] = iso;
  }

  const latest: Record<string, { production: number; period: string }> = {};
  for (const rec of records) {
    const iso = isoFromSeries[rec.seriesId];
    if (iso && !latest[iso] && rec.value) {
      // STEO values are in million b/d, convert to thousand b/d
      latest[iso] = {
        production: Math.round(parseFloat(rec.value) * 1000),
        period: rec.period,
      };
    }
  }
  return latest;
}

async function fetchIndividualCountries(apiKey: string): Promise<Record<string, { production: number; period: string }>> {
  const result: Record<string, { production: number; period: string }> = {};
  const topCountries = ['SAU', 'RUS', 'IRQ', 'IRN', 'ARE', 'KWT'];

  for (const iso of topCountries) {
    try {
      const url = `https://api.eia.gov/v2/international/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[productId][]=57&facets[activityId][]=1&facets[countryRegionId][]=${iso}&sort[0][column]=period&sort[0][direction]=desc&length=1`;
      
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      
      if (resp.ok) {
        const json = await resp.json();
        const rec = json?.response?.data?.[0];
        if (rec?.value) {
          result[iso] = { production: parseFloat(rec.value), period: rec.period };
        }
      }
    } catch {
      // skip
    }
  }
  return result;
}

function getMeetingDates() {
  const now = new Date();
  const past = MEETINGS_2026.filter(m => new Date(m.date) <= now).sort((a, b) => b.date.localeCompare(a.date));
  const future = MEETINGS_2026.filter(m => new Date(m.date) > now).sort((a, b) => a.date.localeCompare(b.date));

  return {
    lastMeeting: past[0] || MEETINGS_2026[0],
    nextMeeting: future[0] || MEETINGS_2026[MEETINGS_2026.length - 1],
    schedule: MEETINGS_2026,
  };
}

function buildOPECData(prodData: Record<string, { production: number; period: string }>, debug: string) {
  const meetings = getMeetingDates();
  const hasRealData = Object.keys(prodData).length > 0;

  const countries = OPEC_MEMBERS.map(member => {
    const eia = prodData[member.iso];
    const production = eia ? Math.round(eia.production) : 0;
    const quota = member.quota;
    const compliance = quota > 0 && production > 0
      ? Math.round((1 - (production - quota) / quota) * 1000) / 10
      : quota === 0 ? -1 : 0;
    const spareCapacity = Math.max(0, member.capacity - (production || member.capacity));
    const overUnder = quota > 0 && production > 0 ? production - quota : 0;

    return {
      country: member.name,
      iso: member.iso,
      quota,
      production,
      compliance: quota > 0 ? Math.min(compliance, 200) : -1,
      spareCapacity,
      overUnder,
      capacity: member.capacity,
      exempt: quota === 0,
      period: eia?.period || 'N/A',
    };
  }).filter(c => c.production > 0 || c.quota > 0);

  const withQuota = countries.filter(c => c.quota > 0 && c.production > 0);
  const totalQuota = withQuota.reduce((s, c) => s + c.quota, 0);
  const totalProduction = countries.reduce((s, c) => s + c.production, 0);
  const quotaProduction = withQuota.reduce((s, c) => s + c.production, 0);
  const avgCompliance = totalQuota > 0
    ? Math.round((1 - (quotaProduction - totalQuota) / totalQuota) * 1000) / 10
    : 0;
  const totalSpareCapacity = countries.reduce((s, c) => s + c.spareCapacity, 0);

  countries.sort((a, b) => b.production - a.production);

  return {
    countries,
    totals: {
      totalQuota,
      totalProduction,
      avgCompliance: Math.min(avgCompliance, 200),
      totalSpareCapacity,
      quotaProduction,
      memberCount: countries.filter(c => c.production > 0).length,
    },
    meetings: {
      last: meetings.lastMeeting,
      next: meetings.nextMeeting,
      schedule: meetings.schedule,
    },
    lastMeeting: meetings.lastMeeting.date,
    nextMeeting: meetings.nextMeeting.date,
    dataSource: hasRealData ? 'EIA (U.S. Energy Information Administration)' : 'Quotas only (EIA data pending)',
    debug,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const { data: prodData, debug } = await fetchEIAProduction();
    console.log(`🛢️ OPEC: Got production data for ${Object.keys(prodData).length} countries via ${debug}`);

    const data = buildOPECData(prodData, debug + (debugErrors.length > 0 ? ` | errors: ${debugErrors.join('; ')}` : ''));
    debugErrors.length = 0; // clear for next request
    
    if (Object.keys(prodData).length > 0) {
      cache = { data, ts: Date.now() };
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ OPEC API error:', error);
    return NextResponse.json(buildOPECData({}, `error: ${error}`));
  }
}
