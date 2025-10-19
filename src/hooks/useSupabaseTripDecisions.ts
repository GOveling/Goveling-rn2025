import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase';

export interface TripDecisionVote {
  id: string;
  decision_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
  updated_at: string;
}

export interface TripDecision {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  options: string[];
  end_date?: string;
  status: 'active' | 'closed' | 'archived';
  selected_participants: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  votes?: TripDecisionVote[];
}

export interface UseSupabaseTripDecisionsReturn {
  decisions: TripDecision[];
  loading: boolean;
  error: string | null;
  createDecision: (
    decisionData: Omit<TripDecision, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'votes'>
  ) => Promise<void>;
  updateDecision: (
    id: string,
    decisionData: Partial<
      Omit<TripDecision, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'votes'>
    >
  ) => Promise<void>;
  deleteDecision: (id: string) => Promise<void>;
  vote: (decisionId: string, optionIndex: number) => Promise<void>;
}

export const useSupabaseTripDecisions = (tripId: string): UseSupabaseTripDecisionsReturn => {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<TripDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch decisions and votes from database
  const fetchDecisions = useCallback(async () => {
    if (!tripId || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch decisions
      const { data: decisionsData, error: decisionsError } = await supabase
        .from('trip_decisions')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (decisionsError) throw decisionsError;

      // Fetch votes for all decisions
      const { data: votesData, error: votesError } = await supabase
        .from('trip_decision_votes')
        .select('*');

      if (votesError) throw votesError;

      // Combine decisions with their votes
      const decisionsWithVotes = (decisionsData || []).map((decision) => ({
        ...decision,
        votes: (votesData || []).filter((vote) => vote.decision_id === decision.id),
      })) as TripDecision[];

      setDecisions(decisionsWithVotes);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch decisions';
      setError(errorMsg);
      console.error('❌ useSupabaseTripDecisions.fetchDecisions:', errorMsg);
    } finally {
      setLoading(false);
    }
  }, [tripId, user?.id]);

  // Fetch on mount and when tripId changes
  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  // Real-time subscription to decisions
  useEffect(() => {
    if (!tripId) return;

    const decisionsChannel = supabase
      .channel(`trip_decisions_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_decisions',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchDecisions();
        }
      )
      .subscribe();

    // Real-time subscription to votes
    const votesChannel = supabase
      .channel(`trip_decision_votes_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_decision_votes',
        },
        () => {
          fetchDecisions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(decisionsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [tripId, fetchDecisions]);

  // Create decision
  const createDecision = useCallback(
    async (
      decisionData: Omit<TripDecision, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'votes'>
    ) => {
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      try {
        const { data, error: insertError } = await supabase
          .from('trip_decisions')
          .insert({
            ...decisionData,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setDecisions((prev) => [data as TripDecision, ...prev]);
        console.log('✅ Decisión creada correctamente');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create decision';
        setError(errorMsg);
        console.error('❌ useSupabaseTripDecisions.createDecision:', errorMsg);
      }
    },
    [user?.id]
  );

  // Update decision
  const updateDecision = useCallback(
    async (
      id: string,
      decisionData: Partial<
        Omit<TripDecision, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'votes'>
      >
    ) => {
      try {
        const { data, error: updateError } = await supabase
          .from('trip_decisions')
          .update(decisionData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        setDecisions((prev) =>
          prev.map((dec) => (dec.id === id ? { ...dec, ...(data as Partial<TripDecision>) } : dec))
        );
        console.log('✅ Decisión actualizada correctamente');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update decision';
        setError(errorMsg);
        console.error('❌ useSupabaseTripDecisions.updateDecision:', errorMsg);
      }
    },
    []
  );

  // Delete decision
  const deleteDecision = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('trip_decisions').delete().eq('id', id);

      if (deleteError) throw deleteError;

      setDecisions((prev) => prev.filter((dec) => dec.id !== id));
      console.log('✅ Decisión eliminada correctamente');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete decision';
      setError(errorMsg);
      console.error('❌ useSupabaseTripDecisions.deleteDecision:', errorMsg);
    }
  }, []);

  // Vote on decision
  const vote = useCallback(
    async (decisionId: string, optionIndex: number) => {
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      try {
        const { data, error: upsertError } = await supabase
          .from('trip_decision_votes')
          .upsert(
            {
              decision_id: decisionId,
              user_id: user.id,
              option_index: optionIndex,
            },
            {
              onConflict: 'decision_id,user_id',
            }
          )
          .select()
          .single();

        if (upsertError) throw upsertError;

        // Update local state
        setDecisions((prev) =>
          prev.map((dec) => {
            if (dec.id === decisionId) {
              const existingVoteIndex = (dec.votes || []).findIndex((v) => v.user_id === user.id);
              if (existingVoteIndex >= 0) {
                const updatedVotes = [...(dec.votes || [])];
                updatedVotes[existingVoteIndex] = data as TripDecisionVote;
                return { ...dec, votes: updatedVotes };
              }
              return { ...dec, votes: [...(dec.votes || []), data as TripDecisionVote] };
            }
            return dec;
          })
        );
        console.log('✅ Voto registrado correctamente');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to vote';
        setError(errorMsg);
        console.error('❌ useSupabaseTripDecisions.vote:', errorMsg);
      }
    },
    [user?.id]
  );

  return {
    decisions,
    loading,
    error,
    createDecision,
    updateDecision,
    deleteDecision,
    vote,
  };
};
