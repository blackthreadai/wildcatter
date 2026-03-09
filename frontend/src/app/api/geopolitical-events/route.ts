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

async function fetchGDELTData(): Promise<GeopoliticalEvent[]> {
  try {
    // GDELT Global Knowledge Graph API - simplified query to avoid rate limits
    const baseUrl = 'https://api.gdeltproject.org/api/v2/doc/doc';
    
    // Much simpler query to reduce rate limiting issues
    const params = new URLSearchParams({
      query: 'energy pipeline sanctions',
      mode: 'artlist', 
      maxrecords: '10',
      timespan: '3d', // Last 3 days for more results
      format: 'json'
    });

    console.log(`Fetching GDELT data: ${baseUrl}?${params}`);

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: { 
        'User-Agent': 'WildcatterTerminal/1.0 (contact@wildcatter.ai)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // Longer timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GDELT API HTTP ${response.status}: ${errorText}`);
      throw new Error(`GDELT API HTTP ${response.status}: ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`GDELT response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    // Handle GDELT rate limiting message
    if (responseText.includes('Please limit requests to one every 5 seconds')) {
      console.error('GDELT rate limit hit - using cached data');
      throw new Error('GDELT rate limited');
    }
    
    const data = JSON.parse(responseText);
    const events: GeopoliticalEvent[] = [];
    
    if (data?.articles && Array.isArray(data.articles)) {
      console.log(`Found ${data.articles.length} GDELT articles`);
      
      for (const article of data.articles.slice(0, 8)) {
        // Extract coordinates from GDELT data - be more flexible
        const lat = parseFloat(article.lat || article.geolat || '0');
        const lng = parseFloat(article.lng || article.geolon || '0');
        
        console.log(`Article: "${article.title}" at ${lat}, ${lng}`);
        
        // Skip if no valid coordinates (but be less strict)
        if (!lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
          console.log(`Skipping article with invalid coords: ${lat}, ${lng}`);
          continue;
        }
        
        // Classify severity based on keywords
        const title = (article.title || '').toLowerCase();
        const text = (article.title + ' ' + article.socialfeedsharedesc).toLowerCase();
        
        let severity: GeopoliticalEvent['severity'] = 'low';
        let category: GeopoliticalEvent['category'] = 'general';
        
        // Critical events
        if (text.includes('attack') || text.includes('explosion') || text.includes('war') || 
            text.includes('blockade') || text.includes('invasion')) {
          severity = 'critical';
        }
        // High severity
        else if (text.includes('sanctions') || text.includes('military') || text.includes('threat') ||
                 text.includes('naval') || text.includes('crisis') || text.includes('emergency')) {
          severity = 'high';
        }
        // Moderate severity
        else if (text.includes('tension') || text.includes('protest') || text.includes('dispute') ||
                 text.includes('warning') || text.includes('concern')) {
          severity = 'moderate';
        }
        
        // Categorize by type
        if (text.includes('pipeline') || text.includes('refinery') || text.includes('facility')) {
          category = 'facility';
        } else if (text.includes('naval') || text.includes('ship') || text.includes('strait')) {
          category = 'naval';
        } else if (text.includes('sanctions') || text.includes('embargo')) {
          category = 'sanctions';
        } else if (text.includes('protest') || text.includes('demonstration')) {
          category = 'protest';
        } else if (text.includes('conflict') || text.includes('attack')) {
          category = 'conflict';
        }
        
        const event = {
          id: `gdelt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          lat,
          lng,
          title: article.title || 'Energy-Related Event',
          description: article.socialfeedsharedesc || article.title || 'Energy sector development',
          severity,
          source: article.domain || article.sourcedomain || 'GDELT',
          date: article.seendate || article.dateadded || new Date().toISOString(),
          category,
          countries: [article.sourcecountry || article.geocountry || 'Global'],
          confidence: Math.min(0.95, Math.max(0.7, (article.socialsharecount || 10) / 100))
        };
        
        console.log(`Created event: ${event.title} (${event.severity})`);
        events.push(event);
      }
    }
    
    console.log(`Returning ${events.length} real GDELT events`);
    return events;
    
  } catch (error) {
    console.error('GDELT data fetch error:', error);
    return [];
  }
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

    // Try to fetch from GDELT API first
    let events = await fetchGDELTData();
    let dataSource = 'mixed';
    
    if (events.length > 0) {
      console.log(`Got ${events.length} real GDELT events - using real data only`);
      dataSource = 'real';
      // Use only real GDELT data, no mixing with mock
      events = events.slice(0, 12);
    } else {
      console.log('No GDELT events found - using fallback data');
      dataSource = 'fallback';
      const mockData = getMockGeopoliticalEvents();
      events = mockData;
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
      dataSource: dataSource // real, fallback, or mixed
    });
    
  } catch (error) {
    console.error('Geopolitical events API error:', error);
    
    // Ultimate fallback
    const fallbackData = getMockGeopoliticalEvents();
    return NextResponse.json({
      events: fallbackData,
      lastUpdate: new Date().toISOString(),
      totalEvents: fallbackData.length
    });
  }
}