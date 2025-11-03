import React, { useState, useEffect, useCallback } from 'react';

import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '~/contexts/AuthContext';
import { processPlaceCategories } from '~/lib/categoryProcessor';
import { supabase } from '~/lib/supabase';
import { resolveUserRoleForTrip } from '~/lib/userUtils';

import PlaceDetailModal from '../../../src/components/PlaceDetailModal';

interface Place {
  id: string;
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  photo_url?: string;
  added_at: string;
  google_rating?: number;
  reviews_count?: number;
  price_level?: number;
  editorial_summary?: string;
  opening_hours?: { weekdayDescriptions?: string[] } | null;
  website?: string;
  phone?: string;
}

export default function TripPlacesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripTitle, setTripTitle] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [tripData, setTripData] = useState<any>(null);

  // Verificar si el usuario puede editar (owner o editor)
  const canEdit = currentRole === 'owner' || currentRole === 'editor';
  const canDelete = currentRole === 'owner' || currentRole === 'editor';

  useEffect(() => {
    loadTripPlaces();
    loadUserRole();
  }, [id]);

  const loadUserRole = async () => {
    if (!id || !user?.id) return;

    try {
      // Obtener datos del trip para determinar el rol
      const { data: trip } = await supabase
        .from('trips')
        .select('id, owner_id, user_id')
        .eq('id', id)
        .single();

      if (trip) {
        setTripData(trip);
        const role = await resolveUserRoleForTrip(user.id, {
          id: trip.id,
          owner_id: trip.owner_id,
          user_id: trip.user_id,
        });
        setCurrentRole(role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  // Recargar cuando regresamos del explore
  useFocusEffect(
    useCallback(() => {
      loadTripPlaces();
    }, [id])
  );

  const loadTripPlaces = async () => {
    try {
      if (!id) return;

      // Obtener información del trip
      const { data: trip } = await supabase.from('trips').select('title').eq('id', id).single();

      if (trip) {
        setTripTitle(trip.title);
      }

      // Obtener lugares del trip
      const { data: tripPlaces, error } = await supabase
        .from('trip_places')
        .select('*')
        .eq('trip_id', id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error loading trip places:', error);
        Alert.alert('Error', 'No se pudieron cargar los lugares del viaje');
        return;
      }

      setPlaces(tripPlaces || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      restaurant: '🍽️',
      tourist_attraction: '🎭',
      museum: '🏛️',
      park: '🌳',
      shopping_mall: '🛍️',
      lodging: '🏨',
      gas_station: '⛽',
      hospital: '🏥',
      bank: '🏦',
      pharmacy: '💊',
      school: '🏫',
      church: '⛪',
      gym: '💪',
      beauty_salon: '💅',
      cafe: '☕',
      bar: '🍺',
      night_club: '🎵',
      movie_theater: '🎬',
      library: '📚',
      airport: '✈️',
      subway_station: '🚇',
      bus_station: '🚌',
    };
    return icons[category] || '📍';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeletePlace = async (placeId: string, placeName: string) => {
    // Verificar permisos antes de eliminar
    if (!canDelete) {
      Alert.alert(
        'Sin permisos',
        'No tienes permisos para eliminar lugares de este viaje. Solo el propietario y editores pueden eliminar lugares.'
      );
      return;
    }

    Alert.alert(
      'Eliminar lugar',
      `¿Estás seguro de que quieres eliminar "${placeName}" de tu viaje?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Find the place to get necessary data for notification
              const placeToDelete = places.find((p) => p.id === placeId);
              if (!placeToDelete) {
                Alert.alert('Error', 'No se encontró el lugar');
                return;
              }

              console.log('🗑️📱 PLACES.TSX: About to call removePlaceFromTripWithNotification', {
                placeId,
                tripId: id,
                placeName: placeToDelete.name,
                userId: user.id,
                timestamp: new Date().toISOString(),
              });

              // Use notification function to remove place with notifications to collaborators
              const { removePlaceFromTripWithNotification } = await import(
                '~/lib/placesNotifications'
              );

              console.log('🗑️📱 PLACES.TSX: Function imported, calling with params:', {
                placeId,
                tripId: id,
                placeName: placeToDelete.name,
                removedBy: user.id,
              });

              const { error } = await removePlaceFromTripWithNotification(
                placeId,
                id,
                placeToDelete.name,
                user.id
              );

              console.log('🗑️📱 PLACES.TSX: Function completed with result:', {
                error,
                success: !error,
              });

              if (error) {
                console.error('Error deleting place:', error);
                Alert.alert('Error', 'No se pudo eliminar el lugar');
              } else {
                // Actualizar la lista local
                setPlaces((prev) => prev.filter((p) => p.id !== placeId));
                Alert.alert('Éxito', 'Lugar eliminado del viaje');
              }
            } catch (error) {
              console.error('Error deleting place:', error);
              Alert.alert('Error', 'No se pudo eliminar el lugar');
            }
          },
        },
      ]
    );
  };

  const handleShowPlaceDetails = (place: Place) => {
    setSelectedPlace(place);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedPlace(null);
  };

  // Convert Place to EnhancedPlace format for the modal
  const convertPlaceToEnhanced = (place: Place) => ({
    id: place.place_id,
    name: place.name,
    address: place.address,
    coordinates: { lat: place.lat, lng: place.lng },
    category: place.category,
    photos: place.photo_url ? [place.photo_url] : undefined,
    source: 'trip_places',
    rating: place.google_rating,
    reviews_count: place.reviews_count,
    priceLevel: place.price_level,
    description: place.editorial_summary,
    openingHours: place.opening_hours?.weekdayDescriptions,
    website: place.website,
    phone: place.phone,
  });

  // Function to handle place removal from modal (via heart button)
  const handleRemovePlaceFromModal = async (place: Place) => {
    if (!canDelete) {
      Alert.alert(
        'Sin permisos',
        'No tienes permisos para eliminar lugares de este viaje. Solo el propietario y editores pueden eliminar lugares.'
      );
      return;
    }
    Alert.alert(
      'Eliminar lugar',
      `¿Estás seguro de que quieres eliminar "${place.name}" de tu viaje?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️📱 MODAL: About to call removePlaceFromTripWithNotification', {
                placeId: place.id,
                tripId: id,
                placeName: place.name,
                userId: user.id,
                timestamp: new Date().toISOString(),
              });

              // Use notification function to remove place with notifications to collaborators
              const { removePlaceFromTripWithNotification } = await import(
                '~/lib/placesNotifications'
              );

              console.log('🗑️📱 MODAL: Function imported, calling with params:', {
                placeId: place.id,
                tripId: id,
                placeName: place.name,
                removedBy: user.id,
              });

              const { error } = await removePlaceFromTripWithNotification(
                place.id,
                id,
                place.name,
                user.id
              );

              console.log('🗑️📱 MODAL: Function completed with result:', {
                error,
                success: !error,
              });

              if (error) {
                console.error('Error deleting place:', error);
                Alert.alert('Error', 'No se pudo eliminar el lugar');
              } else {
                // Actualizar la lista local y cerrar modal
                setPlaces((prev) => prev.filter((p) => p.id !== place.id));
                handleCloseModal();
                Alert.alert('Éxito', 'Lugar eliminado del viaje');
              }
            } catch (error) {
              console.error('Error deleting place:', error);
              Alert.alert('Error', 'No se pudo eliminar el lugar');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <LinearGradient
          colors={['#4A90E2', '#7B68EE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: '700', color: 'white', flex: 1 }}>
              Lugares del Viaje
            </Text>
          </View>
        </LinearGradient>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Cargando lugares...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <LinearGradient
        colors={['#4A90E2', '#7B68EE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>Mis Lugares</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{tripTitle}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {places.length === 0 ? (
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📍</Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#1A1A1A',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              ¡Aún no has guardado lugares!
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: '#666666',
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              Ve a la sección Explore y agrega lugares a este viaje
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/explore?tripId=${id}&returnTo=trip-places`)}
              style={{
                borderRadius: 16,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: 16,
                  }}
                >
                  Explorar Lugares
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#666666',
                }}
              >
                {places.length} {places.length === 1 ? 'lugar guardado' : 'lugares guardados'}
              </Text>

              <TouchableOpacity
                onPress={() => router.push(`/explore?tripId=${id}&returnTo=trip-places`)}
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="add" size={16} color="white" style={{ marginRight: 4 }} />
                <Text
                  style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: 14,
                  }}
                >
                  Explorar Más
                </Text>
              </TouchableOpacity>
            </View>

            {places.map((place) => (
              <View
                key={place.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>
                    {getCategoryIcon(place.category)}
                  </Text>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: '700',
                          color: '#1A1A1A',
                          flex: 1,
                        }}
                      >
                        {place.name}
                      </Text>
                      {place.google_rating && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginLeft: 8,
                          }}
                        >
                          <Text style={{ fontSize: 14, marginRight: 2 }}>⭐</Text>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                            {place.google_rating}
                          </Text>
                          {place.reviews_count && (
                            <Text style={{ fontSize: 12, color: '#999999', marginLeft: 4 }}>
                              ({place.reviews_count})
                            </Text>
                          )}
                        </View>
                      )}
                      {place.price_level !== undefined && place.price_level !== null && (
                        <View
                          style={{
                            backgroundColor: '#F8F9FA',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginLeft: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: '#10B981',
                            }}
                          >
                            {['Gratis', '$', '$$', '$$$', '$$$$'][place.price_level] || ''}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={{
                        fontSize: 14,
                        color: '#666666',
                        marginBottom: 8,
                      }}
                    >
                      {place.address}
                    </Text>

                    {/* Editorial Summary / About */}
                    {place.editorial_summary && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#555555',
                          lineHeight: 18,
                          marginBottom: 8,
                          fontStyle: 'italic',
                        }}
                        numberOfLines={2}
                      >
                        {place.editorial_summary}
                      </Text>
                    )}

                    {/* Horarios */}
                    {place.opening_hours?.weekdayDescriptions &&
                      place.opening_hours.weekdayDescriptions.length > 0 && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <Text style={{ fontSize: 12, marginRight: 4 }}>🕐</Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: '#10B981',
                              fontWeight: '500',
                            }}
                            numberOfLines={1}
                          >
                            {place.opening_hours.weekdayDescriptions[0]}
                          </Text>
                        </View>
                      )}

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#999999',
                        }}
                      >
                        Guardado el {formatDate(place.added_at)}
                      </Text>

                      <View
                        style={{
                          backgroundColor: '#EBF4FF',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: '#007AFF',
                            fontWeight: '600',
                          }}
                        >
                          {processPlaceCategories([], place.category, 1)[0] || 'Lugar'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {canDelete && (
                    <TouchableOpacity
                      onPress={() => handleDeletePlace(place.id, place.name)}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: '#FEF2F2',
                        marginLeft: 8,
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => handleShowPlaceDetails(place)}
                  style={{
                    marginTop: 12,
                    backgroundColor: '#F8F9FA',
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#007AFF',
                    }}
                  >
                    Ver Detalles
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetailModal
          visible={modalVisible}
          place={convertPlaceToEnhanced(selectedPlace)}
          onClose={handleCloseModal}
          tripId={id}
          tripTitle={tripTitle}
          isAlreadyInTrip={true}
          onRemoveFromTrip={() => handleRemovePlaceFromModal(selectedPlace)}
        />
      )}
    </View>
  );
}
