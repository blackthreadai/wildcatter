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
      
      // Function to create dotted shipping route
      const createShippingRoute = (start: [number, number], end: [number, number], routeName: string, numDots: number = 20) => {
        const latStep = (end[0] - start[0]) / numDots;
        const lngStep = (end[1] - start[1]) / numDots;
        
        for (let i = 0; i <= numDots; i++) {
          const lat = start[0] + (latStep * i);
          const lng = start[1] + (lngStep * i);
          
          L.circle([lat, lng], {
            color: '#a855f7',
            fillColor: '#a855f7',
            fillOpacity: 0.9,
            radius: 8000, // Small 8km circles
            weight: 0 // No border for cleaner look
          }).addTo(mapInstanceRef.current!).bindPopup(routeName);
        }
      };

      // Major Global Shipping Routes
      
      // 1. Suez Canal to Persian Gulf
      createShippingRoute([30.7, 32.3], [26.5, 56.2], 'Suez-Persian Gulf Route', 25);
      
      // 2. Strait of Hormuz
      createShippingRoute([26.5, 56.1], [26.6, 56.9], 'Strait of Hormuz', 15);
      
      // 3. Red Sea Route  
      createShippingRoute([30.0, 32.5], [12.6, 43.3], 'Red Sea Shipping Lane', 30);
      
      // 4. Mediterranean Route
      createShippingRoute([36.0, -5.5], [36.0, 28.0], 'Mediterranean Shipping Route', 35);
      
      // 5. North Atlantic Route
      createShippingRoute([50.0, -30.0], [50.0, 0.0], 'North Atlantic Route', 25);
      
      // 6. Panama Canal Approach  
      createShippingRoute([9.1, -79.7], [25.0, -90.0], 'Panama Canal Route', 20);
      
      // 7. Singapore Strait to China
      createShippingRoute([1.3, 103.8], [22.0, 114.0], 'Asia Pacific Route', 30);
      
      // 8. English Channel
      createShippingRoute([50.0, -1.0], [51.5, 2.0], 'English Channel', 15);
      
      // 9. Cape of Good Hope (Africa route)
      createShippingRoute([-34.4, 18.4], [-20.0, 40.0], 'Cape Route', 25);
      
      // 10. Baltic Sea Route
      createShippingRoute([60.0, 10.0], [60.0, 28.0], 'Baltic Sea Route', 20);
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