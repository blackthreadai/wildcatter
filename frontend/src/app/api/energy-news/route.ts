import { NextResponse } from 'next/server';

interface GlobalEnergyNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  region: string;
  summary?: string;
}

// Cache for 10 minutes (global news updates frequently - shorter cache for more fresh content)
let cache: { data: GlobalEnergyNewsArticle[]; ts: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

// REAL RSS feeds only - NO MOCK DATA
async function fetchLiveEnergyNews(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Attempting to fetch from REAL RSS sources');
    
    // Focus on WORKING sources + Google News searches for comprehensive energy coverage
    const promises = [
      fetchOilPriceRSS(),                // ✅ CONFIRMED WORKING
      fetchGoogleNewsEnergyRSS(),        // Google News: "oil gas energy"
      fetchGoogleNewsOilCompaniesRSS(),  // Google News: oil company news  
      fetchGoogleNewsPipelineRSS(),      // Google News: pipeline energy
      fetchGoogleNewsOPECRSS(),          // Google News: OPEC energy
      fetchGoogleNewsLNGRSS(),           // Google News: LNG natural gas
      fetchGoogleNewsRenewableRSS(),     // Google News: renewable energy
      fetchGoogleNewsEnergyStocksRSS(),  // Google News: energy stocks
      fetchGoogleNewsEnergyMarketsRSS(), // Google News: energy markets
      fetchGoogleNewsGlobalEnergyRSS(),  // Google News: global energy news
      fetchReutersEnergySearchRSS()      // Google News: Reuters energy
    ];
    
    const results = await Promise.allSettled(promises);
    const liveArticles: GlobalEnergyNewsArticle[] = [];
    
    const sourceNames = [
      'Oilprice.com', 'General Energy', 'Oil Companies', 'Pipelines', 'OPEC',
      'LNG Markets', 'Renewable Energy', 'Energy Stocks', 'Energy Markets', 
      'Global Energy', 'Reuters Energy'
    ];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`✅ ${sourceNames[index]}: ${result.value.length} real articles`);
        liveArticles.push(...result.value);
      } else {
        console.log(`❌ ${sourceNames[index]}: failed`);
      }
    });
    
    // Remove duplicates and sort by date
    const uniqueArticles = removeDuplicates(liveArticles);
    uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    console.log(`🎯 Final count: ${uniqueArticles.length} unique real articles`);
    
    if (uniqueArticles.length < 10) {
      console.log(`⚠️ Only ${uniqueArticles.length} articles found - need at least 10 for good coverage`);
    }
    
    return uniqueArticles.slice(0, 15); // Return top 15 real articles
    
  } catch (error) {
    console.error('Live energy news fetch failed:', error);
    return [];
  }
}

// Extract source name from Google News title (e.g. "Title - Reuters" -> "Reuters")
function extractSourceFromTitle(title: string): string {
  const parts = title.split(' - ');
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].trim();
    // Common news sources
    if (['Reuters', 'Bloomberg', 'AP', 'BBC', 'CNN', 'WSJ', 'MarketWatch', 'Yahoo', 'Forbes'].some(src => lastPart.includes(src))) {
      return lastPart;
    }
  }
  return 'Energy News';
}

async function fetchOilPriceRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Oilprice.com RSS...');
    const response = await fetch('https://oilprice.com/rss/main', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Oilprice.com failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 10)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Oilprice.com',
          region: 'Global',
          summary: description.slice(0, 200)
        });
      }
    }
    
    console.log(`✅ Oilprice.com: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Oilprice.com RSS fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsEnergyRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: General Energy...');
    const response = await fetch('https://news.google.com/rss/search?q=oil+gas+energy+industry+petroleum&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Google Energy News failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 8)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: description.slice(0, 200)
        });
      }
    }
    
    console.log(`✅ Google Energy News: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Google Energy News fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsOilCompaniesRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: Oil Companies...');
    const response = await fetch('https://news.google.com/rss/search?q=exxon+chevron+bp+shell+aramco+conoco+phillips+oil+company&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Oil Companies News failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 6)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: 'Oil company news and corporate developments'
        });
      }
    }
    
    console.log(`✅ Oil Companies News: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Oil Companies News fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsPipelineRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: Pipelines...');
    const response = await fetch('https://news.google.com/rss/search?q=pipeline+energy+oil+gas+keystone+nord+stream&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Pipeline News failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: 'Energy pipeline developments and infrastructure news'
        });
      }
    }
    
    console.log(`✅ Pipeline News: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Pipeline News fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsOPECRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: OPEC...');
    const response = await fetch('https://news.google.com/rss/search?q=OPEC+oil+production+crude+saudi+arabia+russia&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ OPEC News failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: 'OPEC production decisions and oil market policy'
        });
      }
    }
    
    console.log(`✅ OPEC News: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ OPEC News fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsLNGRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: LNG...');
    const response = await fetch('https://news.google.com/rss/search?q=LNG+liquefied+natural+gas+energy+export+import&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ LNG News failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: 'Liquefied natural gas trade and market developments'
        });
      }
    }
    
    console.log(`✅ LNG News: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ LNG News fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsRenewableRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: Renewable Energy...');
    const response = await fetch('https://news.google.com/rss/search?q=renewable+energy+solar+wind+offshore+clean&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Renewable Energy failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 4)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: 'Renewable energy developments and clean technology'
        });
      }
    }
    
    console.log(`✅ Renewable Energy: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Renewable Energy fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsEnergyStocksRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: Energy Stocks...');
    const response = await fetch('https://news.google.com/rss/search?q=energy+stocks+oil+gas+shares+earnings+XOM+CVX+BP+SHEL&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Energy Stocks failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 4)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: 'Energy company stock performance and earnings'
        });
      }
    }
    
    console.log(`✅ Energy Stocks: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Energy Stocks fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsEnergyMarketsRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: Energy Markets...');
    const response = await fetch('https://news.google.com/rss/search?q=energy+markets+oil+price+crude+WTI+brent+futures&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Energy Markets failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: 'Energy commodity markets and price analysis'
        });
      }
    }
    
    console.log(`✅ Energy Markets: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Energy Markets fetch error:', error);
    return [];
  }
}

async function fetchGoogleNewsGlobalEnergyRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: Global Energy...');
    const response = await fetch('https://news.google.com/rss/search?q=global+energy+international+oil+gas+worldwide&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Global Energy failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: extractSourceFromTitle(title),
          region: 'Global',
          summary: 'International energy developments and global market trends'
        });
      }
    }
    
    console.log(`✅ Global Energy: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Global Energy fetch error:', error);
    return [];
  }
}

async function fetchReutersEnergySearchRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Google News: Reuters Energy...');
    const response = await fetch('https://news.google.com/rss/search?q=site:reuters.com+energy+oil+gas+petroleum&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Reuters Energy failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        articles.push({
          title: title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Reuters',
          region: 'Global',
          summary: 'Reuters energy industry reporting and market analysis'
        });
      }
    }
    
    console.log(`✅ Reuters Energy: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Reuters Energy fetch error:', error);
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

// REMOVED ALL MOCK DATA FUNCTIONS - REAL RSS ONLY

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
    
    // Ensure we have at least a minimum number of articles
    const articlesToReturn = liveArticles.slice(0, 12);
    
    if (articlesToReturn.length < 5) {
      console.log(`⚠️ WARNING: Only ${articlesToReturn.length} articles available - expanding search may be needed`);
    }
    
    // Cache the results
    cache = { data: articlesToReturn, ts: Date.now() };
    
    return NextResponse.json(articlesToReturn);
    
  } catch (error) {
    console.error('Global energy news API error:', error);
    
    // NO FALLBACK TO FAKE DATA - return empty array
    return NextResponse.json([]);
  }
}