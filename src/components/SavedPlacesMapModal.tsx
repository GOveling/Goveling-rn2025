/* eslint-disable react-native/no-color-literals, react-native/no-inline-styles */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import * as Location from 'expo-location';

import { Ionicons } from '@expo/vector-icons';

import AppMap from './AppMap';
import PlaceDetailModal from './PlaceDetailModal';
import { EnhancedPlace } from '../lib/placesSearch';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

// Tipo para los lugares guardados con información del trip
interface SavedPlaceWithTrip {
  id: string;
  place_id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category?: string;
  trip_id: string;
  trip_title: string;
  trip_color: string; // Color único asignado al trip
  added_at: string;
  // Campos adicionales de Google Places
  google_rating?: number;
  reviews_count?: number;
  price_level?: number;
  editorial_summary?: string;
  opening_hours?: any;
  website?: string;
  phone?: string;
  photo_url?: string;
}

// Tipo para los trips disponibles para filtrar
interface TripFilter {
  id: string;
  title: string;
  color: string;
  placesCount: number;
}

// Tipo para lugares cercanos (del Travel Mode)
interface NearbyPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number; // meters
  tripId: string;
}

interface SavedPlacesMapModalProps {
  visible: boolean;
  onClose: () => void;
  nearbyPlaces?: NearbyPlace[]; // Opcional: lugares cercanos del Travel Mode
  tripTitle?: string; // Opcional: título del trip activo
  tripColor?: string; // Opcional: color del trip activo
}

// Colores predefinidos para los trips
const TRIP_COLORS = [
  '#8B5CF6', // Violeta
  '#EC4899', // Rosa
  '#10B981', // Verde
  '#F59E0B', // Naranja
  '#EF4444', // Rojo
  '#3B82F6', // Azul
  '#8B5A2B', // Marrón
  '#6366F1', // Indigo
  '#84CC16', // Lima
  '#F97316', // Naranja oscuro
  '#06B6D4', // Cyan
  '#8B5CF6', // Violeta claro
];

export default function SavedPlacesMapModal({
  visible,
  onClose,
  nearbyPlaces,
  tripTitle,
  tripColor,
}: SavedPlacesMapModalProps) {
  // Estados
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceWithTrip[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<SavedPlaceWithTrip[]>([]);
  const [trips, setTrips] = useState<TripFilter[]>([]);
  const [selectedTripFilter, setSelectedTripFilter] = useState<string | null>(null); // null = todos los trips
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [showUserLocation] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<SavedPlaceWithTrip | null>(null);
  const [showPlaceDetail, setShowPlaceDetail] = useState(false);

  // Debug: Log cuando cambia showPlaceDetail
  useEffect(() => {
    logger.debug('SavedPlacesMapModal: showPlaceDetail changed', {
      showPlaceDetail,
      hasSelectedPlace: !!selectedPlace,
      selectedPlaceName: selectedPlace?.name,
    });
  }, [showPlaceDetail, selectedPlace]);

  // Ref para evitar recargas innecesarias cuando solo cambian las distancias
  const lastNearbyPlacesIdsRef = useRef<string>('');

  // Ref para guardar el centro inicial del mapa (no debe cambiar con ubicación)
  const initialMapCenterRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Función para obtener el color de un trip basado en su ID
  const getTripColor = useCallback((tripId: string, tripIndex: number): string => {
    return TRIP_COLORS[tripIndex % TRIP_COLORS.length];
  }, []);

  // Cargar todos los lugares guardados del usuario con información del trip
  const loadSavedPlaces = useCallback(async () => {
    // Si estamos en Travel Mode, usar los nearbyPlaces directamente
    if (nearbyPlaces && nearbyPlaces.length > 0) {
      // Generar un ID único basado en los lugares (solo IDs, no distancias)
      const currentPlacesIds = nearbyPlaces
        .map((p) => p.id)
        .sort()
        .join(',');

      // Si los lugares no han cambiado (solo cambiaron distancias), no recargar
      if (currentPlacesIds === lastNearbyPlacesIdsRef.current) {
        logger.debug('SavedPlacesMapModal: Nearby places unchanged, skipping reload');
        return;
      }

      // Actualizar el ref con los nuevos IDs
      lastNearbyPlacesIdsRef.current = currentPlacesIds;

      const enrichedPlaces: SavedPlaceWithTrip[] = nearbyPlaces.map((place) => ({
        id: place.id,
        place_id: place.id, // Usar id como place_id
        name: place.name || 'Lugar sin nombre',
        address: undefined,
        lat: place.latitude,
        lng: place.longitude,
        category: undefined,
        trip_id: place.tripId,
        trip_title: tripTitle || 'Viaje actual',
        trip_color: tripColor || '#3B82F6',
        added_at: new Date().toISOString(),
      }));

      setSavedPlaces(enrichedPlaces);
      setTrips([]); // No hay filtros en modo Travel
      setFilteredPlaces(enrichedPlaces);
      logger.debug('SavedPlacesMapModal: Travel Mode - Nearby places loaded', {
        placesCount: enrichedPlaces.length,
      });
      return;
    }

    // Modo normal: cargar todos los lugares
    try {
      setLoading(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }

      // Obtener todos los trip IDs del usuario (como owner o colaborador)
      const [
        { data: ownTrips, error: ownTripsError },
        { data: collabTrips, error: collabTripsError },
      ] = await Promise.all([
        supabase
          .from('trips')
          .select('id, title')
          .eq('owner_id', user.user.id)
          .neq('status', 'cancelled'),
        supabase.from('trip_collaborators').select('trip_id').eq('user_id', user.user.id),
      ]);

      if (ownTripsError || collabTripsError) {
        logger.error('Error loading trips:', { ownTripsError, collabTripsError });
        Alert.alert('Error', 'No se pudieron cargar los viajes');
        return;
      }

      // Obtener información de trips colaborativos
      const collabTripIds = collabTrips?.map((c) => c.trip_id) || [];
      const { data: collabTripDetails, error: collabDetailsError } = await supabase
        .from('trips')
        .select('id, title')
        .in('id', collabTripIds)
        .neq('status', 'cancelled');

      if (collabDetailsError) {
        logger.error('Error loading collaborative trip details:', collabDetailsError);
      }

      // Combinar todos los trips
      const allTrips = [...(ownTrips || []), ...(collabTripDetails || [])];

      if (allTrips.length === 0) {
        setSavedPlaces([]);
        setTrips([]);
        return;
      }

      const tripIds = allTrips.map((t) => t.id);

      // Cargar todos los lugares de estos trips
      const { data: places, error: placesError } = await supabase
        .from('trip_places')
        .select('*')
        .in('trip_id', tripIds)
        .order('added_at', { ascending: false });

      if (placesError) {
        logger.error('Error loading places:', placesError);
        Alert.alert('Error', 'No se pudieron cargar los lugares');
        return;
      }

      // Crear mapa de trips para acceso rápido
      const tripsMap = new Map(allTrips.map((trip) => [trip.id, trip]));

      // Enriquecer lugares con información del trip y color
      const enrichedPlaces: SavedPlaceWithTrip[] =
        places?.map((place) => {
          const trip = tripsMap.get(place.trip_id);
          const tripIndex = allTrips.findIndex((t) => t.id === place.trip_id);

          return {
            id: place.id,
            place_id: place.place_id,
            name: place.name || 'Lugar sin nombre',
            address: place.address,
            lat: Number(place.lat),
            lng: Number(place.lng),
            category: place.category,
            trip_id: place.trip_id,
            trip_title: trip?.title || 'Viaje desconocido',
            trip_color: getTripColor(place.trip_id, tripIndex),
            added_at: place.added_at,
            // Campos adicionales de Google Places
            google_rating: place.google_rating,
            reviews_count: place.reviews_count,
            price_level: place.price_level,
            editorial_summary: place.editorial_summary,
            opening_hours: place.opening_hours,
            website: place.website,
            phone: place.phone,
            photo_url: place.photo_url,
          };
        }) || [];

      // Crear lista de trips para el filtro
      const tripCounts = new Map<string, number>();
      enrichedPlaces.forEach((place) => {
        tripCounts.set(place.trip_id, (tripCounts.get(place.trip_id) || 0) + 1);
      });

      const tripFilters: TripFilter[] = allTrips
        .map((trip, index) => ({
          id: trip.id,
          title: trip.title,
          color: getTripColor(trip.id, index),
          placesCount: tripCounts.get(trip.id) || 0,
        }))
        .filter((trip) => trip.placesCount > 0); // Solo mostrar trips con lugares

      setSavedPlaces(enrichedPlaces);
      setTrips(tripFilters);

      logger.debug('SavedPlacesMapModal: Loaded', {
        placesCount: enrichedPlaces.length,
        tripsCount: tripFilters.length,
      });
    } catch (error) {
      logger.error('Error in loadSavedPlaces:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los lugares');
    } finally {
      setLoading(false);
    }
  }, [getTripColor, nearbyPlaces, tripTitle, tripColor]);

  // Solicitar ubicación del usuario
  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Se necesita acceso a la ubicación para mostrar tu posición en el mapa.'
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      logger.warn('Location error:', e);
    }
  }, []);

  // Cargar lugares guardados cuando se abre el modal
  useEffect(() => {
    if (visible) {
      loadSavedPlaces();
      requestLocation();
    } else {
      // Reset refs cuando se cierra el modal para permitir recarga en próxima apertura
      lastNearbyPlacesIdsRef.current = '';
      initialMapCenterRef.current = null;
    }
  }, [visible, loadSavedPlaces, requestLocation]);

  // Filtrar lugares cuando cambia el filtro seleccionado
  useEffect(() => {
    if (selectedTripFilter) {
      setFilteredPlaces(savedPlaces.filter((place) => place.trip_id === selectedTripFilter));
    } else {
      setFilteredPlaces(savedPlaces);
    }
  }, [selectedTripFilter, savedPlaces]);

  // Calcular centro del mapa SOLO UNA VEZ (no debe cambiar con actualizaciones de ubicación)
  // Esto evita que la cámara se recentre constantemente
  if (initialMapCenterRef.current === null && filteredPlaces.length > 0) {
    // Primera vez: establecer centro basado en lugares o ubicación inicial
    initialMapCenterRef.current = userLocation || {
      latitude: filteredPlaces[0].lat,
      longitude: filteredPlaces[0].lng,
    };
  }

  const center = useMemo(() => {
    return (
      initialMapCenterRef.current ||
      (filteredPlaces.length > 0
        ? { latitude: filteredPlaces[0].lat, longitude: filteredPlaces[0].lng }
        : { latitude: 40.4168, longitude: -3.7038 }) // Madrid por defecto
    );
  }, [filteredPlaces]);

  // Convertir lugares a marcadores para el mapa
  // Memoizar para evitar recrear el array en cada render
  const markers = useMemo(
    () =>
      filteredPlaces.map((place) => ({
        id: place.id,
        coord: { latitude: place.lat, longitude: place.lng },
        title: place.name,
        color: place.trip_color, // Ahora incluimos el color del trip
      })),
    [filteredPlaces]
  );

  // Handler cuando se presiona un marcador
  const handleMarkerPress = useCallback(
    (
      markerId: string,
      markerData: {
        id: string;
        coord: { latitude: number; longitude: number };
        title?: string;
        color?: string;
      }
    ) => {
      logger.debug('SavedPlacesMapModal: Marker pressed', {
        markerId,
        markerDataId: markerData.id,
      });
      // Usar el ID del markerData (que tiene el ID real del lugar)
      const place = filteredPlaces.find((p) => p.id === markerData.id);
      if (place) {
        logger.debug('SavedPlacesMapModal: Place found, setting selectedPlace', {
          placeName: place.name,
        });
        setSelectedPlace(place);
      } else {
        logger.warn('SavedPlacesMapModal: Place not found in filteredPlaces', {
          markerDataId: markerData.id,
          filteredPlacesCount: filteredPlaces.length,
        });
      }
    },
    [filteredPlaces]
  );

  // Calcular distancia entre usuario y lugar seleccionado
  const calculateDistance = useCallback(
    (place: SavedPlaceWithTrip): string => {
      if (!userLocation) return '';

      const R = 6371; // Radio de la Tierra en km
      const dLat = ((place.lat - userLocation.latitude) * Math.PI) / 180;
      const dLon = ((place.lng - userLocation.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation.latitude * Math.PI) / 180) *
          Math.cos((place.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c * 1000; // en metros

      if (distance >= 1000) {
        return `${(distance / 1000).toFixed(1)} km`;
      }
      return `${Math.round(distance)} m`;
    },
    [userLocation]
  );

  // Convertir SavedPlaceWithTrip a EnhancedPlace
  const convertToEnhancedPlace = useCallback((place: SavedPlaceWithTrip): EnhancedPlace => {
    const converted = {
      id: place.place_id,
      name: place.name,
      address: place.address,
      coordinates: { lat: place.lat, lng: place.lng },
      category: place.category,
      source: 'saved_places',
      // Campos adicionales de Google Places
      rating: place.google_rating,
      reviews_count: place.reviews_count,
      priceLevel: place.price_level,
      description: place.editorial_summary,
      opening_hours_raw: place.opening_hours,
      website: place.website,
      phone: place.phone,
      photos: place.photo_url ? [place.photo_url] : undefined,
      // Convertir opening_hours a formato openingHours si existe
      openingHours: place.opening_hours?.weekday_text || undefined,
    };
    console.log('[SavedPlacesMapModal] convertToEnhancedPlace:', {
      name: place.name,
      editorial_summary: place.editorial_summary,
      description: converted.description,
    });
    return converted;
  }, []);

  // Handler para abrir detalle del lugar
  const handleOpenPlaceDetail = useCallback(() => {
    logger.debug('SavedPlacesMapModal: handleOpenPlaceDetail called', {
      hasSelectedPlace: !!selectedPlace,
      placeName: selectedPlace?.name,
    });
    if (selectedPlace) {
      logger.debug('SavedPlacesMapModal: Opening place detail modal');
      setShowPlaceDetail(true);
    } else {
      logger.warn('SavedPlacesMapModal: No selectedPlace to show');
    }
  }, [selectedPlace]);

  // Renderizar botón de filtro de trip
  const renderTripFilter = (trip: TripFilter) => {
    const isSelected = selectedTripFilter === trip.id;
    return (
      <TouchableOpacity
        key={trip.id}
        style={[
          styles.tripFilterButton,
          {
            backgroundColor: isSelected ? trip.color : 'transparent',
            borderColor: trip.color,
          },
        ]}
        onPress={() => setSelectedTripFilter(isSelected ? null : trip.id)}
      >
        <View style={[styles.tripColorDot, { backgroundColor: trip.color }]} />
        <Text style={[styles.tripFilterText, { color: isSelected ? 'white' : trip.color }]}>
          {trip.title} ({trip.placesCount})
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{nearbyPlaces ? 'Lugares Cercanos' : 'Vista de Mapa'}</Text>
          <View style={styles.iconBtn} />
        </View>

        {/* Filtros de trips - solo en modo normal */}
        {!nearbyPlaces && trips.length > 1 && (
          <View style={styles.filtersContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScrollContent}
            >
              <TouchableOpacity
                style={[
                  styles.tripFilterButton,
                  {
                    backgroundColor: selectedTripFilter === null ? '#007AFF' : 'transparent',
                    borderColor: '#007AFF',
                  },
                ]}
                onPress={() => setSelectedTripFilter(null)}
              >
                <Text
                  style={[
                    styles.tripFilterText,
                    { color: selectedTripFilter === null ? 'white' : '#007AFF' },
                  ]}
                >
                  Todos ({savedPlaces.length})
                </Text>
              </TouchableOpacity>
              {trips.map(renderTripFilter)}
            </ScrollView>
          </View>
        )}

        {/* Contenido principal */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando lugares...</Text>
          </View>
        ) : filteredPlaces.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>Sin lugares guardados</Text>
            <Text style={styles.emptyText}>
              {selectedTripFilter
                ? 'No hay lugares guardados en este viaje'
                : 'Explora lugares y agrégarlos a tus viajes para verlos aquí'}
            </Text>
          </View>
        ) : (
          <>
            <AppMap
              center={center}
              markers={markers}
              showUserLocation={showUserLocation}
              onMarkerPress={handleMarkerPress}
              style={styles.map}
            />

            {/* Callout cuando se selecciona un lugar */}
            {selectedPlace && (
              <View style={styles.calloutOverlay}>
                <View style={styles.callout}>
                  <TouchableOpacity
                    style={styles.calloutClose}
                    onPress={() => setSelectedPlace(null)}
                  >
                    <Text style={styles.calloutCloseText}>✕</Text>
                  </TouchableOpacity>

                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {selectedPlace.name}
                  </Text>

                  {calculateDistance(selectedPlace) && (
                    <Text style={styles.calloutDistance}>
                      📍 {calculateDistance(selectedPlace)}
                    </Text>
                  )}

                  <TouchableOpacity style={styles.calloutButton} onPress={handleOpenPlaceDetail}>
                    <Text style={styles.calloutButtonText}>Ver detalle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {filteredPlaces.length} lugar{filteredPlaces.length !== 1 ? 'es' : ''}
                {selectedTripFilter &&
                  ` • ${trips.find((t) => t.id === selectedTripFilter)?.title}`}
              </Text>
            </View>
          </>
        )}

        {/* PlaceDetailModal - se muestra encima del mapa dentro del mismo modal */}
        {selectedPlace && (
          <PlaceDetailModal
            visible={showPlaceDetail}
            place={convertToEnhancedPlace(selectedPlace)}
            onClose={() => {
              logger.debug('SavedPlacesMapModal: Closing PlaceDetailModal');
              setShowPlaceDetail(false);
              setSelectedPlace(null);
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#f8f9fa',
  },
  filtersScrollContent: {
    paddingRight: 16,
  },
  tripFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tripColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  tripFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  map: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  calloutOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  callout: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  calloutClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calloutCloseText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  calloutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    paddingRight: 32,
  },
  calloutDistance: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  calloutButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  calloutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
