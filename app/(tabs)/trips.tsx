import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '~/lib/theme';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';
import NewTripModal from '../../src/components/NewTripModal';
import TripCard from '../../src/components/TripCard';

export default function TripsTab() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  // Estados
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats data - these would come from your database
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    groupTrips: 0
  });

  // Load trip statistics and trips from database
  const loadTripStats = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;

      // Get trips where user is owner (más simple y directo)
      const { data: userTrips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('owner_id', user.user.id)
        .neq('status', 'cancelled'); // Filtrar viajes eliminados

      if (tripsError) {
        console.error('Error loading trips:', tripsError);
        return;
      }



      // Get collaborators count for each trip separately
      const tripsWithCollaborators = await Promise.all(
        (userTrips || []).map(async (trip) => {
          const { data: collaborators, error: collabError } = await supabase
            .from('trip_collaborators')
            .select('user_id, role')
            .eq('trip_id', trip.id);

          if (collabError) {
            console.error('Error loading collaborators for trip:', trip.id, collabError);
            return { ...trip, collaborators: [] };
          }

          return { ...trip, collaborators: collaborators || [] };
        })
      );

      // Set trips with collaborators data
      setTrips(tripsWithCollaborators || []);

      // Calculate stats
      const totalTrips = tripsWithCollaborators?.length || 0;

      // Get upcoming trips (start date is in the future)
      const upcomingTrips = tripsWithCollaborators?.filter(trip => {
        if (!trip.start_date) return false;
        return new Date(trip.start_date) > new Date();
      }).length || 0;

      // Get group trips (trips with collaborators - more than just the owner)
      // Get group trips (trips with collaborators - more than just the owner)
      const groupTrips = tripsWithCollaborators?.filter(trip => {
        // Un viaje es grupal si tiene colaboradores (además del owner)
        const collaboratorsCount = trip.collaborators?.length || 0;
        return collaboratorsCount > 0;
      }).length || 0;

      setStats({
        totalTrips,
        upcomingTrips,
        groupTrips
      });
    } catch (error) {
      console.error('Error loading trip stats:', error);
      // Keep default values if there's an error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripStats();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: Platform.OS === 'ios' ? 60 : 20
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 32,
            fontWeight: '900',
            color: '#1A1A1A',
            marginBottom: 8
          }}>
            Mis Viajes
          </Text>
          <Text style={{
            fontSize: 16,
            color: '#666666',
            fontWeight: '500'
          }}>
            Planea y gestiona tus aventuras
          </Text>
        </View>

        {/* Vista de Mapa Button */}
        <TouchableOpacity
          onPress={() => Alert.alert('Mapa', 'Funcionalidad de mapa de trips próximamente disponible')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 2,
            borderColor: '#007AFF',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }}
        >
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#007AFF',
            marginRight: 8
          }}>
            🗺️
          </Text>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#007AFF'
          }}>
            Vista de Mapa
          </Text>
        </TouchableOpacity>

        {/* Nuevo Viaje Button */}
        <TouchableOpacity
          onPress={() => setShowNewTripModal(true)}
          style={{
            borderRadius: 16,
            padding: 18,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5
          }}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              padding: 18,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: 18
            }}>
              + Nuevo Viaje
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 12
        }}>
          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 32,
              fontWeight: '900',
              color: '#007AFF',
              marginBottom: 4
            }}>
              {stats.totalTrips}
            </Text>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#666666',
              textAlign: 'center'
            }}>
              Total de Viajes
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 32,
              fontWeight: '900',
              color: '#34C759',
              marginBottom: 4
            }}>
              {stats.upcomingTrips}
            </Text>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#666666',
              textAlign: 'center'
            }}>
              Próximos
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 32,
              fontWeight: '900',
              color: '#FF9500',
              marginBottom: 4
            }}>
              {stats.groupTrips}
            </Text>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#666666',
              textAlign: 'center'
            }}>
              Viajes Grupales
            </Text>
          </View>
        </View>

        {/* Lista de Trips */}
        {loading ? (
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={{
              fontSize: 16,
              color: '#666666',
              marginTop: 16,
              textAlign: 'center'
            }}>
              Cargando tus viajes...
            </Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>�️</Text>
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#1A1A1A',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              ¡Aún no tienes viajes!
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#666666',
              marginBottom: 24,
              textAlign: 'center'
            }}>
              Crea tu primer viaje y comienza a planificar tu aventura
            </Text>
            <TouchableOpacity
              onPress={() => setShowNewTripModal(true)}
              style={{
                borderRadius: 16,
                paddingHorizontal: 24,
                paddingVertical: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 3
              }}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 16
                }}>
                  + Crear Mi Primer Viaje
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onTripUpdated={(updatedTrip) => {
                // Si el viaje fue eliminado (status = 'cancelled'), removerlo de la lista
                if (updatedTrip.status === 'cancelled') {
                  setTrips(prevTrips => prevTrips.filter(t => t.id !== updatedTrip.id));
                } else {
                  // Actualizar el trip en el array local
                  setTrips(prevTrips =>
                    prevTrips.map(t => t.id === updatedTrip.id ? updatedTrip : t)
                  );
                }
                // Recargar estadísticas para reflejar cambios
                loadTripStats();
              }}
            />
          ))
        )}

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de Nuevo Viaje */}
      <NewTripModal
        visible={showNewTripModal}
        onClose={() => setShowNewTripModal(false)}
        onTripCreated={(tripId) => {
          console.log('✅ Viaje creado con ID:', tripId);
          // Cerrar el modal
          setShowNewTripModal(false);
          // Recargar la lista de trips y estadísticas
          loadTripStats();
          // Mostrar mensaje de éxito
          Alert.alert('¡Éxito!', 'Tu viaje ha sido creado exitosamente');
        }}
      />
    </View>
  );
}
