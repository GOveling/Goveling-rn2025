import React, { useState, useEffect } from 'react';

import { View, Text, TouchableOpacity, Modal, Alert, StyleSheet, Platform } from 'react-native';

import * as Location from 'expo-location';

import { Ionicons } from '@expo/vector-icons';

import AppMap from './AppMap';
import { EnhancedPlace } from '../lib/placesSearch';

interface MapModalProps {
  visible: boolean;
  onClose: () => void;
  places: EnhancedPlace[];
  title?: string;
}

export default function MapModal({
  visible,
  onClose,
  places,
  title = 'Mapa de Lugares',
}: MapModalProps) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (visible) requestLocation();
  }, [visible]);

  const requestLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Se necesita acceso a la ubicación para mostrar tu posición.'
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      console.warn('Location error', e);
    } finally {
      setLoadingLocation(false);
    }
  };

  const center =
    userLocation ||
    (places[0]?.coordinates
      ? { latitude: places[0].coordinates.lat, longitude: places[0].coordinates.lng }
      : { latitude: 40.4168, longitude: -3.7038 });

  // Solo incluir marcadores de lugares, NO la ubicación del usuario
  const markers = places
    .filter((p) => p.coordinates)
    .map((p, idx) => ({
      id: `p-${idx}`,
      coord: { latitude: p.coordinates!.lat, longitude: p.coordinates!.lng },
      title: p.name || `Lugar ${idx + 1}`,
    }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={requestLocation}
            style={styles.iconBtn}
            disabled={loadingLocation}
          >
            <Ionicons name={loadingLocation ? 'time' : 'locate'} size={20} color="#333" />
          </TouchableOpacity>
        </View>
        <AppMap center={center} markers={markers} showUserLocation={true} style={styles.map} />
        {Platform.OS !== 'web' && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Lugares: {markers.length}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', flex: 1 },
  footer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    bottom: 0,
    left: 0,
    padding: 8,
    position: 'absolute',
    right: 0,
  },
  footerText: { color: '#444', fontSize: 12 },
  header: {
    alignItems: 'center',
    borderBottomColor: '#e5e5e5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  iconBtn: { padding: 8 },
  map: { flex: 1 },
  title: { color: '#333', fontSize: 18, fontWeight: '600' },
});
