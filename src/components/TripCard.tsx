import React, { useEffect, useState, useCallback } from 'react';

import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase';
import {
  getCountryFlagByName,
  getCountryFlag,
  getCountryImage,
  getCountryName,
  getTripStats,
  TripStats,
} from '~/lib/tripUtils';
import {
  getCurrentUser,
  resolveCurrentUserRoleForTripId,
  resolveUserRoleForTrip,
} from '~/lib/userUtils';

import { CountryImage } from './CountryImage';
import GroupOptionsModal from './GroupOptionsModal';
import LiquidButton from './LiquidButton';
import TripDetailsModal from './TripDetailsModal';
import { useGetProfileQuery } from '../store/api/userApi';

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

// Helper function to parse date as local time instead of UTC
const parseLocalDate = (dateString: string): Date => {
  // If the date string is just YYYY-MM-DD, we want to treat it as local time, not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  return new Date(dateString);
};

// UPDATED: Avatar fix using RTK Query - 2025-10-16
const TripCard: React.FC<TripCardProps> = ({ trip, onTripUpdated }) => {
  console.log('🎨🎨🎨 TripCard UPDATED VERSION: Rendering for trip:', {
    id: trip.id,
    title: trip.title,
    has_title: !!trip.title,
    owner_id: trip.owner_id,
    user_id: trip.user_id,
  });

  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  // RTK Query: Get current user profile (IGUAL QUE PROFILE.TSX)
  const { data: currentUserProfile, isLoading, isError, error } = useGetProfileQuery();

  // DEBUG: Ver el estado del RTK Query
  console.log('🔍🔍🔍 RTK QUERY STATUS (NEW VERSION):', {
    isLoading,
    isError,
    error: error ? JSON.stringify(error) : 'none',
    hasData: !!currentUserProfile,
    'currentUserProfile?.full_name': currentUserProfile?.full_name,
    'currentUserProfile?.avatar_url': currentUserProfile?.avatar_url,
    'user?.id': user?.id,
  });

  const [currentTrip, setCurrentTrip] = useState(trip);
  const [tripData, setTripData] = useState<TripStats>({
    collaboratorsCount: 1,
    placesCount: 0,
    countries: [],
    countryCodes: [],
    categories: [],
    collaborators: [],
    firstPlaceImage: undefined,
  });
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [ownerProfile, setOwnerProfile] = useState<{
    id: string;
    full_name?: string;
    avatar_url?: string;
    email?: string;
  } | null>(null);
  const [currentRole, setCurrentRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [pendingInvites, setPendingInvites] = useState(0);

  const fetchPendingInvites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trip_invitations')
        .select('id')
        .eq('trip_id', trip.id)
        .eq('status', 'pending'); // Solo contar invitaciones pendientes
      if (error) throw error;
      setPendingInvites(data?.length || 0);
    } catch (e) {
      console.warn('TripCard: Failed to fetch pending invites', e);
    }
  }, [trip.id]);

  const loadUnreadMessagesCount = useCallback(async () => {
    try {
      console.log(`🔔 TripCard: Loading unread count for trip ${trip.id}`);
      const { data, error } = await supabase.rpc('get_unread_messages_count', {
        p_trip_id: trip.id,
      });

      if (error) throw error;

      const count = data || 0;
      console.log(`🔔 TripCard: Unread count for trip ${trip.id}: ${count}`);
      setUnreadMessagesCount(count);
    } catch (error) {
      console.error('TripCard: Error loading unread messages count:', error);
      setUnreadMessagesCount(0);
    }
  }, [trip.id]);

  const loadTripData = useCallback(async () => {
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
            full_address: place.full_address,
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
  }, [trip.id]);

  const loadOwnerProfile = useCallback(async () => {
    try {
      // 1) Intentar resolver vía RPC tipado (bypassa RLS y trae profile del owner)
      try {
        const team = await (await import('~/lib/teamHelpers')).getTripWithTeamRPC(trip.id);
        if (team?.owner) {
          setOwnerProfile({
            id: team.owner.id,
            full_name: team.owner.full_name,
            avatar_url: team.owner.avatar_url,
            email: team.owner.email,
          });
          // Si falta owner_id en el trip recibido, persistirlo localmente para filtros/igualdad
          if (!trip.owner_id) {
            setCurrentTrip((prev) => ({ ...prev, owner_id: team.owner!.id }));
          }
          return;
        }
      } catch (e) {
        console.warn(
          'TripCard.loadOwnerProfile: RPC getTripWithTeamRPC failed, fallback to direct profile',
          e
        );
      }

      // 2) Fallback a consulta directa si no hay RPC o vino vacío
      const ownerId = trip.owner_id || trip.user_id;
      if (!ownerId || ownerId === 'null') {
        console.warn('TripCard: No owner ID found for trip', trip.id);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('id', ownerId)
        .maybeSingle();

      if (error) {
        console.error('Error loading owner profile:', error);
        return;
      }

      if (profile) {
        console.log('🔍 TripCard: Owner profile loaded (fallback):', {
          id: profile.id,
          full_name: profile.full_name,
          has_avatar: !!profile.avatar_url,
          avatar_url: profile.avatar_url,
          email: profile.email,
        });
        setOwnerProfile(profile);
      } else {
        console.warn('TripCard: Owner profile not found for owner_id', ownerId);
      }
    } catch (error) {
      console.error('Error loading owner profile:', error);
    }
  }, [trip.id, trip.owner_id, trip.user_id]);

  const deriveCurrentRole = useCallback(async () => {
    try {
      const role = await resolveCurrentUserRoleForTripId(currentTrip.id);
      setCurrentRole(role);
    } catch (e) {
      console.warn('TripCard deriveCurrentRole failed, defaulting to viewer', e);
      setCurrentRole('viewer');
    }
  }, [currentTrip.id]);

  useEffect(() => {
    loadTripData();
    loadOwnerProfile();
    deriveCurrentRole();
    fetchPendingInvites();
    loadUnreadMessagesCount();
  }, [
    trip.id,
    loadTripData,
    loadOwnerProfile,
    deriveCurrentRole,
    fetchPendingInvites,
    loadUnreadMessagesCount,
  ]);

  // Realtime subscription to reflect collaborator role & invitations changes promptly
  useEffect(() => {
    let channel: any;
    (async () => {
      try {
        channel = supabase
          .channel(`tripcard-role-${trip.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trip_collaborators',
              filter: `trip_id=eq.${trip.id}`,
            },
            () => {
              // Re-derive role and possibly stats (collaborators count)
              deriveCurrentRole();
              loadTripData();
            }
          )
          // Refresh this card when the trip row itself is updated (e.g., title, dates, budget)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'trips',
              filter: `id=eq.${trip.id}`,
            },
            async () => {
              try {
                const { data: updated, error: updErr } = await supabase
                  .from('trips')
                  .select(
                    'id, title, description, start_date, end_date, status, user_id, owner_id, budget, accommodation_preference, transport_preference, timezone, created_at, updated_at'
                  )
                  .eq('id', trip.id)
                  .maybeSingle();
                if (!updErr && updated) {
                  setCurrentTrip(updated as any);
                }
                // Also refresh stats that may depend on dates
                loadTripData();
              } catch {
                // non-blocking
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trip_invitations',
              filter: `trip_id=eq.${trip.id}`,
            },
            () => {
              fetchPendingInvites();
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('TripCard realtime subscription failed', e);
      }
    })();
    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // Ignore cleanup errors on unmount
      }
    };
  }, [trip.id, deriveCurrentRole, loadTripData, fetchPendingInvites]);

  // Realtime subscription específica para mensajes no leídos
  useEffect(() => {
    console.log(`🔔 TripCard: Setting up messages channel for trip ${trip.id}`);
    const messagesChannel = supabase
      .channel(`tripcard-messages-${trip.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${trip.id}`,
        },
        (payload) => {
          console.log(
            `🔔 TripCard: trip_messages ${payload.eventType} detected for trip ${trip.id}`
          );
          loadUnreadMessagesCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_message_reads',
          filter: `trip_id=eq.${trip.id}`,
        },
        (payload) => {
          console.log(
            `🔔 TripCard: trip_message_reads ${payload.eventType} detected for trip ${trip.id}`
          );
          loadUnreadMessagesCount();
        }
      )
      .subscribe((status) => {
        console.log(`🔔 TripCard: Messages channel status for trip ${trip.id}:`, status);
      });

    return () => {
      console.log(`🔔 TripCard: Cleaning up messages channel for trip ${trip.id}`);
      supabase.removeChannel(messagesChannel);
    };
  }, [trip.id, loadUnreadMessagesCount]);

  // Actualizar el trip local cuando se recibe una nueva prop
  useEffect(() => {
    setCurrentTrip(trip);
  }, [trip]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTripStatus = () => {
    if (!currentTrip.start_date || !currentTrip.end_date) return 'planning';

    const now = new Date();
    const startDate = parseLocalDate(currentTrip.start_date);
    const endDate = parseLocalDate(currentTrip.end_date);

    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'traveling';
    if (now > endDate) return 'completed';

    return 'planning';
  };

  const getRoleConfig = () => {
    const role = currentRole;
    const configs: Record<
      'owner' | 'editor' | 'viewer',
      { bgColor: string; textColor: string; label: string }
    > = {
      owner: { bgColor: '#FEF3C7', textColor: '#92400E', label: t('trips.card.role.owner') },
      editor: { bgColor: '#DBEAFE', textColor: '#1E40AF', label: t('trips.card.role.editor') },
      viewer: { bgColor: '#E5E7EB', textColor: '#374151', label: t('trips.card.role.viewer') },
    };
    return configs[role];
  };

  const getStatusConfig = () => {
    const status = getTripStatus();
    const configs = {
      completed: {
        text: t('trips.card.status.completed'),
        bgColor: '#DCFCE7', // bg-green-100
        textColor: '#166534', // text-green-800
      },
      upcoming: {
        text: t('trips.card.status.upcoming'),
        bgColor: '#DBEAFE', // bg-blue-100
        textColor: '#1E40AF', // text-blue-800
      },
      planning: {
        text: t('trips.card.status.planning'),
        bgColor: '#F3E8FF', // bg-purple-100
        textColor: '#6B21A8', // text-purple-800
      },
      traveling: {
        text: t('trips.card.status.traveling'),
        bgColor: '#FED7AA', // bg-orange-100
        textColor: '#C2410C', // text-orange-800
      },
      default: {
        text: t('trips.card.status.no_status'),
        bgColor: '#F3F4F6', // bg-gray-100
        textColor: '#374151', // text-gray-800
      },
    };

    return configs[status as keyof typeof configs] || configs.default;
  };

  const getCountryFlags = () => {
    if (tripData.countryCodes.length === 0) return [];

    return tripData.countryCodes.map((code) => getCountryFlag(code));
  };

  const getFirstCountryFlag = () => {
    if (tripData.countryCodes.length === 0) return '🌍';
    return getCountryFlag(tripData.countryCodes[0]);
  };

  const getFirstCountryImage = () => {
    return tripData.firstPlaceImage;
  };

  const getUserInitials = (fullName?: string, email?: string) => {
    // MISMA LÓGICA QUE PROFILE.TSX
    if (fullName && fullName.trim()) {
      return fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }

    // Fallback: usar email
    if (email && email.trim()) {
      return email.split('@')[0].substring(0, 2).toUpperCase();
    }

    return 'U';
  };

  const renderOwnerAvatar = () => {
    // Usar siempre el estado local actualizado del trip
    const ownerId = currentTrip.owner_id || currentTrip.user_id;
    const isCurrentUserOwner = user?.id === ownerId;

    console.log('�🔴🔴 AVATAR FIX v2:', {
      isCurrentUserOwner,
      userId: user?.id,
      ownerId,
      hasCurrentUserProfile: !!currentUserProfile,
      currentUserAvatarUrl: currentUserProfile?.avatar_url,
      currentUserFullName: currentUserProfile?.full_name,
      hasOwnerProfile: !!ownerProfile,
      ownerProfileAvatarUrl: ownerProfile?.avatar_url,
      ownerProfileFullName: ownerProfile?.full_name,
    });

    // ALWAYS use RTK Query for current user, regardless of ownerProfile
    let avatarUrl: string | undefined;
    let fullName: string | undefined;
    let initials = 'U';

    // Use currentUserProfile if:
    // 1. It's the current user's trip (isCurrentUserOwner is true), OR
    // 2. Trip has no owner AND we have currentUserProfile data (fallback for trips missing owner_id)
    const shouldUseCurrentUser =
      isCurrentUserOwner || (!ownerId && !ownerProfile && currentUserProfile);

    if (shouldUseCurrentUser && currentUserProfile) {
      // Current user: ALWAYS use RTK Query (like profile.tsx does)
      avatarUrl = currentUserProfile.avatar_url;
      fullName = currentUserProfile.full_name;

      console.log('🟢 Using currentUserProfile:', { avatarUrl, fullName });

      if (fullName) {
        initials = fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
      }
    } else if (ownerProfile) {
      // Other user: use ownerProfile from getTripWithTeam
      avatarUrl = ownerProfile.avatar_url;
      fullName = ownerProfile.full_name;

      console.log('🟡 Using ownerProfile:', { avatarUrl, fullName });

      if (fullName) {
        initials = fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
      }
    }

    console.log('� Final avatar data:', { avatarUrl, fullName, initials });

    // Render image if we have URL
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
          }}
          onError={(error) => {
            console.error('🔴 Avatar image failed to load:', avatarUrl, error);
          }}
        />
      );
    }

    // Fallback: LinearGradient with initials (like profile.tsx)
    return (
      <LinearGradient
        colors={['#4F8EF7', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: 12,
          }}
        >
          {initials}
        </Text>
      </LinearGradient>
    );
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
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 20,
          gap: 6,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: '#666666',
            fontWeight: '500',
            marginRight: 8,
          }}
        >
          {t('trips.card.destinations')}
        </Text>

        {displayCountries.map((countryCode, index) => {
          const countryName = getCountryName(countryCode);
          const flag = getCountryFlag(countryCode);

          return (
            <View
              key={`${countryCode}-${index}`}
              style={{
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
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 14, marginRight: 4 }}>{flag}</Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#374151',
                  fontWeight: '600',
                  letterSpacing: 0.2,
                }}
              >
                {countryName || countryCode}
              </Text>
            </View>
          );
        })}

        {remainingCount > 0 && (
          <View
            style={{
              backgroundColor: 'rgba(156, 163, 175, 0.15)',
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: 'rgba(156, 163, 175, 0.2)',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#6B7280',
                fontWeight: '600',
                letterSpacing: 0.2,
              }}
            >
              +{remainingCount} {t('trips.card.more')}
            </Text>
          </View>
        )}
      </View>
    );
  };
  const getTripType = () => {
    return tripData.collaboratorsCount > 1
      ? t('trips.card.type.group')
      : t('trips.card.type.individual');
  };

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
        marginBottom: 24,
      }}
    >
      {/* Header con imagen de país de fondo y overlay de texto */}
      <View
        style={{
          width: '100%',
          height: 120,
          position: 'relative',
          overflow: 'hidden',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        {/* Imagen de fondo del país */}
        {tripData.countryCodes.length > 0 && getCountryImage(tripData.countryCodes[0]) && (
          <Image
            source={{ uri: getCountryImage(tripData.countryCodes[0]) }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
            resizeMode="cover"
          />
        )}

        {/* Overlay con gradiente para mejorar legibilidad del texto */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Contenido superpuesto: bandera y nombre del país */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {tripData.countryCodes.length > 0 && (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 32,
                  marginBottom: 8,
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {getFirstCountryFlag()}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  textAlign: 'center',
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 4,
                  letterSpacing: 1,
                }}
              >
                {getCountryName(tripData.countryCodes[0]) || tripData.countryCodes[0]}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Contenido del Trip */}
      <View style={{ padding: 20 }}>
        {/* Título y Estado */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: '#1A1A1A',
                marginBottom: 4,
              }}
            >
              {currentTrip.title || t('trips.card.no_title')}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 16, color: '#8B5CF6', marginRight: 8 }}>👥</Text>
              <TouchableOpacity
                onPress={() => {
                  if (tripData.collaboratorsCount > 1) {
                    setShowGroupModal(true);
                  }
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor:
                    tripData.collaboratorsCount > 1 ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  borderRadius: 8,
                  borderWidth: tripData.collaboratorsCount > 1 ? 1 : 0,
                  borderColor: tripData.collaboratorsCount > 1 ? '#8B5CF6' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: '#8B5CF6',
                    fontWeight: '600',
                  }}
                >
                  {getTripType()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Badges: estado + rol */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                backgroundColor: getStatusConfig().bgColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                marginLeft: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: getStatusConfig().textColor,
                }}
              >
                {getStatusConfig().text}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: getRoleConfig().bgColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: getRoleConfig().textColor,
                }}
              >
                {getRoleConfig().label}
              </Text>
            </View>
          </View>
        </View>

        {/* Países/Destinos - solo si hay lugares */}
        {tripData.countries.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {tripData.countries.map((country, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: '#EBF4FF',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#007AFF',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#007AFF',
                    }}
                  >
                    {getCountryFlags()[index] || '🌍'} {country}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Fechas - con fallback "Fechas por confirmar" */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 8 }}>📅</Text>
          <Text
            style={{
              fontSize: 16,
              color: '#1A1A1A',
              fontWeight: '500',
            }}
          >
            {currentTrip.start_date && currentTrip.end_date
              ? `${formatDate(currentTrip.start_date)} - ${formatDate(currentTrip.end_date)}`
              : t('trips.card.dates_to_confirm')}
          </Text>
        </View>

        {/* Viajeros y Lugares */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>👥</Text>
            <Text style={{ fontSize: 16, color: '#1A1A1A', fontWeight: '500' }}>
              {tripData.collaboratorsCount}{' '}
              {tripData.collaboratorsCount === 1
                ? t('trips.card.traveler')
                : t('trips.card.travelers')}
            </Text>
            {pendingInvites > 0 && (
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: '#F59E0B',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {pendingInvites}
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
            <Text
              style={{
                fontSize: 16,
                color: '#1A1A1A',
                fontWeight: '500',
              }}
            >
              {tripData.placesCount}{' '}
              {tripData.placesCount === 1 ? t('trips.card.place') : t('trips.card.places')}
            </Text>
          </View>
        </View>

        {/* Miembros del Equipo con avatares reales */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: '#666666',
                fontWeight: '500',
                marginRight: 8,
              }}
            >
              {t('trips.card.team')}
            </Text>

            {/* Dueño del trip (primera posición) */}
            <View style={{ marginRight: 4 }}>{renderOwnerAvatar()}</View>

            {/* Colaboradores (excluyendo al owner para evitar duplicados) */}
            {tripData.collaborators
              .filter((collaborator) => {
                const ownerId = currentTrip.owner_id || currentTrip.user_id;
                return collaborator.id !== ownerId;
              })
              .slice(0, 2)
              .map((collaborator, index) => (
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
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#10B981',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontWeight: '700',
                          fontSize: 11,
                        }}
                      >
                        {getUserInitials(collaborator.full_name, collaborator.email)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}

            {(() => {
              // Calcular colaboradores únicos (excluyendo owner)
              const ownerId = currentTrip.owner_id || currentTrip.user_id;
              const uniqueCollaborators = tripData.collaborators.filter(
                (c) => c.id !== ownerId
              ).length;
              // Mostrar "+X más" si hay más de 2 colaboradores únicos (además del owner)
              const remaining = uniqueCollaborators - 2;

              return (
                remaining > 0 && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#666666',
                      marginLeft: 4,
                    }}
                  >
                    +{remaining} {t('trips.card.more')}
                  </Text>
                )
              );
            })()}
          </View>

          {/* Botón de Chat Rápido */}
          {tripData.collaboratorsCount > 1 && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/chat/[tripId]',
                  params: {
                    tripId: currentTrip.id,
                    tripTitle: currentTrip.title,
                  },
                })
              }
              style={{
                marginLeft: 8,
                position: 'relative',
              }}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  gap: 6,
                }}
              >
                <Ionicons name="chatbubble" size={14} color="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {t('trips.card.chat')}
                </Text>
              </LinearGradient>

              {/* Badge de notificación en esquina superior izquierda */}
              {unreadMessagesCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    left: -6,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 5,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    elevation: 5,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: '700',
                      lineHeight: 12,
                    }}
                  >
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Botones de Acción */}
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <LiquidButton
            title={t('trips.card.view_details')}
            onPress={() => setShowModal(true)}
            variant="primary"
          />

          <LiquidButton
            title={t('trips.card.view_places')}
            icon="❤️"
            onPress={() => router.push(`/trips/${trip.id}/places`)}
            variant="accent"
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <LiquidButton
            title={t('trips.card.smart_route')}
            icon="🧠"
            onPress={() => router.push(`/trips/${trip.id}/route`)}
            variant="glass"
          />

          <LiquidButton
            title={t('trips.card.accommodation')}
            icon="🏠"
            onPress={() => router.push(`/trips/${trip.id}/accommodation`)}
            variant="success"
          />
        </View>

        {/* Descripción si existe */}
        {currentTrip.description && (
          <View
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: '#F8F9FA',
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: '#666666',
                lineHeight: 20,
              }}
            >
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

      {/* Modal de opciones del grupo */}
      {tripData.collaboratorsCount > 1 && (
        <GroupOptionsModal
          visible={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          trip={currentTrip}
        />
      )}
    </View>
  );
};

export default TripCard;
