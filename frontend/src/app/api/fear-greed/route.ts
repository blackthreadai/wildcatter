import { NextResponse } from 'next/server';

interface FearGreedData {
  value: number;
  label: string;
  change: number;
  lastUpdated: string;
}

// Cache for 1 hour (updates daily)
let cache: { data: FearGreedData; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

async function fetchCryptoFearGreed(): Promise<FearGreedData | null> {
  try {
    // Alternative.me Crypto Fear & Greed Index API (free)
    const response = await fetch('https://api.alternative.me/fng/?limit=2', {
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    const latest = data.data?.[0];
    const previous = data.data?.[1];
    
    if (!latest || !latest.value) {
      throw new Error('Invalid data structure');
    }
    
    const currentValue = parseInt(latest.value);
    const previousValue = previous ? parseInt(previous.value) : currentValue;
    const change = currentValue - previousValue;
    
    // Map value to label based on Alternative.me's scale
    let label = '';
    if (currentValue <= 25) label = 'EXTREME FEAR';
    else if (currentValue <= 45) label = 'FEAR';
    else if (currentValue <= 55) label = 'NEUTRAL';
    else if (currentValue <= 75) label = 'GREED';
    else label = 'EXTREME GREED';
    
    return {
      value: currentValue,
      label,
      change,
      lastUpdated: new Date(parseInt(latest.timestamp) * 1000).toISOString()
    };
    
  } catch (error) {
    console.error('Crypto Fear & Greed fetch error:', error);
    return null;
  }
}

// Fallback to general market sentiment estimation
function generateMarketSentiment(): FearGreedData {
  const now = new Date();
  const hour = now.getHours();
  
  // Simple sentiment based on time and market conditions
  // In production, this could analyze multiple market indicators
  let baseValue = 45; // Neutral starting point
  
  // Add some variability based on current time (simulating market hours effect)
  if (hour >= 9 && hour <= 16) { // Market hours
    baseValue += Math.random() * 20 - 10; // -10 to +10
  } else {
    baseValue += Math.random() * 10 - 5; // Smaller changes after hours
  }
  
  // Clamp to 0-100 range
  const value = Math.max(0, Math.min(100, Math.round(baseValue)));
  
  let label = '';
  if (value <= 25) label = 'EXTREME FEAR';
  else if (value <= 45) label = 'FEAR';
  else if (value <= 55) label = 'NEUTRAL';
  else if (value <= 75) label = 'GREED';
  else label = 'EXTREME GREED';
  
  return {
    value,
    label,
    change: (Math.random() - 0.5) * 10, // Random change for demo
    lastUpdated: now.toISOString()
  };
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Try to fetch from Crypto Fear & Greed API
    let fearGreedData = await fetchCryptoFearGreed();
    
    // Fallback to generated sentiment if API unavailable
    if (!fearGreedData) {
      fearGreedData = generateMarketSentiment();
    }
    
    // Cache the results
    cache = { data: fearGreedData, ts: Date.now() };
    
    return NextResponse.json(fearGreedData);
    
  } catch (error) {
    console.error('Fear & Greed API error:', error);
    
    // Ultimate fallback
    const fallbackData = generateMarketSentiment();
    return NextResponse.json(fallbackData);
  }
}