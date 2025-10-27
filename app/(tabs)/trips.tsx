/* eslint-disable react-native/no-color-literals */
import React, { useState, useEffect, useCallback } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useFocusEffect } from '@react-navigation/native';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';

import type { Trip } from '~/lib/home';
import { supabase } from '~/lib/supabase';
import { getTripWithTeam, getTripWithTeamRPC } from '~/lib/teamHelpers';
import { logger } from '~/utils/logger';

import NewTripModal from '../../src/components/NewTripModal';
import SavedPlacesMapModal from '../../src/components/SavedPlacesMapModal';
import TripCard from '../../src/components/TripCard';
import { useGetTripsBreakdownQuery } from '../../src/store/api/tripsApi';

// Minimal shape for items rendered by Trips tab
interface TripsListItem {
  id: string;
  title: string;
  // Required by TripCard
  user_id: string;
  created_at: string;
  owner_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  collaborators?: Array<{ user_id: string; role?: string }>;
  collaboratorsCount?: number;
}

export default function TripsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { openModal } = useLocalSearchParams();

  // RTK Query: Get cached trips breakdown (shared with HomeTab)
  const { data: breakdown, refetch: refetchTrips } = useGetTripsBreakdownQuery();

  // Estados
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [trips, setTrips] = useState<TripsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    groupTrips: 0,
  });

  // Update stats when breakdown data changes
  useEffect(() => {
    if (breakdown?.counts) {
      setStats((prev) => {
        const newStats = {
          ...prev,
          totalTrips: breakdown.counts.total || 0,
          upcomingTrips: breakdown.counts.upcoming || 0,
          // DON'T overwrite groupTrips here - it's calculated in loadTripStats
          // groupTrips is NOT available in breakdown.counts, only calculated locally
        };
        logger.debug('🧪 TripsTab: useEffect updating stats from breakdown -', {
          breakdownCounts: breakdown.counts,
          previous: prev,
          new: newStats,
        });
        return newStats;
      });
    }
  }, [breakdown]);

  // Check if we should open the modal automatically from query params
  useEffect(() => {
    if (openModal === 'true') {
      setShowNewTripModal(true);
      // Clear the parameter after opening modal to prevent reopening on re-renders
      router.replace('/trips');
    }
  }, [openModal, router]);

  // Load trip statistics and trips from database
  const loadTripStats = useCallback(async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;

      logger.debug('🧪 TripsTab: Current user ID:', user.user.id);

      // Use RTK Query breakdown as base (leverages cache from HomeTab)
      const baseTrips: Trip[] = breakdown?.all || [];
      logger.debug('🧪 TripsTab: Using RTK Query cache, base trips count:', baseTrips.length);
      baseTrips.forEach((trip) => {
        logger.debug(`  - Base trip: "${trip.name}" (${trip.id})`);
      });

      // Also check for collaborator trips not in breakdown
      const { data: collabTripIds, error: collabError } = await supabase
        .from('trip_collaborators')
        .select('trip_id')
        .eq('user_id', user.user.id);

      if (collabError) {
        logger.error('Error loading collaborator trips:', collabError);
      }

      const collabSet = new Set((collabTripIds || []).map((c) => c.trip_id));
      logger.debug('🧪 TripsTab Debug: collab trip ids for user:', Array.from(collabSet));

      // Combine base trips with any missing collab trips
      const baseTripsMap = new Map<string, TripsListItem>();
      baseTrips.forEach((t) => {
        // Map Trip from breakdown (has minimal fields) into item for TripsTab
        const mapped: TripsListItem = {
          id: t.id,
          title: t.name ?? '',
          start_date: t.start_date ?? null,
          end_date: t.end_date ?? null,
          // Fallbacks for required TripCard props when not available in breakdown
          user_id: '',
          created_at: new Date(0).toISOString(),
        };
        baseTripsMap.set(t.id, mapped);
      });

      // For collab-only trips not in breakdown, fetch their data from DB
      const collabOnlyIds = Array.from(collabSet).filter((id) => !baseTripsMap.has(id));
      if (collabOnlyIds.length > 0) {
        const { data: collabOnlyTrips, error: collabTripsError } = await supabase
          .from('trips')
          .select('id, title, owner_id, user_id, start_date, end_date, created_at, status')
          .in('id', collabOnlyIds)
          .neq('status', 'cancelled');

        if (collabTripsError) {
          logger.error('Error loading collab-only trips:', collabTripsError);
        } else if (collabOnlyTrips) {
          collabOnlyTrips.forEach((trip) => {
            baseTripsMap.set(trip.id, {
              id: trip.id,
              title: trip.title ?? '',
              owner_id: trip.owner_id ?? null,
              user_id: trip.user_id ?? '',
              start_date: trip.start_date ?? null,
              end_date: trip.end_date ?? null,
              created_at: trip.created_at ?? new Date(0).toISOString(),
              status: trip.status ?? null,
            });
          });
        }
      }

      logger.debug('🧪 TripsTab Debug: unifiedTrip IDs:', Array.from(baseTripsMap.keys()));
      const unifiedTrips: TripsListItem[] = Array.from(baseTripsMap.values());

      // Obtener team data para cada trip (owner, colaboradores, count) en paralelo.
      // Intentar RPC (tipado, rápido); si falla por cualquier motivo, hacer fallback al método estándar.
      const tripsWithTeam = await Promise.all(
        unifiedTrips.map(async (t) => {
          let team;
          try {
            team = await getTripWithTeamRPC(t.id);
          } catch (e) {
            logger.warn('getTripWithTeamRPC failed for', t.id, e);
            team = await getTripWithTeam(t.id);
          }
          if (!team.trip) {
            logger.warn('🧪 TripsTab Debug: team.trip is null for id', t.id, 'team data:', team);
          }
          return {
            ...t,
            // Ensure TripCard critical fields are present/consistent
            owner_id: team.owner?.id ?? t.owner_id ?? null,
            user_id: team.owner?.id ?? t.user_id,
            // Campos para compatibilidad con componentes actuales
            collaborators: team.collaborators.map((c) => ({ user_id: c.id, role: c.role })),
            collaboratorsCount: team.collaboratorsCount,
            isOwner:
              (team.owner?.id && team.owner.id === user.user.id) || t.owner_id === user.user.id,
          };
        })
      );

      logger.debug(
        '🧪 TripsTab Debug: tripsWithTeam summary:',
        tripsWithTeam.map((t) => ({
          id: t.id,
          collaboratorsCount: t.collaboratorsCount,
          isOwner: t.isOwner,
        }))
      );

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

      logger.debug(
        '🧪 TripsTab: Sorted trips order:',
        sortedTrips.map((t) => ({
          title: t.title,
          start_date: t.start_date,
          created_at: t.created_at,
        }))
      );

      logger.debug('🔍🔍🔍 CRITICAL: About to setTrips with length:', sortedTrips.length);
      setTrips(sortedTrips);
      logger.debug('🔍🔍🔍 CRITICAL: After setTrips called');

      // Get upcoming trips (future trips + planning trips without dates)
      // Exclude: completed trips and currently traveling trips
      logger.debug('🧪 TripsTab: Analyzing upcoming trips...');
      const upcomingTrips =
        sortedTrips?.filter((trip) => {
          logger.debug(`🧪 Evaluating trip "${trip.title}":`, {
            start_date: trip.start_date,
            end_date: trip.end_date,
          });

          // Planning trips (no dates set) - these count as upcoming
          if (!trip.start_date || !trip.end_date) {
            logger.debug(`  ✅ Planning trip (no dates): ${trip.title}`);
            return true;
          }

          const now = new Date();
          const startDate = new Date(trip.start_date);
          const endDate = new Date(trip.end_date);

          // Future trips (start date is in the future) - these count as upcoming
          if (now < startDate) {
            logger.debug(
              `  ✅ Future trip: ${trip.title} starts in ${Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`
            );
            return true;
          }

          // Currently traveling (between start and end dates) - don't count
          if (now >= startDate && now <= endDate) {
            logger.debug(`  ❌ Currently traveling: ${trip.title}`);
            return false;
          }

          // Completed trips (end date is in the past) - don't count
          if (now > endDate) {
            logger.debug(
              `  ❌ Completed trip: ${trip.title} ended ${Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`
            );
            return false;
          }

          return false;
        }).length || 0;

      logger.debug('🧪 TripsTab: Upcoming trips count:', upcomingTrips);

      // Group trips: collaboratorsCount already includes owner (+1 baked in team helper logic).
      // We consider group if total participants > 1.
      const groupTripsCount =
        sortedTrips?.filter((trip) => {
          // collaboratorsCount from RPC already includes owner, so just check > 1
          const count = trip.collaboratorsCount || 1; // fallback to 1 if somehow undefined
          logger.debug(
            `🧪 Trip "${trip.title}": collaboratorsCount=${trip.collaboratorsCount}, using count=${count}, isOwner=${trip.isOwner}`
          );
          const isGroup = count > 1;
          if (isGroup) {
            logger.debug(`  ✅ Group trip found: ${trip.title} with ${count} participants`);
          }
          return isGroup;
        }).length || 0;

      logger.debug('🧪 TripsTab: Stats calculated -', {
        total: sortedTrips.length,
        upcoming: upcomingTrips,
        group: groupTripsCount,
      });

      // Update stats with calculated group trips count
      setStats((prev) => {
        const newStats = {
          ...prev,
          groupTrips: groupTripsCount,
        };
        logger.debug('🧪 TripsTab: Updating stats -', {
          previous: prev,
          new: newStats,
          groupTripsCalculated: groupTripsCount,
        });
        return newStats;
      });
    } catch (error) {
      logger.error('Error loading trip stats:', error);
      // Keep default values if there's an error
    } finally {
      setLoading(false);
    }
  }, [breakdown]);

  const onRefresh = React.useCallback(async () => {
    logger.debug('🔄 TripsTab: Pull-to-refresh triggered');
    setRefreshing(true);

    try {
      // Refetch RTK Query cache first (shared with HomeTab)
      await refetchTrips();
      // Then reload trip stats with team data
      await loadTripStats();
      logger.debug('✅ TripsTab: Pull-to-refresh completed successfully');
    } catch (error) {
      logger.error('❌ TripsTab: Pull-to-refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTrips, loadTripStats]);

  // Solo cargar trips cuando breakdown esté disponible
  useEffect(() => {
    if (breakdown) {
      loadTripStats();
    }
  }, [breakdown, loadTripStats]);

  // Refrescar cada vez que la pestaña gana foco
  useFocusEffect(
    useCallback(() => {
      if (breakdown) {
        loadTripStats();
      }
    }, [breakdown, loadTripStats])
  );

  // Suscripción en tiempo real a cambios en trips y trip_collaborators para refrescar owner y colaboradores.
  useEffect(() => {
    let isActive = true;
    let channel: RealtimeChannel | null = null;
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
        // Cambios directos en trips - ahora incluye INSERT, UPDATE, DELETE
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trips' },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            if (!isActive) return;
            const newRow = (payload.new as { id?: string; owner_id?: string | null }) || null;
            const oldRow = (payload.old as { id?: string; owner_id?: string | null }) || null;
            const newOwnerId = newRow?.owner_id ?? null;
            const oldOwnerId = oldRow?.owner_id ?? null;
            const tripId = newRow?.id || oldRow?.id;
            logger.debug('🌀 TripsTab: Trip change detected:', payload.eventType, {
              newOwnerId,
              oldOwnerId,
              userId,
              tripId,
            });

            // For INSERT events, check if new trip belongs to current user
            if (payload.eventType === 'INSERT' && newOwnerId === userId) {
              logger.debug('🌀 TripsTab: New trip created by user, refreshing...');
              safeReload();
              return;
            }

            // For UPDATE/DELETE events, check if trip belonged to current user
            if (newOwnerId === userId || oldOwnerId === userId) {
              logger.debug('🌀 TripsTab: Trip modified/deleted for user, refreshing...');
              safeReload();
              return;
            }

            // También refrescar si el usuario es colaborador del trip al que se actualizó
            if (tripId) {
              (async () => {
                try {
                  const { data: collabRow, error: collabErr } = await supabase
                    .from('trip_collaborators')
                    .select('id')
                    .eq('trip_id', tripId)
                    .eq('user_id', userId)
                    .maybeSingle();
                  if (!isActive) return;
                  if (!collabErr && collabRow) {
                    logger.debug('🌀 TripsTab: Trip modified for collaborator, refreshing...');
                    safeReload();
                  }
                } catch {
                  // noop
                }
              })();
            }
          }
        )
        // Cambios en colaboradores: refrescar si afecta al usuario directamente o a un trip que es suyo
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trip_collaborators' },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            if (!isActive) return;
            const newRow = (payload.new as { trip_id?: string; user_id?: string }) || null;
            const oldRow = (payload.old as { trip_id?: string; user_id?: string }) || null;
            const newUserId = newRow?.user_id;
            const oldUserId = oldRow?.user_id;
            const tripId = newRow?.trip_id || oldRow?.trip_id;
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
                  if ((data as { owner_id: string | null } | null)?.owner_id === userId) {
                    safeReload();
                  }
                } catch {
                  // noop
                }
              })();
            }
          }
        )
        .subscribe();
    })();

    return () => {
      isActive = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadTripStats]);

  // DEBUG: Log render state
  console.log('🔍🔍🔍 TRIPSTAB RENDER:', {
    loading,
    'trips.length': trips.length,
    'trips[0]': trips[0],
    'breakdown?.all.length': breakdown?.all?.length,
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B5CF6', '#EC4899']} // Android - theme colors
            tintColor="#8B5CF6" // iOS
            title="Actualizando viajes..." // iOS
            titleColor="#666" // iOS
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('trips.title')}</Text>
          <Text style={styles.subtitle}>{t('trips.subtitle')}</Text>
        </View>

        {/* Vista de Mapa Button */}
        <TouchableOpacity onPress={() => setShowMapModal(true)} style={styles.mapButton}>
          <Text style={styles.mapButtonIcon}>🗺️</Text>
          <Text style={styles.mapButtonText}>Vista de Mapa</Text>
        </TouchableOpacity>

        {/* Nuevo Viaje Button */}
        <TouchableOpacity onPress={() => setShowNewTripModal(true)} style={styles.newTripContainer}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newTripGradient}
          >
            <Text style={styles.newTripText}>+ Nuevo Viaje</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValueBlue}>{stats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total de Viajes</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValueGreen}>{stats.upcomingTrips}</Text>
            <Text style={styles.statLabel}>Próximos</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValueOrange}>{stats.groupTrips}</Text>
            <Text style={styles.statLabel}>Viajes Grupales</Text>
          </View>
        </View>

        {/* Lista de Trips */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Cargando tus viajes...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>¡Aún no tienes viajes!</Text>
            <Text style={styles.emptyMessage}>
              Crea tu primer viaje y comienza a planificar tu aventura
            </Text>
            <TouchableOpacity
              onPress={() => setShowNewTripModal(true)}
              style={styles.emptyCreateButtonContainer}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyCreateButtonGradient}
              >
                <Text style={styles.emptyCreateButtonText}>+ Crear Mi Primer Viaje</Text>
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
                  setTrips((prevTrips) => prevTrips.filter((t) => t.id !== updatedTrip.id));
                } else {
                  // Actualizar el trip en el array local
                  setTrips((prevTrips) =>
                    prevTrips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t))
                  );
                }
                // Recargar estadísticas para reflejar cambios
                loadTripStats();
              }}
            />
          ))
        )}

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal de Nuevo Viaje */}
      <NewTripModal
        visible={showNewTripModal}
        onClose={() => setShowNewTripModal(false)}
        onTripCreated={(tripId) => {
          logger.debug('✅ Viaje creado con ID:', tripId);
          // Cerrar el modal
          setShowNewTripModal(false);
          // Recargar la lista de trips y estadísticas
          loadTripStats();
          // Mostrar mensaje de éxito
          Alert.alert('¡Éxito!', 'Tu viaje ha sido creado exitosamente');
        }}
      />

      {/* Modal de Vista de Mapa */}
      <SavedPlacesMapModal visible={showMapModal} onClose={() => setShowMapModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },

  // Map Button
  mapButton: {
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
    elevation: 3,
  },
  mapButtonIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  mapButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },

  // New Trip Button
  newTripContainer: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newTripGradient: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTripText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statValueBlue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#007AFF',
    marginBottom: 4,
  },
  statValueGreen: {
    fontSize: 32,
    fontWeight: '900',
    color: '#34C759',
    marginBottom: 4,
  },
  statValueOrange: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF9500',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },

  // Loading/Empty State
  centerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },

  // Empty Create Button
  emptyCreateButtonContainer: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyCreateButtonGradient: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCreateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  // Bottom Padding
  bottomPadding: {
    height: 100,
  },
});
