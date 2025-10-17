import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import CurrentTripCard from '~/components/home/CurrentTripCard';
import LocationWidget from '~/components/home/LocationWidget';
import NearbyAlerts from '~/components/home/NearbyAlerts';
import NotificationBell from '~/components/home/NotificationBell';
import StatCards from '~/components/home/StatCards';
import TravelModeCard from '~/components/home/TravelModeCard';
import { TripRefreshProvider } from '~/contexts/TripRefreshContext';
import {
  getCurrentPosition,
  reverseCityCached,
  reverseGeocodeCoordinatesCached,
  getLocationFromCoordinatesCached,
  getSavedPlaces,
  getActiveOrNextTrip,
} from '~/lib/home';
import { registerDeviceToken } from '~/lib/push';
import { useSettingsStore } from '~/lib/settingsStore';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme';
import { useTravel } from '~/lib/travelStore';
import { getWeatherCached } from '~/lib/weather';
import { logger } from '~/utils/logger';

import { useGetTripsBreakdownQuery } from '../../src/store/api/tripsApi';
import { useAppSelector } from '../../src/store/hooks';
import { selectBreakdown } from '../../src/store/slices/tripsSlice';

export const options = { headerShown: false };

export default function HomeTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { units, setUnits } = useSettingsStore();
  const { enabled: travelModeEnabled, setEnabled: setTravelModeEnabled } = useTravel();

  // RTK Query for trips - automatic caching & refetching
  const {
    data: breakdown,
    isLoading: tripsLoading,
    refetch: refetchTrips,
  } = useGetTripsBreakdownQuery();

  // Derive data from breakdown
  const currentTrip = breakdown?.active || null;
  const upcomingTripsCount = breakdown?.counts.upcoming || 0;

  const [city, setCity] = React.useState<string>('—');
  const [temp, setTemp] = React.useState<number | undefined>(undefined);
  const [pos, setPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [savedPlacesCount, setSavedPlacesCount] = React.useState<number>(0);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  // Memoized callbacks for child components
  const toggleUnits = React.useCallback(() => {
    setUnits(units === 'c' ? 'f' : 'c');
  }, [units, setUnits]);

  const toggleTravelMode = React.useCallback(() => {
    setTravelModeEnabled(!travelModeEnabled);
  }, [travelModeEnabled, setTravelModeEnabled]);

  const recomputeSavedPlaces = React.useCallback(async () => {
    logger.debug('🏠 HomeTab: recomputeSavedPlaces called');
    try {
      const savedPlaces = await getSavedPlaces();
      logger.debug('🏠 HomeTab: getSavedPlaces returned', savedPlaces.length, 'places');
      setSavedPlacesCount(savedPlaces.length);
      logger.debug('🏠 HomeTab: savedPlacesCount state updated to', savedPlaces.length);
    } catch (e) {
      logger.error('🏠 HomeTab: Error recomputing saved places:', e);
    }
  }, []);

  const onRefresh = React.useCallback(async () => {
    logger.debug('🔄 HomeTab: Pull-to-refresh triggered');
    setRefreshing(true);

    try {
      // Refresh all data in parallel - RTK Query handles trips caching
      await Promise.all([
        recomputeSavedPlaces(),
        refetchTrips(), // RTK Query refetch - respects cache
        (async () => {
          const p = await getCurrentPosition();
          if (p) {
            setPos(p);
            const [cityName, weather] = await Promise.all([
              reverseCityCached(p.lat, p.lng),
              getWeatherCached(p.lat, p.lng, units),
            ]);
            setCity(cityName || 'Ubicación');
            setTemp(weather?.temp);
          }
        })(),
      ]);

      logger.debug('✅ HomeTab: Pull-to-refresh completed successfully');
    } catch (error) {
      logger.error('❌ HomeTab: Pull-to-refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [recomputeSavedPlaces, refetchTrips, units]);

  React.useEffect(() => {
    registerDeviceToken().catch(() => {});
    (async () => {
      const p = await getCurrentPosition();
      if (p) {
        setPos(p);
        // Don't set city here, let the weather API effect handle it
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!pos) return;

      try {
        const w = await getWeatherCached(pos.lat, pos.lng, units);

        if (w) {
          setTemp(w.temp);

          // Use location data from Weather API if available
          if (w.location && w.location.city) {
            setCity(w.location.city);
          } else {
            // Fallback 1: try to get city from reverse geocoding
            try {
              const fallbackCity = await reverseCityCached(pos.lat, pos.lng);
              if (fallbackCity) {
                setCity(fallbackCity);
              } else {
                // Fallback 2: try BigDataCloud geocoding
                const alternativeCity = await reverseGeocodeCoordinatesCached(pos.lat, pos.lng);
                if (alternativeCity) {
                  setCity(alternativeCity);
                } else {
                  // Fallback 3: coordinate-based detection
                  const coordinateLocation = await getLocationFromCoordinatesCached(
                    pos.lat,
                    pos.lng
                  );
                  if (coordinateLocation) {
                    setCity(coordinateLocation);
                  }
                }
              }
            } catch (geocodeError) {
              // Silent fallback error handling
            }
          }
        }
      } catch (error) {
        // Fallback: try to get city from reverse geocoding even if weather fails
        try {
          const fallbackCity = await reverseCityCached(pos.lat, pos.lng);
          if (fallbackCity) {
            setCity(fallbackCity);
          } else {
            // Try alternative geocoding
            const alternativeCity = await reverseGeocodeCoordinatesCached(pos.lat, pos.lng);
            if (alternativeCity) {
              setCity(alternativeCity);
            } else {
              // Last resort: coordinate-based detection
              const coordinateLocation = await getLocationFromCoordinatesCached(pos.lat, pos.lng);
              if (coordinateLocation) {
                setCity(coordinateLocation);
              }
            }
          }
        } catch (geocodeError) {
          // Silent fallback error handling
        }
      }
    })();
  }, [pos, units]);

  React.useEffect(() => {
    (async () => {
      try {
        logger.debug('🏠 HomeTab: Initial data loading started');

        // RTK Query handles trips data automatically via useGetTripsBreakdownQuery
        // Just need to recompute saved places
        await recomputeSavedPlaces();

        logger.debug('🏠 HomeTab: Initial data loading completed');
      } catch (e) {
        logger.error('🏠 HomeTab: Error loading stats:', e);
      }
    })();
  }, []);

  // Recompute when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('🏠 HomeTab: Screen gained focus, recomputing saved places');
      recomputeSavedPlaces();
    }, [recomputeSavedPlaces])
  );

  // Realtime subscription to trip_places changes for any trip the user is involved in
  React.useEffect(() => {
    let channel: any;
    (async () => {
      try {
        logger.debug('🏠 HomeTab: Setting up realtime subscription for trip_places changes');
        channel = supabase
          .channel('home-saved-places')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'trip_places' },
            (payload) => {
              logger.debug(
                '🏠 HomeTab: Realtime change detected in trip_places:',
                payload.eventType
              );
              // Lightweight debounce if many rapid changes (timeout 120ms)
              if ((channel as any)._pending) {
                logger.debug('🏠 HomeTab: Debouncing rapid changes...');
                return;
              }
              (channel as any)._pending = true;
              setTimeout(() => {
                (channel as any)._pending = false;
                logger.debug('🏠 HomeTab: Triggering recomputeSavedPlaces after realtime change');
                recomputeSavedPlaces();
              }, 120);
            }
          )
          .subscribe();
      } catch (e) {
        logger.error('🏠 HomeTab: Realtime subscription error (trip_places):', e);
      }
    })();
    return () => {
      try {
        if (channel) {
          logger.debug('🏠 HomeTab: Cleaning up realtime subscription');
          supabase.removeChannel(channel);
        }
      } catch (e) {
        logger.error('🏠 HomeTab: Error cleaning up subscription:', e);
      }
    };
  }, [recomputeSavedPlaces]);

  // Realtime subscription to trips changes to update upcoming trips count
  React.useEffect(() => {
    let tripsChannel: any;
    let collaboratorsChannel: any;
    let userId: string | undefined;
    let debounceTimeout: NodeJS.Timeout | null = null;

    (async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        userId = user?.user?.id;
        if (!userId) return;

        logger.debug('🏠 HomeTab: Setting up realtime subscription for trips changes');

        const debouncedRefresh = async () => {
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }
          debounceTimeout = setTimeout(async () => {
            logger.debug('🏠 HomeTab: Executing debounced trips refresh after 2 seconds');
            try {
              // RTK Query refetch - respects cache and auto-updates derived state
              await refetchTrips();
              logger.debug('🏠 HomeTab: Trips data refreshed via RTK Query');
            } catch (error) {
              logger.error('🏠 HomeTab: Error updating trips:', error);
            }
            debounceTimeout = null;
          }, 2000); // 2 second debounce to prevent excessive refreshes
        };

        // Listen to trips table changes
        tripsChannel = supabase
          .channel(`home-trips-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'trips',
              filter: `owner_id=eq.${userId}`,
            },
            (payload) => {
              logger.debug('🏠 HomeTab: Trip creation detected');
              debouncedRefresh();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'trips',
              filter: `owner_id=eq.${userId}`,
            },
            (payload) => {
              logger.debug('🏠 HomeTab: Trip update detected');
              debouncedRefresh();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'trips',
              filter: `owner_id=eq.${userId}`,
            },
            (payload) => {
              logger.debug('🏠 HomeTab: Trip deletion detected');
              debouncedRefresh();
            }
          )
          .subscribe();

        // Also listen to trip_collaborators changes (when user is added/removed from trips)
        collaboratorsChannel = supabase
          .channel(`home-collaborators-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trip_collaborators',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              logger.debug('🏠 HomeTab: Trip collaboration change detected');
              debouncedRefresh();
            }
          )
          .subscribe();
      } catch (e) {
        logger.error('🏠 HomeTab: Realtime subscription error (trips):', e);
      }
    })();

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      try {
        if (tripsChannel) {
          logger.debug('🏠 HomeTab: Cleaning up trips realtime subscription');
          supabase.removeChannel(tripsChannel);
        }
        if (collaboratorsChannel) {
          logger.debug('🏠 HomeTab: Cleaning up collaborators realtime subscription');
          supabase.removeChannel(collaboratorsChannel);
        }
      } catch (e) {
        logger.error('🏠 HomeTab: Error cleaning up trips subscriptions:', e);
      }
    };
  }, []);

  return (
    <TripRefreshProvider>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F7F7FA' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2', '#9B59B6']} // Android
            tintColor="#4A90E2" // iOS
            title="Actualizando..." // iOS
            titleColor="#666" // iOS
          />
        }
      >
        {/* Header con gradiente - Memoized LocationWidget */}
        <LocationWidget city={city} temp={temp} units={units} onToggleUnits={toggleUnits} />

        <View style={{ padding: 16, gap: 16 }}>
          {/* Cards de estadísticas - Memoized StatCards */}
          <StatCards savedPlacesCount={savedPlacesCount} upcomingTripsCount={upcomingTripsCount} />

          {/* Viaje Activo */}
          <CurrentTripCard />

          {/* Estado del Modo Travel - Memoized TravelModeCard */}
          <TravelModeCard
            travelModeEnabled={travelModeEnabled}
            onToggleTravelMode={toggleTravelMode}
            currentTrip={currentTrip}
          />

          {/* Alertas Cercanas */}
          <NearbyAlerts />

          {/* Lugares Populares Globalmente */}
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <View>
                <Text
                  style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}
                >
                  📈 Lugares Populares
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                  Globalmente
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>Siguiente:</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>4:52</Text>
                <TouchableOpacity style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 16, color: '#8B5CF6' }}>🔄 Actualizar</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3E8FF',
                borderRadius: 12,
                padding: 12,
              }}
              onPress={() =>
                Alert.alert(
                  'Santorini',
                  'Funcionalidad de lugares específicos próximamente disponible'
                )
              }
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  backgroundColor: '#FEF3C7',
                  marginRight: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>🌅</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginRight: 8 }}
                  >
                    Santorini Sunset Point
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: '#F59E0B', marginRight: 2 }}>⭐</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>4.9</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  📍 Santorini, Greece
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 16 }}>
                  One of the world's most photographed sunsets with breathtaking views over the
                  Aegean Sea...
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </TripRefreshProvider>
  );
}
