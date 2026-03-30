import { NextResponse } from 'next/server';

interface GlobalEnergyNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  region: string;
  summary?: string;
}

// Cache for 15 minutes (global news updates frequently)
let cache: { data: GlobalEnergyNewsArticle[]; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

// REMOVED ALL MOCK DATA FUNCTIONS - REAL RSS ONLY

// REAL RSS feeds only - NO MOCK DATA
async function fetchLiveEnergyNews(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Attempting to fetch from REAL RSS sources');
    
    // Try multiple real RSS feeds in parallel
    const promises = [
      fetchReutersEnergyRSS(),
      fetchAPNewsRSS(), 
      fetchBBCBusinessRSS(),
      fetchCNNBusinessRSS(),
      fetchYahooFinanceRSS(),
      fetchMarketWatchRSS()
    ];
    
    const results = await Promise.allSettled(promises);
    const liveArticles: GlobalEnergyNewsArticle[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`✅ Source ${index + 1}: ${result.value.length} real articles`);
        liveArticles.push(...result.value);
      } else {
        console.log(`❌ Source ${index + 1}: failed`);
      }
    });
    
    // Remove duplicates and sort by date
    const uniqueArticles = removeDuplicates(liveArticles);
    uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    console.log(`🎯 Final count: ${uniqueArticles.length} unique real articles`);
    
    return uniqueArticles.slice(0, 20); // Return top 20 real articles
    
  } catch (error) {
    console.error('Live energy news fetch failed:', error);
    return [];
  }
}

async function fetchReutersEnergyRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Reuters Business RSS...');
    const response = await fetch('https://feeds.reuters.com/reuters/business', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Reuters failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    const energyKeywords = ['oil', 'gas', 'energy', 'petroleum', 'lng', 'crude', 'renewable', 'nuclear', 'coal', 'pipeline', 'refinery', 'drilling', 'opec', 'aramco', 'exxon', 'chevron', 'bp'];
    
    for (const item of items.slice(0, 20)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const content = (title + ' ' + description).toLowerCase();
        const url = linkMatch[1].trim();
        
        // Filter for energy-related content
        if (energyKeywords.some(keyword => content.includes(keyword))) {
          articles.push({
            title: title,
            url: url,
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Reuters',
            region: 'Global',
            summary: description.slice(0, 200)
          });
        }
      }
    }
    
    console.log(`✅ Reuters: Found ${articles.length} energy articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Reuters energy RSS fetch error:', error);
    return [];
  }
}

async function fetchAPNewsRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching AP Business RSS...');
    const response = await fetch('https://feeds.apnews.com/rss/apf-business.rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ AP News failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    const energyKeywords = ['oil', 'gas', 'energy', 'petroleum', 'lng', 'crude', 'renewable', 'nuclear', 'coal', 'pipeline', 'refinery', 'drilling', 'opec'];
    
    for (const item of items.slice(0, 20)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const content = (title + ' ' + description).toLowerCase();
        
        if (energyKeywords.some(keyword => content.includes(keyword))) {
          articles.push({
            title: title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'AP News',
            region: 'Global',
            summary: description.slice(0, 200)
          });
        }
      }
    }
    
    console.log(`✅ AP News: Found ${articles.length} energy articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ AP News RSS fetch error:', error);
    return [];
  }
}

async function fetchBBCBusinessRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching BBC Business RSS...');
    const response = await fetch('http://feeds.bbci.co.uk/news/business/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ BBC Business failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    const energyKeywords = ['oil', 'gas', 'energy', 'petroleum', 'lng', 'crude', 'renewable', 'nuclear', 'coal', 'pipeline', 'opec', 'shell', 'bp'];
    
    for (const item of items.slice(0, 20)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const content = (title + ' ' + description).toLowerCase();
        
        if (energyKeywords.some(keyword => content.includes(keyword))) {
          articles.push({
            title: title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'BBC Business',
            region: 'Global',
            summary: description.slice(0, 200)
          });
        }
      }
    }
    
    console.log(`✅ BBC Business: Found ${articles.length} energy articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ BBC Business RSS fetch error:', error);
    return [];
  }
}

async function fetchCNNBusinessRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching CNN Business RSS...');
    const response = await fetch('http://rss.cnn.com/rss/money_latest.rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ CNN Business failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    const energyKeywords = ['oil', 'gas', 'energy', 'petroleum', 'lng', 'crude', 'renewable', 'nuclear', 'coal', 'opec', 'exxon', 'chevron'];
    
    for (const item of items.slice(0, 20)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const content = (title + ' ' + description).toLowerCase();
        
        if (energyKeywords.some(keyword => content.includes(keyword))) {
          articles.push({
            title: title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'CNN Business',
            region: 'Global',
            summary: description.slice(0, 200)
          });
        }
      }
    }
    
    console.log(`✅ CNN Business: Found ${articles.length} energy articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ CNN Business RSS fetch error:', error);
    return [];
  }
}

async function fetchYahooFinanceRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Yahoo Finance RSS...');
    const response = await fetch('https://feeds.finance.yahoo.com/rss/2.0/headline', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Yahoo Finance failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    const energyKeywords = ['oil', 'gas', 'energy', 'petroleum', 'lng', 'crude', 'renewable', 'nuclear', 'opec', 'aramco', 'exxon', 'chevron', 'bp', 'shell'];
    
    for (const item of items.slice(0, 20)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const content = (title + ' ' + description).toLowerCase();
        
        if (energyKeywords.some(keyword => content.includes(keyword))) {
          articles.push({
            title: title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Yahoo Finance',
            region: 'Global',
            summary: description.slice(0, 200)
          });
        }
      }
    }
    
    console.log(`✅ Yahoo Finance: Found ${articles.length} energy articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Yahoo Finance RSS fetch error:', error);
    return [];
  }
}

async function fetchMarketWatchRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching MarketWatch RSS...');
    const response = await fetch('http://feeds.marketwatch.com/marketwatch/marketpulse/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ MarketWatch failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    const energyKeywords = ['oil', 'gas', 'energy', 'petroleum', 'lng', 'crude', 'renewable', 'nuclear', 'opec', 'exxon', 'chevron', 'bp', 'shell'];
    
    for (const item of items.slice(0, 20)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const content = (title + ' ' + description).toLowerCase();
        
        if (energyKeywords.some(keyword => content.includes(keyword))) {
          articles.push({
            title: title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'MarketWatch',
            region: 'Global',
            summary: description.slice(0, 200)
          });
        }
      }
    }
    
    console.log(`✅ MarketWatch: Found ${articles.length} energy articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ MarketWatch RSS fetch error:', error);
    return [];
  }
}

// Remove duplicate articles based on title similarity
function removeDuplicates(articles: GlobalEnergyNewsArticle[]): GlobalEnergyNewsArticle[] {
  const unique: GlobalEnergyNewsArticle[] = [];
  
  for (const article of articles) {
    const isDuplicate = unique.some(existing => {
      const similarity = calculateStringSimilarity(
        article.title.toLowerCase(), 
        existing.title.toLowerCase()
      );
      return similarity > 0.7; // 70% similarity threshold
    });
    
    if (!isDuplicate) {
      unique.push(article);
    }
  }
  
  return unique;
}

// Calculate string similarity (simple Jaccard similarity)
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' '));
  const words2 = new Set(str2.split(' '));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    console.log('🌍 GLOBAL ENERGY NEWS: Fetching REAL RSS feeds only');
    
    // ONLY fetch real articles - NO MOCK DATA EVER
    const liveArticles = await fetchLiveEnergyNews();
    
    console.log(`🎯 GLOBAL ENERGY NEWS: ${liveArticles.length} REAL articles found`);
    
    if (liveArticles.length === 0) {
      console.log('🚫 NO REAL ARTICLES AVAILABLE - returning empty array');
      return NextResponse.json([]);
    }
    
    // Cache the results
    cache = { data: liveArticles.slice(0, 12), ts: Date.now() };
    
    return NextResponse.json(liveArticles.slice(0, 12));
    
  } catch (error) {
    console.error('Global energy news API error:', error);
    
    // NO FALLBACK TO FAKE DATA - return empty array
    return NextResponse.json([]);
  }
}