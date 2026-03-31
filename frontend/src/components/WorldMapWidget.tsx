'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import WidgetLoader from '@/components/WidgetLoader';

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
        <WidgetLoader />
      </div>
    </div>
  )
});

interface AlertItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  severity: string;
  source: string;
  date: string;
  category?: string;
  type?: string;
  location?: string;
  countries?: string[];
  confidence?: number;
}

interface WorldMapWidgetProps {
  initialLayers?: string[];
}

export default function WorldMapWidget({ initialLayers = [] }: WorldMapWidgetProps) {
  const [activeLayers, setActiveLayers] = useState<string[]>(initialLayers);
  const [alertPanel, setAlertPanel] = useState<string | null>(null); // which layer's alert panel is open
  const [alertData, setAlertData] = useState<Record<string, AlertItem[]>>({});
  const [alertLoading, setAlertLoading] = useState<Record<string, boolean>>({});
  
  // Fetch alert data when panel is opened
  const fetchAlertData = useCallback(async (layerId: string) => {
    if (alertData[layerId]) return; // already loaded
    setAlertLoading(prev => ({ ...prev, [layerId]: true }));
    try {
      let url = '';
      if (layerId === 'geopolitical') url = '/api/geopolitical-events';
      else if (layerId === 'weather') url = '/api/weather-alerts';
      else if (layerId === 'seismic-activity') url = '/api/seismic-activity';
      else return;
      
      const res = await fetch(url);
      const data = await res.json();
      const items = data.events || data.alerts || [];
      setAlertData(prev => ({ ...prev, [layerId]: items }));
    } catch {
      setAlertData(prev => ({ ...prev, [layerId]: [] }));
    } finally {
      setAlertLoading(prev => ({ ...prev, [layerId]: false }));
    }
  }, [alertData]);
  
  console.log('🗺️ WorldMapWidget rendering with activeLayers:', activeLayers);

  const layers = [
    { id: 'geopolitical', label: 'GEOPOLITICAL ALERTS', color: '#ef4444' },
    { id: 'weather', label: 'WEATHER ALERTS', color: '#ef4444' },
    { id: 'seismic-activity', label: 'SEISMIC ACTIVITY', color: '#ef4444' },
    { id: 'drilling-rigs', label: 'ACTIVE DRILLING RIGS', color: '#4ade80' },
    { id: 'pipelines', label: 'PIPELINE ROUTES', color: '#ef4444' },
    { id: 'tanker-ships', label: 'TANKER SHIPS', color: '#3b82f6' },
    { id: 'shipping-lanes', label: 'SHIPPING LANES', color: '#4ade80' },
  ];

  const alertLayers = ['geopolitical', 'weather', 'seismic-activity'];
  
  const toggleLayer = (layerId: string) => {
    const isActive = activeLayers.includes(layerId);
    setActiveLayers(prev => 
      isActive 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
    
    // For alert layers: toggle the panel and fetch data
    if (alertLayers.includes(layerId)) {
      if (isActive) {
        // Turning off - close panel if it was showing this layer
        if (alertPanel === layerId) setAlertPanel(null);
      } else {
        // Turning on - open the alert panel
        setAlertPanel(layerId);
        fetchAlertData(layerId);
      }
    }
  };

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-semibold tracking-wider">GLOBAL ENERGY MAP</h3>
      </div>
      
      <div className="flex-1 relative overflow-hidden"
           style={{ height: 'calc(100% - 40px)' }}>
        {/* World Map Container - Full Size */}
        <WorldMap activeLayers={activeLayers} />

        {/* Layer Control Panel - Overlay */}
        <div 
          className="absolute top-0 left-0 w-64 border-r flex flex-col"
          style={{ 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
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

        {/* Alert List Panel - Shows when an alert layer checkbox is active */}
        {alertPanel && activeLayers.includes(alertPanel) && (
          <div 
            className="absolute top-0 left-64 w-80 border-r flex flex-col"
            style={{ 
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              borderColor: '#333333',
              height: '100%'
            }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h4 className="text-xs font-semibold tracking-wider text-white">
                {alertPanel === 'geopolitical' ? 'GEOPOLITICAL ALERTS' : 
                 alertPanel === 'weather' ? 'WEATHER ALERTS' : 'SEISMIC ACTIVITY'}
              </h4>
              <button 
                onClick={() => setAlertPanel(null)}
                className="text-gray-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            
            {/* Alert List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
              {alertLoading[alertPanel] ? (
                <div className="p-4 text-center">
                  <WidgetLoader />
                </div>
              ) : (alertData[alertPanel] || []).length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-xs">
                  No active alerts
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {(alertData[alertPanel] || []).map((alert: AlertItem) => {
                    const severityColors: Record<string, string> = {
                      critical: '#dc2626', extreme: '#dc2626',
                      high: '#ef4444', severe: '#ef4444',
                      moderate: '#f59e0b',
                      low: '#eab308'
                    };
                    const color = severityColors[alert.severity] || '#f59e0b';
                    
                    return (
                      <div 
                        key={alert.id}
                        className="p-3 hover:bg-gray-800/50 cursor-pointer transition-colors"
                        onClick={() => {
                          // Dispatch custom event to pan map to this alert
                          window.dispatchEvent(new CustomEvent('map-pan-to', { 
                            detail: { lat: alert.lat, lng: alert.lng, zoom: 5 } 
                          }));
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div 
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-200 leading-tight">
                              {alert.title}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1 leading-snug line-clamp-2">
                              {alert.description}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span 
                                className="text-[10px] font-bold uppercase"
                                style={{ color }}
                              >
                                {alert.severity}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {alert.location || alert.countries?.join(', ') || ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-600">
                                {alert.source}
                              </span>
                              <span className="text-[10px] text-gray-600">
                                {new Date(alert.date).toLocaleString(undefined, { 
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Panel Footer */}
            <div className="p-2 border-t border-gray-700 text-center">
              <span className="text-[10px] text-gray-500">
                {(alertData[alertPanel] || []).length} alert{(alertData[alertPanel] || []).length !== 1 ? 's' : ''} 
                {' '} · Click to zoom
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}