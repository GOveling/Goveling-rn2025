import { useState, useCallback } from 'react';

import * as Location from 'expo-location';

import polyline from '@mapbox/polyline';

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
};

export type TransitResult = {
  mode: 'transit';
  deepLinks: {
    apple: string;
    google: string;
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

        // Decode polyline for non-transit modes
        if (!data.polyline) {
          throw new Error('no_polyline_in_response');
        }

        const coords = polyline
          .decode(data.polyline)
          .map(([lat, lng]: [number, number]) => [lng, lat] as [number, number]);

        const routeResult: RouteResult = {
          mode: data.mode,
          distance_m: data.distance_m,
          duration_s: data.duration_s,
          coords,
          bbox: data.bbox,
          steps: data.steps || [],
          cached: data.cached,
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

  // 5. Decode polyline
  if (!data.polyline) {
    throw new Error('no_polyline_in_response');
  }

  const coords = polyline
    .decode(data.polyline)
    .map(([lat, lng]: [number, number]) => [lng, lat] as [number, number]);

  return {
    mode: data.mode,
    distance_m: data.distance_m,
    duration_s: data.duration_s,
    coords,
    bbox: data.bbox,
    steps: data.steps || [],
    cached: data.cached,
  };
}
