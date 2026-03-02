'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
  headline: string;
  time: string;
  source: string;
}

export default function YouTubeWidget() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Mock live news ticker data
    const mockNews: NewsItem[] = [
      { headline: "Oil prices surge 3% on Middle East tensions", time: "16:45", source: "Reuters" },
      { headline: "Natural gas reserves hit 5-year high in US storage", time: "16:32", source: "Bloomberg" },
      { headline: "OPEC+ considers extending production cuts through Q2", time: "16:18", source: "Financial Times" },
      { headline: "Renewable energy investments reach $2.8 trillion globally", time: "16:05", source: "IEA" },
      { headline: "Libya restores oil production to pre-crisis levels", time: "15:52", source: "Al Arabiya" },
      { headline: "Shell reports record quarterly profits from LNG operations", time: "15:39", source: "WSJ" }
    ];

    setNewsItems(mockNews);
    setLoading(false);

    // Auto-scroll through news items
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % mockNews.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">LIVE NEWS</h3>
        </div>
        <div className="flex-1 bg-black flex items-center justify-center min-h-0">
          <div className="text-gray-500 text-xs">Loading news...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-semibold tracking-wider">LIVE NEWS</h3>
      </div>
      
      <div className="flex-1 bg-black p-2 flex flex-col">
        {/* News Ticker Area */}
        <div className="bg-gray-900 rounded p-3 mb-2 flex-1 flex items-center">
          <div className="w-full">
            <div className="text-[#DAA520] text-lg font-bold mb-2">BREAKING</div>
            <div className="text-white text-sm leading-relaxed">
              {newsItems[currentIndex]?.headline}
            </div>
            <div className="text-gray-400 text-xs mt-2 flex justify-between">
              <span>{newsItems[currentIndex]?.source}</span>
              <span>{newsItems[currentIndex]?.time}</span>
            </div>
          </div>
        </div>

        {/* Live Indicator and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 text-xs font-semibold">LIVE</span>
            </div>
            <span className="text-gray-400 text-xs">Energy News Feed</span>
          </div>
          
          {/* News Dots Indicator */}
          <div className="flex gap-1">
            {newsItems.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentIndex ? 'bg-[#DAA520]' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}