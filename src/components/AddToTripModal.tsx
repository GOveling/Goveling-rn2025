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
    if (visible) {
      loadTrips();
    }
  }, [visible]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;

      const { data, error } = await supabase
        .from('trips')
        .select('id, title, description, start_date, end_date')
        .eq('owner_id', user.user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading trips', error);
        return;
      }
      setTrips(data || []);
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

      const { error } = await supabase.from('trip_places').insert({
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
      });

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
