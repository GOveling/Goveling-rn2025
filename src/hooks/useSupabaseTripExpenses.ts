import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase';

export interface TripExpense {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  paid_by: string[];
  split_between: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UseSupabaseTripExpensesReturn {
  expenses: TripExpense[];
  loading: boolean;
  error: string | null;
  createExpense: (
    expenseData: Omit<TripExpense, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ) => Promise<void>;
  updateExpense: (
    id: string,
    expenseData: Partial<Omit<TripExpense, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useSupabaseTripExpenses = (tripId: string): UseSupabaseTripExpensesReturn => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch expenses from database
  const fetchExpenses = useCallback(async () => {
    if (!tripId || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('trip_expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setExpenses((data || []) as TripExpense[]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch expenses';
      setError(errorMsg);
      console.error('❌ useSupabaseTripExpenses.fetchExpenses:', errorMsg);
    } finally {
      setLoading(false);
    }
  }, [tripId, user?.id]);

  // Fetch on mount and when tripId changes
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Real-time subscription to expenses
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip_expenses_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchExpenses]);

  // Create expense
  const createExpense = useCallback(
    async (expenseData: Omit<TripExpense, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      try {
        const { data, error: insertError } = await supabase
          .from('trip_expenses')
          .insert({
            ...expenseData,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setExpenses((prev) => [data as TripExpense, ...prev]);
        console.log('✅ Gasto agregado correctamente');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create expense';
        setError(errorMsg);
        console.error('❌ useSupabaseTripExpenses.createExpense:', errorMsg);
      }
    },
    [user?.id]
  );

  // Update expense
  const updateExpense = useCallback(
    async (
      id: string,
      expenseData: Partial<Omit<TripExpense, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
    ) => {
      try {
        const { data, error: updateError } = await supabase
          .from('trip_expenses')
          .update(expenseData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        setExpenses((prev) => prev.map((exp) => (exp.id === id ? (data as TripExpense) : exp)));
        console.log('✅ Gasto actualizado correctamente');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update expense';
        setError(errorMsg);
        console.error('❌ useSupabaseTripExpenses.updateExpense:', errorMsg);
      }
    },
    []
  );

  // Delete expense
  const deleteExpense = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('trip_expenses').delete().eq('id', id);

      if (deleteError) throw deleteError;

      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      console.log('✅ Gasto eliminado correctamente');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete expense';
      setError(errorMsg);
      console.error('❌ useSupabaseTripExpenses.deleteExpense:', errorMsg);
    }
  }, []);

  return {
    expenses,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
  };
};
