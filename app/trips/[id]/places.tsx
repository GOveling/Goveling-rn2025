import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '~/lib/supabase';

interface Place {
  id: string;
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  added_at: string;
}

export default function TripPlacesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripTitle, setTripTitle] = useState('');

  useEffect(() => {
    loadTripPlaces();
  }, [id]);

  const loadTripPlaces = async () => {
    try {
      if (!id) return;

      // Obtener información del trip
      const { data: trip } = await supabase
        .from('trips')
        .select('title')
        .eq('id', id)
        .single();

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
      'restaurant': '🍽️',
      'tourist_attraction': '🎭',
      'museum': '🏛️',
      'park': '🌳',
      'shopping_mall': '🛍️',
      'lodging': '🏨',
      'gas_station': '⛽',
      'hospital': '🏥',
      'bank': '🏦',
      'pharmacy': '💊',
      'school': '🏫',
      'church': '⛪',
      'gym': '💪',
      'beauty_salon': '💅',
      'cafe': '☕',
      'bar': '🍺',
      'night_club': '🎵',
      'movie_theater': '🎬',
      'library': '📚',
      'airport': '✈️',
      'subway_station': '🚇',
      'bus_station': '🚌',
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
      minute: '2-digit'
    });
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
            paddingBottom: 20
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
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
            Cargando lugares...
          </Text>
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
          paddingBottom: 20
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>
              Mis Lugares
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
              {tripTitle}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {places.length === 0 ? (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📍</Text>
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#1A1A1A',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              ¡Aún no has guardado lugares!
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#666666',
              marginBottom: 24,
              textAlign: 'center'
            }}>
              Ve a la sección Explore y agrega lugares a este viaje
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/explore')}
              style={{
                borderRadius: 16,
                paddingHorizontal: 24,
                paddingVertical: 12
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
                  justifyContent: 'center'
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 16
                }}>
                  Explorar Lugares
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#666666',
              marginBottom: 16
            }}>
              {places.length} {places.length === 1 ? 'lugar guardado' : 'lugares guardados'}
            </Text>

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
                  elevation: 3
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>
                    {getCategoryIcon(place.category)}
                  </Text>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: '#1A1A1A',
                      marginBottom: 4
                    }}>
                      {place.name}
                    </Text>
                    
                    <Text style={{
                      fontSize: 14,
                      color: '#666666',
                      marginBottom: 8
                    }}>
                      {place.address}
                    </Text>
                    
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#999999'
                      }}>
                        Guardado el {formatDate(place.added_at)}
                      </Text>
                      
                      <View style={{
                        backgroundColor: '#EBF4FF',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8
                      }}>
                        <Text style={{
                          fontSize: 12,
                          color: '#007AFF',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {place.category.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity
                  onPress={() => Alert.alert('Lugar', `Ver detalles de ${place.name}`)}
                  style={{
                    marginTop: 12,
                    backgroundColor: '#F8F9FA',
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#007AFF'
                  }}>
                    Ver Detalles
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
