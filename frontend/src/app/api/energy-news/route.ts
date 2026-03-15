import { NextResponse } from 'next/server';

export async function GET() {
  // FRESH START - SIMPLE TEST
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
    }
  ];
  
  return NextResponse.json(articles);
}