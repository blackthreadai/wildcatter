import { NextResponse } from 'next/server';

interface PredictionMarket {
  id: string;
  question: string;
  probability: number;
  volume: string;
  lastUpdated: string;
  url: string;
  category: string;
  endDate: string;
}

// Cache for prediction markets data (15 minutes)
let cache: { data: PredictionMarket[]; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

// Filter for energy and geopolitical markets only
function isEnergyGeopoliticalMarket(question: string): boolean {
  const q = question.toLowerCase();
  
  // Core energy keywords - direct energy market relevance
  const energyTerms = [
    'oil', 'gas', 'energy', 'crude', 'brent', 'wti', 'opec', 'gasoline',
    'petroleum', 'fuel', 'pipeline', 'refinery'
  ];
  
  // Key geopolitical events that move energy markets
  const geopoliticalTerms = [
    'iran', 'russia', 'ukraine', 'china', 'war', 'strike', 'strikes',
    'israel', 'saudi', 'venezuela', 'iraq', 'sanctions', 'invasion',
    'conflict', 'embargo', 'middle east', 'persian gulf'
  ];
  
  // Check if question contains any relevant terms
  const allTerms = [...energyTerms, ...geopoliticalTerms];
  const hasMatch = allTerms.some(term => q.includes(term));
  
  console.log(`🔍 Checking: "${question}" → ${hasMatch}`);
  return hasMatch;
}

async function fetchRealPredictionMarkets(): Promise<PredictionMarket[]> {
  try {
    console.log('🔮 Fetching real Polymarket data...');
    
    // Fetch more markets to filter for energy/geopolitical relevance
    const response = await fetch(
      'https://gamma-api.polymarket.com/events?limit=50&order=volume&ascending=false', 
      {
        headers: {
          'User-Agent': 'Wildcatter-Terminal/1.0'
        },
        // 15 second timeout
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }
    
    const events = await response.json();
    
    if (!Array.isArray(events) || events.length === 0) {
      console.log('📭 No Polymarket events found');
      return [];
    }
    
    const markets: PredictionMarket[] = [];
    
    // Filter for energy/geopolitical markets only
    const relevantEvents = events.filter(event => {
      if (!event.markets || !event.markets[0]) return false;
      const question = event.markets[0].question || '';
      return isEnergyGeopoliticalMarket(question);
    });
    
    console.log(`🔍 Found ${relevantEvents.length} energy/geopolitical markets out of ${events.length} total`);
    
    // Process up to 3 top relevant markets for the widget
    for (const event of relevantEvents.slice(0, 3)) {
      if (!event.markets || !event.markets[0]) continue;
      
      const market = event.markets[0];
      
      // Parse outcome prices to get probability
      let probability = 50; // default
      try {
        const prices = JSON.parse(market.outcomePrices || '[0.5, 0.5]');
        if (Array.isArray(prices) && prices.length >= 2) {
          // Convert first outcome price to percentage (0-1 range to 0-100)
          probability = Math.round(parseFloat(prices[0]) * 100);
          // Clamp to reasonable range
          probability = Math.max(1, Math.min(99, probability));
        }
      } catch (e) {
        console.log('⚠️ Could not parse outcome prices for market:', market.slug);
      }
      
      // Format volume
      const volumeNum = parseFloat(market.volume || '0');
      let volumeFormatted = '$0';
      if (volumeNum >= 1000000) {
        volumeFormatted = `$${(volumeNum / 1000000).toFixed(1)}M`;
      } else if (volumeNum >= 1000) {
        volumeFormatted = `$${Math.round(volumeNum / 1000)}K`;
      } else {
        volumeFormatted = `$${Math.round(volumeNum)}`;
      }
      
      // Determine category from question content (energy/geopolitical focus)
      let category = 'Geopolitical';
      const question = market.question?.toLowerCase() || '';
      if (question.includes('oil') || question.includes('gas') || question.includes('energy') || 
          question.includes('crude') || question.includes('pipeline') || question.includes('opec')) {
        category = 'Energy';
      } else if (question.includes('war') || question.includes('strike') || question.includes('invasion') || 
                 question.includes('sanctions') || question.includes('conflict')) {
        category = 'Geopolitical';
      } else if (question.includes('fed') || question.includes('rate') || question.includes('recession') ||
                 question.includes('inflation') || question.includes('dollar')) {
        category = 'Economic';
      } else if (question.includes('iran') || question.includes('russia') || question.includes('ukraine') ||
                 question.includes('china') || question.includes('israel') || question.includes('saudi')) {
        category = 'Geopolitical';
      }
      
      markets.push({
        id: `poly-${market.slug}`,
        question: market.question || 'Unknown Market',
        probability,
        volume: volumeFormatted,
        lastUpdated: new Date().toISOString(),
        url: `https://polymarket.com/event/${market.slug}`,
        category,
        endDate: market.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      console.log(`✅ Processed Polymarket: ${market.question?.substring(0, 50)}... (${probability}%, ${volumeFormatted})`);
    }
    
    console.log(`🎯 Retrieved ${markets.length} real Polymarket predictions`);
    return markets;
    
  } catch (error) {
    console.error('❌ Polymarket API error:', error);
    return [];
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Fetch real prediction market data
    const markets = await fetchRealPredictionMarkets();
    
    // Cache the results (even if empty)
    cache = { data: markets, ts: Date.now() };
    
    return NextResponse.json(markets);
    
  } catch (error) {
    console.error('Prediction markets API error:', error);
    // Return empty array - no fallback data per no-mock-data policy
    return NextResponse.json([]);
  }
}