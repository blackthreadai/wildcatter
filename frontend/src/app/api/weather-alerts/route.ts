import { NextResponse } from 'next/server';

interface WeatherAlert {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  severity: 'extreme' | 'high' | 'moderate' | 'low';
  type: 'hurricane' | 'typhoon' | 'tornado' | 'flood' | 'drought' | 'wildfire' | 'blizzard' | 'heatwave' | 'thunderstorm';
  source: string;
  date: string;
  location: string;
  confidence: number;
  expires?: string;
}

// Cache for 15 minutes (weather alerts change frequently)
let cache: { data: WeatherAlert[]; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

async function fetchNOAAWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // NOAA National Weather Service Alerts API
    const response = await fetch('https://api.weather.gov/alerts/active', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/geo+json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) throw new Error(`NOAA API HTTP ${response.status}`);
    
    const data = await response.json();
    const alerts: WeatherAlert[] = [];
    
    if (data?.features && Array.isArray(data.features)) {
      for (const feature of data.features.slice(0, 20)) {
        const props = feature.properties;
        const geometry = feature.geometry;
        
        if (!props || !props.event || !props.headline || !geometry) continue;
        
        // Extract coordinates (use centroid of area)
        let lat = 0, lng = 0;
        
        if (geometry.type === 'Polygon' && geometry.coordinates?.[0]) {
          // Calculate centroid of polygon
          const coords = geometry.coordinates[0];
          for (const coord of coords) {
            lng += coord[0];
            lat += coord[1];
          }
          lng /= coords.length;
          lat /= coords.length;
        } else if (geometry.type === 'Point' && geometry.coordinates) {
          lng = geometry.coordinates[0];
          lat = geometry.coordinates[1];
        } else {
          continue; // Skip if no valid coordinates
        }
        
        // Classify event type
        const eventLower = props.event.toLowerCase();
        let type: WeatherAlert['type'] = 'thunderstorm';
        
        if (eventLower.includes('hurricane')) type = 'hurricane';
        else if (eventLower.includes('typhoon')) type = 'typhoon';
        else if (eventLower.includes('tornado')) type = 'tornado';
        else if (eventLower.includes('flood') || eventLower.includes('flash flood')) type = 'flood';
        else if (eventLower.includes('drought')) type = 'drought';
        else if (eventLower.includes('fire')) type = 'wildfire';
        else if (eventLower.includes('blizzard') || eventLower.includes('snow')) type = 'blizzard';
        else if (eventLower.includes('heat') || eventLower.includes('excessive temperature')) type = 'heatwave';
        
        // Classify severity
        let severity: WeatherAlert['severity'] = 'moderate';
        const severityText = (props.severity || '').toLowerCase();
        const urgencyText = (props.urgency || '').toLowerCase();
        const certaintyText = (props.certainty || '').toLowerCase();
        
        if (severityText.includes('extreme') || urgencyText.includes('immediate') || 
            props.event.toLowerCase().includes('emergency')) {
          severity = 'extreme';
        } else if (severityText.includes('severe') || urgencyText.includes('expected')) {
          severity = 'high';
        } else if (severityText.includes('minor') || urgencyText.includes('future')) {
          severity = 'low';
        }
        
        alerts.push({
          id: props.id || `noaa_${Date.now()}_${Math.random()}`,
          lat,
          lng,
          title: props.event,
          description: props.headline.substring(0, 200) + (props.headline.length > 200 ? '...' : ''),
          severity,
          type,
          source: 'NOAA/NWS',
          date: props.effective || props.sent || new Date().toISOString(),
          location: props.areaDesc?.split(',')[0] || 'Unknown',
          confidence: 0.95,
          expires: props.expires || undefined
        });
      }
    }
    
    return alerts;
    
  } catch (error) {
    console.error('NOAA weather alerts fetch error:', error);
    return [];
  }
}

// Additional international weather data sources
async function fetchGlobalWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // This would integrate with services like:
    // - Japan Meteorological Agency (for typhoons)
    // - European Centre for Medium-Range Weather Forecasts
    // - Australian Bureau of Meteorology
    // For now, using realistic mock data for global coverage
    
    return [];
  } catch (error) {
    console.error('Global weather alerts fetch error:', error);
    return [];
  }
}

// High-quality mock weather alerts for comprehensive global coverage
function getMockWeatherAlerts(): WeatherAlert[] {
  const now = new Date();
  
  return [
    {
      id: 'mock_hurricane_001',
      lat: 25.7617,
      lng: -80.1918,
      title: 'Hurricane Warning',
      description: 'Hurricane Zeta intensifying to Category 3, expected landfall in 18 hours with 125 mph winds and life-threatening storm surge',
      severity: 'extreme',
      type: 'hurricane',
      source: 'National Hurricane Center',
      date: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      location: 'South Florida',
      confidence: 0.95,
      expires: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_typhoon_001', 
      lat: 14.5995,
      lng: 120.9842,
      title: 'Typhoon Alert',
      description: 'Super Typhoon Kong-rey approaching Luzon with sustained winds of 180 km/h, residents urged to evacuate coastal areas',
      severity: 'extreme',
      type: 'typhoon',
      source: 'Philippine Atmospheric Agency',
      date: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      location: 'Northern Philippines',
      confidence: 0.92
    },
    {
      id: 'mock_tornado_001',
      lat: 36.1627,
      lng: -86.7816,
      title: 'Tornado Warning',
      description: 'Multiple tornadoes confirmed on ground in Middle Tennessee, EF3 damage reported, take shelter immediately',
      severity: 'extreme',
      type: 'tornado',
      source: 'NOAA Storm Prediction Center',
      date: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      location: 'Nashville Metro',
      confidence: 0.98,
      expires: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_flood_001',
      lat: 29.7604,
      lng: -95.3698,
      title: 'Flash Flood Emergency',
      description: 'Life-threatening flash flooding in progress, 8+ inches of rain in 3 hours, water rescues underway across Harris County',
      severity: 'extreme',
      type: 'flood',
      source: 'NOAA/NWS Houston',
      date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      location: 'Houston Metro',
      confidence: 0.96
    },
    {
      id: 'mock_drought_001',
      lat: 36.7783,
      lng: -119.4179,
      title: 'Exceptional Drought',
      description: 'Exceptional drought conditions persist with reservoir levels at historic lows, agricultural impacts severe',
      severity: 'high',
      type: 'drought',
      source: 'US Drought Monitor',
      date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      location: 'Central Valley CA',
      confidence: 0.88
    },
    {
      id: 'mock_wildfire_001',
      lat: 40.7589,
      lng: -111.8883,
      title: 'Large Wildfire',
      description: 'Fairview Fire burning 45,000 acres with 15% containment, evacuation orders issued for 2,500 residents',
      severity: 'high', 
      type: 'wildfire',
      source: 'CAL FIRE',
      date: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      location: 'Riverside County',
      confidence: 0.91
    },
    {
      id: 'mock_blizzard_001',
      lat: 44.9778,
      lng: -93.2650,
      title: 'Blizzard Warning',
      description: 'Historic blizzard expected with 18-24 inches snow, winds 50+ mph, travel impossible for 36 hours',
      severity: 'high',
      type: 'blizzard',
      source: 'NOAA/NWS Twin Cities',
      date: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      location: 'Minneapolis-St. Paul',
      confidence: 0.89,
      expires: new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_heatwave_001',
      lat: 33.4484,
      lng: -112.0740,
      title: 'Excessive Heat Warning',
      description: 'Dangerous heat wave continues with temperatures 118-122°F, heat index values up to 130°F, multiple heat-related hospitalizations',
      severity: 'high',
      type: 'heatwave',
      source: 'NOAA/NWS Phoenix',
      date: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      location: 'Phoenix Metro',
      confidence: 0.93,
      expires: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_thunderstorm_001',
      lat: 39.7392,
      lng: -104.9903,
      title: 'Severe Thunderstorm Warning',
      description: 'Severe thunderstorms with golf ball sized hail and 70 mph winds moving through metro area, significant damage possible',
      severity: 'moderate',
      type: 'thunderstorm',
      source: 'NOAA/NWS Denver',
      date: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      location: 'Denver Metro',
      confidence: 0.84,
      expires: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_flood_002',
      lat: 38.2904,
      lng: -92.6390,
      title: 'River Flood Warning',
      description: 'Missouri River at Jefferson City expected to crest at 32.5 feet, major flooding of agricultural areas and some roads',
      severity: 'moderate',
      type: 'flood',
      source: 'NOAA/NWS Central Missouri',
      date: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      location: 'Central Missouri',
      confidence: 0.87
    }
  ];
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json({
        alerts: cache.data,
        lastUpdate: new Date(cache.ts).toISOString(),
        totalAlerts: cache.data.length
      });
    }

    // Try to fetch from NOAA API first
    let alerts = await fetchNOAAWeatherAlerts();
    
    // Add international sources
    const globalAlerts = await fetchGlobalWeatherAlerts();
    alerts = [...alerts, ...globalAlerts];
    
    // Only use real data - no fake weather events
    if (alerts.length === 0) {
      // If no real alerts, return empty instead of fake hurricanes
      alerts = [];
    }
    
    // Sort by severity (extreme first) and then by date (newest first)
    const severityOrder = { extreme: 4, high: 3, moderate: 2, low: 1 };
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    // Remove duplicates by approximate location (within 1 degree for weather)
    const uniqueAlerts: WeatherAlert[] = [];
    for (const alert of alerts) {
      const isDuplicate = uniqueAlerts.some(existing => 
        Math.abs(existing.lat - alert.lat) < 1.0 && 
        Math.abs(existing.lng - alert.lng) < 1.0 &&
        existing.type === alert.type
      );
      
      if (!isDuplicate && uniqueAlerts.length < 20) {
        uniqueAlerts.push(alert);
      }
    }
    
    // Cache the results
    cache = { data: uniqueAlerts, ts: Date.now() };
    
    return NextResponse.json({
      alerts: uniqueAlerts,
      lastUpdate: new Date().toISOString(),
      totalAlerts: uniqueAlerts.length
    });
    
  } catch (error) {
    console.error('Weather alerts API error:', error);
    
    // Ultimate fallback - return empty instead of fake data
    return NextResponse.json({
      alerts: [],
      lastUpdate: new Date().toISOString(),
      totalAlerts: 0
    });
  }
}