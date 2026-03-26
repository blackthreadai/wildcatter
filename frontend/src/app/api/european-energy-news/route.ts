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
    // Simple, reliable RSS fetching from European energy sources - NO FALLBACK TO MOCK DATA
    const results = await Promise.allSettled([
      fetchEuractivRSS(),
      fetchReutersEuropeRSS(),
      fetchUpstreamOnlineRSS(),
      fetchEnergyVoiceRSS(),
      fetchNaturalGasWorldRSS()
    ]);
    
    let allArticles: EuropeanEnergyNewsArticle[] = [];
    const sources = ['Euractiv', 'Reuters Europe', 'Upstream Online', 'Energy Voice', 'Natural Gas World'];
    
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

async function fetchEuractivRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    const response = await fetch('https://www.euractiv.com/sections/energy/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles: EuropeanEnergyNewsArticle[] = [];
    const energyTerms = [
      'energy', 'gas', 'oil', 'renewable', 'wind', 'solar', 'nuclear', 'pipeline',
      'lng', 'nord stream', 'ukraine', 'russia', 'gazprom', 'equinor', 'shell',
      'totalenergies', 'eni', 'bp', 'hydrogen', 'green deal', 'coal', 'power',
      'electricity', 'grid', 'carbon', 'climate', 'emissions'
    ];
    
    for (const item of items.slice(0, 15)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        const title = titleMatch[1].trim();
        const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
        const content = (title + ' ' + description).toLowerCase();
        
        // Filter for energy-related content
        if (energyTerms.some(term => content.includes(term))) {
          articles.push({
            title: title.length > 120 ? title.slice(0, 120) + '...' : title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Euractiv',
            summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
          });
        }
      }
    }
    
    return articles.slice(0, 4);
    
  } catch (error) {
    console.error('Euractiv RSS fetch error:', error);
    return [];
  }
}

async function fetchReutersEuropeRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    const response = await fetch('https://www.reuters.com/arc/outboundfeeds/rss/tag/EU-ENERGY/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      // Try alternative Reuters business RSS
      const altResponse = await fetch('https://www.reuters.com/arc/outboundfeeds/rss/business/', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!altResponse.ok) throw new Error(`HTTP ${altResponse.status}`);
      
      const xmlText = await altResponse.text();
      return parseReutersRSS(xmlText, true); // Filter for energy content
    }
    
    const xmlText = await response.text();
    return parseReutersRSS(xmlText, false); // No filtering needed on energy-specific feed
    
  } catch (error) {
    console.error('Reuters Europe RSS fetch error:', error);
    return [];
  }
}

function parseReutersRSS(xmlText: string, filterEnergy: boolean): EuropeanEnergyNewsArticle[] {
  const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  const articles: EuropeanEnergyNewsArticle[] = [];
  
  const energyTerms = [
    'energy', 'gas', 'oil', 'renewable', 'wind', 'solar', 'nuclear', 'pipeline',
    'lng', 'europe', 'european', 'eu ', 'germany', 'france', 'uk', 'norway',
    'netherlands', 'italy', 'spain', 'poland', 'ukraine', 'russia'
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
      
      if (!filterEnergy || energyTerms.some(term => content.includes(term))) {
        articles.push({
          title: title.length > 120 ? title.slice(0, 120) + '...' : title,
          url: linkMatch[1].trim(),
          publishedAt: new Date(pubDateMatch[1]).toISOString(),
          source: 'Reuters Europe',
          summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
        });
      }
    }
  }
  
  return articles.slice(0, 4);
}

async function fetchUpstreamOnlineRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    const response = await fetch('https://www.upstreamonline.com/rss', {
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
      'equinor', 'shell', 'bp', 'totalenergies', 'eni'
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
        
        // Filter for European energy content
        if (europeanTerms.some(term => content.includes(term))) {
          articles.push({
            title: title.length > 120 ? title.slice(0, 120) + '...' : title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Upstream Online',
            summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
          });
        }
      }
    }
    
    return articles.slice(0, 3);
    
  } catch (error) {
    console.error('Upstream Online RSS fetch error:', error);
    return [];
  }
}

async function fetchEnergyVoiceRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    const response = await fetch('https://www.energyvoice.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles: EuropeanEnergyNewsArticle[] = [];
    const europeanTerms = [
      'europe', 'european', 'uk', 'norway', 'north sea', 'scotland', 'offshore',
      'wind farm', 'renewable', 'equinor', 'shell', 'bp', 'ørsted', 'vattenfall'
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
        
        // Filter for European energy content
        if (europeanTerms.some(term => content.includes(term))) {
          articles.push({
            title: title.length > 120 ? title.slice(0, 120) + '...' : title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Energy Voice',
            summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
          });
        }
      }
    }
    
    return articles.slice(0, 3);
    
  } catch (error) {
    console.error('Energy Voice RSS fetch error:', error);
    return [];
  }
}

async function fetchNaturalGasWorldRSS(): Promise<EuropeanEnergyNewsArticle[]> {
  try {
    const response = await fetch('https://www.naturalgasworld.com/feed', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const articles: EuropeanEnergyNewsArticle[] = [];
    const europeanTerms = [
      'europe', 'european', 'eu ', 'germany', 'netherlands', 'italy', 'france',
      'poland', 'lng', 'pipeline', 'gazprom', 'nord stream', 'ukraine',
      'norway', 'uk', 'baltic pipe', 'tap', 'mediterranean'
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
        
        // Filter for European gas content
        if (europeanTerms.some(term => content.includes(term))) {
          articles.push({
            title: title.length > 120 ? title.slice(0, 120) + '...' : title,
            url: linkMatch[1].trim(),
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            source: 'Natural Gas World',
            summary: description.slice(0, 180) + (description.length > 180 ? '...' : '')
          });
        }
      }
    }
    
    return articles.slice(0, 3);
    
  } catch (error) {
    console.error('Natural Gas World RSS fetch error:', error);
    return [];
  }
}