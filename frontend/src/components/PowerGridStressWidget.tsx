'use client';

import { useState, useEffect } from 'react';

interface GridData {
  region: string;
  currentLoad: number;
  peakCapacity: number;
  utilizationRate: number;
  status: 'Normal' | 'Watch' | 'Warning' | 'Emergency';
  reserves: number;
  netGeneration?: number;
  forecast?: number;
  lastUpdated: string;
  dataType: string;
}

interface Alert {
  region: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  message: string;
  timestamp: string;
}

interface PowerGridData {
  grids: GridData[];
  alerts: Alert[];
  lastUpdated: string;
  source: string;
}

export default function PowerGridStressWidget() {
  const [data, setData] = useState<PowerGridData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/power-grid-stress');
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const gridData = await response.json();
        if (gridData.error) throw new Error(gridData.error);
        setData(gridData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch power grid data:', error);
        setData(null);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'text-green-500';
      case 'Watch': return 'text-yellow-500';
      case 'Warning': return 'text-orange-500';
      case 'Emergency': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 85) return 'bg-red-500';
    if (rate >= 75) return 'bg-orange-500';
    if (rate >= 65) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-yellow-500';
      case 'Low': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  const formatLoad = (mw: number) => {
    if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
    return `${mw.toLocaleString()} MW`;
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>POWER GRID STRESS</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>POWER GRID STRESS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-red-500 text-xs">Failed to load data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>POWER GRID STRESS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* Grid Status */}
        <div className="mb-3">
          {data.grids.map((grid, i) => (
            <div key={i} className="mb-2.5 pb-2 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-white text-xs font-medium">{grid.region}</div>
                <div className={`text-xs font-bold ${getStatusColor(grid.status)}`}>
                  {grid.status.toUpperCase()}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-1 text-xs mb-1.5">
                <div>
                  <div className="text-gray-500">Load</div>
                  <div className="text-white font-medium">{formatLoad(grid.currentLoad)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Utilization</div>
                  <div className="text-white font-medium">{grid.utilizationRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-gray-500">Reserves</div>
                  <div className="text-[#DAA520] font-medium">{formatLoad(Math.abs(grid.reserves))}</div>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="bg-gray-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${getUtilizationColor(grid.utilizationRate)}`}
                  style={{ width: `${Math.min(grid.utilizationRate, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div>
            <div className="text-[#DAA520] text-xs font-bold mb-2">GRID ALERTS</div>
            {data.alerts.map((alert, i) => (
              <div key={i} className="mb-1.5 pb-1.5 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between">
                  <div className="text-gray-300 text-xs leading-tight flex-1">{alert.message}</div>
                  <div className={`text-xs font-bold ml-2 ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
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
