import React, { useMemo, useState, useEffect } from 'react';

import { View, TouchableOpacity, Text, Alert } from 'react-native';

import * as Location from 'expo-location';

import { WebView } from 'react-native-webview';

import { MAP_STYLE_URL } from '../../../config/maps';
import { AppMapProps } from '../types';

const buildHtml = (
  props: AppMapProps & { userLocation?: { latitude: number; longitude: number } }
) => `<!doctype html><html><head>
<meta name=viewport content="initial-scale=1, width=device-width" />
<link href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css" rel="stylesheet" />
<style> 
  html, body, #map { margin:0; height:100%; } 
  .user-location-marker {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #FF3B30 !important;
    border: 3px solid white !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
    z-index: 1000 !important;
  }
  /* Hide default MapLibre user location markers */
  .maplibregl-user-location-dot,
  .maplibregl-user-location-accuracy-circle,
  .maplibregl-user-location,
  .mapboxgl-user-location-dot,
  .mapboxgl-user-location-accuracy-circle {
    display: none !important;
  }
  /* Ensure default markers are blue */
  .maplibregl-marker {
    z-index: 100;
  }
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js"></script>
<script>
 const props = ${JSON.stringify(props)};
 let userLocationMarker = null;
 
 // Determine initial center: prioritize userLocation, then search results, then default
 let initialCenter = [props.center.longitude, props.center.latitude];
 if (props.userLocation) {
   initialCenter = [props.userLocation.longitude, props.userLocation.latitude];
 }
 
 const map = new maplibregl.Map({
   container: 'map',
   style: '${MAP_STYLE_URL}',
   center: initialCenter,
   zoom: props.userLocation ? 15 : (props.zoom || 13),
   trackUserLocation: false, // Disable default user location tracking
   showUserLocation: false   // Disable default user location marker
 });

 map.on('load', ()=>{
   // Add place markers (blue by default)
   (props.markers||[]).forEach(m=>{ 
     new maplibregl.Marker({ color: '#007AFF' }).setLngLat([m.coord.longitude, m.coord.latitude]).addTo(map); 
   });
   
   // Add polylines
   (props.polylines||[]).forEach(pl=>{
     map.addSource(pl.id,{ type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates: pl.path.map(p=>[p.longitude,p.latitude]) }, properties:{} }});
     map.addLayer({ id: pl.id, type:'line', source: pl.id, paint:{ 'line-width':4, 'line-color':'#007AFF' } });
   });

   // Add user location marker if available
   if (props.userLocation) {
     addUserLocationMarker(props.userLocation);
   }
 });

 function addUserLocationMarker(location) {
   // Remove existing user location marker
   if (userLocationMarker) {
     userLocationMarker.remove();
     userLocationMarker = null;
   }

   // Remove any existing location markers (including default ones)
   const existingMarkers = document.querySelectorAll('.maplibregl-user-location-dot, .maplibregl-user-location-accuracy-circle, .maplibregl-user-location, .mapboxgl-user-location-dot, .mapboxgl-user-location-accuracy-circle');
   existingMarkers.forEach(marker => marker.remove());

   // Remove any markers that might be created by the geolocation control
   const allMarkers = document.querySelectorAll('.maplibregl-marker');
   allMarkers.forEach(marker => {
     // Check if it's a default blue marker (not our custom one)
     if (marker.querySelector('.maplibregl-marker-anchor') && !marker.querySelector('.user-location-marker')) {
       // This is a default marker, check if it might be a location marker
       const markerElement = marker.querySelector('.maplibregl-marker-anchor');
       if (markerElement && markerElement.style.backgroundColor !== 'rgb(255, 59, 48)') {
         // Check if this marker is at the user location
         const rect = marker.getBoundingClientRect();
         // If it's potentially a location marker, remove it
         if (marker.classList.length === 1) { // Default markers usually have minimal classes
           marker.remove();
         }
       }
     }
   });

   // Create custom red user location marker
   const el = document.createElement('div');
   el.className = 'user-location-marker';
   el.setAttribute('data-marker-type', 'user-location');

   userLocationMarker = new maplibregl.Marker(el)
     .setLngLat([location.longitude, location.latitude])
     .addTo(map);

   // Center map on user location
   map.flyTo({
     center: [location.longitude, location.latitude],
     zoom: 15
   });
 }

 // Listen for messages from React Native
 window.addEventListener('message', function(event) {
   try {
     const data = JSON.parse(event.data);
     if (data.type === 'updateUserLocation' && data.location) {
       addUserLocationMarker(data.location);
     }
   } catch (error) {
     console.warn('Error parsing message:', error);
   }
 });
</script></body></html>`;

export default function WebViewMap(props: AppMapProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const webViewRef = React.useRef<WebView>(null);

  // Add user location to props for HTML generation
  const propsWithLocation = useMemo(
    () => ({
      ...props,
      userLocation,
    }),
    [props, userLocation]
  );

  const html = useMemo(() => buildHtml(propsWithLocation), [propsWithLocation]);

  const getUserLocation = async () => {
    try {
      setIsLocating(true);

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const error = 'Se requieren permisos de ubicación para usar esta función';
        props.onLocationError?.(error);
        Alert.alert('Permisos Requeridos', error);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 1,
      });

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(userCoords);
      props.onLocationFound?.(userCoords);

      // Send location to WebView
      if (webViewRef.current) {
        const message = JSON.stringify({
          type: 'updateUserLocation',
          location: userCoords,
        });
        webViewRef.current.postMessage(message);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'No se pudo obtener tu ubicación';
      props.onLocationError?.(errorMessage);
      Alert.alert('Error de Ubicación', errorMessage);
    } finally {
      setIsLocating(false);
    }
  };

  // Update WebView when userLocation changes
  useEffect(() => {
    if (userLocation && webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateUserLocation',
        location: userLocation,
      });
      webViewRef.current.postMessage(message);
    }
  }, [userLocation]);

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        geolocationEnabled={false} // Disable WebView geolocation, use native instead
      />

      {/* Native location button */}
      {props.showUserLocation !== false && (
        <TouchableOpacity
          onPress={getUserLocation}
          disabled={isLocating}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 12,
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',

            elevation: 4,
            elevation: 3,
            opacity: isLocating ? 0.6 : 1,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600' }}>
            {isLocating ? '🔄 Localizando...' : '📍 Mi Ubicación'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
