import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Skeleton } from '~/components/ui/Skeleton';
import { Trip, getActiveOrNextTrip, getPlanningTripsCount, getActiveTrips } from '~/lib/home';

const daysDiff = (a: Date, b: Date): number => Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

const CurrentTripCard = React.memo(function CurrentTripCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [trip, setTrip] = React.useState<Trip|null>(null);
  const [activeTrips, setActiveTrips] = React.useState<Trip[]>([]);
  const [selectedActiveTrip, setSelectedActiveTrip] = React.useState<Trip|null>(null);
  const [mode, setMode] = React.useState<'none'|'future'|'active'>('none');
  const [countdown, setCountdown] = React.useState<number|null>(null);
  const [planningTripsCount, setPlanningTripsCount] = React.useState<number>(0);

  React.useEffect(()=>{
    (async()=>{
      setLoading(true);
      
      // First check for active trips
      const activeTripsData = await getActiveTrips();
      setActiveTrips(activeTripsData);
      
      if (activeTripsData.length > 0) {
        // We have active trips, use the first one (oldest created)
        setSelectedActiveTrip(activeTripsData[0]);
        setTrip(activeTripsData[0]);
        setMode('active');
        setCountdown(null);
      } else {
        // No active trips, check for future trips
        const t = await getActiveOrNextTrip();
        setTrip(t);
        if (!t){ 
          setMode('none');
          // If no active/next trip, check for planning trips
          const planningCount = await getPlanningTripsCount();
          setPlanningTripsCount(planningCount);
        }
        else {
          const now = new Date();
          if (t.start_date && new Date(t.start_date) > now){ 
            setMode('future'); 
            setCountdown(daysDiff(new Date(t.start_date), now)); 
          }
          else { 
            setMode('active'); 
            setCountdown(null); 
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const showComingSoonAlert = (feature: string) => {
    Alert.alert('Próximamente', `${feature} estará disponible pronto`, [
      { text: 'Entendido', style: 'default' }
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
        style={{
          borderRadius: 20,
          padding: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 15,
          elevation: 10
        }}
      >
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: 'white',
              opacity: 0.9
            }}>
              ✈️ Viaje Activo
            </Text>
            {activeTrips.length > 1 && (
              <TouchableOpacity 
                onPress={() => {
                  const currentIndex = activeTrips.findIndex(trip => trip.id === selectedActiveTrip.id);
                  const nextIndex = (currentIndex + 1) % activeTrips.length;
                  setSelectedActiveTrip(activeTrips[nextIndex]);
                  setTrip(activeTrips[nextIndex]);
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                  {activeTrips.findIndex(trip => trip.id === selectedActiveTrip.id) + 1}/{activeTrips.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={{ 
            fontSize: 22, 
            fontWeight: '800', 
            color: 'white',
            marginBottom: 8
          }}>
            {selectedActiveTrip.name || 'Mi Viaje'}
          </Text>
          
          {selectedActiveTrip.start_date && selectedActiveTrip.end_date && (
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '500', 
              color: 'white',
              opacity: 0.9
            }}>
              📅 {formatDate(selectedActiveTrip.start_date)} - {formatDate(selectedActiveTrip.end_date)}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 12 }}>
          {/* Acceder a Modo Travel Button - Principal */}
          <TouchableOpacity
            onPress={() => showComingSoonAlert('El Modo Travel')}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginRight: 8 }}>
                🚀 Acceder a Modo Travel
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action Buttons Row */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push(`/trips/${selectedActiveTrip.id}`)}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.1)',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)'
              }}
            >
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                🔍 Ver Detalles del Viaje
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => showComingSoonAlert('El Itinerario')}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.1)',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)'
              }}
            >
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                📋 Ver Itinerario
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Multiple Trips Indicator */}
        {activeTrips.length > 1 && (
          <View style={{ 
            marginTop: 16, 
            paddingTop: 16, 
            borderTopWidth: 1, 
            borderTopColor: 'rgba(255,255,255,0.2)' 
          }}>
            <Text style={{ 
              color: 'white', 
              fontSize: 12, 
              opacity: 0.8, 
              textAlign: 'center' 
            }}>
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
    
    const title = `Próximo trip en ${countdown} días`;
    const tripName = trip?.name || 'Mi Viaje';

    return (
      <TouchableOpacity
        onPress={() => Alert.alert('Trip Details', 'Funcionalidad de detalles del trip próximamente disponible')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10B981', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: 'white', 
                marginBottom: 4 
              }}>
                {title}
              </Text>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '700', 
                color: 'white' 
              }}>
                {tripName}
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: 'white' 
              }}>
                📍 Test SA
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [trip, mode, countdown]);

  // Loading state
  if (loading) return (
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
      {planningTripsCount > 0 ? (
        // Has planning trips - encourage user to complete them
        <>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>
            ¡Completa tus viajes! 
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            Tienes {planningTripsCount} viaje{planningTripsCount > 1 ? 's' : ''} sin fecha. Agrega lugares y fechas para comenzar a planificar
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity 
              onPress={() => router.push('/trips')}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                  Completar Viajes
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/explore')}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                  Agregar Lugares
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/trips?openModal=true')}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                  + Nuevo Viaje
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        // No trips at all - encourage user to create first trip
        <>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>
            {t('No tienes viajes')}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            {t('Crea tu primer trip para comenzar')}
          </Text>
          <TouchableOpacity onPress={() => router.push('/trips?openModal=true')}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={{
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {t('+ New Trip')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});

export default CurrentTripCard;
