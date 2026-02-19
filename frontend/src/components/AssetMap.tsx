'use client';

import { useEffect, useRef, useState } from 'react';
import type { Asset } from '@/lib/types';
import { assetTypeColor } from '@/lib/utils';

interface Props {
  assets: Asset[];
  onAssetClick?: (asset: Asset) => void;
  center?: [number, number];
  zoom?: number;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  singleMarker?: boolean;
}

export default function AssetMap({ assets, onAssetClick, center = [32.0, -100.0], zoom = 6, onBoundsChange, singleMarker }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapInstance, setMapInstance] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    import('leaflet').then((L) => {
      // Fix default icon issue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: true }).setView(center, zoom);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);

      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;

      if (onBoundsChange) {
        map.on('moveend', () => {
          const b = map.getBounds();
          onBoundsChange({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          });
        });
      }

      // Fix zoom/drag issues from container size not being ready
      setTimeout(() => map.invalidateSize(), 100);

      setMapInstance(map);
    });

    return () => {
      mapInstance?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance || !markersRef.current) return;

    import('leaflet').then((L) => {
      markersRef.current!.clearLayers();

      assets.forEach((asset) => {
        const color = assetTypeColor(asset.type);
        const icon = L.divIcon({
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #111"></div>`,
          className: '',
          iconSize: [12, 12],
        });

        const marker = L.marker([asset.latitude, asset.longitude], { icon }).addTo(markersRef.current!);
        marker.bindPopup(`
          <div style="font-size:12px;min-width:150px">
            <strong>${asset.name}</strong><br/>
            <span style="color:${color}">${asset.type.toUpperCase()}</span> · ${asset.status}<br/>
            ${asset.basin} · ${asset.state}<br/>
            Production: ${asset.currentProduction.toLocaleString()} bbl/mo<br/>
            <a href="/assets/${asset.id}" style="color:#DAA520">View Detail →</a>
          </div>
        `);

        if (onAssetClick) {
          marker.on('click', () => onAssetClick(asset));
        }
      });

      if (singleMarker && assets.length === 1) {
        mapInstance.setView([assets[0].latitude, assets[0].longitude], 10);
      }
    });
  }, [assets, mapInstance, onAssetClick, singleMarker]);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-xl" style={{ background: '#111827' }} />
    </>
  );
}
