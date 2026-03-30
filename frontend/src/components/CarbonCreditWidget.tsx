'use client';

import { useState, useEffect } from 'react';

interface CarbonMarket {
  name: string;
  region: string;
  type: 'Compliance' | 'Voluntary';
  price: number;
  currency: string;
  change: number;
  percentChange: number;
  volume: number;
  marketCap: number;
  vintage: string;
  lastUpdated: string;
}

interface CarbonProject {
  id: string;
  name: string;
  type: 'Renewable Energy' | 'Forest' | 'Methane Capture' | 'Direct Air Capture' | 'Blue Carbon' | 'Soil Carbon';
  country: string;
  creditsIssued: number;
  priceRange: { min: number; max: number };
  vintage: string;
  standard: string;
  status: 'Active' | 'Under Development' | 'Completed';
  lastUpdated: string;
}

interface CarbonCreditData {
  markets: CarbonMarket[];
  projects: CarbonProject[];
  marketSummary: {
    totalMarketValue: number;
    globalVolume: number;
    avgPrice: number;
    complianceShare: number;
    voluntaryShare: number;
  };
  trends: {
    demandGrowth: number;
    priceVolatility: number;
    corporateCommitments: number;
  };
  lastUpdated: string;
}

export default function CarbonCreditWidget() {
  const [data, setData] = useState<CarbonCreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'markets' | 'projects'>('markets');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/carbon-credit');
        const carbonData = await response.json();
        setData(carbonData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch carbon credit data:', error);
        
        // Fallback data
        const fallbackData: CarbonCreditData = {
          markets: [
            {
              name: 'EU Emissions Trading System',
              region: 'European Union',
              type: 'Compliance',
              price: 85.42,
              currency: 'EUR',
              change: 2.15,
              percentChange: 2.6,
              volume: 1847.3,
              marketCap: 157.8,
              vintage: '2024',
              lastUpdated: new Date().toISOString()
            }
          ],
          projects: [],
          marketSummary: {
            totalMarketValue: 157.8,
            globalVolume: 1847.3,
            avgPrice: 85.42,
            complianceShare: 100,
            voluntaryShare: 0
          },
          trends: {
            demandGrowth: 18.5,
            priceVolatility: 12.3,
            corporateCommitments: 4287
          },
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4 * 60 * 60 * 1000); // Update every 4 hours
    return () => clearInterval(interval);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Compliance': return 'text-blue-500';
      case 'Voluntary': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'Renewable Energy': return '⚡';
      case 'Forest': return '🌳';
      case 'Methane Capture': return '💨';
      case 'Direct Air Capture': return '🏭';
      case 'Blue Carbon': return '🌊';
      case 'Soil Carbon': return '🌾';
      default: return '🟢';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-500';
      case 'Under Development': return 'text-yellow-500';
      case 'Completed': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CARBON CREDIT</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CARBON CREDIT</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CARBON CREDIT</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0">
        {/* Market Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET SUMMARY</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Market Value</div>
              <div className="text-white font-bold">${data.marketSummary.totalMarketValue.toFixed(1)}B</div>
            </div>
            <div>
              <div className="text-gray-400">Global Volume</div>
              <div className="text-[#DAA520] font-bold">{data.marketSummary.globalVolume.toFixed(0)}Mt</div>
            </div>
            <div>
              <div className="text-gray-400">Avg Price</div>
              <div className="text-white font-medium">${data.marketSummary.avgPrice.toFixed(2)}/t</div>
            </div>
            <div>
              <div className="text-gray-400">Demand Growth</div>
              <div className="text-green-500 font-medium">+{data.trends.demandGrowth.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="mt-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Compliance vs Voluntary:</span>
              <span className="text-white">
                {data.marketSummary.complianceShare.toFixed(0)}% / {data.marketSummary.voluntaryShare.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-3">
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setActiveTab('markets')}
              className={`px-2 py-1 rounded border transition-colors ${
                activeTab === 'markets'
                  ? 'bg-[#DAA520] text-black border-[#DAA520]'
                  : 'bg-gray-800 text-gray-300 border-gray-600'
              }`}
            >
              Carbon Markets
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-2 py-1 rounded border transition-colors ${
                activeTab === 'projects'
                  ? 'bg-[#DAA520] text-black border-[#DAA520]'
                  : 'bg-gray-800 text-gray-300 border-gray-600'
              }`}
            >
              Projects
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'markets' ? (
          <div className="space-y-2">
            {data.markets.map((market, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-white text-xs font-medium">{market.name}</div>
                    <div className="text-gray-400 text-xs">{market.region}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      {market.price.toFixed(2)} {market.currency}
                    </div>
                    <div className={`text-xs font-medium ${
                      market.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)} 
                      ({market.percentChange >= 0 ? '+' : ''}{market.percentChange.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className={`font-medium ${getTypeColor(market.type)}`}>
                    {market.type}
                  </div>
                  <div className="text-gray-400">
                    {market.volume.toFixed(0)}Mt • ${market.marketCap.toFixed(1)}B
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  Vintage: {market.vintage}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {data.projects.map((project, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{getProjectTypeIcon(project.type)}</span>
                    <div>
                      <div className="text-white text-xs font-medium">{project.name}</div>
                      <div className="text-gray-400 text-xs">{project.country} • {project.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold ${getStatusColor(project.status)}`}>
                      {project.status.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Credits Issued</div>
                    <div className="text-white font-medium">
                      {(project.creditsIssued / 1000000).toFixed(2)}Mt
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Price Range</div>
                    <div className="text-[#DAA520] font-medium">
                      ${project.priceRange.min.toFixed(2)}-${project.priceRange.max.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs mt-1">
                  <div className="text-gray-500">
                    {project.standard} • {project.vintage}
                  </div>
                  <div className="text-gray-500">
                    ID: {project.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trends */}
        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET TRENDS</div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Corporate Commitments:</span>
              <span className="text-white">{data.trends.corporateCommitments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Price Volatility (30d):</span>
              <span className="text-yellow-500">{data.trends.priceVolatility.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}