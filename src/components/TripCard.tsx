import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getTripStats, getCountryFlagByName, getCountryFlag, getCountryName, TripStats } from '~/lib/tripUtils';
import TripDetailsModal from './TripDetailsModal';
import LiquidButton from './LiquidButton';
import { useAuth } from '~/contexts/AuthContext';
import { getCurrentUser, resolveUserRoleForTrip, resolveCurrentUserRoleForTripId } from '~/lib/userUtils';
import { supabase } from '~/lib/supabase';
import { CountryImage } from './CountryImage';

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
  console.log('🎨 TripCard: Rendering TripCard for trip:', { id: trip.id, title: trip.title });

  const router = useRouter();
  const { user } = useAuth();
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
  const [ownerProfile, setOwnerProfile] = useState<{
    id: string;
    full_name?: string;
    avatar_url?: string;
  } | null>(null);
  const [currentRole, setCurrentRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [pendingInvites, setPendingInvites] = useState(0);

  const fetchPendingInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_invitations')
        .select('id')
        .eq('trip_id', trip.id);
      if (error) throw error;
      setPendingInvites(data?.length || 0);
    } catch (e) {
      console.warn('TripCard: Failed to fetch pending invites', e);
    }
  };

  useEffect(() => {
    loadTripData();
    loadOwnerProfile();
    deriveCurrentRole();
    fetchPendingInvites();
  }, [trip.id]);

  // Realtime subscription to reflect collaborator role & invitations changes promptly
  useEffect(() => {
    let channel: any;
    (async () => {
      try {
        channel = supabase
          .channel(`tripcard-role-${trip.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_collaborators', filter: `trip_id=eq.${trip.id}` }, () => {
            // Re-derive role and possibly stats (collaborators count)
            deriveCurrentRole();
            loadTripData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_invitations', filter: `trip_id=eq.${trip.id}` }, () => {
            fetchPendingInvites();
          })
          .subscribe();
      } catch (e) {
        console.warn('TripCard realtime subscription failed', e);
      }
    })();
    return () => {
      try { if (channel) supabase.removeChannel(channel); } catch {}
    };
  }, [trip.id]);

  // Actualizar el trip local cuando se recibe una nueva prop
  useEffect(() => {
    setCurrentTrip(trip);
  }, [trip]);

  const loadTripData = async () => {
    try {
      console.log('🔍 TripCard: Loading trip data for trip ID:', trip.id);

      // Diagnóstico adicional: verificar directamente los lugares de la base de datos
      const { data: directPlaces, error: directError } = await supabase
        .from('trip_places')
        .select('*')
        .eq('trip_id', trip.id);

      console.log('🔍 TripCard: Direct places query result:', { directPlaces, directError });
      console.log('🔍 TripCard: Direct places found:', directPlaces?.length || 0);

      if (directPlaces) {
        directPlaces.forEach((place, index) => {
          console.log(`🔍 Direct Place ${index + 1}:`, {
            id: place.id,
            name: place.name,
            country_code: place.country_code,
            country: place.country,
            city: place.city,
            full_address: place.full_address
          });
        });
      }

      const stats = await getTripStats(trip.id);
      console.log('📊 TripCard: Trip stats loaded:', stats);
      console.log('🌍 TripCard: Countries found:', stats.countries);
      console.log('🏷️ TripCard: Country codes found:', stats.countryCodes);
      setTripData(stats);
    } catch (error) {
      console.error('❌ TripCard: Error loading trip data:', error);
    }
  };

  const loadOwnerProfile = async () => {
    try {
      // Usar owner_id si está disponible, sino usar user_id como fallback
      const ownerId = trip.owner_id || trip.user_id;

      if (!ownerId || ownerId === 'null') {
        console.warn('TripCard: No owner ID found for trip', trip.id);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', ownerId)
        .single();

      if (error) {
        console.error('Error loading owner profile:', error);
        return;
      }

      if (profile) {
        setOwnerProfile(profile);
      }
    } catch (error) {
      console.error('Error loading owner profile:', error);
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

  const getRoleConfig = () => {
    const role = currentRole;
    const configs: Record<'owner' | 'editor' | 'viewer', { bgColor: string; textColor: string; label: string }> = {
      owner: { bgColor: '#FEF3C7', textColor: '#92400E', label: 'Owner' },
      editor: { bgColor: '#DBEAFE', textColor: '#1E40AF', label: 'Editor' },
      viewer: { bgColor: '#E5E7EB', textColor: '#374151', label: 'Viewer' },
    };
    return configs[role];
  };

  const deriveCurrentRole = async () => {
    try {
      const role = await resolveCurrentUserRoleForTripId(currentTrip.id);
      setCurrentRole(role);
    } catch (e) {
      console.warn('TripCard deriveCurrentRole failed, defaulting to viewer', e);
      setCurrentRole('viewer');
    }
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

  const renderOwnerAvatar = () => {
    const ownerId = trip.owner_id || trip.user_id;
    const isCurrentUserOwner = user?.id === ownerId;

    // Si el usuario actual es el dueño del trip
    if (isCurrentUserOwner) {
      if (ownerProfile?.avatar_url) {
        return (
          <Image
            source={{ uri: ownerProfile.avatar_url }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
            }}
          />
        );
      } else {
        return (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#8B5CF6',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: 12
            }}>
              YO
            </Text>
          </View>
        );
      }
    } else {
      // Si es otro usuario (colaborador), mostrar su avatar o iniciales
      if (ownerProfile?.avatar_url) {
        return (
          <Image
            source={{ uri: ownerProfile.avatar_url }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
            }}
          />
        );
      } else {
        return (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#8B5CF6',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: 12
            }}>
              {getUserInitials(ownerProfile?.full_name)}
            </Text>
          </View>
        );
      }
    }
  };

  const renderCountryBadges = () => {
    console.log('🎯 TripCard: renderCountryBadges called');
    console.log('🎯 TripCard: tripData.countryCodes:', tripData.countryCodes);
    console.log('🎯 TripCard: tripData.countries:', tripData.countries);

    if (!tripData.countryCodes || tripData.countryCodes.length === 0) {
      console.log('⚠️ TripCard: No country codes found, returning null');
      return null;
    }

    console.log('✅ TripCard: Rendering country badges for:', tripData.countryCodes);

    // Limitar a máximo 3 países para mantener el diseño limpio
    const displayCountries = tripData.countryCodes.slice(0, 3);
    const remainingCount = tripData.countryCodes.length - 3;

    return (
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 20,
        gap: 6
      }}>
        <Text style={{
          fontSize: 14,
          color: '#666666',
          fontWeight: '500',
          marginRight: 8
        }}>
          Destinos:
        </Text>

        {displayCountries.map((countryCode, index) => {
          const countryName = getCountryName(countryCode);
          const flag = getCountryFlag(countryCode);

          return (
            <View key={`${countryCode}-${index}`} style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: 'rgba(0, 0, 0, 0.08)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1
            }}>
              <Text style={{ fontSize: 14, marginRight: 4 }}>
                {flag}
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#374151',
                fontWeight: '600',
                letterSpacing: 0.2
              }}>
                {countryName || countryCode}
              </Text>
            </View>
          );
        })}

        {remainingCount > 0 && (
          <View style={{
            backgroundColor: 'rgba(156, 163, 175, 0.15)',
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: 'rgba(156, 163, 175, 0.2)'
          }}>
            <Text style={{
              fontSize: 12,
              color: '#6B7280',
              fontWeight: '600',
              letterSpacing: 0.2
            }}>
              +{remainingCount} más
            </Text>
          </View>
        )}
      </View>
    );
  }; const getTripType = () => {
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

        {tripData.countryCodes.length > 0 && (
          <CountryImage
            countryCode={tripData.countryCodes[0]}
            width={60}
            height={60}
            borderRadius={12}
            style={{ marginLeft: 20 }}
          />
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

          {/* Badges: estado + rol */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            <View style={{
              backgroundColor: getRoleConfig().bgColor,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: getRoleConfig().textColor
              }}>
                {getRoleConfig().label}
              </Text>
            </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>👥</Text>
            <Text style={{ fontSize: 16, color: '#1A1A1A', fontWeight: '500' }}>
              {tripData.collaboratorsCount} {tripData.collaboratorsCount === 1 ? 'viajero' : 'viajeros'}
            </Text>
            {pendingInvites > 0 && (
              <View style={{
                marginLeft: 8,
                backgroundColor: '#F59E0B',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {pendingInvites}
                </Text>
              </View>
            )}
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
          <View style={{ marginRight: 4 }}>
            {renderOwnerAvatar()}
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
