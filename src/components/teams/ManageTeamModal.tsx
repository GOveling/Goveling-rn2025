import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
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
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '~/lib/supabase';
import { inviteToTrip, removeCollaborator } from '~/lib/team';
import { useTranslation } from 'react-i18next';

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
}

interface ManageTeamModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  onChanged?: () => void;
}

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const ManageTeamModal: React.FC<ManageTeamModalProps> = ({ visible, onClose, tripId, onChanged }) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0); // 0: Members, 1: Invitations, 2: History
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('viewer');
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<Role, 'owner'>>('viewer');
  const [inviting, setInviting] = useState(false);

  // Basics: owner/current user, owner profile, current role
  const fetchBasics = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id ?? null;
    setCurrentUserId(uid);

    const { data: tripData, error: tripErr } = await supabase
      .from('trips')
      .select('id, owner_id, user_id')
      .eq('id', tripId)
      .maybeSingle();
    if (tripErr) throw tripErr;

    const tOwnerId = (tripData as any)?.owner_id || (tripData as any)?.user_id || null;
    setOwnerId(tOwnerId);

    if (tOwnerId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('id', tOwnerId)
        .maybeSingle();
      setOwnerProfile((prof as any) || null);
    } else {
      setOwnerProfile(null);
    }

    if (uid && tOwnerId && uid === tOwnerId) {
      setCurrentRole('owner');
    } else if (uid) {
      const { data: collab } = await supabase
        .from('trip_collaborators')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', uid)
        .maybeSingle();
      setCurrentRole(((collab as any)?.role as any) || 'viewer');
    } else {
      setCurrentRole('viewer');
    }
  }, [tripId]);

  const fetchMembers = useCallback(async () => {
    // Fetch collaborators first
    const { data, error } = await supabase
      .from('trip_collaborators')
      .select('user_id, role')
      .eq('trip_id', tripId)
      .order('user_id');
    if (error) throw error;
    const collabs = (data || []) as Array<{ user_id: string; role: Exclude<Role, 'owner'> }>;
    if (collabs.length === 0) { setMembers([]); return; }

    // Fetch profiles in a second query (no FK dependency)
    const ids = collabs.map(c => c.user_id);
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', ids);
    const profMap = new Map<string, Profile>();
    (profs || []).forEach((p: any) => profMap.set(p.id, p as Profile));

    const mapped: MemberItem[] = collabs.map(c => ({
      user_id: c.user_id,
      role: c.role,
      profile: profMap.get(c.user_id) || null,
    }));
    setMembers(mapped);
  }, [tripId]);

  const fetchInvitations = useCallback(async () => {
    const { data, error } = await supabase
      .from('trip_invitations')
      .select('id, email, role, status, created_at, expires_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setInvitations((data || []) as InvitationItem[]);
  }, [tripId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await fetchBasics();
      await Promise.all([fetchMembers(), fetchInvitations()]);
    } catch (e) {
      console.error('ManageTeamModal load error', e);
      Alert.alert('Error', 'Could not load team data');
    } finally {
      setLoading(false);
    }
  }, [fetchBasics, fetchInvitations, fetchMembers]);

  // Realtime subscriptions
  useEffect(() => {
    if (!visible) return; // only subscribe while open
    fetchAll();

    const channel = supabase
      .channel(`team-changes-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_invitations', filter: `trip_id=eq.${tripId}` }, () => {
        fetchInvitations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_collaborators', filter: `trip_id=eq.${tripId}` }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch { }
    };
  }, [visible, tripId, fetchAll, fetchInvitations, fetchMembers]);

  const isOwner = currentRole === 'owner';
  const canInvite = isOwner; // Align with stricter rule: only owner invites
  const canManage = isOwner; // Role changes/removal only for owner

  const onInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t('common.invalid_email', 'Invalid email'), t('common.enter_valid_email', 'Please enter a valid email address'));
      return;
    }
    setInviting(true);
    try {
      await inviteToTrip(tripId, email, inviteRole);
      setInviteEmail('');
      setInviteRole('viewer');
      await fetchInvitations();
      onChanged?.();
      Alert.alert(t('trips.invitation_sent', 'Invitation sent'), t('trips.invitation_sent_desc', 'The user will receive an invitation'));
    } catch (e: any) {
      console.error('Invite error', e);
      Alert.alert(t('common.error', 'Error'), e?.message || t('trips.invite_failed', 'Could not send invitation'));
    } finally {
      setInviting(false);
    }
  };

  const onCancelInvitation = async (id: string | number) => {
    try {
      await supabase.from('trip_invitations').delete().eq('id', id);
      await fetchInvitations();
      onChanged?.();
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message || t('trips.cancel_invite_failed', 'Could not cancel invitation'));
    }
  };

  const onRemoveMember = async (member: MemberItem) => {
    Alert.alert(
      t('trips.remove_collaborator', 'Remove collaborator'),
      t('trips.remove_collaborator_confirm', 'Do you want to remove {{name}} from the trip?', { name: member.profile?.full_name || member.profile?.email || t('trips.this_user', 'this user') }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('trips.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCollaborator(tripId, member.user_id);
              await fetchMembers();
              onChanged?.();
            } catch (e: any) {
              Alert.alert(t('common.error', 'Error'), e?.message || t('trips.remove_collaborator_failed', 'Could not remove collaborator'));
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
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message || t('trips.change_role_failed', 'Could not change role'));
    }
  };

  const renderOwner = () => (
    ownerProfile ? (
      <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F59E0B', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {ownerProfile.avatar_url ? (
            <Image source={{ uri: ownerProfile.avatar_url }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
          ) : (
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>{getInitials(ownerProfile.full_name)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
              {ownerProfile.full_name || t('trips.owner', 'Owner')} {currentUserId === ownerId ? `(${t('trips.you', 'You')})` : ''}
            </Text>
            {!!ownerProfile.email && (
              <Text style={{ color: '#6B7280' }}>{ownerProfile.email}</Text>
            )}
          </View>
          <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{t('trips.owner', 'Owner')}</Text>
          </View>
        </View>
      </View>
    ) : null
  );

  const MemberRow: React.FC<{ item: MemberItem }> = ({ item }) => (
    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {item.profile?.avatar_url ? (
          <Image source={{ uri: item.profile.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ color: 'white', fontWeight: '700' }}>{getInitials(item.profile?.full_name)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
            {item.profile?.full_name || t('trips.member', 'Member')} {item.user_id === currentUserId ? `(${t('trips.you', 'You')})` : ''}
          </Text>
          {!!item.profile?.email && <Text style={{ color: '#6B7280' }}>{item.profile.email}</Text>}
        </View>
        {/* Role selector (owner only) */}
        {canManage ? (
          <TouchableOpacity
            onPress={() => onChangeRole(item, item.role === 'viewer' ? 'editor' : 'viewer')}
            style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 10 }}
          >
            <Text style={{ color: '#374151', fontWeight: '600' }}>{item.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 10 }}>
            <Text style={{ color: '#374151', fontWeight: '600' }}>{item.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')}</Text>
          </View>
        )}
        {/* Remove button (owner only) */}
        {canManage && (
          <TouchableOpacity onPress={() => onRemoveMember(item)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const InvitationRow: React.FC<{ item: InvitationItem }> = ({ item }) => (
    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#93C5FD', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name="mail-outline" size={20} color="#1F2937" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.email}</Text>
          <Text style={{ color: '#6B7280' }}>{item.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')} • {item.status || 'pending'}</Text>
        </View>
        {canManage && (
          <TouchableOpacity onPress={() => onCancelInvitation(item.id)}>
            <Ionicons name="close-circle-outline" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const MembersTab = () => (
    <View style={{ flex: 1 }}>
      {renderOwner()}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <FlatList
            data={members}
            keyExtractor={(m) => m.user_id}
            renderItem={({ item }) => <MemberRow item={item} />}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: 160 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="people-outline" size={28} color="#9CA3AF" />
                <Text style={{ color: '#6B7280', marginTop: 6 }}>{t('trips.no_collaborators_yet', 'No collaborators yet')}</Text>
              </View>
            }
          />
        </View>
      </TouchableWithoutFeedback>

      {canInvite && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 }}>{t('trips.invite_new_member', 'Invite a new member')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
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
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8 }}
              />
            </View>
            <TouchableOpacity
              onPress={() => { Keyboard.dismiss(); setInviteRole(inviteRole === 'viewer' ? 'editor' : 'viewer'); }}
              style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }}
            >
              <Text style={{ fontWeight: '700', color: '#374151' }}>{inviteRole === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Keyboard.dismiss(); onInvite(); }}
              disabled={inviting}
              style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, opacity: inviting ? 0.7 : 1 }}
            >
              {inviting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '700' }}>{t('trips.invite', 'Invite')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const InvitationsTab = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={invitations.filter(i => (i.status || 'pending') === 'pending')}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <InvitationRow item={item} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="mail-open-outline" size={28} color="#9CA3AF" />
            <Text style={{ color: '#6B7280', marginTop: 6 }}>{t('trips.no_invitations', 'No invitations')}</Text>
          </View>
        }
      />
    </View>
  );

  const HistoryRow: React.FC<{ item: InvitationItem }> = ({ item }) => {
    const accepted = (item.status || '') === 'accepted';
    const declined = (item.status || '') === 'declined';
    const bg = accepted ? '#DCFCE7' : declined ? '#FFE4E6' : '#F3F4F6';
    const bd = accepted ? '#16A34A' : declined ? '#EF4444' : '#E5E7EB';
    return (
      <View style={{ backgroundColor: bg, borderLeftWidth: 4, borderLeftColor: bd, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name={accepted ? 'checkmark-circle' : 'close-circle'} size={22} color={bd} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.email}</Text>
            <Text style={{ color: '#6B7280' }}>{item.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')} • {accepted ? t('trips.accepted', 'Accepted') : t('trips.declined', 'Declined')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const HistoryTab = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={invitations.filter(i => (i.status || '') === 'accepted' || (i.status || '') === 'declined')}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <HistoryRow item={item} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="time-outline" size={28} color="#9CA3AF" />
            <Text style={{ color: '#6B7280', marginTop: 6 }}>{t('trips.no_history', 'No history')}</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{t('trips.manageTeam', 'Manage Team')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{ padding: 12 }}>
          <SegmentedControl
            values={[t('trips.members', 'Members'), t('trips.invitations', 'Invitations'), t('trips.history', 'History')]}
            selectedIndex={activeIndex}
            onChange={(e) => setActiveIndex((e.nativeEvent as any).selectedSegmentIndex)}
            backgroundColor="#F3F4F6"
            tintColor="#3B82F6"
            fontStyle={{ color: '#374151', fontWeight: '600' }}
            activeFontStyle={{ color: '#111827', fontWeight: '700' }}
          />
        </View>

        {/* Content with keyboard handling */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8, color: '#6B7280' }}>{t('common.loading', 'Loading...')}</Text>
              </View>
            ) : activeIndex === 0 ? (
              <MembersTab />
            ) : activeIndex === 1 ? (
              <InvitationsTab />
            ) : (
              <HistoryTab />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default ManageTeamModal;
