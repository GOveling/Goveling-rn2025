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
  StyleSheet,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { supabase } from '~/lib/supabase';
import { getTripWithTeam, getTripWithTeamRPC } from '~/lib/teamHelpers';
import { useTheme } from '~/lib/theme';
import { triggerGlobalTripRefresh } from '~/lib/tripRefresh';
import { getTripStats, getCountryFlag, TripStats } from '~/lib/tripUtils';
import {
  getCurrentUser,
  getTripCollaborators,
  getTripOwner,
  resolveUserRoleForTrip,
  UserProfile,
} from '~/lib/userUtils';
import { tripsApi } from '~/store/api/tripsApi';
import { useAppDispatch } from '~/store/hooks';

import EditTripModal from './EditTripModal';
import ManageTeamModal from './teams/ManageTeamModal';

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
  manageTeamTab = 'members',
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const router = useRouter();
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

  // Estados para el chat grupal
  const [unreadMessagesCount] = useState(0);

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
        .eq('trip_id', trip.id)
        .eq('status', 'pending'); // Solo contar invitaciones pendientes
      if (error) throw error;
      setPendingInvites(data?.length || 0);
    } catch (e) {
      console.warn('⚠️ TripDetailsModal: Failed to fetch pending invites', e);
    }
  };

  // 🔄 Refresh fresh trip data from DB when modal opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (visible && trip.id) {
      const refreshTripData = async () => {
        try {
          const { data: freshTrip, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', trip.id)
            .single();

          if (error) {
            console.warn('⚠️ TripDetailsModal: Failed to fetch fresh trip data', error);
            return;
          }

          if (freshTrip) {
            console.log('🔄 TripDetailsModal: Fetched fresh trip data from DB:', {
              id: freshTrip.id,
              title: freshTrip.title,
              description: freshTrip.description,
              start_date: freshTrip.start_date,
              end_date: freshTrip.end_date,
              budget: freshTrip.budget,
              accommodation_preference: freshTrip.accommodation_preference,
              transport_preference: freshTrip.transport_preference,
              has_defined_dates: freshTrip.has_defined_dates,
              updated_at: freshTrip.updated_at,
            });
            setEditableTrip(freshTrip as TripData);
          }
        } catch (e) {
          console.error('❌ TripDetailsModal: Error refreshing trip data', e);
        }
      };

      refreshTripData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (visible && trip.id) {
      loadTripStats();
      loadUsers();
      fetchPendingInvites();
      setEditableTrip(trip);

      // Suscripciones en tiempo real para colaboradores, invitaciones y cambios del viaje
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
        // NEW: Listen to trips table updates for THIS trip
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trips',
            filter: `id=eq.${trip.id}`,
          },
          (payload) => {
            console.log(
              '🔄 TripDetailsModal: Trip updated via realtime, refreshing editableTrip...',
              payload.new
            );
            const updatedTripRow = payload.new as TripData;
            if (updatedTripRow) {
              setEditableTrip(updatedTripRow);
              // Also trigger stats reload to reflect any data changes
              loadTripStats();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      let team = useRPC ? await getTripWithTeamRPC(trip.id) : await getTripWithTeam(trip.id);

      // Fallback: if RPC didn't include owner profile, resolve via standard helper
      if (!team.owner) {
        console.warn('👤 TripDetailsModal: RPC owner missing, resolving owner via getTripOwner');
        const fallbackOwner = await getTripOwner(trip.id);
        team = { ...team, owner: fallbackOwner } as typeof team;
      }

      // Fallback: if RPC returned no collaborators, try standard method
      if (!team.collaborators || team.collaborators.length === 0) {
        console.warn(
          '👥 TripDetailsModal: RPC collaborators empty, resolving collaborators via getTripWithTeam'
        );
        const fallbackTeam = await getTripWithTeam(trip.id);
        team = { ...team, collaborators: fallbackTeam.collaborators } as typeof team;
      }

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
        Alert.alert(
          t('trips.detail_modal.alerts.error_title', 'Error'),
          t('trips.detail_modal.alerts.update_error', 'Could not update the trip')
        );
        return;
      }

      setIsEditing(false);
      onTripUpdate?.(editableTrip);

      // Trigger global trip refresh for CurrentTripCard
      console.log('🔄 TripDetailsModal: Trip updated, triggering global refresh');
      triggerGlobalTripRefresh();

      Alert.alert(
        t('trips.detail_modal.alerts.success_title', 'Success'),
        t('trips.detail_modal.alerts.update_success', 'Trip updated successfully')
      );
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert(
        t('trips.detail_modal.alerts.error_title', 'Error'),
        t('trips.detail_modal.alerts.general_error', 'An error occurred while updating the trip')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTripUpdate = (updatedTrip: TripData) => {
    console.log('📝 TripDetailsModal.handleTripUpdate: Called with updated trip:', {
      id: updatedTrip.id,
      title: updatedTrip.title,
      startDate: updatedTrip.start_date,
      endDate: updatedTrip.end_date,
      budget: updatedTrip.budget,
    });
    setEditableTrip(updatedTrip);
    onTripUpdate?.(updatedTrip);

    // Invalidate RTK Query cache for immediate updates across all components
    console.log('🔄 TripDetailsModal.handleTripUpdate: Invalidating RTK Query cache');
    dispatch(
      tripsApi.util.invalidateTags([
        'TripBreakdown',
        'Trips',
        { type: 'TripDetails', id: updatedTrip.id },
      ])
    );

    // Trigger global trip refresh for CurrentTripCard
    console.log('🔄 TripDetailsModal.handleTripUpdate: Triggering global refresh');
    triggerGlobalTripRefresh();

    // Recargar los datos del viaje
    console.log('📝 TripDetailsModal.handleTripUpdate: Calling loadTripStats...');
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

  const getTripStatus = (): 'completed' | 'upcoming' | 'planning' | 'traveling' => {
    if (!editableTrip.start_date || !editableTrip.end_date) return 'planning';

    const now = new Date();
    const startDate = parseLocalDate(editableTrip.start_date);
    const endDate = parseLocalDate(editableTrip.end_date);

    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'traveling';
    if (now > endDate) return 'completed';

    return 'planning';
  };

  const getStatusConfig = () => {
    const status = getTripStatus();
    const configs = {
      completed: { bgColor: '#DCFCE7', textColor: '#166534' },
      upcoming: { bgColor: '#DBEAFE', textColor: '#1E40AF' },
      planning: { bgColor: '#F3E8FF', textColor: '#6B21A8' },
      traveling: { bgColor: '#FED7AA', textColor: '#C2410C' },
    };
    return configs[status] || configs.planning;
  };

  const getRoleConfig = () => {
    const role = currentRole;
    const configs: Record<
      'owner' | 'editor' | 'viewer',
      { bgColor: string; textColor: string; label: string }
    > = {
      owner: {
        bgColor: '#FED7AA',
        textColor: '#C2410C',
        label: t('trips.card.role.owner', 'Owner'),
      },
      editor: {
        bgColor: '#DBEAFE',
        textColor: '#1E40AF',
        label: t('trips.card.role.editor', 'Editor'),
      },
      viewer: {
        bgColor: '#E5E7EB',
        textColor: '#374151',
        label: t('trips.card.role.viewer', 'Viewer'),
      },
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
      style={[styles.tab, activeTab === tab && styles.tabActive]}
    >
      <Text
        style={[styles.tabText, activeTab === tab ? styles.tabTextActive : styles.tabTextInactive]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const OverviewTab = () => (
    <ScrollView style={styles.scrollViewContainer}>
      {/* Header con badges: estado del viaje + rol del usuario */}
      <View style={styles.overviewHeaderRow}>
        <View style={styles.overviewTitleContainer}>
          <Text style={styles.overviewTitle}>{editableTrip.title}</Text>
        </View>
        <View style={styles.overviewButtonsRow}>
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
              {t(`trips.card.status.${getTripStatus()}`, getTripStatus())}
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('trips.detail_modal.overview.dates', 'Dates')}
          </Text>
        </View>
        <Text style={[styles.sectionContent, { color: theme.colors.textMuted }]}>
          {editableTrip.start_date && editableTrip.end_date
            ? `${formatDate(editableTrip.start_date)} - ${formatDate(editableTrip.end_date)}`
            : t('trips.detail_modal.overview.no_dates_set', 'No dates set')}
        </Text>
      </View>

      {/* Viajeros + Invitaciones pendientes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={20} color={theme.colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('trips.detail_modal.overview.travelers', 'Travelers')}
          </Text>
          {pendingInvites > 0 && (
            <View style={styles.pendingBadgeContainer}>
              <Text style={styles.pendingBadgeText}>
                {pendingInvites} {t('trips.detail_modal.overview.pending', 'pending')}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.sectionContent, { color: theme.colors.textMuted }]}>
          {tripData.collaboratorsCount}{' '}
          {tripData.collaboratorsCount === 1
            ? t('trips.detail_modal.overview.traveler', 'traveler')
            : t('trips.detail_modal.overview.travelers', 'travelers')}
        </Text>
      </View>

      {/* Equipo: Avatares + Botón Chat */}
      <View style={styles.teamSection}>
        <View style={styles.teamHeader}>
          <Text style={styles.teamLabel}>
            {t('trips.detail_modal.overview.team_label', 'Team:')}
          </Text>
          <View style={styles.teamAvatarsContainer}>
            {tripOwner && (
              <View style={styles.teamAvatar}>
                {tripOwner.avatar_url ? (
                  <Image source={{ uri: tripOwner.avatar_url }} style={styles.teamAvatarImage} />
                ) : (
                  <View style={styles.teamAvatarPlaceholder}>
                    <Text style={styles.teamAvatarInitials}>
                      {getUserInitials(tripOwner.full_name, tripOwner.email)}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {collaborators.slice(0, 3).map((collaborator) => (
              <View key={collaborator.id} style={styles.teamAvatar}>
                {collaborator.avatar_url ? (
                  <Image source={{ uri: collaborator.avatar_url }} style={styles.teamAvatarImage} />
                ) : (
                  <View style={styles.teamAvatarPlaceholder}>
                    <Text style={styles.teamAvatarInitials}>
                      {getUserInitials(collaborator.full_name, collaborator.email)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {collaborators.length > 3 && (
              <View style={styles.teamAvatarMore}>
                <Text style={styles.teamAvatarMoreText}>+{collaborators.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Destino */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="location-outline" size={20} color={theme.colors.textMuted} />
          <Text
            style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text, marginLeft: 8 }}
          >
            {t('trips.detail_modal.overview.destination', 'Destination')}
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: theme.colors.textMuted }}>
          {tripData.countries.length > 0
            ? tripData.countries.join(', ')
            : t('trips.detail_modal.overview.to_be_defined', 'To be defined')}
        </Text>
      </View>

      {/* Budget */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="card-outline" size={20} color={theme.colors.textMuted} />
          <Text
            style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text, marginLeft: 8 }}
          >
            {t('trips.detail_modal.overview.budget', 'Budget')}
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: theme.colors.textMuted }}>
          {editableTrip.budget
            ? `$${editableTrip.budget.toLocaleString()}`
            : t('trips.detail_modal.overview.no_budget_set', 'No budget set')}
        </Text>
      </View>

      {/* Accommodation */}
      {editableTrip.accommodation_preference && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bed-outline" size={20} color={theme.colors.textMuted} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('trips.detail_modal.overview.accommodation', 'Accommodation')}
            </Text>
          </View>
          <View style={styles.tagContainer}>
            {editableTrip.accommodation_preference.split(',').map((acc, index) => {
              const trimmedAcc = acc.trim();
              const icon = accommodationIcons[trimmedAcc] || '🏨';
              return (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagIcon}>{icon}</Text>
                  <Text style={styles.tagText}>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-outline" size={20} color={theme.colors.textMuted} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('trips.detail_modal.overview.transport', 'Transport')}
            </Text>
          </View>
          <View style={styles.tagContainer}>
            {editableTrip.transport_preference.split(',').map((transport, index) => {
              const trimmedTransport = transport.trim();
              const icon = transportIcons[trimmedTransport] || '🚗';
              return (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagIcon}>{icon}</Text>
                  <Text style={styles.tagText}>
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
        <View style={styles.section}>
          <Text style={[styles.descriptionTitle, { color: theme.colors.text }]}>
            {t('trips.detail_modal.overview.description', 'Description')}
          </Text>
          <Text style={[styles.descriptionText, { color: theme.colors.textMuted }]}>
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
        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="pencil" size={20} color="white" />
              <Text style={styles.buttonText}>
                {t('trips.detail_modal.overview.edit_trip', 'Edit Trip')}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const TeamTab = () => (
    <ScrollView style={styles.scrollViewContainer}>
      <Text style={styles.teamTitle}>
        {t('trips.detail_modal.team_tab.title', 'Trip Collaborators')}
      </Text>

      {hasMinimalProfiles && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={22} color="#F59E0B" style={styles.warningIcon} />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: theme.colors.text }]}>
              {t('trips.detail_modal.team_tab.incomplete_profiles_title', 'Incomplete profiles')}
            </Text>
            <Text style={[styles.warningText, { color: theme.colors.textMuted }]}>
              {t(
                'trips.detail_modal.team_tab.incomplete_profiles_message',
                'One or more collaborators have not completed their profile (no name or avatar). Invite them to update for a better experience.'
              )}
            </Text>
          </View>
        </View>
      )}

      {/* Owner */}
      {tripOwner && (
        <View style={styles.ownerCard}>
          <View style={styles.memberInfo}>
            {tripOwner.avatar_url ? (
              <Image source={{ uri: tripOwner.avatar_url }} style={styles.memberAvatar} />
            ) : (
              <View style={styles.ownerInitialsContainer}>
                <Text style={styles.memberInitials}>
                  {getUserInitials(tripOwner.full_name, tripOwner.email)}
                </Text>
              </View>
            )}
            <View style={styles.memberDetails}>
              <Text style={[styles.memberName, { color: theme.colors.text }]}>
                {tripOwner.full_name ||
                  tripOwner.email ||
                  t('trips.detail_modal.team_tab.owner_label', 'Owner')}
                {currentUser?.id === tripOwner.id &&
                  ` ${t('trips.detail_modal.team_tab.you_label', '(You)')}`}
              </Text>
              {tripOwner.full_name && tripOwner.email && (
                <Text style={[styles.memberEmail, { color: theme.colors.textMuted }]}>
                  {tripOwner.email}
                </Text>
              )}
            </View>
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>
                {t('trips.detail_modal.team_tab.owner_label', 'Owner')}
              </Text>
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
        <View key={collaborator.id} style={styles.memberCard}>
          <View style={styles.memberInfo}>
            {collaborator.avatar_url ? (
              <Image source={{ uri: collaborator.avatar_url }} style={styles.memberAvatar} />
            ) : (
              <View style={styles.memberInitialsContainer}>
                <Text style={styles.memberInitials}>
                  {getUserInitials(collaborator.full_name, collaborator.email)}
                </Text>
              </View>
            )}
            <View style={styles.memberDetails}>
              <Text style={[styles.memberName, { color: theme.colors.text }]}>
                {collaborator.full_name || collaborator.email || 'Collaborator'}
                {currentUser?.id === collaborator.id &&
                  ` ${t('trips.detail_modal.team_tab.you_label', '(You)')}`}
              </Text>
              {collaborator.full_name && collaborator.email && (
                <Text style={[styles.memberEmail, { color: theme.colors.textMuted }]}>
                  {collaborator.email}
                </Text>
              )}
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {(collaborator as unknown as { role?: 'viewer' | 'editor' }).role === 'editor'
                  ? t('trips.detail_modal.team_tab.editor_role', 'Editor')
                  : t('trips.detail_modal.team_tab.viewer_role', 'Viewer')}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* Mensaje si no hay colaboradores */}
      {collaborators.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color={theme.colors.border} />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
            {t('trips.detail_modal.team_tab.no_collaborators_title', 'No collaborators yet')}
          </Text>
          <Text style={[styles.emptyStateText, { color: theme.colors.textMuted }]}>
            {t(
              'trips.detail_modal.team_tab.no_collaborators_message',
              'Invite friends to plan together'
            )}
          </Text>
        </View>
      )}

      {/* Botones de acción */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          onPress={() => {
            onClose(); // Cierra el modal primero
            router.push({
              pathname: '/chat/[tripId]',
              params: {
                tripId: trip.id,
                tripTitle: trip.title,
              },
            });
          }}
        >
          <LinearGradient
            colors={['#3B82F6', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <View style={[styles.buttonContent, { position: 'relative' }]}>
              <Ionicons name="chatbubble-outline" size={20} color="white" />
              <Text style={styles.buttonText}>
                {t('trips.detail_modal.team_tab.group_chat', 'Group Chat')}
              </Text>
              {unreadMessagesCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: 40,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                    borderWidth: 2,
                    borderColor: theme.colors.card,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowManageTeam(true)}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="people" size={20} color="white" />
              <Text style={styles.buttonText}>
                {t('trips.detail_modal.team_tab.manage_team', 'Manage Team')}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const ItineraryTab = () => (
    <View style={styles.itineraryPlaceholder}>
      <Ionicons name="map-outline" size={64} color={theme.colors.border} />
      <Text style={[styles.itineraryTitle, { color: theme.colors.text }]}>
        {t('trips.detail_modal.itinerary_tab.coming_soon_title', 'Itinerary Coming Soon')}
      </Text>
      <Text style={[styles.itineraryText, { color: theme.colors.textMuted }]}>
        {t(
          'trips.detail_modal.itinerary_tab.coming_soon_message',
          'Plan your day-by-day activities and routes'
        )}
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
      <View style={styles.container}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>🌍</Text>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{trip.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sub-header con información básica */}
        <View
          style={[
            styles.subHeader,
            { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
          ]}
        >
          <View style={styles.subHeaderRow}>
            <View style={styles.subHeaderItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.subHeaderText, { color: theme.colors.textMuted }]}>
                {editableTrip.start_date && editableTrip.end_date
                  ? `${formatDate(editableTrip.start_date)} - ${formatDate(editableTrip.end_date)}`
                  : t('trips.detail_modal.overview.no_dates_set', 'No dates set')}
              </Text>
            </View>
            <View style={styles.subHeaderItem}>
              <Ionicons name="people-outline" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.subHeaderText, { color: theme.colors.textMuted }]}>
                {tripData.collaboratorsCount}{' '}
                {tripData.collaboratorsCount !== 1
                  ? t('trips.detail_modal.overview.travelers', 'travelers')
                  : t('trips.detail_modal.overview.traveler', 'traveler')}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={[
            styles.tabContainer,
            { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
          ]}
        >
          <TabButton tab="overview" title={t('trips.detail_modal.tabs.overview', 'Overview')} />
          <TabButton tab="itinerary" title={t('trips.detail_modal.tabs.itinerary', 'Itinerary')} />
          <TabButton tab="team" title={t('trips.detail_modal.tabs.team', 'Team')} />
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

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
  },
  scrollViewContainer: {
    flex: 1,
    padding: 20,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Sub-header styles
  subHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  subHeaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subHeaderText: {
    fontSize: 14,
    marginLeft: 4,
  },

  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
  },
  tabTextActive: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  tabTextInactive: {
    fontWeight: '400',
  },

  // Overview section styles
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewTitleContainer: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  overviewButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  overviewButtonText: {
    fontSize: 14,
  },
  editButton: {
    marginTop: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Section styles
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionContent: {
    fontSize: 16,
  },
  sectionContentMultiline: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Tag/Badge styles
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Button styles
  actionButton: {
    marginTop: 20,
  },
  gradientButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Team section styles
  teamTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  teamWarning: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  teamWarningIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  teamWarningContent: {
    flex: 1,
  },
  teamWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  teamWarningText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Team member styles
  memberCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberInitials: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 14,
  },
  memberRole: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  memberRoleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty state styles
  emptyState: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },

  // Warning banner styles
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 20,
    flexDirection: 'row',
  },
  warningIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Owner card styles
  ownerCard: {
    backgroundColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  ownerInitialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ownerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Collaborator card styles
  memberInitialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  // Action buttons container
  actionButtonsContainer: {
    gap: 12,
    marginTop: 20,
  },

  // Itinerary placeholder styles
  itineraryPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  itineraryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  itineraryText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Description styles
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Pending badge
  pendingBadgeContainer: {
    marginLeft: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Team section quick access
  teamSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  teamAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamAvatar: {
    marginRight: 4,
  },
  teamAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  teamAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  teamAvatarMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
});

export default TripDetailsModal;
