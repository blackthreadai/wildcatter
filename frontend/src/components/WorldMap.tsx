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
              color: '#4ade80', // Green color
              fillColor: '#4ade80',
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
      // Fetch live geopolitical events
      fetch('/api/geopolitical-events')
        .then(response => response.json())
        .then(data => {
          const geopoliticalAlerts = data.events || [];

          // Add markers for each alert
          geopoliticalAlerts.forEach((alert: any) => {
            // Color coding by severity
            let color = '#ef4444'; // Default red
            let pulseAnimation = '';
            
            switch (alert.severity) {
              case 'critical':
                color = '#dc2626'; // Dark red
                pulseAnimation = 'animation: pulse 1s infinite;';
                break;
              case 'high':
                color = '#ef4444'; // Red
                pulseAnimation = 'animation: pulse 2s infinite;';
                break;
              case 'moderate':
                color = '#f59e0b'; // Orange
                break;
              case 'low':
                color = '#eab308'; // Yellow
                break;
            }
            
            // Create custom icon with severity-based styling
            const alertIcon = L.divIcon({
              html: `<div style="
                width: 12px; 
                height: 12px; 
                background-color: ${color}; 
                border: 2px solid #b91c1c; 
                border-radius: 50%; 
                box-shadow: 0 0 6px rgba(0,0,0,0.3);
                ${pulseAnimation}
              "></div>`,
              className: 'geopolitical-alert',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });

            const marker = L.marker([alert.lat, alert.lng], { 
              icon: alertIcon 
            }).addTo(mapInstanceRef.current!);

            // Enhanced popup with more details
            const severityColor = alert.severity === 'critical' ? '#dc2626' : 
                                 alert.severity === 'high' ? '#ea580c' : 
                                 alert.severity === 'moderate' ? '#f59e0b' : '#eab308';
            
            const categoryEmojis = {
              pipeline: '🛢️',
              naval: '⚓',
              sanctions: '🚫',
              facility: '🏭',
              conflict: '⚔️',
              protest: '✊',
              general: '📢'
            };
            
            const popupContent = `
              <div style="min-width: 220px;">
                <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px; font-weight: bold;">
                  ${categoryEmojis[alert.category as keyof typeof categoryEmojis] || '📢'} ${alert.title}
                </h4>
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #DAA520; line-height: 1.4;">
                  ${alert.description}
                </p>
                <div style="font-size: 11px; color: #666; line-height: 1.3;">
                  <strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${alert.severity.toUpperCase()}</span><br>
                  <strong>Source:</strong> ${alert.source}<br>
                  <strong>Countries:</strong> ${alert.countries.join(', ')}<br>
                  <strong>Time:</strong> ${new Date(alert.date).toLocaleString()}<br>
                  <strong>Confidence:</strong> ${Math.round(alert.confidence * 100)}%
                </div>
              </div>
            `;
            
            marker.bindPopup(popupContent);
          });
        })
        .catch(error => {
          console.error('Failed to fetch geopolitical events:', error);
          // Fallback to a few critical events if API fails
          const fallbackAlerts = [
            {
              lat: 26.5667, lng: 56.25,
              title: "Strait of Hormuz Monitoring",
              description: "Critical shipping lane under enhanced surveillance",
              severity: "high", category: "naval", source: "Fallback Data",
              countries: ["Iran", "UAE"], confidence: 0.8,
              date: new Date().toISOString()
            }
          ];
          
          fallbackAlerts.forEach((alert) => {
            const color = '#ef4444';
            const alertIcon = L.divIcon({
              html: `<div style="width: 12px; height: 12px; background-color: ${color}; border: 2px solid #b91c1c; border-radius: 50%; animation: pulse 2s infinite;"></div>`,
              className: 'geopolitical-alert', iconSize: [12, 12], iconAnchor: [6, 6]
            });
            L.marker([alert.lat, alert.lng], { icon: alertIcon }).addTo(mapInstanceRef.current!)
             .bindPopup(`<div><h4>${alert.title}</h4><p>${alert.description}</p></div>`);
          });
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

    // Add refineries if active
    if (activeLayers.includes('refineries')) {
      const refineries = [
        { lat: 29.3, lng: 47.8, name: "Ras Tanura Refinery", capacity: "550,000 bbl/day", country: "Saudi Arabia" },
        { lat: 29.1, lng: 48.1, name: "Abadan Refinery", capacity: "400,000 bbl/day", country: "Iran" },
        { lat: 26.2, lng: 50.1, name: "Mina Al-Ahmadi", capacity: "466,000 bbl/day", country: "Kuwait" },
        { lat: 25.0, lng: 55.2, name: "Jebel Ali Refinery", capacity: "140,000 bbl/day", country: "UAE" },
        { lat: 24.5, lng: 46.7, name: "Riyadh Refinery", capacity: "120,000 bbl/day", country: "Saudi Arabia" }
      ];

      refineries.forEach((refinery) => {
        const refineryIcon = L.divIcon({
          html: `<div style="
            width: 18px; 
            height: 18px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#DAA520">
              <rect x="4" y="10" width="16" height="12" rx="1"/>
              <rect x="6" y="4" width="3" height="8" rx="0.5"/>
              <rect x="10" y="6" width="3" height="6" rx="0.5"/>
              <rect x="14" y="3" width="3" height="9" rx="0.5"/>
              <circle cx="7.5" cy="3" r="1" fill="white"/>
              <circle cx="11.5" cy="5" r="1" fill="white"/>
              <circle cx="15.5" cy="2" r="1" fill="white"/>
            </svg>
          </div>`,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        const marker = L.marker([refinery.lat, refinery.lng], { icon: refineryIcon }).addTo(mapInstanceRef.current!);
        marker.bindPopup(`
          <div style="min-width: 160px;">
            <h4 style="margin: 0 0 8px 0; color: #DAA520; font-size: 14px; font-weight: bold;">
              ${refinery.name}
            </h4>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #DAA520;">
              Capacity: ${refinery.capacity}
            </p>
            <p style="margin: 0; font-size: 12px; color: #666;">
              Location: ${refinery.country}
            </p>
          </div>
        `);
      });
    }

    // Add pipeline routes if active
    if (activeLayers.includes('pipelines')) {
      const pipelines = [
        {
          name: "Trans-Arabian Pipeline",
          coordinates: [[26.0, 50.0], [31.0, 35.0]], // Kuwait to Mediterranean
          capacity: "1.2 million bbl/day"
        },
        {
          name: "Iraq-Turkey Pipeline", 
          coordinates: [[33.3, 44.4], [37.0, 41.0]], // Iraq to Turkey
          capacity: "1.6 million bbl/day"
        },
        {
          name: "Petroline",
          coordinates: [[24.5, 46.7], [26.7, 49.6]], // Saudi internal pipeline
          capacity: "4.8 million bbl/day"
        },
        {
          name: "Iran-Pakistan Pipeline",
          coordinates: [[29.0, 60.0], [25.0, 67.0]], // Iran to Pakistan
          capacity: "760,000 bbl/day"
        }
      ];

      pipelines.forEach((pipeline) => {
        const pipelineColor = '#ef4444'; // Red color
        
        // Create pipeline as series of small circles
        const startLat = pipeline.coordinates[0][0];
        const startLng = pipeline.coordinates[0][1];
        const endLat = pipeline.coordinates[1][0];
        const endLng = pipeline.coordinates[1][1];
        
        // Create points along the pipeline route
        const numPoints = 15;
        for (let i = 0; i <= numPoints; i++) {
          const ratio = i / numPoints;
          const lat = startLat + (endLat - startLat) * ratio;
          const lng = startLng + (endLng - startLng) * ratio;
          
          L.circle([lat, lng], {
            color: pipelineColor,
            fillColor: pipelineColor,
            fillOpacity: 0.8,
            radius: 5000, // 5km circles
            weight: 1
          }).addTo(mapInstanceRef.current!).bindPopup(`
            <div style="min-width: 150px;">
              <h4 style="margin: 0 0 8px 0; color: ${pipelineColor}; font-size: 14px; font-weight: bold;">
                ${pipeline.name}
              </h4>
              <p style="margin: 0; font-size: 12px; color: #DAA520;">
                Capacity: ${pipeline.capacity}
              </p>
            </div>
          `);
        }
      });
    }

    // Add tanker ships if active
    if (activeLayers.includes('tanker-ships')) {
      const tankerShips = [
        { lat: 26.0, lng: 56.8, name: "Crude Tanker Alpha", cargo: "2.0M barrels", status: "Loading", route: "Persian Gulf to Asia" },
        { lat: 25.5, lng: 54.0, name: "LNG Carrier Beta", cargo: "125,000 m³ LNG", status: "Transit", route: "Qatar to Europe" },
        { lat: 28.0, lng: 50.5, name: "Product Tanker Gamma", cargo: "750,000 barrels", status: "Anchored", route: "Kuwait to India" },
        { lat: 24.8, lng: 57.2, name: "VLCC Delta", cargo: "2.2M barrels", status: "Loading", route: "UAE to Japan" },
        { lat: 27.2, lng: 52.0, name: "Chemical Tanker Epsilon", cargo: "45,000 tons", status: "Transit", route: "Iran to Turkey" }
      ];

      tankerShips.forEach((ship) => {
        const shipIcon = L.divIcon({
          html: `<div style="
            width: 20px; 
            height: 20px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 16px;
          ">⚓</div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([ship.lat, ship.lng], { icon: shipIcon }).addTo(mapInstanceRef.current!);
        marker.bindPopup(`
          <div style="min-width: 160px;">
            <h4 style="margin: 0 0 8px 0; color: #DAA520; font-size: 14px; font-weight: bold;">
              ${ship.name}
            </h4>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #DAA520;">
              Cargo: ${ship.cargo}
            </p>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
              Status: ${ship.status}
            </p>
            <p style="margin: 0; font-size: 12px; color: #666;">
              Route: ${ship.route}
            </p>
          </div>
        `);
      });
    }

    // Add weather alerts if active
    if (activeLayers.includes('weather')) {
      // Fetch live weather alerts
      fetch('/api/weather-alerts')
        .then(response => response.json())
        .then(data => {
          const weatherAlerts = data.alerts || [];

          // Add markers for each weather alert
          weatherAlerts.forEach((alert: any) => {
            // Color coding by severity
            let color = '#fbbf24'; // Default yellow
            let pulseAnimation = '';
            
            switch (alert.severity) {
              case 'extreme':
                color = '#dc2626'; // Dark red
                pulseAnimation = 'animation: pulse 0.8s infinite;';
                break;
              case 'high':
                color = '#ea580c'; // Orange-red
                pulseAnimation = 'animation: pulse 1.5s infinite;';
                break;
              case 'moderate':
                color = '#f59e0b'; // Orange
                break;
              case 'low':
                color = '#eab308'; // Yellow
                break;
            }
            
            // Create upside-down triangle icon (40% larger)
            const alertIcon = L.divIcon({
              html: `<div style="
                width: 22px; 
                height: 22px; 
                display: flex;
                align-items: center;
                justify-content: center;
                ${pulseAnimation}
              ">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="${color}">
                  <path d="M12 16l-6-8h12l-6 8z"/>
                </svg>
              </div>`,
              className: 'weather-alert',
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });

            const marker = L.marker([alert.lat, alert.lng], { 
              icon: alertIcon 
            }).addTo(mapInstanceRef.current!);

            // Enhanced popup with weather-specific details
            const severityColor = alert.severity === 'extreme' ? '#dc2626' : 
                                 alert.severity === 'high' ? '#ea580c' : 
                                 alert.severity === 'moderate' ? '#f59e0b' : '#eab308';
            
            const weatherTypeNames: {[key: string]: string} = {
              hurricane: 'Hurricane',
              typhoon: 'Typhoon',
              tornado: 'Tornado',
              flood: 'Flood',
              drought: 'Drought',
              wildfire: 'Wildfire',
              blizzard: 'Blizzard',
              heatwave: 'Heat Wave',
              thunderstorm: 'Severe Storm'
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
                  <strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${alert.severity.toUpperCase()}</span><br>
                  <strong>Location:</strong> ${alert.location}<br>
                  <strong>Source:</strong> ${alert.source}<br>
                  <strong>Issued:</strong> ${new Date(alert.date).toLocaleString()}<br>
                  ${alert.expires ? `<strong>Expires:</strong> ${new Date(alert.expires).toLocaleString()}<br>` : ''}
                  <strong>Confidence:</strong> ${Math.round(alert.confidence * 100)}%
                </div>
              </div>
            `;
            
            marker.bindPopup(popupContent);
          });
        })
        .catch(error => {
          console.error('Failed to fetch weather alerts:', error);
          // No fallback weather alerts - if API fails, show nothing rather than fake data
        });
    }

    // Add seismic activity if active
    if (activeLayers.includes('seismic-activity')) {
      // Fetch live seismic events
      fetch('/api/seismic-activity')
        .then(response => response.json())
        .then(data => {
          const seismicEvents = data.events || [];

          // Add markers for each seismic event
          seismicEvents.forEach((event: any) => {
            // Color coding by magnitude/severity
            let color = '#fbbf24'; // Default yellow
            let pulseAnimation = '';
            
            switch (event.severity) {
              case 'extreme':
                color = '#dc2626'; // Dark red (magnitude 7.0+)
                pulseAnimation = 'animation: pulse 0.6s infinite;';
                break;
              case 'high':
                color = '#ea580c'; // Orange-red (magnitude 5.0-6.9)
                pulseAnimation = 'animation: pulse 1.2s infinite;';
                break;
              case 'moderate':
                color = '#f59e0b'; // Orange (magnitude 3.5-4.9)
                break;
              case 'low':
                color = '#eab308'; // Yellow (magnitude 2.0-3.4)
                break;
            }
            
            // Create circle icon for earthquakes (different from weather triangles)
            const alertIcon = L.divIcon({
              html: `<div style="
                width: 20px; 
                height: 20px; 
                display: flex;
                align-items: center;
                justify-content: center;
                ${pulseAnimation}
              ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${color}" stroke="rgba(255,255,255,0.8)" stroke-width="1">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>`,
              className: 'seismic-event',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });

            const marker = L.marker([event.lat, event.lng], { 
              icon: alertIcon 
            }).addTo(mapInstanceRef.current!);

            // Enhanced popup with earthquake-specific details
            const severityColor = event.severity === 'extreme' ? '#dc2626' : 
                                 event.severity === 'high' ? '#ea580c' : 
                                 event.severity === 'moderate' ? '#f59e0b' : '#eab308';
            
            const popupContent = `
              <div style="min-width: 220px;">
                <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px; font-weight: bold;">
                  🌍 ${event.title}
                </h4>
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #DAA520; line-height: 1.4;">
                  ${event.description}
                </p>
                <div style="font-size: 11px; color: #666; line-height: 1.3;">
                  <strong>Magnitude:</strong> <span style="color: ${severityColor}; font-weight: bold;">${event.magnitude.toFixed(1)}</span><br>
                  <strong>Depth:</strong> ${event.depth.toFixed(1)}km<br>
                  <strong>Location:</strong> ${event.location}<br>
                  <strong>Source:</strong> ${event.source}<br>
                  <strong>Time:</strong> ${new Date(event.date).toLocaleString()}<br>
                  <strong>Confidence:</strong> ${Math.round(event.confidence * 100)}%
                </div>
              </div>
            `;
            
            marker.bindPopup(popupContent);
          });
        })
        .catch(error => {
          console.error('Failed to fetch seismic events:', error);
          // No fallback - if seismic API fails, just show nothing
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