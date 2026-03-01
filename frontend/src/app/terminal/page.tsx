'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

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
  const [layersOpen, setLayersOpen] = useState(false);

  const regions = [
    { value: 'global', label: 'Global' },
    { value: 'americas', label: 'Americas' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia', label: 'Asia' },
    { value: 'oceania', label: 'Oceania' },
    { value: 'africa', label: 'Africa' },
  ];

  const layers = [
    { id: 'geopolitical', label: 'GEOPOLITICAL ALERTS', color: '#ef4444' },
    { id: 'weather', label: 'WEATHER ALERTS', color: '#f59e0b' },
    { id: 'oil-wells', label: 'ACTIVE OIL WELLS', color: '#10b981' },
    { id: 'gas-wells', label: 'ACTIVE GAS WELLS', color: '#3b82f6' },
    { id: 'pipelines', label: 'PIPELINE ROUTES', color: '#8b5cf6' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
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

          {/* Layers Toggle Button - Bottom Left */}
          <div className="absolute bottom-4 left-4 z-20">
            <button
              onClick={() => setLayersOpen(!layersOpen)}
              className="bg-black bg-opacity-80 border border-gray-600 rounded-lg px-4 py-2 flex items-center gap-2 text-white hover:bg-opacity-90 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span className="text-xs tracking-wider">LAYERS</span>
            </button>
          </div>

          {/* Layers Overlay */}
          {layersOpen && (
            <div 
              className="absolute inset-0 bg-black bg-opacity-80 z-10 flex items-center justify-center"
              onClick={() => setLayersOpen(false)}
            >
              <div 
                className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white text-lg font-semibold tracking-wider">LAYERS</h3>
                  <button
                    onClick={() => setLayersOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {layers.map(layer => (
                    <label
                      key={layer.id}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={activeLayers.includes(layer.id)}
                        onChange={() => toggleLayer(layer.id)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                        activeLayers.includes(layer.id) 
                          ? 'border-white bg-white' 
                          : 'border-gray-500'
                      }`}>
                        {activeLayers.includes(layer.id) && (
                          <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm tracking-wider text-gray-300" style={{ fontStretch: 'condensed' }}>
                        {layer.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Area */}
        <div className="flex-1 bg-gray-900 p-6">
          <p className="text-gray-400 text-sm">Additional content area below map</p>
        </div>
      </div>
    </div>
  );
}