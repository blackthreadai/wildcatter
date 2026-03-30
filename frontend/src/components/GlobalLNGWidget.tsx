'use client';

import { useState, useEffect } from 'react';

interface LNGSpotPrice {
  region: string;
  price: number;
  change: number;
  percentChange: number;
  benchmark: string;
  lastUpdated: string;
}

interface LNGTerminal {
  name: string;
  country: string;
  type: 'Export' | 'Import' | 'Both';
  capacity: number;
  utilization: number;
  status: 'Operating' | 'Under Construction' | 'Planned' | 'Maintenance';
  throughput: number;
  lastUpdated: string;
}

interface CargoFlow {
  route: string;
  volume: number;
  change: number;
  utilization: number;
  avgPrice: number;
  transitTime: number;
}

interface GlobalLNGData {
  spotPrices: LNGSpotPrice[];
  terminals: LNGTerminal[];
  cargoFlows: CargoFlow[];
  marketSummary: {
    globalCapacity: number;
    globalUtilization: number;
    totalExports: number;
    totalImports: number;
    averageSpotPrice: number;
    fleetUtilization: number;
  };
  lastUpdated: string;
}

export default function GlobalLNGWidget() {
  const [data, setData] = useState<GlobalLNGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prices' | 'terminals' | 'flows'>('prices');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/global-lng');
        const lngData = await response.json();
        setData(lngData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch global LNG data:', error);
        
        // Fallback data
        const fallbackData: GlobalLNGData = {
          spotPrices: [
            {
              region: 'Northeast Asia',
              price: 11.80,
              change: -0.45,
              percentChange: -3.7,
              benchmark: 'JKM',
              lastUpdated: new Date().toISOString()
            }
          ],
          terminals: [
            {
              name: 'Sabine Pass LNG',
              country: 'USA',
              type: 'Export',
              capacity: 30.0,
              utilization: 95.2,
              status: 'Operating',
              throughput: 28.6,
              lastUpdated: new Date().toISOString()
            }
          ],
          cargoFlows: [
            {
              route: 'US Gulf → Europe',
              volume: 45.2,
              change: 12.5,
              utilization: 78.3,
              avgPrice: 26.80,
              transitTime: 12
            }
          ],
          marketSummary: {
            globalCapacity: 150.0,
            globalUtilization: 82.5,
            totalExports: 75.0,
            totalImports: 75.0,
            averageSpotPrice: 15.85,
            fleetUtilization: 84.2
          },
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2 * 60 * 60 * 1000); // Update every 2 hours
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operating': return 'text-green-500';
      case 'Under Construction': return 'text-yellow-500';
      case 'Planned': return 'text-blue-500';
      case 'Maintenance': return 'text-orange-500';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Export': return '📤';
      case 'Import': return '📥';
      case 'Both': return '🔄';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL LNG</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL LNG</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL LNG</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0">
        {/* Market Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET SUMMARY</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Global Utilization</div>
              <div className="text-white font-bold">{data.marketSummary.globalUtilization.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Fleet Utilization</div>
              <div className="text-[#DAA520] font-bold">{data.marketSummary.fleetUtilization.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Avg Spot Price</div>
              <div className="text-white font-medium">${data.marketSummary.averageSpotPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400">Global Capacity</div>
              <div className="text-white font-medium">{data.marketSummary.globalCapacity.toFixed(1)} MTPA</div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-3">
          <div className="flex gap-1 text-xs">
            {[
              { id: 'prices', label: 'Spot Prices' },
              { id: 'terminals', label: 'Terminals' },
              { id: 'flows', label: 'Cargo Flows' }
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
        {activeTab === 'prices' && (
          <div className="space-y-2">
            {data.spotPrices.map((price, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-white text-xs font-medium">{price.region}</div>
                    <div className="text-gray-400 text-xs">{price.benchmark}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      ${price.price.toFixed(2)}
                    </div>
                    <div className={`text-xs font-medium ${
                      price.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {price.change >= 0 ? '+' : ''}{price.change.toFixed(2)} 
                      ({price.percentChange >= 0 ? '+' : ''}{price.percentChange.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'terminals' && (
          <div className="space-y-2">
            {data.terminals.map((terminal, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{getTypeIcon(terminal.type)}</span>
                    <div>
                      <div className="text-white text-xs font-medium">{terminal.name}</div>
                      <div className="text-gray-400 text-xs">{terminal.country} • {terminal.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold ${getStatusColor(terminal.status)}`}>
                      {terminal.status.replace(' ', '\n').toUpperCase()}
                    </div>
                    <div className="text-white text-xs">
                      {terminal.capacity.toFixed(1)} MTPA
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-400">
                    Throughput: {terminal.throughput.toFixed(1)} MTPA
                  </div>
                  <div className="text-[#DAA520] font-medium">
                    {terminal.utilization.toFixed(1)}% Util
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mt-1 bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-[#DAA520] h-1 rounded-full"
                    style={{ width: `${Math.min(terminal.utilization, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'flows' && (
          <div className="space-y-2">
            {data.cargoFlows.map((flow, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-white text-xs font-medium">{flow.route}</div>
                    <div className="text-gray-400 text-xs">{flow.transitTime} days transit</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">
                      {flow.volume.toFixed(1)} MTPA
                    </div>
                    <div className={`text-xs font-medium ${
                      flow.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {flow.change >= 0 ? '+' : ''}{flow.change.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-400">
                    Avg Price: ${flow.avgPrice.toFixed(2)}
                  </div>
                  <div className="text-[#DAA520] font-medium">
                    {flow.utilization.toFixed(1)}% Route Util
                  </div>
                </div>

                {/* Route Utilization Bar */}
                <div className="mt-1 bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-[#DAA520] h-1 rounded-full"
                    style={{ width: `${Math.min(flow.utilization, 100)}%` }}
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