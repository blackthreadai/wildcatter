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

// REMOVED ALL MOCK DATA FUNCTIONS - REAL RSS ONLY

// REAL RSS feeds only - NO MOCK DATA
async function fetchLiveEnergyNews(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Attempting to fetch from REAL RSS sources');
    
    // Try multiple real RSS feeds in parallel - EXPANDED ENERGY SOURCES
    const promises = [
      fetchReutersEnergyRSS(),
      fetchAPNewsRSS(), 
      fetchBBCBusinessRSS(),
      fetchCNNBusinessRSS(),
      fetchYahooFinanceRSS(),
      fetchMarketWatchRSS(),
      fetchOilPriceRSS(),
      fetchEnergyVoiceRSS(),
      fetchUpstreamOnlineRSS(),
      fetchOffshoreEnergyRSS(),
      fetchNaturalGasIntelRSS(),
      fetchSPGlobalRSS(),
      fetchRigZoneRSS(),
      fetchWorldOilRSS(),
      fetchPetroleumEconomistRSS(),
      fetchOilGasJournalRSS()
    ];
    
    const results = await Promise.allSettled(promises);
    const liveArticles: GlobalEnergyNewsArticle[] = [];
    
    const sourceNames = [
      'Reuters Business', 'AP Business', 'BBC Business', 'CNN Business', 'Yahoo Finance', 'MarketWatch',
      'Oilprice.com', 'Energy Voice', 'Upstream Online', 'Offshore Energy', 'Natural Gas Intelligence', 
      'S&P Global', 'Rigzone', 'World Oil', 'Petroleum Economist', 'Oil & Gas Journal'
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
    
    for (const item of items.slice(0, 15)) {
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

async function fetchEnergyVoiceRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Energy Voice RSS...');
    const response = await fetch('https://www.energyvoice.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Energy Voice failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 15)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        articles.push({
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Energy Voice',
          region: 'Global',
          summary: descMatch?.[1]?.replace(/<[^>]*>/g, '').trim().slice(0, 200) || ''
        });
      }
    }
    
    console.log(`✅ Energy Voice: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Energy Voice RSS fetch error:', error);
    return [];
  }
}

async function fetchUpstreamOnlineRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Upstream Online RSS...');
    const response = await fetch('https://www.upstreamonline.com/rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Upstream Online failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 15)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        articles.push({
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Upstream Online',
          region: 'Global',
          summary: descMatch?.[1]?.replace(/<[^>]*>/g, '').trim().slice(0, 200) || ''
        });
      }
    }
    
    console.log(`✅ Upstream Online: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Upstream Online RSS fetch error:', error);
    return [];
  }
}

async function fetchOffshoreEnergyRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Offshore Energy RSS...');
    const response = await fetch('https://www.offshore-energy.biz/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Offshore Energy failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 15)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        articles.push({
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Offshore Energy',
          region: 'Global',
          summary: descMatch?.[1]?.replace(/<[^>]*>/g, '').trim().slice(0, 200) || ''
        });
      }
    }
    
    console.log(`✅ Offshore Energy: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Offshore Energy RSS fetch error:', error);
    return [];
  }
}

async function fetchNaturalGasIntelRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Natural Gas Intelligence RSS...');
    const response = await fetch('https://www.naturalgasintel.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Natural Gas Intelligence failed: HTTP ${response.status}`);
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
        articles.push({
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Natural Gas Intelligence',
          region: 'Global',
          summary: descMatch?.[1]?.replace(/<[^>]*>/g, '').trim().slice(0, 200) || ''
        });
      }
    }
    
    console.log(`✅ Natural Gas Intelligence: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Natural Gas Intelligence RSS fetch error:', error);
    return [];
  }
}

async function fetchSPGlobalRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching S&P Global RSS...');
    // Try alternative: use Google News for S&P Global energy content
    const response = await fetch('https://news.google.com/rss/search?q=site:spglobal.com+energy+oil+gas&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ S&P Global search failed: HTTP ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: GlobalEnergyNewsArticle[] = [];
    
    for (const item of items.slice(0, 8)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        if (title.toLowerCase().includes('s&p') || title.toLowerCase().includes('platts')) {
          articles.push({
            title: title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'S&P Global',
            region: 'Global',
            summary: 'S&P Global energy market analysis and commodity insights'
          });
        }
      }
    }
    
    console.log(`✅ S&P Global: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ S&P Global RSS fetch error:', error);
    return [];
  }
}

async function fetchRigZoneRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Rigzone RSS...');
    const response = await fetch('https://www.rigzone.com/rss/news.asp', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Rigzone failed: HTTP ${response.status}`);
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
        articles.push({
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Rigzone',
          region: 'Global',
          summary: descMatch?.[1]?.replace(/<[^>]*>/g, '').trim().slice(0, 200) || ''
        });
      }
    }
    
    console.log(`✅ Rigzone: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Rigzone RSS fetch error:', error);
    return [];
  }
}

async function fetchWorldOilRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching World Oil RSS...');
    const response = await fetch('https://www.worldoil.com/rss/news/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ World Oil failed: HTTP ${response.status}`);
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
        articles.push({
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'World Oil',
          region: 'Global',
          summary: descMatch?.[1]?.replace(/<[^>]*>/g, '').trim().slice(0, 200) || ''
        });
      }
    }
    
    console.log(`✅ World Oil: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ World Oil RSS fetch error:', error);
    return [];
  }
}

async function fetchPetroleumEconomistRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Petroleum Economist RSS...');
    // Use Google News for PE content since direct RSS may be restricted
    const response = await fetch('https://news.google.com/rss/search?q=petroleum+economist+oil+gas+energy&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Petroleum Economist search failed: HTTP ${response.status}`);
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
        if (title.toLowerCase().includes('petroleum') || title.toLowerCase().includes('economist')) {
          articles.push({
            title: title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Petroleum Economist',
            region: 'Global',
            summary: 'Petroleum industry economic analysis and market intelligence'
          });
        }
      }
    }
    
    console.log(`✅ Petroleum Economist: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Petroleum Economist RSS fetch error:', error);
    return [];
  }
}

async function fetchOilGasJournalRSS(): Promise<GlobalEnergyNewsArticle[]> {
  try {
    console.log('🔄 Fetching Oil & Gas Journal RSS...');
    const response = await fetch('https://www.ogj.com/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ Oil & Gas Journal failed: HTTP ${response.status}`);
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
        articles.push({
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Oil & Gas Journal',
          region: 'Global',
          summary: descMatch?.[1]?.replace(/<[^>]*>/g, '').trim().slice(0, 200) || ''
        });
      }
    }
    
    console.log(`✅ Oil & Gas Journal: Found ${articles.length} articles`);
    return articles;
    
  } catch (error) {
    console.error('❌ Oil & Gas Journal RSS fetch error:', error);
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