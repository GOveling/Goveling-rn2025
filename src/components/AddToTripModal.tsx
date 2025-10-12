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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '~/lib/supabase';
import NewTripModal from './NewTripModal';
import { EnhancedPlace } from '~/lib/placesSearch';

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
        Alert.alert('Ya agregado', `${place.name} ya está en "${tripTitle}"`);
        onAdded?.(tripId, tripTitle);
        onClose();
        return;
      }

      const { error } = await supabase
        .from('trip_places')
        .insert({
          trip_id: tripId,
          place_id: place.id,
          name: place.name,
          address: place.address || '',
          lat: place.coordinates?.lat || 0,
          lng: place.coordinates?.lng || 0,
          category: place.types?.[0] || place.category || 'establishment',
          photo_url: (place.photos && place.photos.length > 0) ? place.photos[0] : null,
          added_by: user.user.id,
          added_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Insert error', error);
        Alert.alert('Error', 'No se pudo agregar el lugar al viaje');
        return;
      }

      Alert.alert('¡Listo!', `${place.name} agregado a "${tripTitle}"`);
      onAdded?.(tripId, tripTitle);
      onClose();
    } catch (e) {
      console.error('Add place error', e);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setAdding(false);
    }
  };

  const handleCreateTrip = (newTripId: string) => {
    // Buscar el viaje y completar el agregado
    const created = trips.find(t => t.id === newTripId);
    const title = created?.title || 'Nuevo viaje';
    addPlaceToTrip(newTripId, title);
    setShowNewTripModal(false);
  };

  const formatDate = (d?: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <Modal
        visible={visible}
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
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Place summary */}
            <View style={styles.placeRow}>
              <Ionicons name="location" size={18} color="#6B7280" />
              <Text style={styles.placeText}>{place.name || 'Lugar'}</Text>
            </View>

            {/* Create new */}
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowNewTripModal(true)}>
              <LinearGradient colors={["#8B5CF6", "#EC4899"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtnBg}>
                <Ionicons name="add" size={20} color="#fff" />
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
                <Ionicons name="airplane-outline" size={40} color="#9CA3AF" />
                <Text style={styles.emptyText}>Aún no tienes viajes</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {trips.map((t) => (
                  <TouchableOpacity key={t.id} style={styles.tripItem} disabled={adding} onPress={() => addPlaceToTrip(t.id, t.title)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripTitle}>{t.title}</Text>
                      {(t.start_date || t.end_date) ? (
                        <Text style={styles.tripDates}>
                          {t.start_date && t.end_date
                            ? `${formatDate(t.start_date)} - ${formatDate(t.end_date)}`
                            : t.start_date
                              ? `Desde ${formatDate(t.start_date)}`
                              : `Hasta ${formatDate(t.end_date!)}`}
                        </Text>
                      ) : null}
                      {!!(t.description && t.description.trim().length > 0) && (
                        <Text numberOfLines={2} style={styles.tripDesc}>{t.description}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
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
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  placeText: {
    marginLeft: 8,
    color: '#374151',
    fontSize: 14,
    flexShrink: 1,
  },
  newBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  newBtnBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  newBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#6B7280',
    marginTop: 8,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  tripTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  tripDates: {
    color: '#6B7280',
    marginTop: 2,
  },
  tripDesc: {
    color: '#6B7280',
    marginTop: 4,
  },
});

export default AddToTripModal;

