import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { getMapStyleURL } from '../config/maps';
import LocationButton from './LocationButton';

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

interface MapTilerMapProps {
  center?: MapLocation;
  markers?: MapMarker[];
  zoom?: number;
  showUserLocation?: boolean;
  userLocation?: MapLocation | null;
  onLocationFound?: (location: MapLocation) => void;
  onLocationError?: (error: string) => void;
  onError?: (error: string) => void;
  onMarkerPress?: (markerId: string) => void;
  style?: any;
}

export default function MapTilerMap({
  center,
  markers = [],
  zoom = 12,
  showUserLocation = true,
  onLocationFound,
  onLocationError,
  onMarkerPress,
  style
}: MapTilerMapProps) {
  const [userLocationActive, setUserLocationActive] = useState(false);
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const handleLocationPress = async () => {
    setUserLocationActive(!userLocationActive);

    if (!userLocationActive) {
      try {
        // Para React Native (Expo Go), usar expo-location
        if (Platform.OS !== 'web') {

          // Pedir permisos
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.error('[MapTilerMap] Permission to access location was denied');
            setMapError('Permiso de ubicación denegado');
            setUserLocationActive(false);
            return;
          }

          // Obtener ubicación actual
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const userLoc = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          };

          setUserLocation(userLoc);

          // Llamar al callback si existe
          if (onLocationFound) {
            onLocationFound(userLoc);
          }
          return;
        }

        // Para web, usar geolocation nativa
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              setUserLocation(location);

              // Llamar al callback si existe
              if (onLocationFound) {
                onLocationFound(location);
              }
            },
            (error) => {
              console.error('[MapTilerMap] Error getting location:', error);
              setUserLocationActive(false);
              setMapError(`Error de ubicación: ${error.message}`);

              // Llamar al callback de error si existe
              if (onLocationError) {
                onLocationError(error.message);
              }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        }
      } catch (error) {
        console.error('[MapTilerMap] Location error:', error);
        setUserLocationActive(false);
        setMapError(`Error obteniendo ubicación: ${error.message}`);

        // Llamar al callback de error si existe
        if (onLocationError) {
          onLocationError(error.message);
        }
      }
    } else {
      setUserLocation(null);
    }
  };

  // 1. Web: MapLibre GL JS directo con MapTiler
  if (Platform.OS === 'web') {
    console.log('[MapTilerMap] Using WebDirectMapTiler for web');
    return (
      <View style={[styles.flex, style]}>
        {mapError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{mapError}</Text>
          </View>
        )}
        <WebDirectMapTiler
          center={center}
          markers={markers}
          zoom={zoom}
          showUserLocation={showUserLocation && userLocationActive}
          userLocation={userLocation}
          style={styles.flex}
          onError={setMapError}
          onMarkerPress={onMarkerPress}
        />
        <LocationButton
          onLocationPress={handleLocationPress}
          isActive={userLocationActive}
        />
      </View>
    );
  }

  // 2. iOS: Para Expo Go usamos WebView, para desarrollo usa Apple Maps
  if (Platform.OS === 'ios') {
    console.log('[MapTilerMap] Using WebViewMapTiler for iOS (Expo Go compatible)');
    return (
      <View style={[styles.flex, style]}>
        {mapError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{mapError}</Text>
          </View>
        )}
        <WebViewMapTiler
          center={center}
          markers={markers}
          zoom={zoom}
          showUserLocation={showUserLocation && userLocationActive}
          userLocation={userLocation}
          style={styles.flex}
          onError={setMapError}
          onMarkerPress={onMarkerPress}
        />
        <LocationButton
          onLocationPress={handleLocationPress}
          isActive={userLocationActive}
        />
      </View>
    );
  }

  // 3. Android y Expo Go: WebView con MapTiler
  console.log('[MapTilerMap] Using WebViewMapTiler for Android/Expo Go');
  return (
    <View style={[styles.flex, style]}>
      {mapError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{mapError}</Text>
        </View>
      )}
      <WebViewMapTiler
        center={center}
        markers={markers}
        zoom={zoom}
        showUserLocation={showUserLocation && userLocationActive}
        userLocation={userLocation}
        style={styles.flex}
        onError={setMapError}
        onMarkerPress={onMarkerPress}
      />
      <LocationButton
        onLocationPress={handleLocationPress}
        isActive={userLocationActive}
      />
    </View>
  );
}

/* ================= WEB (DOM) ================= */
const WebDirectMapTiler: React.FC<MapTilerMapProps> = ({ center, markers, zoom, showUserLocation, userLocation, onError, onMarkerPress, style }) => {
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any;
    let cancelled = false;

    (async () => {
      try {
        if (!divRef.current) return;

        // Cargar CSS de MapLibre GL
        if (typeof document !== 'undefined' && !document.getElementById('maplibre-gl-css')) {
          const link = document.createElement('link');
          link.id = 'maplibre-gl-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
          document.head.appendChild(link);
        }

        // Add animation CSS for user location
        if (typeof document !== 'undefined' && !document.getElementById('user-pulse-animation')) {
          const style = document.createElement('style');
          style.id = 'user-pulse-animation';
          style.textContent = `
            @keyframes userPulse {
              0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
              }
              100% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0;
              }
            }
          `;
          document.head.appendChild(style);
        }

        const maplibregl = await import('maplibre-gl');
        if (cancelled) return;

        const mapCenter = getInitialCenter(center, markers);

        map = new maplibregl.Map({
          container: divRef.current,
          style: getMapStyleURL(), // Usar MapTiler
          center: mapCenter,
          zoom: zoom || 12,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

        map.on('error', (e: any) => {
          console.error('[WebDirectMapTiler] Map error:', e);
          onError?.(`Map error: ${e.error?.message || 'Unknown error'}`);
        });

        map.on('load', () => {
          // Marcador usuario - usar ubicación proporcionada
          if (showUserLocation && userLocation) {
            const userCoords: [number, number] = [userLocation.longitude, userLocation.latitude];
            const el = document.createElement('div');
            el.style.width = '28px';
            el.style.height = '28px';
            el.style.background = '#007AFF';
            el.style.borderRadius = '50%';
            el.style.border = '4px solid #fff';
            el.style.boxShadow = '0 0 0 4px rgba(0,122,255,0.3), 0 0 0 8px rgba(0,122,255,0.15), 0 2px 8px rgba(0,0,0,0.2)';
            el.style.position = 'relative';
            el.style.zIndex = '999';

            // Punto central blanco
            const centerDot = document.createElement('div');
            centerDot.style.position = 'absolute';
            centerDot.style.top = '50%';
            centerDot.style.left = '50%';
            centerDot.style.width = '8px';
            centerDot.style.height = '8px';
            centerDot.style.background = '#fff';
            centerDot.style.borderRadius = '50%';
            centerDot.style.transform = 'translate(-50%, -50%)';
            el.appendChild(centerDot);

            // Animación de pulso
            const pulseRing = document.createElement('div');
            pulseRing.style.position = 'absolute';
            pulseRing.style.top = '50%';
            pulseRing.style.left = '50%';
            pulseRing.style.width = '100%';
            pulseRing.style.height = '100%';
            pulseRing.style.border = '2px solid #007AFF';
            pulseRing.style.borderRadius = '50%';
            pulseRing.style.transform = 'translate(-50%, -50%)';
            pulseRing.style.animation = 'userPulse 2s infinite ease-out';
            el.appendChild(pulseRing);

            const userMarker = new maplibregl.Marker({
              element: el,
              anchor: 'center'
            }).setLngLat(userCoords).addTo(map);

            // Auto zoom to user location with smooth animation
            setTimeout(() => {
              map.flyTo({
                center: userCoords,
                zoom: 15,
                speed: 1.2,
                curve: 1.42,
                easing: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
              });
            }, 500);
          }

          // Marcadores lugares
          markers.forEach((marker, idx) => {
            const el = document.createElement('div');
            el.style.width = '28px';  // Reducido de 40px a 28px
            el.style.height = '28px'; // Reducido de 40px a 28px
            el.style.background = '#FF3B30';
            el.style.color = '#fff';
            el.style.fontSize = '14px'; // Reducido de 18px a 14px
            el.style.fontWeight = '700'; // Reducido de 800 a 700
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.borderRadius = '50%';
            el.style.border = '3px solid #fff'; // Reducido de 4px a 3px
            el.style.boxShadow = '0 2px 8px rgba(255, 59, 48, 0.3), 0 1px 3px rgba(0,0,0,0.2)'; // Sombra más sutil
            el.style.cursor = 'pointer';
            el.style.position = 'relative';
            el.style.zIndex = '1000';
            el.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease'; // Animación suave
            el.style.transformOrigin = 'center center'; // Asegurar transformaciones desde el centro
            el.innerText = String(idx + 1);

            // Agregar efectos hover
            el.onmouseenter = () => {
              el.style.transform = 'translate(-50%, -50%) scale(1.1)'; // Mantener el anclaje central
              el.style.boxShadow = '0 4px 12px rgba(255, 59, 48, 0.4), 0 2px 6px rgba(0,0,0,0.3)';
            };
            el.onmouseleave = () => {
              el.style.transform = 'translate(-50%, -50%) scale(1)'; // Mantener el anclaje central
              el.style.boxShadow = '0 2px 8px rgba(255, 59, 48, 0.3), 0 1px 3px rgba(0,0,0,0.2)';
            };

            // Manejar clic en marcador
            el.onclick = (e) => {
              e.stopPropagation();
              if (onMarkerPress) {
                onMarkerPress(marker.id);
              }
            };

            // Popup solo se muestra si no hay onMarkerPress (fallback)
            if (!onMarkerPress) {
              const popup = new maplibregl.Popup({
                offset: 30,
                closeButton: true,
                closeOnClick: true
              })
                .setHTML(`<div style="padding: 8px;"><strong>${marker.title || 'Marcador'}</strong>${marker.description ? `<br/>${marker.description}` : ''}</div>`);

              new maplibregl.Marker({
                element: el,
                anchor: 'center'
              })
                .setLngLat([marker.coordinate.longitude, marker.coordinate.latitude])
                .setPopup(popup)
                .addTo(map);
            } else {
              new maplibregl.Marker({
                element: el,
                anchor: 'center'
              })
                .setLngLat([marker.coordinate.longitude, marker.coordinate.latitude])
                .addTo(map);
            }
          });

          // Ajustar vista si hay marcadores (pero no cuando se muestra ubicación de usuario)
          if (!showUserLocation || !userLocation) {
            fitBoundsIfNeeded(map, maplibregl, center, markers);
          }
        });
      } catch (error) {
        console.error('[WebDirectMapTiler] Initialization error:', error);
        onError?.(`Map initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [center?.latitude, center?.longitude, JSON.stringify(markers.map(m => m.coordinate)), zoom]);

  return <View style={[styles.flex, style]}><div ref={divRef} style={{ width: '100%', height: '100%' }} /></View>;
};

/* ============= WEBVIEW FALLBACK (Android/Expo Go) ============= */
const WebViewMapTiler: React.FC<MapTilerMapProps> = ({ center, markers, zoom, showUserLocation, userLocation, onError, onMarkerPress, style }) => {
  const mapCenter = getInitialCenter(center, markers);
  const mapData = {
    center: mapCenter,
    markers: markers?.map((m, i) => ({
      i,
      title: m.title || `Marcador ${i + 1}`,
      description: m.description || '',
      coord: m.coordinate,
    })) || [],
    showUserLocation: !!showUserLocation,
    userLocation: userLocation,
    zoom: zoom || 12,
    styleUrl: getMapStyleURL(),
    debug: false // Debug desactivado para producción
  };

  const html = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1,user-scalable=no'/>
  <title>MapTiler Map</title>
  <link href='https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css' rel='stylesheet' />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: -apple-system, system-ui, sans-serif;
      overflow: hidden;
    }
    /* Hide default MapLibre markers */
    .maplibregl-marker .maplibregl-marker-anchor {
      display: none !important;
    }
    /* Override any default marker styles */
    .maplibregl-marker {
      background: none !important;
      border: none !important;
    }
    /* Ensure markers stay in place */
    .maplibregl-marker > * {
      transform: none !important;
    } 
    .marker {
      width: 28px;
      height: 28px;
      background: #FF3B30;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3), 0 1px 3px rgba(0,0,0,0.2);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      transform-origin: center center; /* Asegurar que las transformaciones sean desde el centro */
    }
    .marker:hover {
      transform: translate(-50%, -50%) scale(1.1) !important; /* Forzar el anclaje correcto */
      box-shadow: 0 4px 12px rgba(255, 59, 48, 0.4), 0 2px 6px rgba(0,0,0,0.3);
    } 
    .user-location {
      width: 28px;
      height: 28px;
      background: #007AFF;
      border-radius: 50%;
      border: 4px solid #fff;
      box-shadow: 
        0 0 0 4px rgba(0,122,255,0.3),
        0 0 0 8px rgba(0,122,255,0.15),
        0 2px 8px rgba(0,0,0,0.2);
      position: relative;
    }
    .user-location::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
    /* Animation for user location */
    .user-location::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      border: 2px solid #007AFF;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: userPulse 2s infinite ease-out;
    }
    @keyframes userPulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(2.5);
        opacity: 0;
      }
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div id='loading' class='loading'>Cargando mapa...</div>
  <div id='map'></div>
  
  <script src='https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'></script>
  <script>
    const DATA = ${JSON.stringify(mapData)};
    const loadingEl = document.getElementById('loading');
    
    function hideLoading() {
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
    }
    
    try {
      if (!maplibregl) {
        throw new Error('MapLibre GL JS not loaded');
      }
      
      const map = new maplibregl.Map({
        container: 'map',
        style: DATA.styleUrl,
        center: DATA.center,
        zoom: DATA.zoom,
        attributionControl: false
      });
      
      map.addControl(new maplibregl.NavigationControl({showCompass: true}), 'top-right');
      
      map.on('load', function() {
        hideLoading();
        
        // Add user location with animated DOM marker
        if (DATA.showUserLocation && DATA.userLocation) {
          const userEl = document.createElement('div');
          userEl.className = 'user-location';
          
          // Create marker with proper anchor and offset
          const userMarker = new maplibregl.Marker({
            element: userEl,
            anchor: 'center',
            offset: [0, 0]
          })
          .setLngLat([DATA.userLocation.longitude, DATA.userLocation.latitude])
          .addTo(map);
          
          // Auto zoom to user location with smooth animation
          setTimeout(function() {
            map.flyTo({
              center: [DATA.userLocation.longitude, DATA.userLocation.latitude],
              zoom: 15,
              speed: 1.2,
              curve: 1.42,
              easing: function(t) { 
                return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; 
              }
            });
          }, 500);
        }
        
        // Add place markers as symbols (more stable than DOM markers)
        if (DATA.markers.length > 0) {
          const markersData = {
            'type': 'FeatureCollection',
            'features': DATA.markers.map(function(marker, index) {
              return {
                'type': 'Feature',
                'geometry': {
                  'type': 'Point',
                  'coordinates': [marker.coord.longitude, marker.coord.latitude]
                },
                'properties': {
                  'title': marker.title,
                  'description': marker.description || '',
                  'number': String(marker.i + 1)
                }
              };
            })
          };
          
          map.addSource('places', {
            'type': 'geojson',
            'data': markersData
          });
          
          // Add place markers as circles with numbers
          map.addLayer({
            'id': 'places-circle',
            'type': 'circle',
            'source': 'places',
            'paint': {
              'circle-radius': 14, // Reducido de 20 a 14
              'circle-color': '#FF3B30',
              'circle-stroke-width': 3, // Reducido de 4 a 3
              'circle-stroke-color': '#fff'
            }
          });
          
          // Add numbers as symbols
          map.addLayer({
            'id': 'places-numbers',
            'type': 'symbol',
            'source': 'places',
            'layout': {
              'text-field': ['get', 'number'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12, // Reducido de 16 a 12
              'text-anchor': 'center'
            },
            'paint': {
              'text-color': '#fff'
            }
          });
          
          // Add click interaction for places (tanto círculos como números)
          map.on('click', 'places-circle', function(e) {
            const number = e.features[0].properties.number;
            const markerId = 'marker-' + (parseInt(number) - 1); // Convertir número a ID
            
            // Enviar mensaje a React Native si está disponible
            if (window.ReactNativeWebView) {
              console.log('[WebView] Sending marker press:', markerId);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerPress',
                markerId: markerId
              }));
            } else {
              console.log('[WebView] No ReactNativeWebView available, showing popup');
              // Fallback: mostrar popup si no hay manejo en React Native
              const coordinates = e.features[0].geometry.coordinates.slice();
              const title = e.features[0].properties.title;
              const description = e.features[0].properties.description;
              
              new maplibregl.Popup({ offset: 25 })
                .setLngLat(coordinates)
                .setHTML('<div style="padding: 8px;"><strong>' + title + '</strong>' + 
                        (description ? '<br/>' + description : '') + '</div>')
                .addTo(map);
            }
          });

          // También agregar clic a los números
          map.on('click', 'places-numbers', function(e) {
            const number = e.features[0].properties.number;
            const markerId = 'marker-' + (parseInt(number) - 1);
            
            if (window.ReactNativeWebView) {
              console.log('[WebView] Sending marker press from number:', markerId);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerPress',
                markerId: markerId
              }));
            }
          });
          
          // Change cursor on hover
          map.on('mouseenter', 'places-circle', function() {
            map.getCanvas().style.cursor = 'pointer';
          });
          
          map.on('mouseleave', 'places-circle', function() {
            map.getCanvas().style.cursor = '';
          });
          
        }
        
        // Fit bounds if needed (only if no user location is being shown)
        if (DATA.markers.length > 0 && !(DATA.showUserLocation && DATA.userLocation)) {
          const bounds = new maplibregl.LngLatBounds();
          DATA.markers.forEach(function(m) {
            bounds.extend([m.coord.longitude, m.coord.latitude]);
          });
          map.fitBounds(bounds, {padding: 40, maxZoom: 15, duration: 600});
        } else if (DATA.markers.length > 0 && !DATA.showUserLocation) {
          // Fit bounds only for place markers when user location is not active
          const bounds = new maplibregl.LngLatBounds();
          DATA.markers.forEach(function(m) {
            bounds.extend([m.coord.longitude, m.coord.latitude]);
          });
          map.fitBounds(bounds, {padding: 40, maxZoom: 15, duration: 600});
        }
      });
      
      map.on('error', function(e) {
        const errorMsg = 'Map error: ' + (e.error ? e.error.message : 'Unknown error');
        console.error('[WebViewMapTiler]', errorMsg);
        hideLoading();
        document.getElementById('map').innerHTML = '<div class="loading">Error cargando mapa: ' + errorMsg + '</div>';
      });
      
    } catch (error) {
      const errorMsg = 'Initialization error: ' + error.message;
      console.error('[WebViewMapTiler]', errorMsg);
      hideLoading();
      document.getElementById('map').innerHTML = '<div class="loading">Error: ' + errorMsg + '</div>';
    }
  </script>
</body>
</html>`;

  return (
    <View style={[styles.flex, style]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.flex}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebViewMapTiler] WebView error:', nativeEvent);
          onError?.(`WebView error: ${nativeEvent.description}`);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebViewMapTiler] HTTP error:', nativeEvent);
          onError?.(`HTTP error: ${nativeEvent.statusCode}`);
        }}
        onLoadEnd={() => {
          // WebView load completed
        }}
        onMessage={(event) => {
          try {
            console.log('[MapTilerMap] Received WebView message:', event.nativeEvent.data);
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'markerPress' && onMarkerPress) {
              console.log('[MapTilerMap] Calling onMarkerPress with:', message.markerId);
              onMarkerPress(message.markerId);
            }
          } catch (error) {
            console.error('Error parsing WebView message:', error);
          }
        }}
      />
    </View>
  );
};

/* ============= APPLE MAPS FALLBACK (iOS) ============= */
const AppleMapsFallback: React.FC<MapTilerMapProps> = ({ center, markers, onMarkerPress, style }) => {
  // Intentar cargar Apple Maps si está disponible
  let AppleMap: any = null;
  try {
    AppleMap = require('./map/AppleMap').default;
  } catch (e) {
    AppleMap = null;
  }

  if (AppleMap) {
    const places = markers.map(m => ({
      id: m.id,
      coordinates: { lat: m.coordinate.latitude, lng: m.coordinate.longitude },
      name: m.title
    }));

    const userLocation = center ? {
      latitude: center.latitude,
      longitude: center.longitude
    } : null;

    return <AppleMap userLocation={userLocation} places={places} style={style} />;
  }

  // Fallback si Apple Maps no está disponible
  return <WebViewMapTiler center={center} markers={markers} onMarkerPress={onMarkerPress} style={style} />;
};

/* ============= Helpers ============= */
function getInitialCenter(center: MapLocation | undefined, markers: MapMarker[]): [number, number] {
  if (center) return [center.longitude, center.latitude];
  const first = markers[0];
  if (first?.coordinate) return [first.coordinate.longitude, first.coordinate.latitude];
  return [-3.7038, 40.4168]; // Madrid por defecto
}

function fitBoundsIfNeeded(map: any, maplibregl: any, center: MapLocation | undefined, markers: MapMarker[]) {
  if (markers.length === 0) return;

  const bounds = new maplibregl.LngLatBounds();
  let added = false;

  if (center) {
    bounds.extend([center.longitude, center.latitude]);
    added = true;
  }

  markers.forEach(marker => {
    bounds.extend([marker.coordinate.longitude, marker.coordinate.latitude]);
    added = true;
  });

  if (added) {
    map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 600 });
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  errorContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
