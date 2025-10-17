import React, { useMemo, useRef, useState } from 'react';

import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
} from 'react-native';

import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useNotifications } from '~/hooks/useNotifications';

interface Props {
  iconColor?: string;
}

// Utility: darken a hex color by given factor (0-1)
function darkenHex(hex: string, factor = 0.12): string {
  try {
    if (!hex || typeof hex !== 'string') return hex as any;
    if (!hex.startsWith('#')) return hex as any;
    const clean = hex.replace('#', '');
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean.padEnd(6, '0').slice(0, 6);
    const r = Math.max(0, Math.min(255, Math.floor(parseInt(full.slice(0, 2), 16) * (1 - factor))));
    const g = Math.max(0, Math.min(255, Math.floor(parseInt(full.slice(2, 4), 16) * (1 - factor))));
    const b = Math.max(0, Math.min(255, Math.floor(parseInt(full.slice(4, 6), 16) * (1 - factor))));
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return hex as any;
  }
}

const NotificationBell: React.FC<Props> = ({ iconColor = '#6B7280' }) => {
  const { t } = useTranslation();
  const {
    loading,
    notifications,
    invitations,
    totalCount,
    markNotificationsAsViewed,
    markAllAsRead,
    markOneAsRead,
    acceptInvitation,
    rejectInvitation,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const router = useRouter();
  const [batchSignal, setBatchSignal] = useState(0);

  const pendingInv = useMemo(
    () => invitations.filter((i) => (i.status || 'pending') === 'pending'),
    [invitations]
  );
  const historyInv = useMemo(
    () =>
      invitations.filter((i) => (i.status || '') === 'accepted' || (i.status || '') === 'declined'),
    [invitations]
  );
  // Badge color based on types present
  const badgeColor = useMemo(() => {
    // Classify notifications
    const hasAlert = notifications.some((n) => {
      try {
        const d = typeof n.data === 'string' ? JSON.parse(n.data) : n.data || {};
        return (
          d?.type === 'removed' || d?.type === 'invite_declined' || d?.type === 'member_removed'
        );
      } catch {
        return false;
      }
    });
    const hasInviteOnly =
      pendingInv.length > 0 &&
      notifications.every((n) => {
        try {
          const d = typeof n.data === 'string' ? JSON.parse(n.data) : n.data || {};
          return (
            !d?.type ||
            d?.type === 'trip_invite' ||
            d?.type === 'member_added' ||
            d?.type === 'added_to_trip' ||
            d?.type === 'trip_member_added' ||
            d?.type === 'added'
          );
        } catch {
          return true;
        }
      });
    if (hasAlert) return '#EF4444'; // red
    if (hasInviteOnly) return '#F59E0B'; // amber
    return '#3B82F6'; // blue as default info
  }, [notifications, pendingInv]);

  const onOpen = () => {
    setOpen(true);
    if (totalCount > 0) markNotificationsAsViewed();
  };

  const onClose = () => setOpen(false);

  const handleMarkAllAsRead = async () => {
    // Trigger immediate visual feedback
    setBatchSignal((v) => v + 1);
    try {
      await markAllAsRead();
    } catch {
      // Ignore mark-as-read errors
    }
  };

  // Badge bounce when totalCount decreases
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef<number | null>(null);
  React.useEffect(() => {
    const prev = prevCountRef.current;
    if (typeof prev === 'number' && totalCount < prev) {
      Animated.sequence([
        Animated.timing(badgeScale, { toValue: 1.15, duration: 90, useNativeDriver: true }),
        Animated.timing(badgeScale, { toValue: 0.95, duration: 90, useNativeDriver: true }),
        Animated.spring(badgeScale, {
          toValue: 1,
          useNativeDriver: true,
          stiffness: 140,
          damping: 12,
          mass: 0.6,
        }),
      ]).start();
    }
    prevCountRef.current = totalCount;
  }, [totalCount, badgeScale]);

  const handleNotificationPress = (n: any) => {
    // Mark as read first
    if (!n.is_read) {
      markOneAsRead(n.id);
    }
    // Try to navigate using data payload
    try {
      const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data || {};
      const type = data?.type;
      const tripId = data?.trip_id || data?.tripId || data?.trip?.id;
      const route = data?.route;

      // Handle specific notification types with different navigation
      if (tripId) {
        onClose();

        // For invitation sent notifications - redirect to Manage Team > Invitations tab
        if (
          type === 'trip_invite' ||
          type === 'invite_sent' ||
          (!type && data?.invited_email && data?.role && !data?.inviter_name)
        ) {
          // Navigate to trip with query parameter to open manage team modal with invitations tab
          router.push(`/trips/${tripId}?openManageTeam=true&tab=invitations`);
          return;
        }

        // For trip acceptance/member added notifications - redirect directly to trip
        if (
          type === 'invite_accepted' ||
          type === 'member_added' ||
          type === 'added_to_trip' ||
          type === 'trip_member_added' ||
          type === 'added' ||
          (!type &&
            data?.role &&
            (data?.inviter_name ||
              data?.inviter_id ||
              data?.owner_id ||
              data?.actor_id ||
              data?.added_by))
        ) {
          router.push(`/trips/${tripId}`);
          return;
        }

        // Default: navigate to trip
        router.push(`/trips/${tripId}`);
        return;
      }

      if (typeof route === 'string') {
        onClose();
        router.push(route as any);
        return;
      }
    } catch {
      // Ignore navigation errors
    }
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
          },
        },
      ]
    );
  };

  const formatNotificationText = (notification: any) => {
    try {
      const data =
        typeof notification.data === 'string'
          ? JSON.parse(notification.data)
          : notification.data || {};
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
            body:
              tripName || inviterName
                ? t('notifications.trip_invite_body_named', '{{inviter}} invited you to {{trip}}', {
                    inviter: inviterName || t('notifications.someone', 'Someone'),
                    trip: tripName || t('notifications.a_trip', 'a trip'),
                  })
                : t(
                    'notifications.trip_invite_body',
                    'You have been invited to collaborate on a trip'
                  ),
          };
        case 'invite_accepted':
          return {
            title: t('notifications.invite_accepted_title', 'Invitation accepted'),
            body: tripName
              ? t(
                  'notifications.invite_accepted_body_named',
                  'Your invitation for {{trip}} was accepted',
                  { trip: tripName }
                )
              : t('notifications.invite_accepted_body', 'Someone accepted your trip invitation'),
          };
        case 'invite_declined':
          return {
            title: t('notifications.invite_declined_title', 'Invitation declined'),
            body: tripName
              ? t(
                  'notifications.invite_declined_body_named',
                  'Your invitation for {{trip}} was declined',
                  { trip: tripName }
                )
              : t('notifications.invite_declined_body', 'Someone declined your trip invitation'),
          };
        case 'removed':
          return {
            title: t('notifications.removed_title', 'Removed from trip'),
            body: tripName
              ? t('notifications.removed_body_named', 'You were removed from {{trip}}', {
                  trip: tripName,
                })
              : t('notifications.removed_body', 'You were removed from a collaborative trip'),
          };
        case 'member_removed':
          return {
            title: t('notifications.member_removed_title', 'Team member removed'),
            body:
              tripName && removedUser
                ? t(
                    'notifications.member_removed_body_named',
                    '{{user}} was removed from {{trip}}',
                    { user: removedUser, trip: tripName }
                  )
                : t('notifications.member_removed_body', 'A team member was removed from the trip'),
          };
        case 'member_added':
        case 'added_to_trip':
        case 'trip_member_added':
        case 'added': {
          const roleLabel =
            role === 'editor' ? t('trips.editor', 'Editor') : t('trips.viewer', 'Viewer');
          return {
            title:
              inviterName && tripName
                ? t(
                    'notifications.added_to_trip_with_details',
                    '{{inviter}} te ha agregado al trip {{trip}}',
                    { inviter: inviterName, trip: tripName }
                  )
                : tripName
                  ? t(
                      'notifications.added_to_trip_title_named',
                      'Te agregaron al viaje "{{trip}}"',
                      { trip: tripName }
                    )
                  : t('notifications.added_to_trip_title', 'Te agregaron a un viaje'),
            body: t('notifications.added_to_trip_role', 'Fuiste agregado como {{role}}', {
              role: roleLabel,
            }),
          };
        }
        default:
          // If this looks like an invite-sent (owner side) notification from DB trigger
          if (!type && (invitedEmail || role) && data?.trip_id && !inviterName) {
            return {
              title: notification.title || t('notifications.invite_accepted_title', 'Invitation'),
              body: tripName
                ? t(
                    'notifications.invite_sent_body_named',
                    'Invitation sent to {{email}} as {{role}} for {{trip}}',
                    { email: invitedEmail || '—', role, trip: tripName }
                  )
                : notification.body || t('notifications.no_content', 'No additional content'),
            };
          }
          // Heuristic: if it has role and inviter info but no explicit type, treat as member added
          if (
            !type &&
            role &&
            (inviterName || data?.inviter_id || data?.owner_id || data?.actor_id || data?.added_by)
          ) {
            const roleLabel =
              role === 'editor' ? t('trips.editor', 'Editor') : t('trips.viewer', 'Viewer');
            return {
              title:
                inviterName && tripName
                  ? t(
                      'notifications.added_to_trip_with_details',
                      '{{inviter}} te ha agregado al trip {{trip}}',
                      { inviter: inviterName, trip: tripName }
                    )
                  : tripName
                    ? t(
                        'notifications.added_to_trip_title_named',
                        'Te agregaron al viaje "{{trip}}"',
                        { trip: tripName }
                      )
                    : t('notifications.added_to_trip_title', 'Te agregaron a un viaje'),
              body: t('notifications.added_to_trip_role', 'Fuiste agregado como {{role}}', {
                role: roleLabel,
              }),
            };
          }
          // Fallback to original text if no specific formatting
          return {
            title: notification.title || t('notifications.notification', 'Notification'),
            body: notification.body || t('notifications.no_content', 'No additional content'),
          };
      }
    } catch {
      // If data parsing fails, use original text
      return {
        title: notification.title || t('notifications.notification', 'Notification'),
        body: notification.body || t('notifications.no_content', 'No additional content'),
      };
    }
  };

  const getNotificationIcon = (notification: any) => {
    try {
      const data =
        typeof notification.data === 'string'
          ? JSON.parse(notification.data)
          : notification.data || {};
      const type = data?.type;
      const role = data?.role;

      // Defaults
      let name: any = 'notifications';
      let bg = '#E5E7EB';
      let border = '#E5E7EB';
      const color = '#1F2937';

      switch (type) {
        case 'trip_invite':
          name = 'person-add';
          bg = '#DBEAFE'; // blue-100
          border = '#3B82F6'; // blue-500
          break;
        case 'invite_accepted':
          name = 'checkmark-circle';
          bg = '#D1FAE5'; // green-100
          border = '#10B981'; // green-500
          break;
        case 'invite_declined':
          name = 'close-circle';
          bg = '#FEE2E2'; // red-100
          border = '#EF4444'; // red-500
          break;
        case 'removed':
          name = 'person-remove';
          bg = '#FEE2E2';
          border = '#EF4444';
          break;
        case 'member_removed':
          name = 'person-remove-outline';
          bg = '#FEF3C7'; // amber-100
          border = '#F59E0B'; // amber-500
          break;
        case 'member_added':
        case 'added_to_trip':
        case 'trip_member_added':
        case 'added':
          name = 'person-add';
          bg = '#DBEAFE';
          border = '#3B82F6';
          break;
        default:
          // Heurística: si trae rol y parece agregado
          if (
            role &&
            (data?.inviter_name ||
              data?.inviter_id ||
              data?.owner_id ||
              data?.actor_id ||
              data?.added_by)
          ) {
            name = 'person-add';
            bg = '#DBEAFE';
            border = '#3B82F6';
          }
      }
      return { name, bg, color, border };
    } catch {
      return { name: 'notifications' as any, bg: '#E5E7EB', color: '#1F2937', border: '#E5E7EB' };
    }
  };

  // Row component with fade feedback when read state changes
  const NotificationRow: React.FC<{ n: any; batchSignal: number }> = ({ n, batchSignal }) => {
    const iconMeta = getNotificationIcon(n);
    const formattedText = formatNotificationText(n);
    const opacity = useRef(new Animated.Value(1)).current;
    const prevRead = useRef<boolean>(!!n.is_read);

    // Animate a subtle fade when item transitions to read
    React.useEffect(() => {
      const nowRead = !!n.is_read;
      if (prevRead.current === false && nowRead === true) {
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.65, duration: 120, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
      }
      prevRead.current = nowRead;
    }, [n.is_read, opacity]);

    // Batch effect: when batchSignal changes and item is unread, run the same fade
    React.useEffect(() => {
      if (!n.is_read) {
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.65, duration: 100, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        ]).start();
      }
    }, [batchSignal, n.is_read, opacity]);

    return (
      <Animated.View style={{ opacity }}>
        <Pressable
          onPress={() => handleNotificationPress(n)}
          style={({ pressed }) => ({
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: pressed ? darkenHex(iconMeta.border, 0.12) : iconMeta.border,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            // Left accent (slightly thicker)
            borderLeftWidth: 4,
            borderLeftColor: pressed ? darkenHex(iconMeta.border, 0.12) : iconMeta.border,
            // Note: Shadow props kept here due to dynamic color (iconMeta.border) - boxShadow doesn't support this in RN
            shadowColor: iconMeta.border,
            shadowOpacity: pressed ? 0.25 : n.viewed_at == null ? 0.18 : 0,
            shadowRadius: pressed ? 8 : n.viewed_at == null ? 6 : 0,
            shadowOffset: { width: 0, height: 2 },
            elevation: pressed ? 4 : n.viewed_at == null ? 2 : 0,
          })}
        >
          <View style={styles.notificationContent}>
            <View style={[styles.iconContainer, { backgroundColor: iconMeta.bg }]}>
              <Ionicons name={iconMeta.name} size={18} color={iconMeta.color} />
            </View>
            <View style={styles.notificationTextContainer}>
              <Text
                style={{
                  fontWeight: n.is_read ? '500' : '700',
                  color: n.is_read ? '#6B7280' : '#1F2937',
                }}
              >
                {formattedText.title}
              </Text>
              {formattedText.body ? (
                <Text style={styles.notificationBodyText}>{formattedText.body}</Text>
              ) : null}
              {n.created_at && (
                <Text style={styles.notificationTimeText}>
                  {new Date(n.created_at).toLocaleString()}
                </Text>
              )}
            </View>
            {!n.is_read && <View style={styles.unreadDot} />}
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <>
      {/** Accessibility: dynamic label by type mix */}
      <TouchableOpacity
        onPress={onOpen}
        style={styles.bellButton}
        accessibilityRole="button"
        accessibilityLabel={(() => {
          if (totalCount <= 0) return t('home.inbox', 'Inbox');
          // Classify
          const alertCount = notifications.filter((n) => {
            try {
              const d = typeof n.data === 'string' ? JSON.parse(n.data) : n.data || {};
              return (
                d?.type === 'removed' ||
                d?.type === 'invite_declined' ||
                d?.type === 'member_removed'
              );
            } catch {
              return false;
            }
          }).length;
          const inviteCount = pendingInv.length;
          if (alertCount > 0)
            return t(
              'accessibility.alert_notifications',
              'You have {{count}} alert notifications',
              { count: alertCount }
            );
          if (inviteCount > 0 && alertCount === 0)
            return t(
              'accessibility.pending_invitations',
              'You have {{count}} pending invitations',
              { count: inviteCount }
            );
          return t(
            'accessibility.unread_notifications',
            'You have {{count}} unread notifications',
            { count: totalCount }
          );
        })()}
      >
        <Ionicons name="notifications-outline" size={24} color={iconColor} />
        {totalCount > 0 && (
          <Animated.View
            style={[
              styles.badge,
              { backgroundColor: badgeColor, transform: [{ scale: badgeScale }] },
            ]}
          >
            <Text style={styles.badgeText}>{totalCount > 9 ? '9+' : totalCount}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('home.inbox', 'Inbox')}</Text>
            <View style={styles.headerActions}>
              {notifications.some((n) => !n.is_read) && (
                <TouchableOpacity onPress={handleMarkAllAsRead}>
                  <Text style={styles.markAllReadText}>
                    {t('auto.Mark all as read', 'Mark all as read')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            ref={(ref) => {
              scrollRef.current = ref;
            }}
            contentContainerStyle={styles.scrollContent}
          >
            {loading ? (
              <View style={styles.centerMessage}>
                <Text style={styles.centerMessageText}>
                  {t('auto.Loading notifications...', 'Loading notifications...')}
                </Text>
              </View>
            ) : pendingInv.length === 0 && historyInv.length === 0 && notifications.length === 0 ? (
              <View style={styles.centerMessage}>
                <Text style={styles.centerMessageText}>
                  {t('auto.No notifications', 'No notifications')}
                </Text>
              </View>
            ) : (
              <>
                {/* Pending Invitation Highlight */}
                {pendingInv.length > 0 && (
                  <View style={styles.pendingSection}>
                    <Text style={styles.sectionTitle}>
                      {t('notifications.pending_invitations', 'Pending invitations')}
                    </Text>
                    {pendingInv.map((inv) => (
                      <View key={inv.id} style={styles.invitationCard}>
                        <View style={styles.invitationHeader}>
                          <View style={styles.invitationIconContainer}>
                            <Ionicons name="person-add" size={20} color="white" />
                          </View>
                          <View style={styles.invitationTextContainer}>
                            <Text style={styles.invitationTitle}>
                              {t('notifications.trip_invitation', 'Trip invitation')}
                            </Text>
                            <Text style={styles.invitationRole}>
                              {t(
                                'notifications.invited_as_role',
                                'You have been invited as {{role}}',
                                {
                                  role:
                                    inv.role === 'viewer'
                                      ? t('trips.viewer', 'Viewer')
                                      : t('trips.editor', 'Editor'),
                                }
                              )}
                            </Text>
                            {(inv.inviter_name || inv.trip_title) && (
                              <Text style={styles.invitationDetails}>
                                {t(
                                  'notifications.invited_by_to_trip',
                                  'By {{inviter}} to {{trip}}',
                                  {
                                    inviter:
                                      inv.inviter_name || t('notifications.someone', 'Someone'),
                                    trip: inv.trip_title || t('notifications.a_trip', 'a trip'),
                                  }
                                )}
                              </Text>
                            )}
                            {inv.created_at && (
                              <Text style={styles.invitationTime}>
                                {new Date(inv.created_at).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.invitationActions}>
                          <TouchableOpacity
                            onPress={() => handleAcceptInvitation(inv)}
                            disabled={actionLoading === inv.id}
                            style={[
                              styles.invitationButton,
                              styles.acceptButton,
                              { opacity: actionLoading === inv.id ? 0.7 : 1 },
                            ]}
                          >
                            {actionLoading === inv.id ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <Text style={styles.invitationButtonText}>
                                {t('trips.accept', 'Accept')}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRejectInvitation(inv)}
                            disabled={actionLoading === inv.id}
                            style={[
                              styles.invitationButton,
                              styles.rejectButton,
                              { opacity: actionLoading === inv.id ? 0.7 : 1 },
                            ]}
                          >
                            {actionLoading === inv.id ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <Text style={styles.invitationButtonText}>
                                {t('trips.reject', 'Reject')}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* General Notifications */}
                {notifications.map((n) => (
                  <NotificationRow key={n.id} n={n} batchSignal={batchSignal} />
                ))}

                {/* History of invitations (accepted/declined) */}
                {historyInv.length > 0 && (
                  <View style={styles.historySection}>
                    <Text style={styles.historyTitle}>
                      {t('auto.Invitation history', 'Invitation history')}
                    </Text>
                    {historyInv.map((inv) => (
                      <View
                        key={inv.id}
                        style={[
                          styles.historyCard,
                          inv.status === 'accepted'
                            ? styles.historyCardAccepted
                            : styles.historyCardDeclined,
                        ]}
                      >
                        <Text style={styles.historyEmail}>{inv.email}</Text>
                        <Text style={styles.historyDetails}>
                          {inv.role === 'viewer'
                            ? t('trips.viewer', 'Viewer')
                            : t('trips.editor', 'Editor')}{' '}
                          •{' '}
                          {inv.status === 'accepted'
                            ? t('trips.accepted', 'Accepted')
                            : t('trips.declined', 'Declined')}
                        </Text>
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

const styles = StyleSheet.create({
  // Bell Button
  bellButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  // Modal Container
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllReadText: {
    color: '#2563EB',
    fontWeight: '600',
  },

  // ScrollView
  scrollContent: {
    padding: 16,
  },

  // Loading/Empty States
  centerMessage: {
    padding: 16,
    alignItems: 'center',
  },
  centerMessageText: {
    color: '#6B7280',
  },

  // Section Title
  sectionTitle: {
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    fontSize: 16,
  },

  // Notification Row (NotificationRow component)
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationBodyText: {
    color: '#6B7280',
    marginTop: 2,
  },
  notificationTimeText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },

  // Pending Invitations
  pendingSection: {
    marginBottom: 16,
  },
  invitationCard: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invitationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  invitationTextContainer: {
    flex: 1,
  },
  invitationTitle: {
    fontWeight: '700',
    color: '#1F2937',
    fontSize: 16,
  },
  invitationRole: {
    color: '#374151',
    marginTop: 2,
  },
  invitationDetails: {
    color: '#374151',
    marginTop: 2,
  },
  invitationTime: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  invitationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  invitationButtonText: {
    color: 'white',
    fontWeight: '700',
  },

  // History Section
  historySection: {
    marginTop: 8,
  },
  historyTitle: {
    color: '#6B7280',
    marginBottom: 8,
  },
  historyCard: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  historyCardAccepted: {
    backgroundColor: '#ECFDF5',
    borderLeftColor: '#10B981',
  },
  historyCardDeclined: {
    backgroundColor: '#FFF7ED',
    borderLeftColor: '#F97316',
  },
  historyEmail: {
    fontWeight: '600',
    color: '#111827',
  },
  historyDetails: {
    color: '#6B7280',
  },
});

export default NotificationBell;
