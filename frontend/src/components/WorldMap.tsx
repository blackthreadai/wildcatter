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

    // Add shipping lanes using circles (since polylines don't work)
    if (activeLayers.includes('shipping-lanes')) {
      // Strait of Hormuz shipping route using circles
      const hormanRoute = [
        [26.5, 56.2], [26.6, 56.4], [26.7, 56.6], [26.8, 56.8]
      ];
      
      hormanRoute.forEach((coords, index) => {
        L.circle(coords as [number, number], {
          color: '#a855f7',
          fillColor: '#a855f7', 
          fillOpacity: 0.8,
          radius: 15000,
          weight: 2
        }).addTo(mapInstanceRef.current!).bindPopup('Strait of Hormuz Shipping Lane');
      });

      // Suez Canal Route using circles  
      const suezRoute = [
        [30.0, 32.3], [29.5, 32.7], [29.0, 33.2], [28.0, 34.0], [26.0, 35.5]
      ];
      
      suezRoute.forEach((coords, index) => {
        L.circle(coords as [number, number], {
          color: '#a855f7',
          fillColor: '#a855f7',
          fillOpacity: 0.8, 
          radius: 20000,
          weight: 2
        }).addTo(mapInstanceRef.current!).bindPopup('Suez Canal Shipping Route');
      });

      // Red Sea Route
      const redSeaRoute = [
        [25.0, 35.0], [22.0, 37.0], [18.0, 40.0], [15.0, 42.0], [12.6, 43.3]
      ];
      
      redSeaRoute.forEach((coords, index) => {
        L.circle(coords as [number, number], {
          color: '#a855f7', 
          fillColor: '#a855f7',
          fillOpacity: 0.8,
          radius: 25000,
          weight: 2
        }).addTo(mapInstanceRef.current!).bindPopup('Red Sea Shipping Lane');
      });
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