/**
 * TravelModeModal - Main modal for Travel Mode
 * Optimized for native hardware (iOS/Android)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';

import { useTranslation } from 'react-i18next';

import SavedPlacesMapModal from '~/components/SavedPlacesMapModal';
import { isFeatureEnabled } from '~/config/featureFlags';
import { useTravelMode } from '~/contexts/TravelModeContext';
import { useGeoDetection } from '~/lib/geo';
import { supabase } from '~/lib/supabase';
import { formatDistance } from '~/services/travelMode/geoUtils';

import { CountryWelcomeModal } from './CountryWelcomeModal';
import { PlaceVisitModal } from './PlaceVisitModal';

interface TravelModeModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
}

export function TravelModeModal({ visible, onClose, tripId, tripName }: TravelModeModalProps) {
  const { t } = useTranslation();
  const { state, actions } = useTravelMode();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const hasLoadedRef = useRef(false); // ✅ Prevenir múltiples cargas

  // ✅ NUEVO: Sistema de geo-detección precisa
  const usePreciseGeo = isFeatureEnabled('USE_PRECISE_GEO_DETECTION');
  const showDebugPanel = isFeatureEnabled('SHOW_GEO_DEBUG_PANEL');
  const preciseGeo = useGeoDetection(usePreciseGeo && visible && state.isTracking);

  // 🐛 DEBUG: Expose actions to window in development mode
  useEffect(() => {
    if (__DEV__ && typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).debugActions = actions;
      console.log('🐛 DEBUG: Actions exposed to window.debugActions');
      console.log('   Try: window.debugActions.getArrivalDebugStats()');
      console.log('   Try: window.debugActions.resetArrivalDetection()');
    }
    return () => {
      if (__DEV__ && typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).debugActions;
      }
    };
  }, [actions]);

  // Reset hasLoaded when modal closes or trip changes
  useEffect(() => {
    if (!visible) {
      hasLoadedRef.current = false;
      // ✅ FIX: Reset map modal state when parent modal closes
      setMapModalVisible(false);
    }
  }, [visible, tripId]);

  // Load saved places when modal opens (only once per trip/open)
  useEffect(() => {
    if (!visible || !tripId || hasLoadedRef.current) {
      return;
    }

    const loadPlaces = async () => {
      hasLoadedRef.current = true; // ✅ Marcar como cargado ANTES de la query

      try {
        setLoadError(null);
        console.log('🗺️ TravelMode: Loading places for trip:', tripId);

        // Query trip_places table for this trip
        const { data: places, error } = await supabase
          .from('trip_places')
          .select('id, name, lat, lng, category, place_id, created_at')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('❌ TravelMode: Error loading places:', error);
          setLoadError(t('home.error_loading_places'));
          return;
        }

        if (!places || places.length === 0) {
          console.log('ℹ️ TravelMode: No places found for this trip');
          actions.setSavedPlaces([]);
          return;
        }

        // Transform database places to SavedPlace format
        const savedPlaces = places
          .filter((p) => p.lat != null && p.lng != null) // Filter out places without coordinates
          .map((place) => ({
            id: place.id,
            name: place.name,
            latitude: place.lat,
            longitude: place.lng,
            types: place.category ? [place.category] : [], // Convert category string to types array
            tripId,
            tripName,
            visited: false,
          }));

        console.log(`✅ TravelMode: Loaded ${savedPlaces.length} places for trip`);
        actions.setSavedPlaces(savedPlaces);
      } catch (err) {
        console.error('❌ TravelMode: Unexpected error loading places:', err);
        setLoadError(t('home.error_loading_places_unexpected'));
      }
    };

    loadPlaces();
  }, [visible, tripId, tripName, actions, t]);

  // Retry function for manual reload
  const handleRetry = () => {
    hasLoadedRef.current = false; // Reset the flag
    setLoadError(null);
  };

  /**
   * Handle visit confirmation
   */
  const handleConfirmVisit = useCallback(async () => {
    if (!state.pendingArrival) return;

    try {
      console.log('🔄 Confirming visit...', {
        placeId: state.pendingArrival.placeId,
        placeName: state.pendingArrival.placeName,
        tripId,
      });

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error('❌ User authentication error:', userError);
        Alert.alert(t('home.error'), t('home.not_authenticated'));
        return;
      }

      // Get place details from saved places
      const place = state.savedPlaces.find((p) => p.id === state.pendingArrival!.placeId);

      if (!place) {
        console.error('❌ Place not found in saved places');
        Alert.alert(t('home.error'), t('home.place_not_found'));
        return;
      }

      console.log('📍 Place details:', {
        id: place.id,
        name: place.name,
        lat: place.latitude,
        lng: place.longitude,
      });

      // Prepare visit data
      const visitData = {
        user_id: userData.user.id,
        trip_id: tripId,
        place_id: place.id,
        place_name: state.pendingArrival.placeName,
        lat: place.latitude,
        lng: place.longitude,
        visited_at: new Date().toISOString(),
      };

      console.log('💾 Saving visit to database:', visitData);

      // Save visit to trip_visits table
      const { data: insertedData, error: insertError } = await supabase
        .from('trip_visits')
        .insert(visitData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error saving visit:', insertError);
        console.error('Error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        Alert.alert(
          t('home.error_saving_visit'),
          `${insertError.message}\n\n${t('home.code')}: ${insertError.code}`
        );
        return;
      }

      console.log('✅ Visit saved to database:', insertedData);

      // Confirm arrival in service
      actions.confirmArrival(state.pendingArrival.placeId);

      // Show success message
      Alert.alert(t('home.visit_confirmed'), t('home.visit_saved_stats'), [
        { text: t('home.great'), style: 'default' },
      ]);
    } catch (error) {
      console.error('❌ Error confirming visit:', error);
      Alert.alert(t('home.error'), t('home.error_confirming_visit'));
    }
  }, [state.pendingArrival, state.savedPlaces, tripId, actions, t]);

  /**
   * Handle skip visit
   */
  const handleSkipVisit = useCallback(() => {
    if (!state.pendingArrival) return;

    actions.skipArrival(state.pendingArrival.placeId);
  }, [state.pendingArrival, actions]);

  /**
   * Handle country visit confirmation (with DB insert)
   */
  const handleConfirmCountryVisit = useCallback(async () => {
    if (!state.pendingCountryVisit) return;

    const { countryInfo, coordinates, isReturn, previousCountryCode } = state.pendingCountryVisit;

    try {
      console.log(`🌍 Saving country visit to database: ${countryInfo.countryName}`);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(t('home.error'), t('home.not_authenticated'));
        return;
      }

      // Count places in this country
      const placesInCountry = state.savedPlaces.filter((place) => {
        // Match by country_code if available in place data
        return place.types && place.types.includes(countryInfo.countryCode);
      });

      // Insert country visit
      const { error } = await supabase.from('country_visits').insert({
        user_id: user.id,
        trip_id: tripId,
        country_code: countryInfo.countryCode,
        country_name: countryInfo.countryName,
        lat: coordinates.latitude,
        lng: coordinates.longitude,
        is_return: isReturn,
        places_count: placesInCountry.length,
        previous_country_code: previousCountryCode,
      });

      if (error) {
        console.error('❌ Error saving country visit:', error);
        Alert.alert(t('home.error'), t('home.error_saving_country_visit'));
        return;
      }

      console.log(`✅ Country visit saved successfully: ${countryInfo.countryName}`);

      // Clear pending state
      actions.confirmCountryVisit(countryInfo.countryCode);
    } catch (error) {
      console.error('❌ Error in handleConfirmCountryVisit:', error);
      Alert.alert(t('home.error'), t('home.error_occurred'));
    }
  }, [state.pendingCountryVisit, state.savedPlaces, tripId, actions, t]);

  /**
   * Handle dismissing country visit modal
   */
  const handleDismissCountryVisit = useCallback(() => {
    actions.dismissCountryVisit();
  }, [actions]);

  const handleStartTravelMode = async () => {
    setIsLoading(true);
    const success = await actions.startTravelMode();
    setIsLoading(false);

    if (!success) {
      Alert.alert(t('home.error'), t('home.error_starting_travel_mode'));
    }
  };

  const handleStopTravelMode = async () => {
    await actions.stopTravelMode();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚀 {t('home.travel_mode')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Error Message */}
          {loadError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>⚠️ {loadError}</Text>
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>{t('home.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Trip Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('home.current_trip')}</Text>
            <Text style={styles.tripName}>{tripName}</Text>
            <Text style={styles.placesCount}>
              {t('home.saved_places_count', { count: state.savedPlaces.length })}
            </Text>

            {/* Ver Mapa Button */}
            <TouchableOpacity
              onPress={() => {
                if (state.isActive) {
                  setMapModalVisible(true);
                } else {
                  Alert.alert(
                    t('home.travel_mode_deactivated'),
                    t('home.activate_travel_mode_to_see_map'),
                    [{ text: t('home.understood'), style: 'default' }]
                  );
                }
              }}
              style={[styles.mapButton, !state.isActive && styles.mapButtonDisabled]}
            >
              <Text style={[styles.mapButtonText, !state.isActive && styles.mapButtonTextDisabled]}>
                🗺️ {t('home.view_map')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('home.status')}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, state.isTracking && styles.statusDotActive]} />
              <Text style={styles.statusText}>
                {state.isTracking ? t('home.tracking_location') : t('home.inactive')}
              </Text>
            </View>

            {state.currentLocation && (
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>
                  📍 Lat: {state.currentLocation.coordinates.latitude.toFixed(6)}
                </Text>
                <Text style={styles.locationText}>
                  📍 Lng: {state.currentLocation.coordinates.longitude.toFixed(6)}
                </Text>
                <Text style={styles.locationText}>
                  🎯 Precisión: ±{Math.round(state.currentLocation.accuracy)}m
                </Text>
              </View>
            )}

            {state.energyMode && <Text style={styles.energyMode}>🔋 Modo: {state.energyMode}</Text>}
          </View>

          {/* ✅ NUEVO: Precise Geo Detection Card */}
          {usePreciseGeo && state.isTracking && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 {t('home.precise_detection')}</Text>

              {preciseGeo.currentCountry && (
                <View style={styles.geoInfoRow}>
                  <Text style={styles.geoLabel}>{t('home.country')}:</Text>
                  <Text style={styles.geoValue}>{preciseGeo.currentCountry}</Text>
                </View>
              )}

              {preciseGeo.currentRegion && (
                <View style={styles.geoInfoRow}>
                  <Text style={styles.geoLabel}>{t('home.region')}:</Text>
                  <Text style={styles.geoValue}>{preciseGeo.currentRegion}</Text>
                </View>
              )}

              {preciseGeo.accuracy && (
                <View style={styles.geoInfoRow}>
                  <Text style={styles.geoLabel}>{t('home.gps_accuracy')}:</Text>
                  <Text style={styles.geoValue}>±{Math.round(preciseGeo.accuracy)}m</Text>
                </View>
              )}

              {preciseGeo.isNearBorder && (
                <View style={styles.borderWarning}>
                  <Text style={styles.borderWarningText}>⚠️ {t('home.near_border')}</Text>
                  <Text style={styles.borderWarningSubtext}>
                    {t('home.near_border_description')}
                  </Text>
                </View>
              )}

              {preciseGeo.isDetecting && (
                <View style={styles.detectingBadge}>
                  <Text style={styles.detectingText}>⏳ {t('home.detecting')}</Text>
                </View>
              )}

              {preciseGeo.error && (
                <View style={styles.geoErrorBadge}>
                  <Text style={styles.geoErrorText}>❌ {preciseGeo.error}</Text>
                </View>
              )}
            </View>
          )}

          {/* ✅ NUEVO: Debug Panel (solo desarrollo) */}
          {showDebugPanel && usePreciseGeo && state.isTracking && preciseGeo.debugInfo && (
            <View style={styles.debugPanel}>
              <Text style={styles.debugTitle}>🐛 Geo Detection Debug</Text>

              <View style={styles.debugGrid}>
                <View style={styles.debugItem}>
                  <Text style={styles.debugLabel}>Buffer:</Text>
                  <Text style={styles.debugValue}>{preciseGeo.debugInfo.bufferSize}/4</Text>
                </View>

                <View style={styles.debugItem}>
                  <Text style={styles.debugLabel}>Cache:</Text>
                  <Text style={styles.debugValue}>
                    {preciseGeo.debugInfo.cacheHit ? '✓ Hit' : '❌ Miss'}
                  </Text>
                </View>

                <View style={styles.debugItem}>
                  <Text style={styles.debugLabel}>Method:</Text>
                  <Text style={styles.debugValue}>
                    {preciseGeo.debugInfo.usedPreciseDetection ? '🎯 PIP' : '⚡ BBox'}
                  </Text>
                </View>

                <View style={styles.debugItem}>
                  <Text style={styles.debugLabel}>Status:</Text>
                  <Text style={styles.debugValue}>
                    {preciseGeo.isDetecting ? '⏳ Active' : '✓ Ready'}
                  </Text>
                </View>
              </View>

              {preciseGeo.debugInfo.lastReading && (
                <Text style={styles.debugSmall}>
                  Last: [{preciseGeo.debugInfo.lastReading.lat.toFixed(4)},{' '}
                  {preciseGeo.debugInfo.lastReading.lng.toFixed(4)}] @{' '}
                  {new Date(preciseGeo.debugInfo.lastReading.timestamp).toLocaleTimeString()}
                </Text>
              )}
            </View>
          )}

          {/* ✅ NUEVO: Transport Mode Card */}
          {state.transportMode && state.currentLocation && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('home.transport_mode')}</Text>
              <View style={styles.transportRow}>
                <Text style={styles.transportEmoji}>
                  {state.transportMode === 'stationary' && '🧍'}
                  {state.transportMode === 'walking' && '🚶'}
                  {state.transportMode === 'cycling' && '🚴'}
                  {state.transportMode === 'transit' && '🚌'}
                  {state.transportMode === 'driving' && '🚗'}
                </Text>
                <View style={styles.transportInfo}>
                  <Text style={styles.transportMode}>
                    {state.transportMode === 'stationary' && t('home.stationary')}
                    {state.transportMode === 'walking' && t('home.walking')}
                    {state.transportMode === 'cycling' && t('home.cycling')}
                    {state.transportMode === 'transit' && t('home.public_transit')}
                    {state.transportMode === 'driving' && t('home.driving')}
                  </Text>
                  {state.currentSpeed !== null && state.currentSpeed >= 0 && (
                    <Text style={styles.speedText}>
                      {Math.max(0, state.currentSpeed).toFixed(1)} km/h
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Nearby Places */}
          {state.nearbyPlaces.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('home.nearby_places')}</Text>
              {state.nearbyPlaces.slice(0, 5).map((place) => (
                <View key={place.id} style={styles.placeItem}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeDistance}>{formatDistance(place.distance)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Control Buttons */}
          <View style={styles.buttonsContainer}>
            {!state.isTracking ? (
              <TouchableOpacity
                onPress={handleStartTravelMode}
                style={[styles.button, styles.primaryButton]}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? t('home.starting') : `🚀 ${t('home.start_travel_mode')}`}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleStopTravelMode}
                style={[styles.button, styles.dangerButton]}
              >
                <Text style={styles.buttonText}>🛑 {t('home.stop_travel_mode')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{t('home.how_it_works')}</Text>
            <Text style={styles.infoText}>• {t('home.how_it_works_1')}</Text>
            <Text style={styles.infoText}>• {t('home.how_it_works_2')}</Text>
            <Text style={styles.infoText}>• {t('home.how_it_works_3')}</Text>
          </View>
        </ScrollView>
      </View>

      {/* Saved Places Map Modal */}
      <SavedPlacesMapModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        nearbyPlaces={state.nearbyPlaces.map((place) => ({
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          distance: place.distance,
          tripId: place.tripId,
        }))}
        tripTitle={tripName}
        tripColor="#3B82F6"
      />

      {/* Place Visit Confirmation Modal */}
      {state.pendingArrival && (
        <PlaceVisitModal
          visible={true}
          placeName={state.pendingArrival.placeName}
          placeTypes={state.savedPlaces.find((p) => p.id === state.pendingArrival?.placeId)?.types}
          distance={state.pendingArrival.distance}
          dwellingTime={state.pendingArrival.dwellingTimeSeconds}
          onConfirm={handleConfirmVisit}
          onSkip={handleSkipVisit}
        />
      )}

      {/* Country Welcome Modal */}
      {state.pendingCountryVisit && (
        <CountryWelcomeModal
          visible={true}
          countryInfo={state.pendingCountryVisit.countryInfo}
          isReturn={state.pendingCountryVisit.isReturn}
          savedPlaces={state.savedPlaces
            .filter((place) => {
              // Filter places that belong to this country
              // This is a simplified version - you may need to enhance matching logic
              const countryCode = state.pendingCountryVisit?.countryInfo.countryCode;
              // For now, we'll just show up to 10 places
              return true; // TODO: Add proper country_code matching when available in place data
            })
            .slice(0, 10)
            .map((p) => ({
              id: p.id,
              name: p.name,
              city: undefined, // TODO: Add city if available
              type: p.types?.[0],
            }))}
          onClose={handleDismissCountryVisit}
          onConfirm={handleConfirmCountryVisit}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#000',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  tripName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 8,
  },
  placesCount: {
    fontSize: 14,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#999',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 16,
    color: '#000',
  },
  locationInfo: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  energyMode: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  placeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  placeName: {
    fontSize: 15,
    color: '#000',
    flex: 1,
  },
  placeDistance: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  buttonsContainer: {
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  mapButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  mapButtonDisabled: {
    opacity: 0.4,
  },
  mapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  mapButtonTextDisabled: {
    opacity: 0.6,
  },
  // ✅ NUEVOS ESTILOS: Transport Mode
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  transportInfo: {
    flex: 1,
  },
  transportMode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  speedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  // ✅ NUEVOS ESTILOS: Precise Geo Detection
  geoInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  geoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  geoValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  borderWarning: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  borderWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  borderWarningSubtext: {
    fontSize: 12,
    color: '#78350F',
  },
  detectingBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  detectingText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '500',
  },
  geoErrorBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  geoErrorText: {
    fontSize: 13,
    color: '#991B1B',
  },
  // ✅ NUEVOS ESTILOS: Debug Panel
  debugPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 12,
  },
  debugGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  debugItem: {
    width: '50%',
    marginBottom: 8,
  },
  debugLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  debugValue: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
  debugSmall: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
});
