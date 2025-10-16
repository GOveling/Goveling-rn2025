/**
 * 🗺️ Trips Slice
 *
 * Manages trips state with:
 * - Trips breakdown (all, upcoming, planning, active)
 * - Loading/error states
 * - Last fetch timestamp for 2-minute caching
 * - Real-time priority (no persistence)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { getUserTripsBreakdown } from '../../lib/home';
import type { TripsBreakdown } from '../../lib/home';
import { logger } from '../../utils/logger';

// ===== TYPES =====

export interface TripsState {
  breakdown: TripsBreakdown | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

// ===== CONSTANTS =====

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (real-time priority)

// ===== ASYNC THUNKS =====

/**
 * Load user trips with breakdown
 * Gets userId from auth context internally
 */
export const loadTrips = createAsyncThunk('trips/loadTrips', async (_, { rejectWithValue }) => {
  try {
    logger.info('[tripsSlice] Loading trips breakdown');

    const breakdown = await getUserTripsBreakdown();

    return { breakdown };
  } catch (error: any) {
    logger.error('[tripsSlice] Load failed:', error);
    return rejectWithValue(error.message);
  }
});

/**
 * Refresh trips (force reload)
 */
export const refreshTrips = createAsyncThunk(
  'trips/refreshTrips',
  async (_, { rejectWithValue }) => {
    try {
      logger.info('[tripsSlice] Refreshing trips');

      const breakdown = await getUserTripsBreakdown();

      return { breakdown };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ===== SLICE =====

const initialState: TripsState = {
  breakdown: null,
  loading: false,
  error: null,
  lastFetch: null,
};

const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setBreakdown: (state, action: PayloadAction<TripsBreakdown>) => {
      state.breakdown = action.payload;
      state.lastFetch = Date.now();
      state.error = null;
    },
    clearTrips: (state) => {
      state.breakdown = null;
      state.loading = false;
      state.error = null;
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    // loadTrips
    builder
      .addCase(loadTrips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTrips.fulfilled, (state, action) => {
        state.breakdown = action.payload.breakdown;
        state.loading = false;
        state.lastFetch = Date.now();
        state.error = null;
      })
      .addCase(loadTrips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // refreshTrips
    builder
      .addCase(refreshTrips.fulfilled, (state, action) => {
        state.breakdown = action.payload.breakdown;
        state.lastFetch = Date.now();
        state.error = null;
      })
      .addCase(refreshTrips.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// ===== SELECTORS =====

export const selectBreakdown = (state: any) => state.trips.breakdown;
export const selectAllTrips = (state: any) => state.trips.breakdown?.all || [];
export const selectUpcomingTrips = (state: any) => state.trips.breakdown?.upcoming || [];
export const selectPlanningTrips = (state: any) => state.trips.breakdown?.planning || [];
export const selectActiveTrip = (state: any) => state.trips.breakdown?.active || null;
export const selectTripsCounts = (state: any) =>
  state.trips.breakdown?.counts || { total: 0, upcoming: 0, planning: 0, active: 0 };
export const selectTripsLoading = (state: any) => state.trips.loading;
export const selectTripsError = (state: any) => state.trips.error;

export const selectIsStale = (state: any) => {
  const { lastFetch } = state.trips;
  return !lastFetch || Date.now() - lastFetch > CACHE_DURATION;
};

// ===== ACTIONS =====

export const { setBreakdown, clearTrips } = tripsSlice.actions;

// ===== REDUCER =====

export default tripsSlice.reducer;
