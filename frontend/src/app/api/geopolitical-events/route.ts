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

// Cache for 2 hours to avoid GDELT rate limiting (max 1 request per 5 seconds)
let cache: { data: GeopoliticalEvent[]; ts: number } | null = null;
const CACHE_MS = 2 * 60 * 60 * 1000;

async function fetchRealGeopoliticalData(): Promise<GeopoliticalEvent[]> {
  const events: GeopoliticalEvent[] = [];

  // RSS feeds from major news sources covering energy/geopolitical news
  const rssFeeds = [
    {
      url: 'https://feeds.reuters.com/reuters/businessNews',
      source: 'Reuters',
      priority: 'high'
    },
    {
      url: 'https://rss.cnn.com/rss/edition.rss',
      source: 'CNN',
      priority: 'medium'
    },
    {
      url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
      source: 'BBC',
      priority: 'high'
    }
  ];

  for (const feed of rssFeeds) {
    try {
      console.log(`Fetching RSS from ${feed.source}: ${feed.url}`);

      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WildcatterTerminal/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        console.error(`RSS fetch failed for ${feed.source}: ${response.status}`);
        continue;
      }

      const xmlText = await response.text();
      console.log(`Got RSS response from ${feed.source}, length: ${xmlText.length}`);

      // Parse RSS XML
      const rssEvents = await parseRSSForGeopoliticalEvents(xmlText, feed.source);
      events.push(...rssEvents);

    } catch (error) {
      console.error(`Error fetching RSS from ${feed.source}:`, error);
      continue;
    }
  }

  console.log(`Total events found from RSS feeds: ${events.length}`);
  return events;
}

async function parseRSSForGeopoliticalEvents(xmlText: string, source: string): Promise<GeopoliticalEvent[]> {
  const events: GeopoliticalEvent[] = [];

  try {
    // Basic XML parsing for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = [...xmlText.matchAll(itemRegex)];

    console.log(`Found ${items.length} RSS items from ${source}`);

    for (const match of items.slice(0, 10)) { // Limit to 10 items per feed
      const itemXml = match[1];

      // Extract title, description, and link
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
      const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);

      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
      const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const pubDate = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

      if (!title) continue;

      // Filter for energy/geopolitical keywords
      const text = (title + ' ' + description).toLowerCase();
      const energyKeywords = ['oil', 'gas', 'energy', 'pipeline', 'refinery', 'sanctions', 'embargo', 'strait', 'naval', 'military', 'conflict', 'war', 'crisis', 'russia', 'iran', 'saudi', 'ukraine', 'china', 'opec'];

      const hasEnergyKeyword = energyKeywords.some(keyword => text.includes(keyword));
      if (!hasEnergyKeyword) {
        continue; // Skip non-energy/geopolitical articles
      }

      console.log(`Energy-related article found: "${title}"`);

      // Classify severity based on keywords
      let severity: GeopoliticalEvent['severity'] = 'low';
      let category: GeopoliticalEvent['category'] = 'general';

      // Critical events
      if (text.includes('attack') || text.includes('explosion') || text.includes('war') ||
          text.includes('invasion') || text.includes('missile') || text.includes('bomb')) {
        severity = 'critical';
        category = 'conflict';
      }
      // High severity
      else if (text.includes('sanctions') || text.includes('embargo') || text.includes('military') ||
               text.includes('threat') || text.includes('naval') || text.includes('crisis') ||
               text.includes('emergency') || text.includes('blockade')) {
        severity = 'high';
        if (text.includes('sanctions') || text.includes('embargo')) category = 'sanctions';
        else if (text.includes('naval') || text.includes('strait')) category = 'naval';
        else category = 'conflict';
      }
      // Moderate severity
      else if (text.includes('tension') || text.includes('dispute') || text.includes('protest') ||
               text.includes('warning') || text.includes('concern') || text.includes('alert')) {
        severity = 'moderate';
        if (text.includes('protest')) category = 'protest';
        else category = 'general';
      }

      // Categorize by type
      if (text.includes('pipeline') || text.includes('refinery') || text.includes('facility') ||
          text.includes('plant') || text.includes('infrastructure')) {
        category = 'facility';
      }

      // Geocode location - simplified approach using common countries/regions
      const { lat, lng, countries } = await geocodeFromText(text);

      if (lat && lng) {
        const event: GeopoliticalEvent = {
          id: `rss_${source.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          lat,
          lng,
          title: title.length > 80 ? title.substring(0, 77) + '...' : title,
          description: description.length > 150 ? description.substring(0, 147) + '...' : description,
          severity,
          source: source,
          date: new Date(pubDate).toISOString(),
          category,
          countries,
          confidence: 0.85 // Medium confidence for RSS-parsed events
        };

        events.push(event);
        console.log(`Created event: ${event.title} (${event.severity}) at ${lat}, ${lng}`);
      }
    }
  } catch (error) {
    console.error(`Error parsing RSS XML from ${source}:`, error);
  }

  return events;
}

async function geocodeFromText(text: string): Promise<{ lat: number; lng: number; countries: string[] }> {
  // Simple geocoding based on country/region mentions in text
  // This is a basic implementation - could be enhanced with proper geocoding API

  const locations = [
    // Middle East
    { keywords: ['iran', 'tehran', 'persian gulf'], lat: 32.4279, lng: 53.6880, country: 'Iran' },
    { keywords: ['iraq', 'baghdad', 'basra'], lat: 33.2232, lng: 43.6793, country: 'Iraq' },
    { keywords: ['saudi', 'arabia', 'riyadh'], lat: 24.7136, lng: 46.6753, country: 'Saudi Arabia' },
    { keywords: ['uae', 'emirates', 'dubai', 'abu dhabi'], lat: 24.2992, lng: 54.6972, country: 'UAE' },
    { keywords: ['kuwait'], lat: 29.3117, lng: 47.4818, country: 'Kuwait' },
    { keywords: ['qatar', 'doha'], lat: 25.3548, lng: 51.1839, country: 'Qatar' },
    { keywords: ['strait of hormuz', 'hormuz'], lat: 26.5667, lng: 56.2500, country: 'Iran' },

    // Europe/Russia
    { keywords: ['russia', 'moscow', 'putin'], lat: 55.7558, lng: 37.6176, country: 'Russia' },
    { keywords: ['ukraine', 'kiev', 'kyiv'], lat: 50.4501, lng: 30.5234, country: 'Ukraine' },
    { keywords: ['germany', 'berlin'], lat: 52.5200, lng: 13.4050, country: 'Germany' },
    { keywords: ['nord stream', 'pipeline'], lat: 54.0000, lng: 14.0000, country: 'Germany' },

    // Africa
    { keywords: ['nigeria', 'lagos', 'abuja'], lat: 9.0765, lng: 7.3986, country: 'Nigeria' },
    { keywords: ['libya', 'tripoli'], lat: 32.8872, lng: 13.1913, country: 'Libya' },
    { keywords: ['algeria'], lat: 28.0339, lng: 1.6596, country: 'Algeria' },
    { keywords: ['angola'], lat: -11.2027, lng: 17.8739, country: 'Angola' },

    // Americas
    { keywords: ['venezuela', 'caracas'], lat: 10.4806, lng: -66.9036, country: 'Venezuela' },
    { keywords: ['usa', 'united states', 'america'], lat: 39.8283, lng: -98.5795, country: 'USA' },
    { keywords: ['texas', 'permian'], lat: 31.9686, lng: -102.1289, country: 'USA' },
    { keywords: ['gulf of mexico'], lat: 25.0000, lng: -90.0000, country: 'USA' },

    // Asia
    { keywords: ['china', 'beijing'], lat: 39.9042, lng: 116.4074, country: 'China' },
    { keywords: ['south china sea'], lat: 16.0000, lng: 114.0000, country: 'China' },
    { keywords: ['india', 'delhi'], lat: 28.7041, lng: 77.1025, country: 'India' }
  ];

  const lowerText = text.toLowerCase();

  for (const location of locations) {
    for (const keyword of location.keywords) {
      if (lowerText.includes(keyword)) {
        return {
          lat: location.lat,
          lng: location.lng,
          countries: [location.country]
        };
      }
    }
  }

  // Default to global/international if no specific location found
  return {
    lat: 0,
    lng: 0,
    countries: ['Global']
  };
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

    // Fetch real geopolitical data from RSS feeds
    let events = await fetchRealGeopoliticalData();
    let dataSource = 'real';
    
    if (events.length > 0) {
      console.log(`Got ${events.length} real RSS events - using real data only`);
      dataSource = 'real';
      // Use only real RSS data
      events = events.slice(0, 15);
    } else {
      console.log('No RSS events found - using simulation fallback');
      dataSource = 'simulation';
      const simulationData = getMockGeopoliticalEvents();
      events = simulationData;
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
      dataSource: dataSource, // 'real' if RSS feeds working, 'simulation' if fallback
      note: dataSource === 'real' ? 'Real-time data from Reuters, CNN, BBC RSS feeds' : 'Using simulation data - RSS feeds unavailable'
    });

  } catch (error) {
    console.error('Geopolitical events API error:', error);

    // Ultimate fallback
    const fallbackData = getMockGeopoliticalEvents();
    return NextResponse.json({
      events: fallbackData,
      lastUpdate: new Date().toISOString(),
      totalEvents: fallbackData.length,
      dataSource: 'simulation',
      note: 'Using simulation data due to RSS API error'
    });
  }
}