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

// Cache for 6 hours to respect GDELT rate limits (max 1 request per 5 seconds)
let cache: { data: GeopoliticalEvent[]; ts: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

// Track last GDELT request time to respect rate limits
let lastGDELTRequest = 0;
const GDELT_RATE_LIMIT_MS = 5000; // 5 seconds between requests

async function fetchRealGeopoliticalData(): Promise<GeopoliticalEvent[]> {
  const events: GeopoliticalEvent[] = [];

  try {
    console.log('Fetching real GDELT geopolitical data...');

    // Check rate limit - wait if necessary
    const now = Date.now();
    const timeSinceLastRequest = now - lastGDELTRequest;
    if (timeSinceLastRequest < GDELT_RATE_LIMIT_MS) {
      const waitTime = GDELT_RATE_LIMIT_MS - timeSinceLastRequest;
      console.log(`Waiting ${waitTime}ms to respect GDELT rate limit...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // GDELT GKG API for energy/geopolitical events
    const gdeltUrl = 'https://api.gdeltproject.org/api/v2/doc/doc?query=energy%20OR%20oil%20OR%20gas%20OR%20pipeline%20OR%20sanctions%20OR%20naval%20OR%20military&mode=artlist&maxrecords=50&format=json&startdatetime=now-24h&sort=datedesc';

    lastGDELTRequest = Date.now();

    const response = await fetch(gdeltUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WildcatterTerminal/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.error(`GDELT API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    console.log(`GDELT response received: ${data?.articles?.length || 0} articles`);

    if (data?.articles && Array.isArray(data.articles)) {
      for (const article of data.articles.slice(0, 20)) {
        if (!article.title || !article.url) continue;

        // Extract location from article content
        const location = await extractLocationFromGDELTArticle(article);
        if (!location.lat || !location.lng) continue;

        // Classify event severity and category
        const classification = classifyGDELTEvent(article.title, article.socialimage || '');

        const event: GeopoliticalEvent = {
          id: `gdelt_${article.url.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || Math.random().toString(36).substr(2, 9)}`,
          lat: location.lat,
          lng: location.lng,
          title: article.title.length > 80 ? article.title.substring(0, 77) + '...' : article.title,
          description: (article.socialimage || article.title).length > 150 ? (article.socialimage || article.title).substring(0, 147) + '...' : (article.socialimage || article.title),
          severity: classification.severity,
          source: article.domain || 'GDELT',
          date: article.seendate || new Date().toISOString(),
          category: classification.category,
          countries: location.countries,
          confidence: 0.85
        };

        events.push(event);
        console.log(`Created GDELT event: ${event.title} (${event.severity}) at ${location.lat}, ${location.lng}`);
      }
    }

    console.log(`Total GDELT events processed: ${events.length}`);
    return events;

  } catch (error) {
    console.error('GDELT API error:', error);
    return [];
  }
}

async function extractLocationFromGDELTArticle(article: any): Promise<{ lat: number; lng: number; countries: string[] }> {
  // Extract location mentions from GDELT article title and description
  const text = (article.title + ' ' + (article.socialimage || '')).toLowerCase();

  // Geographic location mapping for energy/geopolitical events
  const locations = [
    // Middle East (key energy region)
    { keywords: ['iran', 'tehran', 'persian gulf', 'strait of hormuz'], lat: 32.4279, lng: 53.6880, country: 'Iran' },
    { keywords: ['iraq', 'baghdad', 'basra', 'kirkuk'], lat: 33.2232, lng: 43.6793, country: 'Iraq' },
    { keywords: ['saudi', 'arabia', 'riyadh', 'dhahran', 'ras tanura'], lat: 24.7136, lng: 46.6753, country: 'Saudi Arabia' },
    { keywords: ['uae', 'emirates', 'dubai', 'abu dhabi', 'das island'], lat: 24.2992, lng: 54.6972, country: 'UAE' },
    { keywords: ['kuwait', 'al ahmadi'], lat: 29.3117, lng: 47.4818, country: 'Kuwait' },
    { keywords: ['qatar', 'doha', 'ras laffan'], lat: 25.3548, lng: 51.1839, country: 'Qatar' },

    // Russia/Europe
    { keywords: ['russia', 'moscow', 'putin', 'gazprom', 'rosneft'], lat: 55.7558, lng: 37.6176, country: 'Russia' },
    { keywords: ['ukraine', 'kiev', 'kyiv', 'lviv'], lat: 50.4501, lng: 30.5234, country: 'Ukraine' },
    { keywords: ['germany', 'berlin', 'nord stream'], lat: 52.5200, lng: 13.4050, country: 'Germany' },
    { keywords: ['norway', 'oslo', 'statoil', 'equinor'], lat: 60.4720, lng: 8.4689, country: 'Norway' },

    // Africa
    { keywords: ['nigeria', 'lagos', 'abuja', 'bonny', 'forcados'], lat: 9.0765, lng: 7.3986, country: 'Nigeria' },
    { keywords: ['libya', 'tripoli', 'benghazi'], lat: 32.8872, lng: 13.1913, country: 'Libya' },
    { keywords: ['algeria', 'algiers'], lat: 28.0339, lng: 1.6596, country: 'Algeria' },
    { keywords: ['angola', 'luanda', 'cabinda'], lat: -11.2027, lng: 17.8739, country: 'Angola' },

    // Americas
    { keywords: ['venezuela', 'caracas', 'maracaibo', 'pdvsa'], lat: 10.4806, lng: -66.9036, country: 'Venezuela' },
    { keywords: ['usa', 'united states', 'america', 'texas', 'permian'], lat: 39.8283, lng: -98.5795, country: 'USA' },
    { keywords: ['canada', 'alberta', 'oil sands', 'tar sands'], lat: 56.1304, lng: -106.3468, country: 'Canada' },
    { keywords: ['brazil', 'petrobras', 'santos basin', 'pre-salt'], lat: -14.2350, lng: -51.9253, country: 'Brazil' },

    // Asia
    { keywords: ['china', 'beijing', 'sinopec', 'cnpc'], lat: 39.9042, lng: 116.4074, country: 'China' },
    { keywords: ['india', 'delhi', 'mumbai', 'reliance'], lat: 20.5937, lng: 78.9629, country: 'India' },
    { keywords: ['japan', 'tokyo', 'lng'], lat: 36.2048, lng: 138.2529, country: 'Japan' },
    { keywords: ['south korea', 'seoul', 'busan'], lat: 35.9078, lng: 127.7669, country: 'South Korea' },
    { keywords: ['indonesia', 'jakarta', 'pertamina'], lat: -0.7893, lng: 113.9213, country: 'Indonesia' },
    { keywords: ['malaysia', 'kuala lumpur', 'petronas'], lat: 4.2105, lng: 101.9758, country: 'Malaysia' },

    // Strategic waterways
    { keywords: ['suez canal', 'suez'], lat: 30.0131, lng: 32.5502, country: 'Egypt' },
    { keywords: ['strait of malacca', 'singapore strait'], lat: 1.3521, lng: 103.8198, country: 'Singapore' },
    { keywords: ['bosphorus', 'dardanelles'], lat: 41.0082, lng: 28.9784, country: 'Turkey' }
  ];

  for (const location of locations) {
    for (const keyword of location.keywords) {
      if (text.includes(keyword)) {
        return {
          lat: location.lat,
          lng: location.lng,
          countries: [location.country]
        };
      }
    }
  }

  // If no specific location found, return null coordinates
  return { lat: 0, lng: 0, countries: ['Global'] };
}

function classifyGDELTEvent(title: string, description: string): { severity: GeopoliticalEvent['severity']; category: GeopoliticalEvent['category'] } {
  const text = (title + ' ' + description).toLowerCase();

  let severity: GeopoliticalEvent['severity'] = 'low';
  let category: GeopoliticalEvent['category'] = 'general';

  // Critical events
  if (text.includes('war') || text.includes('attack') || text.includes('bombing') ||
      text.includes('invasion') || text.includes('missile') || text.includes('explosion') ||
      text.includes('terror') || text.includes('emergency')) {
    severity = 'critical';
    category = 'conflict';
  }
  // High severity
  else if (text.includes('sanctions') || text.includes('embargo') || text.includes('military') ||
           text.includes('naval') || text.includes('blockade') || text.includes('crisis') ||
           text.includes('threat') || text.includes('violation') || text.includes('breach')) {
    severity = 'high';
    if (text.includes('sanctions') || text.includes('embargo')) category = 'sanctions';
    else if (text.includes('naval') || text.includes('strait') || text.includes('fleet')) category = 'naval';
    else category = 'conflict';
  }
  // Moderate severity
  else if (text.includes('tension') || text.includes('dispute') || text.includes('protest') ||
           text.includes('warning') || text.includes('concern') || text.includes('alert') ||
           text.includes('negotiation') || text.includes('talks')) {
    severity = 'moderate';
    if (text.includes('protest') || text.includes('demonstration')) category = 'protest';
    else category = 'general';
  }

  // Override category based on specific keywords
  if (text.includes('pipeline') || text.includes('refinery') || text.includes('facility') ||
      text.includes('plant') || text.includes('infrastructure') || text.includes('terminal')) {
    category = 'facility';
  }

  return { severity, category };
}

// High-quality mock geopolitical events for when APIs are unavailable
function getMockGeopoliticalEvents(): GeopoliticalEvent[] {
  const now = new Date();

  return [
    {
      id: 'mock_001',
      lat: 26.5667,
      lng: 56.25,
      title: 'Strait of Hormuz Naval Activity',
      description: 'Increased naval vessel presence reported near critical shipping lanes',
      severity: 'high',
      source: 'Reuters',
      date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      category: 'naval',
      countries: ['Iran', 'UAE'],
      confidence: 0.85
    },
    {
      id: 'mock_002',
      lat: 33.3128,
      lng: 44.3615,
      title: 'Pipeline Infrastructure Alert',
      description: 'Security measures increased around major oil transport infrastructure',
      severity: 'moderate',
      source: 'Bloomberg',
      date: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      category: 'pipeline',
      countries: ['Iraq'],
      confidence: 0.78
    },
    {
      id: 'mock_003',
      lat: 20.0,
      lng: 38.0,
      title: 'Red Sea Shipping Concerns',
      description: 'Commercial vessels report increased security protocols in international waters',
      severity: 'moderate',
      source: 'AP News',
      date: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      category: 'naval',
      countries: ['Saudi Arabia', 'Yemen'],
      confidence: 0.82
    },
    {
      id: 'mock_004',
      lat: 24.2134,
      lng: 55.8713,
      title: 'Energy Facility Security Update',
      description: 'Enhanced security protocols implemented at major energy processing facilities',
      severity: 'low',
      source: 'S&P Global',
      date: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      category: 'facility',
      countries: ['UAE'],
      confidence: 0.75
    },
    {
      id: 'mock_005',
      lat: 29.3117,
      lng: 47.4818,
      title: 'Regional Energy Trade Discussions',
      description: 'Diplomatic talks regarding energy export agreements and regional stability',
      severity: 'low',
      source: 'Energy Intelligence',
      date: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      category: 'general',
      countries: ['Kuwait'],
      confidence: 0.70
    },
    {
      id: 'mock_006',
      lat: 55.2708,
      lng: 25.2048,
      title: 'Supply Chain Monitoring',
      description: 'Enhanced monitoring systems for energy supply chain security implemented',
      severity: 'low',
      source: 'MEED',
      date: new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString(),
      category: 'general',
      countries: ['UAE'],
      confidence: 0.73
    },
    {
      id: 'mock_007',
      lat: 21.4858,
      lng: 39.1925,
      title: 'Energy Sector Investment News',
      description: 'Major investments announced in renewable energy infrastructure development',
      severity: 'low',
      source: 'Arab News',
      date: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
      category: 'general',
      countries: ['Saudi Arabia'],
      confidence: 0.68
    },
    {
      id: 'mock_008',
      lat: 32.7767,
      lng: 35.0231,
      title: 'Regional Energy Cooperation',
      description: 'Energy ministers discuss regional cooperation and stability initiatives',
      severity: 'low',
      source: 'Jerusalem Post',
      date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      category: 'general',
      countries: ['Israel'],
      confidence: 0.65
    }
  ];
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json({
        events: cache.data,
        lastUpdate: new Date(cache.ts).toISOString(),
        totalEvents: cache.data.length
      });
    }

    // Fetch real geopolitical data from GDELT (with rate limiting)
    let events = await fetchRealGeopoliticalData();
    let dataSource = 'real';
    let note = '';
    
    if (events.length > 0) {
      console.log(`Got ${events.length} real GDELT events`);
      dataSource = 'real';
      note = 'Real-time data from GDELT Project (Global Database of Events, Language, and Tone)';
      // Use real GDELT data
      events = events.slice(0, 20);
    } else {
      console.log('No GDELT events found - API may be rate limited or down');
      dataSource = 'unavailable';
      note = 'GDELT API temporarily unavailable - no geopolitical events to display';
      events = []; // NO FAKE DATA
    }

    // Sort by severity (critical first) and then by date (newest first)
    const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
    events.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Remove duplicates by approximate location (within 0.5 degrees)
    const uniqueEvents: GeopoliticalEvent[] = [];
    for (const event of events) {
      const isDuplicate = uniqueEvents.some(existing =>
        Math.abs(existing.lat - event.lat) < 0.5 &&
        Math.abs(existing.lng - event.lng) < 0.5
      );

      if (!isDuplicate && uniqueEvents.length < 12) {
        uniqueEvents.push(event);
      }
    }

    // Cache the results
    cache = { data: uniqueEvents, ts: Date.now() };

    return NextResponse.json({
      events: uniqueEvents,
      lastUpdate: new Date().toISOString(),
      totalEvents: uniqueEvents.length,
      dataSource: dataSource, // 'real' if GDELT working, 'unavailable' if not
      note: note
    });

  } catch (error) {
    console.error('Geopolitical events API error:', error);

    // No fallback fake data - return empty with error note
    return NextResponse.json({
      events: [],
      lastUpdate: new Date().toISOString(),
      totalEvents: 0,
      dataSource: 'error',
      note: 'Geopolitical API error - no real data available'
    });
  }
}