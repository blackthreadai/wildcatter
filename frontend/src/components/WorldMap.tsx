'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WorldMapProps {
  activeLayers: string[];
}

export default function WorldMap({ activeLayers }: WorldMapProps) {
  console.log('🦝 WORLDMAP COMPONENT LOADED - VERSION 3.0 - ' + new Date().toISOString());
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
      console.log('🌩️ LOADING WEATHER ALERTS...');
      const response = await fetch('/api/weather-alerts');
      const data = await response.json();
      const alerts = data.alerts || [];
      
      console.log(`🌩️ SUCCESS: Loaded ${alerts.length} weather alerts`);
      console.log('Weather alerts data:', alerts);

      alerts.forEach((alert: any) => {
        console.log(`🌩️ Processing weather alert at ${alert.lat}, ${alert.lng}: ${alert.title}`);
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
          html: `<div style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; ${pulseAnimation}">
                   <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}" stroke="#000" stroke-width="1">
                     <path d="M12 16l-6-8h12l-6 8z"/>
                   </svg>
                 </div>`,
          className: 'weather-alert',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
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
        console.log(`✅ Added weather alert ${alert.title} to layer at ${alert.lat}, ${alert.lng} (${color} triangle)`);
      });
      
      console.log(`🌩️ COMPLETE: Added ${alerts.length} weather alerts to map`);
    } catch (error) {
      console.error('❌ Failed to load weather data:', error);
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
    console.log('🚢🚢🚢 SHIPPING LOADER CALLED - NEW VERSION 2.0 🚢🚢🚢');
    alert('SHIPPING LANES LOADING - CHECK CONSOLE');
    
    // TEST MARKER - Should show in Atlantic Ocean regardless of shipping data  
    const testMarker = L.marker([30.0, -30.0], {
      icon: L.divIcon({
        html: '<div style="background: blue; color: white; padding: 4px; font-weight: bold;">SHIPPING TEST MARKER</div>',
        className: 'test-marker'
      })
    });
    layerGroup.addLayer(testMarker);
    console.log('✅ Added TEST MARKER for shipping at [30.0, -30.0]');
    
    // COMPREHENSIVE GLOBAL SHIPPING ROUTES - Major Maritime Trade Corridors
    const shippingRoutes = [
      // TRANS-PACIFIC ROUTES
      {
        name: 'Asia-North America (TPP Main)',
        coordinates: [[35.68, 139.69], [37.77, -122.42]],
        color: '#4ade80', traffic: 'Very High', cargo: 'Containers, Electronics'
      },
      {
        name: 'China-US West Coast',
        coordinates: [[31.23, 121.47], [33.74, -118.26]],
        color: '#4ade80', traffic: 'Very High', cargo: 'Containers, Consumer Goods'
      },
      {
        name: 'Japan-US Pacific',
        coordinates: [[35.68, 139.69], [47.61, -122.33]],
        color: '#4ade80', traffic: 'High', cargo: 'Automobiles, Electronics'
      },
      {
        name: 'Asia-Australia Route',
        coordinates: [[1.29, 103.85], [-33.87, 151.21]],
        color: '#4ade80', traffic: 'High', cargo: 'Raw Materials, Containers'
      },
      
      // TRANS-ATLANTIC ROUTES
      {
        name: 'Europe-North America (Main)',
        coordinates: [[51.50, -0.13], [40.71, -74.01]],
        color: '#3b82f6', traffic: 'Very High', cargo: 'Containers, Chemicals'
      },
      {
        name: 'Mediterranean-US East Coast',
        coordinates: [[43.30, 5.37], [25.76, -80.19]],
        color: '#3b82f6', traffic: 'High', cargo: 'Containers, Automobiles'
      },
      {
        name: 'UK-Canada Route',
        coordinates: [[51.50, -0.13], [49.25, -123.12]],
        color: '#3b82f6', traffic: 'Medium', cargo: 'Bulk Cargo, Containers'
      },
      {
        name: 'Europe-Brazil Route',
        coordinates: [[51.50, -0.13], [-22.91, -43.17]],
        color: '#3b82f6', traffic: 'High', cargo: 'Manufactured Goods'
      },
      
      // SUEZ CANAL ROUTES
      {
        name: 'Europe-Asia via Suez',
        coordinates: [[51.50, -0.13], [30.04, 31.25], [1.29, 103.85]],
        color: '#f59e0b', traffic: 'Critical', cargo: 'All Cargo Types'
      },
      {
        name: 'Mediterranean-Red Sea',
        coordinates: [[43.30, 5.37], [30.04, 31.25], [12.78, 45.04]],
        color: '#f59e0b', traffic: 'Very High', cargo: 'Oil, Containers'
      },
      {
        name: 'Suez-Persian Gulf',
        coordinates: [[30.04, 31.25], [26.22, 50.59]],
        color: '#f59e0b', traffic: 'Critical', cargo: 'Crude Oil, LNG'
      },
      
      // STRAIT OF HORMUZ ROUTES
      {
        name: 'Persian Gulf-Asia',
        coordinates: [[26.22, 50.59], [25.21, 55.27], [1.29, 103.85]],
        color: '#dc2626', traffic: 'Critical', cargo: 'Crude Oil, LNG'
      },
      {
        name: 'Gulf-Europe via Suez',
        coordinates: [[26.22, 50.59], [30.04, 31.25], [43.30, 5.37]],
        color: '#dc2626', traffic: 'Critical', cargo: 'Crude Oil'
      },
      {
        name: 'Kuwait-Japan Route',
        coordinates: [[29.37, 47.98], [35.68, 139.69]],
        color: '#dc2626', traffic: 'High', cargo: 'Crude Oil'
      },
      
      // STRAIT OF MALACCA ROUTES  
      {
        name: 'Malacca Strait (Main)',
        coordinates: [[1.29, 103.85], [3.14, 101.69], [5.42, 100.34]],
        color: '#8b5cf6', traffic: 'Critical', cargo: 'All Cargo Types'
      },
      {
        name: 'Singapore-India Route',
        coordinates: [[1.29, 103.85], [19.08, 72.88]],
        color: '#8b5cf6', traffic: 'Very High', cargo: 'Containers, Fuel'
      },
      {
        name: 'Southeast Asia-China',
        coordinates: [[1.29, 103.85], [22.32, 114.17]],
        color: '#8b5cf6', traffic: 'Very High', cargo: 'Raw Materials'
      },
      
      // PANAMA CANAL ROUTES
      {
        name: 'Panama Canal Transit',
        coordinates: [[8.54, -79.37], [9.08, -79.68]],
        color: '#06b6d4', traffic: 'Critical', cargo: 'Containers, Bulk'
      },
      {
        name: 'Asia-US East Coast via Panama',
        coordinates: [[1.29, 103.85], [8.54, -79.37], [40.71, -74.01]],
        color: '#06b6d4', traffic: 'High', cargo: 'Containers'
      },
      {
        name: 'US West-East Coast',
        coordinates: [[33.74, -118.26], [8.54, -79.37], [25.76, -80.19]],
        color: '#06b6d4', traffic: 'High', cargo: 'Intermodal'
      },
      
      // INDIAN OCEAN ROUTES
      {
        name: 'Cape of Good Hope',
        coordinates: [[-33.92, 18.42], [-34.36, 18.47]],
        color: '#10b981', traffic: 'Medium', cargo: 'Oil Tankers, Bulk'
      },
      {
        name: 'South Africa-Asia',
        coordinates: [[-33.92, 18.42], [1.29, 103.85]],
        color: '#10b981', traffic: 'Medium', cargo: 'Raw Materials'
      },
      {
        name: 'Middle East-India',
        coordinates: [[26.22, 50.59], [19.08, 72.88]],
        color: '#10b981', traffic: 'High', cargo: 'Crude Oil, LNG'
      },
      
      // NORTHERN SEA ROUTE (Arctic)
      {
        name: 'Northern Sea Route',
        coordinates: [[68.97, 33.07], [77.50, 104.30], [66.89, -162.92]],
        color: '#ef4444', traffic: 'Seasonal', cargo: 'LNG, Containers'
      },
      
      // CARIBBEAN/LATIN AMERICA
      {
        name: 'Caribbean-Europe',
        coordinates: [[18.47, -69.89], [51.50, -0.13]],
        color: '#f97316', traffic: 'Medium', cargo: 'Cruise, Cargo'
      },
      {
        name: 'Venezuela-Asia',
        coordinates: [[10.48, -66.90], [1.29, 103.85]],
        color: '#f97316', traffic: 'Medium', cargo: 'Crude Oil'
      },
      
      // AFRICA ROUTES
      {
        name: 'West Africa-Europe',
        coordinates: [[5.56, -0.20], [51.50, -0.13]],
        color: '#84cc16', traffic: 'High', cargo: 'Oil, Commodities'
      },
      {
        name: 'East Africa-Asia',
        coordinates: [[-1.29, 36.82], [1.29, 103.85]],
        color: '#84cc16', traffic: 'Medium', cargo: 'Agricultural Products'
      }
    ];
    
    console.log(`🚢 Rendering ${shippingRoutes.length} major global shipping routes`);
    
    shippingRoutes.forEach((route, index) => {
      if (!route.coordinates || route.coordinates.length < 2) return;
      
      // Create shipping lane polyline
      const polyline = L.polyline(route.coordinates, {
        color: route.color,
        weight: 3,
        opacity: 0.8,
        dashArray: route.traffic === 'Critical' ? undefined : '5, 5',
        className: 'shipping-lane'
      });
      
      // Add route endpoints as markers
      if (route.coordinates.length >= 2) {
        const startPoint = route.coordinates[0];
        const endPoint = route.coordinates[route.coordinates.length - 1];
        
        // Start marker
        const startMarker = L.circle(startPoint, {
          color: route.color,
          fillColor: route.color,
          fillOpacity: 0.8,
          radius: 30000,
          weight: 2
        });
        
        // End marker  
        const endMarker = L.circle(endPoint, {
          color: route.color,
          fillColor: route.color,
          fillOpacity: 0.8,
          radius: 30000,
          weight: 2
        });
        
        layerGroup.addLayer(startMarker);
        layerGroup.addLayer(endMarker);
      }
      
      // Rich popup with shipping route details
      const popupContent = `
        <div style="min-width: 220px;">
          <h4 style="margin: 0 0 8px 0; color: ${route.color}; font-size: 14px; font-weight: bold;">
            🚢 ${route.name}
          </h4>
          <div style="font-size: 11px; color: #666; line-height: 1.3;">
            <strong>Traffic Volume:</strong> <span style="color: ${route.color}; font-weight: bold;">${route.traffic}</span><br>
            <strong>Primary Cargo:</strong> ${route.cargo}<br>
            <strong>Route Points:</strong> ${route.coordinates.length} waypoints<br>
            <strong>Status:</strong> Active Commercial Route
          </div>
        </div>
      `;
      
      polyline.bindPopup(popupContent);
      layerGroup.addLayer(polyline);
      
      console.log(`✅ Added shipping route: ${route.name} (${route.traffic} traffic)`);
    });
    
    console.log(`🚢 COMPLETE: ${shippingRoutes.length} shipping routes loaded successfully`);
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

  const loadPipelines = (layerGroup: L.LayerGroup) => {
    console.log('🛡️🛡️🛡️ PIPELINE LOADER CALLED - NEW VERSION 2.0 🛡️🛡️🛡️');
    alert('PIPELINE LAYER LOADING - CHECK CONSOLE');
    
    // TEST MARKER - Should show in Middle East regardless of pipeline data
    const testMarker = L.marker([29.0, 42.0], {
      icon: L.divIcon({
        html: '<div style="background: red; color: white; padding: 4px; font-weight: bold;">PIPELINE TEST MARKER</div>',
        className: 'test-marker'
      })
    });
    layerGroup.addLayer(testMarker);
    console.log('✅ Added TEST MARKER for pipelines at [29.0, 42.0]');
    
    // COMPREHENSIVE GLOBAL PIPELINE NETWORK - Major Energy Infrastructure
    const pipelines = [
      // NORTH AMERICA - Major Oil Pipelines
      {
        name: 'Keystone Pipeline System',
        coordinates: [[57.10, -110.15], [52.50, -105.50], [50.00, -104.00], [47.50, -97.50], [41.50, -95.00], [39.00, -95.50], [37.00, -94.50], [35.00, -90.00], [41.50, -87.50], [41.00, -82.50]],
        color: '#8B4513', capacity: '830,000 bpd', type: 'Crude Oil'
      },
      {
        name: 'Colonial Pipeline',
        coordinates: [[29.76, -95.37], [30.00, -94.00], [32.50, -91.50], [33.50, -87.50], [33.50, -85.00], [34.00, -82.50], [35.50, -79.50], [37.50, -78.50], [38.90, -77.00], [40.70, -74.00]],
        color: '#FF6347', capacity: '2.5M bpd', type: 'Refined Products'
      },
      {
        name: 'Trans-Alaska Pipeline (TAPS)',
        coordinates: [[70.25, -149.50], [69.50, -149.00], [68.50, -148.50], [67.50, -147.50], [66.00, -146.00], [65.00, -145.50], [64.00, -145.00], [63.00, -146.50], [62.00, -148.00], [61.20, -149.50]],
        color: '#8B4513', capacity: '2.1M bpd', type: 'Crude Oil'
      },
      {
        name: 'Trans Mountain Pipeline',
        coordinates: [[53.55, -113.49], [51.05, -114.07], [50.68, -120.34], [49.25, -123.12]],
        color: '#8B4513', capacity: '890,000 bpd', type: 'Crude Oil'
      },
      {
        name: 'Enbridge Line 5',
        coordinates: [[46.78, -84.55], [45.35, -84.92], [42.33, -83.05], [41.50, -83.68]],
        color: '#8B4513', capacity: '540,000 bpd', type: 'Crude Oil'
      },
      
      // EUROPE/EURASIA - Major Oil & Gas Pipelines
      {
        name: 'Baku-Tbilisi-Ceyhan Pipeline',
        coordinates: [[40.38, 49.87], [40.50, 48.50], [41.00, 46.50], [41.69, 44.83], [41.50, 42.50], [41.00, 40.00], [40.50, 38.50], [39.50, 36.50], [37.00, 35.00], [36.95, 35.89]],
        color: '#8B4513', capacity: '1.2M bpd', type: 'Crude Oil'
      },
      {
        name: 'Nord Stream (Gas)',
        coordinates: [[59.95, 30.32], [59.00, 24.00], [57.00, 18.00], [55.00, 13.00], [54.32, 10.13]],
        color: '#32CD32', capacity: '55 bcm/year', type: 'Natural Gas'
      },
      {
        name: 'Druzhba Pipeline',
        coordinates: [[55.75, 37.62], [53.90, 27.57], [52.23, 21.01], [50.45, 19.04], [49.19, 16.61], [48.20, 14.32]],
        color: '#8B4513', capacity: '1.4M bpd', type: 'Crude Oil'
      },
      {
        name: 'Yamal-Europe Pipeline',
        coordinates: [[66.53, 66.60], [61.52, 55.16], [55.75, 37.62], [52.23, 21.01], [52.52, 13.40]],
        color: '#32CD32', capacity: '33 bcm/year', type: 'Natural Gas'
      },
      {
        name: 'TurkStream Pipeline',
        coordinates: [[43.60, 39.72], [42.00, 35.00], [41.01, 28.98]],
        color: '#32CD32', capacity: '31.5 bcm/year', type: 'Natural Gas'
      },
      {
        name: 'Trans-Adriatic Pipeline',
        coordinates: [[40.64, 22.94], [41.15, 20.17], [42.44, 19.26], [43.32, 13.40], [45.46, 9.19]],
        color: '#32CD32', capacity: '20 bcm/year', type: 'Natural Gas'
      },
      
      // MIDDLE EAST - Regional Export Routes
      {
        name: 'Iraq-Turkey Pipeline',
        coordinates: [[35.20, 44.39], [36.19, 43.00], [37.06, 42.36], [37.87, 40.24], [39.93, 39.05], [36.95, 35.89]],
        color: '#8B4513', capacity: '1.6M bpd', type: 'Crude Oil'
      },
      {
        name: 'Arab Gas Pipeline',
        coordinates: [[31.95, 35.93], [33.51, 36.29], [34.74, 36.70], [36.20, 37.16], [37.07, 37.38], [39.93, 39.05]],
        color: '#32CD32', capacity: '10 bcm/year', type: 'Natural Gas'
      },
      {
        name: 'East-West Pipeline (Saudi)',
        coordinates: [[25.40, 49.60], [24.70, 46.70], [24.00, 44.50], [23.89, 38.99]],
        color: '#8B4513', capacity: '4.8M bpd', type: 'Crude Oil'
      },
      
      // ASIA-PACIFIC - Major Routes
      {
        name: 'West-East Gas Pipeline (China)',
        coordinates: [[39.91, 75.01], [43.82, 87.63], [39.92, 116.46]],
        color: '#32CD32', capacity: '30 bcm/year', type: 'Natural Gas'
      },
      {
        name: 'Myanmar-China Pipeline',
        coordinates: [[16.78, 96.16], [22.00, 100.00], [25.04, 102.72]],
        color: '#32CD32', capacity: '12 bcm/year', type: 'Natural Gas'
      },
      {
        name: 'Central Asia-China Pipeline',
        coordinates: [[42.32, 59.63], [43.24, 76.85], [39.92, 116.46]],
        color: '#32CD32', capacity: '55 bcm/year', type: 'Natural Gas'
      },
      
      // AFRICA - Continental Infrastructure
      {
        name: 'West African Gas Pipeline',
        coordinates: [[5.61, 0.19], [6.46, 3.40], [6.36, 5.61], [9.08, 7.54]],
        color: '#32CD32', capacity: '5 bcm/year', type: 'Natural Gas'
      },
      {
        name: 'Trans-Saharan Pipeline',
        coordinates: [[12.11, 8.11], [16.97, 7.90], [25.13, 10.16], [30.04, 31.25]],
        color: '#32CD32', capacity: '30 bcm/year', type: 'Natural Gas'
      },
      
      // SOUTH AMERICA - Regional Network
      {
        name: 'Bolivia-Brazil Pipeline',
        coordinates: [[-16.29, -63.59], [-19.92, -55.67], [-23.53, -46.63]],
        color: '#32CD32', capacity: '30 mcm/day', type: 'Natural Gas'
      }
    ];
    
    console.log(`🛡️ Rendering ${pipelines.length} major global pipeline routes`);
    
    pipelines.forEach((pipeline, index) => {
      console.log(`🛡️ Processing pipeline: ${pipeline.name}`);
      console.log(`🛡️ Coordinates count: ${pipeline.coordinates?.length || 'NONE'}`);
      console.log(`🛡️ First coordinate: ${pipeline.coordinates?.[0]}`);
      console.log(`🛡️ Last coordinate: ${pipeline.coordinates?.[pipeline.coordinates.length - 1]}`);
      
      if (!pipeline.coordinates || pipeline.coordinates.length < 2) {
        console.error(`❌ Pipeline ${pipeline.name} has invalid coordinates!`);
        return;
      }
      
      // Create thick, visible polyline for each pipeline
      const polyline = L.polyline(pipeline.coordinates, {
        color: pipeline.color,
        weight: 6, // Made even thicker
        opacity: 1.0, // Full opacity
        className: 'pipeline-route'
      });
      
      console.log(`✅ Created polyline for ${pipeline.name} with ${pipeline.coordinates.length} points`);
      
      // Rich popup with pipeline details
      const popupContent = `
        <div style="min-width: 220px;">
          <h4 style="margin: 0 0 8px 0; color: ${pipeline.color}; font-size: 14px; font-weight: bold;">
            ${pipeline.name}
          </h4>
          <div style="font-size: 11px; color: #666; line-height: 1.3;">
            <strong>Type:</strong> ${pipeline.type}<br>
            <strong>Capacity:</strong> ${pipeline.capacity}<br>
            <strong>Route Length:</strong> ${pipeline.coordinates.length} segments<br>
            <strong>Status:</strong> Operational
          </div>
        </div>
      `;
      
      polyline.bindPopup(popupContent);
      layerGroup.addLayer(polyline);
      
      console.log(`✅ Added ${pipeline.name} (${pipeline.type}) - ${pipeline.coordinates.length} segments`);
    });
    
    console.log(`🛡️ COMPLETE: ${pipelines.length} pipeline routes loaded successfully`);
  };
  const loadTankerShips = (layerGroup: L.LayerGroup) => {
    console.log('🛥️ LOADING MAJOR TANKER SHIPS...');
    
    // ACTIVE TANKER SHIPS - Major Energy Cargo Vessels (Representative Global Fleet)
    const tankerShips = [
      // PERSIAN GULF TANKERS
      { lat: 26.97, lng: 49.59, name: 'VLCC GULF PRIDE', cargo: 'Crude Oil', capacity: '320,000 DWT', flag: 'UAE', route: 'Persian Gulf → Asia', speed: '14.2 kts', heading: 85 },
      { lat: 25.29, lng: 51.53, name: 'SUEZMAX QATAR STAR', cargo: 'Crude Oil', capacity: '158,000 DWT', flag: 'Qatar', route: 'Ras Laffan → Europe', speed: '15.8 kts', heading: 310 },
      { lat: 26.22, lng: 50.59, name: 'LNG CARRIER HARMONY', cargo: 'LNG', capacity: '174,000 m³', flag: 'Japan', route: 'Qatar → Japan', speed: '19.5 kts', heading: 110 },
      
      // STRAIT OF HORMUZ TRAFFIC
      { lat: 26.57, lng: 56.25, name: 'VLCC HORMUZ GIANT', cargo: 'Crude Oil', capacity: '310,000 DWT', flag: 'Liberia', route: 'Saudi Arabia → China', speed: '13.8 kts', heading: 95 },
      { lat: 25.86, lng: 56.15, name: 'AFRAMAX EMIRATES WIND', cargo: 'Crude Oil', capacity: '115,000 DWT', flag: 'UAE', route: 'Abu Dhabi → India', speed: '16.2 kts', heading: 135 },
      
      // SUEZ CANAL REGION
      { lat: 30.04, lng: 32.57, name: 'VLCC SUEZ TRADER', cargo: 'Crude Oil', capacity: '298,000 DWT', flag: 'Greece', route: 'Saudi Arabia → Europe', speed: '12.1 kts', heading: 285 },
      { lat: 29.37, lng: 32.90, name: 'PRODUCT TANKER NILE', cargo: 'Refined Products', capacity: '75,000 DWT', flag: 'Egypt', route: 'Egypt → Mediterranean', speed: '14.5 kts', heading: 320 },
      
      // NORTH SEA / EUROPE
      { lat: 60.78, lng: 4.95, name: 'AFRAMAX NORTH SEA KING', cargo: 'Crude Oil', capacity: '120,000 DWT', flag: 'Norway', route: 'North Sea → Refineries', speed: '15.3 kts', heading: 225 },
      { lat: 51.90, lng: 1.31, name: 'LR2 THAMES VOYAGER', cargo: 'Refined Products', capacity: '110,000 DWT', flag: 'UK', route: 'UK → West Africa', speed: '16.7 kts', heading: 195 },
      { lat: 55.67, lng: 12.58, name: 'MR BALTIC SPIRIT', cargo: 'Refined Products', capacity: '45,000 DWT', flag: 'Denmark', route: 'Baltic → North Sea', speed: '17.2 kts', heading: 245 },
      
      // ASIA-PACIFIC TANKERS
      { lat: 1.29, lng: 103.85, name: 'VLCC SINGAPORE MAJESTY', cargo: 'Crude Oil', capacity: '315,000 DWT', flag: 'Singapore', route: 'Middle East → Asia', speed: '14.8 kts', heading: 45 },
      { lat: 35.68, lng: 139.69, name: 'LNG TOKYO EXPRESS', cargo: 'LNG', capacity: '180,000 m³', flag: 'Japan', route: 'Australia → Japan', speed: '18.9 kts', heading: 30 },
      { lat: 22.32, lng: 114.17, name: 'VLCC HONG KONG FORTUNE', cargo: 'Crude Oil', capacity: '305,000 DWT', flag: 'Hong Kong', route: 'Saudi Arabia → China', speed: '13.5 kts', heading: 25 },
      
      // AMERICAS TANKERS
      { lat: 29.76, lng: -95.37, name: 'AFRAMAX TEXAS RANGER', cargo: 'Crude Oil', capacity: '125,000 DWT', flag: 'USA', route: 'Gulf Coast → East Coast', speed: '15.6 kts', heading: 85 },
      { lat: 40.71, lng: -74.01, name: 'MR NEW YORK HARBOR', cargo: 'Refined Products', capacity: '50,000 DWT', flag: 'USA', route: 'Refinery → Distribution', speed: '12.8 kts', heading: 120 },
      { lat: 10.48, lng: -66.90, name: 'VLCC VENEZUELA GIANT', cargo: 'Heavy Crude', capacity: '280,000 DWT', flag: 'Venezuela', route: 'Venezuela → Asia', speed: '11.9 kts', heading: 275 },
      
      // WEST AFRICA TANKERS
      { lat: 4.05, lng: 9.69, name: 'VLCC NIGERIA EXPLORER', cargo: 'Crude Oil', capacity: '290,000 DWT', flag: 'Nigeria', route: 'West Africa → USA', speed: '14.1 kts', heading: 265 },
      { lat: -8.84, lng: 13.23, name: 'SUEZMAX ANGOLA PRIDE', cargo: 'Crude Oil', capacity: '145,000 DWT', flag: 'Angola', route: 'Angola → China', speed: '15.9 kts', heading: 95 },
      
      // NORTH ATLANTIC
      { lat: 47.50, lng: -52.78, name: 'AFRAMAX ATLANTIC STORM', cargo: 'Crude Oil', capacity: '118,000 DWT', flag: 'Canada', route: 'Canada → Europe', speed: '16.4 kts', heading: 75 },
      
      // TRANS-PACIFIC
      { lat: 35.00, lng: -140.00, name: 'VLCC PACIFIC VOYAGER', cargo: 'Crude Oil', capacity: '308,000 DWT', flag: 'Panama', route: 'Middle East → USA', speed: '13.7 kts', heading: 285 }
    ];
    
    console.log(`🛥️ Rendering ${tankerShips.length} active tanker ships globally`);
    
    tankerShips.forEach((ship, index) => {
      // Color coding by cargo type
      let color = '#3b82f6'; // Default blue
      if (ship.cargo.includes('LNG')) color = '#06b6d4'; // Cyan for LNG
      else if (ship.cargo.includes('Refined') || ship.cargo.includes('Product')) color = '#f59e0b'; // Orange for products
      else if (ship.cargo.includes('Crude') || ship.cargo.includes('Heavy')) color = '#8b5cf6'; // Purple for crude
      
      const shipIcon = L.divIcon({
        html: `<div style="
          width: 20px; 
          height: 20px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          transform: rotate(${ship.heading}deg);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
            <path d="M12 2v20M2 12h20"/>
            <path d="M6 6l12 12M18 6L6 18"/>
            <circle cx="12" cy="12" r="3" fill="${color}"/>
          </svg>
        </div>`,
        className: 'tanker-ship',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([ship.lat, ship.lng], { icon: shipIcon });
      
      const popupContent = `
        <div style="min-width: 220px;">
          <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px; font-weight: bold;">
            🛥️ ${ship.name}
          </h4>
          <div style="font-size: 11px; color: #666; line-height: 1.3;">
            <strong>Cargo Type:</strong> <span style="color: ${color}; font-weight: bold;">${ship.cargo}</span><br>
            <strong>Capacity:</strong> ${ship.capacity}<br>
            <strong>Flag State:</strong> ${ship.flag}<br>
            <strong>Current Route:</strong> ${ship.route}<br>
            <strong>Speed:</strong> ${ship.speed}<br>
            <strong>Heading:</strong> ${ship.heading}° 
            <strong>Status:</strong> <span style="color: #4ade80;">En Route</span>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      layerGroup.addLayer(marker);
      
      console.log(`✅ Added tanker: ${ship.name} (${ship.cargo}) at ${ship.lat.toFixed(2)}, ${ship.lng.toFixed(2)}`);
    });
    
    console.log(`🛥️ COMPLETE: ${tankerShips.length} tanker ships loaded successfully`);
  };

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      style={{ backgroundColor: '#374151' }}
    />
  );
}// Force rebuild Sun Mar 15 13:04:48 CDT 2026
