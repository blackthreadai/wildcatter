'use client';

import { useState, useEffect } from 'react';

interface SectorDemand {
  sector: 'Aviation' | 'Trucking' | 'Shipping' | 'Rail' | 'Industrial' | 'Power Generation';
  fuelType: 'Jet Fuel' | 'Diesel' | 'Heavy Fuel Oil' | 'Natural Gas' | 'Coal' | 'Gasoline';
  currentDemand: number;
  unit: string;
  change: number;
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    yearEnd: number;
  };
  region: string;
  lastUpdated: string;
}

interface EconomicIndicator {
  name: string;
  value: number;
  change: number;
  impact: 'Positive' | 'Negative' | 'Neutral';
  description: string;
  lastUpdated: string;
}

interface GlobalFuelDemandData {
  sectorDemand: SectorDemand[];
  economicIndicators: EconomicIndicator[];
  regionalSummary: {
    region: string;
    totalDemand: number;
    change: number;
    majorDrivers: string[];
  }[];
  marketSummary: {
    globalDemand: number;
    quarterlyGrowth: number;
    yearOverYear: number;
    strongestSector: string;
    weakestSector: string;
  };
  lastUpdated: string;
}

export default function GlobalFuelDemandWidget() {
  const [data, setData] = useState<GlobalFuelDemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sectors' | 'indicators' | 'regions'>('sectors');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/global-fuel-demand');
        const demandData = await response.json();
        setData(demandData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch global fuel demand data:', error);
        
        // Fallback data
        const fallbackData: GlobalFuelDemandData = {
          sectorDemand: [
            {
              sector: 'Aviation',
              fuelType: 'Jet Fuel',
              currentDemand: 6.2,
              unit: 'million bpd',
              change: 8.5,
              forecast: {
                nextMonth: 6.4,
                nextQuarter: 6.8,
                yearEnd: 7.1
              },
              region: 'Global',
              lastUpdated: new Date().toISOString()
            }
          ],
          economicIndicators: [
            {
              name: 'US Manufacturing PMI',
              value: 52.3,
              change: 1.8,
              impact: 'Positive',
              description: 'Above 50 indicates expansion, driving fuel demand',
              lastUpdated: new Date().toISOString()
            }
          ],
          regionalSummary: [
            {
              region: 'North America',
              totalDemand: 20.8,
              change: 1.8,
              majorDrivers: ['Strong aviation recovery', 'Trucking activity']
            }
          ],
          marketSummary: {
            globalDemand: 83.4,
            quarterlyGrowth: 0.8,
            yearOverYear: 2.1,
            strongestSector: 'Aviation',
            weakestSector: 'Shipping'
          },
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 6 * 60 * 60 * 1000); // Update every 6 hours
    return () => clearInterval(interval);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Positive': return 'text-green-500';
      case 'Negative': return 'text-red-500';
      case 'Neutral': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getSectorIcon = (sector: string) => {
    switch (sector) {
      case 'Aviation': return '✈️';
      case 'Trucking': return '🚛';
      case 'Shipping': return '🚢';
      case 'Rail': return '🚂';
      case 'Industrial': return '🏭';
      case 'Power Generation': return '⚡';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL FUEL DEMAND</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL FUEL DEMAND</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL FUEL DEMAND</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0">
        {/* Market Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET SUMMARY</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Global Demand</div>
              <div className="text-white font-bold">{data.marketSummary.globalDemand.toFixed(1)} Mbpd</div>
            </div>
            <div>
              <div className="text-gray-400">YoY Growth</div>
              <div className={`font-bold ${data.marketSummary.yearOverYear >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.marketSummary.yearOverYear >= 0 ? '+' : ''}{data.marketSummary.yearOverYear.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400">Strongest Sector</div>
              <div className="text-[#DAA520] font-medium">{data.marketSummary.strongestSector}</div>
            </div>
            <div>
              <div className="text-gray-400">Weakest Sector</div>
              <div className="text-red-400 font-medium">{data.marketSummary.weakestSector}</div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-3">
          <div className="flex gap-1 text-xs">
            {[
              { id: 'sectors', label: 'Sectors' },
              { id: 'indicators', label: 'Indicators' },
              { id: 'regions', label: 'Regions' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2 py-1 rounded border transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#DAA520] text-black border-[#DAA520]'
                    : 'bg-gray-800 text-gray-300 border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'sectors' && (
          <div className="space-y-2">
            {data.sectorDemand.map((sector, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{getSectorIcon(sector.sector)}</span>
                    <div>
                      <div className="text-white text-xs font-medium">{sector.sector}</div>
                      <div className="text-gray-400 text-xs">{sector.fuelType}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      {sector.currentDemand.toFixed(1)} {sector.unit}
                    </div>
                    <div className={`text-xs font-medium ${
                      sector.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div>
                    <div className="text-gray-500">Next Month</div>
                    <div className="text-gray-300">{sector.forecast.nextMonth.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Next Quarter</div>
                    <div className="text-gray-300">{sector.forecast.nextQuarter.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Year End</div>
                    <div className="text-[#DAA520]">{sector.forecast.yearEnd.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'indicators' && (
          <div className="space-y-2">
            {data.economicIndicators.map((indicator, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-white text-xs font-medium">{indicator.name}</div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      {indicator.value.toFixed(1)}
                    </div>
                    <div className={`text-xs font-medium ${
                      indicator.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {indicator.change >= 0 ? '+' : ''}{indicator.change.toFixed(1)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className={`font-medium ${getImpactColor(indicator.impact)}`}>
                    {indicator.impact} Impact
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 mt-1">
                  {indicator.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'regions' && (
          <div className="space-y-2">
            {data.regionalSummary.map((region, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-white text-xs font-medium">{region.region}</div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      {region.totalDemand.toFixed(1)} Mbpd
                    </div>
                    <div className={`text-xs font-medium ${
                      region.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {region.change >= 0 ? '+' : ''}{region.change.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  <div className="font-medium text-[#DAA520] mb-1">Major Drivers:</div>
                  <div className="space-y-1">
                    {region.majorDrivers.map((driver, j) => (
                      <div key={j} className="text-gray-300">• {driver}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}