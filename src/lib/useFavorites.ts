// src/lib/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';

import { EnhancedPlace } from './placesSearch';
import { supabase } from './supabase';
import { resolveUserRoleForTrip } from './userUtils';

interface FavoritePlace {
  id: string;
  trip_id: string;
  place_id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  category?: string;
  created_at: string;
}

type TripMinimal = { id: string; owner_id?: string | null; user_id?: string | null };

// Helper functions
const getUserTripIds = async (userId: string): Promise<string[]> => {
  // Return trips where the user is owner or active collaborator (any role)
  const { data: ownTrips } = await supabase
    .from('trips')
    .select('id, owner_id, user_id')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`);
  const { data: collabTrips } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  const ownIds = (ownTrips || []).map((t: TripMinimal) => t.id);
  const collabIds = (collabTrips || []).map((c) => c.trip_id);
  return [...ownIds, ...collabIds];
};

const getOrCreateFavoritesTrip = async (userId: string): Promise<string | null> => {
  // First, try to find an existing "Favorites" or similar trip
  const { data: existingTrips } = await supabase
    .from('trips')
    .select('id')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
    .ilike('name', '%favorite%')
    .limit(1);

  if (existingTrips && existingTrips.length > 0) {
    return existingTrips[0].id;
  }

  // If no favorites trip exists, get the most recent trip
  const { data: recentTrips } = await supabase
    .from('trips')
    .select('id')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentTrips && recentTrips.length > 0) {
    return recentTrips[0].id;
  }

  // If no trips exist, create a "Favorites" trip
  const { data: newTrip, error } = await supabase
    .from('trips')
    .insert([
      {
        owner_id: userId,
        user_id: userId, // legacy
        name: 'My Favorites',
        description: 'Places I want to visit',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating favorites trip:', error);
    return null;
  }

  return newTrip?.id || null;
};

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get all trip IDs where user is owner or collaborator
      const { data: ownTrips } = await supabase.from('trips').select('id').eq('user_id', user.id);
      const { data: collabTrips } = await supabase
        .from('trip_collaborators')
        .select('trip_id')
        .eq('user_id', user.id);

      const tripIds = [
        ...(ownTrips || []).map((t) => t.id),
        ...(collabTrips || []).map((c) => c.trip_id),
      ];

      if (tripIds.length === 0) {
        setFavorites([]);
        return;
      }

      const { data, error } = await supabase
        .from('trip_places')
        .select('place_id')
        .in('trip_id', tripIds);

      if (error) {
        console.error('Error loading favorites:', error);
        return;
      }

      // Get unique place_ids (a place might be in multiple trips)
      const uniquePlaceIds = [...new Set(data?.map((item) => item.place_id) || [])];
      setFavorites(uniquePlaceIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  // Cargar favoritos al inicializar
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (placeId: string) => {
      return favorites.includes(placeId);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (place: EnhancedPlace) => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.error('User not authenticated');
          return false;
        }

        const isCurrentlyFavorite = isFavorite(place.id);

        if (isCurrentlyFavorite) {
          // Remove only from trips where the user is owner or editor
          const allTripIds = await getUserTripIds(user.id);
          const permittedTripIds: string[] = [];
          if (allTripIds.length > 0) {
            // Fetch minimal trip rows to resolve roles
            const { data: tripRows } = await supabase
              .from('trips')
              .select('id, owner_id, user_id')
              .in('id', allTripIds);
            for (const t of (tripRows as TripMinimal[] | null) || []) {
              const role = await resolveUserRoleForTrip(user.id, {
                id: t.id,
                owner_id: t.owner_id,
                user_id: t.user_id,
              });
              if (role === 'owner' || role === 'editor') permittedTripIds.push(t.id);
            }
          }

          if (permittedTripIds.length === 0) {
            console.warn('[useFavorites] No trips with edit permission to remove favorite');
            return false;
          }

          const { error } = await supabase
            .from('trip_places')
            .delete()
            .eq('place_id', place.id)
            .in('trip_id', permittedTripIds);

          if (error) {
            console.error('Error removing favorite:', error);
            return false;
          }

          setFavorites((prev) => prev.filter((id) => id !== place.id));
        } else {
          // Add to a trip - find user's most recent trip or create a "Favorites" trip
          const tripId = await getOrCreateFavoritesTrip(user.id);

          if (!tripId) {
            console.error('Could not get or create favorites trip');
            return false;
          }

          const tripPlaceData = {
            trip_id: tripId,
            place_id: place.id,
            name: place.name,
            lat: place.coordinates?.lat,
            lng: place.coordinates?.lng,
            address: place.address,
            category: place.category,
          };

          const { error } = await supabase.from('trip_places').insert([tripPlaceData]);

          if (error) {
            console.error('Error adding favorite:', error);
            return false;
          }

          setFavorites((prev) => [...prev, place.id]);
        }

        return true;
      } catch (error) {
        console.error('Error toggling favorite:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [isFavorite]
  );

  const getFavorites = useCallback(async (): Promise<FavoritePlace[]> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const tripIds = await getUserTripIds(user.id);

      if (tripIds.length === 0) return [];

      const { data, error } = await supabase
        .from('trip_places')
        .select('*')
        .in('trip_id', tripIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting favorites:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  }, []);

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    getFavorites,
    refreshFavorites: loadFavorites,
  };
}
