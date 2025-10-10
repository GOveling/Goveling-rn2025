import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, StyleSheet, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedPlace } from '../lib/placesSearch';
import AppMap from './AppMap';

interface MapModalProps {
  visible: boolean;
  onClose: () => void;
  places: EnhancedPlace[];
  title?: string;
}

export default function MapModal({ visible, onClose, places, title = 'Mapa de Lugares' }: MapModalProps) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (visible) requestLocation();
  }, [visible]);

  const requestLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para mostrar tu posición.');
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

  const center = userLocation || (places[0]?.coordinates ? { latitude: places[0].coordinates.lat, longitude: places[0].coordinates.lng } : { latitude: 40.4168, longitude: -3.7038 });

  // Solo incluir marcadores de lugares, NO la ubicación del usuario
  const markers = places.filter(p => p.coordinates).map((p, idx) => ({
    id: `p-${idx}`,
    coord: { latitude: p.coordinates!.lat, longitude: p.coordinates!.lng },
    title: p.name || `Lugar ${idx + 1}`
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={requestLocation} style={styles.iconBtn} disabled={loadingLocation}>
            <Ionicons name={loadingLocation ? 'time' : 'locate'} size={20} color="#333" />
          </TouchableOpacity>
        </View>
        <AppMap
          center={center}
          markers={markers}
          showUserLocation={true}
          style={styles.map}
        />
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  iconBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#333' },
  map: { flex: 1 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#444' }
});
