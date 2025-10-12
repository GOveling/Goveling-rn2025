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
  ActivityIndicator
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

export default function TripSelectorModal({
  visible,
  onClose,
  onTripSelected,
  placeName,
  placeId
}: TripSelectorModalProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTripModal, setShowNewTripModal] = useState(false);

  // Cargar trips del usuario cuando se abre el modal
  useEffect(() => {
    if (visible) {
      loadUserTrips();
    }
  }, [visible]);

  const loadUserTrips = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user?.id) {
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }

      // Obtener trips donde el usuario es owner
      const { data: userTrips, error } = await supabase
        .from('trips')
        .select('*')
        .eq('owner_id', user.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading trips:', error);
        Alert.alert('Error', 'No se pudieron cargar los viajes');
        return;
      }

      setTrips(userTrips || []);
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
      const newTrip = trips.find(t => t.id === tripId);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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
              {placeName && (
                <Text style={styles.headerSubtitle}>
                  Para añadir {placeName}
                </Text>
              )}
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
              }
            }
            : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  tripsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  newTripButton: {
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  newTripGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  newTripText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tripCardContent: {
    padding: 16,
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  tripDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  tripCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripDates: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDatesText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  bottomPadding: {
    height: 40,
  },
});