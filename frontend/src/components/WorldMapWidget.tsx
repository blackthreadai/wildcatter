'use client';

import { useState } from 'react';
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

interface WorldMapWidgetProps {
  initialLayers?: string[];
}

export default function WorldMapWidget({ initialLayers = ['geopolitical'] }: WorldMapWidgetProps) {
  const [activeLayers, setActiveLayers] = useState<string[]>(initialLayers);

  const layers = [
    { id: 'geopolitical', label: 'GEOPOLITICAL ALERTS', color: '#ef4444' },
    { id: 'weather', label: 'WEATHER ALERTS', color: '#ef4444' },
    { id: 'seismic-activity', label: 'SEISMIC ACTIVITY', color: '#ef4444' },
    { id: 'drilling-rigs', label: 'ACTIVE DRILLING RIGS', color: '#4ade80' },
    { id: 'pipelines', label: 'PIPELINE ROUTES', color: '#ef4444' },
    { id: 'tanker-ships', label: 'TANKER SHIPS', color: '#3b82f6' },
    { id: 'shipping-lanes', label: 'SHIPPING LANES', color: '#4ade80' },
  ];

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-semibold tracking-wider">GLOBAL ENERGY MAP</h3>
      </div>
      
      <div className="flex-1 relative min-h-0">
        {/* World Map */}
        <WorldMap activeLayers={activeLayers} />

        {/* Layer Control Panel - Left Side */}
        <div 
          className="absolute top-0 left-0 w-64 border-r flex flex-col"
          style={{ 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderColor: '#333333',
            height: '100%'
          }}
        >
          {/* Scrollable Layers List */}
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
            <div className="p-3 space-y-2">
              {layers.map(layer => (
                <label
                  key={layer.id}
                  className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-800 hover:bg-opacity-50 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={activeLayers.includes(layer.id)}
                    onChange={() => toggleLayer(layer.id)}
                    className="sr-only"
                  />
                  <div className={`w-3 h-3 border-2 rounded flex items-center justify-center transition-all ${
                    activeLayers.includes(layer.id) 
                      ? 'border-[#DAA520] bg-[#DAA520]' 
                      : 'border-gray-500'
                  }`}>
                    {activeLayers.includes(layer.id) && (
                      <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Layer Icon */}
                  {layer.id === 'drilling-rigs' ? (
                    <div className="w-3 h-3 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={layer.color} strokeWidth="2">
                        <path d="M12 3v18"/>
                        <path d="M9 3l6 0"/>
                        <path d="M10 8l4 0"/>
                        <path d="M9 3l-2 18"/>
                        <path d="M15 3l2 18"/>
                        <path d="M7 21l10 0"/>
                        <rect x="11" y="4" width="2" height="3" fill={layer.color}/>
                        <circle cx="12" cy="15" r="1" fill={layer.color}/>
                      </svg>
                    </div>
                  ) : layer.id === 'seismic-activity' ? (
                    <div className="w-3 h-3 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12l4 0 4-6 4 12 4-6 4 0" 
                              stroke={layer.color} 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : layer.id === 'weather' ? (
                    <div className="w-3 h-3 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={layer.color}>
                        <path d="M12 16l-6-8h12l-6 8z"/>
                      </svg>
                    </div>
                  ) : layer.id === 'pipelines' || layer.id === 'shipping-lanes' ? (
                    <div className="w-3 h-3 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12l20 0" stroke={layer.color} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  ) : layer.id === 'tanker-ships' ? (
                    <div className="w-3 h-3 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={layer.color} strokeWidth="2">
                        <path d="M12 2v20M2 12h20"/>
                        <path d="M6 6l12 12M18 6L6 18"/>
                        <circle cx="12" cy="12" r="1" fill={layer.color}/>
                      </svg>
                    </div>
                  ) : (
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                  )}
                  
                  <span className="text-xs tracking-wide text-gray-300" style={{ fontStretch: 'condensed' }}>
                    {layer.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}