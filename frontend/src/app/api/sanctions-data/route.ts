import { NextResponse } from 'next/server';
import sanctionsDb from './sanctions-db.json';

export const maxDuration = 15;

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

// Energy-related keywords to filter OFAC recent actions
const ENERGY_KEYWORDS = [
  'russia', 'iran', 'venezuela', 'oil', 'petroleum', 'energy', 'gas', 'lng',
  'pdvsa', 'tanker', 'shipping', 'crude', 'refin', 'pipeline', 'opec',
  'syria', 'north korea', 'dprk', 'sanctions list update',
];

interface OFACAction {
  title: string;
  date: string;
  url: string;
  category: string;
}

async function fetchOFACRecentActions(): Promise<OFACAction[]> {
  try {
    const resp = await fetch('https://ofac.treasury.gov/recent-actions', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    // Parse recent actions from the page
    // Pattern: <a href="/recent-actions/YYYYMMDD">Title</a>\n\nDate - Category
    const actions: OFACAction[] = [];
    const regex = /href="(\/recent-actions\/\d{8}[^"]*)"[^>]*>([^<]+)<\/a>\s*\n*\s*([\w\s,]+\d{4})\s*-\s*\n*\s*(?:<a[^>]*>)?([^<\n]+)/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
      actions.push({
        url: `https://ofac.treasury.gov${match[1]}`,
        title: match[2].trim(),
        date: match[3].trim(),
        category: match[4].trim(),
      });
    }

    // If regex didn't work, try simpler extraction
    if (actions.length === 0) {
      const simpleRegex = /href="(\/recent-actions\/(\d{8})[^"]*)"[^>]*>\s*([^<]+)/g;
      while ((match = simpleRegex.exec(html)) !== null) {
        const dateStr = match[2];
        const y = dateStr.slice(0, 4), m = dateStr.slice(4, 6), d = dateStr.slice(6, 8);
        actions.push({
          url: `https://ofac.treasury.gov${match[1]}`,
          title: match[3].trim(),
          date: `${y}-${m}-${d}`,
          category: '',
        });
      }
    }

    // Filter to energy-related actions
    return actions.filter(a => {
      const text = (a.title + ' ' + a.category).toLowerCase();
      return ENERGY_KEYWORDS.some(kw => text.includes(kw));
    }).slice(0, 10);

  } catch (err) {
    console.error('OFAC fetch error:', err);
    return [];
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const recentActions = await fetchOFACRecentActions();

    const sanctions = sanctionsDb.sanctions;
    const countries = [...new Set(sanctions.map(s => s.country))];
    const activeSanctions = sanctions.filter(s => s.status === 'Active').length;
    const criticalCount = sanctions.filter(s => s.impact === 'Critical').length;

    const data = {
      sanctions,
      summary: {
        totalPrograms: sanctions.length,
        activeSanctions,
        criticalImpact: criticalCount,
        affectedCountries: countries.length,
        countries,
      },
      recentActions,
      lastCurated: sanctionsDb.lastCurated,
      lastUpdated: new Date().toISOString(),
      source: 'OFAC / EU Council / UN Security Council',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Sanctions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sanctions data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 502 },
    );
  }
}
