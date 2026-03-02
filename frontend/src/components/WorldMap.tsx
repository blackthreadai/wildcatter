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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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

    // Clear existing markers first
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstanceRef.current!.removeLayer(layer);
      }
    });

    // Add shipping lanes if active
    if (activeLayers.includes('shipping-lanes')) {
      // Major global shipping routes (simplified)
      const shippingRoutes = [
        {
          name: "Suez Canal Route",
          coordinates: [
            [29.9773, 32.5498], // Suez Canal
            [25.0, 35.0], // Red Sea
            [12.0, 43.0], // Bab el-Mandeb
            [8.0, 54.0], // Arabian Sea
            [20.0, 65.0], // Persian Gulf approach
          ]
        },
        {
          name: "Strait of Hormuz",
          coordinates: [
            [26.5667, 56.25], // Strait of Hormuz west
            [26.5, 56.5], // Strait of Hormuz center  
            [26.4, 56.8], // Strait of Hormuz east
          ]
        },
        {
          name: "Panama Canal Route", 
          coordinates: [
            [9.08, -79.68], // Panama Canal
            [15.0, -85.0], // Caribbean approach
            [25.0, -90.0], // Gulf of Mexico
            [29.0, -94.0], // Texas ports
          ]
        },
        {
          name: "North Sea Route",
          coordinates: [
            [60.0, 5.0], // North Sea
            [58.0, 3.0], // UK waters
            [51.5, 2.0], // English Channel
            [49.0, -2.0], // Atlantic approach
          ]
        },
        {
          name: "Singapore Strait",
          coordinates: [
            [1.25, 103.8], // Singapore Strait
            [3.0, 105.0], // South China Sea
            [10.0, 107.0], // Vietnam coast
            [18.0, 109.0], // China approach
          ]
        },
        {
          name: "Mediterranean Route",
          coordinates: [
            [36.0, -5.5], // Gibraltar
            [37.0, 0.0], // Spanish coast
            [40.0, 8.0], // Italian coast  
            [35.0, 18.0], // Greek waters
            [36.0, 28.0], // Turkey approach
          ]
        }
      ];

      // Draw shipping lanes
      shippingRoutes.forEach((route) => {
        const polyline = L.polyline(route.coordinates, {
          color: '#a855f7', // Purple color matching layer
          weight: 2,
          opacity: 0.8,
          dashArray: '5, 5' // Dashed line for shipping routes
        }).addTo(mapInstanceRef.current!);

        // Add popup with route info
        polyline.bindPopup(`
          <div style="min-width: 150px;">
            <h4 style="margin: 0 0 8px 0; color: #a855f7; font-size: 14px; font-weight: bold;">
              ${route.name}
            </h4>
            <p style="margin: 0; font-size: 12px; color: #DAA520;">
              Major shipping route for energy transport
            </p>
            <div style="font-size: 11px; color: #666; margin-top: 6px;">
              <strong>Type:</strong> Commercial Shipping Lane
            </div>
          </div>
        `);
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