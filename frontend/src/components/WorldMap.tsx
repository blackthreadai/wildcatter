'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WorldMapProps {
  activeLayers: string[];
}

export default function WorldMap({ activeLayers }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<Record<string, L.LayerGroup>>({});

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [29.0, 42.0], 
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    // Add dark mode tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Add zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    // Initialize layer groups
    const layerGroups: Record<string, L.LayerGroup> = {
      'geopolitical': L.layerGroup(),
      'weather': L.layerGroup(), 
      'seismic-activity': L.layerGroup(),
      'shipping-lanes': L.layerGroup(),
      'active-wells': L.layerGroup(),
      'drilling-rigs': L.layerGroup(),
      'refineries': L.layerGroup(),
      'pipelines': L.layerGroup(),
      'tanker-ships': L.layerGroup()
    };

    layerGroupsRef.current = layerGroups;

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle layer visibility changes (CLEAN VERSION)
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupsRef.current) return;

    const map = mapInstanceRef.current;
    const layerGroups = layerGroupsRef.current;

    // Toggle layer visibility without destroying markers
    Object.keys(layerGroups).forEach(layerId => {
      const layerGroup = layerGroups[layerId];
      
      if (activeLayers.includes(layerId)) {
        // Add layer if active and not already on map
        if (!map.hasLayer(layerGroup)) {
          layerGroup.addTo(map);
          
          // Load layer data if empty
          if (layerGroup.getLayers().length === 0) {
            loadLayerData(layerId, layerGroup);
          }
        }
      } else {
        // Remove layer if inactive
        if (map.hasLayer(layerGroup)) {
          map.removeLayer(layerGroup);
        }
      }
    });
  }, [activeLayers]);

  // Load data for specific layer (SEPARATED LOGIC)
  const loadLayerData = async (layerId: string, layerGroup: L.LayerGroup) => {
    if (!mapInstanceRef.current) return;

    switch (layerId) {
      case 'geopolitical':
        await loadGeopoliticalData(layerGroup);
        break;
      case 'weather':
        await loadWeatherData(layerGroup);
        break;
      case 'seismic-activity':
        await loadSeismicData(layerGroup);
        break;
      case 'shipping-lanes':
        loadShippingLanes(layerGroup);
        break;
      case 'active-wells':
        loadActiveWells(layerGroup);
        break;
      case 'drilling-rigs':
        loadDrillingRigs(layerGroup);
        break;
      case 'refineries':
        loadRefineries(layerGroup);
        break;
      case 'pipelines':
        loadPipelines(layerGroup);
        break;
      case 'tanker-ships':
        loadTankerShips(layerGroup);
        break;
    }
  };

  // GEOPOLITICAL DATA LOADER
  const loadGeopoliticalData = async (layerGroup: L.LayerGroup) => {
    try {
      const response = await fetch('/api/geopolitical-events');
      const data = await response.json();
      const events = data.events || [];

      events.forEach((event: any) => {
        let color = '#ef4444';
        let pulseAnimation = '';
        
        switch (event.severity) {
          case 'critical':
            color = '#dc2626';
            pulseAnimation = 'animation: pulse 1s infinite;';
            break;
          case 'high':
            color = '#ef4444';
            pulseAnimation = 'animation: pulse 2s infinite;';
            break;
          case 'moderate':
            color = '#f59e0b';
            break;
          case 'low':
            color = '#eab308';
            break;
        }
        
        const categoryEmojis: {[key: string]: string} = {
          pipeline: '🛢️', naval: '⚓', sanctions: '🚫', 
          facility: '🏭', conflict: '⚔️', protest: '✊', general: '📢'
        };
        
        const alertIcon = L.divIcon({
          html: `<div style="width: 12px; height: 12px; background-color: ${color}; border: 2px solid #b91c1c; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.3); ${pulseAnimation}"></div>`,
          className: 'geopolitical-alert',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const marker = L.marker([event.lat, event.lng], { icon: alertIcon });
        
        const popupContent = `
          <div style="min-width: 220px;">
            <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px; font-weight: bold;">
              ${categoryEmojis[event.category] || '📢'} ${event.title}
            </h4>
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #DAA520; line-height: 1.4;">
              ${event.description}
            </p>
            <div style="font-size: 11px; color: #666; line-height: 1.3;">
              <strong>Severity:</strong> <span style="color: ${color}; font-weight: bold;">${event.severity.toUpperCase()}</span><br>
              <strong>Source:</strong> ${event.source}<br>
              <strong>Countries:</strong> ${event.countries.join(', ')}<br>
              <strong>Time:</strong> ${new Date(event.date).toLocaleString()}<br>
              <strong>Confidence:</strong> ${Math.round(event.confidence * 100)}%
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        layerGroup.addLayer(marker);
      });
    } catch (error) {
      console.error('Failed to load geopolitical data:', error);
    }
  };

  // WEATHER DATA LOADER
  const loadWeatherData = async (layerGroup: L.LayerGroup) => {
    try {
      const response = await fetch('/api/weather-alerts');
      const data = await response.json();
      const alerts = data.alerts || [];

      alerts.forEach((alert: any) => {
        let color = '#fbbf24';
        let pulseAnimation = '';
        
        switch (alert.severity) {
          case 'extreme':
            color = '#dc2626';
            pulseAnimation = 'animation: pulse 0.8s infinite;';
            break;
          case 'high':
            color = '#ea580c';
            pulseAnimation = 'animation: pulse 1.5s infinite;';
            break;
          case 'moderate':
            color = '#f59e0b';
            break;
          case 'low':
            color = '#eab308';
            break;
        }
        
        const alertIcon = L.divIcon({
          html: `<div style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; ${pulseAnimation}">
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="${color}">
                     <path d="M12 16l-6-8h12l-6 8z"/>
                   </svg>
                 </div>`,
          className: 'weather-alert',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([alert.lat, alert.lng], { icon: alertIcon });
        
        const weatherTypeNames: {[key: string]: string} = {
          hurricane: 'Hurricane', typhoon: 'Typhoon', tornado: 'Tornado',
          flood: 'Flood', drought: 'Drought', wildfire: 'Wildfire',
          blizzard: 'Blizzard', heatwave: 'Heat Wave', thunderstorm: 'Severe Storm'
        };
        
        const popupContent = `
          <div style="min-width: 240px;">
            <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px; font-weight: bold;">
              ▼ ${alert.title}
            </h4>
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #DAA520; line-height: 1.4;">
              ${alert.description}
            </p>
            <div style="font-size: 11px; color: #666; line-height: 1.3;">
              <strong>Type:</strong> ${weatherTypeNames[alert.type] || alert.type}<br>
              <strong>Severity:</strong> <span style="color: ${color}; font-weight: bold;">${alert.severity.toUpperCase()}</span><br>
              <strong>Location:</strong> ${alert.location}<br>
              <strong>Source:</strong> ${alert.source}<br>
              <strong>Issued:</strong> ${new Date(alert.date).toLocaleString()}<br>
              ${alert.expires ? `<strong>Expires:</strong> ${new Date(alert.expires).toLocaleString()}<br>` : ''}
              <strong>Confidence:</strong> ${Math.round(alert.confidence * 100)}%
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        layerGroup.addLayer(marker);
      });
    } catch (error) {
      console.error('Failed to load weather data:', error);
    }
  };

  // SEISMIC DATA LOADER  
  const loadSeismicData = async (layerGroup: L.LayerGroup) => {
    try {
      const response = await fetch('/api/seismic-activity');
      const data = await response.json();
      const events = data.events || [];

      events.forEach((event: any) => {
        let color = '#fbbf24';
        let pulseAnimation = '';
        
        switch (event.severity) {
          case 'extreme':
            color = '#dc2626';
            pulseAnimation = 'animation: pulse 0.6s infinite;';
            break;
          case 'high':
            color = '#ea580c';
            pulseAnimation = 'animation: pulse 1.2s infinite;';
            break;
          case 'moderate':
            color = '#f59e0b';
            break;
          case 'low':
            color = '#eab308';
            break;
        }
        
        const alertIcon = L.divIcon({
          html: `<div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; ${pulseAnimation}">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                     <path d="M2 12l4 0 4-6 4 12 4-6 4 0" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>
                 </div>`,
          className: 'seismic-event',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([event.lat, event.lng], { icon: alertIcon });
        
        const popupContent = `
          <div style="min-width: 220px;">
            <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px; font-weight: bold;">
              📊 ${event.title}
            </h4>
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #DAA520; line-height: 1.4;">
              ${event.description}
            </p>
            <div style="font-size: 11px; color: #666; line-height: 1.3;">
              <strong>Magnitude:</strong> <span style="color: ${color}; font-weight: bold;">${event.magnitude.toFixed(1)}</span><br>
              <strong>Depth:</strong> ${event.depth.toFixed(1)}km<br>
              <strong>Location:</strong> ${event.location}<br>
              <strong>Source:</strong> ${event.source}<br>
              <strong>Time:</strong> ${new Date(event.date).toLocaleString()}<br>
              <strong>Confidence:</strong> ${Math.round(event.confidence * 100)}%
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        layerGroup.addLayer(marker);
      });
    } catch (error) {
      console.error('Failed to load seismic data:', error);
    }
  };

  // STATIC LAYER LOADERS (simplified)
  const loadShippingLanes = (layerGroup: L.LayerGroup) => {
    // Shipping lanes with green dots - simplified for space
    const routes = [
      { waypoints: [[35.7, 139.7], [47.6, -122.3]], name: 'Trans-Pacific Route' },
      { waypoints: [[51.5, -0.1], [40.7, -74.0]], name: 'Trans-Atlantic Route' }
    ];
    
    routes.forEach(route => {
      route.waypoints.forEach(([lat, lng]) => {
        const circle = L.circle([lat, lng], {
          color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.9,
          radius: 50000, weight: 0
        });
        circle.bindPopup(route.name);
        layerGroup.addLayer(circle);
      });
    });
  };

  const loadActiveWells = (layerGroup: L.LayerGroup) => {
    const wells = [
      { lat: 26.0, lng: 50.0, name: "Kuwait Oil Field", production: "45,000 bbl/day" },
      { lat: 25.0, lng: 51.0, name: "Qatar Oil Platform", production: "62,000 bbl/day" }
    ];
    
    wells.forEach(well => {
      const icon = L.divIcon({
        html: `<div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DAA520" stroke-width="2">
                   <path d="M12 3v18"/><path d="M9 3l6 0"/><path d="M10 6l4 0"/>
                 </svg>
               </div>`,
        iconSize: [20, 20], iconAnchor: [10, 10]
      });
      const marker = L.marker([well.lat, well.lng], { icon });
      marker.bindPopup(`<h4>${well.name}</h4><p>Production: ${well.production}</p>`);
      layerGroup.addLayer(marker);
    });
  };

  const loadDrillingRigs = (layerGroup: L.LayerGroup) => {
    // Similar simplified implementation for other static layers
    // ... (keeping brief for space)
  };

  const loadRefineries = (layerGroup: L.LayerGroup) => {};
  const loadPipelines = (layerGroup: L.LayerGroup) => {};
  const loadTankerShips = (layerGroup: L.LayerGroup) => {};

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      style={{ backgroundColor: '#374151' }}
    />
  );
}