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
    // Global active drilling rigs across all major oil & gas regions
    const drillingRigs = [
      // North America - Permian Basin (Texas)
      { lat: 31.8, lng: -102.3, name: "PERMIAN EXPLORER-1", type: "Land Rig", depth: "12,500 ft", target: "Wolfcamp Shale", operator: "ExxonMobil", status: "Drilling", spudDate: "2026-02-15" },
      { lat: 31.9, lng: -102.1, name: "EAGLE FORD-7", type: "Land Rig", depth: "8,200 ft", target: "Eagle Ford Shale", operator: "ConocoPhillips", status: "Completing", spudDate: "2026-01-28" },
      { lat: 32.1, lng: -102.5, name: "MIDLAND DRILLER", type: "Land Rig", depth: "15,800 ft", target: "Spraberry Formation", operator: "Pioneer Natural", status: "Drilling", spudDate: "2026-02-22" },
      
      // North America - Bakken (North Dakota)
      { lat: 47.8, lng: -103.2, name: "BAKKEN TITAN", type: "Land Rig", depth: "11,400 ft", target: "Bakken Shale", operator: "Continental Resources", status: "Drilling", spudDate: "2026-02-10" },
      { lat: 47.9, lng: -103.4, name: "WILLISTON FORCE", type: "Land Rig", depth: "9,800 ft", target: "Three Forks", operator: "Whiting Petroleum", status: "Drilling", spudDate: "2026-03-01" },
      
      // Gulf of Mexico - Offshore
      { lat: 27.5, lng: -91.2, name: "DEEPWATER CHAMPION", type: "Drillship", depth: "28,500 ft", target: "Miocene Formation", operator: "Shell", status: "Drilling", spudDate: "2026-01-15" },
      { lat: 26.8, lng: -92.1, name: "THUNDERHORSE RIG", type: "Semi-Submersible", depth: "24,200 ft", target: "Pliocene Sands", operator: "BP", status: "Testing", spudDate: "2025-12-20" },
      
      // Canada - Oil Sands
      { lat: 57.1, lng: -111.4, name: "ATHABASCA GIANT", type: "Mining Rig", depth: "Surface", target: "Oil Sands", operator: "Suncor", status: "Extracting", spudDate: "2026-02-01" },
      
      // North Sea - Norway
      { lat: 60.8, lng: 2.5, name: "NORTH SEA VIKING", type: "Platform Rig", depth: "16,800 ft", target: "Brent Formation", operator: "Equinor", status: "Drilling", spudDate: "2026-02-18" },
      { lat: 61.2, lng: 2.8, name: "TROLL FIELD RIG", type: "Platform Rig", depth: "12,200 ft", target: "Sognefjord Fm", operator: "Equinor", status: "Producing", spudDate: "2025-11-30" },
      
      // North Sea - UK
      { lat: 57.5, lng: 1.2, name: "BRENT BRAVO", type: "Platform Rig", depth: "14,500 ft", target: "Brent Sands", operator: "Shell", status: "Drilling", spudDate: "2026-02-25" },
      
      // Russia - Siberia
      { lat: 61.5, lng: 72.8, name: "SIBERIAN TITAN", type: "Land Rig", depth: "13,200 ft", target: "Bazhenov Formation", operator: "Rosneft", status: "Drilling", spudDate: "2026-02-12" },
      { lat: 69.3, lng: 33.2, name: "YAMAL ARCTIC", type: "Land Rig", depth: "2,800 ft", target: "Gas Formation", operator: "Gazprom", status: "Drilling", spudDate: "2026-03-05" },
      
      // Middle East - Saudi Arabia
      { lat: 25.4, lng: 49.6, name: "GHAWAR GIANT", type: "Land Rig", depth: "7,200 ft", target: "Arab Formation", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-20" },
      { lat: 27.0, lng: 49.8, name: "SAFANIYA OFFSHORE", type: "Jack-up Rig", depth: "8,500 ft", target: "Safaniya Field", operator: "Saudi Aramco", status: "Drilling", spudDate: "2026-02-14" },
      
      // Middle East - UAE
      { lat: 24.3, lng: 54.5, name: "ZAKUM EXPLORER", type: "Jack-up Rig", depth: "9,800 ft", target: "Lower Zakum", operator: "ADNOC", status: "Drilling", spudDate: "2026-02-28" },
      
      // Middle East - Qatar
      { lat: 25.8, lng: 51.2, name: "NORTH FIELD LNG", type: "Platform Rig", depth: "6,400 ft", target: "North Dome", operator: "QatarEnergy", status: "Gas Production", spudDate: "2026-01-10" },
      
      // Middle East - Kuwait
      { lat: 29.2, lng: 47.8, name: "BURGAN FIELD", type: "Land Rig", depth: "5,800 ft", target: "Burgan Formation", operator: "KOC", status: "Drilling", spudDate: "2026-02-16" },
      
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
  const loadTankerShips = (layerGroup: L.LayerGroup) => {
    // Global tanker ships with realistic worldwide distribution
    const tankerShips = [
      // Middle East to Asia Route
      { lat: 26.7, lng: 56.1, name: "NORDIC NAVIGATOR", cargo: "Crude Oil", capacity: "2,000,000 bbls", route: "Persian Gulf → Singapore", speed: "14.2 kts", flag: "Marshall Islands" },
      { lat: 22.5, lng: 65.2, name: "OCEAN CHAMPION", cargo: "Crude Oil", capacity: "1,800,000 bbls", route: "Ras Tanura → Mumbai", speed: "13.8 kts", flag: "Liberia" },
      { lat: 15.2, lng: 72.8, name: "PACIFIC VOYAGER", cargo: "Refined Products", capacity: "750,000 bbls", route: "Kuwait → Chennai", speed: "15.1 kts", flag: "Panama" },
      
      // Middle East to Europe Route
      { lat: 18.5, lng: 42.1, name: "ATLANTIC SPIRIT", cargo: "Crude Oil", capacity: "2,200,000 bbls", route: "Saudi Arabia → Rotterdam", speed: "13.5 kts", flag: "Greece" },
      { lat: 12.8, lng: 43.3, name: "MEDITERRANEAN STAR", cargo: "LNG", capacity: "173,000 m³", route: "Qatar → Italy", speed: "19.2 kts", flag: "Qatar" },
      { lat: 29.5, lng: 32.9, name: "SUEZ PRINCESS", cargo: "Refined Products", capacity: "950,000 bbls", route: "UAE → Spain", speed: "14.7 kts", flag: "Cyprus" },
      
      // Americas Routes  
      { lat: 25.8, lng: -94.2, name: "GULF TRADER", cargo: "Crude Oil", capacity: "1,900,000 bbls", route: "Port Arthur → Corpus Christi", speed: "12.1 kts", flag: "USA" },
      { lat: 10.2, lng: -75.5, name: "CARIBBEAN QUEEN", cargo: "Refined Products", capacity: "650,000 bbls", route: "Cartagena → Miami", speed: "16.3 kts", flag: "Colombia" },
      { lat: -22.9, lng: -43.2, name: "SANTOS EXPLORER", cargo: "Crude Oil", capacity: "2,100,000 bbls", route: "Santos → Houston", speed: "13.9 kts", flag: "Brazil" },
      { lat: 61.2, lng: -149.9, name: "ALASKAN GIANT", cargo: "Crude Oil", capacity: "1,750,000 bbls", route: "Valdez → Long Beach", speed: "14.8 kts", flag: "USA" },
      
      // Trans-Pacific Routes
      { lat: 35.2, lng: 139.4, name: "TOKYO EXPRESS", cargo: "LNG", capacity: "266,000 m³", route: "Australia → Japan", speed: "18.5 kts", flag: "Japan" },
      { lat: -33.8, lng: 151.2, name: "SOUTHERN CROSS", cargo: "LNG", capacity: "180,000 m³", route: "Darwin → Seoul", speed: "19.8 kts", flag: "Australia" },
      { lat: 22.3, lng: 114.2, name: "HONG KONG FORTUNE", cargo: "Refined Products", capacity: "850,000 bbls", route: "Singapore → Hong Kong", speed: "15.4 kts", flag: "Hong Kong" },
      
      // Africa Routes
      { lat: -34.4, lng: 18.4, name: "CAPE GUARDIAN", cargo: "Crude Oil", capacity: "2,300,000 bbls", route: "Nigeria → South Africa", speed: "12.8 kts", flag: "South Africa" },
      { lat: 4.8, lng: 7.0, name: "WEST AFRICA PRIDE", cargo: "Crude Oil", capacity: "1,950,000 bbls", route: "Bonny → Europe", speed: "13.6 kts", flag: "Nigeria" },
      { lat: -8.8, lng: 13.2, name: "ANGOLA TRADER", cargo: "Crude Oil", capacity: "2,050,000 bbls", route: "Luanda → China", speed: "14.1 kts", flag: "Angola" },
      
      // North Sea / Europe Routes
      { lat: 60.4, lng: 5.3, name: "NORTH SEA VIKING", cargo: "Crude Oil", capacity: "1,600,000 bbls", route: "Stavanger → Rotterdam", speed: "13.2 kts", flag: "Norway" },
      { lat: 56.1, lng: 3.2, name: "SCOTTISH HIGHLANDER", cargo: "Crude Oil", capacity: "1,400,000 bbls", route: "Aberdeen → Wilhelmshaven", speed: "14.5 kts", flag: "UK" },
      { lat: 51.9, lng: 4.1, name: "ROTTERDAM RUNNER", cargo: "Refined Products", capacity: "720,000 bbls", route: "Rotterdam → Hamburg", speed: "16.1 kts", flag: "Netherlands" },
      
      // Russian Routes
      { lat: 69.1, lng: 33.4, name: "ARCTIC PIONEER", cargo: "LNG", capacity: "172,000 m³", route: "Yamal → Europe", speed: "17.9 kts", flag: "Russia" },
      { lat: 43.1, lng: 131.9, name: "FAR EAST ENERGY", cargo: "Crude Oil", capacity: "1,850,000 bbls", route: "Kozmino → China", speed: "13.7 kts", flag: "Russia" },
      
      // Southeast Asia Hub
      { lat: 1.3, lng: 103.8, name: "SINGAPORE JEWEL", cargo: "Refined Products", capacity: "900,000 bbls", route: "Singapore → Philippines", speed: "15.9 kts", flag: "Singapore" },
      { lat: 3.1, lng: 101.7, name: "MALAYSIA VISION", cargo: "LNG", capacity: "155,000 m³", route: "Bintulu → Japan", speed: "18.7 kts", flag: "Malaysia" },
      
      // India Ocean Routes
      { lat: -20.2, lng: 57.5, name: "INDIAN OCEAN PEARL", cargo: "Crude Oil", capacity: "2,150,000 bbls", route: "Middle East → Mauritius", speed: "14.0 kts", flag: "Mauritius" },
      { lat: 6.9, lng: 79.8, name: "COLOMBO MERCHANT", cargo: "Refined Products", capacity: "680,000 bbls", route: "Sri Lanka → Maldives", speed: "16.8 kts", flag: "Sri Lanka" }
    ];

    tankerShips.forEach(ship => {
      // All tanker ships now use blue compass rose
      const color = '#3b82f6'; // Blue for all tanker ships
      
      const shipIcon = L.divIcon({
        html: `<div style="
          width: 18px; 
          height: 18px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
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
        <div style="min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #3b82f6; font-size: 14px; font-weight: bold;">
            VESSEL: ${ship.name}
          </h4>
          <div style="font-size: 11px; color: #666; line-height: 1.3;">
            <strong>Cargo:</strong> ${ship.cargo}<br>
            <strong>Capacity:</strong> ${ship.capacity}<br>
            <strong>Route:</strong> ${ship.route}<br>
            <strong>Speed:</strong> ${ship.speed}<br>
            <strong>Flag:</strong> ${ship.flag}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      layerGroup.addLayer(marker);
    });
  };

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      style={{ backgroundColor: '#374151' }}
    />
  );
}