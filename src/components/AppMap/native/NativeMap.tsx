import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { AppMapProps } from '../types';
import { MAP_STYLE_URL } from '../../../config/maps';
import * as Location from 'expo-location';

let MapboxGL: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapboxGL = require('@maplibre/maplibre-react-native');
  if (MapboxGL?.setAccessToken) MapboxGL.setAccessToken(null);
} catch {
  MapboxGL = null;
}

export default function NativeMap({ 
  center, 
  zoom = 13, 
  markers = [], 
  polylines = [],
  showUserLocation = true,
  onLocationFound,
  onLocationError
}: AppMapProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const getUserLocation = async () => {
    try {
      setIsLocating(true);

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const error = 'Permission to access location was denied';
        onLocationError?.(error);
        Alert.alert('Error', error);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 1,
      });

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };

      setUserLocation(userCoords);
      onLocationFound?.(userCoords);

    } catch (error: any) {
      const errorMessage = error?.message || 'Unable to retrieve your location';
      onLocationError?.(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLocating(false);
    }
  };

  if (!MapboxGL) return <View style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1 }}>
      <MapboxGL.MapView style={{ flex: 1 }} styleURL={MAP_STYLE_URL}>
        <MapboxGL.Camera 
          zoomLevel={zoom} 
          centerCoordinate={userLocation ? [userLocation.longitude, userLocation.latitude] : [center.longitude, center.latitude]} 
        />
        
        {/* Render place markers */}
        {markers.map(m => (
          <MapboxGL.PointAnnotation key={m.id} id={m.id} coordinate={[m.coord.longitude, m.coord.latitude]} />
        ))}
        
        {/* Render user location marker */}
        {userLocation && (
          <MapboxGL.PointAnnotation 
            key="user-location" 
            id="user-location" 
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#FF3B30',
              borderWidth: 3,
              borderColor: 'white',
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
              elevation: 5
            }} />
          </MapboxGL.PointAnnotation>
        )}
        
        {/* Render polylines */}
        {polylines.map(pl => (
          <MapboxGL.ShapeSource
            key={pl.id}
            id={pl.id}
            shape={{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: pl.path.map(p => [p.longitude, p.latitude]) },
              properties: {}
            }}
          >
            <MapboxGL.LineLayer id={`${pl.id}-line`} style={{ lineWidth: 4, lineColor: '#007AFF' }} />
          </MapboxGL.ShapeSource>
        ))}
      </MapboxGL.MapView>
      
      {/* User location button */}
      {showUserLocation && (
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
            opacity: isLocating ? 0.6 : 1
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
