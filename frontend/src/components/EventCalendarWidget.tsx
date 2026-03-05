'use client';

import { useState, useEffect } from 'react';

interface EnergyEvent {
  id: string;
  title: string;
  type: 'Economic Data' | 'OPEC Meeting' | 'Earnings' | 'Government Report' | 'Conference' | 'Central Bank' | 'Inventory Data';
  date: string;
  time: string;
  timezone: string;
  importance: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  expectedImpact: 'Bullish' | 'Bearish' | 'Neutral' | 'Unknown';
  affectedMarkets: string[];
  source: string;
  location?: string;
  previousValue?: string;
  forecastValue?: string;
  actualValue?: string;
  url?: string;
}

interface EventCalendarData {
  upcomingEvents: EnergyEvent[];
  todaysEvents: EnergyEvent[];
  thisWeekEvents: EnergyEvent[];
  criticalEvents: EnergyEvent[];
  marketImpactSummary: {
    highImpactCount: number;
    nextCriticalEvent: EnergyEvent | null;
    weeklyOutlook: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
  };
  lastUpdated: string;
}

export default function EventCalendarWidget() {
  const [data, setData] = useState<EventCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'critical'>('today');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/event-calendar');
        const calendarData = await response.json();
        setData(calendarData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch event calendar data:', error);
        
        // Fallback data
        const fallbackEvent: EnergyEvent = {
          id: 'eia-fallback',
          title: 'EIA Petroleum Status Report',
          type: 'Government Report',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          time: '10:30',
          timezone: 'EST',
          importance: 'High',
          description: 'Weekly U.S. petroleum inventory data',
          expectedImpact: 'Unknown',
          affectedMarkets: ['WTI', 'RBOB Gasoline'],
          source: 'EIA'
        };

        const fallbackData: EventCalendarData = {
          upcomingEvents: [fallbackEvent],
          todaysEvents: [],
          thisWeekEvents: [fallbackEvent],
          criticalEvents: [fallbackEvent],
          marketImpactSummary: {
            highImpactCount: 1,
            nextCriticalEvent: fallbackEvent,
            weeklyOutlook: 'Moderate market-moving events expected',
            riskLevel: 'Medium'
          },
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60 * 60 * 1000); // Update every hour
    return () => clearInterval(interval);
  }, []);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-yellow-500';
      case 'Low': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Bullish': return 'text-green-500';
      case 'Bearish': return 'text-red-500';
      case 'Neutral': return 'text-yellow-500';
      case 'Unknown': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Extreme': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-yellow-500';
      case 'Low': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Economic Data': return '📊';
      case 'OPEC Meeting': return '🛢️';
      case 'Earnings': return '💰';
      case 'Government Report': return '📋';
      case 'Conference': return '🎤';
      case 'Central Bank': return '🏦';
      case 'Inventory Data': return '📦';
      default: return '📅';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>EVENT CALENDAR</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>EVENT CALENDAR</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>EVENT CALENDAR</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto">
        {/* Market Impact Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">WEEKLY OUTLOOK</div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Level:</span>
              <span className={`font-bold ${getRiskColor(data.marketImpactSummary.riskLevel)}`}>
                {data.marketImpactSummary.riskLevel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">High Impact Events:</span>
              <span className="text-white">{data.marketImpactSummary.highImpactCount}</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {data.marketImpactSummary.weeklyOutlook}
          </div>
        </div>

        {/* Next Critical Event */}
        {data.marketImpactSummary.nextCriticalEvent && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-red-400 text-xs font-bold mb-2">🚨 NEXT CRITICAL EVENT</div>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">
                  {getTypeIcon(data.marketImpactSummary.nextCriticalEvent.type)}
                </span>
                <div>
                  <div className="text-white text-xs font-medium">
                    {data.marketImpactSummary.nextCriticalEvent.title}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {formatDate(data.marketImpactSummary.nextCriticalEvent.date)} at {data.marketImpactSummary.nextCriticalEvent.time} {data.marketImpactSummary.nextCriticalEvent.timezone}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="mb-3">
          <div className="flex gap-1 text-xs">
            {[
              { id: 'today', label: `Today (${data.todaysEvents.length})` },
              { id: 'week', label: `This Week (${data.thisWeekEvents.length})` },
              { id: 'critical', label: `Critical (${data.criticalEvents.length})` }
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
        </div>

        {/* Content */}
        <div className="space-y-2">
          {(() => {
            let events: EnergyEvent[] = [];
            switch (activeTab) {
              case 'today':
                events = data.todaysEvents;
                break;
              case 'week':
                events = data.thisWeekEvents;
                break;
              case 'critical':
                events = data.criticalEvents;
                break;
            }

            if (events.length === 0) {
              return (
                <div className="text-gray-500 text-xs text-center py-4">
                  No events in this category
                </div>
              );
            }

            return events.map((event, i) => (
              <div key={event.id} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{getTypeIcon(event.type)}</span>
                    <div className="flex-1">
                      <div className="text-white text-xs font-medium">{event.title}</div>
                      <div className="text-gray-400 text-xs">
                        {formatDate(event.date)} • {event.time} {event.timezone}
                      </div>
                      {event.location && (
                        <div className="text-gray-500 text-xs">📍 {event.location}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold ${getImportanceColor(event.importance)}`}>
                      {event.importance.toUpperCase()}
                    </div>
                    <div className={`text-xs ${getImpactColor(event.expectedImpact)}`}>
                      {event.expectedImpact}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-1">
                  {event.description}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-500">
                    Markets: {event.affectedMarkets.slice(0, 2).join(', ')}
                    {event.affectedMarkets.length > 2 && ' +more'}
                  </div>
                  <div className="text-gray-500">
                    {event.source}
                  </div>
                </div>

                {(event.previousValue || event.forecastValue) && (
                  <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                    {event.previousValue && (
                      <div>
                        <span className="text-gray-500">Previous: </span>
                        <span className="text-white">{event.previousValue}</span>
                      </div>
                    )}
                    {event.forecastValue && (
                      <div>
                        <span className="text-gray-500">Forecast: </span>
                        <span className="text-[#DAA520]">{event.forecastValue}</span>
                      </div>
                    )}
                  </div>
                )}

                {event.actualValue && (
                  <div className="text-xs mt-1">
                    <span className="text-gray-500">Actual: </span>
                    <span className="text-green-500 font-bold">{event.actualValue}</span>
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}