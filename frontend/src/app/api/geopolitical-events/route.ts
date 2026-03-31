import { NextResponse } from 'next/server';

interface GeopoliticalEvent {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  source: string;
  date: string;
  category: 'pipeline' | 'naval' | 'sanctions' | 'facility' | 'conflict' | 'protest' | 'general';
  countries: string[];
  confidence: number;
}

// Cache for 2 hours
let cache: { data: GeopoliticalEvent[]; ts: number } | null = null;
const CACHE_MS = 2 * 60 * 60 * 1000;

// Source 1: GDELT Doc API (energy/geopolitical news with locations)
async function fetchGDELTEvents(): Promise<GeopoliticalEvent[]> {
  try {
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=energy%20OR%20oil%20OR%20gas%20OR%20pipeline%20OR%20sanctions%20OR%20naval%20OR%20military&mode=artlist&maxrecords=30&format=json&startdatetime=now-48h&sort=datedesc';
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WildcatterTerminal/1.0)' },
      signal: AbortSignal.timeout(10000) // 10s hard timeout
    });
    if (!response.ok) return [];
    const data = await response.json();
    const events: GeopoliticalEvent[] = [];
    if (data?.articles && Array.isArray(data.articles)) {
      for (const article of data.articles.slice(0, 15)) {
        if (!article.title) continue;
        const loc = extractLocation(article.title + ' ' + (article.socialimage || ''));
        if (!loc.lat) continue;
        const cls = classifyEvent(article.title, article.socialimage || '');
        events.push({
          id: `gdelt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          lat: loc.lat, lng: loc.lng,
          title: article.title.length > 80 ? article.title.substring(0, 77) + '...' : article.title,
          description: (article.socialimage || article.title).substring(0, 150),
          severity: cls.severity, category: cls.category,
          source: article.domain || 'GDELT',
          date: article.seendate || new Date().toISOString(),
          countries: loc.countries, confidence: 0.85
        });
      }
    }
    return events;
  } catch {
    console.log('GDELT timeout/error - skipping');
    return [];
  }
}

// Source 2: Derive geopolitical alerts from our travel advisories (State Dept)
async function fetchTravelAdvisoryAlerts(): Promise<GeopoliticalEvent[]> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/travel-advisories`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return [];
    const data = await response.json();
    const advisories = data.advisories || [];
    const events: GeopoliticalEvent[] = [];
    
    // Only include Level 3 (Reconsider) and Level 4 (Do Not Travel)
    for (const adv of advisories) {
      if (adv.level < 3) continue;
      const coords = getCountryCoords(adv.country);
      if (!coords) continue;
      events.push({
        id: `travel_${adv.country.replace(/\s/g, '_')}_${Date.now()}`,
        lat: coords.lat, lng: coords.lng,
        title: `${adv.country}: Level ${adv.level} Travel Advisory`,
        description: adv.title || `US State Dept: ${adv.level === 4 ? 'Do Not Travel' : 'Reconsider Travel'} - ${adv.country}`,
        severity: adv.level === 4 ? 'critical' : 'high',
        category: 'conflict',
        source: 'US State Department',
        date: adv.date || new Date().toISOString(),
        countries: [adv.country],
        confidence: 0.95
      });
    }
    return events;
  } catch {
    return [];
  }
}

// Source 3: Derive from our sanctions monitor
async function fetchSanctionsAlerts(): Promise<GeopoliticalEvent[]> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/sanctions-data`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return [];
    const data = await response.json();
    const programs = data.programs || [];
    const events: GeopoliticalEvent[] = [];
    
    for (const program of programs) {
      if (!program.countries) continue;
      for (const country of program.countries.slice(0, 2)) { // Max 2 per program
        const coords = getCountryCoords(country);
        if (!coords) continue;
        events.push({
          id: `sanctions_${country.replace(/\s/g, '_')}_${Date.now()}`,
          lat: coords.lat, lng: coords.lng,
          title: `${program.name}: ${country}`,
          description: program.description?.substring(0, 150) || `Active energy sanctions program targeting ${country}`,
          severity: program.severity === 'critical' ? 'critical' : program.severity === 'high' ? 'high' : 'moderate',
          category: 'sanctions',
          source: 'OFAC/Sanctions Monitor',
          date: program.lastUpdated || new Date().toISOString(),
          countries: [country],
          confidence: 0.95
        });
      }
    }
    return events;
  } catch {
    return [];
  }
}

// Source 4: Active conflict zones with energy impact (curated, updated periodically)
function getActiveConflictZones(): GeopoliticalEvent[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'conflict_ukraine', lat: 48.3794, lng: 31.1656,
      title: 'Ukraine-Russia Conflict Zone',
      description: 'Ongoing military conflict disrupting European energy supply chains, gas transit routes, and Black Sea shipping',
      severity: 'critical', category: 'conflict', source: 'Conflict Monitor',
      date: now, countries: ['Ukraine', 'Russia'], confidence: 0.99
    },
    {
      id: 'conflict_redsea', lat: 13.5, lng: 43.0,
      title: 'Red Sea / Houthi Maritime Threat',
      description: 'Houthi attacks on commercial shipping in Red Sea and Bab el-Mandeb strait disrupting global oil/LNG tanker routes',
      severity: 'critical', category: 'naval', source: 'Maritime Security',
      date: now, countries: ['Yemen', 'Saudi Arabia'], confidence: 0.98
    },
    {
      id: 'conflict_hormuz', lat: 26.5, lng: 56.5,
      title: 'Strait of Hormuz Tensions',
      description: 'Elevated military presence and tanker seizure risks in the Strait of Hormuz, through which 20% of global oil transits',
      severity: 'high', category: 'naval', source: 'Maritime Security',
      date: now, countries: ['Iran', 'UAE', 'Oman'], confidence: 0.90
    },
    {
      id: 'conflict_libya', lat: 32.9, lng: 13.18,
      title: 'Libya Political Instability',
      description: 'Rival governments and militia control over oil facilities cause periodic production shutdowns affecting global supply',
      severity: 'high', category: 'facility', source: 'Conflict Monitor',
      date: now, countries: ['Libya'], confidence: 0.92
    },
    {
      id: 'conflict_niger_delta', lat: 5.0, lng: 6.5,
      title: 'Niger Delta Pipeline Security',
      description: 'Ongoing pipeline vandalism, oil theft, and militant activity in Nigeria\'s primary oil-producing region',
      severity: 'moderate', category: 'pipeline', source: 'Conflict Monitor',
      date: now, countries: ['Nigeria'], confidence: 0.88
    },
    {
      id: 'conflict_taiwan', lat: 23.7, lng: 121.0,
      title: 'Taiwan Strait Geopolitical Risk',
      description: 'Military tensions in the Taiwan Strait threaten disruption to major LNG shipping lanes and semiconductor supply chains',
      severity: 'moderate', category: 'naval', source: 'Geopolitical Risk',
      date: now, countries: ['Taiwan', 'China'], confidence: 0.80
    },
    {
      id: 'conflict_venezuela', lat: 10.5, lng: -66.9,
      title: 'Venezuela Oil Sector Sanctions',
      description: 'US sanctions on Venezuelan oil exports continue to constrain PDVSA production and global heavy crude supply',
      severity: 'high', category: 'sanctions', source: 'Sanctions Monitor',
      date: now, countries: ['Venezuela'], confidence: 0.95
    },
    {
      id: 'conflict_sudan', lat: 15.5, lng: 32.5,
      title: 'Sudan Civil Conflict',
      description: 'Civil war between SAF and RSF forces threatens oil infrastructure and South Sudan export pipeline routes',
      severity: 'high', category: 'conflict', source: 'Conflict Monitor',
      date: now, countries: ['Sudan', 'South Sudan'], confidence: 0.90
    },
    {
      id: 'conflict_iraq_kurds', lat: 36.2, lng: 44.0,
      title: 'Iraq-Kurdistan Oil Dispute',
      description: 'Ongoing dispute over northern Iraq oil exports via Turkey pipeline, affecting 400,000+ bpd of Kurdish crude exports',
      severity: 'moderate', category: 'pipeline', source: 'Energy Intelligence',
      date: now, countries: ['Iraq', 'Turkey'], confidence: 0.85
    },
    {
      id: 'conflict_mozambique', lat: -12.3, lng: 40.3,
      title: 'Mozambique LNG Insurgency',
      description: 'Islamist insurgency in Cabo Delgado province threatens TotalEnergies and ExxonMobil LNG mega-projects',
      severity: 'moderate', category: 'facility', source: 'Conflict Monitor',
      date: now, countries: ['Mozambique'], confidence: 0.85
    }
  ];
}

function extractLocation(text: string): { lat: number; lng: number; countries: string[] } {
  const t = text.toLowerCase();
  const locations = [
    { keywords: ['iran', 'tehran', 'hormuz'], lat: 32.43, lng: 53.69, country: 'Iran' },
    { keywords: ['iraq', 'baghdad', 'basra'], lat: 33.22, lng: 43.68, country: 'Iraq' },
    { keywords: ['saudi', 'riyadh', 'aramco'], lat: 24.71, lng: 46.68, country: 'Saudi Arabia' },
    { keywords: ['russia', 'moscow', 'putin', 'gazprom'], lat: 55.76, lng: 37.62, country: 'Russia' },
    { keywords: ['ukraine', 'kyiv', 'kiev'], lat: 50.45, lng: 30.52, country: 'Ukraine' },
    { keywords: ['china', 'beijing', 'sinopec'], lat: 39.90, lng: 116.41, country: 'China' },
    { keywords: ['nigeria', 'lagos', 'abuja'], lat: 9.08, lng: 7.40, country: 'Nigeria' },
    { keywords: ['libya', 'tripoli', 'benghazi'], lat: 32.89, lng: 13.19, country: 'Libya' },
    { keywords: ['venezuela', 'caracas', 'pdvsa'], lat: 10.48, lng: -66.90, country: 'Venezuela' },
    { keywords: ['yemen', 'houthi', 'red sea'], lat: 15.55, lng: 48.52, country: 'Yemen' },
    { keywords: ['suez canal', 'suez'], lat: 30.01, lng: 32.55, country: 'Egypt' },
    { keywords: ['india', 'delhi', 'mumbai'], lat: 20.59, lng: 78.96, country: 'India' },
    { keywords: ['north korea', 'pyongyang'], lat: 39.04, lng: 125.76, country: 'North Korea' },
    { keywords: ['taiwan', 'taipei'], lat: 23.70, lng: 121.00, country: 'Taiwan' },
    { keywords: ['germany', 'berlin', 'nord stream'], lat: 52.52, lng: 13.41, country: 'Germany' },
    { keywords: ['norway', 'equinor', 'oslo'], lat: 60.47, lng: 8.47, country: 'Norway' },
    { keywords: ['angola', 'luanda'], lat: -11.20, lng: 17.87, country: 'Angola' },
    { keywords: ['algeria', 'algiers'], lat: 28.03, lng: 1.66, country: 'Algeria' },
    { keywords: ['israel', 'gaza', 'tel aviv'], lat: 31.05, lng: 34.85, country: 'Israel' },
    { keywords: ['syria', 'damascus'], lat: 34.80, lng: 38.99, country: 'Syria' },
    { keywords: ['turkey', 'ankara', 'istanbul', 'bosphorus'], lat: 38.96, lng: 35.24, country: 'Turkey' },
    { keywords: ['brazil', 'petrobras'], lat: -14.24, lng: -51.93, country: 'Brazil' },
    { keywords: ['canada', 'alberta', 'oil sands'], lat: 56.13, lng: -106.35, country: 'Canada' },
    { keywords: ['usa', 'united states', 'texas', 'permian'], lat: 39.83, lng: -98.58, country: 'USA' },
    { keywords: ['japan', 'tokyo'], lat: 36.20, lng: 138.25, country: 'Japan' },
    { keywords: ['sudan', 'khartoum'], lat: 15.50, lng: 32.56, country: 'Sudan' },
    { keywords: ['mozambique', 'maputo'], lat: -18.67, lng: 35.53, country: 'Mozambique' },
    { keywords: ['singapore', 'malacca'], lat: 1.35, lng: 103.82, country: 'Singapore' },
    { keywords: ['kuwait'], lat: 29.31, lng: 47.48, country: 'Kuwait' },
    { keywords: ['qatar', 'doha'], lat: 25.35, lng: 51.18, country: 'Qatar' },
    { keywords: ['uae', 'emirates', 'dubai', 'abu dhabi'], lat: 24.30, lng: 54.70, country: 'UAE' },
  ];
  for (const loc of locations) {
    for (const kw of loc.keywords) {
      if (t.includes(kw)) return { lat: loc.lat, lng: loc.lng, countries: [loc.country] };
    }
  }
  return { lat: 0, lng: 0, countries: [] };
}

function classifyEvent(title: string, desc: string): { severity: GeopoliticalEvent['severity']; category: GeopoliticalEvent['category'] } {
  const t = (title + ' ' + desc).toLowerCase();
  let severity: GeopoliticalEvent['severity'] = 'low';
  let category: GeopoliticalEvent['category'] = 'general';
  if (t.match(/war|attack|bomb|invasion|missile|explosion|terror|emergency/)) { severity = 'critical'; category = 'conflict'; }
  else if (t.match(/sanctions|embargo|military|naval|blockade|crisis|threat|seizure/)) {
    severity = 'high';
    category = t.match(/sanctions|embargo/) ? 'sanctions' : t.match(/naval|strait|fleet|ship/) ? 'naval' : 'conflict';
  }
  else if (t.match(/tension|dispute|protest|warning|concern|alert|negotiation/)) {
    severity = 'moderate';
    category = t.match(/protest|demonstration/) ? 'protest' : 'general';
  }
  if (t.match(/pipeline|refinery|facility|plant|infrastructure|terminal/)) category = 'facility';
  return { severity, category };
}

function getCountryCoords(country: string): { lat: number; lng: number } | null {
  const map: Record<string, { lat: number; lng: number }> = {
    'Iran': { lat: 32.43, lng: 53.69 }, 'Iraq': { lat: 33.22, lng: 43.68 },
    'Russia': { lat: 55.76, lng: 37.62 }, 'Ukraine': { lat: 50.45, lng: 30.52 },
    'China': { lat: 39.90, lng: 116.41 }, 'Venezuela': { lat: 10.48, lng: -66.90 },
    'North Korea': { lat: 39.04, lng: 125.76 }, 'Syria': { lat: 34.80, lng: 38.99 },
    'Libya': { lat: 32.89, lng: 13.19 }, 'Yemen': { lat: 15.55, lng: 48.52 },
    'Sudan': { lat: 15.50, lng: 32.56 }, 'South Sudan': { lat: 6.88, lng: 31.60 },
    'Somalia': { lat: 5.15, lng: 46.20 }, 'Afghanistan': { lat: 33.94, lng: 67.71 },
    'Myanmar': { lat: 21.91, lng: 95.96 }, 'Nigeria': { lat: 9.08, lng: 7.40 },
    'Mali': { lat: 17.57, lng: -4.00 }, 'Central African Republic': { lat: 6.61, lng: 20.94 },
    'Cuba': { lat: 21.52, lng: -77.78 }, 'Lebanon': { lat: 33.85, lng: 35.86 },
    'Haiti': { lat: 18.97, lng: -72.29 }, 'Eritrea': { lat: 15.18, lng: 39.78 },
    'Ethiopia': { lat: 9.15, lng: 40.49 }, 'Pakistan': { lat: 30.38, lng: 69.35 },
    'Turkey': { lat: 38.96, lng: 35.24 }, 'Israel': { lat: 31.05, lng: 34.85 },
    'Saudi Arabia': { lat: 24.71, lng: 46.68 }, 'Algeria': { lat: 28.03, lng: 1.66 },
    'Egypt': { lat: 26.82, lng: 30.80 }, 'Mozambique': { lat: -18.67, lng: 35.53 },
    'Angola': { lat: -11.20, lng: 17.87 }, 'Democratic Republic of the Congo': { lat: -4.04, lng: 21.76 },
    'Burkina Faso': { lat: 12.24, lng: -1.56 }, 'Niger': { lat: 17.61, lng: 8.08 },
    'Chad': { lat: 15.45, lng: 18.73 }, 'Cameroon': { lat: 7.37, lng: 12.35 },
    'Tunisia': { lat: 33.89, lng: 9.54 }, 'Mexico': { lat: 23.63, lng: -102.55 },
    'Colombia': { lat: 4.57, lng: -74.30 }, 'Ecuador': { lat: -1.83, lng: -78.18 },
    'Guyana': { lat: 4.86, lng: -58.93 }
  };
  return map[country] || null;
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json({
        events: cache.data,
        lastUpdate: new Date(cache.ts).toISOString(),
        totalEvents: cache.data.length,
        dataSource: 'cached'
      });
    }

    // Fetch all sources in parallel
    const [gdeltEvents, travelEvents, sanctionsEvents] = await Promise.all([
      fetchGDELTEvents(),
      fetchTravelAdvisoryAlerts(),
      fetchSanctionsAlerts()
    ]);

    // Always include curated conflict zones
    const conflictZones = getActiveConflictZones();

    // Merge all sources, conflict zones first (highest confidence)
    let allEvents = [...conflictZones, ...sanctionsEvents, ...travelEvents, ...gdeltEvents];

    const sources: string[] = ['Conflict Zones'];
    if (gdeltEvents.length > 0) sources.push('GDELT');
    if (travelEvents.length > 0) sources.push('State Dept');
    if (sanctionsEvents.length > 0) sources.push('OFAC');

    console.log(`Geopolitical: ${conflictZones.length} conflict zones + ${gdeltEvents.length} GDELT + ${travelEvents.length} travel + ${sanctionsEvents.length} sanctions`);

    // Sort by severity
    const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
    allEvents.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

    // Deduplicate by proximity (within 2 degrees)
    const unique: GeopoliticalEvent[] = [];
    for (const evt of allEvents) {
      const isDup = unique.some(e =>
        Math.abs(e.lat - evt.lat) < 2 && Math.abs(e.lng - evt.lng) < 2 && e.category === evt.category
      );
      if (!isDup && unique.length < 20) unique.push(evt);
    }

    cache = { data: unique, ts: Date.now() };

    return NextResponse.json({
      events: unique,
      lastUpdate: new Date().toISOString(),
      totalEvents: unique.length,
      dataSource: sources.join(' + '),
      note: `${unique.length} active geopolitical alerts from ${sources.length} sources`
    });
  } catch (error) {
    console.error('Geopolitical API error:', error);
    // Even on error, return conflict zones
    const fallback = getActiveConflictZones();
    return NextResponse.json({
      events: fallback,
      lastUpdate: new Date().toISOString(),
      totalEvents: fallback.length,
      dataSource: 'Conflict Zones (fallback)',
      note: 'Primary APIs failed, showing curated conflict zones'
    });
  }
}
