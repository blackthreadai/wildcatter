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

// Enhanced high-quality mock data for South American energy news
function getMockSouthAmericanEnergyNews(): SouthAmericanEnergyNewsArticle[] {
  const now = new Date();
  
  return [
    {
      title: "Brazil's Petrobras Reports Record Q4 Profits of $12.8B from Pre-Salt Operations",
      url: "https://www.reuters.com/business/energy/",
      publishedAt: new Date(now.getTime() - 1.2 * 60 * 60 * 1000).toISOString(),
      source: "Reuters",
      summary: "Brazilian state oil giant Petrobras announces highest quarterly earnings in company history, driven by Santos Basin pre-salt production surge..."
    },
    {
      title: "Venezuela's Oil Production Doubles to 1.5M bpd Following Infrastructure Repairs",
      url: "https://www.bloomberg.com/news/americas",
      publishedAt: new Date(now.getTime() - 2.3 * 60 * 60 * 1000).toISOString(),
      source: "Bloomberg",
      summary: "Venezuela's PDVSA restores key refineries and pipelines with Iranian technical assistance, marking fastest production recovery since 2019..."
    },
    {
      title: "Argentina Launches $25B Vaca Muerta Mega-Pipeline to Atlantic Coast",
      url: "https://www.bnamericas.com/en/news/energy",
      publishedAt: new Date(now.getTime() - 3.1 * 60 * 60 * 1000).toISOString(),
      source: "BNamericas",
      summary: "Argentina breaks ground on 1,400km pipeline connecting Vaca Muerta shale fields to new export terminals near Bahía Blanca..."
    },
    {
      title: "Chile's Green Hydrogen Corridor Attracts $30B in International Investment",
      url: "https://www.pv-magazine.com/",
      publishedAt: new Date(now.getTime() - 4.4 * 60 * 60 * 1000).toISOString(),
      source: "PV Magazine",
      summary: "Chilean desert regions secure massive funding from European, Japanese, and Australian investors for world's largest green hydrogen hub..."
    },
    {
      title: "Colombia's Ecopetrol Discovers 800M Barrel Offshore Oil Field",
      url: "https://www.spglobal.com/commodityinsights/",
      publishedAt: new Date(now.getTime() - 5.2 * 60 * 60 * 1000).toISOString(),
      source: "S&P Global",
      summary: "Colombian national oil company confirms major deepwater discovery in Caribbean Sea, potentially doubling country's proven reserves..."
    },
    {
      title: "Peru Signs Historic LNG Supply Deal with Germany Worth $15B",
      url: "https://www.naturalgasintel.com/",
      publishedAt: new Date(now.getTime() - 6.6 * 60 * 60 * 1000).toISOString(),
      source: "Natural Gas Intelligence",
      summary: "Peru's Camisea gas project secures 15-year export contract with German utilities as Europe diversifies energy supply sources..."
    },
    {
      title: "Brazil Ethanol Exports to Europe Surge 200% Amid Biofuel Mandate",
      url: "https://www.biofuelsdigest.com/",
      publishedAt: new Date(now.getTime() - 7.3 * 60 * 60 * 1000).toISOString(),
      source: "Biofuels Digest",
      summary: "Brazilian ethanol producers capitalize on EU renewable fuel requirements, shipping record volumes to Netherlands and Germany..."
    },
    {
      title: "Guyana Starts Production at Third Oil Platform, Output Hits 650K bpd",
      url: "https://www.energyvoice.com/",
      publishedAt: new Date(now.getTime() - 8.1 * 60 * 60 * 1000).toISOString(),
      source: "Energy Voice",
      summary: "ExxonMobil's Payara project comes online in Stabroek Block, establishing Guyana as South America's fastest-growing oil producer..."
    }
  ];
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data.slice(0, 8));
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
    
    // Return top 8 most recent articles for consistent display
    return NextResponse.json(articles.slice(0, 8));
    
  } catch (error) {
    console.error('South American energy news API error:', error);
    
    // Fallback to mock data
    const fallbackData = getMockSouthAmericanEnergyNews();
    return NextResponse.json(fallbackData.slice(0, 8));
  }
}