/**
 * Main hook for geo detection with histeresis
 * Integrates cache, bbox pre-filtering, Edge Function, and anti-bounce logic
 */

import { useState, useEffect, useRef, useCallback } from 'react';

import * as Location from 'expo-location';

import { supabase } from '@/lib/supabase';

import { getCachedGeoResult, setCachedGeoResult } from './cache';
import { getCandidateCountries, COUNTRY_BBOXES } from './countryBBoxes';
import {
  createHisteresisState,
  addReading,
  shouldChangeCountry,
  applyCountryChange,
  HisteresisState,
  GeoReading,
} from './histeresis';
import { shouldUsePreciseDetection } from './nearBorder';

// Configuration
const MIN_ACCURACY_M = 100; // Reject readings with accuracy > 100m
const POLLING_INTERVAL_MS = 10000; // Check location every 10 seconds
const EDGE_FUNCTION_TIMEOUT_MS = 5000; // 5 second timeout for Edge Function

export interface GeoDetectionResult {
  currentCountry: string | null;
  currentRegion: string | null;
  isDetecting: boolean;
  error: string | null;
  accuracy: number | null;
  isNearBorder: boolean;
  debugInfo: {
    lastReading: GeoReading | null;
    bufferSize: number;
    cacheHit: boolean;
    usedPreciseDetection: boolean;
  };
}

interface EdgeFunctionResponse {
  country: string;
  region: string | null;
  cached: boolean;
}

/**
 * Call Edge Function for precise detection
 */
async function callGeoLookup(lat: number, lng: number): Promise<EdgeFunctionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke('geo-lookup', {
      body: { latitude: lat, longitude: lng },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (error) throw error;
    if (!data) throw new Error('No data returned from geo-lookup');

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Main hook for geo detection
 */
export function useGeoDetection(enabled: boolean = true): GeoDetectionResult {
  const [state, setState] = useState<GeoDetectionResult>({
    currentCountry: null,
    currentRegion: null,
    isDetecting: false,
    error: null,
    accuracy: null,
    isNearBorder: false,
    debugInfo: {
      lastReading: null,
      bufferSize: 0,
      cacheHit: false,
      usedPreciseDetection: false,
    },
  });

  const histeresisState = useRef<HisteresisState>(createHisteresisState());
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  /**
   * Process single location reading
   */
  const processLocation = useCallback(async (location: Location.LocationObject) => {
    const { latitude, longitude, accuracy } = location.coords;

    // Reject low accuracy readings
    if (accuracy && accuracy > MIN_ACCURACY_M) {
      setState((prev) => ({
        ...prev,
        error: `Low accuracy: ${Math.round(accuracy)}m`,
        accuracy,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isDetecting: true, error: null, accuracy }));

    try {
      let countryCode: string;
      let regionCode: string | null = null;
      let cacheHit = false;
      let usedPreciseDetection = false;

      // Step 1: Check cache
      const cached = await getCachedGeoResult(latitude, longitude);
      if (cached) {
        countryCode = cached.country;
        regionCode = cached.region;
        cacheHit = true;
      } else {
        // Step 2: Pre-filter with bboxes
        const candidates = getCandidateCountries(latitude, longitude);

        // Step 3: Decide if precise detection is needed
        const needsPrecise = shouldUsePreciseDetection(
          latitude,
          longitude,
          candidates,
          COUNTRY_BBOXES
        );

        if (needsPrecise || candidates.length !== 1) {
          // Use Edge Function (PIP)
          usedPreciseDetection = true;
          const result = await callGeoLookup(latitude, longitude);
          countryCode = result.country;
          regionCode = result.region;

          // Cache result
          await setCachedGeoResult(latitude, longitude, {
            country: countryCode,
            region: regionCode,
          });
        } else {
          // Fast path: single bbox match
          countryCode = candidates[0];
          // Cache result
          await setCachedGeoResult(latitude, longitude, {
            country: countryCode,
            region: null,
          });
        }
      }

      // Step 4: Create reading
      const reading: GeoReading = {
        countryCode,
        regionCode,
        lat: latitude,
        lng: longitude,
        timestamp: Date.now(),
        accuracy: accuracy || 0,
      };

      // Step 5: Add to histeresis buffer
      histeresisState.current = addReading(histeresisState.current, reading);

      // Step 6: Check if country should change
      const changeResult = shouldChangeCountry(histeresisState.current);

      if (changeResult.shouldChange && changeResult.newCountry) {
        // Apply change
        histeresisState.current = applyCountryChange(
          histeresisState.current,
          changeResult.newCountry,
          changeResult.newRegion
        );

        // Check if near border
        const nearBorder = shouldUsePreciseDetection(
          latitude,
          longitude,
          [changeResult.newCountry],
          COUNTRY_BBOXES
        );

        setState((prev) => ({
          ...prev,
          currentCountry: changeResult.newCountry,
          currentRegion: changeResult.newRegion,
          isDetecting: false,
          isNearBorder: nearBorder,
          debugInfo: {
            lastReading: reading,
            bufferSize: histeresisState.current.readingBuffer.length,
            cacheHit,
            usedPreciseDetection,
          },
        }));
      } else {
        // No change, update debug info only
        setState((prev) => ({
          ...prev,
          isDetecting: false,
          debugInfo: {
            lastReading: reading,
            bufferSize: histeresisState.current.readingBuffer.length,
            cacheHit,
            usedPreciseDetection,
          },
        }));
      }
    } catch (err) {
      console.error('Error processing location:', err);
      setState((prev) => ({
        ...prev,
        isDetecting: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  /**
   * Start location watching
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;

    const startWatching = async () => {
      try {
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setState((prev) => ({
            ...prev,
            error: 'Location permission denied',
          }));
          return;
        }

        // Start watching
        if (isMounted) {
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: POLLING_INTERVAL_MS,
              distanceInterval: 100, // Update every 100m
            },
            (location) => {
              if (isMounted) {
                processLocation(location);
              }
            }
          );
        }
      } catch (err) {
        console.error('Error starting location watch:', err);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : 'Failed to start location watch',
          }));
        }
      }
    };

    startWatching();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [enabled, processLocation]);

  return state;
}
