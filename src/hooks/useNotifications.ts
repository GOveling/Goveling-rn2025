/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '~/lib/supabase';

export interface InboxNotification {
  id: number;
  user_id: string;
  title: string;
  body?: string | null;
  data?: any;
  created_at: string;
  viewed_at?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
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
  inviter_id?: string | null;
  trip_title?: string | null;
  inviter_name?: string | null;
}

export function useNotifications() {
  const safeParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return {};
    }
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

  const fetchNotifications = useCallback(
    async (uid?: string) => {
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
        const needTrip: string[] = [];
        const needInviter: string[] = [];
        const parsedData: any[] = [];
        for (const n of rows) {
          const d =
            typeof (n as any).data === 'string'
              ? safeParse((n as any).data as any)
              : (n as any).data || {};
          parsedData.push(d);
          if (d && d.trip_id && !d.trip_name) needTrip.push(d.trip_id);
          const inviterId = d?.inviter_id || d?.owner_id || d?.actor_id || d?.added_by;
          if (inviterId && !d?.inviter_name) needInviter.push(inviterId);
        }

        const tripMap = new Map<string, string>();
        const cancelledTripIds = new Set<string>();
        if (needTrip.length > 0) {
          const unique = Array.from(new Set(needTrip));
          const { data: tripsRes } = await supabase
            .from('trips')
            .select('id,title,status')
            .in('id', unique);
          if (Array.isArray(tripsRes)) {
            for (const t of tripsRes as any[]) {
              tripMap.set(t.id, t.title || null);
              if (t.status === 'cancelled') {
                cancelledTripIds.add(t.id);
              }
            }
          }
        }

        const inviterMap = new Map<string, string>();
        if (needInviter.length > 0) {
          const uniqueInviters = Array.from(new Set(needInviter));
          const { data: ownersRes } = await supabase
            .from('profiles')
            .select('id,display_name,email')
            .in('id', uniqueInviters);
          if (Array.isArray(ownersRes)) {
            for (const row of ownersRes as any[]) {
              if (row?.id) inviterMap.set(row.id, row.display_name || row.email || null);
            }
          }
        }

        const notificationsToDelete: number[] = [];

        const enriched = rows
          .map((n, idx) => {
            const d = parsedData[idx] || {};
            let newData = d;
            if (d && d.trip_id && !d.trip_name && tripMap.has(d.trip_id)) {
              newData = { ...newData, trip_name: tripMap.get(d.trip_id) };
            }
            const inviterId = d?.inviter_id || d?.owner_id || d?.actor_id || d?.added_by;
            if (inviterId && !d?.inviter_name && inviterMap.has(inviterId)) {
              newData = { ...newData, inviter_name: inviterMap.get(inviterId) };
            }
            return { ...n, data: newData } as InboxNotification;
          })
          .filter((n) => {
            const d = n.data;
            const tripId = d?.trip_id || d?.tripId;
            if (tripId) {
              if (cancelledTripIds.has(tripId)) {
                notificationsToDelete.push(n.id);
                return false;
              }
              if (needTrip.includes(tripId) && !tripMap.has(tripId)) {
                notificationsToDelete.push(n.id);
                return false;
              }
            }
            return true;
          });

        if (notificationsToDelete.length > 0) {
          supabase
            .from('notifications_inbox')
            .delete()
            .in('id', notificationsToDelete)
            .then(({ error: deleteError }) => {
              if (deleteError) {
                console.error(
                  '[useNotifications] Error deleting orphaned notifications:',
                  deleteError
                );
              }
            });
        }

        setNotifications(enriched);
      }
    },
    [userId]
  );

  const fetchInvitations = useCallback(
    async (email?: string) => {
      if (!email && !userEmail) return;
      const target = (email || userEmail!) as string;
      const { data, error } = await supabase
        .from('trip_invitations')
        .select('id, trip_id, email, role, status, created_at, expires_at, owner_id, inviter_id')
        .eq('email', target)
        .in('status', ['pending', 'accepted', 'declined']);
      if (!error && data) {
        const baseInv = data as Invitation[];
        // 1) Try to get trip_name and inviter_name from existing notifications (type=invite_sent)
        const notifTripName = new Map<string, string | null>();
        const notifInviterName = new Map<string, string | null>();
        for (const n of notifications) {
          const d =
            typeof (n as any).data === 'string'
              ? safeParse((n as any).data)
              : (n as any).data || {};
          if (d?.type === 'invite_sent' && d?.trip_id) {
            if (d.trip_name && !notifTripName.has(d.trip_id))
              notifTripName.set(d.trip_id, d.trip_name);
            if (d.inviter_name && !notifInviterName.has(d.trip_id))
              notifInviterName.set(d.trip_id, d.inviter_name);
          }
        }

        // 2) Fallback for inviter_name using profiles by inviter_id (owner_id no longer reliable)
        const inviterIds = Array.from(
          new Set(baseInv.map((i) => i.inviter_id).filter(Boolean))
        ) as string[];
        let inviterMap = new Map<string, string>();
        if (inviterIds.length > 0) {
          const { data: ownersRes } = await supabase
            .from('profiles')
            .select('id,display_name,email')
            .in('id', inviterIds);
          if (Array.isArray(ownersRes)) {
            inviterMap = new Map(
              (ownersRes as any[]).map((row) => [row.id, row.display_name || row.email || null])
            );
          }
        }

        const enriched = baseInv.map((i) => {
          const titleFromNotif = notifTripName.get(i.trip_id) || null;
          const inviterFromNotif = notifInviterName.get(i.trip_id) || null;
          const inviterFromProfile = i.inviter_id ? inviterMap.get(i.inviter_id) || null : null;
          return {
            ...i,
            trip_title: titleFromNotif,
            inviter_name: inviterFromNotif || inviterFromProfile,
          };
        });

        setInvitations(enriched);
      }
    },
    [userEmail, notifications]
  );

  const refresh = useCallback(async () => {
    const { uid, email } = await fetchUser();
    if (!uid) {
      setLoading(false);
      return;
    }
    await Promise.all([fetchNotifications(uid), fetchInvitations(email || undefined)]);
    setLoading(false);
  }, [fetchInvitations, fetchNotifications, fetchUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications_inbox',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications_inbox',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === (payload.new as { id: number }).id ? (payload.new as InboxNotification) : n
            )
          );
        }
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      try {
        if (ch) supabase.removeChannel(ch);
      } catch {
        // ignore
      }
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!userEmail) return;
    const ch = supabase
      .channel(`invitations-${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_invitations',
          filter: `email=eq.${userEmail}`,
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();
    return () => {
      try {
        if (ch) supabase.removeChannel(ch);
      } catch {
        // ignore
      }
    };
  }, [userEmail, fetchInvitations]);

  const totalCount = useMemo(() => {
    const pendingInv = invitations.filter((i) => (i.status || 'pending') === 'pending').length;
    const unviewed = notifications.filter((n) => n.viewed_at == null).length;
    return pendingInv + unviewed;
  }, [invitations, notifications]);

  const markNotificationsAsViewed = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('notifications_inbox')
      .update({ viewed_at: now })
      .eq('user_id', userId)
      .is('viewed_at', null);
    if (error) {
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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: now } : n))
      );
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

  const acceptInvitation = useCallback(
    async (invitationId: number) => {
      try {
        const { error } = await supabase.rpc('accept_invitation', { invitation_id: invitationId });
        if (error) throw error;
        await fetchInvitations();
      } catch (error) {
        console.error('RPC accept_invitation failed, falling back to client logic:', error);
        try {
          const { acceptInvitation: acceptClient } = await import('~/lib/team');
          await acceptClient(invitationId as unknown as number);
          await fetchInvitations();
        } catch (inner) {
          console.error('Client-side accept failed:', inner);
          throw inner;
        }
      }
    },
    [fetchInvitations]
  );

  const rejectInvitation = useCallback(
    async (invitationId: number) => {
      try {
        const { error } = await supabase.rpc('reject_invitation', { invitation_id: invitationId });
        if (error) throw error;
        await fetchInvitations();
      } catch (error) {
        console.error('RPC reject_invitation failed, falling back to client logic:', error);
        try {
          const { rejectInvitation: rejectClient } = await import('~/lib/team');
          await rejectClient(invitationId as unknown as number);
          await fetchInvitations();
        } catch (inner) {
          console.error('Client-side reject failed:', inner);
          throw inner;
        }
      }
    },
    [fetchInvitations]
  );

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
