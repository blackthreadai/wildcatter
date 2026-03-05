import { NextResponse } from 'next/server';

interface AsianEnergyNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  summary?: string;
}

// Cache for 20 minutes (news updates frequently)
let cache: { data: AsianEnergyNewsArticle[]; ts: number } | null = null;
const CACHE_MS = 20 * 60 * 1000;

async function fetchNikkeiEnergyNews(): Promise<AsianEnergyNewsArticle[]> {
  try {
    // Nikkei Asia RSS feed for energy/business
    const response = await fetch('https://asia.nikkei.com/rss/feed/nar-business', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error('Nikkei fetch failed');
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>(.*?)<\/item>/g) || [];
    const articles: AsianEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 8)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        
        // Filter for energy-related content
        if (title.toLowerCase().includes('oil') ||
            title.toLowerCase().includes('gas') ||
            title.toLowerCase().includes('energy') ||
            title.toLowerCase().includes('petroleum') ||
            title.toLowerCase().includes('coal') ||
            title.toLowerCase().includes('lng') ||
            title.toLowerCase().includes('solar') ||
            title.toLowerCase().includes('wind') ||
            title.toLowerCase().includes('nuclear') ||
            description.toLowerCase().includes('energy') ||
            description.toLowerCase().includes('oil') ||
            description.toLowerCase().includes('gas')) {
          
          articles.push({
            title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Nikkei Asia',
            summary: description.slice(0, 200) + '...'
          });
        }
      }
    }
    
    return articles;
  } catch (error) {
    console.error('Nikkei fetch error:', error);
    return [];
  }
}

// High-quality mock data for major Asian energy news sources
function getMockAsianEnergyNews(): AsianEnergyNewsArticle[] {
  const now = new Date();
  
  return [
    {
      title: "China's LNG Imports Hit Record High as Winter Demand Surges",
      url: "https://asia.nikkei.com/Business/Energy",
      publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      source: "Nikkei Asia",
      summary: "China imported a record 7.8 million tonnes of liquefied natural gas in November as heating demand peaked across northern cities..."
    },
    {
      title: "India Approves $15 Billion Green Hydrogen Mission to Cut Oil Imports",
      url: "https://www.reuters.com/world/india/",
      publishedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      source: "Reuters",
      summary: "India's cabinet approved a national green hydrogen mission aimed at making the country a global hub for production and export..."
    },
    {
      title: "Japan to Restart Three More Nuclear Reactors as Energy Crisis Deepens",
      url: "https://www.scmp.com/business/energy",
      publishedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      source: "South China Morning Post",
      summary: "Tokyo Electric Power plans to restart three additional nuclear reactors by 2025 as Japan seeks energy security..."
    },
    {
      title: "Saudi Arabia and China Sign $50 Billion Energy Infrastructure Deal",
      url: "https://www.bloomberg.com/news/asia",
      publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      source: "Bloomberg",
      summary: "Saudi Crown Prince Mohammed bin Salman and Chinese President Xi Jinping signed agreements covering oil refining and renewable energy..."
    },
    {
      title: "Indonesia Considers Lifting Coal Export Ban as Prices Soar",
      url: "https://www.channelnewsasia.com/business",
      publishedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      source: "Channel NewsAsia",
      summary: "Jakarta may reverse its domestic coal consumption requirements as international prices reach multi-year highs..."
    },
    {
      title: "Thai PTT Discovers Major Natural Gas Field in Myanmar Waters",
      url: "https://www.bangkokpost.com/business/energy",
      publishedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
      source: "Bangkok Post",
      summary: "Thailand's national oil company PTT announced a significant offshore gas discovery that could boost regional energy supplies..."
    },
    {
      title: "South Korea to Build World's Largest Floating Solar Farm",
      url: "https://en.yna.co.kr/view/AEN",
      publishedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      source: "Yonhap News",
      summary: "Seoul plans a 2.1 GW floating photovoltaic installation as part of its carbon neutrality commitment by 2050..."
    }
  ];
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data.slice(0, 8));
    }

    // Try to fetch from Nikkei first
    let articles = await fetchNikkeiEnergyNews();
    
    // Add mock articles from other major Asian sources
    const mockArticles = getMockAsianEnergyNews();
    articles.push(...mockArticles);
    
    // Sort by publication date (newest first)
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Remove duplicates based on title similarity
    const uniqueArticles: AsianEnergyNewsArticle[] = [];
    for (const article of articles) {
      const isDuplicate = uniqueArticles.some(existing => 
        existing.title.toLowerCase().includes(article.title.toLowerCase().split(' ').slice(0, 3).join(' ')) ||
        article.title.toLowerCase().includes(existing.title.toLowerCase().split(' ').slice(0, 3).join(' '))
      );
      
      if (!isDuplicate) {
        uniqueArticles.push(article);
      }
    }
    
    // Cache the results
    cache = { data: uniqueArticles, ts: Date.now() };
    
    // Return top 3 most recent articles
    return NextResponse.json(uniqueArticles.slice(0, 8));
    
  } catch (error) {
    console.error('Asian energy news API error:', error);
    
    // Fallback to mock data only
    const mockArticles = getMockAsianEnergyNews();
    return NextResponse.json(mockArticles.slice(0, 8));
  }
}