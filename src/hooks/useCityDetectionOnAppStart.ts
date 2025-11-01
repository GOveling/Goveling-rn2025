/**
 * useCityDetectionOnAppStart
 * Detects city changes when the app is opened (background → foreground)
 * Shows welcome modal and updates database automatically
 * Executes AFTER country detection completes
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';

import { AppState, AppStateStatus } from 'react-native';

import * as Location from 'expo-location';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cityDetectionService } from '@/services/travelMode/CityDetectionService';
import { cityEnrichmentService } from '@/services/travelMode/CityEnrichmentService';
import { CityInfo } from '@/types/cityDetection';

interface SavedPlace {
  id: string;
  name: string;
  city?: string;
  type?: string;
  address?: string;
}

export interface CityDetectionState {
  isDetecting: boolean;
  pendingCityVisit: {
    cityInfo: CityInfo;
    isReturn: boolean;
    coordinates: { latitude: number; longitude: number };
    savedPlaces: SavedPlace[];
  } | null;
}

export function useCityDetectionOnAppStart(shouldDetect: boolean = true) {
  const [state, setState] = useState<CityDetectionState>({
    isDetecting: false,
    pendingCityVisit: null,
  });

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasDetectedOnLaunch = useRef(false);
  const lastSavedCity = useRef<string | null>(null); // Track last saved city to prevent duplicates

  /**
   * Get saved places in active trips for the detected city (max 5)
   */
  const getSavedPlacesInCity = async (
    userId: string,
    cityName: string,
    countryCode: string
  ): Promise<SavedPlace[]> => {
    try {
      console.log(`🗺️ Fetching saved places for ${cityName}, ${countryCode}...`);

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

      // Get places from those trips that match the city and country
      // Use ilike to match city name flexibly (handles "Antofagasta" vs "Antofagasta, Región...")
      console.log(
        `🔍 Searching for places with city LIKE '%${cityName}%' and country_code='${countryCode}'`
      );

      const { data: places, error: placesError } = await supabase
        .from('trip_places')
        .select('id, name, city, type, address, country_code')
        .in('trip_id', tripIds)
        .ilike('city', `%${cityName}%`)
        .eq('country_code', countryCode)
        .limit(5);

      console.log(`🔍 Query executed - Result:`, {
        found: places?.length || 0,
        error: placesError?.message || 'none',
        tripIds: tripIds.length,
      });

      if (placesError) {
        console.error('❌ Error fetching places:', placesError);
        return [];
      }

      if (!places || places.length === 0) {
        console.log(`ℹ️ No places found matching city='%${cityName}%' in ${countryCode}`);
        // Debug: Let's try to see what cities exist in these trips
        const { data: allCities } = await supabase
          .from('trip_places')
          .select('city, country_code')
          .in('trip_id', tripIds)
          .limit(10);
        console.log(
          `🔍 DEBUG - Sample cities in trips:`,
          allCities?.map((p) => `${p.city} (${p.country_code})`)
        );
        return [];
      }

      console.log(`✅ Found ${places.length} places in ${cityName}`);
      console.log(
        `📍 Sample places:`,
        places.slice(0, 2).map((p) => ({ name: p.name, city: p.city }))
      );

      return places.map((place) => ({
        id: place.id,
        name: place.name,
        city: place.city,
        type: place.type,
        address: place.address,
      }));
    } catch (error) {
      console.error('❌ Exception fetching places:', error);
      return [];
    }
  };

  /**
   * Detect current city and show modal if changed
   */
  const detectCurrentCity = useCallback(async (): Promise<void> => {
    // Check if detection is allowed
    if (!shouldDetect) {
      console.log('⏭️ City detection disabled (shouldDetect=false)');
      return;
    }

    if (state.isDetecting) {
      console.log('⏭️ City detection already in progress, skipping...');
      return;
    }

    setState((prev) => ({ ...prev, isDetecting: true }));

    try {
      // Request location permission
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

      // Detect city from coordinates (includes cache check)
      const currentCity = await cityDetectionService.detectCityChange(coordinates);

      if (!currentCity) {
        console.log('🤷 City did not change or cache is still valid');

        // 🆕 CRITICAL FIX: Check if city exists in database
        // If cache says "no change" but DB has no records, we should still save
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Try to detect the city directly (bypass cache check)
          const directCity = await cityDetectionService.detectCity(coordinates);

          if (directCity) {
            const { data: existingVisits, error: checkError } = await supabase
              .from('city_visits')
              .select('id')
              .eq('user_id', user.id)
              .eq('city_name', directCity.cityName)
              .eq('country_code', directCity.countryCode)
              .limit(1);

            if (!checkError && (!existingVisits || existingVisits.length === 0)) {
              console.log(
                '⚠️ Cache valid but no DB record found - saving first visit to',
                directCity.cityName
              );
              // Override the null result and continue with this city
              // We'll use directCity for the rest of the flow
              // Jump to enrichment
              console.log(
                `🎯 Detected city: ${directCity.cityName}, ${directCity.countryName} (${directCity.countryCode})`
              );

              // Enrich and save
              let enrichedCity = directCity;
              try {
                enrichedCity = await cityEnrichmentService.enrichCityInfo(directCity);
                console.log(
                  '✅ City enriched successfully - FULL OBJECT:',
                  JSON.stringify(enrichedCity, null, 2)
                );
              } catch (error) {
                console.warn('⚠️ Failed to enrich city data:', error);
              }

              // Save as first visit
              await saveCityVisit(user.id, enrichedCity, coordinates, false, null, null);

              // Get saved places
              const savedPlaces = await getSavedPlacesInCity(
                user.id,
                enrichedCity.cityName,
                enrichedCity.countryCode
              );

              // Show modal
              setState({
                isDetecting: false,
                pendingCityVisit: {
                  cityInfo: enrichedCity,
                  isReturn: false,
                  coordinates,
                  savedPlaces,
                },
              });
              return;
            }
          }
        }

        // Truly skip - cache valid AND DB has record
        setState((prev) => ({ ...prev, isDetecting: false }));
        return;
      }

      console.log(
        `🎯 Detected city: ${currentCity.cityName}, ${currentCity.countryName} (${currentCity.countryCode})`
      );

      // 🆕 ENRICH CITY DATA with Google Places API
      console.log('🌟 Enriching city data with Google Places API...');
      let enrichedCity = currentCity;
      try {
        enrichedCity = await cityEnrichmentService.enrichCityInfo(currentCity);
        console.log(
          '✅ City enriched successfully - FULL OBJECT:',
          JSON.stringify(enrichedCity, null, 2)
        );
        if (enrichedCity.description || enrichedCity.timezone || enrichedCity.population) {
          console.log('✅ Enriched fields present:', {
            hasDescription: !!enrichedCity.description,
            hasPopulation: !!enrichedCity.population,
            hasTimezone: !!enrichedCity.timezone,
            description: enrichedCity.description
              ? `${enrichedCity.description.substring(0, 50)}...`
              : 'N/A',
            population: enrichedCity.population || 'N/A',
            timezone: enrichedCity.timezone || 'N/A',
          });
        } else {
          console.log('ℹ️ No additional metadata found, using basic info');
        }
      } catch (error) {
        console.warn('⚠️ Failed to enrich city data, using basic info:', error);
        // Continue with basic city info
      }

      // Get last visited city from database
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ User not authenticated');
        setState((prev) => ({ ...prev, isDetecting: false }));
        return;
      }

      const { data: lastVisit } = await supabase
        .from('city_visits')
        .select('city_name, country_code, country_name, entry_date')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(1)
        .single();

      if (lastVisit) {
        console.log(
          `💾 Last visit: ${lastVisit.city_name}, ${lastVisit.country_name} (${lastVisit.country_code}) on ${lastVisit.entry_date}`
        );

        // Check if city changed
        if (
          lastVisit.city_name === currentCity.cityName &&
          lastVisit.country_code === currentCity.countryCode
        ) {
          console.log(`✅ Still in ${currentCity.cityName} - no modal needed`);
          // Update cache to prevent duplicate detection
          cityDetectionService.setLastCity(currentCity.cityName, currentCity.countryCode);
          setState((prev) => ({ ...prev, isDetecting: false }));
          return;
        }

        // CITY CHANGED! Show modal and save to DB
        console.log(`🎉 CITY CHANGED from ${lastVisit.city_name} to ${currentCity.cityName}!`);

        // Check if this is a return visit
        const { data: previousVisits } = await supabase
          .from('city_visits')
          .select('city_name')
          .eq('user_id', user.id)
          .eq('city_name', currentCity.cityName)
          .eq('country_code', currentCity.countryCode);

        const isReturn = (previousVisits?.length || 0) > 0;

        // Save to database immediately (use enriched city)
        await saveCityVisit(
          user.id,
          enrichedCity, // 🆕 Use enriched data
          coordinates,
          isReturn,
          lastVisit.city_name,
          lastVisit.country_code
        );

        // Get saved places in this city
        const savedPlaces = await getSavedPlacesInCity(
          user.id,
          enrichedCity.cityName, // 🆕 Use enriched
          enrichedCity.countryCode // 🆕 Use enriched
        );

        // Show modal with enriched data
        setState({
          isDetecting: false,
          pendingCityVisit: {
            cityInfo: enrichedCity, // 🆕 Pass enriched city to modal
            isReturn,
            coordinates,
            savedPlaces,
          },
        });
      } else {
        // First time using the app with location
        console.log(`🆕 First city visit: ${enrichedCity.cityName}`); // 🆕 Use enriched

        // Save to database (with enrichment)
        await saveCityVisit(user.id, enrichedCity, coordinates, false, null, null); // 🆕 Use enriched

        // Get saved places in this city
        const savedPlaces = await getSavedPlacesInCity(
          user.id,
          enrichedCity.cityName, // 🆕 Use enriched
          enrichedCity.countryCode // 🆕 Use enriched
        );

        // Show modal with enriched data
        setState({
          isDetecting: false,
          pendingCityVisit: {
            cityInfo: enrichedCity, // 🆕 Pass enriched city to modal
            isReturn: false,
            coordinates,
            savedPlaces,
          },
        });
      }
    } catch (error) {
      console.error('❌ Error detecting city:', error);
      setState((prev) => ({ ...prev, isDetecting: false }));
    }
  }, [shouldDetect]); // Add shouldDetect as dependency

  /**
   * Save city visit to database
   */
  const saveCityVisit = async (
    userId: string,
    cityInfo: CityInfo,
    coordinates: { latitude: number; longitude: number },
    isReturn: boolean,
    previousCityName: string | null,
    previousCountryCode: string | null
  ): Promise<void> => {
    try {
      console.log(`💾 Saving city visit to DB: ${cityInfo.cityName}`);

      // Guard: Prevent duplicate saves for the same city in quick succession
      const cityKey = `${cityInfo.cityName}-${cityInfo.countryCode}`;
      if (lastSavedCity.current === cityKey) {
        console.log('⏭️ City visit already being saved, skipping duplicate...');
        return;
      }

      // Mark as being saved
      lastSavedCity.current = cityKey;

      // Check if should add (using DB function)
      const { data: shouldAdd } = await supabase.rpc('should_add_city_visit', {
        p_user_id: userId,
        p_city_name: cityInfo.cityName,
        p_country_code: cityInfo.countryCode,
      });

      if (!shouldAdd) {
        console.log('⏭️ City visit not added (duplicate within 6h window)');
        return;
      }

      // TODO: Count places in this city (needs trip context)
      const placesCount = 0;

      const { error } = await supabase.from('city_visits').insert({
        user_id: userId,
        trip_id: null, // Not associated with specific trip
        city_name: cityInfo.cityName,
        state_name: cityInfo.stateName || null,
        country_code: cityInfo.countryCode,
        country_name: cityInfo.countryName,
        entry_date: new Date().toISOString(),
        lat: coordinates.latitude,
        lng: coordinates.longitude,
        is_return: isReturn,
        places_count: placesCount,
        previous_city_name: previousCityName,
        previous_country_code: previousCountryCode,
      });

      if (error) {
        console.error('❌ Error saving city visit:', error);
        return;
      }

      console.log('✅ City visit saved successfully');

      // Update cache
      cityDetectionService.setLastCity(cityInfo.cityName, cityInfo.countryCode);

      // Reset the guard after 2 seconds to allow future legitimate saves
      setTimeout(() => {
        if (lastSavedCity.current === cityKey) {
          lastSavedCity.current = null;
        }
      }, 2000);
    } catch (error) {
      console.error('❌ Exception saving city visit:', error);
    }
  };

  /**
   * Dismiss the modal
   */
  const dismissModal = (): void => {
    setState((prev) => ({ ...prev, pendingCityVisit: null }));
  };

  /**
   * Detect on app launch (once) - only if shouldDetect is true
   * OR when shouldDetect changes from false to true (country modal dismissed)
   */
  useEffect(() => {
    console.log('🔍 City detection effect triggered:', {
      shouldDetect,
      hasDetectedOnLaunch: hasDetectedOnLaunch.current,
      willDetect: shouldDetect && !hasDetectedOnLaunch.current,
    });

    if (shouldDetect) {
      if (!hasDetectedOnLaunch.current) {
        hasDetectedOnLaunch.current = true;
        console.log('🚀 Detecting city for first time (shouldDetect is now true)...');
        detectCurrentCity();
      }
    } else {
      // Reset flag when shouldDetect becomes false (country modal showing)
      // This allows re-detection when shouldDetect becomes true again
      if (hasDetectedOnLaunch.current) {
        console.log('🔄 Resetting hasDetectedOnLaunch (country modal showing)');
        hasDetectedOnLaunch.current = false;
      }
    }
  }, [shouldDetect, detectCurrentCity]);

  /**
   * Detect when app comes to foreground - only if shouldDetect is true
   * SKIP if hasDetectedOnLaunch is true (prevents double execution on app reload)
   */
  useEffect(() => {
    if (!shouldDetect) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Skip if this is the initial app foreground (hasDetectedOnLaunch handles it)
        if (hasDetectedOnLaunch.current) {
          console.log(
            '📱 App came to foreground - but initial detection already done, skipping...'
          );
          return;
        }
        console.log('📱 App came to foreground - detecting city...');
        detectCurrentCity();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [shouldDetect, detectCurrentCity]);

  return {
    ...state,
    dismissModal,
  };
}
