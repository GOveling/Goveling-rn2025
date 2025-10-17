import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import CurrentTripCard from '~/components/home/CurrentTripCard';
import NearbyAlerts from '~/components/home/NearbyAlerts';
import {
  getCurrentPosition,
  reverseCity,
  getSavedPlaces,
  getActiveOrNextTrip,
  type Trip,
} from '~/lib/home';
import { registerDeviceToken } from '~/lib/push';
import { useSettingsStore } from '~/lib/settingsStore';
import { useTheme } from '~/lib/theme';
import { useTravel } from '~/lib/travelStore';
import { getWeather } from '~/lib/weather';

export const options = { headerShown: false };

export default function Home() {
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
  const [currentTrip, setCurrentTrip] = React.useState<Trip | null>(null);

  React.useEffect(() => {
    registerDeviceToken().catch(() => {});
    (async () => {
      const p = await getCurrentPosition();
      if (p) {
        setPos(p);
        // Don't set city here, let the weather API effect handle it
        console.log('🌍 Position obtained:', p.lat, p.lng);
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!pos) return;
      try {
        const w = await getWeather(pos.lat, pos.lng, units);
        if (w) {
          setTemp(w.temp);

          // Use location data from Weather API if available
          if (w.location && w.location.city) {
            console.log('🌍 Using weather API location:', w.location.city);
            setCity(w.location.city);
          }
        }
      } catch (error) {
        console.error('🌡️ Weather/location error:', error);
      }
    })();
  }, [pos, units]);

  React.useEffect(() => {
    (async () => {
      try {
        const savedPlaces = await getSavedPlaces();
        setSavedPlacesCount(savedPlaces.length);

        const trip = await getActiveOrNextTrip();
        setCurrentTrip(trip);

        // For now, assume 1 upcoming trip if there's an active/next trip
        setUpcomingTripsCount(trip ? 1 : 0);
      } catch (e) {
        console.log('Error loading stats:', e);
      }
    })();
  }, []);

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
            borderBottomRightRadius: 0,
          }}
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>📍 {city}</Text>
                <Text style={{ fontSize: 16, color: 'white', marginLeft: 8 }}>
                  • {new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={toggleUnits}
                style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}
              >
                <Text style={{ fontSize: 16, color: 'white', marginRight: 4 }}>🌡️</Text>
                <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>
                  {typeof temp === 'number' ? temp.toFixed(1).replace('.', ',') : '—'}°
                  {units === 'c' ? 'C' : 'F'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => console.log('Inbox feature coming soon')}
                style={{ position: 'relative' }}
              >
                <Text style={{ fontSize: 24 }}>🔔</Text>
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    backgroundColor: '#FF4444',
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>7</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 16 }}>
          {/* Cards de estadísticas */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/explore')}>
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

            <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/trips')}>
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

          {/* Viaje Activo */}
          <CurrentTripCard />

          {/* Estado del Modo Travel */}
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
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
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                Estado del Modo Travel
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: !travelModeEnabled ? '#E5E7EB' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: !travelModeEnabled ? '#6B7280' : '#9CA3AF',
                      fontWeight: !travelModeEnabled ? '600' : '400',
                    }}
                  >
                    Inactivo
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: travelModeEnabled ? '#D1FAE5' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: travelModeEnabled ? '#059669' : '#9CA3AF',
                      fontWeight: travelModeEnabled ? '600' : '400',
                    }}
                  >
                    Viajando
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={() => setTravelModeEnabled(!travelModeEnabled)}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 12,
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
                marginBottom: 12,
              }}
              onPress={() => currentTrip && router.push(`/trips/${currentTrip.id}`)}
            >
              <Text style={{ color: '#374151', fontSize: 16, fontWeight: '500' }}>
                Ver Detalles
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => currentTrip && router.push(`/trips/${currentTrip.id}/route`)}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
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
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
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
              onPress={() => console.log('Place detail coming soon')}
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
    </>
  );
}
