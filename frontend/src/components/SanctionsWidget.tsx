'use client';

import { useState, useEffect } from 'react';

interface Sanction {
  target: string;
  country: string;
  sanctioningBody: string;
  type: string;
  severity: string;
  status: string;
  implementedDate: string;
  description: string;
  impact: string;
  affectedVolume: string;
  programs: string[];
}

interface OFACAction {
  title: string;
  date: string;
  url: string;
  category: string;
}

interface SanctionsData {
  sanctions: Sanction[];
  summary: {
    totalPrograms: number;
    activeSanctions: number;
    criticalImpact: number;
    affectedCountries: number;
    countries: string[];
  };
  recentActions: OFACAction[];
  lastCurated: string;
  lastUpdated: string;
  source: string;
  error?: string;
}

export default function SanctionsWidget() {
  const [data, setData] = useState<SanctionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sanctions-data');
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
        setError('Failed to fetch sanctions data');
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 8 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Comprehensive': return 'text-red-500';
      case 'Heavy': return 'text-orange-500';
      case 'Moderate': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-400';
      case 'Medium': return 'text-yellow-500';
      case 'Low': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-red-400';
      case 'Under Review': return 'text-yellow-400';
      case 'Suspended': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'Russia': '\u{1F1F7}\u{1F1FA}',
      'Iran': '\u{1F1EE}\u{1F1F7}',
      'Venezuela': '\u{1F1FB}\u{1F1EA}',
      'North Korea': '\u{1F1F0}\u{1F1F5}',
      'Syria': '\u{1F1F8}\u{1F1FE}',
    };
    return flags[country] || '';
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>SANCTIONS MONITOR</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>SANCTIONS MONITOR</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>SANCTIONS MONITOR</h3>
      </div>

      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a5568 #1a202c' }}>
        {/* Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Programs</div>
              <div className="text-white font-bold text-lg">{data.summary.totalPrograms}</div>
            </div>
            <div>
              <div className="text-gray-400">Countries</div>
              <div className="text-[#DAA520] font-bold text-lg">{data.summary.affectedCountries}</div>
            </div>
            <div>
              <div className="text-gray-400">Critical</div>
              <div className="text-red-500 font-bold text-lg">{data.summary.criticalImpact}</div>
            </div>
          </div>
        </div>

        {/* Recent OFAC Actions */}
        {data.recentActions.length > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-[#DAA520] text-xs font-bold mb-2">RECENT OFAC ACTIONS</div>
            {data.recentActions.slice(0, 5).map((action, i) => (
              <div key={i} className="mb-1.5 text-xs">
                <a
                  href={action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 leading-tight block"
                >
                  {action.title}
                </a>
                <div className="text-gray-500 text-xs">{action.date}</div>
              </div>
            ))}
          </div>
        )}

        {/* Active Sanctions */}
        <div>
          <div className="text-[#DAA520] text-xs font-bold mb-2">ENERGY SANCTIONS</div>
          {data.sanctions.map((s, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-gray-800 last:border-b-0">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-medium leading-tight">
                    {getCountryFlag(s.country)} {s.target}
                  </div>
                  <div className="text-gray-500 text-xs">{s.sanctioningBody}</div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className={`text-xs font-bold ${getStatusColor(s.status)}`}>{s.status.toUpperCase()}</div>
                  <div className={`text-xs ${getImpactColor(s.impact)}`}>{s.impact}</div>
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-tight mb-1">{s.description}</div>
              <div className="flex items-center justify-between text-xs">
                <span className={`${getSeverityColor(s.severity)}`}>{s.severity}</span>
                {s.affectedVolume && s.affectedVolume !== 'N/A' && s.affectedVolume !== 'Variable' && (
                  <span className="text-gray-400">{s.affectedVolume}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-2 text-xs text-gray-600">
          Data curated {data.lastCurated} | {data.source}
        </div>
      </div>
    </div>
  );
}
