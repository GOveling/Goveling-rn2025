/**
 * 🗺️ Trips API - RTK Query
 *
 * Supabase endpoints for trips management:
 * - Automatic caching (2 minutes)
 * - Cache invalidation with tags
 * - Optimistic updates
 * - Automatic refetching
 */

import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { getUserTripsBreakdown } from '../../lib/home';
import type { TripsBreakdown, Trip } from '../../lib/home';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

export interface UpdateTripPayload {
  id: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

// ===== RTK Query API =====

export const tripsApi = createApi({
  reducerPath: 'tripsApi',

  // Use fakeBaseQuery since we're calling Supabase directly
  baseQuery: fakeBaseQuery(),

  // Cache tags for automatic invalidation
  tagTypes: ['Trips', 'TripBreakdown', 'TripDetails'],

  endpoints: (builder) => ({
    // ===== GET TRIPS BREAKDOWN =====
    getTripsBreakdown: builder.query<TripsBreakdown, void>({
      queryFn: async () => {
        try {
          logger.info('[tripsApi] Fetching trips breakdown');

          const breakdown = await getUserTripsBreakdown();

          logger.info('[tripsApi] Breakdown fetched:', {
            total: breakdown.counts.total,
            active: breakdown.counts.active,
            upcoming: breakdown.counts.upcoming,
            planning: breakdown.counts.planning,
          });

          return { data: breakdown };
        } catch (error: any) {
          logger.error('[tripsApi] Failed to fetch breakdown:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ['TripBreakdown'],
      // 2 minutes cache (same as tripsSlice)
      keepUnusedDataFor: 120,
    }),

    // ===== GET ACTIVE TRIP =====
    getActiveTrip: builder.query<Trip | null, void>({
      queryFn: async () => {
        try {
          logger.info('[tripsApi] Fetching active trip');

          const breakdown = await getUserTripsBreakdown();
          const activeTrip = breakdown.active;

          logger.info('[tripsApi] Active trip:', activeTrip?.id || 'none');

          return { data: activeTrip };
        } catch (error: any) {
          logger.error('[tripsApi] Failed to fetch active trip:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: (result) =>
        result ? [{ type: 'TripDetails', id: result.id }, 'Trips'] : ['Trips'],
      keepUnusedDataFor: 120,
    }),

    // ===== GET SINGLE TRIP =====
    getTrip: builder.query<Trip, string>({
      queryFn: async (tripId) => {
        try {
          logger.info('[tripsApi] Fetching trip:', tripId);

          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();

          if (error) throw error;

          logger.info('[tripsApi] Trip fetched:', data.id);

          return { data };
        } catch (error: any) {
          logger.error('[tripsApi] Failed to fetch trip:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: (result, error, tripId) => [{ type: 'TripDetails', id: tripId }],
      keepUnusedDataFor: 300, // 5 minutes for individual trips
    }),

    // ===== UPDATE TRIP MUTATION =====
    updateTrip: builder.mutation<Trip, UpdateTripPayload>({
      queryFn: async (updates) => {
        try {
          logger.info('[tripsApi] Updating trip:', updates.id);

          const { data, error } = await supabase
            .from('trips')
            .update(updates)
            .eq('id', updates.id)
            .select()
            .single();

          if (error) throw error;

          logger.info('[tripsApi] Trip updated successfully');

          return { data };
        } catch (error: any) {
          logger.error('[tripsApi] Failed to update trip:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      // Invalidate all trip-related caches after update
      invalidatesTags: (result, error, { id }) => [
        { type: 'TripDetails', id },
        'TripBreakdown',
        'Trips',
      ],
      // Optimistic update
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        // Optimistically update getTrip cache
        const patchResult = dispatch(
          tripsApi.util.updateQueryData('getTrip', id, (draft) => {
            Object.assign(draft, patch);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          // Rollback on error
          patchResult.undo();
        }
      },
    }),

    // ===== DELETE TRIP MUTATION =====
    deleteTrip: builder.mutation<void, string>({
      queryFn: async (tripId) => {
        try {
          logger.info('[tripsApi] Deleting trip:', tripId);

          // Soft delete by updating status
          const { error } = await supabase
            .from('trips')
            .update({ status: 'cancelled' })
            .eq('id', tripId);

          if (error) throw error;

          logger.info('[tripsApi] Trip deleted successfully');

          return { data: undefined };
        } catch (error: any) {
          logger.error('[tripsApi] Failed to delete trip:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: (result, error, tripId) => [
        { type: 'TripDetails', id: tripId },
        'TripBreakdown',
        'Trips',
      ],
    }),
  }),
});

// ===== EXPORT HOOKS =====

export const {
  useGetTripsBreakdownQuery,
  useGetActiveTripQuery,
  useGetTripQuery,
  useUpdateTripMutation,
  useDeleteTripMutation,
} = tripsApi;
