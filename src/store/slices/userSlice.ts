/**
 * 👤 User Slice
 *
 * Manages user profile state with:
 * - Profile data
 * - Loading/error states
 * - Last fetch timestamp for caching
 * - Async actions for CRUD operations
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

// ===== TYPES =====

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

// ===== CONSTANTS =====

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ===== ASYNC THUNKS =====

/**
 * Load user profile
 */
export const loadProfile = createAsyncThunk(
  'user/loadProfile',
  async (userId: string | undefined, { rejectWithValue }) => {
    try {
      const id = userId || (await supabase.auth.getUser()).data.user?.id;

      if (!id) {
        throw new Error('No user ID provided');
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();

      if (error) throw error;

      logger.info('[userSlice] Profile loaded successfully');
      return data as UserProfile;
    } catch (error: any) {
      logger.error('[userSlice] Failed to load profile:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Update user profile (with optimistic update handled in component)
 */
export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (updates: Partial<UserProfile> & { id: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();

      if (error) throw error;

      logger.info('[userSlice] Profile updated successfully');
      return data as UserProfile;
    } catch (error: any) {
      logger.error('[userSlice] Failed to update profile:', error);
      return rejectWithValue(error.message);
    }
  }
);

// ===== SLICE =====

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
  lastFetch: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.profile = action.payload;
      state.lastFetch = action.payload ? Date.now() : null;
      state.error = null;
    },
    clearProfile: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
      state.lastFetch = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // loadProfile
    builder
      .addCase(loadProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
        state.lastFetch = Date.now();
        state.error = null;
      })
      .addCase(loadProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // updateProfile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
        state.lastFetch = Date.now();
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// ===== SELECTORS =====

export const selectUser = (state: any) => state.user.profile;
export const selectUserLoading = (state: any) => state.user.loading;
export const selectUserError = (state: any) => state.user.error;
export const selectIsStale = (state: any) => {
  if (!state.user.lastFetch) return true;
  return Date.now() - state.user.lastFetch > CACHE_DURATION;
};

// ===== EXPORTS =====

export const { setProfile, clearProfile, setError } = userSlice.actions;
export default userSlice.reducer;
