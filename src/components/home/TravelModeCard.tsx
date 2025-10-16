import React from 'react';

import { View, Text, TouchableOpacity, Alert } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

interface TravelModeCardProps {
  travelModeEnabled: boolean;
  onToggleTravelMode: () => void;
  currentTrip: any | null;
}

/**
 * Memoized TravelModeCard component
 * Shows travel mode status and actions
 * Only re-renders when travel mode state or current trip changes
 */
const TravelModeCard = React.memo<TravelModeCardProps>(
  function TravelModeCard({ travelModeEnabled, onToggleTravelMode, currentTrip }) {
    return (
      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
            Estado del Modo Travel
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: !travelModeEnabled ? '#E5E7EB' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: !travelModeEnabled ? '#6B7280' : '#9CA3AF',
                  fontWeight: !travelModeEnabled ? '600' : '400',
                }}
              >
                Inactivo
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: travelModeEnabled ? '#D1FAE5' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: travelModeEnabled ? '#059669' : '#9CA3AF',
                  fontWeight: travelModeEnabled ? '600' : '400',
                }}
              >
                Viajando
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={onToggleTravelMode}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={{
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              ✈️ Acceder al Modo Travel
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: '#F9FAFB',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginBottom: 12,
          }}
          onPress={() =>
            currentTrip &&
            Alert.alert(
              'Trip Details',
              'Funcionalidad de detalles del trip próximamente disponible'
            )
          }
        >
          <Text style={{ color: '#374151', fontSize: 16, fontWeight: '500' }}>Ver Detalles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            currentTrip && Alert.alert('Route', 'Funcionalidad de rutas próximamente disponible')
          }
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={{
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Ver Detalles de Ruta IA
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  },
  // Only re-render if travel mode or current trip changes
  (prevProps, nextProps) => {
    return (
      prevProps.travelModeEnabled === nextProps.travelModeEnabled &&
      prevProps.currentTrip?.id === nextProps.currentTrip?.id
    );
  }
);

export default TravelModeCard;
