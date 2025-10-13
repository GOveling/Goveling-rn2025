import React, { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '~/hooks/useNotifications';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

interface Props {
  iconColor?: string;
}

const NotificationBell: React.FC<Props> = ({ iconColor = '#6B7280' }) => {
  const { t } = useTranslation();
  const { loading, notifications, invitations, totalCount, markNotificationsAsViewed, markAllAsRead, markOneAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
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
                  <View style={{ backgroundColor: '#EFF6FF', borderLeftWidth: 4, borderLeftColor: '#3B82F6', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }}>
                    <Text style={{ fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>{t('auto.Pending invitation', 'Pending invitation')}</Text>
                    <Text style={{ color: '#374151', marginBottom: 8 }}>{t('auto.You have a pending trip invitation. Check your email for details.', 'You have a pending trip invitation. Check your email for details.')}</Text>
                  </View>
                )}

                {/* General Notifications */}
                {notifications.map(n => (
                  <Pressable key={n.id} onPress={() => handleNotificationPress(n)} style={({ pressed }) => ({ backgroundColor: n.viewed_at == null ? 'rgba(37, 99, 235, 0.08)' : 'white', borderWidth: 1, borderColor: n.viewed_at == null ? 'rgba(37,99,235,0.2)' : '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 10, opacity: pressed ? 0.9 : 1 })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <Ionicons name="notifications" size={18} color="#1F2937" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: n.is_read ? '500' : '700', color: '#111827' }}>{n.title}</Text>
                        {n.body ? <Text style={{ color: '#6B7280', marginTop: 2 }}>{n.body}</Text> : null}
                      </View>
                      {!n.is_read && (
                        <View style={{ width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 4 }} />
                      )}
                    </View>
                  </Pressable>
                ))}

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
