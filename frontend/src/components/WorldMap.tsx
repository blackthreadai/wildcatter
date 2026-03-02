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
      center: [26.0, 51.0], // Center on Persian Gulf region
      zoom: 6,
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
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #333;">
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