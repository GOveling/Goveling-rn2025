import React, { useEffect, useRef, useState } from 'react';

import maplibregl from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_URL } from '../../../config/maps';
import { AppMapProps } from '../types';

export default function WebDomMap({
  center,
  zoom = 13,
  markers = [],
  polylines = [],
  onRegionChange,
  showUserLocation = true,
  onLocationFound,
  onLocationError,
}: AppMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<any>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: MAP_STYLE_URL,
      center: [center.longitude, center.latitude],
      zoom,
    });
    mapRef.current = map;

    map.on('load', () => {
      markers.forEach((m) => {
        new maplibregl.Marker({ color: '#007AFF' })
          .setLngLat([m.coord.longitude, m.coord.latitude])
          .addTo(map);
      });
      polylines.forEach((pl) => {
        map.addSource(pl.id, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: pl.path.map((p) => [p.longitude, p.latitude]),
            },
            properties: {},
          },
        });
        map.addLayer({
          id: pl.id,
          type: 'line',
          source: pl.id,
          paint: { 'line-width': 4, 'line-color': '#007AFF' },
        });
      });

      // Don't add default geolocation control, we'll handle it manually
      // if (showUserLocation) {
      //   map.addControl(new maplibregl.GeolocateControl({
      //     positionOptions: {
      //       enableHighAccuracy: true
      //     },
      //     trackUserLocation: true
      //   }), 'top-right');
      // }
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

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      onLocationError?.('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        if (mapRef.current) {
          // Remove existing user location marker
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.remove();
            userLocationMarkerRef.current = null;
          }

          // Remove any existing location markers (including default ones)
          const existingMarkers = document.querySelectorAll(
            '.maplibregl-user-location-dot, .maplibregl-user-location-accuracy-circle'
          );
          existingMarkers.forEach((marker) => marker.remove());

          // Add user location marker with explicit red styling
          const el = document.createElement('div');
          el.className = 'user-location-marker';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#FF3B30';
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          el.style.zIndex = '1000';
          el.setAttribute('data-marker-type', 'user-location');

          userLocationMarkerRef.current = new maplibregl.Marker(el)
            .setLngLat([userLocation.longitude, userLocation.latitude])
            .addTo(mapRef.current);

          // Center map on user location
          mapRef.current.flyTo({
            center: [userLocation.longitude, userLocation.latitude],
            zoom: 15,
          });
        }

        onLocationFound?.(userLocation);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        onLocationError?.(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
      {showUserLocation && (
        <button
          onClick={getUserLocation}
          disabled={isLocating}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: isLocating ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            opacity: isLocating ? 0.6 : 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {isLocating ? '🔄 Localizando...' : '📍 Mi Ubicación'}
        </button>
      )}
    </div>
  );
}
