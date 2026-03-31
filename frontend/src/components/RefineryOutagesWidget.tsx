'use client';

import { useState, useEffect } from 'react';

interface RegionData {
  region: string;
  paddId: string;
  utilizationPct: number;
  prevUtilizationPct: number;
  grossInputs: number;
  prevGrossInputs: number;
  operableCapacity: number;
  period: string;
}

interface Alert {
  region: string;
  drop: number;
  currentUtil: number;
  estimatedOffline: number;
}

interface NationalData {
  utilizationPct: number;
  prevUtilizationPct: number;
  grossInputs: number;
  operableCapacity: number;
  estimatedOfflineCapacity: number;
  period: string;
}

interface RefineryData {
  national: NationalData;
  regions: RegionData[];
  alerts: Alert[];
  reportPeriod: string;
  lastUpdated: string;
  source: string;
  error?: string;
}

export default function RefineryOutagesWidget() {
  const [data, setData] = useState<RefineryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/refinery-outages');
        const json = await response.json();
        if (!response.ok || json.error) {
          setError(json.error || 'Failed to load data');
          setLoading(false);
          return;
        }
        setData(json);
        setError(null);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch refinery data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getUtilColor = (pct: number) => {
    if (pct >= 92) return 'text-green-500';
    if (pct >= 85) return 'text-yellow-500';
    if (pct >= 75) return 'text-orange-500';
    return 'text-red-500';
  };

  const getChangeColor = (change: number) => {
    if (change > 0.5) return 'text-green-500';
    if (change < -0.5) return 'text-red-500';
    return 'text-gray-400';
  };

  const formatChange = (current: number, prev: number) => {
    const diff = current - prev;
    if (Math.abs(diff) < 0.1) return '--';
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>REFINERY OUTAGES</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>REFINERY OUTAGES</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-red-500 text-xs">{error || 'No data available'}</div>
        </div>
      </div>
    );
  }

  const utilChange = data.national.utilizationPct - data.national.prevUtilizationPct;

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>REFINERY OUTAGES</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* National Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">US REFINERY UTILIZATION</div>
          <div className="flex items-end justify-between mb-1">
            <div>
              <div className={`text-2xl font-bold ${getUtilColor(data.national.utilizationPct)}`}>
                {data.national.utilizationPct > 0 ? `${data.national.utilizationPct}%` : 'N/A'}
              </div>
              <div className="text-gray-400 text-xs">of operable capacity</div>
            </div>
            <div className="text-right">
              {data.national.utilizationPct > 0 && (
                <div className={`text-sm font-medium ${getChangeColor(utilChange)}`}>
                  {formatChange(data.national.utilizationPct, data.national.prevUtilizationPct)} WoW
                </div>
              )}
              {data.national.grossInputs > 0 && (
                <div className="text-gray-400 text-xs">{data.national.grossInputs.toLocaleString()} kbd inputs</div>
              )}
            </div>
          </div>
          {data.national.estimatedOfflineCapacity > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              Est. offline capacity: <span className="text-orange-400 font-medium">{data.national.estimatedOfflineCapacity.toLocaleString()} kbd</span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-red-500 text-xs font-bold mb-1">UTILIZATION DROPS</div>
            {data.alerts.map((alert, i) => (
              <div key={i} className="text-xs mb-1">
                <span className="text-white font-medium">{alert.region}</span>
                <span className="text-red-400 ml-1">-{alert.drop}%</span>
                <span className="text-gray-400 ml-1">({alert.currentUtil}% util)</span>
                {alert.estimatedOffline > 0 && (
                  <span className="text-orange-400 ml-1">~{alert.estimatedOffline} kbd offline</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PADD Regions */}
        <div>
          <div className="text-[#DAA520] text-xs font-bold mb-2">BY REGION (PADD)</div>
          {data.regions.map((region, i) => {
            const change = region.utilizationPct - region.prevUtilizationPct;
            return (
              <div key={i} className="mb-2 pb-2 border-b border-gray-800 last:border-b-0">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-white font-medium">{region.region}</div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${getUtilColor(region.utilizationPct)}`}>
                      {region.utilizationPct > 0 ? `${region.utilizationPct}%` : 'N/A'}
                    </span>
                    {region.utilizationPct > 0 && region.prevUtilizationPct > 0 && (
                      <span className={`${getChangeColor(change)}`}>
                        {formatChange(region.utilizationPct, region.prevUtilizationPct)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
                  <span>Capacity: {region.operableCapacity.toLocaleString()} kbd</span>
                  {region.grossInputs > 0 && <span>Inputs: {region.grossInputs.toLocaleString()} kbd</span>}
                </div>
                {/* Utilization bar */}
                {region.utilizationPct > 0 && (
                  <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        region.utilizationPct >= 92 ? 'bg-green-600' :
                        region.utilizationPct >= 85 ? 'bg-yellow-600' :
                        region.utilizationPct >= 75 ? 'bg-orange-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(100, region.utilizationPct)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-2 text-xs text-gray-600">
          {data.reportPeriod && <span>Week of {data.reportPeriod}</span>}
          <span className="mx-1">|</span>
          <span>{data.source}</span>
        </div>
      </div>
    </div>
  );
}
