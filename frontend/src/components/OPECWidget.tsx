'use client';

import { useState, useEffect } from 'react';

interface OPECCountryData {
  country: string;
  iso: string;
  quota: number;
  production: number;
  compliance: number;
  spareCapacity: number;
  overUnder: number;
  capacity: number;
  exempt: boolean;
  period: string;
}

interface OPECMeeting {
  date: string;
  type: string;
  description: string;
}

interface OPECData {
  countries: OPECCountryData[];
  totals: {
    totalQuota: number;
    totalProduction: number;
    avgCompliance: number;
    totalSpareCapacity: number;
    quotaProduction: number;
    memberCount: number;
  };
  meetings: {
    last: OPECMeeting;
    next: OPECMeeting;
    schedule: OPECMeeting[];
  };
  lastMeeting: string;
  nextMeeting: string;
  dataSource: string;
  lastUpdated: string;
}

export default function OPECWidget() {
  const [data, setData] = useState<OPECData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'production' | 'compliance' | 'schedule'>('production');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/opec-data');
        const opecData = await response.json();
        setData(opecData);
      } catch (error) {
        console.error('Failed to fetch OPEC data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getComplianceColor = (compliance: number, exempt: boolean) => {
    if (exempt) return 'text-gray-500';
    if (compliance >= 98) return 'text-green-500';
    if (compliance >= 95) return 'text-yellow-500';
    if (compliance >= 90) return 'text-orange-500';
    return 'text-red-500';
  };

  const getComplianceLabel = (compliance: number, exempt: boolean) => {
    if (exempt) return 'EXEMPT';
    return `${compliance.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OPEC+ MONITOR</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading OPEC data...</div>
        </div>
      </div>
    );
  }

  if (!data || data.countries.length === 0) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OPEC+ MONITOR</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  const quotaCountries = data.countries.filter(c => !c.exempt);
  const exemptCountries = data.countries.filter(c => c.exempt);

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OPEC+ MONITOR</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* Summary Header */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Total Output</div>
              <div className="text-white font-medium">
                {(data.totals.totalProduction / 1000).toFixed(1)}M bpd
              </div>
            </div>
            <div>
              <div className="text-gray-400">Quota Compliance</div>
              <div className={`font-medium ${getComplianceColor(data.totals.avgCompliance, false)}`}>
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
          <div className="text-gray-600 text-[10px] mt-1">
            {data.totals.memberCount} members | Source: EIA
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-2 flex gap-1 text-xs">
          {[
            { id: 'production', label: 'Output' },
            { id: 'compliance', label: 'Compliance' },
            { id: 'schedule', label: 'Meetings' },
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

        {/* Production Tab */}
        {activeTab === 'production' && (
          <div className="space-y-1">
            {/* Header row */}
            <div className="flex items-center text-[10px] text-gray-500 mb-1 px-1">
              <div className="flex-1">Country</div>
              <div className="w-16 text-right">Output</div>
              <div className="w-16 text-right">Quota</div>
              <div className="w-14 text-right">+/-</div>
            </div>
            {data.countries.map((country, i) => (
              <div key={i} className="flex items-center text-xs py-1 px-1 border-b border-gray-800 last:border-b-0">
                <div className="flex-1">
                  <span className="text-white">{country.country}</span>
                  {country.exempt && <span className="text-gray-600 ml-1 text-[10px]">*</span>}
                </div>
                <div className="w-16 text-right text-gray-300">
                  {country.production > 0 ? `${(country.production / 1000).toFixed(1)}M` : '--'}
                </div>
                <div className="w-16 text-right text-gray-500">
                  {country.exempt ? 'N/A' : `${(country.quota / 1000).toFixed(1)}M`}
                </div>
                <div className={`w-14 text-right font-medium ${
                  country.exempt ? 'text-gray-600' :
                  country.overUnder > 50 ? 'text-red-400' :
                  country.overUnder < -50 ? 'text-green-400' :
                  'text-gray-400'
                }`}>
                  {country.exempt ? '--' :
                   country.overUnder > 0 ? `+${country.overUnder}` :
                   `${country.overUnder}`}
                </div>
              </div>
            ))}
            {exemptCountries.length > 0 && (
              <div className="text-gray-600 text-[10px] mt-2 px-1">
                * Exempt from quota (sanctions/instability)
              </div>
            )}
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-2">
            <div className="text-[#DAA520] text-xs font-bold mb-1">QUOTA COMPLIANCE</div>
            {quotaCountries.map((country, i) => (
              <div key={i} className="pb-2 border-b border-gray-800 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs">{country.country}</span>
                  <span className={`text-xs font-medium ${getComplianceColor(country.compliance, false)}`}>
                    {country.compliance.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      country.compliance >= 98 ? 'bg-green-500' :
                      country.compliance >= 95 ? 'bg-yellow-500' :
                      country.compliance >= 90 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(country.compliance, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                  <span>Spare: {(country.spareCapacity / 1000).toFixed(1)}M bpd</span>
                  <span>{country.overUnder > 0 ? 'Over' : 'Under'} by {Math.abs(country.overUnder)} kb/d</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && data.meetings && (
          <div className="space-y-2">
            <div className="text-[#DAA520] text-xs font-bold mb-1">2026 MEETING SCHEDULE</div>
            
            {/* Next meeting highlight */}
            {data.meetings.next && (
              <div className="bg-gray-800 rounded p-2 mb-2 border border-[#DAA520]/30">
                <div className="text-[#DAA520] text-[10px] font-bold mb-1">NEXT MEETING</div>
                <div className="text-white text-xs font-medium">
                  {new Date(data.meetings.next.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </div>
                <div className="text-gray-400 text-[10px]">{data.meetings.next.type}</div>
                <div className="text-gray-500 text-[10px]">{data.meetings.next.description}</div>
              </div>
            )}

            {/* Full schedule */}
            {data.meetings.schedule?.map((meeting, i) => {
              const meetingDate = new Date(meeting.date);
              const isPast = meetingDate < new Date();
              return (
                <div key={i} className={`flex items-start gap-2 text-xs pb-1 border-b border-gray-800 last:border-b-0 ${
                  isPast ? 'opacity-50' : ''
                }`}>
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                    isPast ? 'bg-gray-600' : 'bg-[#DAA520]'
                  }`}></div>
                  <div>
                    <div className="text-white">
                      {meetingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <span className="text-gray-500 ml-2">{meeting.type}</span>
                    </div>
                    <div className="text-gray-500 text-[10px]">{meeting.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
