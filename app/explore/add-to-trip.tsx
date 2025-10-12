import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { EnhancedPlace } from '../../src/lib/placesSearch';
import TripSelectorModal from '../../src/components/TripSelectorModal';

export default function AddToTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { placeId, name } = useLocalSearchParams<{ placeId?: string; name?: string }>();

  const [place, setPlace] = useState<EnhancedPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [addingToTrip, setAddingToTrip] = useState(false);

  useEffect(() => {
    loadPlaceDetails();
  }, [placeId]);

  const loadPlaceDetails = async () => {
    try {
      setLoading(true);
      if (!placeId) {
        Alert.alert('Error', 'No se especificó un lugar');
        router.back();
        return;
      }

      // Crear un objeto básico con los datos disponibles desde los parámetros
      const placeName = name ? decodeURIComponent(name) : 'Lugar desconocido';
      const basicPlace: EnhancedPlace = {
        id: placeId,
        name: placeName.trim() || 'Lugar desconocido',
        address: '',
        coordinates: { lat: 0, lng: 0 },
        types: [],
        rating: 0,
        priceLevel: 0,
        photos: [],
        business_status: 'OPERATIONAL',
        source: 'params'
      };
      setPlace(basicPlace);

      // Mostrar automáticamente el selector de trips
      setShowTripSelector(true);
    } catch (error) {
      console.error('Error loading place details:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles del lugar');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleTripSelected = async (tripId: string, tripTitle: string) => {
    if (!place) {
      Alert.alert('Error', 'No se pudo identificar el lugar');
      return;
    }

    try {
      setAddingToTrip(true);
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user?.id) {
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }

      // Verificar si el lugar ya existe en el viaje
      const { data: existingPlace } = await supabase
        .from('trip_places')
        .select('id')
        .eq('trip_id', tripId)
        .eq('place_id', place.id)
        .maybeSingle();

      if (existingPlace) {
        Alert.alert(
          'Lugar ya agregado',
          `"${place.name}" ya está en tu viaje "${tripTitle}"`,
          [
            {
              text: 'Ver lugares del viaje',
              onPress: () => router.push(`/trips/${tripId}/places`)
            },
            {
              text: 'Continuar explorando',
              onPress: () => router.push('/(tabs)/explore')
            }
          ]
        );
        return;
      }

      // Agregar el lugar al viaje
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
          added_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding place to trip:', error);
        Alert.alert('Error', 'No se pudo agregar el lugar al viaje');
        return;
      }

      // Mostrar éxito y opciones de navegación
      Alert.alert(
        '¡Lugar agregado!',
        `"${place.name}" ha sido agregado exitosamente a "${tripTitle}"`,
        [
          {
            text: 'Continuar explorando',
            style: 'default',
            onPress: () => router.push('/(tabs)/explore')
          },
          {
            text: 'Ver lugares del viaje',
            style: 'default',
            onPress: () => router.push(`/trips/${tripId}/places`)
          }
        ]
      );

    } catch (error) {
      console.error('Error adding place to trip:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setAddingToTrip(false);
    }
  };

  const handleModalClose = () => {
    setShowTripSelector(false);
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Cargando información del lugar...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Añadir a Viaje</Text>
          {!!(place && (place.name ?? '').trim().length > 0) && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {place!.name}
            </Text>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!!place && (
          <View style={styles.placeInfo}>
            <View style={styles.placeHeader}>
              <Text style={styles.placeName}>{place.name || 'Lugar sin nombre'}</Text>
              {(place.rating ?? 0) > 0 && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {((place.address ?? '').trim().length > 0) && (
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.addressText}>{place.address}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.selectTripButton}
          onPress={() => setShowTripSelector(true)}
          disabled={addingToTrip}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.selectTripGradient}
          >
            {addingToTrip ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="airplane" size={20} color="#FFFFFF" />
                <Text style={styles.selectTripText}>Seleccionar Viaje</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Trip Selector Modal */}
      <TripSelectorModal
        visible={showTripSelector}
        onClose={handleModalClose}
        onTripSelected={handleTripSelected}
        placeName={place?.name || undefined}
        placeId={place?.id || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  placeInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  selectTripButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectTripGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  selectTripText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
