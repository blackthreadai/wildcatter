'use client';

import { useState, useEffect } from 'react';

interface GridData {
  region: string;
  currentLoad: number;
  peakCapacity: number;
  utilizationRate: number;
  status: 'Normal' | 'Watch' | 'Warning' | 'Emergency';
  reserves: number;
  temperature: number;
  demandForecast: string;
  lastUpdated: string;
}

interface PowerGridData {
  grids: GridData[];
  alerts: {
    region: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    message: string;
    timestamp: string;
  }[];
  lastUpdated: string;
}

export default function PowerGridStressWidget() {
  const [data, setData] = useState<PowerGridData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/power-grid-stress');
        const gridData = await response.json();
        setData(gridData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch power grid data:', error);
        
        // Fallback data
        const fallbackData: PowerGridData = {
          grids: [
            {
              region: 'ERCOT (Texas)',
              currentLoad: 68420,
              peakCapacity: 85000,
              utilizationRate: 80.5,
              status: 'Warning',
              reserves: 6580,
              temperature: 38.5,
              demandForecast: 'High',
              lastUpdated: new Date().toISOString()
            }
          ],
          alerts: [
            {
              region: 'ERCOT (Texas)',
              severity: 'High',
              message: 'High temperatures driving exceptional demand',
              timestamp: new Date().toISOString()
            }
          ],
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
          <div className="text-gray-500 text-xs">No data available</div>
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
            <div key={i} className="mb-3 pb-2 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white text-xs font-medium">{grid.region}</div>
                <div className={`text-xs font-bold ${getStatusColor(grid.status)}`}>
                  {grid.status.toUpperCase()}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <div className="text-gray-400">Current Load</div>
                  <div className="text-white font-medium">{(grid.currentLoad / 1000).toFixed(1)}K MW</div>
                </div>
                <div>
                  <div className="text-gray-400">Utilization</div>
                  <div className="text-white font-medium">{grid.utilizationRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Reserves</div>
                  <div className="text-[#DAA520] font-medium">{(grid.reserves / 1000).toFixed(1)}K MW</div>
                </div>
                <div>
                  <div className="text-gray-400">Temp</div>
                  <div className="text-white font-medium">{grid.temperature.toFixed(1)}°C</div>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Load vs Capacity</span>
                  <span className="text-gray-400">{grid.demandForecast} Demand</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUtilizationColor(grid.utilizationRate)}`}
                    style={{ width: `${Math.min(grid.utilizationRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div>
            <div className="text-[#DAA520] text-xs font-bold mb-2">GRID ALERTS</div>
            {data.alerts.map((alert, i) => (
              <div key={i} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="text-white text-xs font-medium">{alert.region}</div>
                  <div className={`text-xs font-bold ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </div>
                </div>
                <div className="text-gray-300 text-xs leading-tight mb-1">
                  {alert.message}
                </div>
                <div className="text-gray-500 text-xs">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}