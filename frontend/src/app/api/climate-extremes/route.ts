import { NextResponse } from 'next/server';

interface ClimateExtreme {
  type: string;
  title: string;
  location: string;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  description: string;
  lastUpdated: string;
  source: string;
  url?: string;
}

// Cache for 1 hour
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

// Map GDACS event types
const EVENT_TYPE_MAP: Record<string, string> = {
  FL: 'flood',
  TC: 'cyclone',
  DR: 'drought',
  WF: 'wildfire',
  EQ: 'earthquake',
  VO: 'volcano',
  TS: 'tsunami',
};

const EVENT_LABEL_MAP: Record<string, string> = {
  FL: 'Flood',
  TC: 'Tropical Cyclone',
  DR: 'Drought',
  WF: 'Wildfire',
  EQ: 'Earthquake',
  VO: 'Volcano',
  TS: 'Tsunami',
};

function gdacsAlertToSeverity(level: string): ClimateExtreme['severity'] {
  switch (level) {
    case 'Red': return 'extreme';
    case 'Orange': return 'high';
    case 'Green': return 'moderate';
    default: return 'low';
  }
}

// ── GDACS (Global Disaster Alert and Coordination System) ───────────
async function fetchGDACS(): Promise<ClimateExtreme[]> {
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const from = fromDate.toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];

  // Focus on: floods, tropical cyclones, droughts, wildfires - Orange and Red only for significant events
  const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=&fromDate=${from}&toDate=${to}&alertlevel=Orange;Red&eventType=FL,TC,DR,WF`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
    signal: AbortSignal.timeout(12000),
  });

  if (!resp.ok) throw new Error(`GDACS API returned ${resp.status}`);
  const json = await resp.json();
  const features = json?.features || [];

  const results: ClimateExtreme[] = [];

  const relevantTypes = new Set(['FL', 'TC', 'DR', 'WF']);

  for (const f of features) {
    const p = f.properties || {};
    const eventType = p.eventtype || '';
    if (!relevantTypes.has(eventType)) continue; // Skip volcanoes, earthquakes etc
    const alertLevel = p.alertlevel || 'Green';
    const country = p.country || 'Unknown';
    const name = p.name || '';
    const fromdate = p.fromdate || '';
    const todate = p.todate || '';
    const url = p.url || `https://www.gdacs.org/report.aspx?eventtype=${eventType}&eventid=${p.eventid || ''}`;
    const severityText = p.severity?.severitytext || '';
    const popText = p.population?.populationtext || '';

    let description = name;
    if (severityText) description += `. ${severityText}`;
    if (popText) description += `. ${popText}`;

    results.push({
      type: EVENT_TYPE_MAP[eventType] || eventType.toLowerCase(),
      title: `${EVENT_LABEL_MAP[eventType] || eventType} - ${alertLevel}`,
      location: country,
      severity: gdacsAlertToSeverity(alertLevel),
      description: description.trim(),
      lastUpdated: todate || fromdate || now.toISOString(),
      source: 'GDACS',
      url,
    });
  }

  return results;
}

// ── NOAA Active Alerts (US-specific) ────────────────────────────────
async function fetchNOAA(): Promise<ClimateExtreme[]> {
  const resp = await fetch(
    'https://api.weather.gov/alerts/active?status=actual&message_type=alert',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/geo+json',
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!resp.ok) return []; // Non-critical, GDACS is primary
  const data = await resp.json();
  const features = data?.features || [];

  // Filter to relevant severe weather events
  const relevantEvents = new Set([
    'Hurricane Warning', 'Hurricane Watch', 'Hurricane Local Statement',
    'Tropical Storm Warning', 'Tropical Storm Watch',
    'Flash Flood Warning', 'Flash Flood Watch', 'Flood Warning', 'Flood Watch',
    'Excessive Heat Warning', 'Excessive Heat Watch', 'Heat Advisory',
    'Red Flag Warning', 'Fire Weather Watch',
    'Tornado Warning', 'Tornado Watch',
    'Severe Thunderstorm Warning',
    'Storm Surge Warning', 'Storm Surge Watch',
    'Tsunami Warning', 'Tsunami Watch',
  ]);

  const results: ClimateExtreme[] = [];

  for (const f of features) {
    const p = f.properties || {};
    if (!relevantEvents.has(p.event)) continue;

    const eventLower = (p.event || '').toLowerCase();
    let type = 'severe-weather';
    if (eventLower.includes('hurricane') || eventLower.includes('tropical')) type = 'cyclone';
    else if (eventLower.includes('flood')) type = 'flood';
    else if (eventLower.includes('heat')) type = 'extreme-heat';
    else if (eventLower.includes('fire') || eventLower.includes('red flag')) type = 'wildfire';
    else if (eventLower.includes('tornado')) type = 'tornado';
    else if (eventLower.includes('tsunami')) type = 'tsunami';

    let severity: ClimateExtreme['severity'] = 'moderate';
    const sev = (p.severity || '').toLowerCase();
    if (sev === 'extreme') severity = 'extreme';
    else if (sev === 'severe') severity = 'high';
    else if (sev === 'minor') severity = 'low';

    results.push({
      type,
      title: p.event,
      location: `US - ${(p.areaDesc || '').split(';')[0].trim()}`,
      severity,
      description: p.headline || p.description?.substring(0, 200) || '',
      lastUpdated: p.effective || new Date().toISOString(),
      source: 'NOAA/NWS',
    });
  }

  return results;
}

// ── GDACS RSS for additional detail ─────────────────────────────────
async function fetchGDACSRSS(): Promise<ClimateExtreme[]> {
  try {
    const resp = await fetch('https://www.gdacs.org/xml/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const xml = await resp.text();

    const results: ClimateExtreme[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && results.length < 20) {
      const item = match[1];

      const titleMatch = item.match(/<title>([^<]+)<\/title>/);
      const alertMatch = item.match(/<gdacs:alertlevel>([^<]+)<\/gdacs:alertlevel>/);
      const typeMatch = item.match(/<gdacs:eventtype>([^<]+)<\/gdacs:eventtype>/);
      const countryMatch = item.match(/<gdacs:country>([^<]+)<\/gdacs:country>/);
      const dateMatch = item.match(/<pubDate>([^<]+)<\/pubDate>/);
      const linkMatch = item.match(/<link>([^<]+)<\/link>/);
      const descMatch = item.match(/<description>([^<]+)<\/description>/);
      const severityMatch = item.match(/<gdacs:severity[^>]*>([^<]+)<\/gdacs:severity>/);
      const popMatch = item.match(/<gdacs:population[^>]*>([^<]+)<\/gdacs:population>/);

      if (!titleMatch || !typeMatch) continue;

      const eventType = typeMatch[1];
      // Only include relevant types
      if (!['FL', 'TC', 'DR', 'WF'].includes(eventType)) continue;

      const alertLevel = alertMatch?.[1] || 'Green';
      // Skip Green for RSS to avoid noise (we get Green from JSON API above)
      if (alertLevel === 'Green') continue;

      let description = descMatch?.[1] || titleMatch[1];
      if (severityMatch) description = severityMatch[1];
      if (popMatch) description += `. ${popMatch[1]}`;

      results.push({
        type: EVENT_TYPE_MAP[eventType] || eventType.toLowerCase(),
        title: titleMatch[1].replace(/^(Green|Orange|Red)\s+/, ''),
        location: countryMatch?.[1] || 'Unknown',
        severity: gdacsAlertToSeverity(alertLevel),
        description,
        lastUpdated: dateMatch?.[1] || new Date().toISOString(),
        source: 'GDACS',
        url: linkMatch?.[1] || undefined,
      });
    }

    return results;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Fetch from all sources in parallel
    const [gdacs, noaa] = await Promise.all([
      fetchGDACS().catch(() => []),
      fetchNOAA().catch(() => []),
    ]);

    // Combine and deduplicate
    const all = [...gdacs, ...noaa];

    if (all.length === 0) {
      return NextResponse.json({ error: 'No climate data available from any source' }, { status: 502 });
    }

    // Sort: extreme > high > moderate > low, then by date
    const severityOrder = { extreme: 0, high: 1, moderate: 2, low: 3 };
    all.sort((a, b) => {
      const sDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sDiff !== 0) return sDiff;
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });

    // Deduplicate by location+type (keep highest severity)
    const seen = new Set<string>();
    const unique = all.filter(e => {
      const key = `${e.location}-${e.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const data = {
      events: unique,
      summary: {
        total: unique.length,
        extreme: unique.filter(e => e.severity === 'extreme').length,
        high: unique.filter(e => e.severity === 'high').length,
        moderate: unique.filter(e => e.severity === 'moderate').length,
      },
      lastUpdated: new Date().toISOString(),
      source: 'GDACS / NOAA NWS',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Climate extremes API error:', error);
    return NextResponse.json({ error: 'Failed to fetch climate data' }, { status: 502 });
  }
}
