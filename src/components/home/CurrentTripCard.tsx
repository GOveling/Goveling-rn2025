import React from 'react';

import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '~/components/ui/Skeleton';
import { useTripRefresh } from '~/contexts/TripRefreshContext';
import { Trip, getActiveOrNextTrip, getPlanningTripsCount, getActiveTrips } from '~/lib/home';
import { supabase } from '~/lib/supabase';
import { setGlobalTripRefresh } from '~/lib/tripRefresh';

const daysDiff = (a: Date, b: Date): number =>
  Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

// Helper function to parse date as local time instead of UTC
const parseLocalDate = (dateString: string): Date => {
  // If the date string is just YYYY-MM-DD, we want to treat it as local time, not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Parse as local time by appending local time zone
    const localDate = new Date(dateString + 'T00:00:00');
    console.log(
      '🕐 parseLocalDate: Converted',
      dateString,
      'to local midnight:',
      localDate.toLocaleString('es-CL')
    );
    return localDate;
  }
  // If it already has time/timezone info, use as is
  return new Date(dateString);
};

const getCountdownText = (startDate: string): string => {
  const now = new Date();
  const start = parseLocalDate(startDate);
  const diff = start.getTime() - now.getTime();

  // Log específico para debugging el problema de "19 horas"
  console.log('🕐 COUNTDOWN:', {
    raw_startDate: startDate,
    parsed_start_local: start.toLocaleString('es-CL'),
    current_time_local: now.toLocaleString('es-CL'),
    diff_hours: Math.floor(diff / (1000 * 60 * 60)),
  });

  if (diff <= 0) return '¡Ya comenzó!';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} día${days !== 1 ? 's' : ''} y ${hours} hora${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
  }
};

const CurrentTripCard = React.memo(function CurrentTripCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { registerRefreshFunction } = useTripRefresh();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [trip, setTrip] = React.useState<Trip | null>(null);
  const [activeTrips, setActiveTrips] = React.useState<Trip[]>([]);
  const [selectedActiveTrip, setSelectedActiveTrip] = React.useState<Trip | null>(null);
  const [mode, setMode] = React.useState<'none' | 'future' | 'active'>('none');
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [planningTripsCount, setPlanningTripsCount] = React.useState<number>(0);

  // Use ref to store stable function reference
  const loadTripDataRef = React.useRef<() => Promise<void>>(async () => {});

  // Create stable function using useRef
  loadTripDataRef.current = async () => {
    console.log('🔄 CurrentTripCard: Loading trip data...');
    setLoading(true);

    try {
      // First check for active trips
      const activeTripsData = await getActiveTrips();
      setActiveTrips(activeTripsData);

      if (activeTripsData.length > 0) {
        // We have active trips, use the first one (oldest created)
        setSelectedActiveTrip(activeTripsData[0]);
        setTrip(activeTripsData[0]);
        setMode('active');
        setCountdown(null);
        console.log('🔄 CurrentTripCard: Found active trip:', activeTripsData[0].name);
      } else {
        // No active trips, check for future trips
        const t = await getActiveOrNextTrip();
        setTrip(t);
        if (!t) {
          setMode('none');
          // If no active/next trip, check for planning trips
          const planningCount = await getPlanningTripsCount();
          setPlanningTripsCount(planningCount);
          console.log('🔄 CurrentTripCard: No trips found, planning count:', planningCount);
        } else {
          const now = new Date();
          console.log('🔄 CurrentTripCard: Found trip:', t.name, 'Start date:', t.start_date);
          if (t.start_date && parseLocalDate(t.start_date) > now) {
            setMode('future');
            setCountdown(daysDiff(parseLocalDate(t.start_date), now));
            console.log(
              '🔄 CurrentTripCard: Trip is future, countdown set to:',
              daysDiff(parseLocalDate(t.start_date), now)
            );
          } else {
            setMode('active');
            setCountdown(null);
            console.log('🔄 CurrentTripCard: Trip is active');
          }
        }
      }
      console.log('🔄 CurrentTripCard: Trip data loaded successfully');
    } catch (error) {
      console.error('🔄 CurrentTripCard: Error loading trip data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Stable wrapper function
  const loadTripData = React.useCallback(async () => {
    if (loadTripDataRef.current) {
      await loadTripDataRef.current();
    }
  }, []);

  // Initial load only
  React.useEffect(() => {
    console.log('🔄 CurrentTripCard: Initial load');
    loadTripData();
  }, [loadTripData]);

  // Register refresh function for external trigger (only once)
  React.useEffect(() => {
    registerRefreshFunction(loadTripData);
    setGlobalTripRefresh(loadTripData);
    console.log('🔄 CurrentTripCard: Refresh functions registered');
  }, [loadTripData, registerRefreshFunction]);

  // Simplified focus effect - only when explicitly navigating between tabs
  // Commented out for now to prevent excessive refreshes
  // useFocusEffect(
  //   React.useCallback(() => {
  //     const now = Date.now();
  //     if (now - lastFocusRefresh.current > 2000) {
  //       console.log('🏠 CurrentTripCard: Screen gained focus, refreshing trip data');
  //       lastFocusRefresh.current = now;
  //       loadTripData();
  //     }
  //   }, [loadTripData])
  // );

  // Update countdown every minute for future trips
  React.useEffect(() => {
    if (mode !== 'future' || !trip?.start_date) return;

    const interval = setInterval(() => {
      const now = new Date();
      const startDate = parseLocalDate(trip.start_date);

      if (startDate <= now) {
        // Trip has started, switch to active mode
        setMode('active');
        setCountdown(null);
        clearInterval(interval);
        // Reload trip data to get updated status
        loadTripData();
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [mode, trip?.start_date, loadTripData]);

  // Simplified real-time subscription with longer debounce
  React.useEffect(() => {
    let channel: any;
    let userId: string | undefined;
    let debounceTimeout: NodeJS.Timeout | null = null;

    (async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        userId = user?.user?.id;
        if (!userId) return;

        console.log('🔄 CurrentTripCard: Setting up simplified realtime subscription');

        const debouncedRefresh = () => {
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }
          debounceTimeout = setTimeout(() => {
            console.log('🔄 CurrentTripCard: Executing debounced refresh after 3 seconds');
            loadTripData();
            debounceTimeout = null;
          }, 3000); // 3 second debounce to prevent excessive refreshes
        };

        channel = supabase
          .channel(`current-trip-card-${userId}`)
          // Listen to trips table changes - both updates and deletes
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'trips',
              filter: `owner_id=eq.${userId}`,
            },
            (payload) => {
              console.log('🔄 CurrentTripCard: Trip update detected for user trips');
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
              console.log('🔄 CurrentTripCard: Trip deletion detected for user trips');
              debouncedRefresh();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'trips',
              filter: `owner_id=eq.${userId}`,
            },
            (payload) => {
              console.log('🔄 CurrentTripCard: Trip creation detected for user trips');
              debouncedRefresh();
            }
          )
          // Also listen to trip_collaborators changes (when user is added/removed from trips)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trip_collaborators',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log('🔄 CurrentTripCard: Trip collaboration change detected');
              debouncedRefresh();
            }
          )
          .subscribe();
      } catch (error) {
        console.error('🔄 CurrentTripCard: Error setting up realtime subscription:', error);
      }
    })();

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      if (channel) {
        console.log('🔄 CurrentTripCard: Cleaning up simplified subscription');
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty dependency array for stability

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const showComingSoonAlert = (feature: string) => {
    Alert.alert('Próximamente', `${feature} estará disponible pronto`, [
      { text: 'Entendido', style: 'default' },
    ]);
  };

  // Active Trip Component
  const ActiveTripComponent = React.useMemo(() => {
    if (!selectedActiveTrip) return null;

    return (
      <LinearGradient
        colors={['#10B981', '#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.activeTripGradient}
      >
        {/* Header */}
        <View style={styles.activeTripHeader}>
          <View style={styles.activeTripHeaderRow}>
            <Text style={styles.activeTripLabel}>✈️ Viaje Activo</Text>
            {activeTrips.length > 1 && (
              <TouchableOpacity
                onPress={() => {
                  const currentIndex = activeTrips.findIndex(
                    (trip) => trip.id === selectedActiveTrip.id
                  );
                  const nextIndex = (currentIndex + 1) % activeTrips.length;
                  setSelectedActiveTrip(activeTrips[nextIndex]);
                  setTrip(activeTrips[nextIndex]);
                }}
                style={styles.activeTripSwitchButton}
              >
                <Text style={styles.activeTripSwitchText}>
                  {activeTrips.findIndex((trip) => trip.id === selectedActiveTrip.id) + 1}/
                  {activeTrips.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.activeTripName}>{selectedActiveTrip.name || 'Mi Viaje'}</Text>

          {selectedActiveTrip.start_date && selectedActiveTrip.end_date && (
            <Text style={styles.activeTripDates}>
              📅 {formatDate(selectedActiveTrip.start_date)} -{' '}
              {formatDate(selectedActiveTrip.end_date)}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.activeTripActions}>
          {/* Acceder a Modo Travel Button - Principal */}
          <TouchableOpacity
            onPress={() => showComingSoonAlert('El Modo Travel')}
            style={styles.activeTripTravelButton}
          >
            <View style={styles.activeTripTravelButtonContent}>
              <Text style={styles.activeTripTravelButtonText}>🚀 Acceder a Modo Travel</Text>
            </View>
          </TouchableOpacity>

          {/* Action Buttons Row */}
          <View style={styles.activeTripButtonRow}>
            <TouchableOpacity
              onPress={() => router.push(`/trips/${selectedActiveTrip.id}`)}
              style={styles.activeTripSecondaryButton}
            >
              <Text style={styles.activeTripSecondaryButtonText}>🔍 Ver Detalles del Viaje</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => showComingSoonAlert('El Itinerario')}
              style={styles.activeTripSecondaryButton}
            >
              <Text style={styles.activeTripSecondaryButtonText}>📋 Ver Itinerario</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Multiple Trips Indicator */}
        {activeTrips.length > 1 && (
          <View style={styles.activeTripMultipleIndicator}>
            <Text style={styles.activeTripMultipleText}>
              Tienes {activeTrips.length} viajes activos • Toca para cambiar
            </Text>
          </View>
        )}
      </LinearGradient>
    );
  }, [selectedActiveTrip, activeTrips, router]);

  // Memoized content for future trips
  const memoizedContent = React.useMemo(() => {
    if (!trip || mode !== 'future') return null;

    const countdownText = getCountdownText(trip.start_date);
    const tripName = trip?.name || 'Mi Viaje';

    return (
      <TouchableOpacity
        onPress={() =>
          Alert.alert('Trip Details', 'Funcionalidad de detalles del trip próximamente disponible')
        }
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10B981', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.futureTripGradient}
        >
          <View style={styles.futureTripContent}>
            {/* Contenido del lado izquierdo */}
            <View style={styles.futureTripLeft}>
              <Text style={styles.futureTripLabel}>Tu próximo viaje comienza en:</Text>
              <Text style={styles.futureTripCountdown}>{countdownText}</Text>
              <Text style={styles.futureTripName}>{tripName}</Text>
            </View>

            {/* Botón del lado derecho */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/explore')}
              style={styles.futureTripButton}
            >
              <Text style={styles.futureTripButtonText}>➕ Agregar más lugares</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [trip, mode, router]);

  // Loading state
  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <Skeleton width="50%" height={18} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="40%" height={14} />
      </View>
    );

  // Active trip state - NEW PRIORITY
  if (mode === 'active' && selectedActiveTrip) {
    return ActiveTripComponent;
  }

  // Future trip state
  if (mode === 'future' && trip) {
    return memoizedContent;
  }

  // No trip state
  return (
    <View style={styles.noTripContainer}>
      {planningTripsCount > 0 ? (
        // Has planning trips - encourage user to complete them
        <>
          <Text style={styles.noTripTitle}>¡Completa tus viajes!</Text>
          <Text style={styles.noTripSubtitle}>
            Tienes {planningTripsCount} viaje{planningTripsCount > 1 ? 's' : ''} sin fecha. Agrega
            lugares y fechas para comenzar a planificar
          </Text>
          <View style={styles.noTripButtonRow}>
            <TouchableOpacity onPress={() => router.push('/trips')} style={styles.noTripButton}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.noTripButtonGradient}
              >
                <Text style={styles.noTripButtonText}>Completar Viajes</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/explore')}
              style={styles.noTripButton}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.noTripButtonGradient}
              >
                <Text style={styles.noTripButtonText}>Agregar Lugares</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/trips?openModal=true')}
              style={styles.noTripButton}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.noTripButtonGradient}
              >
                <Text style={styles.noTripButtonText}>{t('+ New Trip')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        // No trips at all - encourage user to create first trip
        <>
          <Text style={styles.noTripTitle}>{t('No tienes viajes')}</Text>
          <Text style={styles.noTripSubtitle}>{t('Crea tu primer viaje para comenzar')}</Text>
          <TouchableOpacity onPress={() => router.push('/trips?openModal=true')}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.noTripSingleButton}>
              <Text style={styles.noTripSingleButtonText}>{t('+ New Trip')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  // Active Trip Styles
  activeTripGradient: {
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  activeTripHeader: {
    marginBottom: 20,
  },
  activeTripHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeTripLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    opacity: 0.9,
  },
  activeTripSwitchButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeTripSwitchText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTripName: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
  },
  activeTripDates: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    opacity: 0.9,
  },
  activeTripActions: {
    gap: 12,
  },
  activeTripTravelButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeTripTravelButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTripTravelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  activeTripButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  activeTripSecondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  activeTripSecondaryButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTripMultipleIndicator: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  activeTripMultipleText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },

  // Future Trip Styles
  futureTripGradient: {
    borderRadius: 16,
    padding: 20,
    elevation: 8,
  },
  futureTripContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  futureTripLeft: {
    flex: 1,
    marginRight: 16,
  },
  futureTripLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    opacity: 0.9,
  },
  futureTripCountdown: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
  },
  futureTripName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  futureTripButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'flex-start',
  },
  futureTripButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  // Loading State
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },

  // No Trip State
  noTripContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  noTripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  noTripSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  noTripButtonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  noTripButton: {
    flex: 1,
  },
  noTripButtonGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  noTripButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  noTripSingleButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  noTripSingleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CurrentTripCard;
