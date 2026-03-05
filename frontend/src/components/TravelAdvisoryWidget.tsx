'use client';

import { useState, useEffect } from 'react';

interface TravelAdvisory {
  country: string;
  level: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  lastUpdated: string;
  reason: string;
}

export default function TravelAdvisoryWidget() {
  const [advisories, setAdvisories] = useState<TravelAdvisory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTravelAdvisories = async () => {
      try {
        const response = await fetch('/api/travel-advisories');
        const data = await response.json();
        setAdvisories(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch travel advisories:', error);
        
        // Fallback data
        const fallbackAdvisories: TravelAdvisory[] = [
          {
            country: 'Iraq',
            level: 'Level 4',
            severity: 'critical',
            lastUpdated: '2026-02-21T10:00:00Z',
            reason: 'Terrorism, kidnapping'
          },
          {
            country: 'Venezuela',
            level: 'Level 4', 
            severity: 'critical',
            lastUpdated: '2026-02-21T08:30:00Z',
            reason: 'Crime, civil unrest'
          },
          {
            country: 'Nigeria',
            level: 'Level 3',
            severity: 'high',
            lastUpdated: '2026-02-21T12:15:00Z',
            reason: 'Terrorism, kidnapping'
          },
          {
            country: 'Russia',
            level: 'Level 4',
            severity: 'critical', 
            lastUpdated: '2026-02-21T14:45:00Z',
            reason: 'Armed conflict'
          }
        ];
        
        setAdvisories(fallbackAdvisories);
        setLoading(false);
      }
    };

    fetchTravelAdvisories();
    const interval = setInterval(fetchTravelAdvisories, 6 * 60 * 60 * 1000); // Update every 6 hours
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'moderate': return '#eab308';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Updated now';
    if (diffHours === 1) return 'Updated 1h ago';
    return `Updated ${diffHours}h ago`;
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">TRAVEL ADVISORIES</h3>
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
        <h3 className="text-white text-xs font-semibold tracking-wider">TRAVEL ADVISORIES</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1 overflow-y-auto">
        {advisories.map((advisory, i) => (
          <div key={advisory.country} className="border-b border-gray-700 pb-1 mb-1 last:border-b-0 last:mb-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[#DAA520] text-xs font-semibold">{advisory.country}</div>
                <div className="text-gray-400 text-xs truncate">{advisory.reason}</div>
              </div>
              <div className="text-right ml-1">
                <div 
                  className="text-xs font-semibold"
                  style={{ color: getSeverityColor(advisory.severity) }}
                >
                  {advisory.level}
                </div>
                <div className="text-gray-500 text-xs">{formatTime(advisory.lastUpdated)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}