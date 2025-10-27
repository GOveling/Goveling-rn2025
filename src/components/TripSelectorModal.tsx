import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';

import { supabase } from '~/lib/supabase';

import NewTripModal from './NewTripModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Trip {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  owner_id: string;
  created_at: string;
}

interface TripSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onTripSelected: (tripId: string, tripTitle: string) => void;
  placeName?: string;
  placeId?: string;
}

// Helper function to parse date as local time instead of UTC
const parseLocalDate = (dateString: string): Date => {
  // If the date string is just YYYY-MM-DD, we want to treat it as local time, not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  return new Date(dateString);
};

export default function TripSelectorModal({
  visible,
  onClose,
  onTripSelected,
  placeName,
  placeId,
}: TripSelectorModalProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTripModal, setShowNewTripModal] = useState(false);

  // Cargar trips del usuario cuando se abre el modal
  useEffect(() => {
    console.log('🎯 TripSelectorModal useEffect triggered - visible:', visible);
    if (visible) {
      console.log('🚀 TripSelectorModal: Modal is visible, loading trips...');
      loadUserTrips();
    }
  }, [visible]);

  const loadUserTrips = async () => {
    console.log('🔥 TripSelectorModal: loadUserTrips STARTED');
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();

      console.log('🔥 TripSelectorModal: User auth check:', {
        hasUser: !!user?.user?.id,
        userId: user?.user?.id,
      });

      if (!user?.user?.id) {
        console.error('🔥 TripSelectorModal: No authenticated user found');
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }

      console.log('🔍 TripSelectorModal: Loading trips for user', user.user.id);

      // 1. Obtener trips donde el usuario es owner
      const { data: ownedTrips, error: ownedError } = await supabase
        .from('trips')
        .select('*')
        .eq('owner_id', user.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('Error loading owned trips:', ownedError);
      }

      // 2. Obtener IDs de trips donde el usuario es colaborador Editor
      console.log('🔍 TripSelectorModal: Querying trip_collaborators for user:', user.user.id);
      const { data: collaboratorData, error: collabError } = await supabase
        .from('trip_collaborators')
        .select('trip_id')
        .eq('user_id', user.user.id)
        .eq('role', 'editor');

      console.log('🔍 TripSelectorModal: Collaborator query result:', {
        data: collaboratorData,
        error: collabError,
        count: collaboratorData?.length || 0,
      });

      if (collabError) {
        console.error('Error loading collaborator data:', collabError);
      }

      let collaborativeTrips: Trip[] = [];

      // 3. Si hay viajes colaborativos, obtener los detalles de esos trips
      if (collaboratorData && collaboratorData.length > 0) {
        const tripIds = collaboratorData.map((c) => c.trip_id);
        console.log('🤝 Found collaborative trip IDs:', tripIds);

        const { data: collabTripsData, error: collabTripsError } = await supabase
          .from('trips')
          .select('*')
          .in('id', tripIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (collabTripsError) {
          console.error('Error loading collaborative trips details:', collabTripsError);
        } else {
          collaborativeTrips = collabTripsData || [];
          console.log(
            '🤝 Loaded collaborative trips:',
            collaborativeTrips.map((t) => ({ id: t.id, title: t.title }))
          );
        }
      }

      // 4. Combinar los viajes y filtrar duplicados
      const combinedTrips: Trip[] = [];

      // Agregar trips propios
      if (ownedTrips) {
        combinedTrips.push(...ownedTrips);
        console.log(
          '👑 Added owned trips:',
          ownedTrips.map((t) => ({ id: t.id, title: t.title }))
        );
      }

      // Agregar trips colaborativos (verificar duplicados)
      if (collaborativeTrips) {
        for (const trip of collaborativeTrips) {
          const isDuplicate = combinedTrips.some((existingTrip) => existingTrip.id === trip.id);
          if (!isDuplicate) {
            combinedTrips.push(trip);
            console.log('✅ Added collaborative trip:', trip.title);
          } else {
            console.log('⚠️ Skipping duplicate trip:', trip.title);
          }
        }
      }

      // 5. Ordenar por fecha de creación
      combinedTrips.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('🔍 TripSelectorModal Final Results:', {
        ownedCount: ownedTrips?.length || 0,
        collaborativeCount: collaborativeTrips?.length || 0,
        totalCount: combinedTrips.length,
        finalTrips: combinedTrips.map((t) => ({ id: t.id, title: t.title })),
      });

      setTrips(combinedTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleTripSelect = (trip: Trip) => {
    onTripSelected(trip.id, trip.title);
    onClose();
  };

  const handleNewTripCreated = (tripId: string) => {
    setShowNewTripModal(false);
    // Automaticamente seleccionar el viaje recién creado
    // Ya se añadió el lugar en el NewTripModal, así que solo necesitamos confirmar
    if (placeId && placeName) {
      // El lugar ya fue añadido automáticamente, solo llamamos onTripSelected
      setTimeout(() => {
        onTripSelected(tripId, 'Nuevo Viaje');
      }, 100);
    } else {
      // Flujo normal sin contexto de lugar
      loadUserTrips();
      const newTrip = trips.find((t) => t.id === tripId);
      if (newTrip) {
        handleTripSelect(newTrip);
      } else {
        const findAndSelectTrip = async () => {
          try {
            const { data: trip, error } = await supabase
              .from('trips')
              .select('*')
              .eq('id', tripId)
              .single();

            if (trip && !error) {
              onTripSelected(trip.id, trip.title);
              onClose();
            }
          } catch (error) {
            console.error('Error finding new trip:', error);
          }
        };
        findAndSelectTrip();
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return 'Fechas sin definir';
    if (!endDate) return `Desde ${formatDate(startDate)}`;
    if (!startDate) return `Hasta ${formatDate(endDate)}`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Seleccionar Viaje</Text>
              {placeName && <Text style={styles.headerSubtitle}>Para añadir {placeName}</Text>}
            </View>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Cargando viajes...</Text>
              </View>
            ) : (
              <ScrollView style={styles.tripsList} showsVerticalScrollIndicator={false}>
                {/* Botón para crear nuevo viaje */}
                <TouchableOpacity
                  style={styles.newTripButton}
                  onPress={() => setShowNewTripModal(true)}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.newTripGradient}
                  >
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                    <Text style={styles.newTripText}>Crear Nuevo Viaje</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Lista de viajes existentes */}
                {trips.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="airplane-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyStateTitle}>No tienes viajes creados</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Crea tu primer viaje para poder añadir lugares
                    </Text>
                  </View>
                ) : (
                  trips.map((trip) => (
                    <TouchableOpacity
                      key={trip.id}
                      style={styles.tripCard}
                      onPress={() => handleTripSelect(trip)}
                    >
                      <View style={styles.tripCardContent}>
                        <View style={styles.tripCardHeader}>
                          <Text style={styles.tripTitle}>{trip.title}</Text>
                          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </View>

                        {trip.description && (
                          <Text style={styles.tripDescription} numberOfLines={2}>
                            {trip.description}
                          </Text>
                        )}

                        <View style={styles.tripCardFooter}>
                          <View style={styles.tripDates}>
                            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                            <Text style={styles.tripDatesText}>
                              {getDateRange(trip.start_date, trip.end_date)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}

                {/* Espacio inferior */}
                <View style={styles.bottomPadding} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para crear nuevo viaje */}
      <NewTripModal
        visible={showNewTripModal}
        onClose={() => setShowNewTripModal(false)}
        onTripCreated={handleNewTripCreated}
        addPlaceContext={
          placeId && placeName
            ? {
                placeId,
                placeName,
                onPlaceAdded: () => {
                  console.log('Lugar añadido exitosamente al nuevo viaje');
                },
              }
            : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  bottomPadding: {
    height: 40,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  container: {
    backgroundColor: '#F8F9FA',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  emptyStateSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyStateTitle: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  headerTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 16,
  },
  newTripButton: {
    borderRadius: 16,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    marginBottom: 24,
    marginTop: 20,
    overflow: 'hidden',
  },
  newTripGradient: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  newTripText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
    elevation: 2,
    marginBottom: 12,
  },
  tripCardContent: {
    padding: 16,
  },
  tripCardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripDates: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  tripDatesText: {
    color: '#6B7280',
    fontSize: 13,
    marginLeft: 6,
  },
  tripDescription: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tripTitle: {
    color: '#1F2937',
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  tripsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
