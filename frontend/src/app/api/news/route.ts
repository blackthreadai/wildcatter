import { NextResponse } from 'next/server';

interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
}

// Mock news data - in production, this would fetch from a real news API
const mockOilGasNews: NewsArticle[] = [
  {
    title: "Crude Oil Prices Surge as OPEC+ Announces Production Cuts",
    url: "https://example.com/news/1",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    source: "Reuters"
  },
  {
    title: "Natural Gas Demand Spikes Amid Cold Weather Forecast",
    url: "https://example.com/news/2",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    source: "Bloomberg Energy"
  },
  {
    title: "Major Oil Discovery in Gulf of Mexico Boosts Energy Stocks",
    url: "https://example.com/news/3",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    source: "Wall Street Journal"
  },
  {
    title: "Pipeline Project Gets Federal Approval After Years of Delays",
    url: "https://example.com/news/4",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    source: "Energy Intelligence"
  },
  {
    title: "Shale Oil Production Reaches New Monthly Record",
    url: "https://example.com/news/5",
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
    source: "Oil & Gas Journal"
  },
  {
    title: "Renewable Energy Investment Challenges Traditional Oil Giants",
    url: "https://example.com/news/6",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    source: "Financial Times"
  }
];

// Cache for 5 minutes
let cache: { data: NewsArticle[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    // Return cache if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // In production, you would fetch from a real news API here
    // For example: Google News API, NewsAPI, or RSS feeds
    // const response = await fetch('https://newsapi.org/v2/everything?q=oil+gas&apiKey=YOUR_KEY');
    // const data = await response.json();
    
    // For now, return mock data with some randomization
    const shuffled = [...mockOilGasNews].sort(() => Math.random() - 0.5);
    const selectedNews = shuffled.slice(0, 6);
    
    // Update cache
    cache = { data: selectedNews, ts: Date.now() };
    
    return NextResponse.json(selectedNews);
  } catch (error) {
    console.error('News API error:', error);
    
    // Return fallback mock data
    return NextResponse.json(mockOilGasNews.slice(0, 4));
  }
}