import { NextResponse } from 'next/server';

interface EnergyNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  summary?: string;
}

// Cache for 15 minutes
let cache: { data: EnergyNewsArticle[]; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

async function fetchRSSFeed(feedUrl: string, sourceName: string): Promise<EnergyNewsArticle[]> {
  try {
    console.log(`🔍 Fetching RSS: ${sourceName}`);
    const response = await fetch(feedUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.log(`❌ ${sourceName}: HTTP ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const items = xmlText.match(/<item[^>]*>(.*?)<\/item>/gs) || [];
    const articles: EnergyNewsArticle[] = [];

    for (const item of items.slice(0, 6)) {
      const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/s) || 
                       item.match(/<title[^>]*>(.*?)<\/title>/s);
      const linkMatch = item.match(/<link[^>]*><!\[CDATA\[(.*?)\]\]><\/link>/s) || 
                      item.match(/<link[^>]*>(.*?)<\/link>/s);
      const pubDateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s);
      const descMatch = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/s) ||
                      item.match(/<description[^>]*>(.*?)<\/description>/s);

      if (titleMatch && linkMatch) {
        const title = titleMatch[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        const url = linkMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const pubDate = pubDateMatch?.[1] || new Date().toISOString();

        // Energy filtering - more permissive than before
        const isRelevant = title.toLowerCase().includes('oil') ||
                          title.toLowerCase().includes('gas') ||
                          title.toLowerCase().includes('energy') ||
                          title.toLowerCase().includes('petroleum') ||
                          title.toLowerCase().includes('opec') ||
                          title.toLowerCase().includes('market') ||
                          title.toLowerCase().includes('price') ||
                          description.toLowerCase().includes('oil') ||
                          description.toLowerCase().includes('energy') ||
                          articles.length < 3; // Take first 3 regardless

        if (isRelevant) {
          articles.push({
            title,
            url,
            publishedAt: new Date(pubDate).toISOString(),
            source: sourceName,
            summary: description.slice(0, 200) + '...'
          });
        }
      }
    }

    console.log(`✅ ${sourceName}: Got ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.log(`❌ ${sourceName} failed:`, error);
    return [];
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      console.log('📋 Returning cached articles');
      return NextResponse.json(cache.data);
    }

    console.log('🚀 Fetching fresh RSS feeds...');

    // Reliable RSS sources
    const feeds = [
      { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg' },
      { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters' },
      { url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines', name: 'MarketWatch' }
    ];

    const allArticles: EnergyNewsArticle[] = [];

    // Fetch from each feed
    for (const feed of feeds) {
      const articles = await fetchRSSFeed(feed.url, feed.name);
      allArticles.push(...articles.slice(0, 3)); // Max 3 per source
      
      if (allArticles.length >= 8) break; // Stop when we have enough
    }

    // Fallback articles if RSS completely fails
    if (allArticles.length === 0) {
      console.log('🚨 RSS fallback: Using test articles');
      const fallbackArticles: EnergyNewsArticle[] = [
        {
          title: "Energy Markets Live: Bloomberg Coverage",
          url: "https://www.bloomberg.com/markets",
          publishedAt: new Date().toISOString(),
          source: "Bloomberg",
          summary: "Live energy market coverage"
        },
        {
          title: "Oil & Gas News: Reuters Energy",
          url: "https://www.reuters.com/business/energy/",
          publishedAt: new Date(Date.now() - 30*60*1000).toISOString(),
          source: "Reuters",
          summary: "Energy sector news and analysis"
        },
        {
          title: "Energy Prices: MarketWatch Commodities",
          url: "https://www.marketwatch.com/investing/index/crude-oil",
          publishedAt: new Date(Date.now() - 60*60*1000).toISOString(),
          source: "MarketWatch",
          summary: "Energy commodity tracking"
        }
      ];
      allArticles.push(...fallbackArticles);
    }

    // Sort by publication date (newest first)
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Cache the results
    cache = { data: allArticles, ts: Date.now() };

    console.log(`✅ Returning ${allArticles.length} articles total`);
    return NextResponse.json(allArticles.slice(0, 8));

  } catch (error) {
    console.error('🚨 API Error:', error);
    
    // Error fallback
    return NextResponse.json([
      {
        title: "Energy Markets Live (Error Recovery)",
        url: "https://www.bloomberg.com/markets",
        publishedAt: new Date().toISOString(),
        source: "Bloomberg",
        summary: "Error recovery mode - Bloomberg markets"
      }
    ]);
  }
}