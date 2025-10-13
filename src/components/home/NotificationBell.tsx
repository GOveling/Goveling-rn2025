import React, { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '~/hooks/useNotifications';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

interface Props {
  iconColor?: string;
}

const NotificationBell: React.FC<Props> = ({ iconColor = '#6B7280' }) => {
  const { t } = useTranslation();
  const { loading, notifications, invitations, totalCount, markNotificationsAsViewed, markAllAsRead, markOneAsRead, acceptInvitation, rejectInvitation } = useNotifications();
  const [open, setOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const router = useRouter();

  const pendingInv = useMemo(() => invitations.filter(i => (i.status || 'pending') === 'pending'), [invitations]);
  const historyInv = useMemo(() => invitations.filter(i => (i.status || '') === 'accepted' || (i.status || '') === 'declined'), [invitations]);

  const onOpen = () => {
    setOpen(true);
    if (totalCount > 0) markNotificationsAsViewed();
  };

  const onClose = () => setOpen(false);

  const handleNotificationPress = (n: any) => {
    // Mark as read first
    if (!n.is_read) {
      markOneAsRead(n.id);
    }
    // Try to navigate using data payload
    try {
      const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data || {};
      const tripId = data?.trip_id || data?.tripId || data?.trip?.id;
      const route = data?.route;
      if (tripId) {
        onClose();
        router.push(`/trips/${tripId}`);
        return;
      }
      if (typeof route === 'string') {
        onClose();
        router.push(route as any);
        return;
      }
    } catch { }
  };

  const handleAcceptInvitation = async (invitation: any) => {
    setActionLoading(invitation.id);
    try {
      await acceptInvitation(invitation.id);
      Alert.alert(
        t('trips.invitation_accepted', 'Invitation accepted'),
        t('trips.invitation_accepted_desc', 'You are now a collaborator on this trip')
      );
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Error'),
        error?.message || t('trips.accept_invitation_failed', 'Could not accept invitation')
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectInvitation = async (invitation: any) => {
    Alert.alert(
      t('trips.reject_invitation', 'Reject invitation'),
      t('trips.reject_invitation_confirm', 'Are you sure you want to reject this invitation?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('trips.reject', 'Reject'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(invitation.id);
            try {
              await rejectInvitation(invitation.id);
              Alert.alert(
                t('trips.invitation_rejected', 'Invitation rejected'),
                t('trips.invitation_rejected_desc', 'The invitation has been declined')
              );
            } catch (error: any) {
              Alert.alert(
                t('common.error', 'Error'),
                error?.message || t('trips.reject_invitation_failed', 'Could not reject invitation')
              );
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const formatNotificationText = (notification: any) => {
    try {
      const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data || {};
      const type = data?.type;
      const tripName = data?.trip_name || data?.tripTitle || data?.trip?.title;
      const inviterName = data?.inviter_name || data?.inviterName || data?.inviter;
      const invitedEmail = data?.email || data?.invited_email;
      const role = data?.role;
      const removedUser = data?.removed_user || data?.removedUser;

      // Customize messages based on notification type
      switch (type) {
        case 'trip_invite':
          return {
            title: t('notifications.trip_invite_title', 'Trip invitation'),
            body: tripName || inviterName
              ? t('notifications.trip_invite_body_named', '{{inviter}} invited you to {{trip}}', { inviter: inviterName || t('notifications.someone', 'Someone'), trip: tripName || t('notifications.a_trip', 'a trip') })
              : t('notifications.trip_invite_body', 'You have been invited to collaborate on a trip')
          };
        case 'invite_accepted':
          return {
            title: t('notifications.invite_accepted_title', 'Invitation accepted'),
            body: tripName
              ? t('notifications.invite_accepted_body_named', 'Your invitation for {{trip}} was accepted', { trip: tripName })
              : t('notifications.invite_accepted_body', 'Someone accepted your trip invitation')
          };
        case 'invite_declined':
          return {
            title: t('notifications.invite_declined_title', 'Invitation declined'),
            body: tripName
              ? t('notifications.invite_declined_body_named', 'Your invitation for {{trip}} was declined', { trip: tripName })
              : t('notifications.invite_declined_body', 'Someone declined your trip invitation')
          };
        case 'removed':
          return {
            title: t('notifications.removed_title', 'Removed from trip'),
            body: tripName
              ? t('notifications.removed_body_named', 'You were removed from {{trip}}', { trip: tripName })
              : t('notifications.removed_body', 'You were removed from a collaborative trip')
          };
        case 'member_removed':
          return {
            title: t('notifications.member_removed_title', 'Team member removed'),
            body: tripName && removedUser
              ? t('notifications.member_removed_body_named', '{{user}} was removed from {{trip}}', { user: removedUser, trip: tripName })
              : t('notifications.member_removed_body', 'A team member was removed from the trip')
          };
        default:
          // If this looks like an invite-sent (owner side) notification from DB trigger
          if (!type && (invitedEmail || role) && (data?.trip_id)) {
            return {
              title: notification.title || t('notifications.invite_accepted_title', 'Invitation'),
              body: tripName
                ? t('notifications.invite_sent_body_named', 'Invitation sent to {{email}} as {{role}} for {{trip}}', { email: invitedEmail || '—', role, trip: tripName })
                : (notification.body || t('notifications.no_content', 'No additional content'))
            };
          }
          // Fallback to original text if no specific formatting
          return {
            title: notification.title || t('notifications.notification', 'Notification'),
            body: notification.body || t('notifications.no_content', 'No additional content')
          };
      }
    } catch {
      // If data parsing fails, use original text
      return {
        title: notification.title || t('notifications.notification', 'Notification'),
        body: notification.body || t('notifications.no_content', 'No additional content')
      };
    }
  };

  return (
    <>
      <TouchableOpacity onPress={onOpen} style={{ padding: 8, position: 'relative' }} accessibilityRole="button" accessibilityLabel={t('home.inbox', 'Inbox')}>
        <Ionicons name="notifications-outline" size={24} color={iconColor} />
        {totalCount > 0 && (
          <View style={{ position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>{totalCount > 9 ? '9+' : totalCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{t('home.inbox', 'Inbox')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {notifications.some(n => !n.is_read) && (
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={{ color: '#2563EB', fontWeight: '600' }}>{t('auto.Mark all as read', 'Mark all as read')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView ref={(ref) => { scrollRef.current = ref; }} contentContainerStyle={{ padding: 16 }}>
            {loading ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>{t('auto.Loading notifications...', 'Loading notifications...')}</Text>
              </View>
            ) : (pendingInv.length === 0 && historyInv.length === 0 && notifications.length === 0) ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>{t('auto.No notifications', 'No notifications')}</Text>
              </View>
            ) : (
              <>
                {/* Pending Invitation Highlight */}
                {pendingInv.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontWeight: '700', color: '#1F2937', marginBottom: 12, fontSize: 16 }}>{t('notifications.pending_invitations', 'Pending invitations')}</Text>
                    {pendingInv.map(inv => (
                      <View key={inv.id} style={{ backgroundColor: '#EFF6FF', borderLeftWidth: 4, borderLeftColor: '#3B82F6', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name="person-add" size={20} color="white" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{t('notifications.trip_invitation', 'Trip invitation')}</Text>
                            <Text style={{ color: '#374151', marginTop: 2 }}>
                              {t('notifications.invited_as_role', 'You have been invited as {{role}}', { role: inv.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor') })}
                            </Text>
                            {(inv.inviter_name || inv.trip_title) && (
                              <Text style={{ color: '#374151', marginTop: 2 }}>
                                {t('notifications.invited_by_to_trip', 'By {{inviter}} to {{trip}}', { inviter: inv.inviter_name || t('notifications.someone', 'Someone'), trip: inv.trip_title || t('notifications.a_trip', 'a trip') })}
                              </Text>
                            )}
                            {inv.created_at && (
                              <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                                {new Date(inv.created_at).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => handleAcceptInvitation(inv)}
                            disabled={actionLoading === inv.id}
                            style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', opacity: actionLoading === inv.id ? 0.7 : 1 }}
                          >
                            {actionLoading === inv.id ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <Text style={{ color: 'white', fontWeight: '700' }}>{t('trips.accept', 'Accept')}</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRejectInvitation(inv)}
                            disabled={actionLoading === inv.id}
                            style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', opacity: actionLoading === inv.id ? 0.7 : 1 }}
                          >
                            {actionLoading === inv.id ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <Text style={{ color: 'white', fontWeight: '700' }}>{t('trips.reject', 'Reject')}</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* General Notifications */}
                {notifications.map(n => {
                  const formattedText = formatNotificationText(n);
                  return (
                    <Pressable key={n.id} onPress={() => handleNotificationPress(n)} style={({ pressed }) => ({ backgroundColor: n.viewed_at == null ? 'rgba(37, 99, 235, 0.08)' : 'white', borderWidth: 1, borderColor: n.viewed_at == null ? 'rgba(37,99,235,0.2)' : '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 10, opacity: pressed ? 0.9 : 1 })}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                          <Ionicons name="notifications" size={18} color="#1F2937" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: n.is_read ? '500' : '700', color: '#111827' }}>{formattedText.title}</Text>
                          {formattedText.body ? <Text style={{ color: '#6B7280', marginTop: 2 }}>{formattedText.body}</Text> : null}
                          {n.created_at && (
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                              {new Date(n.created_at).toLocaleString()}
                            </Text>
                          )}
                        </View>
                        {!n.is_read && (
                          <View style={{ width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 4 }} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}

                {/* History of invitations (accepted/declined) */}
                {historyInv.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#6B7280', marginBottom: 8 }}>{t('auto.Invitation history', 'Invitation history')}</Text>
                    {historyInv.map(inv => (
                      <View key={inv.id} style={{ backgroundColor: inv.status === 'accepted' ? '#ECFDF5' : '#FFF7ED', borderLeftWidth: 4, borderLeftColor: inv.status === 'accepted' ? '#10B981' : '#F97316', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 }}>
                        <Text style={{ fontWeight: '600', color: '#111827' }}>{inv.email}</Text>
                        <Text style={{ color: '#6B7280' }}>{inv.role === 'viewer' ? t('trips.viewer', 'Viewer') : t('trips.editor', 'Editor')} • {inv.status === 'accepted' ? t('trips.accepted', 'Accepted') : t('trips.declined', 'Declined')}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default NotificationBell;
