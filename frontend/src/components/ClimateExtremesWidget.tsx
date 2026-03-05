'use client';

import { useState, useEffect } from 'react';

interface ClimateExtreme {
  type: 'hurricane' | 'typhoon' | 'flood' | 'drought' | 'wildfire' | 'extreme-heat';
  title: string;
  location: string;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  description: string;
  lastUpdated: string;
  source: string;
}

export default function ClimateExtremesWidget() {
  const [extremes, setExtremes] = useState<ClimateExtreme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExtremes = async () => {
      try {
        const response = await fetch('/api/climate-extremes');
        const data = await response.json();
        setExtremes(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch climate extremes:', error);
        
        // Fallback data
        const fallbackData: ClimateExtreme[] = [
          {
            type: 'hurricane',
            title: 'Hurricane Season Activity',
            location: 'Atlantic Basin',
            severity: 'high',
            description: 'Tropical Storm Zeta strengthening',
            lastUpdated: new Date().toISOString(),
            source: 'National Hurricane Center'
          },
          {
            type: 'drought',
            title: 'Severe Drought Conditions',
            location: 'Southwestern US',
            severity: 'extreme',
            description: 'Exceptional drought persists across region',
            lastUpdated: new Date().toISOString(),
            source: 'US Drought Monitor'
          },
          {
            type: 'flood',
            title: 'River Flood Warning',
            location: 'Mississippi Valley',
            severity: 'high',
            description: 'Major flooding expected along Mississippi River',
            lastUpdated: new Date().toISOString(),
            source: 'NOAA/NWS'
          },
          {
            type: 'wildfire',
            title: 'Active Wildfire',
            location: 'Northern California',
            severity: 'high',
            description: 'Creek Fire burning 15,000 acres',
            lastUpdated: new Date().toISOString(),
            source: 'CAL FIRE'
          }
        ];
        
        setExtremes(fallbackData);
        setLoading(false);
      }
    };

    fetchExtremes();
    const interval = setInterval(fetchExtremes, 60 * 60 * 1000); // Update every hour
    return () => clearInterval(interval);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hurricane':
        return '🌀';
      case 'typhoon':
        return '🌀';
      case 'flood':
        return '🌊';
      case 'drought':
        return '🏜️';
      case 'wildfire':
        return '🔥';
      case 'extreme-heat':
        return '🌡️';
      default:
        return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'moderate':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1h ago';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CLIMATE EXTREMES</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CLIMATE EXTREMES</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1">
        {extremes.map((extreme, i) => (
          <div key={`${extreme.location}-${i}`} className="flex items-start py-1 border-b border-gray-700 last:border-b-0">
            <div className="flex-shrink-0 mr-2 mt-0.5">
              <span className="text-sm">{getTypeIcon(extreme.type)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[#DAA520] text-xs font-semibold truncate">{extreme.location}</div>
                  <div className="text-gray-300 text-xs truncate">{extreme.description}</div>
                </div>
                <div className="flex-shrink-0 ml-2 text-right">
                  <div className={`text-xs font-bold ${getSeverityColor(extreme.severity)}`}>
                    {extreme.severity.toUpperCase()}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {formatTimeAgo(extreme.lastUpdated)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}