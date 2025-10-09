import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

// Tipos unificados para todos los mapas
interface MapLocation {
  latitude: number;
  longitude: number;
}

interface MapMarker {
  id: string;
  coordinate: MapLocation;
  title?: string;
  description?: string;
}

interface UnifiedMapProps {
  center?: MapLocation;
  markers?: MapMarker[];
  userLocation?: MapLocation | null;
  zoom?: number;
  style?: any;
  showUserLocation?: boolean;
  onRegionChange?: (region: any) => void;
}

// Estrategia de mapas:
// 1. Web: MapLibre GL JS directo
// 2. iOS/Android Nativo: @maplibre/maplibre-react-native
// 3. Expo Go: WebView con MapLibre GL JS
// 4. Fallback: Vista simple con enlaces a mapas externos

let NativeMapLibre: any = null;
try {
  NativeMapLibre = require('@maplibre/maplibre-react-native');
} catch (e) {
  console.log('[UnifiedMap] MapLibre native no disponible:', e.message);
  NativeMapLibre = null;
}

export default function UnifiedMap({
  center,
  markers = [],
  userLocation,
  zoom = 12,
  style,
  showUserLocation = true,
  onRegionChange
}: UnifiedMapProps) {

  console.log('[UnifiedMap] Platform:', Platform.OS);
  console.log('[UnifiedMap] Native MapLibre available:', !!NativeMapLibre);

  // 1. Web: MapLibre GL JS directo
  if (Platform.OS === 'web') {
    return <WebMapLibre {...{ center, markers, userLocation, zoom, style, showUserLocation }} />;
  }

  // 2. Native con MapLibre (Builds nativas)
  if (NativeMapLibre) {
    return <NativeMapLibreMap {...{ center, markers, userLocation, zoom, style, showUserLocation }} />;
  }

  // 3. Fallback: WebView con MapLibre (Expo Go)
  return <WebViewMapLibre {...{ center, markers, userLocation, zoom, style, showUserLocation }} />;
}

/* ================= WEB: MapLibre GL JS Directo ================= */
function WebMapLibre({
  center,
  markers,
  userLocation,
  zoom,
  style,
  showUserLocation
}: UnifiedMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let map: any;
    let cancelled = false;

    (async () => {
      if (!mapContainer.current) return;

      // Cargar CSS de MapLibre si no está cargado
      if (typeof document !== 'undefined' && !document.getElementById('maplibre-css')) {
        const link = document.createElement('link');
        link.id = 'maplibre-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      try {
        const maplibregl = await import('maplibre-gl');
        if (cancelled) return;

        const initialCenter = getMapCenter(center, userLocation, markers);

        map = new maplibregl.Map({
          container: mapContainer.current,
          style: 'https://demotiles.maplibre.org/style.json',
          center: [initialCenter.longitude, initialCenter.latitude],
          zoom: zoom
        });

        mapRef.current = map;

        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        map.on('load', () => {
          // Marcador de ubicación del usuario
          if (showUserLocation && userLocation) {
            const userMarker = document.createElement('div');
            userMarker.className = 'user-location-marker';
            userMarker.style.cssText = `
              width: 20px; height: 20px; 
              background: #007AFF; 
              border: 3px solid white; 
              border-radius: 50%; 
              box-shadow: 0 0 0 3px rgba(0,122,255,0.3);
            `;

            new maplibregl.Marker(userMarker)
              .setLngLat([userLocation.longitude, userLocation.latitude])
              .addTo(map);
          }

          // Marcadores de lugares
          markers.forEach((marker, index) => {
            const markerElement = document.createElement('div');
            markerElement.className = 'place-marker';
            markerElement.style.cssText = `
              width: 32px; height: 32px;
              background: #FF3B30;
              color: white;
              border: 2px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 600;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `;
            markerElement.textContent = String(index + 1);

            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div style="padding: 8px;">
                <strong>${marker.title || `Lugar ${index + 1}`}</strong>
                ${marker.description ? `<br><small>${marker.description}</small>` : ''}
              </div>`
            );

            new maplibregl.Marker(markerElement)
              .setLngLat([marker.coordinate.longitude, marker.coordinate.latitude])
              .setPopup(popup)
              .addTo(map);
          });

          // Ajustar vista para mostrar todos los marcadores
          fitMapBounds(map, maplibregl, userLocation, markers);
        });

      } catch (error) {
        console.error('[WebMapLibre] Error cargando mapa:', error);
      }
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
    };
  }, [center, userLocation, JSON.stringify(markers), zoom]);

  return (
    <View style={[styles.container, style]}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

/* ================= NATIVE: MapLibre React Native ================= */
function NativeMapLibreMap({
  center,
  markers,
  userLocation,
  zoom,
  style,
  showUserLocation
}: UnifiedMapProps) {
  if (!NativeMapLibre) return null;

  const initialCenter = getMapCenter(center, userLocation, markers);

  return (
    <View style={[styles.container, style]}>
      <NativeMapLibre.MapView
        style={styles.map}
        styleURL="https://demotiles.maplibre.org/style.json"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <NativeMapLibre.Camera
          zoomLevel={zoom}
          centerCoordinate={[initialCenter.longitude, initialCenter.latitude]}
          animationMode="moveTo"
          animationDuration={1000}
        />

        {showUserLocation && userLocation && (
          <NativeMapLibre.PointAnnotation
            id="user-location"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.userLocationMarker} />
          </NativeMapLibre.PointAnnotation>
        )}

        {markers.map((marker, index) => (
          <NativeMapLibre.PointAnnotation
            id={marker.id || `marker-${index}`}
            key={marker.id || `marker-${index}`}
            coordinate={[marker.coordinate.longitude, marker.coordinate.latitude]}
            title={marker.title}
          >
            <View style={styles.placeMarker}>
              <Text style={styles.placeMarkerText}>{index + 1}</Text>
            </View>
          </NativeMapLibre.PointAnnotation>
        ))}
      </NativeMapLibre.MapView>
    </View>
  );
}

/* ================= WEBVIEW: MapLibre en WebView (Expo Go) ================= */
function WebViewMapLibre({
  center,
  markers,
  userLocation,
  zoom,
  style,
  showUserLocation
}: UnifiedMapProps) {
  const initialCenter = getMapCenter(center, userLocation, markers);

  const mapData = {
    center: [initialCenter.longitude, initialCenter.latitude],
    zoom,
    userLocation: showUserLocation ? userLocation : null,
    markers: markers.map((marker, index) => ({
      id: marker.id || `marker-${index}`,
      coordinate: [marker.coordinate.longitude, marker.coordinate.latitude],
      title: marker.title || `Lugar ${index + 1}`,
      description: marker.description || '',
      index: index + 1
    }))
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Map</title>
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet">
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    #map { width: 100vw; height: 100vh; }
    .user-marker {
      width: 20px; height: 20px;
      background: #007AFF;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(0,122,255,0.3);
    }
    .place-marker {
      width: 32px; height: 32px;
      background: #FF3B30;
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    const mapData = ${JSON.stringify(mapData)};
    
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://demotiles.maplibre.org/style.json',
      center: mapData.center,
      zoom: mapData.zoom
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      // Usuario
      if (mapData.userLocation) {
        const userEl = document.createElement('div');
        userEl.className = 'user-marker';
        new maplibregl.Marker(userEl)
          .setLngLat([mapData.userLocation.longitude, mapData.userLocation.latitude])
          .addTo(map);
      }

      // Marcadores
      mapData.markers.forEach(marker => {
        const el = document.createElement('div');
        el.className = 'place-marker';
        el.textContent = marker.index;

        const popup = new maplibregl.Popup({ offset: 25 })
          .setHTML('<div style="padding:8px;"><strong>' + marker.title + '</strong>' + 
                   (marker.description ? '<br><small>' + marker.description + '</small>' : '') + '</div>');

        new maplibregl.Marker(el)
          .setLngLat(marker.coordinate)
          .setPopup(popup)
          .addTo(map);
      });

      // Ajustar bounds
      if (mapData.markers.length > 0 || mapData.userLocation) {
        const bounds = new maplibregl.LngLatBounds();
        
        if (mapData.userLocation) {
          bounds.extend([mapData.userLocation.longitude, mapData.userLocation.latitude]);
        }
        
        mapData.markers.forEach(marker => {
          bounds.extend(marker.coordinate);
        });

        map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    });
  </script>
</body>
</html>`;

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

/* ================= Utilidades ================= */
function getMapCenter(
  center?: MapLocation,
  userLocation?: MapLocation | null,
  markers?: MapMarker[]
): MapLocation {
  if (center) return center;
  if (userLocation) return userLocation;
  if (markers && markers.length > 0) return markers[0].coordinate;
  return { latitude: 40.4168, longitude: -3.7038 }; // Madrid por defecto
}

function fitMapBounds(
  map: any,
  maplibregl: any,
  userLocation?: MapLocation | null,
  markers: MapMarker[] = []
) {
  if (!markers.length && !userLocation) return;

  const bounds = new maplibregl.LngLatBounds();

  if (userLocation) {
    bounds.extend([userLocation.longitude, userLocation.latitude]);
  }

  markers.forEach(marker => {
    bounds.extend([marker.coordinate.longitude, marker.coordinate.latitude]);
  });

  map.fitBounds(bounds, {
    padding: 50,
    maxZoom: 15,
    duration: 1000
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0'
  },
  map: {
    flex: 1
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  placeMarker: {
    width: 32,
    height: 32,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  placeMarkerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  }
});
