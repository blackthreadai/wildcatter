import { NextResponse } from 'next/server';

interface TravelAdvisory {
  country: string;
  level: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  lastUpdated: string;
  reason: string;
  url: string;
}

// Cache for 6 hours
let cache: { data: TravelAdvisory[]; ts: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

// Energy-producing countries we care about
const ENERGY_COUNTRIES = new Set([
  'Iraq', 'Iran', 'Russia', 'Venezuela', 'Nigeria', 'Libya', 'Saudi Arabia',
  'Kuwait', 'UAE', 'United Arab Emirates', 'Qatar', 'Kazakhstan', 'Algeria',
  'Angola', 'Mexico', 'Norway', 'Canada', 'Brazil', 'Colombia', 'Ecuador',
  'Azerbaijan', 'Oman', 'Egypt', 'Syria', 'Yemen', 'Sudan', 'South Sudan',
  'Gabon', 'Republic of the Congo', 'Equatorial Guinea', 'Bahrain',
  'Trinidad and Tobago', 'Guyana', 'Suriname', 'Mozambique',
]);

function levelToSeverity(level: number): 'low' | 'moderate' | 'high' | 'critical' {
  switch (level) {
    case 1: return 'low';
    case 2: return 'moderate';
    case 3: return 'high';
    case 4: return 'critical';
    default: return 'moderate';
  }
}

function levelToReason(level: number): string {
  switch (level) {
    case 1: return 'Exercise normal precautions';
    case 2: return 'Exercise increased caution';
    case 3: return 'Reconsider travel';
    case 4: return 'Do not travel';
    default: return 'Unknown';
  }
}

async function fetchAdvisories(): Promise<TravelAdvisory[]> {
  // State Department RSS feed - official, structured, always up to date
  const resp = await fetch('https://travel.state.gov/_res/rss/TAsTWs.xml', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
    signal: AbortSignal.timeout(12000),
  });

  if (!resp.ok) throw new Error(`State Dept RSS returned ${resp.status}`);
  const xml = await resp.text();

  const advisories: TravelAdvisory[] = [];

  // Parse each <item> from the RSS
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    // Extract title: "Country - Level N: Description"
    const titleMatch = item.match(/<title>([^<]+)<\/title>/);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();

    const parsed = title.match(/^(.+?)\s*-\s*Level\s+(\d):\s*(.+)$/);
    if (!parsed) continue;

    const country = parsed[1].trim();
    const level = parseInt(parsed[2]);
    const description = parsed[3].trim();

    // Filter to energy-producing countries only
    if (!ENERGY_COUNTRIES.has(country)) continue;

    // Extract link
    const linkMatch = item.match(/<link>([^<]+)<\/link>/);
    const url = linkMatch ? linkMatch[1].trim() : '';

    // Extract pubDate
    const dateMatch = item.match(/<pubDate>([^<]+)<\/pubDate>/);
    const lastUpdated = dateMatch ? dateMatch[1].trim() : '';

    // Extract reason from description if available, otherwise use level text
    let reason = description;
    const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
    if (descMatch) {
      // Try to extract the bold reason text
      const boldMatch = descMatch[1].match(/due to\s*<b>([^<]+(?:<\/b>[^<]*<b>[^<]*)*)<\/b>/i);
      if (boldMatch) {
        reason = boldMatch[1].replace(/<\/?b>/g, '').replace(/\s+/g, ' ').trim();
        // Clean trailing punctuation
        reason = reason.replace(/[.,\s]+$/, '');
      }
    }

    advisories.push({
      country,
      level: `Level ${level}`,
      severity: levelToSeverity(level),
      lastUpdated,
      reason,
      url,
    });
  }

  return advisories;
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const advisories = await fetchAdvisories();

    if (advisories.length === 0) {
      return NextResponse.json({ error: 'No advisory data returned from State Department' }, { status: 502 });
    }

    // Sort: critical first, then high, moderate, low
    advisories.sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2, low: 3 };
      if (a.severity !== b.severity) return order[a.severity] - order[b.severity];
      return a.country.localeCompare(b.country);
    });

    cache = { data: advisories, ts: Date.now() };
    return NextResponse.json(advisories);

  } catch (error) {
    console.error('Travel advisories API error:', error);
    return NextResponse.json({ error: 'Failed to fetch travel advisories' }, { status: 502 });
  }
}
