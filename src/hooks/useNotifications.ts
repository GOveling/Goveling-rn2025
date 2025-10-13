import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '~/lib/supabase';

export interface InboxNotification {
  id: number;
  user_id: string;
  title: string;
  body?: string | null;
  data?: any;
  created_at: string;
  viewed_at?: string | null; // optional column, see migration suggestion
  is_read?: boolean | null;   // optional column, see migration suggestion
  read_at?: string | null;    // legacy/read marker
}

export interface Invitation {
  id: number;
  trip_id: string;
  email: string;
  role: 'viewer' | 'editor';
  status?: 'pending' | 'accepted' | 'declined' | null;
  created_at?: string | null;
  expires_at?: string | null;
}

export function useNotifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id || null;
    const email = data?.user?.email || null;
    setUserId(uid);
    setUserEmail(email);
    return { uid, email };
  }, []);

  const fetchNotifications = useCallback(async (uid?: string) => {
    if (!uid && !userId) return;
    const target = uid || userId!;
    const { data, error } = await supabase
      .from('notifications_inbox')
      .select('id,user_id,title,body,data,created_at,viewed_at,is_read,read_at')
      .eq('user_id', target)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) setNotifications(data as InboxNotification[]);
  }, [userId]);

  const fetchInvitations = useCallback(async (email?: string) => {
    if (!email && !userEmail) return;
    const target = (email || userEmail!) as string;
    const { data, error } = await supabase
      .from('trip_invitations')
      .select('id, trip_id, email, role, status, created_at, expires_at')
      .eq('email', target)
      .in('status', ['pending', 'accepted', 'declined']);
    if (!error && data) setInvitations(data as Invitation[]);
  }, [userEmail]);

  const refresh = useCallback(async () => {
    const { uid, email } = await fetchUser();
    if (!uid) { setLoading(false); return; }
    await Promise.all([fetchNotifications(uid), fetchInvitations(email || undefined)]);
    setLoading(false);
  }, [fetchInvitations, fetchNotifications, fetchUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_inbox', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications(prev => [payload.new as InboxNotification, ...prev].slice(0, 20));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications_inbox', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === (payload.new as any).id ? (payload.new as InboxNotification) : n));
      })
      .subscribe();
    channelRef.current = ch;
    return () => { try { if (ch) supabase.removeChannel(ch); } catch { } };
  }, [userId]);

  useEffect(() => {
    if (!userEmail) return;
    const ch = supabase
      .channel(`invitations-${userEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_invitations', filter: `email=eq.${userEmail}` }, () => {
        fetchInvitations();
      })
      .subscribe();
    return () => { try { if (ch) supabase.removeChannel(ch); } catch { } };
  }, [userEmail, fetchInvitations]);

  // Badge count: pending invitations + unviewed general notifications
  const totalCount = useMemo(() => {
    const pendingInv = invitations.filter(i => (i.status || 'pending') === 'pending').length;
    const unviewed = notifications.filter(n => (n.viewed_at == null)).length;
    return pendingInv + unviewed;
  }, [invitations, notifications]);

  const markNotificationsAsViewed = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    // First try viewed_at; if it fails (no column), fallback to read_at
    const { error } = await supabase
      .from('notifications_inbox')
      .update({ viewed_at: now })
      .eq('user_id', userId)
      .is('viewed_at', null);
    if (error) {
      // Fallback: mark read_at to now, if viewed_at doesn't exist
      await supabase
        .from('notifications_inbox')
        .update({ read_at: now })
        .eq('user_id', userId)
        .is('read_at', null);
    }
    fetchNotifications();
  }, [userId, fetchNotifications]);

  const markOneAsRead = useCallback(async (id: number) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('notifications_inbox')
      .update({ is_read: true, read_at: now })
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: now } : n));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    await supabase
      .from('notifications_inbox')
      .update({ is_read: true, read_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
    fetchNotifications();
  }, [userId, fetchNotifications]);

  return {
    loading,
    notifications,
    invitations,
    totalCount,
    markNotificationsAsViewed,
    markOneAsRead,
    markAllAsRead,
    refresh,
  };
}
