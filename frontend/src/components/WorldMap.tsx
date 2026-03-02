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

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [29.0, 42.0], // Center on entire Middle East region
      zoom: 4,
      zoomControl: false, // Hide default zoom controls
      attributionControl: false, // Hide attribution for cleaner look
    });

    // Add dark mode tile layer (CartoDB Dark Matter)
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Add custom zoom control in bottom right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle layer visibility changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing overlays but keep base layers
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        // Only remove non-tile layers
        if (!(layer as any)._url) {
          mapInstanceRef.current!.removeLayer(layer);
        }
      }
    });

    // Add shipping lanes using small, closely-spaced circles
    if (activeLayers.includes('shipping-lanes')) {
      
      // Function to create curved shipping route through multiple waypoints
      const createCurvedRoute = (waypoints: [number, number][], routeName: string, dotsPerSegment: number = 10) => {
        for (let i = 0; i < waypoints.length - 1; i++) {
          const start = waypoints[i];
          const end = waypoints[i + 1];
          const latStep = (end[0] - start[0]) / dotsPerSegment;
          const lngStep = (end[1] - start[1]) / dotsPerSegment;
          
          for (let j = 0; j <= dotsPerSegment; j++) {
            const lat = start[0] + (latStep * j);
            const lng = start[1] + (lngStep * j);
            
            L.circle([lat, lng], {
              color: '#a855f7',
              fillColor: '#a855f7',
              fillOpacity: 0.9,
              radius: 6000, // Smaller 6km circles for density
              weight: 0
            }).addTo(mapInstanceRef.current!).bindPopup(routeName);
          }
        }
      };

      // REALISTIC CURVED SHIPPING ROUTES WITH MULTIPLE WAYPOINTS

      // 1. Trans-Pacific Route (Asia to US West Coast)
      createCurvedRoute([
        [35.7, 139.7], // Tokyo
        [40.0, 155.0], // North Pacific
        [45.0, 170.0], // Aleutian approach
        [50.0, -170.0], // Bering Sea approach
        [55.0, -145.0], // Gulf of Alaska
        [47.6, -122.3]  // Seattle
      ], 'Trans-Pacific Route', 15);

      // 2. Trans-Pacific Southern Route (Asia to US via Hawaii)
      createCurvedRoute([
        [22.3, 114.2], // Hong Kong
        [21.3, 157.8], // Honolulu
        [34.0, -118.2] // Los Angeles
      ], 'Trans-Pacific Southern Route', 20);

      // 3. Europe to Asia via Suez (realistic curve through Red Sea)
      createCurvedRoute([
        [51.5, -0.1],   // London
        [43.3, -8.4],   // Spain
        [36.0, -5.4],   // Gibraltar
        [35.9, 14.4],   // Mediterranean
        [31.2, 29.9],   // Alexandria  
        [30.0, 32.3],   // Suez Canal
        [27.0, 33.8],   // Red Sea North
        [24.0, 37.0],   // Red Sea Middle
        [15.0, 42.0],   // Red Sea South
        [12.6, 43.3],   // Bab el-Mandeb
        [8.0, 54.0],    // Arabian Sea
        [20.0, 65.0],   // Arabian Sea North
        [22.3, 72.8]    // Mumbai
      ], 'Europe-Asia via Suez', 12);

      // 4. North Atlantic Route (curved following great circle)
      createCurvedRoute([
        [40.7, -74.0], // New York
        [45.0, -45.0], // Mid-Atlantic North
        [50.0, -25.0], // North Atlantic
        [53.0, -8.0],  // Irish Sea approach
        [51.5, -0.1]   // London
      ], 'North Atlantic Route', 15);

      // 5. Panama Canal Route (Caribbean curve)
      createCurvedRoute([
        [25.8, -80.1], // Miami
        [23.0, -82.0], // Cuba passage
        [18.0, -78.0], // Caribbean
        [15.0, -75.0], // Caribbean South
        [12.0, -72.0], // Colombia waters
        [9.1, -79.7],  // Panama Canal
        [8.0, -82.0],  // Pacific approach
        [34.0, -118.2] // Los Angeles
      ], 'Panama Canal Route', 12);

      // 6. Cape Route (around Africa - classic curved route)
      createCurvedRoute([
        [51.5, -0.1],   // London
        [43.3, -8.4],   // Spain
        [33.0, -16.5],  // Canary Islands
        [15.0, -25.0],  // West Africa
        [-5.0, -10.0],  // Equatorial Atlantic
        [-25.0, 5.0],   // South Atlantic
        [-34.4, 18.4],  // Cape of Good Hope
        [-30.0, 35.0],  // Indian Ocean West
        [-20.0, 57.0],  // Mauritius area
        [1.3, 103.8]    // Singapore
      ], 'Cape Route (Europe-Asia)', 10);

      // 7. Australia-Japan Route
      createCurvedRoute([
        [-33.9, 151.2], // Sydney
        [-30.0, 165.0], // Tasman Sea
        [-25.0, 175.0], // New Zealand waters
        [-15.0, 180.0], // Fiji area
        [0.0, 170.0],   // Equatorial Pacific
        [15.0, 150.0],  // Philippines Sea
        [35.7, 139.7]   // Tokyo
      ], 'Australia-Japan Route', 12);

      // 8. Persian Gulf to Asia (oil tanker route)
      createCurvedRoute([
        [26.2, 50.6],  // Kuwait
        [26.5, 56.2],  // Strait of Hormuz
        [22.0, 65.0],  // Arabian Sea
        [15.0, 72.0],  // Indian Ocean
        [8.0, 80.0],   // Sri Lanka waters
        [3.0, 95.0],   // Bay of Bengal
        [1.3, 103.8],  // Singapore
        [22.3, 114.2]  // Hong Kong
      ], 'Persian Gulf-Asia Oil Route', 12);

      // 9. Arctic Route (Northern Sea Route - emerging)
      createCurvedRoute([
        [69.0, 33.0],  // Murmansk
        [73.0, 60.0],  // Arctic Ocean
        [75.0, 100.0], // Laptev Sea  
        [72.0, 140.0], // East Siberian Sea
        [66.0, 170.0], // Chukchi Sea
        [64.0, -165.0], // Bering Strait
        [61.2, -149.9]  // Anchorage
      ], 'Arctic Northern Sea Route', 8);

      // 10. Mediterranean Energy Routes
      createCurvedRoute([
        [41.9, 12.5],  // Rome
        [37.5, 15.1],  // Sicily
        [35.1, 25.7],  // Crete
        [36.2, 28.0],  // Turkey
        [41.0, 29.0]   // Istanbul
      ], 'Mediterranean Energy Route', 10);
    }

    // Add geopolitical alerts if active
    if (activeLayers.includes('geopolitical')) {
      // Mock Middle East geopolitical alerts
      const geopoliticalAlerts = [
        {
          lat: 33.3128,
          lng: 44.3615,
          title: "Pipeline Security Incident",
          description: "Reports of infrastructure disruption in Iraq",
          severity: "high",
          date: "2026-02-21T14:00:00Z"
        },
        {
          lat: 20.0,
          lng: 38.0,
          title: "Red Sea Shipping Alert", 
          description: "Commercial vessel security concerns reported",
          severity: "moderate",
          date: "2026-02-21T10:30:00Z"
        },
        {
          lat: 26.5667,
          lng: 56.25,
          title: "Strait of Hormuz Tensions",
          description: "Naval activity monitoring increased",
          severity: "critical",
          date: "2026-02-21T16:15:00Z"
        },
        {
          lat: 24.2134,
          lng: 55.8713,
          title: "Energy Infrastructure Alert",
          description: "UAE facilities on heightened security status",
          severity: "moderate", 
          date: "2026-02-21T12:45:00Z"
        }
      ];

      // Add markers for each alert
      geopoliticalAlerts.forEach((alert) => {
        const color = '#ef4444'; // All geopolitical alerts are red
        
        // Create custom icon
        const alertIcon = L.divIcon({
          html: `<div style="
            width: 12px; 
            height: 12px; 
            background-color: ${color}; 
            border: 2px solid white; 
            border-radius: 50%; 
            box-shadow: 0 0 6px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
          "></div>`,
          className: 'geopolitical-alert',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const marker = L.marker([alert.lat, alert.lng], { 
          icon: alertIcon 
        }).addTo(mapInstanceRef.current!);

        // Add popup with alert details (severity shown in text)
        const severityColor = alert.severity === 'critical' ? '#dc2626' : 
                             alert.severity === 'high' ? '#ea580c' : '#eab308';
        
        const popupContent = `
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px; font-weight: bold;">
              ${alert.title}
            </h4>
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #DAA520;">
              ${alert.description}
            </p>
            <div style="font-size: 11px; color: #666;">
              <strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${alert.severity.toUpperCase()}</span><br>
              <strong>Time:</strong> ${new Date(alert.date).toLocaleString()}
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
      });
    }

    // Add active wells (oil & gas combined) if active
    if (activeLayers.includes('active-wells')) {
      const activeWells = [
        // Oil wells - all gold colored
        { lat: 26.0, lng: 50.0, name: "Kuwait Oil Field", type: "Oil", production: "45,000 bbl/day", color: "#DAA520" },
        { lat: 25.0, lng: 51.0, name: "Qatar Oil Platform", type: "Oil", production: "62,000 bbl/day", color: "#DAA520" },
        { lat: 24.5, lng: 54.5, name: "UAE Offshore", type: "Oil", production: "38,000 bbl/day", color: "#DAA520" },
        { lat: 29.0, lng: 48.0, name: "Iraqi Rumaila", type: "Oil", production: "95,000 bbl/day", color: "#DAA520" },
        { lat: 27.5, lng: 49.5, name: "Saudi Ghawar", type: "Oil", production: "125,000 bbl/day", color: "#DAA520" },
        // Gas wells - all gold colored
        { lat: 25.5, lng: 51.2, name: "North Field Gas", type: "Gas", production: "2.8 BCF/day", color: "#DAA520" },
        { lat: 26.8, lng: 50.2, name: "South Pars", type: "Gas", production: "3.2 BCF/day", color: "#DAA520" },
        { lat: 24.0, lng: 54.0, name: "Khuff Formation", type: "Gas", production: "1.9 BCF/day", color: "#DAA520" },
        { lat: 28.0, lng: 49.0, name: "Kangan Field", type: "Gas", production: "2.1 BCF/day", color: "#DAA520" },
        { lat: 23.5, lng: 53.5, name: "Abu Dhabi Gas", type: "Gas", production: "1.6 BCF/day", color: "#DAA520" }
      ];

      activeWells.forEach((well) => {
        const wellIcon = L.divIcon({
          html: `<div style="
            width: 20px; 
            height: 20px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${well.color}" stroke-width="2">
              <!-- Main derrick tower -->
              <path d="M12 3v18"/>
              <!-- Derrick top -->
              <path d="M9 3l6 0"/>
              <!-- Cross beams -->
              <path d="M10 6l4 0"/>
              <path d="M10 9l4 0"/>
              <path d="M10 12l4 0"/>
              <!-- Derrick legs -->
              <path d="M9 3l-2 18"/>
              <path d="M15 3l2 18"/>
              <!-- Base platform -->
              <path d="M7 21l10 0"/>
              <!-- Drilling equipment -->
              <rect x="11" y="4" width="2" height="3" fill="${well.color}"/>
              ${well.type === 'Gas' ? `<circle cx="12" cy="8" r="1" fill="${well.color}"/>` : `<rect x="11.5" y="8" width="1" height="2" fill="${well.color}"/>`}
            </svg>
          </div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([well.lat, well.lng], { icon: wellIcon }).addTo(mapInstanceRef.current!);
        marker.bindPopup(`
          <div style="min-width: 150px;">
            <h4 style="margin: 0 0 8px 0; color: ${well.color}; font-size: 14px; font-weight: bold;">
              ${well.name}
            </h4>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #DAA520;">
              Type: ${well.type} Well
            </p>
            <p style="margin: 0; font-size: 12px; color: #DAA520;">
              Production: ${well.production}
            </p>
          </div>
        `);
      });
    }

    // Add drilling rigs if active
    if (activeLayers.includes('drilling-rigs')) {
      const drillingRigs = [
        { lat: 27.0, lng: 50.5, name: "Rig-47", status: "Active drilling", depth: "8,500 ft" },
        { lat: 25.8, lng: 52.0, name: "Offshore Platform-12", status: "Active drilling", depth: "12,200 ft" },
        { lat: 26.3, lng: 49.8, name: "Desert Rig-203", status: "Active drilling", depth: "6,800 ft" },
        { lat: 28.5, lng: 48.5, name: "Mobile Rig-89", status: "Moving to location", depth: "N/A" },
        { lat: 29.5, lng: 47.5, name: "Exploration Rig-156", status: "Active drilling", depth: "11,800 ft" }
      ];

      drillingRigs.forEach((rig) => {
        const rigColor = "#4ade80"; // Green color for active drilling rigs
        
        const rigIcon = L.divIcon({
          html: `<div style="
            width: 20px; 
            height: 20px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${rigColor}" stroke-width="2">
              <!-- Main derrick tower -->
              <path d="M12 3v18"/>
              <!-- Derrick top -->
              <path d="M9 3l6 0"/>
              <!-- Cross beams -->
              <path d="M10 6l4 0"/>
              <path d="M10 9l4 0"/>
              <path d="M10 12l4 0"/>
              <!-- Derrick legs -->
              <path d="M9 3l-2 18"/>
              <path d="M15 3l2 18"/>
              <!-- Base platform -->
              <path d="M7 21l10 0"/>
              <!-- Active drilling indicator - rotating drill bit -->
              <rect x="11" y="4" width="2" height="4" fill="${rigColor}"/>
              <circle cx="12" cy="15" r="1.5" fill="${rigColor}"/>
            </svg>
          </div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([rig.lat, rig.lng], { icon: rigIcon }).addTo(mapInstanceRef.current!);
        marker.bindPopup(`
          <div style="min-width: 150px;">
            <h4 style="margin: 0 0 8px 0; color: ${rigColor}; font-size: 14px; font-weight: bold;">
              ${rig.name}
            </h4>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #DAA520;">
              Status: ${rig.status}
            </p>
            <p style="margin: 0; font-size: 12px; color: #666;">
              Depth: ${rig.depth}
            </p>
          </div>
        `);
      });
    }

    console.log('Active layers changed:', activeLayers);
  }, [activeLayers]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      style={{
        // Override leaflet's default styles
        backgroundColor: '#374151', // gray-700
      }}
    />
  );
}