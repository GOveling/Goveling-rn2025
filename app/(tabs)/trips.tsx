import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '~/lib/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { getTripWithTeam, getTripWithTeamRPC } from '~/lib/teamHelpers';
import NewTripModal from '../../src/components/NewTripModal';
import TripCard from '../../src/components/TripCard';
import { useFocusEffect } from '@react-navigation/native';

export default function TripsTab() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { openModal } = useLocalSearchParams();

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

  // Check if we should open the modal automatically from query params
  useEffect(() => {
    if (openModal === 'true') {
      setShowNewTripModal(true);
      // Clear the parameter after opening modal to prevent reopening on re-renders
      router.replace('/trips');
    }
  }, [openModal]);

  // Load trip statistics and trips from database
  const loadTripStats = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;

      // Obtener tanto los trips propios como los trips donde es colaborador usando consultas más simples
      const { data: allRelevantTrips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .or(`owner_id.eq.${user.user.id},user_id.eq.${user.user.id}`) // fallback por si aún se usa user_id
        .neq('status', 'cancelled');

      if (tripsError) {
        console.error('Error loading trips:', tripsError);
        return;
      }

      console.log('🧪 TripsTab Debug: Raw trips for current user (owner_id/user_id match):',
        (allRelevantTrips || []).map(t => ({ id: t.id, title: t.title, owner_id: t.owner_id, user_id: t.user_id }))
      );

      // También buscar trips donde es colaborador (y no owner) para incluirlos
      const { data: collabTripIds, error: collabError } = await supabase
        .from('trip_collaborators')
        .select('trip_id')
        .eq('user_id', user.user.id);

      if (collabError) {
        console.error('Error loading collaborator trips:', collabError);
      }

      const collabSet = new Set((collabTripIds || []).map(c => c.trip_id));
  console.log('🧪 TripsTab Debug: collab trip ids for user:', Array.from(collabSet));

      // Unificar: trips directos + placeholders para collab-only (si alguno no estaba en la lista inicial)
      const baseTripsMap = new Map<string, any>();
      (allRelevantTrips || []).forEach(t => baseTripsMap.set(t.id, t));
      collabSet.forEach(id => {
        if (!baseTripsMap.has(id)) baseTripsMap.set(id, { id, owner_id: null });
      });
      console.log('🧪 TripsTab Debug: unifiedTrip IDs:', Array.from(baseTripsMap.keys()));
      const unifiedTrips = Array.from(baseTripsMap.values());

      // Obtener team data para cada trip (owner, collaborators, count) en paralelo
      const useRPC = true; // toggle to false if RPC not deployed yet
      const tripsWithTeam = await Promise.all(unifiedTrips.map(async (t) => {
        const team = useRPC ? await getTripWithTeamRPC(t.id) : await getTripWithTeam(t.id);
        if (!team.trip) {
          console.warn('🧪 TripsTab Debug: team.trip is null for id', t.id, 'team data:', team);
        }
        return {
          ...t,
            // Campos para compatibilidad con componentes actuales
          collaborators: team.collaborators.map(c => ({ user_id: c.id, role: c.role })),
          collaboratorsCount: team.collaboratorsCount,
          isOwner: (team.owner?.id && team.owner.id === user.user.id) || t.owner_id === user.user.id
        };
      }));

      console.log('🧪 TripsTab Debug: tripsWithTeam summary:', tripsWithTeam.map(t => ({ id: t.id, collaboratorsCount: t.collaboratorsCount, isOwner: t.isOwner })) );

      // Sort trips according to business logic:
      // 1. Trips with start_date: sort by closest start_date first
      // 2. Trips without start_date: sort by created_at (newest first)
      const sortedTrips = tripsWithTeam.sort((a, b) => {
        const aHasDate = a.start_date && a.start_date.trim() !== '';
        const bHasDate = b.start_date && b.start_date.trim() !== '';

        // Both have dates - sort by closest start_date (earliest first)
        if (aHasDate && bHasDate) {
          const aStartDate = new Date(a.start_date);
          const bStartDate = new Date(b.start_date);
          return aStartDate.getTime() - bStartDate.getTime();
        }

        // Only A has date - A comes first
        if (aHasDate && !bHasDate) {
          return -1;
        }

        // Only B has date - B comes first
        if (!aHasDate && bHasDate) {
          return 1;
        }

        // Neither has date - sort by created_at (newest first)
        const aCreatedDate = new Date(a.created_at || '1970-01-01');
        const bCreatedDate = new Date(b.created_at || '1970-01-01');
        return bCreatedDate.getTime() - aCreatedDate.getTime();
      });

      console.log('🧪 TripsTab: Sorted trips order:', sortedTrips.map(t => ({ 
        title: t.title, 
        start_date: t.start_date, 
        created_at: t.created_at 
      })));

      setTrips(sortedTrips);

      const totalTrips = sortedTrips.length || 0;

      // Get upcoming trips (future trips + planning trips without dates)
      // Exclude: completed trips and currently traveling trips
      console.log('🧪 TripsTab: Analyzing upcoming trips...');
      const upcomingTrips = sortedTrips?.filter(trip => {
        console.log(`🧪 Evaluating trip "${trip.title}":`, {
          start_date: trip.start_date,
          end_date: trip.end_date
        });

        // Planning trips (no dates set) - these count as upcoming
        if (!trip.start_date || !trip.end_date) {
          console.log(`  ✅ Planning trip (no dates): ${trip.title}`);
          return true;
        }

        const now = new Date();
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);

        // Future trips (start date is in the future) - these count as upcoming
        if (now < startDate) {
          console.log(`  ✅ Future trip: ${trip.title} starts in ${Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`);
          return true;
        }

        // Currently traveling (between start and end dates) - don't count
        if (now >= startDate && now <= endDate) {
          console.log(`  ❌ Currently traveling: ${trip.title}`);
          return false;
        }

        // Completed trips (end date is in the past) - don't count
        if (now > endDate) {
          console.log(`  ❌ Completed trip: ${trip.title} ended ${Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`);
          return false;
        }

        return false;
      }).length || 0;

      console.log('🧪 TripsTab: Upcoming trips count:', upcomingTrips);

      // Group trips: collaboratorsCount includes owner (+1 baked in team helper logic).
      // We consider group if total participants > 1.
      const groupTrips = sortedTrips?.filter(trip => {
        const count = trip.collaboratorsCount ?? (1 + (trip.collaborators?.length || 0));
        return count > 1;
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

  // Refrescar cada vez que la pestaña gana foco
  useFocusEffect(
    useCallback(() => {
      loadTripStats();
    }, [])
  );

  // Suscripción en tiempo real a cambios en trips y trip_collaborators para refrescar owner y colaboradores.
  useEffect(() => {
    let isActive = true;
    let channel: any;
    let pendingReload = false;
    const safeReload = () => {
      if (pendingReload) return;
      pendingReload = true;
      setTimeout(() => {
        if (!isActive) return;
        loadTripStats();
        pendingReload = false;
      }, 120);
    };

    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) return;

      channel = supabase
        .channel('trips-tab-realtime')
        // Cambios directos en trips (owner transfiere, etc.)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
          if (!isActive) return;
          const newOwnerId = (payload as any)?.new?.owner_id;
          const oldOwnerId = (payload as any)?.old?.owner_id;
            if (newOwnerId === userId || oldOwnerId === userId) {
              safeReload();
            }
        })
        // Cambios en colaboradores: refrescar si afecta al usuario directamente o a un trip que es suyo
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_collaborators' }, (payload) => {
          if (!isActive) return;
          const newUserId = (payload as any)?.new?.user_id;
          const oldUserId = (payload as any)?.old?.user_id;
          const tripId = (payload as any)?.new?.trip_id || (payload as any)?.old?.trip_id;
          if (newUserId === userId || oldUserId === userId) {
            safeReload();
            return;
          }
          if (tripId) {
            // Verificar si el trip afectado pertenece al usuario (owner) para reflejar nuevos contadores
            (async () => {
              try {
                const { data } = await supabase
                  .from('trips')
                  .select('owner_id')
                  .eq('id', tripId)
                  .maybeSingle();
                if (!isActive) return;
                if ((data as any)?.owner_id === userId) {
                  safeReload();
                }
              } catch {
                // noop
              }
            })();
          }
        })
        .subscribe();
    })();

    return () => {
      isActive = false;
      if (channel) supabase.removeChannel(channel);
    };
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
