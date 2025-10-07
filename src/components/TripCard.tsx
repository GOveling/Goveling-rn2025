import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getTripStats, getCountryFlagByName, getCountryFlag, TripStats } from '~/lib/tripUtils';
import TripDetailsModal from './TripDetailsModal';
import LiquidButton from './LiquidButton';

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
  onTripUpdated?: (updatedTrip: TripData) => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onTripUpdated }) => {
  const router = useRouter();
  const [currentTrip, setCurrentTrip] = useState(trip);
  const [tripData, setTripData] = useState<TripStats>({
    collaboratorsCount: 1,
    placesCount: 0,
    countries: [],
    countryCodes: [],
    categories: [],
    collaborators: [],
    firstPlaceImage: undefined
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadTripData();
  }, [trip.id]);

  // Actualizar el trip local cuando se recibe una nueva prop
  useEffect(() => {
    setCurrentTrip(trip);
  }, [trip]);

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
    if (!currentTrip.start_date || !currentTrip.end_date) return 'planning';
    
    const now = new Date();
    const startDate = new Date(currentTrip.start_date);
    const endDate = new Date(currentTrip.end_date);
    
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'traveling';
    if (now > endDate) return 'completed';
    
    return 'planning';
  };

  const getStatusConfig = () => {
    const status = getTripStatus();
    const configs = {
      completed: {
        text: 'Completado',
        bgColor: '#DCFCE7', // bg-green-100
        textColor: '#166534', // text-green-800
      },
      upcoming: {
        text: 'Próximo',
        bgColor: '#DBEAFE', // bg-blue-100
        textColor: '#1E40AF', // text-blue-800
      },
      planning: {
        text: 'Planificando',
        bgColor: '#F3E8FF', // bg-purple-100
        textColor: '#6B21A8', // text-purple-800
      },
      traveling: {
        text: 'Viajando',
        bgColor: '#FED7AA', // bg-orange-100
        textColor: '#C2410C', // text-orange-800
      },
      default: {
        text: 'Sin estado',
        bgColor: '#F3F4F6', // bg-gray-100
        textColor: '#374151', // text-gray-800
      },
    };
    
    return configs[status as keyof typeof configs] || configs.default;
  };

  const getCountryFlags = () => {
    if (tripData.countryCodes.length === 0) return [];
    
    return tripData.countryCodes.map(code => 
      getCountryFlag(code)
    );
  };

  const getFirstCountryFlag = () => {
    if (tripData.countryCodes.length === 0) return '🌍';
    return getCountryFlag(tripData.countryCodes[0]);
  };

  const getFirstCountryImage = () => {
    return tripData.firstPlaceImage;
  };

  const getUserInitials = (fullName?: string) => {
    if (!fullName) return 'U';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + (names[names.length - 1].charAt(0))).toUpperCase();
  };

  const getTripType = () => {
    return tripData.collaboratorsCount > 1 ? 'Grupo' : 'Individual';
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
          <Text style={{ fontSize: 48 }}>
            {getFirstCountryFlag()}
          </Text>
        </View>
        
        {getFirstCountryImage() && (
          <View style={{
            marginLeft: 20,
            width: 60,
            height: 60,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.2)'
          }}>
            <Image
              source={{ uri: getFirstCountryImage() }}
              style={{
                width: '100%',
                height: '100%',
                resizeMode: 'cover'
              }}
            />
          </View>
        )}
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
              {currentTrip.title}
            </Text>
            
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4
            }}>
              <Text style={{ fontSize: 16, color: '#8B5CF6', marginRight: 8 }}>👥</Text>
              <Text style={{
                fontSize: 16,
                color: '#8B5CF6',
                fontWeight: '600'
              }}>
                {getTripType()}
              </Text>
            </View>
          </View>
          
          {/* Badge de estado */}
          <View style={{
            backgroundColor: getStatusConfig().bgColor,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            marginLeft: 12
          }}>
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: getStatusConfig().textColor
            }}>
              {getStatusConfig().text}
            </Text>
          </View>
        </View>

        {/* Países/Destinos - solo si hay lugares */}
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

        {/* Fechas - con fallback "Fechas por confirmar" */}
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
            {currentTrip.start_date && currentTrip.end_date 
              ? `${formatDate(currentTrip.start_date)} - ${formatDate(currentTrip.end_date)}`
              : 'Fechas por confirmar'
            }
          </Text>
        </View>

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

        {/* Miembros del Equipo con avatares reales */}
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
          
          {/* Dueño del trip (primera posición) */}
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#8B5CF6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: 12
            }}>
              YO
            </Text>
          </View>
          
          {/* Colaboradores */}
          {tripData.collaborators.slice(0, 2).map((collaborator, index) => (
            <View key={collaborator.id} style={{ marginRight: 4 }}>
              {collaborator.avatar_url ? (
                <Image
                  source={{ uri: collaborator.avatar_url }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                  }}
                />
              ) : (
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#10B981',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: 11
                  }}>
                    {getUserInitials(collaborator.full_name)}
                  </Text>
                </View>
              )}
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
          <LiquidButton
            title="Ver Detalles"
            onPress={() => setShowModal(true)}
            variant="primary"
          />

          <LiquidButton
            title="Ver Mis lugares"
            icon="❤️"
            onPress={() => router.push(`/trips/${trip.id}/places`)}
            variant="accent"
          />
        </View>

        <View style={{
          flexDirection: 'row',
          gap: 12
        }}>
          <LiquidButton
            title="Ruta Inteligente IA"
            icon="🧠"
            onPress={() => router.push(`/trips/${trip.id}/route`)}
            variant="glass"
          />

          <LiquidButton
            title="Estadía"
            icon="🏠"
            onPress={() => router.push(`/trips/${trip.id}/accommodation`)}
            variant="success"
          />
        </View>

        {/* Descripción si existe */}
        {currentTrip.description && (
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
              {currentTrip.description}
            </Text>
          </View>
        )}
      </View>

      {/* Modal de detalles */}
      <TripDetailsModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        trip={currentTrip}
        onTripUpdate={(updatedTrip) => {
          setCurrentTrip(updatedTrip);
          onTripUpdated?.(updatedTrip);
        }}
      />
    </View>
  );
};

export default TripCard;
