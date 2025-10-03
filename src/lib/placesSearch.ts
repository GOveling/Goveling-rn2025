import { supabase } from './supabase';

export interface PlacesSearchParams {
  input: string;
  selectedCategories?: string[];
  userLocation?: { lat: number; lng: number };
  locale?: string;
}

export interface EnhancedPlace {
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
  business_status?: string;
  distance_km?: number;
  photos?: string[];
  source: string;
  score?: number;
  description?: string;
  phone?: string;
  website?: string;
  confidence_score?: number;
  geocoded?: boolean;
  opening_hours_raw?: any;
}

export interface PlacesSearchResponse {
  predictions: EnhancedPlace[];
  status: 'OK' | 'ERROR';
  source: string;
  count?: number;
  took_ms?: number;
  error?: string;
}

// Cache en memoria de corto plazo (sesión)
export function clearPlacesCache() {
  memoryCache.clear();
  console.log('[placesSearch] Cache cleared');
}

const memoryCache = new Map<string, { ts: number; data: PlacesSearchResponse }>();
const CACHE_TTL_MS = 30_000; // 30s

// Función para limpiar el cache (útil en desarrollo)
export function clearSearchCache() {
  memoryCache.clear();
  console.log('[placesSearch] Cache cleared');
}

function cacheKey(p: PlacesSearchParams) {
  return JSON.stringify({
    i: p.input.trim().toLowerCase(),
    c: (p.selectedCategories||[]).sort(),
    u: p.userLocation ? [p.userLocation.lat.toFixed(3), p.userLocation.lng.toFixed(3)] : null,
    l: p.locale
  });
}

export async function searchPlacesEnhanced(params: PlacesSearchParams, signal?: AbortSignal): Promise<PlacesSearchResponse> {
  console.log('[placesSearch] Input params:', JSON.stringify(params, null, 2));
  console.log('[placesSearch] Platform info:', {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    isWeb: typeof window !== 'undefined',
    hasSupabase: !!supabase
  });
  
  if (!params.input || params.input.trim().length < 2) {
    console.log('[placesSearch] Input too short, returning empty');
    return { predictions: [], status: 'OK', source: 'google_places_enhanced' };
  }

  const key = cacheKey(params);
  const cached = memoryCache.get(key);
  const now = Date.now();
  if (cached && (now - cached.ts) < CACHE_TTL_MS && cached.data.status === 'OK') {
    console.log('[placesSearch] Using cached result');
    return cached.data;
  } else if (cached && cached.data.status === 'ERROR') {
    console.log('[placesSearch] Clearing cached error');
    memoryCache.delete(key);
  }

  try {
    console.log('[placesSearch] Invoking edge function google-places-enhanced');
    
    // En desarrollo web (localhost), usar fetch directo para evitar problemas de CORS
    const isWebDev = typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost';
    
    if (isWebDev) {
      console.log('[placesSearch] Using direct fetch for web development');
      console.log('[placesSearch] Window location:', window.location?.href);
      
      // En web, usar las variables de entorno explícitamente
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg';
      
      console.log('[placesSearch] Using URLs:', { supabaseUrl, hasAnonKey: !!anonKey });
      
      const response = await fetch(`${supabaseUrl}/functions/v1/google-places-enhanced`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(params),
        ...(signal ? { signal } : {})
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[placesSearch] HTTP error:', response.status, errorText);
        const resp: PlacesSearchResponse = { 
          predictions: [], 
          status: 'ERROR', 
          source: 'google_places_enhanced', 
          error: `HTTP ${response.status}: ${errorText}` 
        };
        memoryCache.set(key, { ts: now, data: resp });
        return resp;
      }

      const data = await response.json();
      console.log('[placesSearch] Direct fetch response:', data);
      console.log('[placesSearch] First place photos:', data?.predictions?.[0]?.photos);
      memoryCache.set(key, { ts: now, data });
      return data as PlacesSearchResponse;
    } else {
      // Usar el cliente de Supabase normal en producción y nativo
      const { data, error } = await supabase.functions.invoke('google-places-enhanced', {
        body: params,
        ...(signal ? { signal } : {})
      } as any);

      console.log('[placesSearch] Supabase client response:', { data, error });

      if (error) {
        console.error('[placesSearch] Error from edge function:', error);
        const resp: PlacesSearchResponse = { predictions: [], status: 'ERROR', source: 'google_places_enhanced', error: error.message };
        memoryCache.set(key, { ts: now, data: resp });
        return resp;
      }

      console.log('[placesSearch] Success, caching and returning data');
      memoryCache.set(key, { ts: now, data });
      return data as PlacesSearchResponse;
    }
  } catch (networkError) {
    console.error('[placesSearch] Network error:', networkError);
    const resp: PlacesSearchResponse = { 
      predictions: [], 
      status: 'ERROR', 
      source: 'google_places_enhanced', 
      error: `Network error: ${networkError.message}` 
    };
    memoryCache.set(key, { ts: now, data: resp });
    return resp;
  }
}
