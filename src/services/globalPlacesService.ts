import { supabase } from '@/lib/supabase';

export interface GlobalPlace {
  id: string;
  google_place_id: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  place_types: string[] | null;
  photo_reference: string | null;
  posts_count: number;
  users_count: number;
  created_at: string;
  updated_at: string;
  last_used_at: string;
}

export interface CreateGlobalPlaceParams {
  google_place_id?: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  category?: string;
  place_types?: string[];
  photo_reference?: string;
}

export class GlobalPlacesService {
  /**
   * Buscar o crear un lugar global
   * Usa la función SQL find_or_create_global_place
   */
  static async findOrCreatePlace(params: CreateGlobalPlaceParams): Promise<string> {
    // Asegurarse de que latitude y longitude sean números
    const latitude =
      typeof params.latitude === 'string' ? parseFloat(params.latitude) : params.latitude;
    const longitude =
      typeof params.longitude === 'string' ? parseFloat(params.longitude) : params.longitude;

    console.log('🔢 GlobalPlacesService - Type check:', {
      latitude_type: typeof latitude,
      latitude_value: latitude,
      longitude_type: typeof longitude,
      longitude_value: longitude,
    });

    const { data, error } = await supabase.rpc('find_or_create_global_place', {
      p_google_place_id: params.google_place_id || null,
      p_name: params.name,
      p_latitude: latitude,
      p_longitude: longitude,
      p_address: params.address || null,
      p_category: params.category || null,
      p_place_types: params.place_types || null,
      p_photo_reference: params.photo_reference || null,
    });

    if (error) {
      console.error('Error finding/creating global place:', error);
      throw new Error(`Failed to create place: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Buscar lugares globales por nombre
   */
  static async searchPlaces(query: string, limit = 20): Promise<GlobalPlace[]> {
    const { data, error } = await supabase
      .from('global_places')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('posts_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching global places:', error);
      throw new Error(`Failed to search places: ${error.message}`);
    }

    return data as GlobalPlace[];
  }

  /**
   * Obtener lugares populares (más usados)
   */
  static async getPopularPlaces(limit = 50): Promise<GlobalPlace[]> {
    const { data, error } = await supabase
      .from('global_places')
      .select('*')
      .gt('posts_count', 0)
      .order('posts_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting popular places:', error);
      throw new Error(`Failed to get popular places: ${error.message}`);
    }

    return data as GlobalPlace[];
  }

  /**
   * Obtener un lugar por ID
   */
  static async getPlaceById(placeId: string): Promise<GlobalPlace | null> {
    const { data, error } = await supabase
      .from('global_places')
      .select('*')
      .eq('id', placeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error getting place by ID:', error);
      throw new Error(`Failed to get place: ${error.message}`);
    }

    return data as GlobalPlace;
  }

  /**
   * Buscar lugares cercanos a coordenadas
   * Requiere la extensión earthdistance
   */
  static async getNearbyPlaces(
    latitude: number,
    longitude: number,
    radiusKm = 10,
    limit = 20
  ): Promise<GlobalPlace[]> {
    const { data, error } = await supabase.rpc('get_nearby_global_places', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_km: radiusKm,
      p_limit: limit,
    });

    if (error) {
      console.error('Error getting nearby places:', error);
      // Si la función no existe, fallback a búsqueda simple
      return [];
    }

    return data as GlobalPlace[];
  }
}
