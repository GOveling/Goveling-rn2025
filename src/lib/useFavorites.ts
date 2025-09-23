// src/lib/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { EnhancedPlace } from './placesSearch';

interface FavoritePlace {
  id: string;
  place_id: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  rating?: number;
  photos?: string[];
  category?: string;
  created_at: string;
  user_id: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar favoritos al inicializar
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('favorite_places')
        .select('place_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading favorites:', error);
        return;
      }

      setFavorites(data?.map(item => item.place_id) || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  const isFavorite = useCallback((placeId: string) => {
    return favorites.includes(placeId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (place: EnhancedPlace) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return false;
      }

      const isCurrentlyFavorite = isFavorite(place.id);

      if (isCurrentlyFavorite) {
        // Remover de favoritos
        const { error } = await supabase
          .from('favorite_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', place.id);

        if (error) {
          console.error('Error removing favorite:', error);
          return false;
        }

        setFavorites(prev => prev.filter(id => id !== place.id));
      } else {
        // Añadir a favoritos
        const favoriteData = {
          user_id: user.id,
          place_id: place.id,
          name: place.name,
          address: place.address,
          coordinates: place.coordinates,
          rating: place.rating,
          photos: place.photos,
          category: place.category,
        };

        const { error } = await supabase
          .from('favorite_places')
          .insert([favoriteData]);

        if (error) {
          console.error('Error adding favorite:', error);
          return false;
        }

        setFavorites(prev => [...prev, place.id]);
      }

      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isFavorite]);

  const getFavorites = useCallback(async (): Promise<FavoritePlace[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorite_places')
        .select('*')
        .eq('user_id', user.id)
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
