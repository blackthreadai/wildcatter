'use client';

import { useState, useEffect } from 'react';

interface CrackSpread {
  name: string;
  description: string;
  value: number;
  change: number;
  percentChange: number;
  unit: string;
  components: {
    crude: number;
    refined: number;
    ratio: string;
  };
  lastUpdated: string;
}

interface RefineryMargins {
  region: string;
  grossMargin: number;
  netMargin: number;
  utilization: number;
  throughput: number;
  marginChange: number;
}

interface CrackSpreadData {
  spreads: CrackSpread[];
  refineryMargins: RefineryMargins[];
  marketConditions: {
    refiningDemand: 'Weak' | 'Moderate' | 'Strong' | 'Very Strong';
    seasonalFactor: 'Low Season' | 'Building' | 'Peak Season' | 'Declining';
    inventoryStatus: 'Low' | 'Normal' | 'High' | 'Very High';
  };
  lastUpdated: string;
}

export default function CrackSpreadWidget() {
  const [data, setData] = useState<CrackSpreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'spreads' | 'margins'>('spreads');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/crack-spread');
        const crackData = await response.json();
        setData(crackData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch crack spread data:', error);
        
        // Fallback data
        const fallbackData: CrackSpreadData = {
          spreads: [
            {
              name: '3:2:1 Crack Spread',
              description: '3 barrels crude → 2 barrels gasoline + 1 barrel distillate',
              value: 28.45,
              change: 1.23,
              percentChange: 4.5,
              unit: '$/barrel',
              components: {
                crude: 73.45,
                refined: 187.32,
                ratio: '3:2:1'
              },
              lastUpdated: new Date().toISOString()
            }
          ],
          refineryMargins: [
            {
              region: 'US Gulf Coast',
              grossMargin: 32.50,
              netMargin: 18.75,
              utilization: 89.2,
              throughput: 8420,
              marginChange: 1.85
            }
          ],
          marketConditions: {
            refiningDemand: 'Strong',
            seasonalFactor: 'Building',
            inventoryStatus: 'Normal'
          },
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30 * 60 * 1000); // Update every 30 minutes
    return () => clearInterval(interval);
  }, []);

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Very Strong':
      case 'Peak Season':
      case 'Very High':
        return 'text-green-500';
      case 'Strong':
      case 'Building':
      case 'High':
        return 'text-yellow-500';
      case 'Moderate':
      case 'Normal':
        return 'text-blue-500';
      case 'Weak':
      case 'Low Season':
      case 'Low':
        return 'text-red-500';
      case 'Declining':
        return 'text-orange-500';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRACK SPREAD</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRACK SPREAD</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRACK SPREAD</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0">
        {/* Market Conditions */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET CONDITIONS</div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Refining Demand:</span>
              <span className={getConditionColor(data.marketConditions.refiningDemand)}>
                {data.marketConditions.refiningDemand}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Seasonal Factor:</span>
              <span className={getConditionColor(data.marketConditions.seasonalFactor)}>
                {data.marketConditions.seasonalFactor}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Inventory Status:</span>
              <span className={getConditionColor(data.marketConditions.inventoryStatus)}>
                {data.marketConditions.inventoryStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-3">
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setActiveTab('spreads')}
              className={`px-2 py-1 rounded border transition-colors ${
                activeTab === 'spreads'
                  ? 'bg-[#DAA520] text-black border-[#DAA520]'
                  : 'bg-gray-800 text-gray-300 border-gray-600'
              }`}
            >
              Crack Spreads
            </button>
            <button
              onClick={() => setActiveTab('margins')}
              className={`px-2 py-1 rounded border transition-colors ${
                activeTab === 'margins'
                  ? 'bg-[#DAA520] text-black border-[#DAA520]'
                  : 'bg-gray-800 text-gray-300 border-gray-600'
              }`}
            >
              Refinery Margins
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'spreads' ? (
          <div className="space-y-2">
            {data.spreads.map((spread, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-white text-xs font-medium">{spread.name}</div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      ${spread.value.toFixed(2)}
                    </div>
                    <div className={`text-xs font-medium ${
                      spread.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {spread.change >= 0 ? '+' : ''}{spread.change.toFixed(2)} 
                      ({spread.percentChange >= 0 ? '+' : ''}{spread.percentChange.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 mb-1">
                  {spread.description}
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Ratio: {spread.components.ratio}</span>
                  <span className="text-gray-400">
                    Crude: ${spread.components.crude.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {data.refineryMargins.map((margin, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-white text-xs font-medium">{margin.region}</div>
                  <div className="text-right">
                    <div className="text-[#DAA520] text-xs font-bold">
                      ${margin.grossMargin.toFixed(2)}
                    </div>
                    <div className={`text-xs font-medium ${
                      margin.marginChange >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {margin.marginChange >= 0 ? '+' : ''}{margin.marginChange.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Net Margin</div>
                    <div className={`font-medium ${
                      margin.netMargin >= 0 ? 'text-white' : 'text-red-400'
                    }`}>
                      ${margin.netMargin.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Utilization</div>
                    <div className="text-white font-medium">{margin.utilization.toFixed(1)}%</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 mt-1">
                  Throughput: {(margin.throughput / 1000).toFixed(1)}M bpd
                </div>

                {/* Utilization Bar */}
                <div className="mt-1 bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-[#DAA520] h-1 rounded-full"
                    style={{ width: `${Math.min(margin.utilization, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}