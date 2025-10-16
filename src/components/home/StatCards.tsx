import React from 'react';

import { View, Text, TouchableOpacity } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface StatCardsProps {
  savedPlacesCount: number;
  upcomingTripsCount: number;
}

/**
 * Memoized StatCards component
 * Shows Places and Trips count cards
 * Only re-renders when counts change
 */
const StatCards = React.memo<StatCardsProps>(
  function StatCards({ savedPlacesCount, upcomingTripsCount }) {
    const router = useRouter();

    return (
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Lugares Guardados Card */}
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/explore')}>
          <LinearGradient
            colors={['#8B5CF6', '#A855F7']}
            style={{
              padding: 20,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
            }}
          >
            <Text style={{ fontSize: 16, color: 'white', marginBottom: 4 }}>📍</Text>
            <Text style={{ fontSize: 32, color: 'white', fontWeight: 'bold', marginBottom: 4 }}>
              {savedPlacesCount}
            </Text>
            <Text style={{ fontSize: 14, color: 'white', textAlign: 'center' }}>
              Lugares Guardados
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Próximos Viajes Card */}
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/trips')}>
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            style={{
              padding: 20,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
            }}
          >
            <Text style={{ fontSize: 16, color: 'white', marginBottom: 4 }}>📅</Text>
            <Text style={{ fontSize: 32, color: 'white', fontWeight: 'bold', marginBottom: 4 }}>
              {upcomingTripsCount}
            </Text>
            <Text style={{ fontSize: 14, color: 'white', textAlign: 'center' }}>
              Próximos Viajes
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  },
  // Custom comparison - only re-render if counts actually change
  (prevProps, nextProps) => {
    return (
      prevProps.savedPlacesCount === nextProps.savedPlacesCount &&
      prevProps.upcomingTripsCount === nextProps.upcomingTripsCount
    );
  }
);

export default StatCards;
