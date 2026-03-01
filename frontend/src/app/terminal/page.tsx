'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import NewsWidget from '@/components/NewsWidget';
import YouTubeWidget from '@/components/YouTubeWidget';
import GreedFearWidget from '@/components/GreedFearWidget';
import StockWidget from '@/components/StockWidget';

// Dynamically import the map to avoid SSR issues
const WorldMap = dynamic(() => import('@/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">Loading World Map...</p>
      </div>
    </div>
  )
});

export default function TerminalPage() {
  const [selectedRegion, setSelectedRegion] = useState('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<{label: string; value: string; change: number}[]>([]);
  const [layerScrollIndex, setLayerScrollIndex] = useState(0);

  const regions = [
    { value: 'global', label: 'GLOBAL' },
    { value: 'americas', label: 'AMERICAS' },
    { value: 'europe', label: 'EUROPE' },
    { value: 'asia', label: 'ASIA' },
    { value: 'oceania', label: 'OCEANIA' },
    { value: 'africa', label: 'AFRICA' },
  ];

  const layers = [
    { id: 'geopolitical', label: 'GEOPOLITICAL ALERTS', color: '#ef4444' },
    { id: 'weather', label: 'WEATHER ALERTS', color: '#f59e0b' },
    { id: 'oil-wells', label: 'ACTIVE OIL WELLS', color: '#10b981' },
    { id: 'gas-wells', label: 'ACTIVE GAS WELLS', color: '#3b82f6' },
    { id: 'drilling-rigs', label: 'ACTIVE DRILLING RIGS', color: '#f97316' },
    { id: 'pipelines', label: 'PIPELINE ROUTES', color: '#8b5cf6' },
    { id: 'refineries', label: 'REFINERIES', color: '#06b6d4' },
    { id: 'tanker-ships', label: 'TANKER SHIPS', color: '#84cc16' },
    { id: 'shipping-lanes', label: 'SHIPPING LANES', color: '#a855f7' },
    { id: 'seismic-activity', label: 'SEISMIC ACTIVITY', color: '#dc2626' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch market data
    const fetchMarketData = async () => {
      try {
        const response = await fetch('/api/market');
        const data = await response.json();
        // Filter for WTI, Brent, and Gas
        const filtered = data.filter((item: any) => 
          item.label === 'WTI Crude' || 
          item.label === 'Brent Crude' || 
          item.label === 'Henry Hub Gas'
        );
        setMarketData(filtered);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  const maxVisibleLayers = 6; // Max layers that fit in the panel
  const canScrollUp = layerScrollIndex > 0;
  const canScrollDown = layerScrollIndex + maxVisibleLayers < layers.length;
  const visibleLayers = layers.slice(layerScrollIndex, layerScrollIndex + maxVisibleLayers);

  const scrollLayersUp = () => {
    if (canScrollUp) {
      setLayerScrollIndex(prev => Math.max(0, prev - 1));
    }
  };

  const scrollLayersDown = () => {
    if (canScrollDown) {
      setLayerScrollIndex(prev => Math.min(layers.length - maxVisibleLayers, prev + 1));
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Leaflet CSS overrides for dark theme */}
      <style jsx global>{`
        .leaflet-container {
          background: #374151 !important;
        }
        .leaflet-control-zoom a {
          background-color: #1f2937 !important;
          color: white !important;
          border-color: #4b5563 !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #374151 !important;
        }
        .leaflet-top.leaflet-left {
          top: 20px !important;
          left: 300px !important;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 2px;
        }
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        .leaflet-popup-content-wrapper {
          background: #1f2937 !important;
          color: white !important;
        }
        .leaflet-popup-tip {
          background: #1f2937 !important;
        }
      `}</style>

      {/* Header Bar */}
      <header className="bg-black border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo + Version + Region Dropdown */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/w-icon.svg" alt="W" className="w-8 h-8" />
              <span className="text-[#DAA520] text-sm font-light tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>TERMINAL</span>
            </div>

            {/* Version */}
            <span className="text-gray-400 text-sm">v1.01</span>

            {/* Region Dropdown */}
            <select 
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-gray-900 text-white border border-gray-700 rounded px-3 py-1 text-sm focus:border-[#DAA520] focus:outline-none"
            >
              {regions.map(region => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>

            {/* LIVE Button */}
            <div className="flex items-center gap-1 bg-[#DAA520] text-black px-3 py-1 rounded text-xs font-bold tracking-wider animate-pulse">
              <div className="w-2 h-2 bg-yellow-200 rounded-full"></div>
              LIVE
            </div>

            {/* Market Snapshot */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400 tracking-wider">MARKET SNAPSHOT</span>
              {marketData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-300 text-xs">{item.label.replace(' Crude', '').replace('Henry Hub ', '')}</span>
                  <span className="text-white font-mono">{item.value}</span>
                  <span className="text-xs text-[#DAA520]">
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Search + Settings */}
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-900 text-white border border-gray-700 rounded px-3 py-1 pl-9 text-sm w-64 focus:border-[#DAA520] focus:outline-none"
              />
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Settings Gear */}
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="h-[calc(100vh-73px)] relative">
        {/* Map Header with Date/Time */}
        <div className="bg-gray-800 border-b border-gray-700 py-2 px-6">
          <div className="text-center">
            <span className="text-white text-sm font-mono">
              {formatDateTime(currentTime)}
            </span>
          </div>
        </div>

        {/* Map Container - Half Height */}
        <div className="h-[50vh] bg-gray-800 relative">
          <WorldMap activeLayers={activeLayers} />

          {/* Static Layers Panel - Top Left */}
          <div 
            className="absolute top-4 left-4 w-72 border"
            style={{ 
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderColor: '#333333',
              boxShadow: '0 0 10px rgba(218, 165, 32, 0.4), 0 0 20px rgba(218, 165, 32, 0.2)',
              maxHeight: 'calc(50vh - 32px)'
            }}
          >
            {/* Scroll Up Button */}
            {canScrollUp && (
              <button
                onClick={scrollLayersUp}
                className="w-full py-1 bg-black flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}

            {/* Layers List */}
            <div className="p-4">
              <div className="space-y-3">
                {visibleLayers.map(layer => (
                  <label
                    key={layer.id}
                    className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-800 hover:bg-opacity-50 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={activeLayers.includes(layer.id)}
                      onChange={() => toggleLayer(layer.id)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
                      activeLayers.includes(layer.id) 
                        ? 'border-white bg-white' 
                        : 'border-gray-500'
                    }`}>
                      {activeLayers.includes(layer.id) && (
                        <svg className="w-2.5 h-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="text-xs tracking-wider text-gray-300" style={{ fontStretch: 'condensed' }}>
                      {layer.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Scroll Down Button */}
            {canScrollDown && (
              <button
                onClick={scrollLayersDown}
                className="w-full py-1 bg-black flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Area - Grid */}
        <div className="flex-1 bg-black p-2">
          <div className="grid grid-cols-5 grid-rows-3 gap-2 h-full">
            {/* Large YouTube Widget - spans 2x2 */}
            <div 
              className="bg-black border col-span-2 row-span-2"
              style={{ 
                margin: '5px',
                borderColor: '#333333',
                boxShadow: '0 0 10px rgba(218, 165, 32, 0.4), 0 0 20px rgba(218, 165, 32, 0.2)',
                height: '100%',
                minHeight: 0
              }}
            >
              <div className="h-full overflow-hidden">
                <YouTubeWidget />
              </div>
            </div>

            {/* Remaining widgets */}
            {Array.from({ length: 11 }, (_, i) => {
              // Skip positions that would be occupied by the large widget
              const positions = [2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14]; // Skip 0,1,5,6
              const position = positions[i];
              
              // Determine widget type based on position
              let widgetContent;
              if (position === 2) {
                widgetContent = <NewsWidget region="US" />;
              } else if (position === 3) {
                widgetContent = <NewsWidget region="RUSSIAN" />;
              } else if (position === 4) {
                widgetContent = <NewsWidget region="SOUTH AMERICAN" />;
              } else if (position === 7) {
                widgetContent = <GreedFearWidget />;
              } else if (position === 8) {
                widgetContent = <StockWidget />;
              } else {
                widgetContent = <NewsWidget region="US" />;
              }
              
              return (
                <div 
                  key={position} 
                  className="bg-black border"
                  style={{ 
                    margin: '5px',
                    borderColor: '#333333',
                    boxShadow: '0 0 10px rgba(218, 165, 32, 0.4), 0 0 20px rgba(218, 165, 32, 0.2)',
                    height: '100%',
                    minHeight: 0
                  }}
                >
                  <div className="h-full overflow-hidden">
                    {widgetContent}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}