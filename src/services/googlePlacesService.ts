/**
 * Google Places Service
 * Utiliza Supabase Edge Function - google-places-enhanced
 * Igual que la implementación de Explore
 *
 * NUEVO: Integración híbrida con Nominatim para reverse geocoding
 */

import { supabase } from '@/lib/supabase';

import NominatimService from './nominatimService';

// Interfaz compatible con Explore
export interface NearbyPlace {
  id: string;
  name: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now?: boolean;
  };
  formatted_address?: string;
  place_id?: string;
  distance?: number;
  category?: string;
}

// Interfaz para el lugar de la API de Supabase
interface EnhancedPlace {
  id: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  rating?: number;
  reviews_count?: number;
  category?: string;
  types?: string[];
  priceLevel?: number;
  openNow?: boolean;
  distance_km?: number;
  photos?: string[];
}

class GooglePlacesService {
  /**
   * Buscar lugares cercanos usando Supabase Edge Function
   * Igual que ExploreService.searchNearbyPlaces()
   */
  static async searchNearbyPlaces(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    types?: string[]
  ): Promise<NearbyPlace[]> {
    try {
      console.log('🔍 Searching nearby places via Supabase Edge Function');

      const { data, error } = await supabase.functions.invoke('google-places-enhanced', {
        body: {
          input: '', // Empty for nearby search
          selectedCategories: types || [],
          userLocation: { lat: latitude, lng: longitude },
          radius,
          searchType: 'nearby',
        },
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        return [];
      }

      if (!data?.predictions || data.predictions.length === 0) {
        console.log('ℹ️ No places found nearby');
        return [];
      }

      // Convertir de formato EnhancedPlace a NearbyPlace
      const places: NearbyPlace[] = data.predictions.map((place: EnhancedPlace) => {
        const lat = place.coordinates?.lat || 0;
        const lng = place.coordinates?.lng || 0;
        const distance = place.distance_km
          ? Math.round(place.distance_km * 1000)
          : this.calculateDistance(latitude, longitude, lat, lng);

        return {
          id: place.id,
          place_id: place.id,
          name: place.name,
          vicinity: place.address,
          formatted_address: place.address,
          geometry: {
            location: {
              lat,
              lng,
            },
          },
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.reviews_count,
          price_level: place.priceLevel,
          photos: place.photos?.map((url: string) => ({
            photo_reference: url,
            height: 400,
            width: 400,
          })),
          opening_hours: place.openNow !== undefined ? { open_now: place.openNow } : undefined,
          distance,
          category: place.category || this.getCategoryFromTypes(place.types),
        };
      });

      console.log(`✅ Found ${places.length} nearby places`);
      return places;
    } catch (error) {
      console.error('❌ Error searching nearby places:', error);
      return [];
    }
  }

  /**
   * Buscar lugares por texto usando Supabase Edge Function
   */
  static async searchPlaces(
    query: string,
    location?: { latitude: number; longitude: number },
    radius: number = 5000
  ): Promise<NearbyPlace[]> {
    try {
      console.log('🔍 Searching places by text via Supabase Edge Function:', query);

      const { data, error } = await supabase.functions.invoke('google-places-enhanced', {
        body: {
          input: query,
          selectedCategories: [],
          userLocation: location ? { lat: location.latitude, lng: location.longitude } : undefined,
          radius,
          searchType: 'text',
        },
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        return [];
      }

      if (!data?.predictions || data.predictions.length === 0) {
        console.log('ℹ️ No places found for query:', query);
        return [];
      }

      // Convertir de formato EnhancedPlace a NearbyPlace
      const places: NearbyPlace[] = data.predictions.map((place: EnhancedPlace) => {
        const lat = place.coordinates?.lat || 0;
        const lng = place.coordinates?.lng || 0;
        const distance =
          location && place.distance_km
            ? Math.round(place.distance_km * 1000)
            : location
              ? this.calculateDistance(location.latitude, location.longitude, lat, lng)
              : undefined;

        return {
          id: place.id,
          place_id: place.id,
          name: place.name,
          vicinity: place.address,
          formatted_address: place.address,
          geometry: {
            location: {
              lat,
              lng,
            },
          },
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.reviews_count,
          price_level: place.priceLevel,
          photos: place.photos?.map((url: string) => ({
            photo_reference: url,
            height: 400,
            width: 400,
          })),
          opening_hours: place.openNow !== undefined ? { open_now: place.openNow } : undefined,
          distance,
          category: place.category || this.getCategoryFromTypes(place.types),
        };
      });

      console.log(`✅ Found ${places.length} places for query: "${query}"`);
      return places;
    } catch (error) {
      console.error('❌ Error searching places:', error);
      return [];
    }
  }

  /**
   * 🎯 MÉTODO HÍBRIDO: Obtener lugar a partir de coordenadas GPS
   *
   * Estrategia:
   * 1. Usar Nominatim (gratis) para obtener el nombre del lugar
   * 2. Buscar ese nombre en Google Places para enriquecer con fotos, ratings, etc.
   * 3. Si Google Places no encuentra nada, devolver resultado básico de Nominatim
   *
   * @param latitude - Latitud GPS
   * @param longitude - Longitud GPS
   * @returns Lugar enriquecido con datos de Google Places (o básico de Nominatim)
   */
  static async getPlaceFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<NearbyPlace | null> {
    try {
      console.log(`🎯 Hybrid reverse geocoding for: ${latitude}, ${longitude}`);

      // PASO 1: Obtener nombre del lugar desde Nominatim (GRATIS)
      const nominatimResult = await NominatimService.reverseGeocode(latitude, longitude);

      if (!nominatimResult) {
        console.error('❌ Nominatim reverse geocoding failed');
        return null;
      }

      console.log(`📍 Nominatim found: "${nominatimResult.name}"`);

      // PASO 2: Buscar en Google Places usando el nombre de Nominatim
      // Esto enriquece el resultado con fotos, ratings, etc.
      const googlePlaces = await this.searchPlaces(
        nominatimResult.name,
        { latitude, longitude },
        500 // Radio pequeño (500m) para asegurar precisión
      );

      // PASO 3: Si Google Places encuentra resultados, devolver el más cercano
      if (googlePlaces.length > 0) {
        // Ordenar por distancia y tomar el primero
        const sortedPlaces = googlePlaces.sort((a, b) => {
          const distA = a.distance || 999999;
          const distB = b.distance || 999999;
          return distA - distB;
        });

        const enrichedPlace = sortedPlaces[0];
        console.log(`✅ Enriched with Google Places: "${enrichedPlace.name}"`);
        console.log('🔍 Google Place details:', {
          id: enrichedPlace.id,
          place_id: enrichedPlace.place_id,
          rating: enrichedPlace.rating,
          user_ratings_total: enrichedPlace.user_ratings_total,
          photos: enrichedPlace.photos?.length || 0,
          types: enrichedPlace.types?.slice(0, 3), // Primeros 3 tipos
          formatted_address: enrichedPlace.formatted_address,
        });
        return enrichedPlace;
      }

      // PASO 4: Si Google Places no encuentra nada, devolver resultado básico de Nominatim
      console.log('ℹ️ Using basic Nominatim result (no Google Places enrichment)');

      const basicPlace: NearbyPlace = {
        id: `nominatim-${Date.now()}`,
        place_id: `nominatim-${Date.now()}`,
        name: nominatimResult.name,
        vicinity: nominatimResult.displayName,
        formatted_address: nominatimResult.displayName,
        geometry: {
          location: {
            lat: nominatimResult.latitude,
            lng: nominatimResult.longitude,
          },
        },
        types: nominatimResult.type ? [nominatimResult.type] : undefined,
        distance: 0, // Es la ubicación exacta
      };

      return basicPlace;
    } catch (error) {
      console.error('❌ Hybrid reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Calcular distancia usando fórmula de Haversine
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 1000); // Convertir a metros
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Formatear distancia para mostrar
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Obtener categoría desde tipos
   */
  private static getCategoryFromTypes(types?: string[]): string {
    if (!types || types.length === 0) return 'general';

    const categoryMap: { [key: string]: string } = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      tourist_attraction: 'attraction',
      park: 'park',
      museum: 'museum',
      shopping_mall: 'shopping',
      hotel: 'hotel',
      airport: 'transport',
      transit_station: 'transport',
    };

    for (const type of types) {
      if (categoryMap[type]) {
        return categoryMap[type];
      }
    }

    return 'general';
  }

  /**
   * Convertir price_level de string a número
   */
  private static parsePriceLevel(priceLevel: string): number | undefined {
    const map: { [key: string]: number } = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    };
    return map[priceLevel];
  }

  /**
   * Verificar si el servicio está configurado
   * (Supabase Edge Function siempre está disponible)
   */
  static isConfigured(): boolean {
    return true; // Edge function siempre disponible
  }

  /**
   * Obtener info del servicio (para debugging)
   */
  static getApiKey(): string {
    return 'Using Supabase Edge Function';
  }
}

export default GooglePlacesService;
