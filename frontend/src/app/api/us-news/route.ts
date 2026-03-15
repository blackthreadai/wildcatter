import { NextResponse } from 'next/server';

async function fetchOilPriceRSS() {
  try {
    console.log('🔍 Fetching OilPrice.com RSS...');
    const response = await fetch('https://oilprice.com/rss/main', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`📰 Found ${items.length} items in RSS`);
    
    const articles = [];
    for (const item of items.slice(0, 10)) {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
        const url = linkMatch[1].trim();
        const pubDate = pubDateMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim() || '';
        
        articles.push({
          title,
          url,
          publishedAt: new Date(pubDate).toISOString(),
          source: 'OilPrice.com',
          summary: description.slice(0, 200) + '...'
        });
      }
    }
    
    console.log(`✅ OilPrice.com: ${articles.length} articles extracted`);
    return articles;
    
  } catch (error) {
    console.error('❌ OilPrice RSS failed:', error);
    return [];
  }
}

async function fetchEnergyGovRSS() {
  try {
    console.log('🔍 Fetching Energy.gov RSS...');
    const response = await fetch('https://www.energy.gov/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`📰 Found ${items.length} items in Energy.gov RSS`);
    
    const articles = [];
    for (const item of items.slice(0, 5)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
        articles.push({
          title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'U.S. Dept of Energy',
          summary: 'Official U.S. energy policy and news'
        });
      }
    }
    
    console.log(`✅ Energy.gov: ${articles.length} articles extracted`);
    return articles;
    
  } catch (error) {
    console.error('❌ Energy.gov RSS failed:', error);
    return [];
  }
}

async function fetchBloombergRSS() {
  try {
    console.log('🔍 Fetching Bloomberg RSS...');
    const response = await fetch('https://feeds.bloomberg.com/markets/news.rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`📰 Found ${items.length} items in Bloomberg RSS`);
    
    const articles = [];
    for (const item of items.slice(0, 8)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim() || '';
        
        // Filter for energy/market-related content - more permissive
        if (title.toLowerCase().includes('oil') || title.toLowerCase().includes('gas') || 
            title.toLowerCase().includes('energy') || title.toLowerCase().includes('opec') ||
            title.toLowerCase().includes('market') || title.toLowerCase().includes('iran') ||
            title.toLowerCase().includes('crude') || description.toLowerCase().includes('energy') ||
            articles.length < 3) {
          
          articles.push({
            title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Bloomberg',
            summary: description.slice(0, 200) + '...'
          });
        }
      }
    }
    
    console.log(`✅ Bloomberg: ${articles.length} energy articles extracted`);
    return articles;
    
  } catch (error) {
    console.error('❌ Bloomberg RSS failed:', error);
    return [];
  }
}

async function fetchCNBCRSS() {
  try {
    console.log('🔍 Fetching CNBC RSS...');
    const response = await fetch('https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`📰 Found ${items.length} items in CNBC RSS`);
    
    const articles = [];
    for (const item of items.slice(0, 10)) {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
        
        // Take energy-related or general business news
        if (title.toLowerCase().includes('oil') || title.toLowerCase().includes('gas') || 
            title.toLowerCase().includes('energy') || articles.length < 3) {
          
          articles.push({
            title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'CNBC',
            summary: 'CNBC business and energy news'
          });
        }
      }
    }
    
    console.log(`✅ CNBC: ${articles.length} articles extracted`);
    return articles;
    
  } catch (error) {
    console.error('❌ CNBC RSS failed:', error);
    return [];
  }
}

async function fetchYahooFinanceRSS() {
  try {
    console.log('🔍 Fetching Yahoo Finance RSS...');
    const response = await fetch('https://feeds.finance.yahoo.com/rss/2.0/headline', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`📰 Found ${items.length} items in Yahoo Finance RSS`);
    
    const articles = [];
    for (const item of items.slice(0, 10)) {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
        
        // Take energy-related or market news
        if (title.toLowerCase().includes('oil') || title.toLowerCase().includes('gas') || 
            title.toLowerCase().includes('energy') || title.toLowerCase().includes('market') ||
            articles.length < 3) {
          
          articles.push({
            title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Yahoo Finance',
            summary: 'Yahoo Finance market news'
          });
        }
      }
    }
    
    console.log(`✅ Yahoo Finance: ${articles.length} articles extracted`);
    return articles;
    
  } catch (error) {
    console.error('❌ Yahoo Finance RSS failed:', error);
    return [];
  }
}

async function fetchFoxBusinessRSS() {
  try {
    console.log('🔍 Fetching Fox Business RSS...');
    const response = await fetch('https://moxie.foxnews.com/feedburner/business.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal)' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`📰 Found ${items.length} items in Fox Business RSS`);
    
    const articles = [];
    for (const item of items.slice(0, 10)) {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
        
        // Take energy-related or business news
        if (title.toLowerCase().includes('oil') || title.toLowerCase().includes('gas') || 
            title.toLowerCase().includes('energy') || title.toLowerCase().includes('market') ||
            articles.length < 3) {
          
          articles.push({
            title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Fox Business',
            summary: 'Fox Business news'
          });
        }
      }
    }
    
    console.log(`✅ Fox Business: ${articles.length} articles extracted`);
    return articles;
    
  } catch (error) {
    console.error('❌ Fox Business RSS failed:', error);
    return [];
  }
}

export async function GET() {
  try {
    console.log('🚀 Fetching REAL energy news from ALL major sources...');
    
    // Fetch from 6 major sources in parallel
    const results = await Promise.allSettled([
      fetchBloombergRSS(),
      fetchOilPriceRSS(),
      fetchCNBCRSS(),
      fetchYahooFinanceRSS(),
      fetchFoxBusinessRSS(),
      fetchEnergyGovRSS()
    ]);
    
    let allArticles: any[] = [];
    
    // Combine all successful results
    results.forEach((result, index) => {
      const sources = ['Bloomberg', 'OilPrice.com', 'CNBC', 'Yahoo Finance', 'Fox Business', 'Energy.gov'];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${sources[index]}: ${result.value.length} articles`);
        allArticles.push(...result.value);
      } else {
        console.log(`❌ ${sources[index]}: Failed`);
      }
    });
    
    // Sort by publication date (newest first)
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    console.log(`✅ Total real articles from ALL sources: ${allArticles.length}`);
    
    if (allArticles.length === 0) {
      console.log('❌ All RSS feeds failed - returning empty');
      return NextResponse.json([]);
    }
    
    // Return top 10 articles from all sources combined (widget will take 6)
    return NextResponse.json(allArticles.slice(0, 10));
    
  } catch (error) {
    console.error('🚨 Real news API error:', error);
    return NextResponse.json([]);
  }
}