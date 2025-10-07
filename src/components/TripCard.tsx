import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getTripStats, getCountryFlagByName, TripStats } from '~/lib/tripUtils';

interface TripData {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  user_id: string;
  owner_id?: string;
  budget?: number;
  accommodation_preference?: string;
  transport_preference?: string;
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

interface TripCardProps {
  trip: TripData;
}

const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  const router = useRouter();
  const [tripData, setTripData] = useState<TripStats>({
    collaboratorsCount: 1,
    placesCount: 0,
    countries: ['Chile'],
    categories: []
  });

  useEffect(() => {
    loadTripData();
  }, [trip.id]);

  const loadTripData = async () => {
    try {
      const stats = await getTripStats(trip.id);
      setTripData(stats);
    } catch (error) {
      console.error('Error loading trip data:', error);
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

  const getTripStatus = () => {
    if (!trip.start_date || !trip.end_date) return 'Planificando';
    
    const now = new Date();
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    
    if (now < startDate) return 'Próximo';
    if (now >= startDate && now <= endDate) return 'Viajando';
    if (now > endDate) return 'Completado';
    
    return 'Planificando';
  };

  const getStatusColor = () => {
    const status = getTripStatus();
    switch (status) {
      case 'Viajando': return '#10B981';
      case 'Próximo': return '#3B82F6';
      case 'Completado': return '#6B7280';
      default: return '#F59E0B';
    }
  };

  const getCountryFlags = () => {
    if (tripData.countries.length === 0) return ['🌍'];
    
    return tripData.countries.map(country => 
      getCountryFlagByName(country)
    );
  };

  const getTripTypeColor = () => {
    return tripData.collaboratorsCount > 1 ? '#8B5CF6' : '#059669';
  };

  const getTripType = () => {
    return tripData.collaboratorsCount > 1 ? 'Grupo' : 'Individual';
  };

  const getAccommodationIcon = () => {
    const accommodation = trip.accommodation_preference;
    const iconMap: { [key: string]: string } = {
      'hotel': '🏨',
      'cabin': '🏘️',
      'resort': '🏖️',
      'hostel': '🏠',
      'apartment': '🏢',
      'camping': '⛺',
      'rural_house': '🏡',
    };
    return iconMap[accommodation || ''] || '🏨';
  };

  const getTransportIcon = () => {
    const transport = trip.transport_preference;
    const iconMap: { [key: string]: string } = {
      'car': '🚗',
      'plane': '✈️',
      'train': '🚂',
      'bus': '🚌',
      'metro': '🚇',
      'boat': '⛵',
      'bike': '🚲',
      'walking': '🚶',
    };
    return iconMap[transport || ''] || '🚗';
  };

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
      marginBottom: 24
    }}>
      {/* Header con gradiente y país principal */}
      <LinearGradient
        colors={['#4A90E2', '#7B68EE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: '100%',
          height: 120,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row'
        }}
      >
        <View style={{
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {getCountryFlags().map((flag, index) => (
            <Text key={index} style={{ fontSize: 32, marginHorizontal: 4 }}>
              {flag}
            </Text>
          ))}
        </View>
        <View style={{
          marginLeft: 20,
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 20 }}>{getAccommodationIcon()}</Text>
          <Text style={{ fontSize: 18 }}>{getTransportIcon()}</Text>
        </View>
      </LinearGradient>
      
      {/* Contenido del Trip */}
      <View style={{ padding: 20 }}>
        {/* Título y Estado */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 24,
              fontWeight: '800',
              color: '#1A1A1A',
              marginBottom: 4
            }}>
              {trip.title}
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#666666',
              fontWeight: '500'
            }}>
              {getTripStatus()}
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4
            }}>
              <Text style={{ fontSize: 16, color: getTripTypeColor(), marginRight: 8 }}>👥</Text>
              <Text style={{
                fontSize: 16,
                color: getTripTypeColor(),
                fontWeight: '600'
              }}>
                {getTripType()}
              </Text>
            </View>
          </View>
        </View>

        {/* Países/Destinos */}
        {tripData.countries.length > 0 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8
            }}>
              {tripData.countries.map((country, index) => (
                <View key={index} style={{
                  backgroundColor: '#EBF4FF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#007AFF'
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#007AFF'
                  }}>
                    {getCountryFlags()[index] || '🌍'} {country}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Fechas */}
        {trip.start_date && trip.end_date && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>📅</Text>
            <Text style={{
              fontSize: 16,
              color: '#1A1A1A',
              fontWeight: '500'
            }}>
              {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
            </Text>
          </View>
        )}

        {/* Viajeros y Lugares */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>👥</Text>
            <Text style={{
              fontSize: 16,
              color: '#1A1A1A',
              fontWeight: '500'
            }}>
              {tripData.collaboratorsCount} {tripData.collaboratorsCount === 1 ? 'viajero' : 'viajeros'}
            </Text>
          </View>
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
            <Text style={{
              fontSize: 16,
              color: '#1A1A1A',
              fontWeight: '500'
            }}>
              {tripData.placesCount} {tripData.placesCount === 1 ? 'lugar' : 'lugares'}
            </Text>
          </View>
        </View>

        {/* Miembros del Equipo (Avatares simulados) */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24
        }}>
          <Text style={{
            fontSize: 14,
            color: '#666666',
            fontWeight: '500',
            marginRight: 8
          }}>
            Equipo:
          </Text>
          {Array.from({ length: Math.min(tripData.collaboratorsCount, 3) }).map((_, index) => (
            <View key={index} style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: index === 0 ? '#8B5CF6' : '#10B981',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 4
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: 14
              }}>
                {index === 0 ? 'YO' : `U${index + 1}`}
              </Text>
            </View>
          ))}
          {tripData.collaboratorsCount > 3 && (
            <Text style={{
              fontSize: 14,
              color: '#666666',
              marginLeft: 4
            }}>
              +{tripData.collaboratorsCount - 3} más
            </Text>
          )}
        </View>

        {/* Botones de Acción */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 16
        }}>
          <TouchableOpacity
            onPress={() => router.push(`/trips/${trip.id}`)}
            style={{
              flex: 1,
              borderRadius: 16,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 3
            }}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: 16
              }}>
                Ver Detalles
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/trips/${trip.id}/places`)}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#FF3B30',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3
            }}
          >
            <Text style={{
              color: '#FF3B30',
              fontWeight: '700',
              fontSize: 16
            }}>
              ❤️ Ver Mis lugares
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{
          flexDirection: 'row',
          gap: 12
        }}>
          <TouchableOpacity
            onPress={() => router.push(`/trips/${trip.id}/route`)}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#007AFF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3
            }}
          >
            <Text style={{
              color: '#007AFF',
              fontWeight: '700',
              fontSize: 16
            }}>
              🧠 Ruta Inteligente IA
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/trips/${trip.id}/accommodation`)}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#34C759',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3
            }}
          >
            <Text style={{
              color: '#34C759',
              fontWeight: '700',
              fontSize: 16
            }}>
              🏠 Estadía
            </Text>
          </TouchableOpacity>
        </View>

        {/* Descripción si existe */}
        {trip.description && (
          <View style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: '#F8F9FA',
            borderRadius: 12
          }}>
            <Text style={{
              fontSize: 14,
              color: '#666666',
              lineHeight: 20
            }}>
              {trip.description}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default TripCard;
