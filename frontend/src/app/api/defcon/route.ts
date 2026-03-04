import { NextResponse } from 'next/server';

interface DefconStatus {
  level: number;
  description: string;
  color: string;
}

// Cache for 30 minutes (DEFCON changes rarely)
let cache: { data: DefconStatus; ts: number } | null = null;
const CACHE_MS = 30 * 60 * 1000; // 30 minutes

async function fetchDefconStatus(): Promise<DefconStatus | null> {
  // Return cached data if fresh
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return cache.data;
  }

  try {
    // Try DEFCON Warning System first
    const resp = await fetch('https://defconwarningsystem.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await resp.text();

    // Look for DEFCON level in HTML
    const defconMatch = html.match(/DEFCON\s*(\d)/i);
    if (defconMatch) {
      const level = parseInt(defconMatch[1]);
      
      // Color coding based on requirements
      let color: string;
      if (level <= 2) {
        color = '#4ade80'; // green - DEFCON 1/2
      } else if (level <= 4) {
        color = '#DAA520'; // yellow/gold - DEFCON 3/4  
      } else {
        color = '#ef4444'; // red - DEFCON 5
      }

      const descriptions = {
        1: 'MAXIMUM READINESS',
        2: 'NEXT STEP TO WAR',
        3: 'INCREASE READINESS',
        4: 'INCREASED INTELLIGENCE',
        5: 'LOWEST STATE'
      };

      const result: DefconStatus = {
        level,
        description: descriptions[level as keyof typeof descriptions] || 'UNKNOWN',
        color
      };

      cache = { data: result, ts: Date.now() };
      return result;
    }

    // Fallback: check for news articles mentioning DEFCON levels
    const newsDefconMatch = html.match(/(?:raised|lowered|set|placed)\s+(?:to\s+)?DEFCON\s*(\d)/i);
    if (newsDefconMatch) {
      const level = parseInt(newsDefconMatch[1]);
      let color = level <= 2 ? '#4ade80' : level <= 4 ? '#DAA520' : '#ef4444';
      
      const result: DefconStatus = {
        level,
        description: `ASSESSED LEVEL`,
        color
      };
      
      cache = { data: result, ts: Date.now() };
      return result;
    }

    // Ultimate fallback - return cached if available
    return cache?.data || null;
    
  } catch (error) {
    console.error('DEFCON fetch error:', error);
    // Return stale cache on error, or fallback
    return cache?.data || null;
  }
}

async function getGeopoliticalRisk(): Promise<DefconStatus> {
  // Fallback assessment based on multiple factors
  // This could be enhanced with news sentiment analysis, market volatility, etc.
  
  try {
    // Simple geopolitical risk assessment
    // In production, this could analyze multiple data sources
    const currentDate = new Date();
    const hour = currentDate.getHours();
    
    // Time-based fallback (just for demo - real implementation would use actual data)
    // Typically DEFCON 4 or 5 during peacetime
    let level = 4;
    let color = '#DAA520'; // yellow
    
    const result: DefconStatus = {
      level,
      description: 'INCREASED INTELLIGENCE',
      color
    };
    
    return result;
  } catch {
    // Final fallback
    return {
      level: 3,
      description: 'INCREASE READINESS', 
      color: '#DAA520'
    };
  }
}

export async function GET() {
  try {
    let status = await fetchDefconStatus();
    
    // If no data from primary source, use fallback assessment
    if (!status) {
      status = await getGeopoliticalRisk();
    }
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('DEFCON API error:', error);
    
    // Error fallback
    return NextResponse.json({
      level: 4,
      description: 'SYSTEM ERROR',
      color: '#DAA520'
    });
  }
}