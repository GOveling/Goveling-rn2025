/**
 * TravelModeModal - Main modal for Travel Mode
 * Optimized for native hardware (iOS/Android)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';

import SavedPlacesMapModal from '~/components/SavedPlacesMapModal';
import { useTravelMode } from '~/contexts/TravelModeContext';
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
  const { state, actions } = useTravelMode();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const hasLoadedRef = useRef(false); // ✅ Prevenir múltiples cargas

  // Reset hasLoaded when modal closes or trip changes
  useEffect(() => {
    if (!visible) {
      hasLoadedRef.current = false;
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
          setLoadError('Error al cargar lugares del viaje');
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
        setLoadError('Error inesperado al cargar lugares');
      }
    };

    loadPlaces();
  }, [visible, tripId, tripName, actions]);

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
        Alert.alert('Error', 'No estás autenticado. Por favor inicia sesión nuevamente.');
        return;
      }

      // Get place details from saved places
      const place = state.savedPlaces.find((p) => p.id === state.pendingArrival!.placeId);

      if (!place) {
        console.error('❌ Place not found in saved places');
        Alert.alert('Error', 'No se encontró el lugar en la lista de lugares guardados');
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
          'Error al guardar',
          `No se pudo guardar la visita: ${insertError.message}\n\nCódigo: ${insertError.code}`
        );
        return;
      }

      console.log('✅ Visit saved to database:', insertedData);

      // Confirm arrival in service
      actions.confirmArrival(state.pendingArrival.placeId);

      // Show success message
      Alert.alert('¡Visita Confirmada!', 'Se ha guardado tu visita en las estadísticas', [
        { text: 'Genial', style: 'default' },
      ]);
    } catch (error) {
      console.error('❌ Error confirming visit:', error);
      Alert.alert('Error', 'No se pudo confirmar la visita');
    }
  }, [state.pendingArrival, state.savedPlaces, tripId, actions]);

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
        Alert.alert('Error', 'No estás autenticado');
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
        Alert.alert('Error', 'No se pudo guardar la visita al país');
        return;
      }

      console.log(`✅ Country visit saved successfully: ${countryInfo.countryName}`);

      // Clear pending state
      actions.confirmCountryVisit(countryInfo.countryCode);
    } catch (error) {
      console.error('❌ Error in handleConfirmCountryVisit:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar la visita');
    }
  }, [state.pendingCountryVisit, state.savedPlaces, tripId, actions]);

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
      Alert.alert('Error', 'No se pudo iniciar el Modo Travel. Verifica los permisos.');
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
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚀 Modo Travel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Error Message */}
          {loadError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>⚠️ {loadError}</Text>
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Trip Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Viaje Actual</Text>
            <Text style={styles.tripName}>{tripName}</Text>
            <Text style={styles.placesCount}>{state.savedPlaces.length} lugares guardados</Text>

            {/* Ver Mapa Button */}
            <TouchableOpacity
              onPress={() => {
                if (state.isActive) {
                  setMapModalVisible(true);
                } else {
                  Alert.alert(
                    'Modo Travel Desactivado',
                    'Activa el Modo Travel para ver el mapa con lugares cercanos',
                    [{ text: 'Entendido', style: 'default' }]
                  );
                }
              }}
              style={[styles.mapButton, !state.isActive && styles.mapButtonDisabled]}
            >
              <Text style={[styles.mapButtonText, !state.isActive && styles.mapButtonTextDisabled]}>
                🗺️ Ver Mapa
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, state.isTracking && styles.statusDotActive]} />
              <Text style={styles.statusText}>
                {state.isTracking ? 'Rastreando ubicación' : 'Inactivo'}
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

          {/* ✅ NUEVO: Transport Mode Card */}
          {state.transportMode && state.currentLocation && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Modo de Transporte</Text>
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
                    {state.transportMode === 'stationary' && 'Estacionario'}
                    {state.transportMode === 'walking' && 'Caminando'}
                    {state.transportMode === 'cycling' && 'En Bicicleta'}
                    {state.transportMode === 'transit' && 'Transporte Público'}
                    {state.transportMode === 'driving' && 'Conduciendo'}
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
              <Text style={styles.cardTitle}>Lugares Cercanos</Text>
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
                  {isLoading ? 'Iniciando...' : '🚀 Iniciar Modo Travel'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleStopTravelMode}
                style={[styles.button, styles.dangerButton]}
              >
                <Text style={styles.buttonText}>🛑 Detener Modo Travel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
            <Text style={styles.infoText}>
              • Recibirás notificaciones cuando te acerques a lugares guardados
            </Text>
            <Text style={styles.infoText}>
              • El sistema optimiza el uso de batería automáticamente
            </Text>
            <Text style={styles.infoText}>
              • Puedes cerrar la app y seguirás recibiendo notificaciones
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Saved Places Map Modal */}
      <SavedPlacesMapModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        places={state.savedPlaces}
        currentLocation={state.currentLocation?.coordinates || null}
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
});
