import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase';

export interface TripPayment {
  id: string;
  trip_id: string;
  expense_id: string | null;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  created_by: string;
  created_at: string;
}

export interface UseSupabaseTripPaymentsReturn {
  payments: TripPayment[];
  loading: boolean;
  error: string | null;
  addPayment: (input: Omit<TripPayment, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
}

export const useSupabaseTripPayments = (tripId: string): UseSupabaseTripPaymentsReturn => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<TripPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!tripId || !user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('trip_payments')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setPayments((data || []) as TripPayment[]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch payments';
      setError(errorMsg);
      console.error('❌ useSupabaseTripPayments.fetchPayments:', errorMsg);
    } finally {
      setLoading(false);
    }
  }, [tripId, user?.id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`trip_payments_${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_payments', filter: `trip_id=eq.${tripId}` },
        () => fetchPayments()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchPayments]);

  const addPayment = useCallback(
    async (input: Omit<TripPayment, 'id' | 'created_at' | 'created_by'>) => {
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }
      try {
        const { data, error: insertError } = await supabase
          .from('trip_payments')
          .insert({ ...input, created_by: user.id })
          .select()
          .single();
        if (insertError) throw insertError;
        setPayments((prev) => [data as TripPayment, ...prev]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to add payment';
        setError(errorMsg);
        console.error('❌ useSupabaseTripPayments.addPayment:', errorMsg);
      }
    },
    [user?.id]
  );

  const deletePayment = useCallback(async (id: string) => {
    try {
      const { error: delErr } = await supabase.from('trip_payments').delete().eq('id', id);
      if (delErr) throw delErr;
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete payment';
      setError(errorMsg);
      console.error('❌ useSupabaseTripPayments.deletePayment:', errorMsg);
    }
  }, []);

  return { payments, loading, error, addPayment, deletePayment };
};
