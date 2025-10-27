import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useTranslation } from 'react-i18next';

import { ensureMultipleUserProfiles } from '~/lib/profileUtils';
import { supabase } from '~/lib/supabase';
import { inviteToTrip, removeCollaborator } from '~/lib/team';
import { getTripWithTeamRPC } from '~/lib/teamHelpers';
import { getTripCollaborators, resolveCurrentUserRoleForTripId } from '~/lib/userUtils';

type Role = 'owner' | 'editor' | 'viewer';

interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
}

interface MemberItem {
  user_id: string;
  role: Exclude<Role, 'owner'>;
  profile: Profile | null;
}

interface InvitationItem {
  id: string | number;
  email: string;
  role: Exclude<Role, 'owner'>;
  status?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  accepted_at?: string | null;
  accepted_by?: string | null;
  updated_at?: string | null;
}

interface HistoryItem {
  id: string | number;
  type: 'invitation' | 'removal';
  email: string;
  role?: Exclude<Role, 'owner'> | string;
  status?: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
  updated_at?: string | null;
  removed_user?: string;
}

interface ManageTeamModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  onChanged?: () => void;
  initialTab?: 'members' | 'invitations' | 'history'; // Add support for initial tab
}

const getInitials = (name?: string | null, email?: string | null) => {
  const src = name && name.trim().length > 0 ? name : email || 'User';
  const from = src.trim();
  if (from.length === 0) return 'U';
  const parts = from.split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const ManageTeamModal: React.FC<ManageTeamModalProps> = ({
  visible,
  onClose,
  tripId,
  onChanged,
  initialTab,
}) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0); // 0: Members, 1: Invitations, 2: History
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('viewer');
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<Role, 'owner'>>('viewer');
  const [inviting, setInviting] = useState(false);

  // Set initial tab based on prop
  React.useEffect(() => {
    if (initialTab) {
      const tabIndex = initialTab === 'members' ? 0 : initialTab === 'invitations' ? 1 : 2;
      setActiveIndex(tabIndex);
    }
  }, [initialTab]);

  // Basics: owner/current user, owner profile, current role
  const fetchBasics = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id ?? null;
    const uemail = userData?.user?.email ?? null;
    setCurrentUserId(uid);
    setCurrentUserEmail(uemail);

    const { data: tripData, error: tripErr } = await supabase
      .from('trips')
      .select('id, owner_id, user_id')
      .eq('id', tripId)
      .maybeSingle();
    if (tripErr) throw tripErr;

    const tOwnerId =
      (tripData && 'owner_id' in tripData
        ? (tripData as { owner_id?: string | null }).owner_id
        : null) ||
      (tripData && 'user_id' in tripData
        ? (tripData as { user_id?: string | null }).user_id
        : null) ||
      null;
    setOwnerId(tOwnerId);

    // Centralized role resolution
    const role = await resolveCurrentUserRoleForTripId(tripId);
    setCurrentRole(role);
  }, [tripId]);

  const fetchMembers = useCallback(async () => {
    try {
      console.log('👥 ManageTeamModal.fetchMembers: Trying RPC getTripWithTeamRPC for', tripId);
      const team = await getTripWithTeamRPC(tripId);

      // Set owner from RPC (bypasses profiles RLS)
      if (team.owner) {
        setOwnerProfile({
          id: team.owner.id,
          full_name: team.owner.full_name || null,
          avatar_url: team.owner.avatar_url || null,
          email: team.owner.email || null,
        });
      }

      // Map collaborators
      const rpcMembers: MemberItem[] = (team.collaborators || []).map((c) => ({
        user_id: c.id,
        role: (c.role as Exclude<Role, 'owner'>) || 'viewer',
        profile: {
          id: c.id,
          full_name: c.full_name || null,
          avatar_url: c.avatar_url || null,
          email: c.email || null,
        },
      }));

      if (rpcMembers.length > 0) {
        // Ensure profiles exist (backfill), then set
        await ensureMultipleUserProfiles(rpcMembers.map((m) => m.user_id));
        setMembers(rpcMembers);
        console.log(
          '👥 ManageTeamModal.fetchMembers (RPC): members',
          rpcMembers.map((m) => ({ id: m.user_id, name: m.profile?.full_name, role: m.role }))
        );
        return;
      }

      // Fallback: previous method under RLS
      console.log('👥 ManageTeamModal.fetchMembers: RPC returned no members, falling back');
      const collabs = await getTripCollaborators(tripId);
      if (!collabs || collabs.length === 0) {
        setMembers([]);
        return;
      }
      const ids = collabs.map((c) => c.id);
      await ensureMultipleUserProfiles(ids);
      const mapped: MemberItem[] = collabs.map((c) => ({
        user_id: c.id,
        role: (c.role as Exclude<Role, 'owner'>) || 'viewer',
        profile: {
          id: c.id,
          full_name: c.full_name || null,
          avatar_url: c.avatar_url || null,
          email: c.email || null,
        },
      }));
      setMembers(mapped);
    } catch (e: unknown) {
      console.warn('👥 ManageTeamModal.fetchMembers: error, fallback to empty', e);
      setMembers([]);
    }
  }, [tripId]);

  const fetchInvitations = useCallback(async () => {
    const { data, error } = await supabase
      .from('trip_invitations')
      .select(
        'id, email, role, status, created_at, expires_at, accepted_at, accepted_by, updated_at'
      )
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setInvitations((data || []) as InvitationItem[]);
  }, [tripId]);

  const fetchHistory = useCallback(async () => {
    try {
      // Fetch invitation history
      const { data: invitationData, error: invitationError } = await supabase
        .from('trip_invitations')
        .select(
          'id, email, role, status, created_at, expires_at, accepted_at, accepted_by, updated_at'
        )
        .eq('trip_id', tripId)
        .in('status', ['accepted', 'declined'])
        .order('created_at', { ascending: false });

      if (invitationError) throw invitationError;

      // Fetch member removal notifications
      const { data: removalData, error: removalError } = await supabase
        .from('notifications_inbox')
        .select('id, data, created_at')
        .eq('data->>type', 'member_removed')
        .eq('data->>trip_id', tripId)
        .order('created_at', { ascending: false });

      if (removalError) throw removalError;

      // Combine both types into HistoryItem format
      const invitationHistory: HistoryItem[] = (invitationData || []).map((item) => ({
        id: `inv-${item.id}`,
        type: 'invitation' as const,
        email: item.email,
        role: item.role,
        status: item.status,
        created_at: item.created_at,
        accepted_at: item.accepted_at,
        updated_at: item.updated_at,
      }));

      const removalHistory: HistoryItem[] = (removalData || []).map((notification) => {
        const data = notification.data as { removed_user?: string; trip_name?: string };
        return {
          id: `rem-${notification.id}`,
          type: 'removal' as const,
          email: data.removed_user || 'Unknown User',
          role: 'removed',
          status: 'removed',
          created_at: notification.created_at,
          removed_user: data.removed_user,
        };
      });

      // Combine and sort by date
      const combinedHistory = [...invitationHistory, ...removalHistory].sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setHistoryItems(combinedHistory);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryItems([]);
    }
  }, [tripId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await fetchBasics();
      await Promise.all([fetchMembers(), fetchInvitations(), fetchHistory()]);
    } catch (e) {
      console.error('ManageTeamModal load error', e);
      Alert.alert('Error', 'Could not load team data');
    } finally {
      setLoading(false);
    }
  }, [fetchBasics, fetchInvitations, fetchMembers, fetchHistory]);

  // Realtime subscriptions
  useEffect(() => {
    if (!visible) return; // only subscribe while open
    fetchAll();

    const channel = supabase
      .channel(`team-changes-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_invitations', filter: `trip_id=eq.${tripId}` },
        () => {
          fetchInvitations();
          fetchHistory();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_collaborators',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchMembers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications_inbox' },
        (payload) => {
          const data = payload.new as { data?: { type?: string; trip_id?: string } };
          if (data?.data?.type === 'member_removed' && data?.data?.trip_id === tripId) {
            console.log('member removal notification, refetching history...');
            fetchHistory();
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [visible, tripId, fetchAll, fetchInvitations, fetchMembers, fetchHistory]);

  const isOwner = currentRole === 'owner';
  const canInvite = isOwner; // Align with stricter rule: only owner invites
  const canManage = isOwner; // Role changes/removal only for owner

  const onInvite = async () => {
    const email = inviteEmail.trim();
    const lowered = email.toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isSelf = !!currentUserEmail && lowered === currentUserEmail.toLowerCase();
    const pendingExists = invitations.some(
      (i) => (i.status || 'pending') === 'pending' && (i.email || '').toLowerCase() === lowered
    );
    const alreadyMember =
      !!(ownerProfile?.email && ownerProfile.email.toLowerCase() === lowered) ||
      members.some((m) => (m.profile?.email || '').toLowerCase() === lowered);
    if (!isValid) {
      Alert.alert(
        t('common.invalid_email', 'Invalid email'),
        t('common.enter_valid_email', 'Please enter a valid email address')
      );
      return;
    }
    if (isSelf) {
      Alert.alert(
        t('trips.self_invite_title', 'Invalid invitation'),
        t('trips.self_invite_desc', 'You cannot invite yourself')
      );
      return;
    }
    if (alreadyMember) {
      Alert.alert(
        t('trips.already_member_title', 'Already a member'),
        t('trips.already_member_desc', 'This user is already part of the trip')
      );
      return;
    }
    if (pendingExists) {
      Alert.alert(
        t('trips.already_invited_title', 'Invitation pending'),
        t('trips.already_invited_desc', 'You already sent an invitation to this email')
      );
      return;
    }
    setInviting(true);
    try {
      console.log('🔍 DEBUG: tripId before inviteToTrip:', {
        tripId,
        type: typeof tripId,
        length: tripId?.length,
      });
      await inviteToTrip(tripId, email, inviteRole);
      setInviteEmail('');
      setInviteRole('viewer');
      await fetchInvitations();
      onChanged?.();
      Alert.alert(
        t('trips.invitation_sent', 'Invitation sent'),
        t('trips.invitation_sent_desc', 'The user will receive an invitation')
      );
    } catch (e: unknown) {
      console.error('Invite error', e);
      Alert.alert(
        t('common.error', 'Error'),
        (e as Error)?.message || t('trips.invite_failed', 'Could not send invitation')
      );
    } finally {
      setInviting(false);
    }
  };

  const onCancelInvitation = async (id: string | number) => {
    try {
      await supabase.from('trip_invitations').delete().eq('id', id);
      await fetchInvitations();
      onChanged?.();
    } catch (e: unknown) {
      Alert.alert(
        t('common.error', 'Error'),
        (e as Error)?.message || t('trips.cancel_invite_failed', 'Could not cancel invitation')
      );
    }
  };

  const onRemoveMember = async (member: MemberItem) => {
    console.log('onRemoveMember called with:', member);
    console.log('canManage:', canManage, 'isOwner:', isOwner, 'currentRole:', currentRole);

    Alert.alert(
      t('trips.remove_collaborator', 'Remove collaborator'),
      t('trips.remove_collaborator_confirm', 'Do you want to remove {{name}} from the trip?', {
        name:
          member.profile?.full_name || member.profile?.email || t('trips.this_user', 'this user'),
      }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('trips.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            console.log('Remove confirmed, executing removeCollaborator...');
            try {
              await removeCollaborator(tripId, member.user_id);
              console.log('removeCollaborator successful, refreshing data...');
              await fetchMembers();
              onChanged?.();
            } catch (e: unknown) {
              console.error('removeCollaborator failed:', e);
              Alert.alert(
                t('common.error', 'Error'),
                (e as Error)?.message ||
                  t('trips.remove_collaborator_failed', 'Could not remove collaborator')
              );
            }
          },
        },
      ]
    );
  };

  const onChangeRole = async (member: MemberItem, newRole: Exclude<Role, 'owner'>) => {
    if (member.role === newRole) return;
    try {
      const { error } = await supabase
        .from('trip_collaborators')
        .update({ role: newRole })
        .eq('trip_id', tripId)
        .eq('user_id', member.user_id);
      if (error) throw error;
      await fetchMembers();
      onChanged?.();
    } catch (e: unknown) {
      Alert.alert(
        t('common.error', 'Error'),
        (e as Error)?.message || t('trips.change_role_failed', 'Could not change role')
      );
    }
  };

  const renderOwner = () =>
    ownerProfile || ownerId ? (
      <View style={styles.ownerCard}>
        <View style={styles.ownerCardRow}>
          {ownerProfile?.avatar_url ? (
            <Image source={{ uri: ownerProfile.avatar_url }} style={styles.ownerAvatar} />
          ) : (
            <View style={styles.ownerInitials}>
              <Text style={styles.ownerInitialsText}>
                {getInitials(ownerProfile?.full_name, ownerProfile?.email)}
              </Text>
            </View>
          )}
          <View style={styles.ownerInfoContainer}>
            <Text style={styles.ownerName}>
              {ownerProfile?.full_name || t('trips.owner', 'Owner')}{' '}
              {currentUserId === ownerId ? `(${t('trips.you', 'You')})` : ''}
            </Text>
            {!!ownerProfile?.email && <Text style={styles.ownerEmail}>{ownerProfile.email}</Text>}
          </View>
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>{t('trips.owner', 'Owner')}</Text>
          </View>
        </View>
      </View>
    ) : null;

  const renderMemberRow = (item: MemberItem) => (
    <View style={styles.memberCard}>
      <View style={styles.memberCardRow}>
        {item.profile?.avatar_url ? (
          <Image source={{ uri: item.profile.avatar_url }} style={styles.memberAvatar} />
        ) : (
          <View style={styles.memberInitials}>
            <Text style={styles.memberInitialsText}>
              {getInitials(item.profile?.full_name, item.profile?.email)}
            </Text>
          </View>
        )}
        <View style={styles.memberInfoContainer}>
          <Text style={styles.memberName}>
            {item.profile?.full_name || item.profile?.email || t('trips.member', 'Member')}{' '}
            {item.user_id === currentUserId ? `(${t('trips.you', 'You')})` : ''}
          </Text>
          {!!item.profile?.email && item.profile?.full_name && (
            <Text style={styles.memberEmail}>{item.profile.email}</Text>
          )}
        </View>
        {/* Role selector (owner only) */}
        {canManage ? (
          <TouchableOpacity
            onPress={() => onChangeRole(item, item.role === 'viewer' ? 'editor' : 'viewer')}
            style={styles.roleButton}
          >
            <Text style={styles.roleButtonText}>
              {item.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.roleButton}>
            <Text style={styles.roleButtonText}>
              {item.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')}
            </Text>
          </View>
        )}
        {/* Remove button (owner only) */}
        {canManage && (
          <TouchableOpacity
            onPress={() => {
              console.log('Delete button pressed for user:', item.user_id);
              onRemoveMember(item);
            }}
            style={styles.removeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderInvitationRow = (item: InvitationItem) => (
    <View style={styles.invitationCard}>
      <View style={styles.invitationCardRow}>
        <View style={styles.memberInitials}>
          <Ionicons name="mail-outline" size={20} color="#1F2937" />
        </View>
        <View style={styles.invitationLeftContainer}>
          <Text style={styles.invitationEmail}>{item.email}</Text>
          <Text style={styles.invitationRoleText}>
            {item.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')} •{' '}
            {item.status || 'pending'}
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity onPress={() => onCancelInvitation(item.id)}>
            <Ionicons name="close-circle-outline" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const inviteValidation = useMemo(() => {
    const email = inviteEmail.trim();
    if (email.length === 0) return { valid: false, reason: 'empty' as const };
    const lowered = email.toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) return { valid: false, reason: 'format' as const };
    if (currentUserEmail && lowered === currentUserEmail.toLowerCase())
      return { valid: false, reason: 'self' as const };
    if (ownerProfile?.email && ownerProfile.email.toLowerCase() === lowered)
      return { valid: false, reason: 'member' as const };
    if (members.some((m) => (m.profile?.email || '').toLowerCase() === lowered))
      return { valid: false, reason: 'member' as const };
    if (
      invitations.some(
        (i) => (i.status || 'pending') === 'pending' && (i.email || '').toLowerCase() === lowered
      )
    )
      return { valid: false, reason: 'pending' as const };
    return { valid: true as const };
  }, [inviteEmail, currentUserEmail, ownerProfile?.email, members, invitations]);

  const inviteDisabled = !canInvite || inviting || !inviteValidation.valid;

  const renderMembersTab = () => (
    <View style={styles.tabContentWrapper}>
      {renderOwner()}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.tabInnerWrapper}>
          <FlatList
            data={members}
            keyExtractor={(m) => m.user_id}
            renderItem={({ item }) => renderMemberRow(item)}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.flatListPadding}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={28} color="#9CA3AF" />
                <Text style={styles.emptyText}>
                  {t('trips.no_collaborators_yet', 'No collaborators yet')}
                </Text>
              </View>
            }
          />
        </View>
      </TouchableWithoutFeedback>

      {canInvite && (
        <View style={styles.inviteFormContainer}>
          <Text style={styles.inviteFormTitle}>
            {t('trips.invite_new_member', 'Invite a new member')}
          </Text>
          <View style={styles.inviteFormRow}>
            <View style={styles.inviteEmailInputContainer}>
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder={t('trips.email_placeholder', 'email@example.com')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="done"
                onSubmitEditing={() => {
                  // Keep keyboard open unless invite is valid and sent explicitly
                }}
                style={styles.inviteEmailInput}
              />
              {inviteEmail.length > 0 && !inviteValidation.valid && (
                <Text style={styles.inviteErrorText}>
                  {inviteValidation.reason === 'format' &&
                    t('trips.invalid_email_format', 'Invalid email format')}
                  {inviteValidation.reason === 'self' &&
                    t('trips.cannot_invite_self', 'You cannot invite yourself')}
                  {inviteValidation.reason === 'member' &&
                    t('trips.user_already_member', 'This user is already a member of the trip')}
                  {inviteValidation.reason === 'pending' &&
                    t(
                      'trips.invitation_already_pending',
                      'There is already a pending invitation for this email'
                    )}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setInviteRole(inviteRole === 'viewer' ? 'editor' : 'viewer');
              }}
              style={styles.inviteRoleButton}
            >
              <Text style={styles.inviteRoleButtonText}>
                {inviteRole === 'viewer'
                  ? t('trips.viewer', 'Viewer')
                  : t('trips.editor', 'Editor')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!inviteDisabled) {
                  Keyboard.dismiss();
                  onInvite();
                }
              }}
              disabled={inviteDisabled}
              style={[
                styles.inviteSubmitButton,
                inviteDisabled && styles.inviteSubmitButtonDisabled,
              ]}
            >
              {inviting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.inviteSubmitButtonText}>{t('trips.invite', 'Invite')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderInvitationsTab = () => (
    <View style={styles.tabContentWrapper}>
      <FlatList
        data={invitations.filter((i) => (i.status || 'pending') === 'pending')}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => renderInvitationRow(item)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={28} color="#9CA3AF" />
            <Text style={styles.emptyText}>{t('trips.no_invitations', 'No invitations')}</Text>
          </View>
        }
      />
    </View>
  );

  const renderHistoryRow = (item: HistoryItem) => {
    // Handle different types of history items
    const isInvitation = item.type === 'invitation';
    const isRemoval = item.type === 'removal';

    let iconName: keyof typeof Ionicons.glyphMap;
    let status = '';
    let bg = '#F3F4F6';
    let bd = '#E5E7EB';

    if (isInvitation) {
      const accepted = (item.status || '') === 'accepted';
      const declined = (item.status || '') === 'declined';
      bg = accepted ? '#DCFCE7' : declined ? '#FFE4E6' : '#F3F4F6';
      bd = accepted ? '#16A34A' : declined ? '#EF4444' : '#E5E7EB';
      iconName = accepted ? 'checkmark-circle' : 'close-circle';
      status = `${item.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')} • ${accepted ? t('trips.accepted', 'Accepted') : t('trips.declined', 'Declined')}`;
    } else if (isRemoval) {
      bg = '#FFE4E6';
      bd = '#EF4444';
      iconName = 'trash-outline';
      status = t('trips.removed', 'Removed from trip');
    }

    // Format date based on type and status
    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return '';
      }
    };

    // Determine which date to show
    let displayDate = '';
    if (isInvitation) {
      const accepted = (item.status || '') === 'accepted';
      const declined = (item.status || '') === 'declined';
      if (accepted && item.accepted_at) {
        displayDate = formatDate(item.accepted_at);
      } else if (declined && item.updated_at) {
        displayDate = formatDate(item.updated_at);
      } else if (item.created_at) {
        displayDate = formatDate(item.created_at);
      }
    } else if (isRemoval && item.created_at) {
      displayDate = formatDate(item.created_at);
    }

    return (
      <View style={[styles.historyCard, { backgroundColor: bg, borderLeftColor: bd }]}>
        <View style={styles.historyCardRow}>
          <View style={styles.memberInitials}>
            <Ionicons name={iconName} size={22} color={bd} />
          </View>
          <View style={styles.historyLeftContainer}>
            <Text style={styles.historyEmail}>{item.email}</Text>
            <Text style={styles.historyStatus}>
              {status}
              {displayDate && ` • ${displayDate}`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHistoryTab = () => (
    <View style={styles.tabContentWrapper}>
      <FlatList
        data={historyItems}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => renderHistoryRow(item)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={28} color="#9CA3AF" />
            <Text style={styles.emptyText}>{t('trips.no_history', 'No history')}</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('trips.manageTeam', 'Manage Team')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <SegmentedControl
            values={[
              t('trips.members', 'Members'),
              t('trips.invitations', 'Invitations'),
              t('trips.history', 'History'),
            ]}
            selectedIndex={activeIndex}
            onChange={(e: unknown) => {
              const idx =
                typeof (e as { nativeEvent?: { selectedSegmentIndex?: number } })?.nativeEvent
                  ?.selectedSegmentIndex === 'number'
                  ? (e as { nativeEvent: { selectedSegmentIndex: number } }).nativeEvent
                      .selectedSegmentIndex
                  : 0;
              setActiveIndex(idx);
            }}
            backgroundColor="#F3F4F6"
            tintColor="#3B82F6"
            fontStyle={styles.segmentedControlFont}
            activeFontStyle={styles.segmentedControlActiveFont}
          />
        </View>
        {/* Content with keyboard handling */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          style={styles.keyboardAvoidView}
        >
          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
              </View>
            ) : activeIndex === 0 ? (
              renderMembersTab()
            ) : activeIndex === 1 ? (
              renderInvitationsTab()
            ) : (
              renderHistoryTab()
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal container
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },

  // Header styles
  header: {
    backgroundColor: '#F3F4F6',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },

  // Tabs styles
  tabsContainer: {
    padding: 12,
  },

  // Content styles
  keyboardAvoidView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabContentWrapper: {
    flex: 1,
  },
  tabInnerWrapper: {
    flex: 1,
  },
  flatListPadding: {
    paddingBottom: 160,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
  },

  // Owner card styles
  ownerCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  ownerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  ownerInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerInitialsText: {
    color: 'white',
    fontWeight: '700',
  },
  ownerInfoContainer: {
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  ownerEmail: {
    color: '#92400E',
  },
  ownerBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ownerBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },

  // Member card styles
  memberCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitialsText: {
    color: 'white',
    fontWeight: '700',
  },
  memberInfoContainer: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  memberEmail: {
    color: '#6B7280',
  },
  roleButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  roleButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
    borderRadius: 4,
  },

  // Invitation card styles
  invitationCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  invitationCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invitationLeftContainer: {
    flex: 1,
  },
  invitationEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  invitationRoleText: {
    color: '#6B7280',
    fontSize: 13,
  },
  invitationCancelButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  invitationCancelButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },

  // Invite form styles
  inviteFormContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 4,
  },
  inviteFormTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  inviteFormRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inviteEmailInputContainer: {
    flex: 1,
  },
  inviteEmailInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inviteErrorText: {
    color: '#EF4444',
    marginTop: 6,
    fontSize: 12,
  },
  inviteRoleButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inviteRoleButtonText: {
    fontWeight: '700',
    color: '#374151',
  },
  inviteSubmitButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  inviteSubmitButtonDisabled: {
    opacity: 0.5,
  },
  inviteSubmitButtonText: {
    color: 'white',
    fontWeight: '700',
  },

  // Empty state styles
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#6B7280',
    marginTop: 6,
  },

  // History tab styles
  historyCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  historyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeftContainer: {
    flex: 1,
  },
  historyEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  historyStatus: {
    fontSize: 13,
    color: '#6B7280',
  },
  historyDateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Segmented Control styles
  segmentedControlFont: {
    color: '#374151',
    fontWeight: '600',
  },
  segmentedControlActiveFont: {
    color: '#111827',
    fontWeight: '700',
  },
});

export default ManageTeamModal;
