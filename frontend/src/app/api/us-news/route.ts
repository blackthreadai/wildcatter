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

export async function GET() {
  try {
    console.log('🚀 Fetching REAL energy news...');
    
    // Fetch from multiple REAL sources in parallel
    const [oilPriceArticles, energyGovArticles] = await Promise.allSettled([
      fetchOilPriceRSS(),
      fetchEnergyGovRSS()
    ]);
    
    let allArticles: any[] = [];
    
    if (oilPriceArticles.status === 'fulfilled') {
      allArticles.push(...oilPriceArticles.value);
    }
    
    if (energyGovArticles.status === 'fulfilled') {
      allArticles.push(...energyGovArticles.value);
    }
    
    // Sort by publication date (newest first)
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    console.log(`✅ Total real articles: ${allArticles.length}`);
    
    if (allArticles.length === 0) {
      console.log('❌ All RSS feeds failed - returning empty');
      return NextResponse.json([]);
    }
    
    return NextResponse.json(allArticles.slice(0, 8));
    
  } catch (error) {
    console.error('🚨 Real news API error:', error);
    return NextResponse.json([]);
  }
}