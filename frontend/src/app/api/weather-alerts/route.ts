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

// Global weather alert sources
async function fetchGlobalWeatherAlerts(): Promise<WeatherAlert[]> {
  const allAlerts: WeatherAlert[] = [];
  
  // 1. NOAA (United States)
  const noaaAlerts = await fetchNOAAWeatherAlerts();
  allAlerts.push(...noaaAlerts);
  
  // 2. Environment Canada (Canada)
  const canadaAlerts = await fetchCanadaWeatherAlerts();
  allAlerts.push(...canadaAlerts);
  
  // 3. European weather alerts (EU)
  const europeAlerts = await fetchEuropeanWeatherAlerts();
  allAlerts.push(...europeAlerts);
  
  // 4. Australian Bureau of Meteorology
  const australiaAlerts = await fetchAustralianWeatherAlerts();
  allAlerts.push(...australiaAlerts);
  
  // 5. Japan Meteorological Agency (typhoons)
  const japanAlerts = await fetchJapanWeatherAlerts();
  allAlerts.push(...japanAlerts);
  
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

// International weather data sources beyond NOAA
async function fetchInternationalWeatherAlerts(): Promise<WeatherAlert[]> {
  const internationalAlerts: WeatherAlert[] = [];
  
  try {
    // Canada - Environment and Climate Change Canada
    console.log('Fetching Canadian weather alerts...');
    const canadaAlerts = await fetchCanadaWeatherAlerts();
    internationalAlerts.push(...canadaAlerts);
    
    // Europe - Combined European weather services
    console.log('Fetching European weather alerts...');
    const europeAlerts = await fetchEuropeanWeatherAlerts();
    internationalAlerts.push(...europeAlerts);
    
    // Australia - Bureau of Meteorology
    console.log('Fetching Australian weather alerts...');
    const australiaAlerts = await fetchAustralianWeatherAlerts();
    internationalAlerts.push(...australiaAlerts);
    
    // Japan - Meteorological Agency (typhoons)
    console.log('Fetching Japanese weather alerts...');
    const japanAlerts = await fetchJapanWeatherAlerts();
    internationalAlerts.push(...japanAlerts);
    
    console.log(`Total international alerts: ${internationalAlerts.length}`);
    return internationalAlerts;
    
  } catch (error) {
    console.error('International weather alerts fetch error:', error);
    return [];
  }
}

async function fetchCanadaWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // Environment and Climate Change Canada Weather Alerts API (free)
    console.log('Fetching real Canadian weather alerts...');
    
    const response = await fetch('https://api.weather.gc.ca/collections/weather-warnings/items?f=json&limit=50', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.log(`Environment Canada API not accessible: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const alerts: WeatherAlert[] = [];
    
    if (data?.features && Array.isArray(data.features)) {
      for (const feature of data.features.slice(0, 15)) {
        const props = feature.properties;
        const geometry = feature.geometry;
        
        if (!props || !props.headline || !geometry?.coordinates) continue;
        
        let lat = 0, lng = 0;
        if (geometry.type === 'Point') {
          lng = geometry.coordinates[0];
          lat = geometry.coordinates[1];
        } else if (geometry.type === 'Polygon' && geometry.coordinates[0]) {
          // Calculate centroid
          const coords = geometry.coordinates[0];
          lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
          lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
        }
        
        if (!lat || !lng) continue;
        
        // Parse event type and severity from Environment Canada data
        const eventText = (props.event_type || props.headline || '').toLowerCase();
        let type: WeatherAlert['type'] = 'thunderstorm';
        let severity: WeatherAlert['severity'] = 'moderate';
        
        // Map Environment Canada event types
        if (eventText.includes('blizzard') || eventText.includes('snow')) type = 'blizzard';
        else if (eventText.includes('flood')) type = 'flood';
        else if (eventText.includes('fire')) type = 'wildfire';
        else if (eventText.includes('heat')) type = 'heatwave';
        else if (eventText.includes('tornado')) type = 'tornado';
        else if (eventText.includes('hurricane')) type = 'hurricane';
        
        // Map severity
        if ((props.severity || '').toLowerCase().includes('extreme')) severity = 'extreme';
        else if ((props.severity || '').toLowerCase().includes('major')) severity = 'high';
        else if ((props.urgency || '').toLowerCase().includes('immediate')) severity = 'high';
        
        alerts.push({
          id: `canada_real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          lat,
          lng,
          title: props.headline || 'Weather Alert',
          description: (props.description || props.headline || '').substring(0, 200),
          severity,
          type,
          source: 'Environment Canada',
          date: props.effective_datetime || new Date().toISOString(),
          location: props.area_name || 'Canada',
          confidence: 0.95, // High confidence - real government data
          expires: props.expires_datetime
        });
      }
    }
    
    console.log(`Real Environment Canada alerts: ${alerts.length}`);
    return alerts;
    
  } catch (error) {
    console.error('Environment Canada API error:', error);
    return []; // NO FAKE DATA - return empty
  }
}

async function fetchEuropeanWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // Try MeteoAlarm EU API for real European weather warnings (free)
    console.log('Fetching real European weather alerts...');
    
    // MeteoAlarm provides real European weather warnings
    const response = await fetch('https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-europe', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/atom+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.log(`MeteoAlarm API not accessible: ${response.status}`);
      return []; // NO FAKE DATA - return empty
    }
    
    const xmlText = await response.text();
    const alerts: WeatherAlert[] = [];
    
    // Parse MeteoAlarm ATOM/XML feed
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    const entries = [...xmlText.matchAll(entryRegex)];
    
    console.log(`Found ${entries.length} MeteoAlarm entries`);
    
    for (const match of entries.slice(0, 20)) {
      const entryXml = match[1];
      
      // Extract data from ATOM entry
      const titleMatch = entryXml.match(/<title[^>]*>(.*?)<\/title>/i);
      const summaryMatch = entryXml.match(/<summary[^>]*>(.*?)<\/summary>/i);
      const updatedMatch = entryXml.match(/<updated>(.*?)<\/updated>/i);
      const countryMatch = entryXml.match(/geocode.*?country[^>]*>([^<]+)</i);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() : '';
      const summary = summaryMatch ? summaryMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() : '';
      const country = countryMatch ? countryMatch[1].trim() : '';
      
      if (!title || !country) continue;
      
      // Simple geocoding for European countries
      const location = getEuropeanCountryCoords(country);
      if (!location) continue;
      
      // Parse weather alert type and severity
      const alertText = (title + ' ' + summary).toLowerCase();
      let type: WeatherAlert['type'] = 'thunderstorm';
      let severity: WeatherAlert['severity'] = 'moderate';
      
      if (alertText.includes('flood')) type = 'flood';
      else if (alertText.includes('fire') || alertText.includes('wildfire')) type = 'wildfire';
      else if (alertText.includes('heat') || alertText.includes('temperature')) type = 'heatwave';
      else if (alertText.includes('snow') || alertText.includes('blizzard')) type = 'blizzard';
      else if (alertText.includes('hurricane') || alertText.includes('typhoon')) type = 'hurricane';
      else if (alertText.includes('tornado')) type = 'tornado';
      else if (alertText.includes('drought')) type = 'drought';
      
      // Determine severity from MeteoAlarm color codes or keywords
      if (alertText.includes('red') || alertText.includes('extreme') || alertText.includes('dangerous')) {
        severity = 'extreme';
      } else if (alertText.includes('orange') || alertText.includes('severe')) {
        severity = 'high';
      }
      
      alerts.push({
        id: `meteoalarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lat: location.lat,
        lng: location.lng,
        title: title.substring(0, 80),
        description: summary.substring(0, 200),
        severity,
        type,
        source: 'MeteoAlarm EU',
        date: updatedMatch ? updatedMatch[1] : new Date().toISOString(),
        location: country,
        confidence: 0.92 // High confidence - real EU government data
      });
    }
    
    console.log(`Real MeteoAlarm alerts: ${alerts.length}`);
    return alerts;
    
  } catch (error) {
    console.error('MeteoAlarm EU API error:', error);
    return []; // NO FAKE DATA - return empty
  }
}

function getEuropeanCountryCoords(country: string): { lat: number; lng: number } | null {
  const coords: Record<string, { lat: number; lng: number }> = {
    'germany': { lat: 52.5200, lng: 13.4050 },
    'france': { lat: 46.6034, lng: 1.8883 },
    'italy': { lat: 41.8719, lng: 12.5674 },
    'spain': { lat: 40.4637, lng: -3.7492 },
    'poland': { lat: 51.9194, lng: 19.1451 },
    'netherlands': { lat: 52.1326, lng: 5.2913 },
    'belgium': { lat: 50.5039, lng: 4.4699 },
    'austria': { lat: 47.5162, lng: 14.5501 },
    'switzerland': { lat: 46.8182, lng: 8.2275 },
    'czech republic': { lat: 49.8175, lng: 15.4730 },
    'slovakia': { lat: 48.6690, lng: 19.6990 },
    'hungary': { lat: 47.1625, lng: 19.5033 },
    'romania': { lat: 45.9432, lng: 24.9668 },
    'bulgaria': { lat: 42.7339, lng: 25.4858 },
    'greece': { lat: 39.0742, lng: 21.8243 },
    'portugal': { lat: 39.3999, lng: -8.2245 },
    'norway': { lat: 60.4720, lng: 8.4689 },
    'sweden': { lat: 60.1282, lng: 18.6435 },
    'finland': { lat: 61.9241, lng: 25.7482 },
    'denmark': { lat: 56.2639, lng: 9.5018 },
    'uk': { lat: 55.3781, lng: -3.4360 },
    'united kingdom': { lat: 55.3781, lng: -3.4360 },
    'ireland': { lat: 53.1424, lng: -7.6921 }
  };
  
  const countryKey = country.toLowerCase();
  return coords[countryKey] || null;
}

async function fetchAustralianWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // Australian Bureau of Meteorology RSS feeds for weather warnings (free)
    console.log('Fetching real Australian weather alerts...');
    
    const bomFeeds = [
      'https://www.bom.gov.au/rss/weatherWarnings_NSW.rss', // NSW
      'https://www.bom.gov.au/rss/weatherWarnings_VIC.rss', // Victoria  
      'https://www.bom.gov.au/rss/weatherWarnings_QLD.rss', // Queensland
      'https://www.bom.gov.au/rss/weatherWarnings_WA.rss',  // Western Australia
      'https://www.bom.gov.au/rss/weatherWarnings_SA.rss'   // South Australia
    ];
    
    const alerts: WeatherAlert[] = [];
    
    for (const feedUrl of bomFeeds) {
      try {
        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          console.log(`BOM feed ${feedUrl} not accessible: ${response.status}`);
          continue;
        }
        
        const xmlText = await response.text();
        
        // Parse BOM RSS feed
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        const items = [...xmlText.matchAll(itemRegex)];
        
        for (const match of items.slice(0, 5)) { // Max 5 per state
          const itemXml = match[1];
          
          const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
          const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i);
          const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
          
          const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
          const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';
          
          if (!title) continue;
          
          // Extract location from BOM title format
          const location = extractAustralianLocation(title);
          if (!location) continue;
          
          // Parse BOM alert type and severity
          const alertText = (title + ' ' + description).toLowerCase();
          let type: WeatherAlert['type'] = 'thunderstorm';
          let severity: WeatherAlert['severity'] = 'moderate';
          
          if (alertText.includes('fire') || alertText.includes('bushfire')) {
            type = 'wildfire';
            severity = 'extreme';
          } else if (alertText.includes('flood') || alertText.includes('flash flood')) {
            type = 'flood';
            severity = 'high';
          } else if (alertText.includes('cyclone') || alertText.includes('hurricane')) {
            type = 'hurricane';
            severity = 'extreme';
          } else if (alertText.includes('severe thunderstorm')) {
            type = 'thunderstorm';
            severity = 'high';
          } else if (alertText.includes('heat') || alertText.includes('temperature')) {
            type = 'heatwave';
            severity = 'high';
          }
          
          alerts.push({
            id: `bom_real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            lat: location.lat,
            lng: location.lng,
            title: title.substring(0, 80),
            description: description.substring(0, 200),
            severity,
            type,
            source: 'Australian Bureau of Meteorology',
            date: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
            location: location.name,
            confidence: 0.95 // High confidence - real government data
          });
        }
        
      } catch (feedError) {
        console.error(`Error fetching BOM feed ${feedUrl}:`, feedError);
        continue;
      }
    }
    
    console.log(`Real Australian BOM alerts: ${alerts.length}`);
    return alerts;
    
  } catch (error) {
    console.error('Australian BOM API error:', error);
    return []; // NO FAKE DATA - return empty
  }
}

function extractAustralianLocation(title: string): { lat: number; lng: number; name: string } | null {
  // BOM titles usually include location - extract major Australian cities/regions
  const locations: Record<string, { lat: number; lng: number }> = {
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'melbourne': { lat: -37.8136, lng: 144.9631 },
    'brisbane': { lat: -27.4698, lng: 153.0251 },
    'perth': { lat: -31.9505, lng: 115.8605 },
    'adelaide': { lat: -34.9285, lng: 138.6007 },
    'darwin': { lat: -12.4634, lng: 130.8456 },
    'hobart': { lat: -42.8821, lng: 147.3272 },
    'canberra': { lat: -35.2809, lng: 149.1300 },
    'gold coast': { lat: -28.0167, lng: 153.4000 },
    'newcastle': { lat: -32.9283, lng: 151.7817 },
    'cairns': { lat: -16.9186, lng: 145.7781 },
    'townsville': { lat: -19.2590, lng: 146.8169 },
    'geelong': { lat: -38.1499, lng: 144.3617 },
    'nsw': { lat: -31.2532, lng: 146.9211 }, // NSW center
    'victoria': { lat: -37.4713, lng: 144.7852 }, // VIC center  
    'queensland': { lat: -20.7256, lng: 142.4692 }, // QLD center
    'western australia': { lat: -25.2744, lng: 122.2676 }, // WA center
    'south australia': { lat: -30.0002, lng: 136.2092 } // SA center
  };
  
  const titleLower = title.toLowerCase();
  for (const [locationName, coords] of Object.entries(locations)) {
    if (titleLower.includes(locationName)) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        name: locationName.charAt(0).toUpperCase() + locationName.slice(1)
      };
    }
  }
  
  return null;
}

async function fetchJapanWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // Japan Meteorological Agency (JMA) provides weather data (trying available endpoints)
    console.log('Fetching real Japanese weather alerts...');
    
    // Try JMA RSS feeds for typhoons and weather warnings
    const jmaFeeds = [
      'https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json', // Tokyo
      'https://www.jma.go.jp/bosai/forecast/data/forecast/270000.json', // Osaka
      'https://www.jma.go.jp/bosai/forecast/data/forecast/470000.json'  // Okinawa
    ];
    
    const alerts: WeatherAlert[] = [];
    
    // Try alternative: JMA English RSS for typhoons
    try {
      const typhoonResponse = await fetch('https://www.jma.go.jp/bosai/forecast/data/typhoon/typhoon.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (typhoonResponse.ok) {
        const typhoonData = await typhoonResponse.json();
        console.log(`JMA typhoon data received`);
        
        // Parse JMA typhoon data (if available)
        if (typhoonData && typeof typhoonData === 'object') {
          // JMA typhoon data structure varies - this is a best-effort parsing
          const typhoonKeys = Object.keys(typhoonData);
          
          for (const key of typhoonKeys.slice(0, 3)) {
            const typhoon = typhoonData[key];
            if (typhoon && typhoon.forecast) {
              const forecast = Array.isArray(typhoon.forecast) ? typhoon.forecast[0] : typhoon.forecast;
              
              if (forecast && forecast.lat && forecast.lng) {
                alerts.push({
                  id: `jma_typhoon_${key}`,
                  lat: parseFloat(forecast.lat),
                  lng: parseFloat(forecast.lng),
                  title: `Typhoon ${typhoon.name || key}`,
                  description: `Active typhoon tracking - ${typhoon.classification || 'Tropical Storm'}`,
                  severity: 'extreme' as const,
                  type: 'typhoon' as const,
                  source: 'Japan Meteorological Agency',
                  date: new Date().toISOString(),
                  location: 'Pacific Ocean',
                  confidence: 0.95 // High confidence - real JMA data
                });
              }
            }
          }
        }
      }
    } catch (typhoonError) {
      console.log('JMA typhoon data not available:', typhoonError);
    }
    
    // Try simpler JMA weather warnings RSS (if available)
    try {
      const warningsResponse = await fetch('https://www.jma.go.jp/bosai/forecast/data/weather/130000.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (warningsResponse.ok) {
        const warningsData = await warningsResponse.json();
        console.log('JMA weather warnings received');
        
        // Parse JMA weather warnings (structure may vary)
        if (warningsData && Array.isArray(warningsData)) {
          for (const warning of warningsData.slice(0, 5)) {
            if (warning.text && warning.area) {
              // Map Japanese prefecture to coordinates
              const location = getJapaneseLocationCoords(warning.area);
              if (location) {
                alerts.push({
                  id: `jma_warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  lat: location.lat,
                  lng: location.lng,
                  title: `Weather Warning - ${warning.area}`,
                  description: warning.text.substring(0, 200),
                  severity: 'moderate' as const,
                  type: 'thunderstorm' as const,
                  source: 'Japan Meteorological Agency',
                  date: new Date().toISOString(),
                  location: warning.area,
                  confidence: 0.90 // High confidence - real JMA data
                });
              }
            }
          }
        }
      }
    } catch (warningsError) {
      console.log('JMA weather warnings not available:', warningsError);
    }
    
    console.log(`Real JMA alerts: ${alerts.length}`);
    return alerts;
    
  } catch (error) {
    console.error('Japan Meteorological Agency API error:', error);
    return []; // NO FAKE DATA - return empty
  }
}

function getJapaneseLocationCoords(prefecture: string): { lat: number; lng: number } | null {
  // Major Japanese locations for weather alerts
  const locations: Record<string, { lat: number; lng: number }> = {
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'osaka': { lat: 34.6937, lng: 135.5023 },
    'kyoto': { lat: 35.0116, lng: 135.7681 },
    'yokohama': { lat: 35.4437, lng: 139.6380 },
    'nagoya': { lat: 35.1815, lng: 136.9066 },
    'sapporo': { lat: 43.0642, lng: 141.3469 },
    'fukuoka': { lat: 33.5904, lng: 130.4017 },
    'sendai': { lat: 38.2682, lng: 140.8694 },
    'hiroshima': { lat: 34.3853, lng: 132.4553 },
    'okinawa': { lat: 26.2124, lng: 127.6792 },
    'naha': { lat: 26.2124, lng: 127.6792 },
    'honshu': { lat: 36.2048, lng: 138.2529 },
    'hokkaido': { lat: 43.2203, lng: 142.8635 },
    'kyushu': { lat: 31.7717, lng: 130.6794 },
    'shikoku': { lat: 33.7838, lng: 133.6589 }
  };
  
  const prefLower = prefecture.toLowerCase();
  for (const [name, coords] of Object.entries(locations)) {
    if (prefLower.includes(name)) {
      return coords;
    }
  }
  
  return null;
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

    // Fetch from NOAA (US) and international sources
    console.log('Fetching NOAA weather alerts...');
    const noaaAlerts = await fetchNOAAWeatherAlerts();
    
    console.log('Fetching international weather alerts...');
    const internationalAlerts = await fetchInternationalWeatherAlerts();
    
    // Combine all real weather alerts
    let alerts = [...noaaAlerts, ...internationalAlerts];
    console.log(`Total alerts: ${noaaAlerts.length} NOAA + ${internationalAlerts.length} international = ${alerts.length}`);
    
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
    if (internationalAlerts.some(a => a.source === 'Environment Canada')) realSources.push('Environment Canada');
    if (internationalAlerts.some(a => a.source === 'MeteoAlarm EU')) realSources.push('MeteoAlarm EU');
    if (internationalAlerts.some(a => a.source === 'Australian Bureau of Meteorology')) realSources.push('Australian Bureau of Meteorology');
    if (internationalAlerts.some(a => a.source === 'Japan Meteorological Agency')) realSources.push('Japan Meteorological Agency');
    
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