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
  owner_id?: string | null;
  // Enriched (client-side)
  trip_title?: string | null;
  inviter_name?: string | null;
}

export function useNotifications() {
  const safeParse = (s: string) => {
    try { return JSON.parse(s); } catch { return {}; }
  };
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
    if (!error && data) {
      const rows = data as InboxNotification[];
      // Collect trip_ids missing trip_name in data
      const needTrip: string[] = [];
      const parsedData: any[] = [];
      for (const n of rows) {
        const d = typeof (n as any).data === 'string' ? safeParse((n as any).data as any) : (n as any).data || {};
        parsedData.push(d);
        if (d && d.trip_id && !d.trip_name) needTrip.push(d.trip_id);
      }
      let tripMap = new Map<string, string>();
      if (needTrip.length > 0) {
        const unique = Array.from(new Set(needTrip));
        const { data: tripsRes } = await supabase.from('trips').select('id,title').in('id', unique);
        if (Array.isArray(tripsRes)) {
          for (const t of tripsRes as any[]) tripMap.set(t.id, t.title || null);
        }
      }
      const enriched = rows.map((n, idx) => {
        const d = parsedData[idx] || {};
        if (d && d.trip_id && !d.trip_name && tripMap.has(d.trip_id)) {
          const newData = { ...d, trip_name: tripMap.get(d.trip_id) };
          return { ...n, data: newData } as InboxNotification;
        }
        return { ...n, data: d } as InboxNotification;
      });
      setNotifications(enriched);
    }
  }, [userId]);

  const fetchInvitations = useCallback(async (email?: string) => {
    if (!email && !userEmail) return;
    const target = (email || userEmail!) as string;
    const { data, error } = await supabase
      .from('trip_invitations')
      .select('id, trip_id, email, role, status, created_at, expires_at, owner_id')
      .eq('email', target)
      .in('status', ['pending', 'accepted', 'declined']);
    if (!error && data) {
      const baseInv = data as Invitation[];
      // Enrich with trip title and inviter name (owner profile)
      const tripIds = Array.from(new Set(baseInv.map(i => i.trip_id).filter(Boolean)));
      const ownerIds = Array.from(new Set(baseInv.map(i => i.owner_id).filter(Boolean))) as string[];

      const [tripsRes, ownersRes] = await Promise.all([
        tripIds.length > 0
          ? supabase.from('trips').select('id,title').in('id', tripIds)
          : Promise.resolve({ data: [], error: null } as any),
        ownerIds.length > 0
          ? supabase.from('profiles').select('id,display_name,email').in('id', ownerIds)
          : Promise.resolve({ data: [], error: null } as any)
      ]);

      const tripMap = new Map<string, string>();
      if (!tripsRes.error && Array.isArray(tripsRes.data)) {
        for (const row of tripsRes.data as any[]) {
          if (row?.id) tripMap.set(row.id, row.title || null);
        }
      }
      const ownerMap = new Map<string, { name: string | null }>();
      if (!ownersRes.error && Array.isArray(ownersRes.data)) {
        for (const row of ownersRes.data as any[]) {
          if (row?.id) ownerMap.set(row.id, { name: row.display_name || row.email || null });
        }
      }

      const enriched = baseInv.map(i => ({
        ...i,
        trip_title: tripMap.get(i.trip_id) || null,
        inviter_name: i.owner_id ? (ownerMap.get(i.owner_id)?.name || null) : null,
      }));
      setInvitations(enriched);
    }
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

  const acceptInvitation = useCallback(async (invitationId: number) => {
    try {
      const { error } = await supabase.rpc('accept_invitation', { invitation_id: invitationId });
      if (error) throw error;
      await fetchInvitations(); // Refresh invitations
    } catch (error) {
      console.error('RPC accept_invitation failed, falling back to client logic:', error);
      // Fallback to client-side logic
      try {
        const { acceptInvitation: acceptClient } = await import('~/lib/team');
        await acceptClient(invitationId as any);
        await fetchInvitations();
      } catch (inner) {
        console.error('Client-side accept failed:', inner);
        throw inner;
      }
    }
  }, [fetchInvitations]);

  const rejectInvitation = useCallback(async (invitationId: number) => {
    try {
      const { error } = await supabase.rpc('reject_invitation', { invitation_id: invitationId });
      if (error) throw error;
      await fetchInvitations(); // Refresh invitations
    } catch (error) {
      console.error('RPC reject_invitation failed, falling back to client logic:', error);
      try {
        const { rejectInvitation: rejectClient } = await import('~/lib/team');
        await rejectClient(invitationId as any);
        await fetchInvitations();
      } catch (inner) {
        console.error('Client-side reject failed:', inner);
        throw inner;
      }
    }
  }, [fetchInvitations]);

  return {
    loading,
    notifications,
    invitations,
    totalCount,
    markNotificationsAsViewed,
    markOneAsRead,
    markAllAsRead,
    acceptInvitation,
    rejectInvitation,
    refresh,
  };
}
