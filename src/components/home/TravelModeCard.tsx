import React from 'react';

import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '~/lib/theme';

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
    const theme = useTheme();

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.card, shadowColor: theme.colors.text },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Estado del Modo Travel
          </Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                !travelModeEnabled && {
                  backgroundColor: theme.mode === 'dark' ? 'rgba(156, 163, 175, 0.2)' : '#E5E7EB',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  !travelModeEnabled
                    ? { color: theme.mode === 'dark' ? '#9CA3AF' : '#6B7280', fontWeight: '600' }
                    : { color: theme.colors.textMuted, fontWeight: '400', opacity: 0.5 },
                ]}
              >
                Inactivo
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                travelModeEnabled && {
                  backgroundColor: theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  travelModeEnabled
                    ? { color: theme.mode === 'dark' ? '#10B981' : '#065F46', fontWeight: '600' }
                    : { color: theme.colors.textMuted, fontWeight: '400', opacity: 0.5 },
                ]}
              >
                Viajando
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={onToggleTravelMode}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.gradientButton}>
            <Text style={styles.gradientButtonText}>✈️ Acceder al Modo Travel</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.detailsButton,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
          ]}
          onPress={() =>
            currentTrip &&
            Alert.alert(
              'Trip Details',
              'Funcionalidad de detalles del trip próximamente disponible'
            )
          }
        >
          <Text style={[styles.detailsButtonText, { color: theme.colors.text }]}>Ver Detalles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            currentTrip && Alert.alert('Route', 'Funcionalidad de rutas próximamente disponible')
          }
        >
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.routeButton}>
            <Text style={styles.gradientButtonText}>Ver Detalles de Ruta IA</Text>
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

const styles = StyleSheet.create({
  // Main Container
  container: {
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },

  // Header Section
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
  },

  // Buttons
  gradientButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  routeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  // Button Text
  gradientButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TravelModeCard;
