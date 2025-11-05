import React, { useState, useEffect, useCallback } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TripSelectorModal from '../../src/components/TripSelectorModal';
import { EnhancedPlace } from '../../src/lib/placesSearch';
import { supabase } from '../../src/lib/supabase';

export default function AddToTripScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { placeId, name } = useLocalSearchParams<{ placeId?: string; name?: string }>();

  const [place, setPlace] = useState<EnhancedPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [addingToTrip, setAddingToTrip] = useState(false);

  const loadPlaceDetails = useCallback(async () => {
    try {
      setLoading(true);
      if (!placeId) {
        Alert.alert(t('explore.error_title'), t('explore.add_to_trip_screen.error_no_place'));
        router.back();
        return;
      }

      // Crear un objeto básico con los datos disponibles desde los parámetros
      const placeName = name
        ? decodeURIComponent(name)
        : t('explore.add_to_trip_screen.unknown_place');
      const basicPlace: EnhancedPlace = {
        id: placeId,
        name: placeName.trim() || t('explore.add_to_trip_screen.unknown_place'),
        address: '',
        coordinates: { lat: 0, lng: 0 },
        types: [],
        rating: 0,
        priceLevel: 0,
        photos: [],
        business_status: 'OPERATIONAL',
        source: 'params',
      };
      setPlace(basicPlace);

      // Mostrar automáticamente el selector de trips
      setShowTripSelector(true);
    } catch (error) {
      console.error('Error loading place details:', error);
      Alert.alert(t('explore.error_title'), t('explore.add_to_trip_screen.error_loading'));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [placeId, name, router, t]);

  useEffect(() => {
    loadPlaceDetails();
  }, [loadPlaceDetails]);

  const handleTripSelected = async (tripId: string, tripTitle: string) => {
    if (!place) {
      Alert.alert(t('explore.error_title'), t('explore.add_to_trip_screen.error_identify_place'));
      return;
    }

    try {
      setAddingToTrip(true);
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user?.id) {
        Alert.alert(t('explore.error_title'), t('explore.error_not_authenticated'));
        return;
      }

      // Verificar si el lugar ya existe en el viaje
      const { data: existingPlace } = await supabase
        .from('trip_places')
        .select('id')
        .eq('trip_id', tripId)
        .eq('place_id', place.id)
        .maybeSingle();

      if (existingPlace) {
        Alert.alert(
          t('explore.add_to_trip_screen.place_already_added_title'),
          t('explore.add_to_trip_screen.place_already_in_trip', {
            place: place.name,
            trip: tripTitle,
          }),
          [
            {
              text: t('explore.add_to_trip_screen.view_trip_places'),
              onPress: () => router.push(`/trips/${tripId}/places`),
            },
            {
              text: t('explore.add_to_trip_screen.continue_exploring'),
              onPress: () => router.push('/(tabs)/explore'),
            },
          ]
        );
        return;
      }

      // Agregar el lugar al viaje
      const convertPriceLevel = (priceLevel?: number | string | null): number | null => {
        if (typeof priceLevel === 'number') return priceLevel;
        if (!priceLevel) return null;

        const priceLevelMap: { [key: string]: number } = {
          PRICE_LEVEL_FREE: 0,
          PRICE_LEVEL_INEXPENSIVE: 1,
          PRICE_LEVEL_MODERATE: 2,
          PRICE_LEVEL_EXPENSIVE: 3,
          PRICE_LEVEL_VERY_EXPENSIVE: 4,
        };

        return priceLevelMap[priceLevel] ?? null;
      };

      // Prepare place data for insertion
      const placeData = {
        trip_id: tripId,
        place_id: place.id,
        name: place.name,
        address: place.address || '',
        lat: place.coordinates?.lat || 0,
        lng: place.coordinates?.lng || 0,
        category: place.types?.[0] || place.category || 'establishment',
        photo_url: place.photos && place.photos.length > 0 ? place.photos[0] : null,
        added_by: user.user.id,
        added_at: new Date().toISOString(),
        // Google Places API fields
        google_rating: place.rating || null,
        reviews_count: place.reviews_count || null,
        price_level: convertPriceLevel(place.priceLevel),
        editorial_summary: place.description || null,
        opening_hours: place.openingHours ? { weekdayDescriptions: place.openingHours } : null,
        website: place.website || null,
        phone: place.phone || null,
      };

      // Use notification function to add place with notifications to collaborators
      const { addPlaceToTripWithNotification } = await import('~/lib/placesNotifications');
      const { error } = await addPlaceToTripWithNotification(tripId, placeData, user.user.id);

      if (error) {
        console.error('Error adding place to trip:', error);
        Alert.alert(
          t('explore.add_to_trip_screen.error'),
          t('explore.add_to_trip_screen.error_adding')
        );
        return;
      }

      // Mostrar éxito y opciones de navegación
      Alert.alert(
        t('explore.add_to_trip_screen.place_added_success'),
        t('explore.add_to_trip_screen.place_added_message', { place: place.name, trip: tripTitle }),
        [
          {
            text: t('explore.add_to_trip_screen.continue_exploring'),
            style: 'default',
            onPress: () => {
              // ✅ Navigate to explore without tripId to reset context
              console.log('🔄 AddToTrip: Resetting context - navigating to explore without tripId');
              router.replace('/(tabs)/explore');
            },
          },
          {
            text: t('explore.add_to_trip_screen.view_trip_places'),
            style: 'default',
            onPress: () => router.push(`/trips/${tripId}/places`),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding place to trip:', error);
      Alert.alert(
        t('explore.add_to_trip_screen.error'),
        t('explore.add_to_trip_screen.error_unexpected')
      );
    } finally {
      setAddingToTrip(false);
    }
  };

  const handleModalClose = () => {
    setShowTripSelector(false);
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>{t('explore.add_to_trip_screen.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('explore.add_to_trip_screen.title')}</Text>
          {!!(place && (place.name ?? '').trim().length > 0) && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {place!.name}
            </Text>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!!place && (
          <View style={styles.placeInfo}>
            <View style={styles.placeHeader}>
              <Text style={styles.placeName}>
                {place.name || t('explore.add_to_trip_screen.unnamed_place')}
              </Text>
              {(place.rating ?? 0) > 0 && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {(place.address ?? '').trim().length > 0 && (
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.addressText}>{place.address}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.selectTripButton}
          onPress={() => setShowTripSelector(true)}
          disabled={addingToTrip}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.selectTripGradient}
          >
            {addingToTrip ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="airplane" size={20} color="#FFFFFF" />
                <Text style={styles.selectTripText}>
                  {t('explore.add_to_trip_screen.select_trip')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Trip Selector Modal */}
      <TripSelectorModal
        visible={showTripSelector}
        onClose={handleModalClose}
        onTripSelected={handleTripSelected}
        placeName={place?.name || undefined}
        placeId={place?.id || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addressContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  addressText: {
    color: '#6B7280',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 16,
    width: 40,
  },
  container: {
    backgroundColor: '#F8F9FA',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  headerTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  placeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  placeInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    marginBottom: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  placeName: {
    color: '#1F2937',
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 12,
  },
  ratingContainer: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  selectTripButton: {
    borderRadius: 16,
    elevation: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  selectTripGradient: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  selectTripText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
