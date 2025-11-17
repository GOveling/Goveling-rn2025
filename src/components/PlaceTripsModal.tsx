// src/components/PlaceTripsModal.tsx
import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

interface Trip {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface PlaceTripsModalProps {
  visible: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
  onCloseAll?: () => void; // New: callback to close parent modal too
}

export default function PlaceTripsModal({
  visible,
  onClose,
  placeId,
  placeName,
  onCloseAll,
}: PlaceTripsModalProps) {
  const theme = useTheme();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTripsWithPlace = async () => {
    try {
      setLoading(true);
      console.log('🔍 PlaceTripsModal: Loading trips for place', placeId);

      // Get all trip_places entries for this place
      const { data: tripPlaces, error: tripPlacesError } = await supabase
        .from('trip_places')
        .select('trip_id')
        .eq('place_id', placeId);

      if (tripPlacesError) {
        console.error('Error loading trip_places:', tripPlacesError);
        setTrips([]);
        return;
      }

      if (!tripPlaces || tripPlaces.length === 0) {
        console.log('📍 No trips found for this place');
        setTrips([]);
        return;
      }

      const tripIds = tripPlaces.map((tp) => tp.trip_id);
      console.log('📍 Found place in', tripIds.length, 'trips');

      // Get trip details
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('id, title, start_date, end_date, created_at')
        .in('id', tripIds)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (tripsError) {
        console.error('Error loading trips:', tripsError);
        setTrips([]);
        return;
      }

      console.log('✅ Loaded', tripsData?.length || 0, 'trips');
      setTrips(tripsData || []);
    } catch (error) {
      console.error('Error in loadTripsWithPlace:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && placeId) {
      loadTripsWithPlace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, placeId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleTripPress = (tripId: string) => {
    console.log('🚀 PlaceTripsModal: Navigating to trip:', tripId);
    // Close this modal
    onClose();
    // Close parent modal (PlaceDetailModal) if callback provided
    if (onCloseAll) {
      console.log('🚀 PlaceTripsModal: Closing parent modal');
      onCloseAll();
    }
    // Navigate to trip
    console.log('🚀 PlaceTripsModal: Executing navigation');
    router.push(`/trips/${tripId}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="map" size={24} color="#8B5CF6" />
              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  Viajes con este lugar
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
                  {placeName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                  Cargando viajes...
                </Text>
              </View>
            ) : trips.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="map-outline" size={64} color={theme.colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Sin viajes</Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                  Este lugar no está agregado a ningún viaje activo
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {trips.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={[styles.tripCard, { backgroundColor: theme.colors.card }]}
                    onPress={() => handleTripPress(trip.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tripCardHeader}>
                      <Ionicons name="airplane" size={20} color="#8B5CF6" />
                      <Text
                        style={[styles.tripTitle, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {trip.title}
                      </Text>
                    </View>

                    {(trip.start_date || trip.end_date) && (
                      <View style={styles.tripDates}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color={theme.colors.textMuted}
                        />
                        <Text style={[styles.tripDatesText, { color: theme.colors.textMuted }]}>
                          {trip.start_date && trip.end_date
                            ? `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`
                            : trip.start_date
                              ? formatDate(trip.start_date)
                              : trip.end_date
                                ? formatDate(trip.end_date)
                                : 'Sin fechas'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.tripCardFooter}>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    minHeight: 300,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
    minHeight: 200,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  tripCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  tripDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tripDatesText: {
    fontSize: 13,
  },
  tripCardFooter: {
    alignItems: 'flex-end',
  },
});
