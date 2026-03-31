'use client';


interface ClimateExtreme {
  type: string;
  title: string;
  location: string;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  description: string;
  lastUpdated: string;
  source: string;
  url?: string;
}

interface ClimateData {
  events: ClimateExtreme[];
  summary: { total: number; extreme: number; high: number; moderate: number };
  lastUpdated: string;
  source: string;
}

export default function ClimateExtremesWidget() {
  const [data, setData] = useState<ClimateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/climate-extremes');
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        setData(result);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch climate extremes:', error);
        setData(null);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cyclone': return '🌀';
      case 'flood': return '🌊';
      case 'drought': return '🏜️';
      case 'wildfire': return '🔥';
      case 'extreme-heat': return '🌡️';
      case 'tornado': return '🌪️';
      case 'tsunami': return '🌊';
      case 'volcano': return '🌋';
      case 'earthquake': return '💥';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'moderate': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) return 'Ongoing';
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1d ago';
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CLIMATE EXTREMES</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <WidgetLoader />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CLIMATE EXTREMES</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CLIMATE EXTREMES</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {data.events.map((event, i) => (
          <div key={`${event.location}-${event.type}-${i}`} className="flex items-start py-1.5 border-b border-gray-700 last:border-b-0">
            <div className="flex-shrink-0 mr-2 mt-0.5">
              <span className="text-sm">{getTypeIcon(event.type)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[#DAA520] text-xs font-semibold truncate">{event.location}</div>
                  <div className="text-gray-300 text-xs leading-tight">{event.title}</div>
                  <div className="text-gray-500 text-xs truncate">{event.description}</div>
                </div>
                <div className="flex-shrink-0 ml-2 text-right">
                  <div className={`text-xs font-bold ${getSeverityColor(event.severity)}`}>
                    {event.severity.toUpperCase()}
                  </div>
                  <div className="text-gray-500 text-xs">{event.source}</div>
                  <div className="text-gray-600 text-xs">
                    {formatTimeAgo(event.lastUpdated)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';
