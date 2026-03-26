import { NextResponse } from 'next/server';

interface EuropeanEnergyNewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  summary?: string;
}

export async function GET() {
  console.log('🚀 EUROPEAN ENERGY NEWS API: Starting RSS fetch from 5 sources');
  
  try {
    // European energy sources with working RSS feeds - NO FALLBACK TO MOCK DATA
    const results = await Promise.allSettled([
      fetchBBCBusinessRSS(),
      fetchAPWorldNewsRSS(),
      fetchReutersBusinessRSS(), 
      fetchBloombergEuropeRSS(),
      fetchFinancialTimesRSS()
    ]);
    
    let allArticles: EuropeanEnergyNewsArticle[] = [];
    const sources = ['BBC Business', 'AP World News', 'Reuters Business', 'Bloomberg Europe', 'Financial Times'];
    
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
    console.error('💥 European Energy News API failed:', error);
    return NextResponse.json([], { status: 500 });
  }
}

async function fetchBBCBusinessRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    const response = await fetch('http://feeds.bbci.co.uk/news/business/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles: EuropeanEnergyNewsArticle[] = [];
    const energyTerms = [
      'energy', 'gas', 'oil', 'renewable', 'wind', 'solar', 'nuclear', 'pipeline',
      'lng', 'ukraine', 'russia', 'gazprom', 'equinor', 'shell', 'europe', 'european',
      'totalenergies', 'eni', 'bp', 'hydrogen', 'coal', 'power', 'electricity', 
      'grid', 'carbon', 'climate', 'emissions', 'uk', 'britain', 'germany', 'france'
    ];
    
    for (const item of items.slice(0, 20)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const content = (title + ' ' + description).toLowerCase();
        
        // Filter for European energy-related content
        if (energyTerms.some(term => content.includes(term))) {
          articles.push({
            title: title.length > 120 ? title.slice(0, 120) + '...' : title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'BBC Business',
            summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
          });
        }
      }
    }
    
    return articles.slice(0, 3);
    
  } catch (error) {
    console.error('BBC Business RSS fetch error:', error);
    return [];
  }
}

async function fetchAPWorldNewsRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    // Use AP's actual world news RSS feed (more reliable than Google News aggregation)
    const response = await fetch('https://feeds.apnews.com/rss/apf-worldnews.rss', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      // Fallback to AP business feed
      const altResponse = await fetch('https://feeds.apnews.com/rss/apf-business.rss', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!altResponse.ok) throw new Error(`HTTP ${altResponse.status}`);
      
      const xmlText = await altResponse.text();
      return parseAPRSS(xmlText);
    }
    
    const xmlText = await response.text();
    return parseAPRSS(xmlText);
    
  } catch (error) {
    console.error('AP World News RSS fetch error:', error);
    return [];
  }
}

function parseAPRSS(xmlText: string): EuropeanEnergyNewsArticle[] {
  const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  const articles: EuropeanEnergyNewsArticle[] = [];
  
  const europeanEnergyTerms = [
    'europe', 'european', 'eu ', 'germany', 'france', 'uk', 'britain', 'norway',
    'netherlands', 'italy', 'spain', 'poland', 'ukraine', 'russia', 'energy', 'gas',
    'oil', 'renewable', 'wind', 'solar', 'nuclear', 'pipeline', 'lng', 'shell',
    'bp', 'totalenergies', 'eni', 'equinor', 'gazprom', 'north sea'
  ];
  
  for (const item of items.slice(0, 25)) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
    
    if (titleMatch && linkMatch && pubDateMatch) {
      const title = titleMatch[1].trim();
      const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
      const content = (title + ' ' + description).toLowerCase();
      
      // Filter for European energy content
      if (europeanEnergyTerms.some(term => content.includes(term))) {
        articles.push({
          title: title.length > 120 ? title.slice(0, 120) + '...' : title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'AP News',
          summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
        });
      }
    }
  }
  
  return articles.slice(0, 3);
}

async function fetchReutersBusinessRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    // Use Reuters business RSS - better for energy/commodity coverage than general world
    const response = await fetch('https://feeds.reuters.com/reuters/business', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      // Fallback to Reuters environment RSS (includes energy coverage)
      const altResponse = await fetch('https://feeds.reuters.com/reuters/environment', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!altResponse.ok) throw new Error(`HTTP ${altResponse.status}`);
      
      const xmlText = await altResponse.text();
      return parseReutersRSS(xmlText);
    }
    
    const xmlText = await response.text();
    return parseReutersRSS(xmlText);
    
  } catch (error) {
    console.error('Reuters Business RSS fetch error:', error);
    return [];
  }
}

function parseReutersRSS(xmlText: string): EuropeanEnergyNewsArticle[] {
  const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  const articles: EuropeanEnergyNewsArticle[] = [];
  
  const europeanEnergyTerms = [
    'europe', 'european', 'eu ', 'germany', 'france', 'uk', 'britain', 'norway',
    'netherlands', 'italy', 'spain', 'poland', 'ukraine', 'russia', 'energy', 'gas',
    'oil', 'renewable', 'wind', 'solar', 'nuclear', 'pipeline', 'lng', 'shell',
    'bp', 'totalenergies', 'eni', 'equinor', 'gazprom', 'north sea', 'mediterranean'
  ];
  
  for (const item of items.slice(0, 25)) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
    
    if (titleMatch && linkMatch && pubDateMatch) {
      const title = titleMatch[1].trim();
      const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
      const content = (title + ' ' + description).toLowerCase();
      
      // Filter for European energy content
      if (europeanEnergyTerms.some(term => content.includes(term))) {
        articles.push({
          title: title.length > 120 ? title.slice(0, 120) + '...' : title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Reuters',
          summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
        });
      }
    }
  }
  
  return articles.slice(0, 3);
}

async function fetchBloombergEuropeRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    // Try Google News RSS specifically for European energy/business news
    const response = await fetch('https://news.google.com/rss/search?q=europe+energy+bloomberg+reuters&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      // Fallback to general European business news from Google News
      const altResponse = await fetch('https://news.google.com/rss/search?q=european+business+oil+gas&hl=en-US&gl=US&ceid=US:en', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!altResponse.ok) throw new Error(`HTTP ${altResponse.status}`);
      
      const xmlText = await altResponse.text();
      return parseBloombergRSS(xmlText);
    }
    
    const xmlText = await response.text();
    return parseBloombergRSS(xmlText);
    
  } catch (error) {
    console.error('Bloomberg Europe RSS fetch error:', error);
    return [];
  }
}

function parseBloombergRSS(xmlText: string): EuropeanEnergyNewsArticle[] {
  const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  const articles: EuropeanEnergyNewsArticle[] = [];
  
  const europeanEnergyTerms = [
    'europe', 'european', 'eu ', 'germany', 'france', 'uk', 'britain', 'norway',
    'netherlands', 'italy', 'spain', 'poland', 'ukraine', 'russia', 'energy', 'gas',
    'oil', 'renewable', 'wind', 'solar', 'nuclear', 'pipeline', 'lng', 'shell',
    'bp', 'totalenergies', 'eni', 'equinor', 'gazprom', 'north sea', 'commodity'
  ];
  
  for (const item of items.slice(0, 25)) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
    
    if (titleMatch && linkMatch && pubDateMatch) {
      const title = titleMatch[1].trim();
      const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
      const content = (title + ' ' + description).toLowerCase();
      
      // Filter for European energy content
      if (europeanEnergyTerms.some(term => content.includes(term))) {
        articles.push({
          title: title.length > 120 ? title.slice(0, 120) + '...' : title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Bloomberg Europe',
          summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
        });
      }
    }
  }
  
  return articles.slice(0, 3);
}

async function fetchFinancialTimesRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    // Use Google News RSS for Wall Street Journal content (better business coverage)
    const response = await fetch('https://news.google.com/rss/search?q=wall+street+journal+energy+europe&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      // Fallback to general energy business news
      const altResponse = await fetch('https://news.google.com/rss/search?q=financial+times+energy+oil+gas&hl=en-US&gl=US&ceid=US:en', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!altResponse.ok) throw new Error(`HTTP ${altResponse.status}`);
      
      const xmlText = await altResponse.text();
      return parseFinancialTimesRSS(xmlText);
    }
    
    const xmlText = await response.text();
    return parseFinancialTimesRSS(xmlText);
    
  } catch (error) {
    console.error('Financial Times RSS fetch error:', error);
    return [];
  }
}

function parseFinancialTimesRSS(xmlText: string): EuropeanEnergyNewsArticle[] {
  const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  const articles: EuropeanEnergyNewsArticle[] = [];
  
  const europeanEnergyTerms = [
    'europe', 'european', 'eu ', 'germany', 'france', 'uk', 'britain', 'norway',
    'netherlands', 'italy', 'spain', 'poland', 'ukraine', 'russia', 'energy', 'gas',
    'oil', 'renewable', 'wind', 'solar', 'nuclear', 'pipeline', 'lng', 'shell',
    'bp', 'totalenergies', 'eni', 'equinor', 'gazprom', 'north sea', 'commodity',
    'trading', 'futures', 'crude', 'natural gas'
  ];
  
  for (const item of items.slice(0, 25)) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
    
    if (titleMatch && linkMatch && pubDateMatch) {
      const title = titleMatch[1].trim();
      const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
      const content = (title + ' ' + description).toLowerCase();
      
      // Filter for European energy content  
      if (europeanEnergyTerms.some(term => content.includes(term))) {
        articles.push({
          title: title.length > 120 ? title.slice(0, 120) + '...' : title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Financial Times',
          summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
        });
      }
    }
  }
  
  return articles.slice(0, 2);
}