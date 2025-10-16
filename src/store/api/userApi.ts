/**
 * 👤 User API - RTK Query
 * 
 * Supabase endpoints for user profile management:
 * - Automatic caching (5 minutes)
 * - Cache invalidation with tags
 * - Optimistic updates
 * - Automatic refetching
 */

import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

// Types
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

export interface UpdateProfilePayload {
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
}

// ===== RTK Query API =====

export const userApi = createApi({
  reducerPath: 'userApi',
  
  // Use fakeBaseQuery since we're calling Supabase directly
  baseQuery: fakeBaseQuery(),
  
  // Cache tags for automatic invalidation
  tagTypes: ['Profile'],
  
  endpoints: (builder) => ({
    
    // ===== GET PROFILE =====
    getProfile: builder.query<UserProfile, string | void>({
      queryFn: async (userId) => {
        try {
          logger.info('[userApi] Fetching profile for:', userId || 'current user');
          
          // If no userId provided, get current user
          const id = userId || (await supabase.auth.getUser()).data.user?.id;
          
          if (!id) {
            throw new Error('No user ID available');
          }
          
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          
          logger.info('[userApi] Profile fetched successfully');
          
          return { data };
        } catch (error: any) {
          logger.error('[userApi] Failed to fetch profile:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ['Profile'],
      // 5 minutes cache (same as userSlice)
      keepUnusedDataFor: 300,
    }),
    
    // ===== UPDATE PROFILE MUTATION =====
    updateProfile: builder.mutation<UserProfile, UpdateProfilePayload>({
      queryFn: async (updates) => {
        try {
          logger.info('[userApi] Updating profile');
          
          // Get current user ID
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error('No authenticated user');
          }
          
          const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select()
            .single();
          
          if (error) throw error;
          
          logger.info('[userApi] Profile updated successfully');
          
          return { data };
        } catch (error: any) {
          logger.error('[userApi] Failed to update profile:', error);
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      // Invalidate profile cache after update
      invalidatesTags: ['Profile'],
      // Optimistic update
      async onQueryStarted(updates, { dispatch, queryFulfilled }) {
        // Get current user ID for cache key
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Optimistically update getProfile cache
        const patchResult = dispatch(
          userApi.util.updateQueryData('getProfile', user.id, (draft) => {
            Object.assign(draft, updates);
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
  }),
});

// ===== EXPORT HOOKS =====

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
} = userApi;
