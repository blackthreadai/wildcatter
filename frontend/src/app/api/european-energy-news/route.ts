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
      fetchOilGasJournalRSS(),
      fetchFinancialTimesRSS(),
      fetchS3Global(),
      fetchYahooFinanceEuropeRSS()
    ]);
    
    let allArticles: EuropeanEnergyNewsArticle[] = [];
    const sources = ['BBC Business', 'Oil & Gas Journal', 'Financial Times', 'S&P Global', 'Yahoo Finance Europe'];
    
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

async function fetchOilGasJournalRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    const response = await fetch('https://www.ogj.com/rss/all.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: EuropeanEnergyNewsArticle[] = [];
    
    const europeanTerms = [
      'europe', 'european', 'eu ', 'norway', 'uk', 'north sea', 'germany',
      'france', 'netherlands', 'italy', 'spain', 'poland', 'denmark',
      'equinor', 'shell', 'bp', 'totalenergies', 'eni', 'gazprom', 'ukraine',
      'russia', 'lng', 'pipeline', 'mediterranean', 'baltic'
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
        if (europeanTerms.some(term => content.includes(term))) {
          articles.push({
            title: title.length > 120 ? title.slice(0, 120) + '...' : title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Oil & Gas Journal',
            summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
          });
        }
      }
    }
    
    return articles.slice(0, 3);
    
  } catch (error) {
    console.error('Oil & Gas Journal RSS fetch error:', error);
    return [];
  }
}

async function fetchFinancialTimesRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    // Try FT's general RSS (companies/markets section often has energy)
    const response = await fetch('https://www.ft.com/companies?format=rss', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: EuropeanEnergyNewsArticle[] = [];
    
    const energyTerms = [
      'energy', 'gas', 'oil', 'renewable', 'wind', 'solar', 'nuclear', 'pipeline',
      'lng', 'europe', 'european', 'eu ', 'norway', 'uk', 'germany', 'france',
      'shell', 'bp', 'totalenergies', 'eni', 'equinor', 'ukraine', 'russia'
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
        if (energyTerms.some(term => content.includes(term))) {
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
    
    return articles.slice(0, 3);
    
  } catch (error) {
    console.error('Financial Times RSS fetch error:', error);
    return [];
  }
}

async function fetchS3Global(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    // Try S&P Global Platts RSS or business feed
    const response = await fetch('https://www.spglobal.com/rss/commodity-insights-daily-news', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles: EuropeanEnergyNewsArticle[] = [];
    
    const europeanTerms = [
      'europe', 'european', 'eu ', 'germany', 'france', 'uk', 'norway',
      'netherlands', 'italy', 'spain', 'poland', 'lng', 'pipeline', 
      'ukraine', 'russia', 'gazprom', 'north sea', 'mediterranean'
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
        if (europeanTerms.some(term => content.includes(term))) {
          articles.push({
            title: title.length > 120 ? title.slice(0, 120) + '...' : title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'S&P Global',
            summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
          });
        }
      }
    }
    
    return articles.slice(0, 3);
    
  } catch (error) {
    console.error('S&P Global RSS fetch error:', error);
    return [];
  }
}

async function fetchYahooFinanceEuropeRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    // Try Yahoo Finance business RSS - often has European energy coverage
    const response = await fetch('https://feeds.finance.yahoo.com/rss/2.0/headline?s=^FTSE,^GDAXI,^FCHI&region=EU&lang=en-EU', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      // Fallback to general Yahoo Finance RSS
      const altResponse = await fetch('https://finance.yahoo.com/news/rssindex', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!altResponse.ok) throw new Error(`HTTP ${altResponse.status}`);
      
      const xmlText = await altResponse.text();
      return parseYahooRSS(xmlText);
    }
    
    const xmlText = await response.text();
    return parseYahooRSS(xmlText);
    
  } catch (error) {
    console.error('Yahoo Finance Europe RSS fetch error:', error);
    return [];
  }
}

function parseYahooRSS(xmlText: string): EuropeanEnergyNewsArticle[] {
  const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  const articles: EuropeanEnergyNewsArticle[] = [];
  
  const europeanEnergyTerms = [
    'europe', 'european', 'eu ', 'germany', 'france', 'uk', 'norway',
    'netherlands', 'italy', 'spain', 'energy', 'gas', 'oil', 'renewable',
    'shell', 'bp', 'totalenergies', 'eni', 'equinor', 'pipeline', 'lng'
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
          source: 'Yahoo Finance Europe',
          summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
        });
      }
    }
  }
  
  return articles.slice(0, 2);
}