'use client';

import { useState, useEffect } from 'react';
import SPRChartWidget from './SPRChartWidget';

interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
}

interface NewsWidgetProps {
  region?: 'US' | 'RUSSIAN' | 'SOUTH AMERICAN' | 'AFRICAN' | 'ASIAN' | 'CLIMATE EXTREMES' | 'EUROPEAN ENERGY' | 'MIDDLE EAST ENERGY' | 'PRECIOUS METALS' | 'ECONOMIC INDICATORS' | 'CRYPTOCURRENCY' | 'EUROPEAN ENERGY MARKETS' | 'STRATEGIC RESERVE';
  title?: string;
}

export default function NewsWidget({ region = 'US', title }: NewsWidgetProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Use specialized energy news APIs for specific regions
        let apiEndpoint;
        let articleCount;
        
        if (region === 'US') {
          apiEndpoint = '/api/us-news';
          articleCount = 6;
        } else if (region === 'ASIAN') {
          apiEndpoint = '/api/asian-energy-news';
          articleCount = 5;
        } else if (region === 'SOUTH AMERICAN') {
          apiEndpoint = '/api/south-american-energy-news';
          articleCount = 5;
        } else if (region === 'RUSSIAN') {
          apiEndpoint = '/api/russian-energy-news';
          articleCount = 5;
        } else if (region === 'MIDDLE EAST ENERGY') {
          apiEndpoint = '/api/middle-east-energy-news';
          articleCount = 5;
        } else if (region === 'EUROPEAN ENERGY') {
          apiEndpoint = '/api/european-energy-news';
          articleCount = 5;
        } else if (region === 'AFRICAN') {
          apiEndpoint = '/api/african-energy-news';
          articleCount = 5;
        } else {
          apiEndpoint = `/api/news?region=${region}`;
          articleCount = 2;
        }
        
        console.log(`🚀 FETCHING NEWS FROM: ${apiEndpoint}`);
        const response = await fetch(apiEndpoint);
        console.log(`📡 RESPONSE STATUS: ${response.status}`);
        const data = await response.json();
        console.log('🗞️ NEWS DATA RECEIVED:', data.slice(0, 2)); // Debug first 2 articles
        console.log(`📊 TOTAL ARTICLES: ${data.length}`);
        setArticles(data.slice(0, articleCount));
        setLoading(false);
      } catch (error) {
        console.error('🚨 WIDGET ERROR: Failed to fetch news:', error);
        // NO FALLBACK DATA - SHOW EMPTY STATE IF REAL DATA FAILS
        setArticles([]);
        setLoading(false);
      }
    };

    fetchNews();
    
    // Set up refresh interval - more frequent for energy-focused regions
    const refreshInterval = (region === 'US' || region === 'ASIAN' || region === 'SOUTH AMERICAN' || region === 'RUSSIAN' || region === 'MIDDLE EAST ENERGY' || region === 'EUROPEAN ENERGY' || region === 'AFRICAN') ? 30 * 60 * 1000 : 35 * 60 * 1000; // 30 min for energy regions, 35 min for others
    const interval = setInterval(fetchNews, refreshInterval);
    
    return () => clearInterval(interval);
  }, [region]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  // Special handling for Strategic Reserve - show chart instead of news
  if (region === 'STRATEGIC RESERVE') {
    return <SPRChartWidget />;
  }

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>{title || `${region} ENERGY`}</h3>
        </div>
        <div className="flex-1 p-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>{title || `${region} ENERGY`}</h3>
      </div>
      <div className="flex-1 p-2 overflow-y-auto bg-black min-h-0">
        {articles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-500 text-xs">No real news available</div>
              <div className="text-gray-600 text-xs mt-1">RSS feeds temporarily unavailable</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((article, i) => (
              <div key={i} className="border-b border-gray-700 pb-1 last:border-b-0">
                <a 
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group hover:opacity-80 transition-opacity"
                >
                  <h4 className="text-[#DAA520] text-xs leading-tight mb-1 line-clamp-2 cursor-pointer">
                    {article.title}
                  </h4>
                </a>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{article.source}</span>
                  <span className="text-green-400 text-xs">{formatTime(article.publishedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}