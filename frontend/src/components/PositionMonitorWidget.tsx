'use client';

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';

interface PositionData {
  instrument: string;
  category: 'Crude Oil' | 'Natural Gas' | 'Refined Products' | 'Renewable Energy';
  longPositions: number;
  shortPositions: number;
  netPositions: number;
  openInterest: number;
  positionChange: number;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  unit: string;
  lastUpdated: string;
}

interface SentimentIndicator {
  name: string;
  value: number;
  interpretation: string;
  trend: 'Rising' | 'Falling' | 'Stable';
  lastUpdated: string;
}

interface PositionMonitorData {
  positions: PositionData[];
  traderClasses: {
    instrument: string;
    classes: {
      name: string;
      description: string;
      longPositions: number;
      shortPositions: number;
      netPositions: number;
      weeklyChange: number;
      marketShare: number;
    }[];
  }[];
  sentimentIndicators: SentimentIndicator[];
  marketSummary: {
    overallSentiment: 'Risk On' | 'Risk Off' | 'Mixed';
    specNetLong: number;
    commercialNetShort: number;
    extremePositions: string[];
  };
  lastUpdated: string;
}

export default function PositionMonitorWidget() {
  const [data, setData] = useState<PositionMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'sentiment' | 'extremes'>('positions');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/position-monitor');
        const positionData = await response.json();
        if (!response.ok || positionData.error) {
          setError(positionData.error || 'Failed to load data');
          setLoading(false);
          return;
        }
        setData(positionData);
        setError(null);
        setLoading(false);
      } catch {
        setError('Failed to fetch position monitor data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60 * 60 * 1000); // Update every hour
    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish':
      case 'Risk On':
      case 'Rising':
        return 'text-green-500';
      case 'Bearish':
      case 'Risk Off':
      case 'Falling':
        return 'text-red-500';
      case 'Neutral':
      case 'Mixed':
      case 'Stable':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish':
      case 'Risk On':
      case 'Rising':
        return '📈';
      case 'Bearish':
      case 'Risk Off':
      case 'Falling':
        return '📉';
      case 'Neutral':
      case 'Mixed':
      case 'Stable':
        return '➡️';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>POSITION MONITOR</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <WidgetLoader />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>POSITION MONITOR</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>POSITION MONITOR</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* Market Summary */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET SENTIMENT</div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Overall:</span>
              <div className={`flex items-center gap-1 font-medium ${getSentimentColor(data.marketSummary.overallSentiment)}`}>
                {getSentimentIcon(data.marketSummary.overallSentiment)}
                {data.marketSummary.overallSentiment}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Spec Net Long:</span>
              <span className="text-white">{data.marketSummary.specNetLong.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Commercial Net Short:</span>
              <span className="text-white">{data.marketSummary.commercialNetShort.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-3">
          <div className="flex gap-1 text-xs">
            {[
              { id: 'positions', label: 'Positions' },
              { id: 'sentiment', label: 'Sentiment' },
              { id: 'extremes', label: 'Extremes' }
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
        {activeTab === 'positions' && (
          <div className="space-y-2">
            {data.positions.map((position, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-white text-xs font-medium">{position.instrument}</div>
                    <div className="text-gray-400 text-xs">{position.category}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold ${getSentimentColor(position.sentiment)}`}>
                      {getSentimentIcon(position.sentiment)} {position.sentiment}
                    </div>
                    <div className={`text-xs font-medium ${
                      position.positionChange >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {position.positionChange >= 0 ? '+' : ''}{(position.positionChange / 1000).toFixed(0)}K
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Net Positions</div>
                    <div className={`font-medium ${
                      position.netPositions >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {position.netPositions >= 0 ? '+' : ''}{(position.netPositions / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Open Interest</div>
                    <div className="text-white font-medium">
                      {(position.openInterest / 1000000).toFixed(1)}M
                    </div>
                  </div>
                </div>

                {/* Position Visual */}
                <div className="mt-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-green-400">Long: {(position.longPositions / 1000).toFixed(0)}K</span>
                    <span className="text-red-400">Short: {(position.shortPositions / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="bg-gray-700 rounded-full h-1 relative">
                    <div 
                      className="bg-green-500 h-1 rounded-l-full absolute left-0"
                      style={{ width: `${(position.longPositions / (position.longPositions + position.shortPositions)) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-red-500 h-1 rounded-r-full absolute right-0"
                      style={{ width: `${(position.shortPositions / (position.longPositions + position.shortPositions)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sentiment' && (
          <div className="space-y-2">
            {data.sentimentIndicators.map((indicator, i) => (
              <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-white text-xs font-medium">{indicator.name}</div>
                  <div className="text-right">
                    <div className="text-[#DAA520] text-xs font-bold">
                      {indicator.value}
                    </div>
                    <div className={`text-xs font-medium ${getSentimentColor(indicator.trend)}`}>
                      {getSentimentIcon(indicator.trend)} {indicator.trend}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 mb-1">
                  {indicator.interpretation}
                </div>

                {/* Value Bar */}
                <div className="bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-[#DAA520] h-1 rounded-full"
                    style={{ width: `${Math.min(indicator.value, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'extremes' && (
          <div>
            <div className="text-[#DAA520] text-xs font-bold mb-2">EXTREME POSITIONS</div>
            {data.marketSummary.extremePositions.length > 0 ? (
              <div className="space-y-2">
                {data.marketSummary.extremePositions.map((instrument, i) => {
                  const position = data.positions.find(p => p.instrument === instrument);
                  if (!position) return null;

                  const extremeLevel = Math.abs(position.netPositions / position.openInterest) * 100;
                  
                  return (
                    <div key={i} className="pb-2 border-b border-gray-700 last:border-b-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-white text-xs font-medium">{instrument}</div>
                        <div className="text-right">
                          <div className="text-red-400 text-xs font-bold">
                            ⚠️ EXTREME
                          </div>
                          <div className="text-gray-400 text-xs">
                            {extremeLevel.toFixed(1)}% of OI
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        Net positions at {extremeLevel > 15 ? 'very high' : 'high'} levels - 
                        potential for position unwinding or reversal
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-xs text-center py-4">
                No extreme positions detected
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}