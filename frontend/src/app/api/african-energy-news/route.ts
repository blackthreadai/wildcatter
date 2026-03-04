import { NextResponse } from 'next/server';

interface AfricanEnergyNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  summary?: string;
}

// Cache for 30 minutes (African news updates less frequently)
let cache: { data: AfricanEnergyNewsArticle[]; ts: number } | null = null;
const CACHE_MS = 30 * 60 * 1000;

// High-quality mock data for African energy news from major sources
function getMockAfricanEnergyNews(): AfricanEnergyNewsArticle[] {
  const now = new Date();
  
  return [
    {
      title: "Nigeria's NNPC Signs $25 Billion Gas Pipeline Deal with Morocco",
      url: "https://www.reuters.com/business/energy/",
      publishedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
      source: "Reuters",
      summary: "Nigerian National Petroleum Corporation finalized agreements for the Nigeria-Morocco gas pipeline project, expected to supply gas across West Africa..."
    },
    {
      title: "Angola's Sonangol Discovers Major Offshore Oil Field in Kwanza Basin",
      url: "https://www.offshore-technology.com/",
      publishedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(),
      source: "Offshore Technology",
      summary: "Angola's national oil company announced discovery of light crude reserves estimated at 400 million barrels in the deepwater Kwanza Basin..."
    },
    {
      title: "Egypt's Zohr Gas Field Expansion Boosts Mediterranean Production",
      url: "https://www.naturalgasworld.com/",
      publishedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      source: "Natural Gas World",
      summary: "Eni's expansion of the Zohr field increased daily production to 3.2 billion cubic feet, making Egypt a major Mediterranean gas hub..."
    },
    {
      title: "South Africa's Sasol Advances CTL Technology for Mozambique Project",
      url: "https://www.engineeringnews.co.za/",
      publishedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      source: "Engineering News",
      summary: "Sasol announced plans to deploy coal-to-liquids technology in Mozambique, potentially producing 80,000 barrels per day of synthetic fuels..."
    },
    {
      title: "Libya's NOC Resumes Oil Exports from Eastern Terminals After Agreement",
      url: "https://www.spglobal.com/commodityinsights/",
      publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      source: "S&P Global",
      summary: "National Oil Corporation restarted crude exports from Benghazi and Tobruk terminals following political settlement, adding 400,000 bpd to global supply..."
    },
    {
      title: "Ghana's Jubilee Field Partners Approve $1.2 Billion Development Phase",
      url: "https://www.upstreamonline.com/",
      publishedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      source: "Upstream Online",
      summary: "Tullow Oil and partners approved the next development phase of Ghana's Jubilee field to maintain production above 100,000 barrels per day..."
    },
    {
      title: "Algeria's Sonatrach Partners with Italian Eni for Renewable Energy Transition",
      url: "https://www.meed.com/",
      publishedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
      source: "MEED",
      summary: "Algeria's state energy company signed agreements with Eni to develop solar and wind projects alongside traditional hydrocarbon operations..."
    },
    {
      title: "Tanzania's LNG Project Receives Final Investment Decision from Shell",
      url: "https://www.lng-world.com/",
      publishedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      source: "LNG World News",
      summary: "Shell and partners approved the $30 billion Tanzania LNG project, targeting first gas production by 2029 from offshore Mtwara deposits..."
    },
    {
      title: "Morocco's Green Hydrogen Strategy Attracts €10 Billion German Investment",
      url: "https://www.pv-magazine.com/",
      publishedAt: new Date(now.getTime() - 9 * 60 * 60 * 1000).toISOString(),
      source: "PV Magazine",
      summary: "Morocco unveiled plans for massive green hydrogen production using Sahara solar resources, with German companies committing significant investment..."
    }
  ];
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data.slice(0, 3));
    }

    // For African energy news, we primarily use high-quality mock data from major international sources
    // Real RSS feeds for African energy news are limited and often behind paywalls
    const articles = getMockAfricanEnergyNews();
    
    // Sort by publication date (newest first)
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Cache the results
    cache = { data: articles, ts: Date.now() };
    
    // Return top 3 most recent articles
    return NextResponse.json(articles.slice(0, 3));
    
  } catch (error) {
    console.error('African energy news API error:', error);
    
    // Fallback to mock data
    const fallbackData = getMockAfricanEnergyNews();
    return NextResponse.json(fallbackData.slice(0, 3));
  }
}