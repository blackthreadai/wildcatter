'use client';


interface SectorDemand {
  sector: string;
  fuelType: string;
  currentDemand: number;
  unit: string;
  change: number;
  icon: string;
  region: string;
}

interface EconomicIndicator {
  name: string;
  value: number;
  change: number;
  impact: string;
  description: string;
  date: string;
}

interface RegionalData {
  region: string;
  totalDemand: number;
  unit: string;
}

interface GlobalFuelDemandData {
  sectorDemand: SectorDemand[];
  economicIndicators: EconomicIndicator[];
  regionalSummary: RegionalData[];
  marketSummary: {
    globalDemand: number;
    usDemand: number;
    weeklyChange: number;
    strongestSector: string;
    weakestSector: string;
    period: string;
    intlPeriod: string;
  };
  lastUpdated: string;
  source: string;
  error?: string;
}

export default function GlobalFuelDemandWidget() {
  const [data, setData] = useState<GlobalFuelDemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sectors' | 'indicators' | 'regions'>('sectors');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/global-fuel-demand');
        const json = await response.json();
        if (!response.ok || json.error) {
          setError(json.error || 'Failed to load data');
          setLoading(false);
          return;
        }
        setData(json);
        setError(null);
        setLoading(false);
      } catch {
        setError('Failed to fetch fuel demand data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 6 * 60 * 60 * 1000);
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

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL FUEL DEMAND</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <WidgetLoader />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL FUEL DEMAND</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-red-500 text-xs">{error || 'No data available'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL FUEL DEMAND</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* Market Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET SUMMARY</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">US Demand ({data.marketSummary.period})</div>
              <div className="text-white font-bold">{data.marketSummary.usDemand.toLocaleString()} kbd</div>
            </div>
            <div>
              <div className="text-gray-400">WoW Change</div>
              <div className={`font-bold ${data.marketSummary.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.marketSummary.weeklyChange >= 0 ? '+' : ''}{data.marketSummary.weeklyChange.toFixed(1)}%
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
          {data.marketSummary.globalDemand > 0 && (
            <div className="mt-2 text-xs">
              <span className="text-gray-400">Global Consumption ({data.marketSummary.intlPeriod}): </span>
              <span className="text-white font-bold">{data.marketSummary.globalDemand.toLocaleString()} kbd</span>
            </div>
          )}
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
                onClick={() => setActiveTab(tab.id as 'sectors' | 'indicators' | 'regions')}
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

        {/* Sectors Tab */}
        {activeTab === 'sectors' && (
          <div className="space-y-2">
            {data.sectorDemand.map((sector, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{sector.icon}</span>
                    <div>
                      <div className="text-white text-xs font-medium">{sector.sector}</div>
                      <div className="text-gray-400 text-xs">{sector.fuelType}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      {sector.currentDemand.toLocaleString()} {sector.unit}
                    </div>
                    <div className={`text-xs font-medium ${
                      sector.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(1)}% WoW
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {data.sectorDemand.length === 0 && (
              <div className="text-gray-500 text-xs text-center py-2">No sector data available</div>
            )}
          </div>
        )}

        {/* Indicators Tab */}
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
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className={`font-medium ${getImpactColor(indicator.impact)}`}>
                    {indicator.impact} Impact
                  </div>
                  <div className="text-gray-500">{indicator.date}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {indicator.description}
                </div>
              </div>
            ))}
            {data.economicIndicators.length === 0 && (
              <div className="text-gray-500 text-xs text-center py-2">No indicator data available</div>
            )}
          </div>
        )}

        {/* Regions Tab */}
        {activeTab === 'regions' && (
          <div className="space-y-2">
            {data.regionalSummary.map((region, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-white text-xs font-medium">{region.region}</div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      {region.totalDemand.toLocaleString()} {region.unit}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {data.regionalSummary.length === 0 && (
              <div className="text-gray-500 text-xs text-center py-2">No regional data available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';
