'use client';

import { useState, useEffect } from 'react';

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
        const response = await fetch(`/api/news?region=${region}`);
        const data = await response.json();
        setArticles(data.slice(0, region === 'US' ? 3 : 2)); // Show 3 articles for US, 2 for others
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch news:', error);
        // Fallback to dummy data based on region
        const fallbackData = {
          'US': [
            {
              title: "Oil Prices Rise on Supply Concerns",
              url: "#",
              publishedAt: "2026-02-21T12:00:00Z",
              source: "Reuters"
            },
            {
              title: "Natural Gas Demand Peaks in Winter",
              url: "#",
              publishedAt: "2026-02-21T11:30:00Z", 
              source: "Bloomberg"
            },
            {
              title: "Shale Production Reaches Record Highs",
              url: "#",
              publishedAt: "2026-02-21T10:45:00Z",
              source: "Energy Intelligence"
            }
          ],
          'RUSSIAN': [
            {
              title: "Gazprom Expands Arctic Gas Fields",
              url: "#",
              publishedAt: "2026-02-21T10:00:00Z",
              source: "Moscow Times"
            },
            {
              title: "Lukoil Reports Record Quarterly Profits",
              url: "#",
              publishedAt: "2026-02-21T09:30:00Z",
              source: "RT Energy"
            }
          ],
          'SOUTH AMERICAN': [
            {
              title: "Brazil's Petrobras Discovers New Offshore Oil",
              url: "#",
              publishedAt: "2026-02-21T11:00:00Z",
              source: "Latin Oil"
            },
            {
              title: "Argentina Boosts Vaca Muerta Shale Production",
              url: "#",
              publishedAt: "2026-02-21T08:45:00Z",
              source: "Energy SA"
            }
          ],
          'AFRICAN': [
            {
              title: "Nigeria's NNPC Announces New Gas Pipeline",
              url: "#",
              publishedAt: "2026-02-21T13:15:00Z",
              source: "Africa Energy"
            },
            {
              title: "Algeria Increases LNG Exports to Europe",
              url: "#",
              publishedAt: "2026-02-21T09:20:00Z",
              source: "North Africa Oil"
            },
            {
              title: "Angola Plans Offshore Wind Energy Projects",
              url: "#",
              publishedAt: "2026-02-21T15:30:00Z",
              source: "African Power"
            }
          ],
          'ASIAN': [
            {
              title: "Japan Increases Nuclear Power Capacity",
              url: "#",
              publishedAt: "2026-02-21T16:00:00Z",
              source: "Nikkei Energy"
            },
            {
              title: "India Approves New Solar Farm Projects", 
              url: "#",
              publishedAt: "2026-02-21T11:45:00Z",
              source: "Energy India"
            },
            {
              title: "Indonesia Coal Exports Hit Record High",
              url: "#",
              publishedAt: "2026-02-21T14:20:00Z",
              source: "Asian Coal Report"
            }
          ],
          'CLIMATE EXTREMES': [
            {
              title: "Record Heat Wave Impacts Global Energy Demand",
              url: "#",
              publishedAt: "2026-02-21T14:00:00Z",
              source: "Climate Central"
            },
            {
              title: "Extreme Weather Forces Pipeline Shutdowns",
              url: "#",
              publishedAt: "2026-02-21T12:15:00Z",
              source: "Environmental News"
            }
          ],
          'EUROPEAN ENERGY': [
            {
              title: "EU Approves New Renewable Energy Targets",
              url: "#",
              publishedAt: "2026-02-21T13:30:00Z",
              source: "EurActiv"
            },
            {
              title: "Norway Increases Gas Exports to Europe",
              url: "#",
              publishedAt: "2026-02-21T11:45:00Z",
              source: "Energy Monitor"
            }
          ],
          'MIDDLE EAST ENERGY': [
            {
              title: "Saudi Aramco Reports Record Quarterly Profits",
              url: "#",
              publishedAt: "2026-02-21T15:20:00Z",
              source: "Middle East Economic Survey"
            },
            {
              title: "UAE Launches Major Solar Energy Project",
              url: "#",
              publishedAt: "2026-02-21T10:30:00Z",
              source: "Gulf Business"
            }
          ],
          'PRECIOUS METALS': [
            {
              title: "Gold Prices Surge Amid Energy Market Volatility",
              url: "#",
              publishedAt: "2026-02-21T16:10:00Z",
              source: "Metals Focus"
            },
            {
              title: "Platinum Demand Rises in Green Energy Sector",
              url: "#",
              publishedAt: "2026-02-21T12:00:00Z",
              source: "Mining Weekly"
            }
          ],
          'ECONOMIC INDICATORS': [
            {
              title: "Federal Reserve Signals Interest Rate Changes Impact Energy",
              url: "#",
              publishedAt: "2026-02-21T15:45:00Z",
              source: "Federal Reserve Economic Data"
            },
            {
              title: "Inflation Data Shows Energy Price Pressures Persist",
              url: "#",
              publishedAt: "2026-02-21T13:20:00Z",
              source: "Bureau of Labor Statistics"
            }
          ],
          'CRYPTOCURRENCY': [
            {
              title: "Bitcoin Mining Energy Consumption Hits New Records",
              url: "#",
              publishedAt: "2026-02-21T14:30:00Z",
              source: "CoinDesk"
            },
            {
              title: "Crypto Markets React to Energy Cost Fluctuations",
              url: "#",
              publishedAt: "2026-02-21T11:15:00Z",
              source: "CryptoNews"
            }
          ],
          'EUROPEAN ENERGY MARKETS': [
            {
              title: "European Gas Prices Rise on Supply Chain Concerns",
              url: "#",
              publishedAt: "2026-02-21T16:45:00Z",
              source: "S&P Global Platts"
            },
            {
              title: "EU Carbon Credits Hit Multi-Year Highs",
              url: "#",
              publishedAt: "2026-02-21T12:30:00Z",
              source: "ICE Futures Europe"
            }
          ],
          'STRATEGIC RESERVE': [
            {
              title: "US Strategic Petroleum Reserve Releases 50M Barrels",
              url: "#",
              publishedAt: "2026-02-21T17:30:00Z",
              source: "Department of Energy"
            },
            {
              title: "Emergency Oil Stockpiles Hit 15-Year Low Amid Geopolitical Tensions",
              url: "#",
              publishedAt: "2026-02-21T14:45:00Z",
              source: "Energy Information Administration"
            }
          ]
        };
        const fallbackArticles = fallbackData[region] || [];
        setArticles(region === 'US' ? fallbackArticles : fallbackArticles.slice(0, 2));
        setLoading(false);
      }
    };

    fetchNews();
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

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
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
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>{title || `${region} ENERGY`}</h3>
      </div>
      <div className="flex-1 p-2 overflow-y-auto bg-black min-h-0">
        <div className="space-y-2">
        {articles.map((article, i) => (
          <div key={i} className="border-b border-gray-700 pb-1 last:border-b-0">
            <a 
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <h4 className="text-[#DAA520] text-xs leading-tight mb-1 line-clamp-2 cursor-pointer">
                {article.title}
              </h4>
            </a>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">{article.source}</span>
              <span className="text-gray-500 text-xs">{formatTime(article.publishedAt)}</span>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}