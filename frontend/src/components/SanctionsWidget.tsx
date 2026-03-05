'use client';

import { useState, useEffect } from 'react';

interface Sanction {
  target: string;
  country: string;
  sanctioningEntity: string;
  type: 'Oil Export' | 'Gas Export' | 'Equipment' | 'Technology' | 'Financial' | 'Shipping' | 'Insurance';
  severity: 'Light' | 'Moderate' | 'Heavy' | 'Comprehensive';
  status: 'Active' | 'Partial' | 'Under Review' | 'Suspended';
  implementedDate: string;
  description: string;
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  affectedVolume?: string;
  workarounds: string[];
  lastUpdated: string;
}

interface SanctionsSummary {
  totalSanctions: number;
  activeSanctions: number;
  criticalImpact: number;
  affectedCountries: number;
  majorTargets: string[];
}

interface SanctionsData {
  sanctions: Sanction[];
  summary: SanctionsSummary;
  lastUpdated: string;
}

export default function SanctionsWidget() {
  const [data, setData] = useState<SanctionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sanctions-data');
        const sanctionsData = await response.json();
        setData(sanctionsData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch sanctions data:', error);
        
        // Fallback data
        const fallbackData: SanctionsData = {
          sanctions: [
            {
              target: 'Russian Oil Exports',
              country: 'Russia',
              sanctioningEntity: 'EU, US, G7',
              type: 'Oil Export',
              severity: 'Heavy',
              status: 'Active',
              implementedDate: '2022-12-05',
              description: 'Price cap on Russian crude oil exports',
              impact: 'Critical',
              affectedVolume: '3.2M bpd',
              workarounds: ['Non-G7 tankers', 'Alternative buyers'],
              lastUpdated: new Date().toISOString()
            }
          ],
          summary: {
            totalSanctions: 1,
            activeSanctions: 1,
            criticalImpact: 1,
            affectedCountries: 1,
            majorTargets: ['Russian Oil Exports']
          },
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 8 * 60 * 60 * 1000); // Update every 8 hours
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Comprehensive': return 'text-red-500';
      case 'Heavy': return 'text-orange-500';
      case 'Moderate': return 'text-yellow-500';
      case 'Light': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-red-400';
      case 'Partial': return 'text-yellow-500';
      case 'Under Review': return 'text-blue-500';
      case 'Suspended': return 'text-gray-500';
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Oil Export': return '🛢️';
      case 'Gas Export': return '⛽';
      case 'Equipment': return '⚙️';
      case 'Technology': return '💻';
      case 'Financial': return '💰';
      case 'Shipping': return '🚢';
      case 'Insurance': return '🛡️';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>SANCTIONS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>SANCTIONS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>SANCTIONS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto">
        {/* Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Active Sanctions</div>
              <div className="text-red-400 font-bold text-lg">{data.summary.activeSanctions}</div>
            </div>
            <div>
              <div className="text-gray-400">Critical Impact</div>
              <div className="text-red-500 font-bold text-lg">{data.summary.criticalImpact}</div>
            </div>
            <div>
              <div className="text-gray-400">Countries</div>
              <div className="text-[#DAA520] font-medium">{data.summary.affectedCountries}</div>
            </div>
            <div>
              <div className="text-gray-400">Total</div>
              <div className="text-white font-medium">{data.summary.totalSanctions}</div>
            </div>
          </div>
        </div>

        {/* Sanctions List */}
        <div className="space-y-2">
          {data.sanctions.slice(0, 6).map((sanction, i) => (
            <div 
              key={i} 
              className="pb-2 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-800 hover:bg-opacity-30 p-1 rounded transition-colors"
              onClick={() => setShowDetails(showDetails === sanction.target ? null : sanction.target)}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">{getTypeIcon(sanction.type)}</span>
                  <div>
                    <div className="text-white text-xs font-medium">{sanction.target}</div>
                    <div className="text-gray-400 text-xs">{sanction.country}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold ${getStatusColor(sanction.status)}`}>
                    {sanction.status.toUpperCase()}
                  </div>
                  <div className={`text-xs font-medium ${getSeverityColor(sanction.severity)}`}>
                    {sanction.severity}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-400">
                  {sanction.sanctioningEntity}
                </div>
                <div className={`font-medium ${getImpactColor(sanction.impact)}`}>
                  {sanction.impact} Impact
                </div>
              </div>

              {sanction.affectedVolume && (
                <div className="text-xs text-[#DAA520] mt-1">
                  Volume: {sanction.affectedVolume}
                </div>
              )}

              {/* Expanded Details */}
              {showDetails === sanction.target && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-gray-300 mb-2 leading-tight">
                    {sanction.description}
                  </div>
                  
                  {sanction.workarounds.length > 0 && (
                    <div className="text-xs">
                      <div className="text-gray-400 mb-1">Workarounds:</div>
                      <div className="text-gray-300">
                        {sanction.workarounds.slice(0, 3).map((workaround, idx) => (
                          <span key={idx}>
                            {workaround}
                            {idx < sanction.workarounds.slice(0, 3).length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Implemented: {new Date(sanction.implementedDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Click hint */}
        <div className="text-xs text-gray-500 mt-3 text-center">
          Click entries for details
        </div>
      </div>
    </div>
  );
}