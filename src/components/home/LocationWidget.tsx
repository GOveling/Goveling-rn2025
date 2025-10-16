import React from 'react';

import { View, Text, TouchableOpacity } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import NotificationBell from './NotificationBell';

interface LocationWidgetProps {
  city: string;
  temp: number | undefined;
  units: 'c' | 'f';
  onToggleUnits: () => void;
}

/**
 * Memoized LocationWidget component
 * Only re-renders when city, temp, or units change
 * Prevents unnecessary re-renders from parent state changes
 */
const LocationWidget = React.memo<LocationWidgetProps>(
  function LocationWidget({ city, temp, units, onToggleUnits }) {
    const currentDate = new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });

    return (
      <LinearGradient
        colors={['#4A90E2', '#9B59B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 50,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>📍 {city}</Text>
              <Text style={{ fontSize: 16, color: 'white', marginLeft: 8 }}>• {currentDate}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={onToggleUnits}
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}
            >
              <Text style={{ fontSize: 16, color: 'white', marginRight: 4 }}>🌡️</Text>
              <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>
                {typeof temp === 'number' ? temp.toFixed(1).replace('.', ',') : '—'}°
                {units === 'c' ? 'C' : 'F'}
              </Text>
            </TouchableOpacity>

            <NotificationBell iconColor="#fff" />
          </View>
        </View>
      </LinearGradient>
    );
  },
  // Custom comparison function for better memoization
  (prevProps, nextProps) => {
    return (
      prevProps.city === nextProps.city &&
      prevProps.temp === nextProps.temp &&
      prevProps.units === nextProps.units
      // onToggleUnits is stable (useCallback), so we don't compare it
    );
  }
);

export default LocationWidget;
