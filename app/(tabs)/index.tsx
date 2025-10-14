import { useTranslation } from 'react-i18next';
export const options = { headerShown: false };
import { useTheme } from '~/lib/theme';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Localization from 'expo-localization';
import { getCurrentPosition, reverseCityCached, reverseGeocodeCoordinatesCached, getLocationFromCoordinatesCached, getSavedPlaces, getActiveOrNextTrip, getUpcomingTripsCount } from '~/lib/home';
import { supabase } from '~/lib/supabase';
import { getWeatherCached } from '~/lib/weather';
import { useSettingsStore } from '~/lib/settingsStore';
import { useTravel } from '~/lib/travelStore';
import CurrentTripCard from '~/components/home/CurrentTripCard';
import NearbyAlerts from '~/components/home/NearbyAlerts';
import { registerDeviceToken } from '~/lib/push';
import { useRouter } from 'expo-router';
import NotificationBell from '~/components/home/NotificationBell';

export default function HomeTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { units, setUnits } = useSettingsStore();
  const toggleUnits = () => setUnits(units === 'c' ? 'f' : 'c');
  const { enabled: travelModeEnabled, setEnabled: setTravelModeEnabled } = useTravel();

  const [city, setCity] = React.useState<string>('—');
  const [temp, setTemp] = React.useState<number | undefined>(undefined);
  const [pos, setPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [savedPlacesCount, setSavedPlacesCount] = React.useState<number>(0);
  const [upcomingTripsCount, setUpcomingTripsCount] = React.useState<number>(0);
  const [currentTrip, setCurrentTrip] = React.useState<any>(null);
  const recomputeSavedPlaces = React.useCallback(async () => {
    console.log('🏠 HomeTab: recomputeSavedPlaces called');
    try {
      const savedPlaces = await getSavedPlaces();
      console.log('🏠 HomeTab: getSavedPlaces returned', savedPlaces.length, 'places');
      setSavedPlacesCount(savedPlaces.length);
      console.log('🏠 HomeTab: savedPlacesCount state updated to', savedPlaces.length);
    } catch (e) {
      console.log('🏠 HomeTab: Error recomputing saved places:', e);
    }
  }, []);

  React.useEffect(() => {
    registerDeviceToken().catch(() => { });
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
        console.log('🏠 HomeTab: Initial data loading started');
        await recomputeSavedPlaces();

        const trip = await getActiveOrNextTrip();
        setCurrentTrip(trip);

        // Get the actual count of upcoming and planning trips
        const upcomingCount = await getUpcomingTripsCount();
        setUpcomingTripsCount(upcomingCount);
        console.log('🏠 HomeTab: Upcoming trips count set to:', upcomingCount);
        
        console.log('🏠 HomeTab: Initial data loading completed');
      } catch (e) {
        console.log('🏠 HomeTab: Error loading stats:', e);
      }
    })();
  }, []);

  // Recompute when screen gains focus
  useFocusEffect(React.useCallback(() => {
    console.log('🏠 HomeTab: Screen gained focus, recomputing saved places');
    recomputeSavedPlaces();
  }, [recomputeSavedPlaces]));

  // Realtime subscription to trip_places changes for any trip the user is involved in
  React.useEffect(() => {
    let channel: any;
    (async () => {
      try {
        console.log('🏠 HomeTab: Setting up realtime subscription for trip_places changes');
        channel = supabase
          .channel('home-saved-places')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_places' }, (payload) => {
            console.log('🏠 HomeTab: Realtime change detected in trip_places:', payload.eventType);
            // Lightweight debounce if many rapid changes (timeout 120ms)
            if ((channel as any)._pending) {
              console.log('🏠 HomeTab: Debouncing rapid changes...');
              return;
            }
            (channel as any)._pending = true;
            setTimeout(() => {
              (channel as any)._pending = false;
              console.log('🏠 HomeTab: Triggering recomputeSavedPlaces after realtime change');
              recomputeSavedPlaces();
            }, 120);
          })
          .subscribe();
      } catch (e) {
        console.log('🏠 HomeTab: Realtime subscription error (trip_places):', e);
      }
    })();
    return () => {
      try {
        if (channel) {
          console.log('🏠 HomeTab: Cleaning up realtime subscription');
          supabase.removeChannel(channel);
        }
      } catch (e) {
        console.log('🏠 HomeTab: Error cleaning up subscription:', e);
      }
    };
  }, [recomputeSavedPlaces]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{ flex: 1, backgroundColor: '#F7F7FA' }}>
        {/* Header con gradiente */}
        <LinearGradient
          colors={['#4A90E2', '#9B59B6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingTop: 50,
            paddingHorizontal: 20,
            paddingBottom: 20,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>📍 {city}</Text>
                <Text style={{ fontSize: 16, color: 'white', marginLeft: 8 }}>• {new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={toggleUnits} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <Text style={{ fontSize: 16, color: 'white', marginRight: 4 }}>🌡️</Text>
                <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>
                  {typeof temp === 'number' ? temp.toFixed(1).replace('.', ',') : '—'}°{units === 'c' ? 'C' : 'F'}
                </Text>
              </TouchableOpacity>

              <NotificationBell iconColor="#fff" />
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 16 }}>
          {/* Cards de estadísticas */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 120
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

            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push('/(tabs)/trips')}
            >
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 120
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

          {/* Viaje Activo */}
          <CurrentTripCard />

          {/* Estado del Modo Travel */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                Estado del Modo Travel
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: !travelModeEnabled ? '#E5E7EB' : 'transparent'
                }}>
                  <Text style={{
                    fontSize: 12,
                    color: !travelModeEnabled ? '#6B7280' : '#9CA3AF',
                    fontWeight: !travelModeEnabled ? '600' : '400'
                  }}>
                    Inactivo
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: travelModeEnabled ? '#D1FAE5' : 'transparent'
                }}>
                  <Text style={{
                    fontSize: 12,
                    color: travelModeEnabled ? '#059669' : '#9CA3AF',
                    fontWeight: travelModeEnabled ? '600' : '400'
                  }}>
                    Viajando
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setTravelModeEnabled(!travelModeEnabled)}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 12
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  ✈️ Acceder al Modo Travel
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                marginBottom: 12
              }}
              onPress={() => currentTrip && Alert.alert('Trip Details', 'Funcionalidad de detalles del trip próximamente disponible')}
            >
              <Text style={{ color: '#374151', fontSize: 16, fontWeight: '500' }}>
                Ver Detalles
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => currentTrip && Alert.alert('Route', 'Funcionalidad de rutas próximamente disponible')}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Ver Detalles de Ruta IA
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Alertas Cercanas */}
          <NearbyAlerts />

          {/* Lugares Populares Globalmente */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>
                  📈 Lugares Populares
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                  Globalmente
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
                  Siguiente:
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  4:52
                </Text>
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
                padding: 12
              }}
              onPress={() => Alert.alert('Santorini', 'Funcionalidad de lugares específicos próximamente disponible')}
            >
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                backgroundColor: '#FEF3C7',
                marginRight: 12,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={{ fontSize: 24 }}>🌅</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginRight: 8 }}>
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
                  One of the world's most photographed sunsets with breathtaking views over the Aegean Sea...
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
