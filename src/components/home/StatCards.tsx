import React from 'react';

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { COLORS } from '~/constants/colors';

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
      <View style={styles.container}>
        {/* Lugares Guardados Card */}
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => router.push('/(tabs)/explore')}
        >
          <LinearGradient colors={COLORS.gradients.purple} style={styles.gradientCard}>
            <Text style={styles.iconText}>📍</Text>
            <Text style={styles.countText}>{savedPlacesCount}</Text>
            <Text style={styles.labelText}>Lugares Guardados</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Próximos Viajes Card */}
        <TouchableOpacity style={styles.cardTouchable} onPress={() => router.push('/(tabs)/trips')}>
          <LinearGradient colors={COLORS.gradients.orange} style={styles.gradientCard}>
            <Text style={styles.iconText}>📅</Text>
            <Text style={styles.countText}>{upcomingTripsCount}</Text>
            <Text style={styles.labelText}>Próximos Viajes</Text>
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

const styles = StyleSheet.create({
  // Container
  container: {
    flexDirection: 'row',
    gap: 12,
  },

  // Card TouchableOpacity
  cardTouchable: {
    flex: 1,
  },

  // Gradient Card
  gradientCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },

  // Text Styles
  iconText: {
    fontSize: 16,
    color: COLORS.text.white,
    marginBottom: 4,
  },
  countText: {
    fontSize: 32,
    color: COLORS.text.white,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  labelText: {
    fontSize: 14,
    color: COLORS.text.white,
    textAlign: 'center',
  },
});

export default StatCards;
