import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppMap from './AppMap';

interface MiniMapModalProps {
  visible: boolean;
  onClose: () => void;
  placeName: string;
  latitude: number;
  longitude: number;
}

const MiniMapModal: React.FC<MiniMapModalProps> = ({
  visible,
  onClose,
  placeName,
  latitude,
  longitude,
}) => {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number }>({ latitude, longitude });
  const [mapZoom, setMapZoom] = useState<number>(16);

  useEffect(() => {
    if (visible) {
      console.log('MiniMapModal is opening with data:', {
        placeName,
        latitude,
        longitude,
        visible
      });
      // Reset al abrir el modal
      setUserLocation(null);
      setMapCenter({ latitude, longitude });
      setMapZoom(16);
    } else {
      console.log('MiniMapModal is closing');
    }
  }, [visible]);

  // Callback cuando se encuentra la ubicación del usuario via GPS nativo
  const handleLocationFound = (location: { latitude: number; longitude: number }) => {
    console.log('User location found:', location);
    setUserLocation(location);

    // Calcular bounds para mostrar tanto el lugar como el usuario
    const padding = 0.01; // Margen adicional
    const minLat = Math.min(latitude, location.latitude) - padding;
    const maxLat = Math.max(latitude, location.latitude) + padding;
    const minLng = Math.min(longitude, location.longitude) - padding;
    const maxLng = Math.max(longitude, location.longitude) + padding;

    // Calcular centro y zoom para mostrar ambos puntos
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calcular zoom basado en la distancia
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    // Ajustar zoom (valores aproximados)
    let newZoom = 16;
    if (maxDiff > 0.1) newZoom = 11;
    else if (maxDiff > 0.05) newZoom = 12;
    else if (maxDiff > 0.02) newZoom = 13;
    else if (maxDiff > 0.01) newZoom = 14;
    else if (maxDiff > 0.005) newZoom = 15;

    setMapCenter({ latitude: centerLat, longitude: centerLng });
    setMapZoom(newZoom);
  };

  const handleLocationError = (error: string) => {
    console.error('Location error:', error);
  };

  // Centro del mapa - dinámico basado en la ubicación del usuario
  const center = mapCenter;

  // Marcadores para el mapa - solo el lugar
  const markers = [
    {
      id: 'place',
      coord: { latitude, longitude },
      title: placeName,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ubicación</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Mapa */}
        <View style={styles.mapContainer}>
          <AppMap
            center={center}
            markers={markers}
            showUserLocation={true}
            zoom={mapZoom}
            onLocationFound={handleLocationFound}
            onLocationError={handleLocationError}
            style={styles.map}
          />
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.placeName}>{placeName}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 32,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
});

export default MiniMapModal;