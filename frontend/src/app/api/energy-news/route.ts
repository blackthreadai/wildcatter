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
    // Try multiple real RSS feeds in sequence
    const feeds = [
      'https://oilprice.com/rss/main',
      'https://www.energy.gov/rss.xml',
      'https://feeds.reuters.com/reuters/businessNews'
    ];
    
    for (const feedUrl of feeds) {
      try {
        const response = await fetch(feedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
          signal: AbortSignal.timeout(8000)
        });
    
        if (!response.ok) continue;
        
        const xmlText = await response.text();
        
        // Parse RSS format (works for most RSS feeds)
        const items = xmlText.match(/<item>(.*?)<\/item>/g) || [];
        const articles: EnergyNewsArticle[] = [];
        
        for (const item of items.slice(0, 10)) {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
          const linkMatch = item.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/) || item.match(/<link>(.*?)<\/link>/);
          const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
          const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
          
          if (titleMatch && linkMatch && pubDateMatch) {
            const title = titleMatch[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            const url = linkMatch[1].trim();
            const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
            
            // Only include if it's energy-related
            if (title.toLowerCase().includes('oil') ||
                title.toLowerCase().includes('gas') ||
                title.toLowerCase().includes('energy') ||
                title.toLowerCase().includes('petroleum') ||
                title.toLowerCase().includes('opec') ||
                description.toLowerCase().includes('energy')) {
              
              articles.push({
                title,
                url,
                publishedAt: new Date(pubDateMatch[1]).toISOString(),
                source: feedUrl.includes('oilprice') ? 'OilPrice.com' : 
                       feedUrl.includes('energy.gov') ? 'U.S. Dept of Energy' : 'Reuters',
                summary: description.slice(0, 200) + '...'
              });
            }
          }
        }
        
        if (articles.length > 0) {
          console.log(`✅ Successfully fetched ${articles.length} real articles from ${feedUrl}`);
          return articles;
        }
      } catch (feedError) {
        console.log(`❌ Feed failed: ${feedUrl}`, feedError);
        continue;
      }
    }
    
    return [];
  } catch (error) {
    console.error('All RSS feeds failed:', error);
    return [];
  }
}

async function fetchAssociatedPressEnergyNews(): Promise<EnergyNewsArticle[]> {
  try {
    // AP RSS feed for business/energy
    const response = await fetch('https://feeds.apnews.com/rss/apf-business', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error('AP fetch failed');
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>(.*?)<\/item>/g) || [];
    const articles: EnergyNewsArticle[] = [];
    
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
            title.toLowerCase().includes('exxon') ||
            title.toLowerCase().includes('chevron') ||
            title.toLowerCase().includes('opec') ||
            description.toLowerCase().includes('oil') ||
            description.toLowerCase().includes('gas') ||
            description.toLowerCase().includes('energy')) {
          
          articles.push({
            title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Associated Press',
            summary: description.slice(0, 200) + '...'
          });
        }
      }
    }
    
    return articles;
  } catch (error) {
    console.error('AP fetch error:', error);
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

    // Fetch from multiple sources in parallel
    const [realNews, apNews] = await Promise.allSettled([
      fetchRealEnergyNews(),
      fetchAssociatedPressEnergyNews()
    ]);
    
    let allArticles: EnergyNewsArticle[] = [];
    
    // Add real news articles
    if (realNews.status === 'fulfilled') {
      allArticles.push(...realNews.value);
    }
    
    // Add AP articles  
    if (apNews.status === 'fulfilled') {
      allArticles.push(...apNews.value);
    }
    
    // NO MOCK DATA - ONLY REAL ARTICLES
    
    // Sort by publication date (newest first)
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Remove duplicates based on title similarity
    const uniqueArticles: EnergyNewsArticle[] = [];
    for (const article of allArticles) {
      const isDuplicate = uniqueArticles.some(existing => 
        existing.title.toLowerCase().includes(article.title.toLowerCase().split(' ').slice(0, 3).join(' ')) ||
        article.title.toLowerCase().includes(existing.title.toLowerCase().split(' ').slice(0, 3).join(' '))
      );
      
      if (!isDuplicate) {
        uniqueArticles.push(article);
      }
    }
    
    // Cache the results (only if we have real articles)
    if (uniqueArticles.length > 0) {
      cache = { data: uniqueArticles, ts: Date.now() };
      console.log(`✅ Energy News API: Returning ${uniqueArticles.length} real articles`);
    } else {
      console.log('❌ Energy News API: No real articles available');
    }
    
    // Return top 8 most recent articles (or empty array)
    return NextResponse.json(uniqueArticles.slice(0, 8));
    
  } catch (error) {
    console.error('Energy news API error:', error);
    
    // NO FALLBACK DATA - RETURN EMPTY IF REAL DATA FAILS
    return NextResponse.json([]);
  }
}