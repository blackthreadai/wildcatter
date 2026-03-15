import { NextResponse } from 'next/server';

export async function GET() {
  const articles = [
    {
      title: "Live: Bloomberg Energy Markets", 
      url: "https://www.bloomberg.com/markets",
      publishedAt: new Date().toISOString(),
      source: "Bloomberg",
      summary: "Live energy coverage"
    },
    {
      title: "Reuters: Oil & Gas News",
      url: "https://www.reuters.com/business/energy/",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      source: "Reuters",
      summary: "Energy sector updates"
    },
    {
      title: "MarketWatch: Energy Commodities",
      url: "https://www.marketwatch.com/investing/index/crude-oil",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      source: "MarketWatch", 
      summary: "Energy commodity tracking"
    },
    {
      title: "Fox Business: Energy Sector",
      url: "https://www.foxbusiness.com/category/energy",
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      source: "Fox Business",
      summary: "Energy business coverage"
    }
  ];
  
  return NextResponse.json(articles);
}