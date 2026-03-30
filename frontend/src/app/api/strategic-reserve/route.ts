import { NextResponse } from 'next/server';

interface StrategicReserveData {
  date: string;
  value: number;
  unit: string;
  title: string;
  change: number;
  changePercent: number;
}

interface StrategicReserveResponse {
  data: StrategicReserveData[];
  news: any[];
  lastUpdated: string;
}

interface EIAResponse {
  request: {
    series_id: string;
  };
  series: Array<{
    series_id: string;
    name: string;
    units: string;
    f: string;
    updated: string;
    data: Array<[string, number | null]>;
  }>;
}

// Cache for 24 hours (EIA data updates daily)
let cache: { data: StrategicReserveResponse[]; ts: number } | null = null;
const CACHE_MS = 24 * 60 * 60 * 1000;

async function fetchEIAStrategicReserveData(): Promise<StrategicReserveData[]> {
  try {
    console.log('🔄 Fetching Strategic Petroleum Reserve data from EIA.gov...');
    
    // EIA API key is required
    const apiKey = process.env.EIA_API_KEY;
    
    if (!apiKey || apiKey === 'your_eia_key_here') {
      console.log('❌ No EIA API key configured');
      return [];
    }
    
    // EIA Series IDs for Strategic Petroleum Reserve
    const seriesIds = [
      'STEO.STKSPRUS.A',     // SPR Stocks US (Annual)
      'PET.WCSSTUS1.W',      // Weekly Cushing OK Crude Oil Stocks
      'PET.WCRSSTUS1.W',     // Weekly US Commercial Crude Oil Stocks
      'PET.WTTSTUS1.W'       // Weekly Total Motor Gasoline Stocks
    ];
    
    const reserveData: StrategicReserveData[] = [];
    
    for (const seriesId of seriesIds) {
      try {
        const url = `https://api.eia.gov/v2/seriesid/${seriesId}?api_key=${apiKey}`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          console.log(`❌ EIA API failed for ${seriesId}: HTTP ${response.status}`);
          continue;
        }
        
        const data: EIAResponse = await response.json();
        
        if (data.series && data.series.length > 0) {
          const series = data.series[0];
          const seriesData = series.data;
          
          if (seriesData && seriesData.length >= 2) {
            // Get latest two data points to calculate change
            const latest = seriesData[0];
            const previous = seriesData[1];
            
            if (latest[1] !== null && previous[1] !== null) {
              const currentValue = latest[1];
              const previousValue = previous[1];
              const change = currentValue - previousValue;
              const changePercent = (change / previousValue) * 100;
              
              reserveData.push({
                date: latest[0],
                value: currentValue,
                unit: series.units,
                title: series.name,
                change: parseFloat(change.toFixed(2)),
                changePercent: parseFloat(changePercent.toFixed(2))
              });
              
              console.log(`✅ EIA ${seriesId}: ${currentValue} ${series.units}`);
            }
          }
        }
        
        // Rate limiting - wait between EIA requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Failed to fetch EIA series ${seriesId}:`, error);
      }
    }
    
    console.log(`🎯 EIA Strategic Reserve: ${reserveData.length} data points retrieved`);
    return reserveData;
    
  } catch (error) {
    console.error('❌ EIA Strategic Reserve fetch error:', error);
    return [];
  }
}

// Fetch petroleum reserve news from EIA RSS feeds
async function fetchEIAReserveNews(): Promise<any[]> {
  try {
    console.log('🔄 Fetching EIA petroleum reserve news...');
    
    const response = await fetch('https://www.eia.gov/rss/press_releases.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ EIA RSS failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: any[] = [];
    
    for (const item of items.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        
        // Only include articles related to strategic reserves or petroleum stocks
        if (title.toLowerCase().includes('petroleum') || 
            title.toLowerCase().includes('crude') ||
            title.toLowerCase().includes('strategic') ||
            title.toLowerCase().includes('reserve') ||
            title.toLowerCase().includes('stock')) {
          
          articles.push({
            title: title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'EIA.gov',
            summary: description.slice(0, 200)
          });
        }
      }
    }
    
    console.log(`✅ EIA Reserve News: Found ${articles.length} relevant articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ EIA Reserve News fetch error:', error);
    return [];
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    console.log('🏛️ STRATEGIC RESERVE: Fetching REAL data from EIA.gov only');
    
    // Fetch both reserve data and related news
    const [reserveData, reserveNews] = await Promise.all([
      fetchEIAStrategicReserveData(),
      fetchEIAReserveNews()
    ]);
    
    console.log(`🎯 STRATEGIC RESERVE: ${reserveData.length} data points + ${reserveNews.length} news articles`);
    
    if (reserveData.length === 0 && reserveNews.length === 0) {
      console.log('🚫 NO REAL STRATEGIC RESERVE DATA AVAILABLE - returning empty array');
      return NextResponse.json([]);
    }
    
    // Combine data and news
    const combinedData: StrategicReserveResponse = {
      data: reserveData,
      news: reserveNews,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache ONLY the real results
    cache = { data: [combinedData], ts: Date.now() };
    
    return NextResponse.json([combinedData]);
    
  } catch (error) {
    console.error('Strategic Reserve API error:', error);
    
    // NO FALLBACK TO MOCK DATA - return empty array
    console.log('💔 EIA API FAILED - returning empty array (NO MOCK DATA)');
    return NextResponse.json([]);
  }
}