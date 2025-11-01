/**
 * useCountryDetectionOnAppStart
 * Detects country changes when the app is opened (background → foreground)
 * Shows welcome modal and updates database automatically
 */

import { useState, useEffect, useRef } from 'react';

import { AppState, AppStateStatus } from 'react-native';

import * as Location from 'expo-location';

import { supabase } from '~/lib/supabase';
import {
  countryDetectionService,
  CountryInfo,
} from '~/services/travelMode/CountryDetectionService';

interface SavedPlace {
  id: string;
  name: string;
  city?: string;
  type?: string;
}

export interface CountryDetectionState {
  isDetecting: boolean;
  pendingCountryVisit: {
    countryInfo: CountryInfo;
    isReturn: boolean;
    coordinates: { latitude: number; longitude: number };
    savedPlaces: SavedPlace[];
  } | null;
}

export function useCountryDetectionOnAppStart() {
  const [state, setState] = useState<CountryDetectionState>({
    isDetecting: false,
    pendingCountryVisit: null,
  });

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasDetectedOnLaunch = useRef(false);

  /**
   * Get saved places in active trips for the detected country (max 5)
   */
  const getSavedPlacesInCountry = async (
    userId: string,
    countryCode: string
  ): Promise<SavedPlace[]> => {
    try {
      console.log(`🗺️ Fetching saved places for ${countryCode}...`);

      // Get user's trips (owner or collaborator)
      // Filter for upcoming or current trips (end_date >= today)
      const today = new Date().toISOString().split('T')[0];

      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id')
        .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
        .gte('end_date', today)
        .order('start_date', { ascending: true });

      if (tripsError) {
        console.error('❌ Error fetching trips:', tripsError);
        return [];
      }

      if (!trips || trips.length === 0) {
        console.log('ℹ️ No active or upcoming trips found');
        return [];
      }

      const tripIds = trips.map((t) => t.id);
      console.log(`📍 Found ${tripIds.length} active/upcoming trips`);

      // Get places from those trips that match the country code
      const { data: places, error: placesError } = await supabase
        .from('trip_places')
        .select('id, name, city, type, category, country_code')
        .in('trip_id', tripIds)
        .eq('country_code', countryCode)
        .limit(5);

      if (placesError) {
        console.error('❌ Error fetching places:', placesError);

        // Fallback: if country_code doesn't exist yet, try with coordinates
        console.log('⚠️ Trying fallback with coordinates...');
        return await getSavedPlacesInCountryFallback(userId, countryCode, tripIds);
      }

      // Check if we got places
      if (!places || places.length === 0) {
        console.log(`⚠️ No places found with country_code='${countryCode}', trying fallback...`);
        return await getSavedPlacesInCountryFallback(userId, countryCode, tripIds);
      }

      console.log(`✅ Found ${places.length} places in ${countryCode}`);

      return places.map((place) => ({
        id: place.id,
        name: place.name,
        city: place.city || undefined,
        type: place.type || place.category || undefined,
      }));
    } catch (error) {
      console.error('❌ Exception getting saved places:', error);
      return [];
    }
  };

  /**
   * Fallback: Get places using coordinates (for places without country_code)
   */
  const getSavedPlacesInCountryFallback = async (
    userId: string,
    countryCode: string,
    tripIds: string[]
  ): Promise<SavedPlace[]> => {
    try {
      // Get all places from those trips with coordinates
      const { data: allPlaces, error: placesError } = await supabase
        .from('trip_places')
        .select('id, name, city, type, category, lat, lng')
        .in('trip_id', tripIds)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (placesError) {
        console.error('❌ Error fetching places (fallback):', placesError);
        return [];
      }

      if (!allPlaces || allPlaces.length === 0) {
        console.log('ℹ️ No places with coordinates found');
        return [];
      }

      console.log(`🔍 Checking ${allPlaces.length} places for country match (fallback)...`);

      // Filter places by country using the detection service
      const placesInCountry: SavedPlace[] = [];
      for (const place of allPlaces) {
        if (place.lat && place.lng) {
          const detectedCountry = await countryDetectionService.detectCountry({
            latitude: parseFloat(place.lat.toString()),
            longitude: parseFloat(place.lng.toString()),
          });

          if (detectedCountry && detectedCountry.countryCode === countryCode) {
            placesInCountry.push({
              id: place.id,
              name: place.name,
              city: place.city || undefined,
              type: place.type || place.category || undefined,
            });

            // Stop at 5 places
            if (placesInCountry.length >= 5) break;
          }
        }
      }

      console.log(`✅ Found ${placesInCountry.length} places in ${countryCode} (fallback)`);
      return placesInCountry;
    } catch (error) {
      console.error('❌ Exception in fallback:', error);
      return [];
    }
  };

  /**
   * Detect country from current GPS location
   */
  const detectCurrentCountry = async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, isDetecting: true }));

      console.log('🌍 Checking country on app start...');

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        setState((prev) => ({ ...prev, isDetecting: false }));
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log(`📍 Current coordinates: [${coordinates.latitude}, ${coordinates.longitude}]`);

      // Detect country from coordinates
      const currentCountry = await countryDetectionService.detectCountry(coordinates);

      if (!currentCountry) {
        console.log('🤷 Could not detect country from coordinates');
        setState((prev) => ({ ...prev, isDetecting: false }));
        return;
      }

      console.log(
        `🎯 Detected country: ${currentCountry.countryFlag} ${currentCountry.countryName} (${currentCountry.countryCode})`
      );

      // Get last visited country from database
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ User not authenticated');
        setState((prev) => ({ ...prev, isDetecting: false }));
        return;
      }

      const { data: lastVisit } = await supabase
        .from('country_visits')
        .select('country_code, country_name, entry_date')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(1)
        .single();

      if (lastVisit) {
        console.log(
          `💾 Last visit: ${lastVisit.country_name} (${lastVisit.country_code}) on ${lastVisit.entry_date}`
        );

        // Check if country changed
        if (lastVisit.country_code === currentCountry.countryCode) {
          console.log(`✅ Still in ${currentCountry.countryName} - no modal needed`);
          // Update cache to prevent duplicate detection in Travel Mode
          countryDetectionService.setLastCountry(currentCountry.countryCode);
          setState((prev) => ({ ...prev, isDetecting: false }));
          return;
        }

        // COUNTRY CHANGED! Show modal and save to DB
        console.log(
          `🎉 COUNTRY CHANGED from ${lastVisit.country_name} to ${currentCountry.countryName}!`
        );

        // Check if this is a return visit
        const { data: previousVisits } = await supabase
          .from('country_visits')
          .select('country_code')
          .eq('user_id', user.id)
          .eq('country_code', currentCountry.countryCode);

        const isReturn = (previousVisits?.length || 0) > 0;

        // Save to database immediately
        await saveCountryVisit(
          user.id,
          currentCountry,
          coordinates,
          isReturn,
          lastVisit.country_code
        );

        // Get saved places in this country
        const savedPlaces = await getSavedPlacesInCountry(user.id, currentCountry.countryCode);

        // Show modal
        setState({
          isDetecting: false,
          pendingCountryVisit: {
            countryInfo: currentCountry,
            isReturn,
            coordinates,
            savedPlaces,
          },
        });
      } else {
        // First time using the app with location
        console.log(`🆕 First country visit: ${currentCountry.countryName}`);

        // Save to database
        await saveCountryVisit(user.id, currentCountry, coordinates, false, null);

        // Get saved places in this country
        const savedPlaces = await getSavedPlacesInCountry(user.id, currentCountry.countryCode);

        // Show modal
        setState({
          isDetecting: false,
          pendingCountryVisit: {
            countryInfo: currentCountry,
            isReturn: false,
            coordinates,
            savedPlaces,
          },
        });
      }
    } catch (error) {
      console.error('❌ Error detecting country:', error);
      setState((prev) => ({ ...prev, isDetecting: false }));
    }
  };

  /**
   * Save country visit to database
   */
  const saveCountryVisit = async (
    userId: string,
    countryInfo: CountryInfo,
    coordinates: { latitude: number; longitude: number },
    isReturn: boolean,
    previousCountryCode: string | null
  ): Promise<void> => {
    try {
      console.log(`💾 Saving country visit to DB: ${countryInfo.countryName}`);

      // TODO: Count places in this country (needs trip context)
      const placesCount = 0;

      const { error } = await supabase.from('country_visits').insert({
        user_id: userId,
        trip_id: null, // Not associated with specific trip
        country_code: countryInfo.countryCode,
        country_name: countryInfo.countryName,
        entry_date: new Date().toISOString(),
        lat: coordinates.latitude,
        lng: coordinates.longitude,
        is_return: isReturn,
        places_count: placesCount,
        previous_country_code: previousCountryCode,
      });

      if (error) {
        console.error('❌ Error saving country visit:', error);
        return;
      }

      console.log('✅ Country visit saved successfully');

      // Update cache
      countryDetectionService.setLastCountry(countryInfo.countryCode);
    } catch (error) {
      console.error('❌ Exception saving country visit:', error);
    }
  };

  /**
   * Dismiss the modal
   */
  const dismissModal = (): void => {
    setState((prev) => ({ ...prev, pendingCountryVisit: null }));
  };

  /**
   * Detect on app launch (once)
   */
  useEffect(() => {
    if (!hasDetectedOnLaunch.current) {
      hasDetectedOnLaunch.current = true;
      console.log('🚀 App launched - detecting country...');
      detectCurrentCountry();
    }
  }, []);

  /**
   * Detect when app comes to foreground
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground - detecting country...');
        detectCurrentCountry();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    ...state,
    dismissModal,
  };
}
