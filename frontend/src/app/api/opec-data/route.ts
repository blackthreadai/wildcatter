import { NextResponse } from 'next/server';

// Cache for 12 hours (OPEC/EIA data updates monthly)
let cache: { data: any; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

// OPEC+ members with their current voluntary production targets (April 2025 baseline, kb/d)
// Source: OPEC+ agreement, DoC (Declaration of Cooperation)
// These are "required production" levels including voluntary cuts as of Q1 2026
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
  { name: 'Libya', iso: 'LBY', quota: 0, capacity: 1200 }, // Exempt from cuts
  { name: 'Iran', iso: 'IRN', quota: 0, capacity: 3800 },   // Exempt (sanctions)
  { name: 'Venezuela', iso: 'VEN', quota: 0, capacity: 900 }, // Exempt (sanctions)
];

// EIA country codes for International Energy Statistics
const EIA_COUNTRY_MAP: Record<string, string> = {
  'SAU': 'SAU', 'RUS': 'RUS', 'IRQ': 'IRQ', 'ARE': 'ARE',
  'KWT': 'KWT', 'KAZ': 'KAZ', 'DZA': 'DZA', 'OMN': 'OMN',
  'NGA': 'NGA', 'AGO': 'AGO', 'LBY': 'LBY', 'IRN': 'IRN', 'VEN': 'VEN',
};

// 2026 OPEC+ meeting schedule (confirmed from opec.org)
const MEETINGS_2026 = [
  { date: '2026-01-04', type: 'Eight-Country Review', description: 'Voluntary cut countries monthly review' },
  { date: '2026-02-01', type: 'Eight-Country Review', description: 'Voluntary cut countries monthly review' },
  { date: '2026-03-01', type: 'Eight-Country Review', description: 'Agreed to begin +206kb/d in April' },
  { date: '2026-04-05', type: 'Eight-Country Review', description: 'Upcoming monthly review' },
  { date: '2026-06-07', type: 'OPEC+ Ministerial (ONOMM)', description: '41st OPEC and non-OPEC Ministerial Meeting' },
  { date: '2026-12-01', type: 'OPEC+ Ministerial (ONOMM)', description: '42nd Ministerial (expected)' },
];

async function fetchEIAProduction(): Promise<Record<string, { production: number; period: string }>> {
  let eiaApiKey = '';
  try {
    eiaApiKey = process.env.EIA_API_KEY || '';
  } catch {
    console.error('❌ No EIA_API_KEY');
  }

  if (!eiaApiKey) {
    console.log('⚠️ No EIA API key, using STEO fallback');
    return {};
  }

  const countryCodes = Object.values(EIA_COUNTRY_MAP).join(',');
  
  // EIA International: crude oil production (productId=57), thousand barrels/day (unitId=2)
  const url = `https://api.eia.gov/v2/international/data/?api_key=${eiaApiKey}&frequency=monthly&data[0]=value&facets[productId][]=57&facets[activityId][]=1&facets[unitId][]=2&facets[countryRegionId][]=${Object.values(EIA_COUNTRY_MAP).map(c => `&facets[countryRegionId][]=${c}`).join('')}&sort[0][column]=period&sort[0][direction]=desc&length=100`;

  // Simpler approach: fetch each country individually or use STEO
  // Actually, the international API supports multiple country facets
  // Let's build the URL properly
  const baseUrl = 'https://api.eia.gov/v2/international/data/';
  const params = new URLSearchParams({
    api_key: eiaApiKey,
    frequency: 'monthly',
    'data[0]': 'value',
    'facets[productId][]': '57',
    'facets[activityId][]': '1', 
    'facets[unitId][]': '2',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '200',
  });

  // Add country facets
  const countryParams = Object.values(EIA_COUNTRY_MAP)
    .map(c => `facets[countryRegionId][]=${c}`)
    .join('&');

  const fullUrl = `${baseUrl}?${params.toString()}&${countryParams}`;

  console.log('🛢️ OPEC: Fetching EIA international production data...');

  try {
    const resp = await fetch(fullUrl, {
      headers: { 'User-Agent': 'Wildcatter-Terminal/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      console.error(`❌ EIA International API error: ${resp.status}`);
      return {};
    }

    const json = await resp.json();
    const records = json?.response?.data || [];
    console.log(`✅ EIA returned ${records.length} production records`);

    // Get the latest record for each country
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
  } catch (err) {
    console.error('❌ EIA fetch error:', err);
    return {};
  }
}

// Fallback: fetch from EIA STEO (Short-Term Energy Outlook) which has OPEC totals
async function fetchSTEOFallback(): Promise<Record<string, { production: number; period: string }>> {
  let eiaApiKey = '';
  try {
    eiaApiKey = process.env.EIA_API_KEY || '';
  } catch {
    return {};
  }

  if (!eiaApiKey) return {};

  // STEO series for key OPEC producers
  const steoSeries: Record<string, string> = {
    'SAU': 'COPR_SAU',
    'RUS': 'COPR_RUS', 
    'IRQ': 'COPR_IRQ',
    'IRN': 'COPR_IRN',
    'ARE': 'COPR_ARE',
    'KWT': 'COPR_KWT',
    'NGA': 'COPR_NGA',
    'AGO': 'COPR_AGO',
    'LBY': 'COPR_LBY',
    'VEN': 'COPR_VEN',
    'DZA': 'COPR_DZA',
    'KAZ': 'COPR_KAZ',
  };

  try {
    const seriesIds = Object.values(steoSeries).map(s => `facets[seriesId][]=${s}`).join('&');
    const url = `https://api.eia.gov/v2/steo/data/?api_key=${eiaApiKey}&frequency=monthly&data[0]=value&${seriesIds}&sort[0][column]=period&sort[0][direction]=desc&length=50`;
    
    console.log('🛢️ OPEC: Trying STEO fallback...');
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Wildcatter-Terminal/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      console.error(`❌ STEO API error: ${resp.status}`);
      return {};
    }

    const json = await resp.json();
    const records = json?.response?.data || [];
    console.log(`✅ STEO returned ${records.length} records`);

    const latest: Record<string, { production: number; period: string }> = {};
    const isoFromSeries: Record<string, string> = {};
    for (const [iso, series] of Object.entries(steoSeries)) {
      isoFromSeries[series] = iso;
    }

    for (const rec of records) {
      const iso = isoFromSeries[rec.seriesId];
      if (iso && !latest[iso] && rec.value) {
        latest[iso] = {
          production: parseFloat(rec.value) * 1000, // STEO is in million b/d, convert to kb/d
          period: rec.period,
        };
      }
    }

    return latest;
  } catch (err) {
    console.error('❌ STEO fallback error:', err);
    return {};
  }
}

function getMeetingDates() {
  const now = new Date();
  const past = MEETINGS_2026
    .filter(m => new Date(m.date) <= now)
    .sort((a, b) => b.date.localeCompare(a.date));
  const future = MEETINGS_2026
    .filter(m => new Date(m.date) > now)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    lastMeeting: past[0] || MEETINGS_2026[0],
    nextMeeting: future[0] || MEETINGS_2026[MEETINGS_2026.length - 1],
    schedule: MEETINGS_2026,
  };
}

function buildOPECData(prodData: Record<string, { production: number; period: string }>) {
  const meetings = getMeetingDates();
  const hasRealData = Object.keys(prodData).length > 0;

  const countries = OPEC_MEMBERS.map(member => {
    const eia = prodData[member.iso];
    const production = eia ? Math.round(eia.production) : 0;
    const quota = member.quota;
    const compliance = quota > 0 && production > 0
      ? Math.round((1 - (production - quota) / quota) * 1000) / 10  // % compliance
      : quota === 0 ? -1 : 0; // -1 = exempt
    const spareCapacity = Math.max(0, member.capacity - production);
    const overUnder = quota > 0 ? production - quota : 0;

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
  }).filter(c => c.production > 0 || c.quota > 0); // Only show countries with data or quotas

  const withQuota = countries.filter(c => c.quota > 0);
  const totalQuota = withQuota.reduce((s, c) => s + c.quota, 0);
  const totalProduction = countries.reduce((s, c) => s + c.production, 0);
  const quotaProduction = withQuota.reduce((s, c) => s + c.production, 0);
  const avgCompliance = totalQuota > 0
    ? Math.round((1 - (quotaProduction - totalQuota) / totalQuota) * 1000) / 10
    : 0;
  const totalSpareCapacity = countries.reduce((s, c) => s + c.spareCapacity, 0);

  // Sort by production descending
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
    // Legacy fields for widget compatibility
    lastMeeting: meetings.lastMeeting.date,
    nextMeeting: meetings.nextMeeting.date,
    dataSource: hasRealData ? 'EIA (U.S. Energy Information Administration)' : 'No data available',
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Try EIA International first, then STEO fallback
    let prodData = await fetchEIAProduction();
    
    if (Object.keys(prodData).length < 5) {
      console.log('⚠️ EIA International returned sparse data, trying STEO...');
      const steoData = await fetchSTEOFallback();
      // Merge: prefer international data, fill gaps with STEO
      for (const [iso, val] of Object.entries(steoData)) {
        if (!prodData[iso]) prodData[iso] = val;
      }
    }

    console.log(`🛢️ OPEC: Got production data for ${Object.keys(prodData).length} countries`);
    for (const [iso, val] of Object.entries(prodData)) {
      console.log(`  ${iso}: ${val.production} kb/d (${val.period})`);
    }

    const data = buildOPECData(prodData);
    cache = { data, ts: Date.now() };

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ OPEC API error:', error);
    return NextResponse.json(buildOPECData({}));
  }
}
