import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  InteractionManager,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '~/constants/colors';
import { EnhancedPlace } from '~/lib/placesSearch';
import { supabase } from '~/lib/supabase';
import { resolveCurrentUserRoleForTripId } from '~/lib/userUtils';

import NewTripModal from './NewTripModal';

interface AddToTripModalProps {
  visible: boolean;
  onClose: () => void;
  place: EnhancedPlace;
  onAdded?: (tripId: string, tripTitle: string) => void;
}

interface Trip {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

// Helper function to parse date as local time instead of UTC
const parseLocalDate = (dateString: string): Date => {
  // If the date string is just YYYY-MM-DD, we want to treat it as local time, not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  return new Date(dateString);
};

const AddToTripModal: React.FC<AddToTripModalProps> = ({ visible, onClose, place, onAdded }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    console.log('🎯 AddToTripModal useEffect triggered - visible:', visible);
    if (visible) {
      console.log('🚀 AddToTripModal: Modal is visible, loading trips...');
      loadTrips();
    }
  }, [visible]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;

      console.log('🔍 AddToTripModal: Loading trips for user', user.user.id);

      // 1. Obtener trips donde el usuario es owner
      const { data: ownedTrips, error: ownedError } = await supabase
        .from('trips')
        .select('id, title, description, start_date, end_date, owner_id, created_at')
        .eq('owner_id', user.user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('Error loading owned trips:', ownedError);
      }

      // 2. Obtener IDs de trips donde el usuario es colaborador Editor
      console.log('🔍 AddToTripModal: Querying trip_collaborators for user:', user.user.id);
      const { data: collaboratorData, error: collabError } = await supabase
        .from('trip_collaborators')
        .select('trip_id')
        .eq('user_id', user.user.id)
        .eq('role', 'editor');

      console.log('🔍 AddToTripModal: Collaborator query result:', {
        data: collaboratorData,
        error: collabError,
        count: collaboratorData?.length || 0,
      });

      if (collabError) {
        console.error('Error loading collaborator data:', collabError);
      }

      let collaborativeTrips: any[] = [];

      // 3. Si hay viajes colaborativos, obtener los detalles de esos trips
      if (collaboratorData && collaboratorData.length > 0) {
        const tripIds = collaboratorData.map((c) => c.trip_id);
        console.log('🤝 Found collaborative trip IDs:', tripIds);

        const { data: collabTripsData, error: collabTripsError } = await supabase
          .from('trips')
          .select('id, title, description, start_date, end_date, owner_id, created_at')
          .in('id', tripIds)
          .neq('status', 'cancelled')
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
      const combinedTrips: any[] = [];

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

      // 5. Sort trips: completed at end, active by date or creation
      combinedTrips.sort((a, b) => {
        // Helper to check if trip is completed
        const isCompleted = (trip: Trip) => {
          if (!trip.start_date || !trip.end_date) return false;
          const now = new Date();
          const endDate = new Date(trip.end_date);
          return now > endDate;
        };

        const aCompleted = isCompleted(a);
        const bCompleted = isCompleted(b);

        // Non-completed trips come first
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;

        // Both completed - newer completed first
        if (aCompleted && bCompleted) {
          const aEndDate = new Date(a.end_date || '1970-01-01');
          const bEndDate = new Date(b.end_date || '1970-01-01');
          return bEndDate.getTime() - aEndDate.getTime();
        }

        // Both active - sort by start_date or created_at
        const aHasDate = a.start_date && a.start_date.trim() !== '';
        const bHasDate = b.start_date && b.start_date.trim() !== '';

        if (aHasDate && bHasDate) {
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        }
        if (aHasDate && !bHasDate) return -1;
        if (!aHasDate && bHasDate) return 1;

        // Neither has date - newest first by created_at
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log('🔍 AddToTripModal Final Results:', {
        ownedCount: ownedTrips?.length || 0,
        collaborativeCount: collaborativeTrips?.length || 0,
        totalCount: combinedTrips.length,
        finalTrips: combinedTrips.map((t) => ({ id: t.id, title: t.title })),
      });

      setTrips(combinedTrips);
    } catch (e) {
      console.error('Error loading trips', e);
    } finally {
      setLoading(false);
    }
  };

  const addPlaceToTrip = async (tripId: string, tripTitle: string) => {
    try {
      setAdding(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }

      // Permisos: solo propietario o editor pueden agregar lugares
      const role = await resolveCurrentUserRoleForTripId(tripId);
      if (!(role === 'owner' || role === 'editor')) {
        Alert.alert(
          'Sin permisos',
          'No tienes permisos para agregar lugares a este viaje. Solo el propietario y editores pueden agregar.'
        );
        return;
      }

      // Evitar duplicados
      const { data: existing } = await supabase
        .from('trip_places')
        .select('id')
        .eq('trip_id', tripId)
        .eq('place_id', place.id)
        .maybeSingle();

      if (existing) {
        Alert.alert(
          'Ya agregado',
          `${place.name} ya está en "${tripTitle}"`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Cerrar después de que el usuario cierre la alerta
                setTimeout(() => {
                  onAdded?.(tripId, tripTitle);
                  onClose();
                }, 50);
              },
            },
          ],
          { cancelable: true }
        );
        return;
      }

      // Convert price level string to integer (0-4)
      const convertPriceLevel = (priceLevel: string | number | null | undefined): number | null => {
        if (!priceLevel) return null;
        if (typeof priceLevel === 'number') return priceLevel;

        const priceLevelMap: { [key: string]: number } = {
          PRICE_LEVEL_FREE: 0,
          PRICE_LEVEL_INEXPENSIVE: 1,
          PRICE_LEVEL_MODERATE: 2,
          PRICE_LEVEL_EXPENSIVE: 3,
          PRICE_LEVEL_VERY_EXPENSIVE: 4,
        };

        return priceLevelMap[priceLevel] ?? null;
      };

      // Prepare place data for insertion
      const placeData = {
        trip_id: tripId,
        place_id: place.id,
        name: place.name,
        address: place.address || '',
        lat: place.coordinates?.lat || 0,
        lng: place.coordinates?.lng || 0,
        category: place.types?.[0] || place.category || 'establishment',
        photo_url: place.photos && place.photos.length > 0 ? place.photos[0] : null,
        added_by: user.user.id,
        added_at: new Date().toISOString(),
        // Google Places API fields
        google_rating: place.rating || null,
        reviews_count: place.reviews_count || null,
        price_level: convertPriceLevel(place.priceLevel),
        editorial_summary: place.description || null,
        opening_hours: place.openingHours ? { weekdayDescriptions: place.openingHours } : null,
        website: place.website || null,
        phone: place.phone || null,
      };

      // Use notification function to add place with notifications to collaborators
      const { addPlaceToTripWithNotification } = await import('~/lib/placesNotifications');
      const { error } = await addPlaceToTripWithNotification(tripId, placeData, user.user.id);

      if (error) {
        console.error('Insert error', error);
        Alert.alert('Error', 'No se pudo agregar el lugar al viaje');
        return;
      }

      Alert.alert(
        '¡Listo!',
        `${place.name} agregado a "${tripTitle}"`,
        [
          {
            text: 'OK',
            onPress: () => {
              InteractionManager.runAfterInteractions(() => {
                setTimeout(() => {
                  onAdded?.(tripId, tripTitle);
                  onClose();
                }, 30);
              });
            },
          },
        ],
        { cancelable: true }
      );
    } catch (e) {
      console.error('Add place error', e);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setAdding(false);
    }
  };

  const handleCreateTrip = (newTripId: string) => {
    // Cerrar primero el modal de creación
    setShowNewTripModal(false);
    const created = trips.find((t) => t.id === newTripId);
    const title = created?.title || 'Nuevo viaje';
    // Pequeño delay para asegurar desmontaje del modal antes de continuar
    setTimeout(() => {
      addPlaceToTrip(newTripId, title);
    }, 120);
  };

  const formatDate = (d?: string) => {
    if (!d) return '';
    const date = parseLocalDate(d);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <Modal
        visible={visible && !showNewTripModal}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'overFullScreen'}
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Añadir a un viaje</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Place summary */}
            <View style={styles.placeRow}>
              <Ionicons name="location" size={18} color={COLORS.text.tertiary} />
              <Text style={styles.placeText}>{place.name || 'Lugar'}</Text>
            </View>

            {/* Create new */}
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowNewTripModal(true)}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newBtnBg}
              >
                <Ionicons name="add" size={20} color={COLORS.utility.white} />
                <Text style={styles.newBtnText}>Crear nuevo viaje</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Trips list */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tus viajes</Text>
            </View>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.loadingText}>Cargando...</Text>
              </View>
            ) : trips.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="airplane-outline" size={40} color={COLORS.text.lightGray} />
                <Text style={styles.emptyText}>Aún no tienes viajes</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {trips.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.tripItem}
                    disabled={adding}
                    onPress={() => addPlaceToTrip(t.id, t.title)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripTitle}>{t.title}</Text>
                      {t.start_date || t.end_date ? (
                        <Text style={styles.tripDates}>
                          {t.start_date && t.end_date
                            ? `${formatDate(t.start_date)} - ${formatDate(t.end_date)}`
                            : t.start_date
                              ? `Desde ${formatDate(t.start_date)}`
                              : `Hasta ${formatDate(t.end_date!)}`}
                        </Text>
                      ) : null}
                      {!!(t.description && t.description.trim().length > 0) && (
                        <Text numberOfLines={2} style={styles.tripDesc}>
                          {t.description}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.text.lightGray} />
                  </TouchableOpacity>
                ))}
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* New Trip Modal stacked above */}
      <NewTripModal
        visible={showNewTripModal}
        onClose={() => setShowNewTripModal(false)}
        onTripCreated={handleCreateTrip}
        addPlaceContext={{
          placeId: place.id,
          placeName: place.name,
          address: place.address || '',
          lat: place.coordinates?.lat || 0,
          lng: place.coordinates?.lng || 0,
          category: place.types?.[0] || place.category || 'establishment',
          photoUrl: place.photos && place.photos.length > 0 ? place.photos[0] : null,
          rating: place.rating || null,
          reviewsCount: place.reviews_count || null,
          priceLevel: place.priceLevel || null,
          editorialSummary: place.description || null,
          openingHours: place.openingHours || null,
          website: place.website || null,
          phone: place.phone || null,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: COLORS.background.blackOpacity.medium,
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.background.gray,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: COLORS.text.tertiary,
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  loadingBox: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 12,
  },
  loadingText: {
    color: COLORS.text.tertiary,
    marginLeft: 8,
  },
  newBtn: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  newBtnBg: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  newBtnText: {
    color: COLORS.utility.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  placeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
    marginTop: 6,
  },
  placeText: {
    color: COLORS.text.mediumDarkGray,
    flexShrink: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  sheet: {
    backgroundColor: COLORS.utility.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    color: COLORS.text.dark,
    fontSize: 18,
    fontWeight: '600',
  },
  tripDates: {
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  tripDesc: {
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  tripItem: {
    alignItems: 'center',
    borderBottomColor: COLORS.border.dark,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  tripTitle: {
    color: COLORS.text.dark,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddToTripModal;
