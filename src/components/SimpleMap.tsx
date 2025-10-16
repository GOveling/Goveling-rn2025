import React from 'react';

import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

interface Accommodation {
  id: string;
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface SimpleMapProps {
  accommodations: Accommodation[];
  style?: any;
}

export default function SimpleMap({ accommodations, style }: SimpleMapProps) {
  const openInMaps = (accommodation: Accommodation) => {
    const { latitude, longitude, name } = accommodation;
    const query = encodeURIComponent(name);

    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://0,0?q=${query}&ll=${latitude},${longitude}`);
    } else if (Platform.OS === 'android') {
      Linking.openURL(`geo:0,0?q=${latitude},${longitude}(${query})`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Ionicons name="map-outline" size={24} color="#6B7280" />
        <Text style={styles.title}>Ubicaciones de Alojamientos</Text>
      </View>

      {accommodations.length > 0 ? (
        <View style={styles.locationsList}>
          {accommodations.map((accommodation, index) => (
            <TouchableOpacity
              key={accommodation.id}
              style={styles.locationItem}
              onPress={() => openInMaps(accommodation)}
            >
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{accommodation.name}</Text>
                <Text style={styles.locationAddress}>{accommodation.address}</Text>
                <Text style={styles.coordinates}>
                  📍 {accommodation.latitude.toFixed(4)}, {accommodation.longitude.toFixed(4)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {
              const center = accommodations[0];
              if (Platform.OS === 'web') {
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`
                );
              } else {
                openInMaps(center);
              }
            }}
          >
            <Ionicons name="map" size={20} color="white" />
            <Text style={styles.viewAllText}>Ver Todas en Mapa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay ubicaciones para mostrar</Text>
        </View>
      )}
    </View>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginLeft: 8,
  },
  locationsList: {
    gap: 12,
  },
  locationItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace' as const,
  },
  viewAllButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#8B5CF6',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  viewAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center' as const,
  },
};
