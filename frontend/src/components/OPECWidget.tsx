'use client';

import { useState, useEffect } from 'react';

interface OPECCountryData {
  country: string;
  quota: number;
  production: number;
  compliance: number;
  spareCapacity: number;
  lastUpdated: string;
}

interface OPECTotals {
  totalQuota: number;
  totalProduction: number;
  avgCompliance: number;
  totalSpareCapacity: number;
}

interface OPECData {
  countries: OPECCountryData[];
  totals: OPECTotals;
  lastMeeting: string;
  nextMeeting: string;
}

export default function OPECWidget() {
  const [data, setData] = useState<OPECData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/opec-data');
        const opecData = await response.json();
        setData(opecData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch OPEC data:', error);
        
        // Fallback data
        const fallbackData: OPECData = {
          countries: [
            {
              country: 'Saudi Arabia',
              quota: 11000,
              production: 10800,
              compliance: 98.2,
              spareCapacity: 2500,
              lastUpdated: new Date().toISOString()
            },
            {
              country: 'Russia',
              quota: 11500,
              production: 11200,
              compliance: 97.4,
              spareCapacity: 500,
              lastUpdated: new Date().toISOString()
            }
          ],
          totals: {
            totalQuota: 22500,
            totalProduction: 22000,
            avgCompliance: 97.8,
            totalSpareCapacity: 3000
          },
          lastMeeting: '2026-02-01',
          nextMeeting: '2026-04-01'
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 12 * 60 * 60 * 1000); // Update every 12 hours
    return () => clearInterval(interval);
  }, []);

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 98) return 'text-green-500';
    if (compliance >= 95) return 'text-yellow-500';
    if (compliance >= 90) return 'text-orange-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OPEC</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OPEC</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OPEC</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0">
        {/* Totals Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Total Production</div>
              <div className="text-white font-medium">
                {(data.totals.totalProduction / 1000).toFixed(1)}M bpd
              </div>
            </div>
            <div>
              <div className="text-gray-400">Avg Compliance</div>
              <div className={`font-medium ${getComplianceColor(data.totals.avgCompliance)}`}>
                {data.totals.avgCompliance.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400">Total Quota</div>
              <div className="text-white font-medium">
                {(data.totals.totalQuota / 1000).toFixed(1)}M bpd
              </div>
            </div>
            <div>
              <div className="text-gray-400">Spare Capacity</div>
              <div className="text-[#DAA520] font-medium">
                {(data.totals.totalSpareCapacity / 1000).toFixed(1)}M bpd
              </div>
            </div>
          </div>
        </div>

        {/* Country Details */}
        <div className="mb-3">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MEMBER PRODUCTION</div>
          {data.countries.slice(0, 6).map((country, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-white text-xs font-medium">{country.country}</div>
                <div className="text-gray-300 text-xs">
                  {(country.production / 1000).toFixed(1)}M bpd
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-400">
                  Quota: {(country.quota / 1000).toFixed(1)}M
                </div>
                <div className={`font-medium ${getComplianceColor(country.compliance)}`}>
                  {country.compliance.toFixed(1)}%
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-400">
                  Spare: {(country.spareCapacity / 1000).toFixed(1)}M
                </div>
                <div className="text-gray-500">
                  {country.compliance >= 100 ? 'Over' : 'Under'} quota
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Meeting Info */}
        <div className="text-xs">
          <div className="text-gray-400 mb-1">
            Next Meeting: <span className="text-white">{new Date(data.nextMeeting).toLocaleDateString()}</span>
          </div>
          <div className="text-gray-500">
            Last: {new Date(data.lastMeeting).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}