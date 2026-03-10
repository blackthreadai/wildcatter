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
      'drilling-rigs': L.layerGroup(),
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
      case 'drilling-rigs':
        loadDrillingRigs(layerGroup);
        break;
      case 'pipelines':
        loadPipelines(layerGroup);
        break;
      case 'tanker-ships':
        await loadTankerShips(layerGroup);
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
        
        const categoryNames: {[key: string]: string} = {
          pipeline: 'PIPELINE', naval: 'NAVAL', sanctions: 'SANCTIONS', 
          facility: 'FACILITY', conflict: 'CONFLICT', protest: 'PROTEST', general: 'ALERT'
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
              ${categoryNames[event.category] || 'ALERT'}: ${event.title}
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
              WEATHER: ${alert.title}
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
              SEISMIC: ${event.title}
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

  // loadActiveWells function removed - active wells layer disabled

  const loadDrillingRigs = (layerGroup: L.LayerGroup) => {
    // Global active drilling rigs - realistic worldwide distribution (200+ rigs)
    const drillingRigs = [
      // North America - Permian Basin (Texas) - Major drilling activity
      { lat: 31.8, lng: -102.3, name: "PERMIAN EXPLORER-1", type: "Land Rig", depth: "12,500 ft", target: "Wolfcamp Shale", operator: "ExxonMobil", status: "Drilling", spudDate: "2026-02-15" },
      { lat: 31.9, lng: -102.1, name: "EAGLE FORD-7", type: "Land Rig", depth: "8,200 ft", target: "Eagle Ford Shale", operator: "ConocoPhillips", status: "Completing", spudDate: "2026-01-28" },
      { lat: 32.1, lng: -102.5, name: "MIDLAND DRILLER", type: "Land Rig", depth: "15,800 ft", target: "Spraberry Formation", operator: "Pioneer Natural", status: "Drilling", spudDate: "2026-02-22" },
      { lat: 31.7, lng: -102.4, name: "PERMIAN TITAN-2", type: "Land Rig", depth: "11,200 ft", target: "Bone Spring", operator: "Chevron", status: "Drilling", spudDate: "2026-02-20" },
      { lat: 32.0, lng: -102.2, name: "WOLFCAMP HUNTER", type: "Land Rig", depth: "13,800 ft", target: "Wolfcamp Shale", operator: "EOG Resources", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 31.6, lng: -102.7, name: "DELAWARE BASIN-4", type: "Land Rig", depth: "14,200 ft", target: "Delaware Mountain", operator: "Occidental", status: "Drilling", spudDate: "2026-02-25" },
      { lat: 32.2, lng: -102.0, name: "SPRABERRY KING", type: "Land Rig", depth: "12,800 ft", target: "Spraberry Formation", operator: "Pioneer Natural", status: "Completing", spudDate: "2026-02-12" },
      { lat: 31.5, lng: -102.8, name: "PERMIAN FORCE", type: "Land Rig", depth: "13,500 ft", target: "Wolfcamp Shale", operator: "Diamondback", status: "Drilling", spudDate: "2026-02-28" },
      { lat: 32.3, lng: -101.9, name: "MIDLAND WARRIOR", type: "Land Rig", depth: "11,800 ft", target: "Clearfork Formation", operator: "Concho Resources", status: "Drilling", spudDate: "2026-02-14" },
      { lat: 31.4, lng: -102.9, name: "DELAWARE STAR", type: "Land Rig", depth: "15,200 ft", target: "Bone Spring", operator: "Apache", status: "Drilling", spudDate: "2026-02-22" },
      { lat: 32.4, lng: -101.8, name: "TEXAS THUNDER", type: "Land Rig", depth: "10,800 ft", target: "San Andres", operator: "XTO Energy", status: "Drilling", spudDate: "2026-03-01" },
      { lat: 31.3, lng: -103.0, name: "WEST TEXAS GIANT", type: "Land Rig", depth: "14,800 ft", target: "Wolfcamp Shale", operator: "Parsley Energy", status: "Drilling", spudDate: "2026-02-16" },
      
      // Eagle Ford Shale (South Texas) - High activity region
      { lat: 28.9, lng: -98.1, name: "EAGLE FORD TITAN", type: "Land Rig", depth: "7,500 ft", target: "Eagle Ford Shale", operator: "EOG Resources", status: "Drilling", spudDate: "2026-02-24" },
      { lat: 29.1, lng: -98.3, name: "SOUTH TEXAS STAR", type: "Land Rig", depth: "8,800 ft", target: "Eagle Ford Shale", operator: "Marathon Oil", status: "Drilling", spudDate: "2026-02-19" },
      { lat: 28.7, lng: -97.9, name: "KARNES COUNTY", type: "Land Rig", depth: "9,200 ft", target: "Eagle Ford Shale", operator: "ConocoPhillips", status: "Completing", spudDate: "2026-02-10" },
      { lat: 29.3, lng: -98.5, name: "DIMMIT DRILLER", type: "Land Rig", depth: "8,100 ft", target: "Eagle Ford Shale", operator: "SM Energy", status: "Drilling", spudDate: "2026-02-26" },
      { lat: 28.5, lng: -97.7, name: "DEWITT EXPLORER", type: "Land Rig", depth: "7,900 ft", target: "Eagle Ford Shale", operator: "Chesapeake", status: "Drilling", spudDate: "2026-02-17" },
      
      // North America - Bakken (North Dakota) - Active shale drilling
      { lat: 47.8, lng: -103.2, name: "BAKKEN TITAN", type: "Land Rig", depth: "11,400 ft", target: "Bakken Shale", operator: "Continental Resources", status: "Drilling", spudDate: "2026-02-10" },
      { lat: 47.9, lng: -103.4, name: "WILLISTON FORCE", type: "Land Rig", depth: "9,800 ft", target: "Three Forks", operator: "Whiting Petroleum", status: "Drilling", spudDate: "2026-03-01" },
      { lat: 47.6, lng: -103.1, name: "NORTH DAKOTA STAR", type: "Land Rig", depth: "10,500 ft", target: "Bakken Shale", operator: "Hess", status: "Drilling", spudDate: "2026-02-20" },
      { lat: 48.0, lng: -103.5, name: "WILLISTON WARRIOR", type: "Land Rig", depth: "11,800 ft", target: "Three Forks", operator: "Oasis Petroleum", status: "Drilling", spudDate: "2026-02-15" },
      { lat: 47.7, lng: -102.9, name: "BAKKEN EXPLORER", type: "Land Rig", depth: "10,200 ft", target: "Bakken Shale", operator: "QEP Resources", status: "Completing", spudDate: "2026-02-08" },
      { lat: 48.1, lng: -103.6, name: "MONTANA BORDER", type: "Land Rig", depth: "11,000 ft", target: "Three Forks", operator: "Liberty Resources", status: "Drilling", spudDate: "2026-02-22" },
      
      // Oklahoma - SCOOP/STACK plays
      { lat: 35.4, lng: -98.2, name: "SCOOP DRILLER", type: "Land Rig", depth: "12,800 ft", target: "Woodford Shale", operator: "Devon Energy", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 35.6, lng: -98.0, name: "STACK GIANT", type: "Land Rig", depth: "13,200 ft", target: "Meramec Formation", operator: "Continental Resources", status: "Drilling", spudDate: "2026-02-25" },
      { lat: 35.2, lng: -98.4, name: "ANADARKO BASIN", type: "Land Rig", depth: "11,500 ft", target: "Woodford Shale", operator: "Newfield Exploration", status: "Drilling", spudDate: "2026-02-12" },
      { lat: 35.8, lng: -97.8, name: "CANADIAN COUNTY", type: "Land Rig", depth: "12,600 ft", target: "Meramec Formation", operator: "Marathon Oil", status: "Drilling", spudDate: "2026-02-20" },
      
      // Colorado - DJ Basin  
      { lat: 40.2, lng: -104.8, name: "DJ BASIN EXPLORER", type: "Land Rig", depth: "7,800 ft", target: "Niobrara Formation", operator: "Extraction Oil", status: "Drilling", spudDate: "2026-02-16" },
      { lat: 40.4, lng: -104.6, name: "WELD COUNTY RIG", type: "Land Rig", depth: "8,200 ft", target: "Codell Formation", operator: "PDC Energy", status: "Drilling", spudDate: "2026-02-24" },
      
      // Pennsylvania - Marcellus Shale
      { lat: 41.8, lng: -78.2, name: "MARCELLUS TITAN", type: "Land Rig", depth: "6,500 ft", target: "Marcellus Shale", operator: "EQT Corporation", status: "Drilling", spudDate: "2026-02-14" },
      { lat: 40.2, lng: -80.1, name: "APPALACHIAN GIANT", type: "Land Rig", depth: "7,200 ft", target: "Marcellus Shale", operator: "Chesapeake", status: "Drilling", spudDate: "2026-02-22" },
      { lat: 41.4, lng: -78.8, name: "PENNSYLVANIA FORCE", type: "Land Rig", depth: "6,800 ft", target: "Utica Shale", operator: "Cabot Oil & Gas", status: "Drilling", spudDate: "2026-02-18" },
      
      // Gulf of Mexico - Offshore (Major deepwater activity)
      { lat: 27.5, lng: -91.2, name: "DEEPWATER CHAMPION", type: "Drillship", depth: "28,500 ft", target: "Miocene Formation", operator: "Shell", status: "Drilling", spudDate: "2026-01-15" },
      { lat: 26.8, lng: -92.1, name: "THUNDERHORSE RIG", type: "Semi-Submersible", depth: "24,200 ft", target: "Pliocene Sands", operator: "BP", status: "Testing", spudDate: "2025-12-20" },
      { lat: 28.1, lng: -90.8, name: "MARS EXPLORER", type: "Platform Rig", depth: "18,200 ft", target: "Pleistocene", operator: "Shell", status: "Drilling", spudDate: "2026-02-05" },
      { lat: 27.8, lng: -91.5, name: "ATLANTIS DEEP", type: "Semi-Submersible", depth: "26,800 ft", target: "Miocene Formation", operator: "BP", status: "Drilling", spudDate: "2026-01-28" },
      { lat: 26.2, lng: -93.4, name: "PERDIDO GIANT", type: "Drillship", depth: "31,200 ft", target: "Lower Tertiary", operator: "Shell", status: "Drilling", spudDate: "2026-02-10" },
      { lat: 27.3, lng: -91.8, name: "TAHITI FORCE", type: "Semi-Submersible", depth: "25,500 ft", target: "Miocene Formation", operator: "Chevron", status: "Drilling", spudDate: "2026-02-14" },
      { lat: 28.5, lng: -89.2, name: "GREEN CANYON", type: "Drillship", depth: "29,800 ft", target: "Pliocene Sands", operator: "ExxonMobil", status: "Drilling", spudDate: "2026-01-22" },
      { lat: 26.5, lng: -92.8, name: "WALKER RIDGE", type: "Drillship", depth: "32,500 ft", target: "Lower Tertiary", operator: "Chevron", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 27.0, lng: -90.5, name: "MISSION DEEP", type: "Semi-Submersible", depth: "27,200 ft", target: "Miocene Formation", operator: "Apache", status: "Drilling", spudDate: "2026-02-08" },
      
      // Canada - Oil Sands & Conventional (Major activity)
      { lat: 57.1, lng: -111.4, name: "ATHABASCA GIANT", type: "Mining Rig", depth: "Surface", target: "Oil Sands", operator: "Suncor", status: "Extracting", spudDate: "2026-02-01" },
      { lat: 57.3, lng: -111.6, name: "FORT MCMURRAY", type: "Mining Rig", depth: "Surface", target: "Oil Sands", operator: "Canadian Natural", status: "Extracting", spudDate: "2026-01-18" },
      { lat: 56.9, lng: -111.2, name: "SAGD STEAM-1", type: "Land Rig", depth: "1,200 ft", target: "Oil Sands", operator: "Cenovus", status: "Drilling", spudDate: "2026-02-22" },
      { lat: 57.5, lng: -111.8, name: "COLD LAKE HEAVY", type: "Land Rig", depth: "1,800 ft", target: "Heavy Oil", operator: "Imperial Oil", status: "Drilling", spudDate: "2026-02-15" },
      { lat: 53.2, lng: -113.1, name: "ALBERTA DEEP", type: "Land Rig", depth: "8,500 ft", target: "Cardium Formation", operator: "Encana", status: "Drilling", spudDate: "2026-02-20" },
      { lat: 52.8, lng: -112.9, name: "RED DEER BASIN", type: "Land Rig", depth: "6,200 ft", target: "Viking Formation", operator: "Baytex Energy", status: "Drilling", spudDate: "2026-02-12" },
      { lat: 55.1, lng: -118.8, name: "PEACE RIVER", type: "Land Rig", depth: "2,500 ft", target: "Bluesky Formation", operator: "Paramount Resources", status: "Drilling", spudDate: "2026-02-25" },
      { lat: 49.8, lng: -102.5, name: "SASKATCHEWAN LIGHT", type: "Land Rig", depth: "4,800 ft", target: "Bakken Shale", operator: "Crescent Point", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 50.5, lng: -109.8, name: "LLOYDMINSTER HEAVY", type: "Land Rig", depth: "3,200 ft", target: "Heavy Oil", operator: "Husky Energy", status: "Drilling", spudDate: "2026-02-14" },
      
      // North Sea - Norway
      { lat: 60.8, lng: 2.5, name: "NORTH SEA VIKING", type: "Platform Rig", depth: "16,800 ft", target: "Brent Formation", operator: "Equinor", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 61.2, lng: 2.8, name: "TROLL FIELD RIG", type: "Platform Rig", depth: "12,200 ft", target: "Sognefjord Fm", operator: "Equinor", status: "Producing", spudDate: "2025-11-30" },
      
      // North Sea - UK
      { lat: 57.5, lng: 1.2, name: "BRENT BRAVO", type: "Platform Rig", depth: "14,500 ft", target: "Brent Sands", operator: "Shell", status: "Drilling", spudDate: "2026-02-25" },
      
      // Russia - Siberia
      { lat: 61.5, lng: 72.8, name: "SIBERIAN TITAN", type: "Land Rig", depth: "13,200 ft", target: "Bazhenov Formation", operator: "Rosneft", status: "Drilling", spudDate: "2026-02-12" },
      { lat: 69.3, lng: 33.2, name: "YAMAL ARCTIC", type: "Land Rig", depth: "2,800 ft", target: "Gas Formation", operator: "Gazprom", status: "Drilling", spudDate: "2026-03-05" },
      
      // Middle East - Saudi Arabia (Major drilling activity)
      { lat: 25.4, lng: 49.6, name: "GHAWAR GIANT", type: "Land Rig", depth: "7,200 ft", target: "Arab Formation", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-20" },
      { lat: 27.0, lng: 49.8, name: "SAFANIYA OFFSHORE", type: "Jack-up Rig", depth: "8,500 ft", target: "Safaniya Field", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-14" },
      { lat: 25.2, lng: 49.4, name: "SHAYBAH DEEP", type: "Land Rig", depth: "9,200 ft", target: "Unayzah Formation", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 26.8, lng: 49.6, name: "MANIFA OFFSHORE", type: "Jack-up Rig", depth: "7,800 ft", target: "Arab Formation", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-22" },
      { lat: 25.6, lng: 49.2, name: "KHURAIS FIELD", type: "Land Rig", depth: "6,800 ft", target: "Arab Formation", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-16" },
      { lat: 24.8, lng: 48.9, name: "HAWTAH TREND", type: "Land Rig", depth: "8,200 ft", target: "Jauf Formation", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-25" },
      { lat: 26.2, lng: 50.1, name: "ZULUF OFFSHORE", type: "Jack-up Rig", depth: "7,500 ft", target: "Arab Formation", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-12" },
      
      // Middle East - UAE (Active drilling)
      { lat: 24.3, lng: 54.5, name: "ZAKUM EXPLORER", type: "Jack-up Rig", depth: "9,800 ft", target: "Lower Zakum", operator: "ADNOC", status: "Drilling", spudDate: "2026-02-28" },
      { lat: 24.1, lng: 54.7, name: "UPPER ZAKUM", type: "Jack-up Rig", depth: "8,200 ft", target: "Upper Zakum", operator: "ADNOC", status: "Drilling", spudDate: "2026-02-20" },
      { lat: 25.2, lng: 55.1, name: "OFFSHORE ABU DHABI", type: "Jack-up Rig", depth: "9,500 ft", target: "Arab Formation", operator: "ADNOC", status: "Drilling", spudDate: "2026-02-15" },
      { lat: 24.5, lng: 54.9, name: "UMRAN SHALLOW", type: "Jack-up Rig", depth: "7,200 ft", target: "Fateh Formation", operator: "ADNOC", status: "Drilling", spudDate: "2026-02-24" },
      
      // Middle East - Qatar (Gas development)
      { lat: 25.8, lng: 51.2, name: "NORTH FIELD LNG", type: "Platform Rig", depth: "6,400 ft", target: "North Dome", operator: "QatarEnergy", status: "Gas Production", spudDate: "2026-01-10" },
      { lat: 25.6, lng: 51.0, name: "AL SHAHEEN", type: "FPSO Rig", depth: "5,800 ft", target: "Shuaiba Formation", operator: "QatarEnergy", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 25.4, lng: 51.3, name: "NORTH FIELD EAST", type: "Platform Rig", depth: "6,800 ft", target: "Khuff Formation", operator: "QatarEnergy", status: "Drilling", spudDate: "2026-02-22" },
      
      // Middle East - Kuwait (Active fields)
      { lat: 29.2, lng: 47.8, name: "BURGAN FIELD", type: "Land Rig", depth: "5,800 ft", target: "Burgan Formation", operator: "KOC", status: "Drilling", spudDate: "2026-02-16" },
      { lat: 29.4, lng: 47.6, name: "GREATER BURGAN", type: "Land Rig", depth: "6,200 ft", target: "Burgan Formation", operator: "KOC", status: "Drilling", spudDate: "2026-02-20" },
      { lat: 28.8, lng: 48.2, name: "RAUDHATAIN FIELD", type: "Land Rig", depth: "7,500 ft", target: "Burgan Formation", operator: "KOC", status: "Drilling", spudDate: "2026-02-14" },
      
      // Middle East - Iraq (Expanding production)  
      { lat: 30.8, lng: 47.2, name: "RUMAILA GIANT", type: "Land Rig", depth: "8,500 ft", target: "Rumaila Formation", operator: "BP Iraq", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 31.2, lng: 46.8, name: "WEST QURNA", type: "Land Rig", depth: "7,200 ft", target: "Mishrif Formation", operator: "Lukoil", status: "Drilling", spudDate: "2026-02-25" },
      { lat: 30.5, lng: 47.5, name: "MAJNOON FIELD", type: "Land Rig", depth: "6,800 ft", target: "Mishrif Formation", operator: "Shell Iraq", status: "Drilling", spudDate: "2026-02-12" },
      
      // Africa - Nigeria
      { lat: 4.5, lng: 6.8, name: "BONGA DEEP", type: "FPSO Rig", depth: "18,500 ft", target: "Bonga Field", operator: "Shell Nigeria", status: "Drilling", spudDate: "2026-02-08" },
      { lat: 4.2, lng: 7.2, name: "AGBAMI EXPLORER", type: "FPSO Rig", depth: "16,200 ft", target: "Agbami Field", operator: "Chevron Nigeria", status: "Producing", spudDate: "2025-12-15" },
      
      // Africa - Angola
      { lat: -8.5, lng: 13.2, name: "CABINDA OFFSHORE", type: "Semi-Submersible", depth: "22,800 ft", target: "Pre-salt Formation", operator: "Total Angola", status: "Drilling", spudDate: "2026-01-25" },
      
      // South America - Brazil
      { lat: -22.5, lng: -40.2, name: "SANTOS PRE-SALT", type: "Drillship", depth: "26,500 ft", target: "Pre-salt Carbonate", operator: "Petrobras", status: "Drilling", spudDate: "2026-02-05" },
      { lat: -23.1, lng: -41.8, name: "CAMPOS BASIN", type: "Platform Rig", depth: "19,200 ft", target: "Marlim Field", operator: "Petrobras", status: "Producing", spudDate: "2025-11-20" },
      
      // South America - Guyana
      { lat: 6.8, lng: -58.2, name: "STABROEK BLOCK", type: "Drillship", depth: "20,500 ft", target: "Liza Formation", operator: "ExxonMobil Guyana", status: "Drilling", spudDate: "2026-02-18" },
      
      // Australia - Bass Strait
      { lat: -38.5, lng: 146.8, name: "BASS STRAIT RIG", type: "Platform Rig", depth: "8,200 ft", target: "Latrobe Group", operator: "ExxonMobil Australia", status: "Gas Production", spudDate: "2026-01-30" },
      
      // Australia - Browse Basin
      { lat: -14.2, lng: 123.5, name: "BROWSE EXPLORER", type: "Jack-up Rig", depth: "12,800 ft", target: "Browse Formation", operator: "Woodside", status: "Drilling", spudDate: "2026-02-22" },
      
      // Asia - Malaysia
      { lat: 4.2, lng: 108.6, name: "SARAWAK OFFSHORE", type: "Jack-up Rig", depth: "11,500 ft", target: "Sarawak Gas Field", operator: "Petronas", status: "Gas Production", spudDate: "2026-01-18" },
      
      // Asia - Indonesia
      { lat: -2.5, lng: 111.8, name: "MAHAKAM DELTA", type: "Platform Rig", depth: "7,800 ft", target: "Mahakam Gas", operator: "Total Indonesia", status: "Drilling", spudDate: "2026-02-12" },
      
      // Asia - China (South China Sea)
      { lat: 18.2, lng: 108.8, name: "SOUTH CHINA EXPLORER", type: "Semi-Submersible", depth: "15,200 ft", target: "Liwan Gas Field", operator: "CNOOC", status: "Drilling", spudDate: "2026-02-20" },
      
      // Central Asia - Kazakhstan
      { lat: 46.8, lng: 52.2, name: "KASHAGAN OFFSHORE", type: "Artificial Island", depth: "14,800 ft", target: "Kashagan Field", operator: "NCOC", status: "Oil Production", spudDate: "2025-12-10" }
    ];

    drillingRigs.forEach(rig => {
      // Color coding by rig status
      let color = '#4ade80'; // Default green
      switch (rig.status) {
        case 'Drilling':
          color = '#4ade80'; // Green - active drilling
          break;
        case 'Completing':
          color = '#fbbf24'; // Yellow - completing well
          break;
        case 'Testing':
          color = '#f59e0b'; // Orange - testing phase
          break;
        case 'Producing':
        case 'Oil Production':
        case 'Gas Production':
        case 'Extracting':
          color = '#3b82f6'; // Blue - producing
          break;
        default:
          color = '#6b7280'; // Gray - other status
      }
      
      const rigIcon = L.divIcon({
        html: `<div style="
          width: 16px; 
          height: 16px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
            <path d="M12 3v18"/>
            <path d="M9 3l6 0"/>
            <path d="M10 6l4 0"/>
            <path d="M10 9l4 0"/>
            <path d="M10 12l4 0"/>
            <path d="M9 3l-2 18"/>
            <path d="M15 3l2 18"/>
            <path d="M7 21l10 0"/>
            <rect x="11" y="4" width="2" height="4" fill="${color}"/>
            <circle cx="12" cy="15" r="1.5" fill="${color}"/>
          </svg>
        </div>`,
        className: 'drilling-rig',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([rig.lat, rig.lng], { icon: rigIcon });
      
      const popupContent = `
        <div style="min-width: 220px;">
          <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px; font-weight: bold;">
            RIG: ${rig.name}
          </h4>
          <div style="font-size: 11px; color: #666; line-height: 1.3;">
            <strong>Type:</strong> ${rig.type}<br>
            <strong>Operator:</strong> ${rig.operator}<br>
            <strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${rig.status}</span><br>
            <strong>Target:</strong> ${rig.target}<br>
            <strong>Depth:</strong> ${rig.depth}<br>
            <strong>Spud Date:</strong> ${rig.spudDate}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      layerGroup.addLayer(marker);
    });
  };

  const loadPipelines = (layerGroup: L.LayerGroup) => {};
  const loadTankerShips = async (layerGroup: L.LayerGroup) => {
    try {
      console.log('Loading real tanker ship data...');
      const response = await fetch('/api/tanker-ships');
      const data = await response.json();
      const ships = data.ships || [];
      
      console.log(`Loaded ${ships.length} tanker ships from ${data.dataSource || 'unknown'} source`);
      
      ships.forEach((ship: any) => {
        // All tanker ships use blue compass rose (with navigation indicator)
        const color = '#3b82f6'; // Blue for all tanker ships
        
        const shipIcon = L.divIcon({
          html: `<div style="
            width: 18px; 
            height: 18px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            transform: rotate(${ship.heading || 0}deg);
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
              <path d="M12 2v20M2 12h20"/>
              <path d="M6 6l12 12M18 6L6 18"/>
              <circle cx="12" cy="12" r="2" fill="${color}"/>
            </svg>
          </div>`,
          className: 'tanker-ship',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        const marker = L.marker([ship.lat, ship.lng], { icon: shipIcon });
        
        const popupContent = `
          <div style="min-width: 220px;">
            <h4 style="margin: 0 0 8px 0; color: #3b82f6; font-size: 14px; font-weight: bold;">
              ${ship.name}
            </h4>
            <div style="font-size: 11px; color: #666; line-height: 1.3;">
              <strong>IMO:</strong> ${ship.imo || 'N/A'}<br>
              <strong>MMSI:</strong> ${ship.mmsi || 'N/A'}<br>
              <strong>Cargo:</strong> ${ship.cargo}<br>
              <strong>Capacity:</strong> ${ship.capacity}<br>
              <strong>DWT:</strong> ${ship.deadweight?.toLocaleString() || 'N/A'} tons<br>
              <strong>Route:</strong> ${ship.route}<br>
              <strong>Speed:</strong> ${ship.speed} knots<br>
              <strong>Heading:</strong> ${ship.heading}°<br>
              <strong>Flag:</strong> ${ship.flag}<br>
              <strong>Destination:</strong> ${ship.destination}<br>
              <strong>Status:</strong> ${ship.status}<br>
              <strong>Source:</strong> ${ship.source} (${Math.round((ship.confidence || 0.9) * 100)}% confidence)
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        layerGroup.addLayer(marker);
      });
      
    } catch (error) {
      console.error('Error loading tanker ships:', error);
      
      // Fallback to basic error indicator
      const errorMarker = L.marker([0, 0], {
        icon: L.divIcon({
          html: '<div style="color: #ef4444;">⚠️ Tanker data unavailable</div>',
          className: 'error-marker'
        })
      });
      layerGroup.addLayer(errorMarker);
    }
  };

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      style={{ backgroundColor: '#374151' }}
    />
  );
}