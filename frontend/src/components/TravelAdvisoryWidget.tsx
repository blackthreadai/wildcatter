'use client';


interface TravelAdvisory {
  country: string;
  level: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  lastUpdated: string;
  reason: string;
}

export default function TravelAdvisoryWidget() {
  const [advisories, setAdvisories] = useState<TravelAdvisory[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTravelAdvisories = async () => {
      try {
        const response = await fetch('/api/travel-advisories');
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setAdvisories(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch travel advisories:', error);
        setAdvisories(null);
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
    if (isNaN(date.getTime())) return dateString; // If can't parse, show raw
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">TRAVEL ADVISORIES</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <WidgetLoader />
        </div>
      </div>
    );
  }

  if (!advisories) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">TRAVEL ADVISORIES</h3>
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
        <h3 className="text-white text-xs font-semibold tracking-wider">TRAVEL ADVISORIES</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
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

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';
