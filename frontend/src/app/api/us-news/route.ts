import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🚀 US NEWS API: Starting RSS fetch from 5 sources');
  
  try {
    // Simple, reliable RSS fetching - no complex filtering
    const results = await Promise.allSettled([
      fetchBloombergRSS(),
      fetchOilPriceRSS(), 
      fetchCNBCRSS(),
      fetchFoxBusinessRSS(),
      fetchReutersAlternativeRSS()
    ]);
    
    let allArticles: any[] = [];
    const sources = ['Bloomberg', 'OilPrice.com', 'CNBC', 'Fox Business', 'WSJ'];
    
    // Combine all successful results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`✅ ${sources[index]}: ${result.value.length} articles`);
        allArticles.push(...result.value);
      } else {
        console.log(`❌ ${sources[index]}: Failed`);
      }
    });
    
    // Sort by date and return top 12
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    console.log(`🎯 FINAL: ${allArticles.length} articles from ${results.filter(r => r.status === 'fulfilled').length} sources`);
    
    return NextResponse.json(allArticles.slice(0, 12));
    
  } catch (error) {
    console.error('💥 US News API failed:', error);
    return NextResponse.json([], { status: 500 });
  }
}

async function fetchBloombergRSS() {
  try {
    const response = await fetch('https://feeds.bloomberg.com/markets/news.rss', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles = [];
    for (const item of items.slice(0, 4)) {
      const title = extractText(item, 'title');
      const link = extractText(item, 'link');
      const pubDate = extractText(item, 'pubDate');
      const description = extractText(item, 'description');
      
      if (title && link && pubDate) {
        articles.push({
          title: cleanText(title),
          url: link.trim(),
          publishedAt: new Date(pubDate).toISOString(),
          source: 'Bloomberg',
          summary: cleanText(description).slice(0, 150) + '...'
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ Bloomberg RSS failed:', error);
    return [];
  }
}

async function fetchOilPriceRSS() {
  try {
    const response = await fetch('https://oilprice.com/rss/main', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles = [];
    for (const item of items.slice(0, 4)) {
      const title = extractText(item, 'title');
      const link = extractText(item, 'link');
      const pubDate = extractText(item, 'pubDate');
      const description = extractText(item, 'description');
      
      if (title && link && pubDate) {
        articles.push({
          title: cleanText(title),
          url: link.trim(),
          publishedAt: new Date(pubDate).toISOString(),
          source: 'OilPrice.com',
          summary: cleanText(description).slice(0, 150) + '...'
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ OilPrice RSS failed:', error);
    return [];
  }
}

async function fetchCNBCRSS() {
  try {
    const response = await fetch('https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles = [];
    for (const item of items.slice(0, 4)) {
      const title = extractText(item, 'title');
      const link = extractText(item, 'link');
      const pubDate = extractText(item, 'pubDate');
      
      if (title && link && pubDate) {
        articles.push({
          title: cleanText(title),
          url: link.trim(),
          publishedAt: new Date(pubDate).toISOString(),
          source: 'CNBC',
          summary: 'CNBC business news'
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ CNBC RSS failed:', error);
    return [];
  }
}

async function fetchFoxBusinessRSS() {
  try {
    const response = await fetch('https://feeds.foxnews.com/foxnews/business', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles = [];
    for (const item of items.slice(0, 4)) {
      const title = extractText(item, 'title');
      const link = extractText(item, 'link');
      const pubDate = extractText(item, 'pubDate');
      
      if (title && link && pubDate) {
        articles.push({
          title: cleanText(title),
          url: link.trim(),
          publishedAt: new Date(pubDate).toISOString(),
          source: 'Fox Business',
          summary: 'Fox Business news'
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ Fox Business RSS failed:', error);
    return [];
  }
}

async function fetchReutersAlternativeRSS() {
  try {
    // Use WSJ RSS as Reuters alternative
    const response = await fetch('https://feeds.wsj.com/wsj/xml/rss/3_7085.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles = [];
    for (const item of items.slice(0, 4)) {
      const title = extractText(item, 'title');
      const link = extractText(item, 'link');
      const pubDate = extractText(item, 'pubDate');
      
      if (title && link && pubDate) {
        articles.push({
          title: cleanText(title),
          url: link.trim(),
          publishedAt: new Date(pubDate).toISOString(),
          source: 'WSJ',
          summary: 'Wall Street Journal news'
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ WSJ RSS failed:', error);
    return [];
  }
}

// Simple text extraction helper
function extractText(xml: string, tag: string): string {
  // Try CDATA first
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  if (cdataMatch) return cdataMatch[1];
  
  // Fallback to regular content
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1] : '';
}

// Clean HTML and entities
function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')  
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}