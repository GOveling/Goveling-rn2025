import React from 'react';

import { View, Text } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTemperatureUnit } from '~/utils/units';

import NotificationBell from './NotificationBell';

interface LocationWidgetProps {
  city: string;
  temp: number | undefined;
  units: 'c' | 'f'; // Keep for backwards compatibility but will be ignored
}

/**
 * Memoized LocationWidget component
 * Only re-renders when city or temp change
 * Prevents unnecessary re-renders from parent state changes
 */
const LocationWidget = React.memo<LocationWidgetProps>(
  function LocationWidget({ city, temp }) {
    const { i18n } = useTranslation();
    const temperature = useTemperatureUnit();

    // Use current language for date formatting
    const currentDate = new Date().toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
    });

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={16} color="white" />
                <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>{city}</Text>
              </View>
              <Text style={{ fontSize: 16, color: 'white', marginLeft: 8 }}>• {currentDate}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <Ionicons
                name="thermometer-outline"
                size={16}
                color="white"
                style={{
                  marginRight: 4,
                }}
              />
              <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>
                {typeof temp === 'number' && !isNaN(temp) ? temperature.format(temp) : '—'}
              </Text>
            </View>

            <NotificationBell iconColor="#fff" />
          </View>
        </View>
      </LinearGradient>
    );
  },
  // Custom comparison function for better memoization
  (prevProps, nextProps) => {
    return (
      prevProps.city === nextProps.city && prevProps.temp === nextProps.temp
      // units prop is now ignored - we use AppSettingsContext via hook
    );
  }
);

export default LocationWidget;
