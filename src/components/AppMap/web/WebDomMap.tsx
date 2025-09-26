import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AppMapProps } from '../types';

export default function WebDomMap({ center, zoom = 13, markers = [], polylines = [], onRegionChange }: AppMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [center.longitude, center.latitude],
      zoom,
    });
    mapRef.current = map;

    map.on('load', () => {
      markers.forEach(m => {
        new maplibregl.Marker().setLngLat([m.coord.longitude, m.coord.latitude]).addTo(map);
      });
      polylines.forEach(pl => {
        map.addSource(pl.id, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: pl.path.map(p => [p.longitude, p.latitude]) },
            properties: {}
          }
        });
        map.addLayer({ id: pl.id, type: 'line', source: pl.id, paint: { 'line-width': 4, 'line-color': '#007AFF' } });
      });
    });

    map.on('moveend', () => {
      if (onRegionChange) {
        const c = map.getCenter();
        onRegionChange({ latitude: c.lat, longitude: c.lng }, map.getZoom());
      }
    });

    return () => map.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
