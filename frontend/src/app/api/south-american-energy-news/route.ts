import { NextResponse } from 'next/server';

interface SouthAmericanEnergyNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  summary?: string;
}

// Cache for 25 minutes (South American news updates less frequently than US/Asian)
let cache: { data: SouthAmericanEnergyNewsArticle[]; ts: number } | null = null;
const CACHE_MS = 25 * 60 * 1000;

// High-quality mock data for major South American energy news
function getMockSouthAmericanEnergyNews(): SouthAmericanEnergyNewsArticle[] {
  const now = new Date();
  
  return [
    {
      title: "Brazil's Petrobras Discovers Massive Pre-Salt Oil Field in Santos Basin",
      url: "https://www.reuters.com/business/energy/",
      publishedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
      source: "Reuters",
      summary: "Brazilian state oil company Petrobras announced a significant discovery in the Santos Basin pre-salt layer, estimated to contain over 1 billion barrels..."
    },
    {
      title: "Venezuela Resumes Oil Exports to US Under New Sanctions Relief",
      url: "https://www.bloomberg.com/news/americas",
      publishedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(),
      source: "Bloomberg",
      summary: "Venezuela's state-owned PDVSA has resumed limited crude oil shipments to US refineries following partial sanctions relief..."
    },
    {
      title: "Argentina's Vaca Muerta Shale Production Reaches Record Highs",
      url: "https://www.bnamericas.com/en/news/energy",
      publishedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      source: "BNamericas",
      summary: "Argentina's Vaca Muerta shale formation produced a record 140,000 barrels per day in November, marking a 25% increase from the previous year..."
    },
    {
      title: "Chile Awards 25 GW Solar Energy Projects in Atacama Desert",
      url: "https://www.pv-magazine.com/",
      publishedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      source: "PV Magazine",
      summary: "Chilean government announced the approval of massive solar installations in the Atacama Desert, representing $18 billion in renewable energy investment..."
    },
    {
      title: "Colombia's Pacific Coast Oil Exploration Faces Environmental Opposition",
      url: "https://www.spglobal.com/commodityinsights/",
      publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      source: "S&P Global",
      summary: "Environmental groups challenge Ecopetrol's offshore exploration plans along Colombia's Pacific coast, citing biodiversity concerns..."
    },
    {
      title: "Peru's Natural Gas Exports to Argentina Surge Amid Energy Crisis",
      url: "https://www.energyvoice.com/",
      publishedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      source: "Energy Voice",
      summary: "Peru increased natural gas exports to Argentina by 40% as neighboring country faces energy shortages during peak summer demand..."
    },
    {
      title: "Brazil's Ethanol Production Hits 10-Year High Amid Global Demand",
      url: "https://www.agrimoney.com/news/",
      publishedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
      source: "Agrimoney",
      summary: "Brazilian ethanol production reached 32 billion liters in 2025, driven by strong domestic demand and increased exports to Europe and Asia..."
    },
    {
      title: "Ecuador Negotiates New Chinese Loan for Oil Infrastructure Development",
      url: "https://www.upstreamonline.com/",
      publishedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      source: "Upstream Online",
      summary: "Ecuador's government is finalizing a $3.5 billion loan from Chinese banks to modernize oil production facilities and boost daily output..."
    }
  ];
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data.slice(0, 3));
    }

    // For now, use mock data as primary source (South American energy RSS feeds are limited)
    // In production, you could integrate with:
    // - BNamericas API (premium business intelligence for Latin America)
    // - Local news RSS feeds from major outlets
    // - Reuters Latin America energy section
    
    const articles = getMockSouthAmericanEnergyNews();
    
    // Sort by publication date (newest first)
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Cache the results
    cache = { data: articles, ts: Date.now() };
    
    // Return top 3 most recent articles
    return NextResponse.json(articles.slice(0, 3));
    
  } catch (error) {
    console.error('South American energy news API error:', error);
    
    // Fallback to mock data
    const fallbackData = getMockSouthAmericanEnergyNews();
    return NextResponse.json(fallbackData.slice(0, 3));
  }
}