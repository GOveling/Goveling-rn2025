import React from 'react';
import { View, StyleSheet } from 'react-native';

// Intentar importar react-native-maps, usar fallback si no está disponible
let MapView: any = null;
let Marker: any = null;
let PROVIDER_DEFAULT: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;
} catch (e) {
  // react-native-maps no está disponible (ej: Expo Go)
  MapView = null;
  Marker = null;
  PROVIDER_DEFAULT = null;
}

interface PlaceLike {
  id?: string | number;
  name?: string;
  title?: string;
  coordinates?: { lat: number; lng: number };
}

interface AppleMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  places: PlaceLike[];
  style?: any;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Función para calcular la región del mapa basada en los puntos
function calculateRegion(userLocation: { latitude: number; longitude: number } | null, places: PlaceLike[]): MapRegion {
  // Recopilar todas las coordenadas
  const coordinates: { latitude: number; longitude: number }[] = [];
  
  if (userLocation) {
    coordinates.push(userLocation);
  }
  
  places.forEach(place => {
    if (place.coordinates) {
      coordinates.push({
        latitude: place.coordinates.lat,
        longitude: place.coordinates.lng
      });
    }
  });

  // Si no hay coordenadas, usar Madrid como centro por defecto
  if (coordinates.length === 0) {
    return {
      latitude: 40.4168,
      longitude: -3.7038,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  }

  // Si solo hay un punto, usar deltas pequeños
  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  // Calcular los límites (bounding box)
  const minLat = Math.min(...coordinates.map(coord => coord.latitude));
  const maxLat = Math.max(...coordinates.map(coord => coord.latitude));
  const minLng = Math.min(...coordinates.map(coord => coord.longitude));
  const maxLng = Math.max(...coordinates.map(coord => coord.longitude));

  // Calcular el centro
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Calcular deltas con un padding del 20%
  const latDelta = (maxLat - minLat) * 1.2;
  const lngDelta = (maxLng - minLng) * 1.2;

  // Asegurar deltas mínimos para evitar zoom excesivo
  const minDelta = 0.01;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latDelta, minDelta),
    longitudeDelta: Math.max(lngDelta, minDelta),
  };
}

export const AppleMap: React.FC<AppleMapProps> = ({ userLocation, places, style }) => {
  // Si react-native-maps no está disponible, retornar null para usar fallback
  if (!MapView || !Marker || !PROVIDER_DEFAULT) {
    console.log('[AppleMap] react-native-maps not available, using fallback');
    return null;
  }

  const region = calculateRegion(userLocation, places);

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT} // Usar Apple Maps en iOS, Google Maps en Android
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        pitchEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* Marcador del usuario (opcional, ya que showsUserLocation=true lo muestra) */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Tu ubicación"
            pinColor="#007AFF"
            identifier="user-location"
          />
        )}

        {/* Marcadores de lugares */}
        {places
          .filter(place => place.coordinates)
          .map((place, index) => (
            <Marker
              key={place.id || `place-${index}`}
              coordinate={{
                latitude: place.coordinates!.lat,
                longitude: place.coordinates!.lng,
              }}
              title={place.name || place.title || `Lugar ${index + 1}`}
              description={`Punto de interés ${index + 1}`}
              pinColor="#FF3B30"
              identifier={`place-${index}`}
            />
          ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default AppleMap;
