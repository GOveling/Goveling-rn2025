import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Switch,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '~/lib/supabase';
import { getTripStats, getCountryFlag, TripStats } from '~/lib/tripUtils';
import {
  getCurrentUser,
  getTripCollaborators,
  getTripOwner,
  resolveUserRoleForTrip,
  UserProfile,
} from '~/lib/userUtils';
import { getTripWithTeam, getTripWithTeamRPC } from '~/lib/teamHelpers';
import { triggerGlobalTripRefresh } from '~/lib/tripRefresh';
import EditTripModal from './EditTripModal';
import ManageTeamModal from './teams/ManageTeamModal';
import i18n from '~/i18n';

// Mapas para obtener íconos de alojamiento y transporte
const accommodationIcons: { [key: string]: string } = {
  hotel: '🏨',
  cabin: '🏘️',
  resort: '🏖️',
  hostel: '🏠',
  apartment: '🏢',
  camping: '⛺',
  rural_house: '🏡',
  other: '🏨',
};

const transportIcons: { [key: string]: string } = {
  car: '🚗',
  plane: '✈️',
  train: '🚂',
  bus: '🚌',
  metro: '🚇',
  boat: '⛵',
  bike: '🚲',
  walking: '🚶',
  other: '🚗',
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  has_defined_dates?: boolean;
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

interface TripDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  trip: TripData;
  onTripUpdate?: (updatedTrip: TripData) => void;
  initialTab?: TabType; // Support for initial tab
  openManageTeam?: boolean; // Support for opening manage team directly
  manageTeamTab?: 'members' | 'invitations' | 'history'; // Support for specific manage team tab
}

type TabType = 'overview' | 'itinerary' | 'team';

// Helper function to parse date as local time instead of UTC
const parseLocalDate = (dateString: string): Date => {
  // If the date string is just YYYY-MM-DD, we want to treat it as local time, not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  return new Date(dateString);
};

const TripDetailsModal: React.FC<TripDetailsModalProps> = ({
  visible,
  onClose,
  trip,
  onTripUpdate,
  initialTab = 'overview',
  openManageTeam = false,
  manageTeamTab = 'invitations',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [tripData, setTripData] = useState<TripStats>({
    collaboratorsCount: 1,
    placesCount: 0,
    countries: [],
    countryCodes: [],
    categories: [],
    collaborators: [],
    firstPlaceImage: undefined,
  });
  const [editableTrip, setEditableTrip] = useState<TripData>(trip);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tripOwner, setTripOwner] = useState<UserProfile | null>(null);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [hasMinimalProfiles, setHasMinimalProfiles] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageTeam, setShowManageTeam] = useState(openManageTeam);
  const [currentRole, setCurrentRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [pendingInvites, setPendingInvites] = useState(0);

  // Set initial tab and manage team state when props change
  React.useEffect(() => {
    setActiveTab(initialTab);
    setShowManageTeam(openManageTeam);
  }, [initialTab, openManageTeam]);

  const fetchPendingInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_invitations')
        .select('id')
        .eq('trip_id', trip.id);
      if (error) throw error;
      setPendingInvites(data?.length || 0);
    } catch (e) {
      console.warn('⚠️ TripDetailsModal: Failed to fetch pending invites', e);
    }
  };

  useEffect(() => {
    if (visible && trip.id) {
      loadTripStats();
      loadUsers();
      fetchPendingInvites();
      setEditableTrip(trip);

      // Suscripciones en tiempo real para colaboradores e invitaciones
      const channel = supabase
        .channel(`trip-details-team-${trip.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trip_collaborators',
            filter: `trip_id=eq.${trip.id}`,
          },
          () => {
            console.log('🔄 TripDetailsModal: Collaborators changed, reloading users & stats...');
            loadUsers();
            loadTripStats();
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
            console.log('🔄 TripDetailsModal: Invitations changed, reloading pending invites...');
            fetchPendingInvites();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [visible, trip.id]);

  const loadTripStats = async () => {
    try {
      const stats = await getTripStats(trip.id);
      setTripData(stats);
    } catch (error) {
      console.error('Error loading trip stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('🔄 TripDetailsModal: Loading users (unified) for trip:', trip.id);
      const user = await getCurrentUser();
      const useRPC = true; // flag to enable RPC path if function deployed
      const team = useRPC ? await getTripWithTeamRPC(trip.id) : await getTripWithTeam(trip.id);

      setCurrentUser(user);
      setTripOwner(team.owner);
      setCollaborators(team.collaborators);

      // Detect minimal profiles (sin full_name y sin avatar_url)
      const minimal = team.collaborators.some((c) => !c.full_name && !c.avatar_url);
      setHasMinimalProfiles(minimal);

      console.log('🔍 TripDetailsModal: Trip prop data:', {
        'trip.id': trip.id,
        'trip.owner_id': trip.owner_id,
        'trip.user_id': trip.user_id,
        'trip.title': trip.title,
      });

      console.log('🔍 TripDetailsModal: Team data:', {
        'team.owner': team.owner,
        'team.owner?.id': team.owner?.id,
        'team.collaborators.length': team.collaborators.length,
      });

      const ownerId = team.owner?.id || trip.owner_id || trip.user_id || null;

      // 🔥 FIX: If ownerId is still null but user exists, assume current user is owner
      // This handles cases where trip lacks owner_id/user_id but is in user's trip list
      const effectiveOwnerId = ownerId || user?.id || null;

      const resolved = await resolveUserRoleForTrip(user?.id, {
        id: trip.id,
        owner_id: effectiveOwnerId,
        user_id: trip.user_id ?? null,
      });
      const finalRole =
        user?.id && effectiveOwnerId && user.id === effectiveOwnerId ? 'owner' : resolved;

      console.log('🔑 TripDetailsModal: Role resolution (unified):', {
        userId: user?.id,
        ownerId,
        effectiveOwnerId,
        'team.owner?.id': team.owner?.id,
        'trip.owner_id': trip.owner_id,
        'trip.user_id': trip.user_id,
        resolved,
        finalRole,
        'user.id === effectiveOwnerId': user?.id === effectiveOwnerId,
      });
      setCurrentRole(finalRole);
    } catch (error) {
      console.error('❌ TripDetailsModal: Error loading users (unified):', error);
    }
  };

  const updateTrip = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          title: editableTrip.title,
          description: editableTrip.description,
          start_date: editableTrip.start_date,
          end_date: editableTrip.end_date,
          budget: editableTrip.budget,
          accommodation_preference: editableTrip.accommodation_preference,
          transport_preference: editableTrip.transport_preference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trip.id);

      if (error) {
        Alert.alert('Error', 'No se pudo actualizar el viaje');
        return;
      }

      setIsEditing(false);
      onTripUpdate?.(editableTrip);

      // Trigger global trip refresh for CurrentTripCard
      console.log('🔄 TripDetailsModal: Trip updated, triggering global refresh');
      triggerGlobalTripRefresh();

      Alert.alert('Éxito', 'Viaje actualizado correctamente');
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', 'Ocurrió un error al actualizar el viaje');
    } finally {
      setLoading(false);
    }
  };

  const handleTripUpdate = (updatedTrip: TripData) => {
    setEditableTrip(updatedTrip);
    onTripUpdate?.(updatedTrip);
    // Recargar los datos del viaje
    loadTripStats();
  };

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
    if (!editableTrip.start_date || !editableTrip.end_date) return 'Planning';

    const now = new Date();
    const startDate = parseLocalDate(editableTrip.start_date);
    const endDate = parseLocalDate(editableTrip.end_date);

    if (now < startDate) return 'Upcoming';
    if (now >= startDate && now <= endDate) return 'Traveling';
    if (now > endDate) return 'Completed';

    return 'Planning';
  };

  const getStatusConfig = () => {
    const status = getTripStatus();
    const configs = {
      Completed: { bgColor: '#DCFCE7', textColor: '#166534' },
      Upcoming: { bgColor: '#DBEAFE', textColor: '#1E40AF' },
      Planning: { bgColor: '#F3E8FF', textColor: '#6B21A8' },
      Traveling: { bgColor: '#FED7AA', textColor: '#C2410C' },
    };
    return configs[status as keyof typeof configs] || configs.Planning;
  };

  const getRoleConfig = () => {
    const role = currentRole;
    const configs: Record<
      'owner' | 'editor' | 'viewer',
      { bgColor: string; textColor: string; label: string }
    > = {
      owner: { bgColor: '#FEF3C7', textColor: '#92400E', label: 'Owner' },
      editor: { bgColor: '#DBEAFE', textColor: '#1E40AF', label: 'Editor' },
      viewer: { bgColor: '#E5E7EB', textColor: '#374151', label: 'Viewer' },
    };
    return configs[role];
  };

  const getUserInitials = (fullName?: string, email?: string) => {
    const src = fullName && fullName.trim().length > 0 ? fullName : email || 'User';
    const from = src.trim();
    if (from.length === 0) return 'U';
    const parts = from.split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const TabButton = ({ tab, title }: { tab: TabType; title: string }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      style={{
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: activeTab === tab ? 2 : 0,
        borderBottomColor: '#3B82F6',
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: activeTab === tab ? '600' : '400',
          color: activeTab === tab ? '#3B82F6' : '#6B7280',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const OverviewTab = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      {/* Header con badges: estado del viaje + rol del usuario */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>
            {editableTrip.title}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              backgroundColor: getStatusConfig().bgColor,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: getStatusConfig().textColor,
              }}
            >
              {getTripStatus()}
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

      {/* Fechas */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
            Dates
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {editableTrip.start_date && editableTrip.end_date
            ? `${formatDate(editableTrip.start_date)} - ${formatDate(editableTrip.end_date)}`
            : 'No dates set'}
        </Text>
      </View>

      {/* Viajeros + Invitaciones pendientes */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="people-outline" size={20} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
            Travelers
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
                {pendingInvites} pending
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {tripData.collaboratorsCount}{' '}
          {tripData.collaboratorsCount === 1 ? 'traveler' : 'travelers'}
        </Text>
      </View>

      {/* Destino */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="location-outline" size={20} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
            Destination
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {tripData.countries.length > 0 ? tripData.countries.join(', ') : 'To be defined'}
        </Text>
      </View>

      {/* Budget */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="card-outline" size={20} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
            Budget
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          {editableTrip.budget ? `$${editableTrip.budget.toLocaleString()}` : 'No budget set'}
        </Text>
      </View>

      {/* Accommodation */}
      {editableTrip.accommodation_preference && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="bed-outline" size={20} color="#6B7280" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
              Accommodation
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {editableTrip.accommodation_preference.split(',').map((acc, index) => {
              const trimmedAcc = acc.trim();
              const icon = accommodationIcons[trimmedAcc] || '🏨';
              return (
                <View
                  key={index}
                  style={{
                    backgroundColor: '#F3F4F6',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    marginRight: 8,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{icon}</Text>
                  <Text style={{ fontSize: 14, color: '#374151', fontWeight: '500' }}>
                    {trimmedAcc.charAt(0).toUpperCase() + trimmedAcc.slice(1)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Transport */}
      {editableTrip.transport_preference && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="car-outline" size={20} color="#6B7280" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
              Transport
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {editableTrip.transport_preference.split(',').map((transport, index) => {
              const trimmedTransport = transport.trim();
              const icon = transportIcons[trimmedTransport] || '🚗';
              return (
                <View
                  key={index}
                  style={{
                    backgroundColor: '#F3F4F6',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    marginRight: 8,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{icon}</Text>
                  <Text style={{ fontSize: 14, color: '#374151', fontWeight: '500' }}>
                    {trimmedTransport.charAt(0).toUpperCase() + trimmedTransport.slice(1)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Descripción */}
      {editableTrip.description && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
            Description
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280', lineHeight: 24 }}>
            {editableTrip.description}
          </Text>
        </View>
      )}

      {/* Botón de editar - Solo para propietario y editores */}
      {(() => {
        console.log('🎯 TripDetailsModal: Checking Edit Button visibility:', {
          currentRole,
          shouldShow: currentRole === 'owner' || currentRole === 'editor',
          isOwner: currentRole === 'owner',
          isEditor: currentRole === 'editor',
        });
        return currentRole === 'owner' || currentRole === 'editor';
      })() && (
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={{ marginTop: 20 }}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="pencil" size={20} color="white" />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                Edit Trip
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const TeamTab = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 20 }}>
        Trip Collaborators
      </Text>

      {hasMinimalProfiles && (
        <View
          style={{
            backgroundColor: '#FFF7ED',
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: '#FDBA74',
            marginBottom: 20,
            flexDirection: 'row',
          }}
        >
          <Ionicons
            name="warning-outline"
            size={22}
            color="#EA580C"
            style={{ marginRight: 10, marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#9A3412', marginBottom: 4 }}>
              Perfiles incompletos
            </Text>
            <Text style={{ fontSize: 13, color: '#9A3412', lineHeight: 18 }}>
              Uno o más colaboradores aún no completan su perfil (sin nombre ni avatar). Invítalos a
              actualizarlo para una mejor experiencia.
            </Text>
          </View>
        </View>
      )}

      {/* Owner */}
      {tripOwner && (
        <View
          style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#F59E0B',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {tripOwner.avatar_url ? (
              <Image
                source={{ uri: tripOwner.avatar_url }}
                style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
              />
            ) : (
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#F59E0B',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  {getUserInitials(tripOwner.full_name, tripOwner.email)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                {tripOwner.full_name || tripOwner.email || 'Owner'}
                {currentUser?.id === tripOwner.id && ' (You)'}
              </Text>
              {tripOwner.full_name && tripOwner.email && (
                <Text style={{ fontSize: 14, color: '#6B7280' }}>{tripOwner.email}</Text>
              )}
            </View>
            <View
              style={{
                backgroundColor: '#F59E0B',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Owner</Text>
            </View>
          </View>
        </View>
      )}

      {/* Colaboradores */}
      {(() => {
        console.log('🎭 TeamTab: About to render collaborators:', {
          collaborators_count: collaborators?.length || 0,
          collaborators_data: collaborators,
          trip_id: trip?.id,
        });
        return null;
      })()}

      {collaborators.map((collaborator) => (
        <View
          key={collaborator.id}
          style={{
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {collaborator.avatar_url ? (
              <Image
                source={{ uri: collaborator.avatar_url }}
                style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
              />
            ) : (
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#6B7280',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  {getUserInitials(collaborator.full_name, collaborator.email)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                {collaborator.full_name || collaborator.email || 'Collaborator'}
                {currentUser?.id === collaborator.id && ' (You)'}
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>
                {(collaborator as any).role === 'editor' ? 'Editor' : 'Viewer'}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* Mensaje si no hay colaboradores */}
      {collaborators.length === 0 && (
        <View
          style={{
            backgroundColor: '#F3F4F6',
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Ionicons name="people-outline" size={32} color="#9CA3AF" />
          <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
            No collaborators yet
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' }}>
            Invite friends to plan together
          </Text>
        </View>
      )}

      {/* Botones de acción */}
      <View style={{ gap: 12, marginTop: 20 }}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Chat Grupal', 'Funcionalidad de chat próximamente disponible')
          }
        >
          <LinearGradient
            colors={['#3B82F6', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="chatbubble-outline" size={20} color="white" />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                Chat Grupal
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowManageTeam(true)}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people" size={20} color="white" />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                {i18n.t('trips.manageTeam', 'Manage Team')}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const ItineraryTab = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Ionicons name="map-outline" size={64} color="#D1D5DB" />
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#6B7280',
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        Itinerary Coming Soon
      </Text>
      <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
        Plan your day-by-day activities and routes
      </Text>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'team':
        return <TeamTab />;
      case 'itinerary':
        return <ItineraryTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>🌍</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>{trip.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Sub-header con información básica */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>
                {editableTrip.start_date && editableTrip.end_date
                  ? `${formatDate(editableTrip.start_date)} - ${formatDate(editableTrip.end_date)}`
                  : 'No dates set'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={16} color="#6B7280" />
              <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>
                {tripData.collaboratorsCount} traveler{tripData.collaboratorsCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}
        >
          <TabButton tab="overview" title="Overview" />
          <TabButton tab="itinerary" title="Itinerary" />
          <TabButton tab="team" title="Team" />
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </View>

      {/* Edit Trip Modal */}
      <EditTripModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        trip={editableTrip}
        onTripUpdated={handleTripUpdate}
      />

      {/* Manage Team Modal */}
      <ManageTeamModal
        visible={showManageTeam}
        onClose={() => setShowManageTeam(false)}
        tripId={trip.id}
        initialTab={manageTeamTab}
        onChanged={() => {
          // Refresh team-related data
          loadTripStats();
          loadUsers();
        }}
      />
    </Modal>
  );
};

export default TripDetailsModal;
