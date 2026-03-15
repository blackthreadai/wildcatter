import { NextResponse } from 'next/server';

interface EnergyNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  summary?: string;
}

// Cache for 15 minutes (news updates frequently)
let cache: { data: EnergyNewsArticle[]; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

async function fetchRealEnergyNews(): Promise<EnergyNewsArticle[]> {
  try {
    // Multiple working RSS feeds for comprehensive coverage  
    const feeds = [
      'https://feeds.bloomberg.com/markets/news.rss',
      'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines',
      'https://feeds.reuters.com/reuters/businessNews',
      'https://feeds.cnbc.com/cnbc/world-news',
      'https://feeds.foxnews.com/foxnews/business',
      'https://www.ft.com/rss/companies/energy',
      'https://oilprice.com/rss/main',
      'https://feeds.washingtonpost.com/rss/business'
    ];
    
    let allArticles: EnergyNewsArticle[] = [];
    let successCount = 0;
    const maxSources = 4; // Get articles from at least 4 sources
    
    for (const feedUrl of feeds) {
      try {
        console.log(`🔍 Trying RSS feed: ${feedUrl}`);
        const response = await fetch(feedUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          },
          signal: AbortSignal.timeout(10000)
        });
    
        if (!response.ok) {
          console.log(`❌ HTTP ${response.status} for ${feedUrl}`);
          continue;
        }
        
        const xmlText = await response.text();
        console.log(`📄 Got ${xmlText.length} characters of XML from ${feedUrl}`);
        
        // Parse RSS format (works for most RSS feeds)
        const items = xmlText.match(/<item[^>]*>(.*?)<\/item>/gs) || [];
        console.log(`📰 Found ${items.length} articles in RSS feed`);
        const articles: EnergyNewsArticle[] = [];
        
        for (const item of items.slice(0, 15)) {
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
            
            // Less restrictive energy filtering - include business/market news
            const isEnergyRelated = title.toLowerCase().includes('oil') ||
                                  title.toLowerCase().includes('gas') ||
                                  title.toLowerCase().includes('energy') ||
                                  title.toLowerCase().includes('petroleum') ||
                                  title.toLowerCase().includes('opec') ||
                                  title.toLowerCase().includes('exxon') ||
                                  title.toLowerCase().includes('chevron') ||
                                  title.toLowerCase().includes('bp ') ||
                                  title.toLowerCase().includes('shell') ||
                                  description.toLowerCase().includes('oil') ||
                                  description.toLowerCase().includes('energy');
            
            // Take first 8 articles regardless if no energy articles found, then filter
            if (isEnergyRelated || articles.length < 8) {
              const source = feedUrl.includes('bloomberg') ? 'Bloomberg' : 
                           feedUrl.includes('dowjones') || feedUrl.includes('marketwatch') ? 'MarketWatch' :
                           feedUrl.includes('reuters') ? 'Reuters' :
                           feedUrl.includes('cnbc') ? 'CNBC' :
                           feedUrl.includes('foxnews') ? 'Fox Business' : 
                           feedUrl.includes('ft.com') ? 'Financial Times' :
                           feedUrl.includes('oilprice') ? 'OilPrice.com' :
                           feedUrl.includes('washingtonpost') ? 'Washington Post' : 'Business News';
              
              articles.push({
                title,
                url,
                publishedAt: new Date(pubDate).toISOString(),
                source,
                summary: description.slice(0, 200) + '...'
              });
            }
          }
        }
        
        if (articles.length > 0) {
          console.log(`✅ Successfully fetched ${articles.length} articles from ${feedUrl}`);
          allArticles.push(...articles.slice(0, 3)); // Max 3 articles per source
          successCount++;
          
          // Stop after getting articles from enough sources or max articles
          if (successCount >= maxSources || allArticles.length >= 12) {
            break;
          }
        } else {
          console.log(`⚠️  No suitable articles found in ${feedUrl}`);
        }
      } catch (feedError) {
        console.log(`❌ Feed failed: ${feedUrl}`, feedError);
        continue;
      }
    }
    
    console.log(`🎯 Final result: ${allArticles.length} articles from ${successCount} sources`);
    return allArticles;
  } catch (error) {
    console.error('All RSS feeds failed:', error);
    return [];
  }
}

// NO MOCK DATA - REAL ARTICLES ONLY

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data.slice(0, 8)); // Allow up to 8 articles
    }

    // Fetch real news articles
    console.log('🚀 Starting RSS feed fetch...');
    const allArticles = await fetchRealEnergyNews();
    
    // Sort by publication date (newest first)
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Cache the results (only if we have real articles)
    if (allArticles.length > 0) {
      cache = { data: allArticles, ts: Date.now() };
      console.log(`✅ Energy News API: Returning ${allArticles.length} real articles`);
    } else {
      console.log('❌ Energy News API: No real articles available');
    }
    
    // Return top 8 most recent articles (or empty array)
    return NextResponse.json(allArticles.slice(0, 8));
    
  } catch (error) {
    console.error('Energy news API error:', error);
    
    // NO FALLBACK DATA - RETURN EMPTY IF REAL DATA FAILS
    return NextResponse.json([]);
  }
}