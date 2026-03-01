import { NextResponse } from 'next/server';

interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
}

// Mock news data by region - in production, this would fetch from a real news API
const mockNewsByRegion = {
  'US': [
    {
      title: "Crude Oil Prices Surge as OPEC+ Announces Production Cuts",
      url: "https://example.com/news/1",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      source: "Reuters"
    },
    {
      title: "Natural Gas Demand Spikes Amid Cold Weather Forecast",
      url: "https://example.com/news/2",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      source: "Bloomberg Energy"
    },
    {
      title: "Major Oil Discovery in Gulf of Mexico Boosts Energy Stocks",
      url: "https://example.com/news/3",
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      source: "Wall Street Journal"
    },
    {
      title: "Pipeline Project Gets Federal Approval After Years of Delays",
      url: "https://example.com/news/4",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      source: "Energy Intelligence"
    }
  ],
  'RUSSIAN': [
    {
      title: "Gazprom Expands Arctic Gas Development Projects",
      url: "https://example.com/news/ru1",
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      source: "Moscow Times"
    },
    {
      title: "Lukoil Reports Record Quarterly Profits from Oil Exports",
      url: "https://example.com/news/ru2",
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      source: "RT Energy"
    },
    {
      title: "Rosneft Signs Major Energy Deal with Asian Partners",
      url: "https://example.com/news/ru3",
      publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      source: "Interfax Energy"
    },
    {
      title: "Russia Increases Oil Production Despite Sanctions",
      url: "https://example.com/news/ru4",
      publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      source: "Energy East"
    }
  ],
  'SOUTH AMERICAN': [
    {
      title: "Brazil's Petrobras Discovers New Offshore Oil Reserves",
      url: "https://example.com/news/sa1",
      publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      source: "Latin Oil"
    },
    {
      title: "Argentina Boosts Vaca Muerta Shale Gas Production",
      url: "https://example.com/news/sa2",
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      source: "Energy SA"
    },
    {
      title: "Colombia Approves New Pipeline Infrastructure Project",
      url: "https://example.com/news/sa3",
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      source: "South American Energy"
    },
    {
      title: "Venezuela Oil Output Rises Despite Economic Challenges",
      url: "https://example.com/news/sa4",
      publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      source: "Petroleum World"
    }
  ]
};

// Cache for 5 minutes
let cache: { data: NewsArticle[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') as keyof typeof mockNewsByRegion || 'US';
    
    // Return cache if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      const regionData = mockNewsByRegion[region] || mockNewsByRegion['US'];
      return NextResponse.json(regionData.slice(0, 6));
    }

    // In production, you would fetch from a real news API here based on region
    // For example: Google News API with region parameters
    
    // For now, return mock data with some randomization
    const regionNews = mockNewsByRegion[region] || mockNewsByRegion['US'];
    const shuffled = [...regionNews].sort(() => Math.random() - 0.5);
    const selectedNews = shuffled.slice(0, 6);
    
    // Update cache
    cache = { data: selectedNews, ts: Date.now() };
    
    return NextResponse.json(selectedNews);
  } catch (error) {
    console.error('News API error:', error);
    
    // Return fallback mock data
    return NextResponse.json(mockNewsByRegion['US'].slice(0, 4));
  }
}