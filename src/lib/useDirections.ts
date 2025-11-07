import { useState, useCallback } from 'react';

import * as Location from 'expo-location';

import { supabase } from './supabase';

// Types
export type TransportMode = 'walking' | 'cycling' | 'driving' | 'transit';

export type RouteStep = {
  instruction: string;
  distance_m: number;
  duration_s: number;
  type?: string;
  name?: string;
};

export type RouteResult = {
  mode: TransportMode;
  distance_m: number;
  duration_s: number;
  coords: [number, number][]; // [lng, lat][]
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  steps: RouteStep[];
  cached?: boolean;
  source?: 'osrm' | 'ors'; // Routing engine used
};

export type TransitResult = {
  mode: 'transit';
  deepLinks: {
    apple: string;
    google: string;
    waze: string;
  };
};

export type DirectionsResult = RouteResult | TransitResult;

// Hook for directions
export function useDirections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DirectionsResult | null>(null);

  const fetchDirections = useCallback(
    async (
      origin: { lat: number; lng: number },
      destination: { lat: number; lng: number },
      mode: TransportMode,
      language?: string
    ) => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        // Call Edge Function
        const { data, error: invokeError } = await supabase.functions.invoke('directions', {
          body: {
            origin: [origin.lng, origin.lat], // ORS uses [lng, lat]
            destination: [destination.lng, destination.lat],
            mode,
            language: language || 'en',
          },
        });

        if (invokeError) {
          console.error('❌ Directions invoke error:', invokeError);
          throw new Error(invokeError.message || 'directions_failed');
        }

        if (!data || !data.ok) {
          console.error('❌ Directions response error:', data);
          throw new Error(data?.error || 'route_not_found');
        }

        // Handle transit (deep links)
        if (data.mode === 'transit') {
          setResult({
            mode: 'transit',
            deepLinks: data.deepLinks,
          });
          return data as TransitResult;
        }

        // The Edge Function now returns coords directly (no need to decode polyline)
        if (!data.coords || !Array.isArray(data.coords)) {
          throw new Error('no_coords_in_response');
        }

        const coords = data.coords as [number, number][];

        const routeResult: RouteResult = {
          mode: data.mode,
          distance_m: data.distance_m,
          duration_s: data.duration_s,
          coords,
          bbox: data.bbox,
          steps: data.steps || [],
          cached: data.cached,
          source: data.source, // Routing engine: 'osrm' or 'ors'
        };

        setResult(routeResult);
        return routeResult;
      } catch (e) {
        console.error('❌ Error fetching directions:', e);
        const errorMessage = (e as Error).message || 'error_fetching_directions';
        setError(errorMessage);
        setResult(null);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, result, fetchDirections };
}

// Helper function to get route from current location to place
export async function getRouteToPlace(
  place: { lat: number; lng: number },
  mode: TransportMode,
  language?: string
): Promise<DirectionsResult> {
  // 1. Request location permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('location_permission_denied');
  }

  // 2. Get current location
  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const origin = {
    lat: current.coords.latitude,
    lng: current.coords.longitude,
  };

  const destination = {
    lat: place.lat,
    lng: place.lng,
  };

  // 3. Call Edge Function
  const { data, error } = await supabase.functions.invoke('directions', {
    body: {
      origin: [origin.lng, origin.lat],
      destination: [destination.lng, destination.lat],
      mode,
      language: language || 'en',
    },
  });

  if (error || !data || !data.ok) {
    throw new Error(data?.error || error?.message || 'route_failed');
  }

  // 4. Handle transit
  if (data.mode === 'transit') {
    return {
      mode: 'transit',
      deepLinks: data.deepLinks,
    };
  }

  // 5. Coords already come decoded from Edge Function
  if (!data.coords || !Array.isArray(data.coords)) {
    throw new Error('no_coords_in_response');
  }

  const coords = data.coords as [number, number][];

  return {
    mode: data.mode,
    distance_m: data.distance_m,
    duration_s: data.duration_s,
    coords,
    bbox: data.bbox,
    steps: data.steps || [],
    cached: data.cached,
    source: data.source, // Routing engine: 'osrm' or 'ors'
  };
}

/**
 * Recalculate route for walking/cycling modes during navigation
 * Use this when:
 * - User deviates from route (>50m off track)
 * - User's location updates significantly (>100m moved)
 * - Want to check for a better/shorter route
 *
 * OSRM-FIRST POLICY: Always tries OSRM for walking/cycling (free, no limits)
 * ORS is only used if OSRM completely fails to return a route
 *
 * @param currentLocation User's current GPS location
 * @param destination Final destination
 * @param mode Transport mode (walking or cycling recommended)
 * @param language Optional language for instructions
 * @returns Updated route or null if recalculation fails
 */
export async function recalculateRoute(
  currentLocation: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TransportMode,
  language?: string
): Promise<RouteResult | null> {
  try {
    // Validar entrada
    if (!currentLocation?.lat || !currentLocation?.lng || !destination?.lat || !destination?.lng) {
      console.error('❌ [Route Recalculation] Invalid coordinates:', {
        currentLocation,
        destination,
      });
      return null;
    }

    console.log('🔄 [Route Recalculation] Starting...', {
      mode,
      currentLocation,
      destination,
    });

    // Call Edge Function with current location as origin
    const { data, error } = await supabase.functions.invoke('directions', {
      body: {
        origin: [currentLocation.lng, currentLocation.lat],
        destination: [destination.lng, destination.lat],
        mode,
        language: language || 'en',
      },
    });

    if (error) {
      console.error('❌ [Route Recalculation] Supabase error:', error);
      return null;
    }

    if (!data || !data.ok) {
      console.error('❌ [Route Recalculation] API returned error:', {
        data,
        error: data?.error,
        message: data?.message,
      });
      return null;
    }

    // Transit doesn't support recalculation
    if (data.mode === 'transit') {
      console.log('⚠️ [Route Recalculation] Transit mode not supported');
      return null;
    }

    // Validate coords
    if (!data.coords || !Array.isArray(data.coords)) {
      console.error('❌ [Route Recalculation] No coords in response');
      return null;
    }

    const recalculatedRoute: RouteResult = {
      mode: data.mode,
      distance_m: data.distance_m,
      duration_s: data.duration_s,
      coords: data.coords as [number, number][],
      bbox: data.bbox,
      steps: data.steps || [],
      cached: data.cached,
      source: data.source,
    };

    console.log('✅ [Route Recalculation] Success:', {
      distance: `${(data.distance_m / 1000).toFixed(2)}km`,
      duration: `${Math.round(data.duration_s / 60)}min`,
      source: data.source,
      cached: data.cached,
    });

    return recalculatedRoute;
  } catch (err) {
    console.error('❌ [Route Recalculation] Exception:', err);
    return null;
  }
}
