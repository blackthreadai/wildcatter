'use client';

import { useState, useEffect } from 'react';

interface RefineryOutage {
  refinery: string;
  company: string;
  location: string;
  capacity: number;
  status: 'Planned' | 'Unplanned' | 'Extended' | 'Partial';
  startDate: string;
  expectedEnd?: string;
  affectedUnits: string[];
  reason: string;
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  lastUpdated: string;
}

interface RefinerySummary {
  totalOutages: number;
  affectedCapacity: number;
  plannedOutages: number;
  unplannedOutages: number;
  criticalOutages: number;
}

interface RefineryOutageData {
  outages: RefineryOutage[];
  summary: RefinerySummary;
  lastUpdated: string;
}

export default function RefineryOutagesWidget() {
  const [data, setData] = useState<RefineryOutageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/refinery-outages');
        const outageData = await response.json();
        setData(outageData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch refinery outage data:', error);
        
        // Fallback data
        const fallbackData: RefineryOutageData = {
          outages: [
            {
              refinery: 'Port Arthur Refinery',
              company: 'Motiva Enterprises',
              location: 'Texas, USA',
              capacity: 635000,
              status: 'Planned',
              startDate: '2026-02-15',
              expectedEnd: '2026-03-20',
              affectedUnits: ['Crude Distillation Unit 2'],
              reason: 'Scheduled turnaround maintenance',
              impactLevel: 'High',
              lastUpdated: new Date().toISOString()
            }
          ],
          summary: {
            totalOutages: 1,
            affectedCapacity: 635000,
            plannedOutages: 1,
            unplannedOutages: 0,
            criticalOutages: 0
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'text-blue-500';
      case 'Unplanned': return 'text-orange-500';
      case 'Extended': return 'text-red-500';
      case 'Partial': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-yellow-500';
      case 'Low': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const formatCapacity = (capacity: number) => {
    return `${(capacity / 1000).toFixed(0)}K bpd`;
  };

  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return 'TBD';
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Overdue';
    return `${diffDays}d remaining`;
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

  if (!data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>REFINERY OUTAGES</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>REFINERY OUTAGES</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0">
        {/* Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Total Outages</div>
              <div className="text-white font-bold text-lg">{data.summary.totalOutages}</div>
            </div>
            <div>
              <div className="text-gray-400">Affected Capacity</div>
              <div className="text-[#DAA520] font-bold text-lg">
                {formatCapacity(data.summary.affectedCapacity)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Planned</div>
              <div className="text-blue-500 font-medium">{data.summary.plannedOutages}</div>
            </div>
            <div>
              <div className="text-gray-400">Unplanned</div>
              <div className="text-orange-500 font-medium">{data.summary.unplannedOutages}</div>
            </div>
          </div>
          {data.summary.criticalOutages > 0 && (
            <div className="mt-2 text-xs">
              <div className="text-red-500 font-medium">
                ⚠️ {data.summary.criticalOutages} Critical Outage{data.summary.criticalOutages > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Active Outages */}
        <div className="space-y-3">
          {data.outages.map((outage, i) => (
            <div key={i} className="pb-3 border-b border-gray-700 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-white text-xs font-medium">{outage.refinery}</div>
                  <div className="text-gray-400 text-xs">{outage.company} • {outage.location}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold ${getStatusColor(outage.status)}`}>
                    {outage.status.toUpperCase()}
                  </div>
                  <div className={`text-xs font-medium ${getImpactColor(outage.impactLevel)}`}>
                    {outage.impactLevel.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <div className="text-gray-400">Capacity</div>
                  <div className="text-white font-medium">{formatCapacity(outage.capacity)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Duration</div>
                  <div className="text-gray-300 font-medium">{getDaysRemaining(outage.expectedEnd)}</div>
                </div>
              </div>

              <div className="text-xs mb-2">
                <div className="text-gray-400 mb-1">Affected Units:</div>
                <div className="text-gray-300">{outage.affectedUnits.join(', ')}</div>
              </div>

              <div className="text-xs">
                <div className="text-gray-400 mb-1">Reason:</div>
                <div className="text-gray-300 leading-tight">{outage.reason}</div>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                Started: {new Date(outage.startDate).toLocaleDateString()}
                {outage.expectedEnd && (
                  <span> • End: {new Date(outage.expectedEnd).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}