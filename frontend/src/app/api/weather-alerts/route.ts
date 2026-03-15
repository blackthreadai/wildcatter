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

// Global weather alert sources (real APIs only)
async function fetchGlobalWeatherAlerts(): Promise<WeatherAlert[]> {
  const allAlerts: WeatherAlert[] = [];
  
  // 1. NOAA (United States) - working
  const noaaAlerts = await fetchNOAAWeatherAlerts();
  allAlerts.push(...noaaAlerts);
  
  // 2. European weather alerts (UK + Germany) - working  
  const europeAlerts = await fetchEuropeanWeatherAlerts();
  allAlerts.push(...europeAlerts);
  
  // 3. Hong Kong Observatory - working
  const hongkongAlerts = await fetchHongKongWeatherAlerts();
  allAlerts.push(...hongkongAlerts);
  
  // Note: Canada, Australia, Japan APIs either block automation or lack public endpoints
  
  console.log(`Total global weather alerts collected: ${allAlerts.length}`);
  return allAlerts;
}

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

// Additional weather APIs could be added here in the future
// Currently supporting: US (NOAA), UK (Met Office), Germany (DWD), Hong Kong (Observatory)

async function fetchUKWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // UK Met Office Weather Warnings RSS Feed (free, working)
    console.log('Fetching real UK Met Office weather alerts...');
    
    const response = await fetch('https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/UK', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.log(`UK Met Office RSS not accessible: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const alerts: WeatherAlert[] = [];
    
    // Parse Met Office RSS XML
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = [...xmlText.matchAll(itemRegex)];
    
    console.log(`Found ${items.length} UK Met Office warnings`);
    
    for (const match of items.slice(0, 10)) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
      const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/i);
      
      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
      const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';
      
      if (!title) continue;
      
      // Parse Met Office warning types and severity
      const alertText = (title + ' ' + description).toLowerCase();
      let type: WeatherAlert['type'] = 'thunderstorm';
      let severity: WeatherAlert['severity'] = 'moderate';
      
      // Map Met Office warning types
      if (alertText.includes('rain') || alertText.includes('flood')) type = 'flood';
      else if (alertText.includes('snow') || alertText.includes('ice') || alertText.includes('blizzard')) type = 'blizzard';
      else if (alertText.includes('wind') || alertText.includes('gale')) type = 'thunderstorm';
      else if (alertText.includes('heat') || alertText.includes('temperature')) type = 'heatwave';
      else if (alertText.includes('thunderstorm') || alertText.includes('thunder')) type = 'thunderstorm';
      
      // Map Met Office severity colors
      if (alertText.includes('red') || alertText.includes('dangerous') || alertText.includes('risk to life')) {
        severity = 'extreme';
      } else if (alertText.includes('amber') || alertText.includes('orange')) {
        severity = 'high';
      } else if (alertText.includes('yellow')) {
        severity = 'moderate';
      }
      
      // Use UK coordinates (center of UK)
      const ukCoords = { lat: 54.3781, lng: -3.4360 };
      
      alerts.push({
        id: `uk_metoffice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lat: ukCoords.lat,
        lng: ukCoords.lng,
        title: title.substring(0, 80),
        description: description.substring(0, 200),
        severity,
        type,
        source: 'UK Met Office',
        date: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
        location: 'United Kingdom',
        confidence: 0.98 // Very high confidence - official UK government data
      });
    }
    
    console.log(`Real UK Met Office alerts: ${alerts.length}`);
    return alerts;
    
  } catch (error) {
    console.error('UK Met Office API error:', error);
    return []; // NO FAKE DATA - return empty
  }
}

async function fetchGermanWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // German Weather Service (DWD) Warnings JSON API (free, working)
    console.log('Fetching real German DWD weather alerts...');
    
    const response = await fetch('https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.log(`German DWD API not accessible: ${response.status}`);
      return [];
    }
    
    let jsonText = await response.text();
    
    // DWD wraps JSON in a function call - extract the JSON
    const jsonMatch = jsonText.match(/warnWetter\.loadWarnings\((.*)\);?$/);
    if (!jsonMatch) {
      console.log('Could not parse DWD JSON format');
      return [];
    }
    
    const data = JSON.parse(jsonMatch[1]);
    const alerts: WeatherAlert[] = [];
    
    if (data?.warnings && typeof data.warnings === 'object') {
      console.log(`Found DWD warnings regions: ${Object.keys(data.warnings).length}`);
      
      for (const [regionId, warnings] of Object.entries(data.warnings)) {
        if (!Array.isArray(warnings)) continue;
        
        for (const warning of warnings.slice(0, 3)) { // Max 3 per region
          if (!warning || typeof warning !== 'object') continue;
          
          // Parse DWD warning data
          const description = warning.description || '';
          const regionName = warning.regionName || '';
          const state = warning.state || '';
          const level = warning.level || 1; // DWD levels 1-4
          const type = warning.type || 0; // DWD warning types
          
          if (!regionName || !description) continue;
          
          // Map DWD warning types to our types
          let alertType: WeatherAlert['type'] = 'thunderstorm';
          let severity: WeatherAlert['severity'] = 'moderate';
          
          // DWD warning type mapping (approximate)
          if (type === 0 || type === 1) alertType = 'thunderstorm'; // Gewitter/Sturm
          else if (type === 2) alertType = 'blizzard'; // Schnee/Frost
          else if (type === 3) alertType = 'heatwave'; // Hitze
          else if (type === 4) alertType = 'flood'; // Regen/Überschwemmung
          else if (type === 5) alertType = 'wildfire'; // Nebel/Brand
          
          // Map DWD severity levels
          if (level >= 4) severity = 'extreme'; // Violet warnings
          else if (level >= 3) severity = 'high'; // Red warnings
          else if (level >= 2) severity = 'moderate'; // Orange warnings
          else severity = 'low'; // Yellow warnings
          
          // Get approximate coordinates for German states/regions
          const coords = getGermanRegionCoords(state, regionName);
          if (!coords) continue;
          
          alerts.push({
            id: `germany_dwd_${regionId}_${Date.now()}`,
            lat: coords.lat,
            lng: coords.lng,
            title: `${regionName} Weather Warning`,
            description: description.substring(0, 200),
            severity,
            type: alertType,
            source: 'German Weather Service (DWD)',
            date: warning.start ? new Date(warning.start).toISOString() : new Date().toISOString(),
            location: `${regionName}, ${state}`,
            confidence: 0.97, // Very high confidence - official German government data
            expires: warning.end ? new Date(warning.end).toISOString() : undefined
          });
        }
      }
    }
    
    console.log(`Real German DWD alerts: ${alerts.length}`);
    return alerts;
    
  } catch (error) {
    console.error('German DWD API error:', error);
    return []; // NO FAKE DATA - return empty
  }
}

function getGermanRegionCoords(state: string, region: string): { lat: number; lng: number } | null {
  // German states and major regions coordinates
  const germanLocations: Record<string, { lat: number; lng: number }> = {
    // States (Länder)
    'baden-württemberg': { lat: 48.6616, lng: 9.3501 },
    'bayern': { lat: 48.7904, lng: 11.4979 },
    'bavaria': { lat: 48.7904, lng: 11.4979 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'brandenburg': { lat: 52.4125, lng: 12.5316 },
    'bremen': { lat: 53.0793, lng: 8.8017 },
    'hamburg': { lat: 53.5511, lng: 9.9937 },
    'hessen': { lat: 50.6520, lng: 9.1624 },
    'mecklenburg-vorpommern': { lat: 53.6127, lng: 12.4296 },
    'niedersachsen': { lat: 52.6367, lng: 9.8451 },
    'nordrhein-westfalen': { lat: 51.4332, lng: 7.6616 },
    'rheinland-pfalz': { lat: 49.9129, lng: 7.4530 },
    'saarland': { lat: 49.3964, lng: 6.8432 },
    'sachsen': { lat: 51.1045, lng: 13.2017 },
    'sachsen-anhalt': { lat: 51.9503, lng: 11.6923 },
    'schleswig-holstein': { lat: 54.2194, lng: 9.6961 },
    'thüringen': { lat: 50.9848, lng: 11.0299 },
    
    // Major cities/regions
    'münchen': { lat: 48.1351, lng: 11.5820 },
    'frankfurt': { lat: 50.1109, lng: 8.6821 },
    'köln': { lat: 50.9375, lng: 6.9603 },
    'düsseldorf': { lat: 51.2277, lng: 6.7735 },
    'stuttgart': { lat: 48.7758, lng: 9.1829 },
    'dortmund': { lat: 51.5136, lng: 7.4653 },
    'essen': { lat: 51.4556, lng: 7.0116 },
    'leipzig': { lat: 51.3397, lng: 12.3731 },
    'dresden': { lat: 51.0504, lng: 13.7373 },
    'hannover': { lat: 52.3759, lng: 9.7320 }
  };
  
  const stateKey = state.toLowerCase().replace(/\s+/g, '-');
  const regionKey = region.toLowerCase().replace(/\s+/g, '-');
  
  // Try state first, then region
  return germanLocations[stateKey] || germanLocations[regionKey] || 
         { lat: 51.1657, lng: 10.4515 }; // Center of Germany fallback
}

async function fetchHongKongWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // Hong Kong Observatory Weather Warnings API (free, working)
    console.log('Fetching real Hong Kong Observatory weather alerts...');
    
    const response = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang=en', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.log(`Hong Kong Observatory API not accessible: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const alerts: WeatherAlert[] = [];
    
    if (data && typeof data === 'object') {
      console.log(`Hong Kong Observatory warnings received`);
      
      // Hong Kong API returns current warnings as object properties
      const warningTypes = [
        'WTCSGNL', 'WFIRE', 'WFROST', 'WHOT', 'WCOLD', 'WMSGNL', 'WL', 'WTMW', 
        'WTS', 'WRAIN', 'WFNTSA', 'WF', 'WLANDSLIP', 'TSUNAMI-W', 'TSUNAMI-A'
      ];
      
      for (const warningType of warningTypes) {
        const warning = data[warningType];
        if (warning && warning.code && warning.code !== 'CANCEL') {
          
          // Map HK Observatory warning types
          let type: WeatherAlert['type'] = 'thunderstorm';
          let severity: WeatherAlert['severity'] = 'moderate';
          let title = 'Weather Warning';
          let description = '';
          
          switch (warningType) {
            case 'WTCSGNL': // Tropical Cyclone
              type = 'hurricane';
              severity = getSeverityFromHKSignal(warning.code);
              title = `Tropical Cyclone Signal ${warning.code}`;
              description = `Tropical cyclone warning signal ${warning.code} in effect for Hong Kong`;
              break;
            case 'WFIRE': // Fire Danger
              type = 'wildfire';
              severity = 'high';
              title = 'Fire Danger Warning';
              description = 'Fire danger warning due to dry conditions';
              break;
            case 'WHOT': // Very Hot Weather
              type = 'heatwave';
              severity = 'high';
              title = 'Very Hot Weather Warning';
              description = 'Very hot weather expected with high temperatures';
              break;
            case 'WRAIN': // Heavy Rain
              type = 'flood';
              severity = getSeverityFromHKRain(warning.code);
              title = `Heavy Rain Warning (${warning.code})`;
              description = `Heavy rain warning ${warning.code} - flooding possible`;
              break;
            case 'WTS': // Thunderstorm
              type = 'thunderstorm';
              severity = 'moderate';
              title = 'Thunderstorm Warning';
              description = 'Thunderstorm warning in effect';
              break;
            case 'WLANDSLIP': // Landslip
              type = 'flood';
              severity = 'high';
              title = 'Landslip Warning';
              description = 'Landslip warning due to heavy rain';
              break;
            case 'TSUNAMI-W': // Tsunami
              type = 'hurricane';
              severity = 'extreme';
              title = 'Tsunami Warning';
              description = 'Tsunami warning issued';
              break;
          }
          
          // Hong Kong coordinates
          const hkCoords = { lat: 22.3193, lng: 114.1694 };
          
          alerts.push({
            id: `hk_observatory_${warningType}_${Date.now()}`,
            lat: hkCoords.lat,
            lng: hkCoords.lng,
            title,
            description,
            severity,
            type,
            source: 'Hong Kong Observatory',
            date: warning.issueTime || new Date().toISOString(),
            location: 'Hong Kong',
            confidence: 0.99, // Highest confidence - official HK government data
            expires: warning.expireTime
          });
        }
      }
    }
    
    console.log(`Real Hong Kong Observatory alerts: ${alerts.length}`);
    return alerts;
    
  } catch (error) {
    console.error('Hong Kong Observatory API error:', error);
    return []; // NO FAKE DATA - return empty
  }
}

function getSeverityFromHKSignal(signal: string): WeatherAlert['severity'] {
  // Hong Kong Tropical Cyclone Warning Signals
  const signalNum = parseInt(signal) || 0;
  if (signalNum >= 9) return 'extreme'; // Hurricane force
  if (signalNum >= 8) return 'high'; // Gale force  
  if (signalNum >= 3) return 'moderate'; // Strong wind
  return 'low';
}

function getSeverityFromHKRain(code: string): WeatherAlert['severity'] {
  // Hong Kong Rainstorm Warning Signals
  if (code === 'RED' || code === 'BLACK') return 'extreme';
  if (code === 'AMBER') return 'high';
  return 'moderate';
}

async function fetchEuropeanWeatherAlerts(): Promise<WeatherAlert[]> {
  // Combine UK and German alerts for European coverage
  const alerts: WeatherAlert[] = [];
  
  try {
    console.log('Fetching European weather alerts (UK + Germany)...');
    
    // Get UK Met Office alerts
    const ukAlerts = await fetchUKWeatherAlerts();
    alerts.push(...ukAlerts);
    
    // Get German DWD alerts  
    const germanAlerts = await fetchGermanWeatherAlerts();
    alerts.push(...germanAlerts);
    
    console.log(`Total European alerts: ${alerts.length} (UK: ${ukAlerts.length}, Germany: ${germanAlerts.length})`);
    return alerts;
    
  } catch (error) {
    console.error('European weather alerts error:', error);
    return []; // NO FAKE DATA - return empty
  }
}

// Note: Australian BOM and Japanese JMA APIs either block automation or don't have public endpoints
// Future implementations could add more regional weather services as they become available

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

    // Fetch from working real weather APIs only
    console.log('Fetching NOAA weather alerts...');
    const noaaAlerts = await fetchNOAAWeatherAlerts();
    
    console.log('Fetching European weather alerts...');  
    const europeanAlerts = await fetchEuropeanWeatherAlerts();
    
    console.log('Fetching Hong Kong Observatory alerts...');
    const hongkongAlerts = await fetchHongKongWeatherAlerts();
    
    // Combine all real weather alerts
    let alerts = [...noaaAlerts, ...europeanAlerts, ...hongkongAlerts];
    console.log(`Total alerts: ${noaaAlerts.length} NOAA + ${europeanAlerts.length} EU + ${hongkongAlerts.length} HK = ${alerts.length}`);
    
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
    
    const realSources = [];
    if (noaaAlerts.length > 0) realSources.push('NOAA/NWS (US)');
    if (europeanAlerts.some(a => a.source === 'UK Met Office')) realSources.push('UK Met Office');
    if (europeanAlerts.some(a => a.source === 'German Weather Service (DWD)')) realSources.push('German Weather Service (DWD)');
    if (hongkongAlerts.length > 0) realSources.push('Hong Kong Observatory');
    
    return NextResponse.json({
      alerts: uniqueAlerts,
      lastUpdate: new Date().toISOString(),
      totalAlerts: uniqueAlerts.length,
      sources: realSources,
      coverage: realSources.length > 1 ? 'Multi-national' : (realSources.length === 1 ? realSources[0] : 'Limited'),
      dataQuality: 'real' // All data is real government sources
    });
    
  } catch (error) {
    console.error('Weather alerts API error:', error);
    
    // Ultimate fallback - return empty instead of fake data
    return NextResponse.json({
      alerts: [],
      lastUpdate: new Date().toISOString(),
      totalAlerts: 0,
      sources: [],
      coverage: 'Unavailable',
      dataQuality: 'error',
      error: 'Weather APIs temporarily unavailable'
    });
  }
}