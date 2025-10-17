import React from 'react';

import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Estado del Modo Travel</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, !travelModeEnabled ? styles.inactiveBadge : null]}>
              <Text
                style={[
                  styles.statusText,
                  !travelModeEnabled ? styles.inactiveText : styles.dimmedText,
                ]}
              >
                Inactivo
              </Text>
            </View>
            <View style={[styles.statusBadge, travelModeEnabled ? styles.activeBadge : null]}>
              <Text
                style={[
                  styles.statusText,
                  travelModeEnabled ? styles.activeText : styles.dimmedText,
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
          style={styles.detailsButton}
          onPress={() =>
            currentTrip &&
            Alert.alert(
              'Trip Details',
              'Funcionalidad de detalles del trip próximamente disponible'
            )
          }
        >
          <Text style={styles.detailsButtonText}>Ver Detalles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            currentTrip && Alert.alert('Route', 'Funcionalidad de rutas próximamente disponible')
          }
        >
          <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.routeButton}>
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
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
    color: '#1F2937',
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
  inactiveBadge: {
    backgroundColor: '#E5E7EB',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 12,
  },
  inactiveText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  activeText: {
    color: '#059669',
    fontWeight: '600',
  },
  dimmedText: {
    color: '#9CA3AF',
    fontWeight: '400',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  routeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  // Button Text
  gradientButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TravelModeCard;
