/**
 * BackgroundTravelManager - Singleton for managing background location tracking
 * Handles adaptive interval GPS tracking based on platform, app state, and energy mode
 * Optimized for native hardware (iOS/Android)
 * Now includes background country/city change detection with push notifications
 */

import { Platform, AppState, AppStateStatus } from 'react-native';

import * as Location from 'expo-location';

import { supabase } from '~/lib/supabase';
import { logger } from '~/utils/logger';

import { cityDetectionService } from './CityDetectionService';
import { countryDetectionService } from './CountryDetectionService';
import { Coordinates } from './geoUtils';
import { locationChangeNotificationService } from './LocationChangeNotificationService';
import { EnergyMode } from './UnifiedSpeedTracker';

export interface LocationUpdate {
  coordinates: Coordinates;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  heading: number | null;
}

export type LocationCallback = (location: LocationUpdate) => void;
export type ErrorCallback = (error: Error) => void;

interface TrackingConfig {
  platform: 'native' | 'web';
  appState: 'foreground' | 'background';
  energyMode: EnergyMode;
}

class BackgroundTravelManager {
  private static instance: BackgroundTravelManager;
  private isTracking = false;
  private watchSubscription: Location.LocationSubscription | null = null;
  private locationCallback: LocationCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private appState: AppStateStatus = 'active';
  private currentEnergyMode: EnergyMode = 'normal';
  private isTravelModeActive = false; // NEW: Track if Travel Mode is explicitly active

  // Background detection state
  private lastDetectedCountry: string | null = null;
  private lastDetectedCity: string | null = null;
  private isDetectingChanges = false; // Prevent concurrent detections

  // Interval configuration for TRAVEL MODE (active tracking)
  private readonly TRAVEL_MODE_INTERVALS = {
    native: {
      min: 3000, // 3 seconds - frequent for heatmaps
      max: 30000, // 30 seconds
    },
    web: {
      min: 5000, // 5 seconds
      max: 45000, // 45 seconds
    },
  };

  // NEW: Interval configuration for PASSIVE DETECTION (country/city changes only)
  // Much less aggressive - country/city changes are rare events
  private readonly PASSIVE_INTERVALS = {
    native: {
      min: 300000, // 5 minutes - country/city changes are rare
      max: 900000, // 15 minutes
    },
    web: {
      min: 600000, // 10 minutes
      max: 1800000, // 30 minutes
    },
  };

  private readonly BACKGROUND_MULTIPLIER = {
    native: 2, // 2x in background
    web: 2.5, // 2.5x in background
  };

  private readonly ENERGY_MODE_MULTIPLIER = {
    normal: 1,
    saving: 1.5,
    'ultra-saving': 3,
  };

  private constructor() {
    // Initialize app state listener
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BackgroundTravelManager {
    if (!BackgroundTravelManager.instance) {
      BackgroundTravelManager.instance = new BackgroundTravelManager();
    }
    return BackgroundTravelManager.instance;
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log(`📱 App state changed: ${this.appState} -> ${nextAppState}`);
    this.appState = nextAppState;

    // Adjust tracking interval when app state changes
    if (this.isTracking) {
      this.adjustTrackingInterval();
    }
  };

  /**
   * Calculate adaptive interval based on current config
   */
  private calculateInterval(): number {
    const platform = Platform.OS === 'web' ? 'web' : 'native';
    const appState = this.appState === 'active' ? 'foreground' : 'background';

    const config: TrackingConfig = {
      platform,
      appState,
      energyMode: this.currentEnergyMode,
    };

    // Choose interval configuration based on Travel Mode status
    const intervals = this.isTravelModeActive ? this.TRAVEL_MODE_INTERVALS : this.PASSIVE_INTERVALS;

    // Start with base interval
    let interval = intervals[config.platform].min;

    // Apply background multiplier
    if (config.appState === 'background') {
      interval *= this.BACKGROUND_MULTIPLIER[config.platform];
    }

    // Apply energy mode multiplier
    interval *= this.ENERGY_MODE_MULTIPLIER[config.energyMode];

    // Clamp to max interval
    const maxInterval = intervals[config.platform].max;
    interval = Math.min(interval, maxInterval);

    const mode = this.isTravelModeActive ? 'TRAVEL_MODE' : 'PASSIVE';
    console.log(
      `⏱️  Calculated interval: ${interval}ms (${mode}, ${config.platform}, ${config.appState}, ${config.energyMode})`
    );

    return interval;
  }

  /**
   * Adjust tracking interval dynamically
   */
  private async adjustTrackingInterval(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    console.log('🔄 Adjusting tracking interval...');

    // Stop current tracking
    await this.stopWatching();

    // Start with new interval
    await this.startWatching();
  }

  /**
   * Set energy mode
   */
  public setEnergyMode(mode: EnergyMode): void {
    if (this.currentEnergyMode === mode) {
      return;
    }

    console.log(`🔋 Energy mode changed: ${this.currentEnergyMode} -> ${mode}`);
    this.currentEnergyMode = mode;

    // Adjust interval if tracking
    if (this.isTracking) {
      this.adjustTrackingInterval();
    }
  }

  /**
   * NEW: Set Travel Mode status
   * When Travel Mode is active, use frequent intervals for detailed tracking (heatmaps)
   * When inactive (passive), use much longer intervals (5-15 min) for country/city detection only
   */
  public setTravelMode(isActive: boolean): void {
    if (this.isTravelModeActive === isActive) {
      return;
    }

    console.log(`🚗 Travel Mode changed: ${this.isTravelModeActive} -> ${isActive}`);
    this.isTravelModeActive = isActive;

    // Adjust interval if tracking
    if (this.isTracking) {
      this.adjustTrackingInterval();
    }
  }

  /**
   * Get current Travel Mode status
   */
  public isTravelMode(): boolean {
    return this.isTravelModeActive;
  }

  /**
   * Request location permissions
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.warn('⚠️ Foreground location permission denied');
        return false;
      }

      console.log('✅ Foreground location permission granted');

      // For native platforms, also request background permissions
      if (Platform.OS !== 'web') {
        try {
          const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

          if (backgroundStatus !== 'granted') {
            console.warn(
              '⚠️ Background location permission denied (tracking will stop when app is minimized)'
            );
            // We still return true because foreground is granted
          } else {
            console.log('✅ Background location permission granted');
          }
        } catch (bgError) {
          // Silent fail for Expo Go - background permissions are not available
          // but foreground is enough for testing. In production builds, this will work.
          if (__DEV__) {
            console.log(
              '⚠️ Background permission not available (Expo Go limitation). Will work in production build.'
            );
          }
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Start location watching
   */
  private async startWatching(): Promise<void> {
    try {
      const interval = this.calculateInterval();

      // Configure location options
      const options: Location.LocationOptions = {
        accuracy:
          this.currentEnergyMode === 'normal' ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeInterval: interval,
        distanceInterval: 0, // Get updates based on time, not distance
      };

      console.log(`🎯 Starting location watch with interval: ${interval}ms`);

      // Start watching location
      this.watchSubscription = await Location.watchPositionAsync(options, (location) => {
        this.handleLocationUpdate(location);
      });

      console.log('✅ Location watch started');
    } catch (error) {
      console.error('❌ Error starting location watch:', error);
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
    }
  }

  /**
   * Stop location watching
   */
  private async stopWatching(): Promise<void> {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
      console.log('🛑 Location watch stopped');
    }
  }

  /**
   * Handle location update
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    const update: LocationUpdate = {
      coordinates: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      accuracy: location.coords.accuracy || 0,
      timestamp: location.timestamp,
      speed: location.coords.speed || null,
      heading: location.coords.heading || null,
    };

    // Call registered callback (for heatmap tracking)
    if (this.locationCallback) {
      this.locationCallback(update);
    }

    // Detect country/city changes in background (with notifications)
    // Only if app is in background and not in Travel Mode
    // Travel Mode uses its own real-time detection with useGeoDetection
    if (this.appState !== 'active' && !this.isTravelModeActive) {
      this.detectLocationChanges(update.coordinates, update.accuracy).catch((error) => {
        logger.error('❌ Error detecting location changes:', error);
      });
    }
  }

  /**
   * Detect country and city changes in background
   * Sends push notifications if changes are detected
   */
  private async detectLocationChanges(coordinates: Coordinates, accuracy: number): Promise<void> {
    // Skip if accuracy is too low (>100m)
    if (accuracy > 100) {
      logger.debug(`⏭️  Skipping background detection - low accuracy: ${accuracy.toFixed(0)}m`);
      return;
    }

    // Skip if already detecting (prevent concurrent detections)
    if (this.isDetectingChanges) {
      logger.debug('⏭️  Background detection already in progress, skipping');
      return;
    }

    try {
      this.isDetectingChanges = true;

      // 1. Detect country
      const currentCountry = await countryDetectionService.detectCountry(coordinates);
      if (!currentCountry) {
        logger.debug('⏭️  Could not detect country from coordinates');
        return;
      }

      // Check if country changed
      if (this.lastDetectedCountry !== currentCountry.countryCode) {
        logger.info(
          `🌍 Country change detected in background: ${this.lastDetectedCountry || 'unknown'} → ${currentCountry.countryCode}`
        );

        // Get user ID
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Check if this is a return visit
        const { data: lastVisit } = await supabase
          .from('country_visits')
          .select('country_code, entry_date, latitude, longitude')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })
          .limit(1)
          .single();

        let isReturn = false;
        if (lastVisit && lastVisit.country_code === currentCountry.countryCode) {
          // Check distance and time
          const distance = this.calculateDistance(
            lastVisit.latitude,
            lastVisit.longitude,
            coordinates.latitude,
            coordinates.longitude
          );
          const timeDiff = Date.now() - new Date(lastVisit.entry_date).getTime();
          const THIRTY_MINUTES = 30 * 60 * 1000;

          if (distance > 50000 && timeDiff > THIRTY_MINUTES) {
            isReturn = true;
          }
        }

        // Send notification (only if app is in background)
        await locationChangeNotificationService.sendCountryChangeNotification({
          countryName: currentCountry.countryName,
          countryFlag: currentCountry.countryFlag,
          countryCode: currentCountry.countryCode,
          isReturn,
          timestamp: Date.now(),
        });

        // Update last detected country
        this.lastDetectedCountry = currentCountry.countryCode;
      }

      // 2. Detect city (only if country is stable for 1 minute)
      // This prevents showing both notifications simultaneously
      if (this.lastDetectedCountry === currentCountry.countryCode) {
        const currentCity = await cityDetectionService.detectCity(coordinates);
        if (!currentCity) {
          logger.debug('⏭️  Could not detect city from coordinates');
          return;
        }

        const cityIdentifier = `${currentCity.cityName}_${currentCity.stateName || ''}`;

        // Check if city changed
        if (this.lastDetectedCity !== cityIdentifier) {
          logger.info(
            `🏙️  City change detected in background: ${this.lastDetectedCity || 'unknown'} → ${cityIdentifier}`
          );

          // Get user ID
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          // Check if this is a return visit
          const { data: lastCityVisit } = await supabase
            .from('city_visits')
            .select('city_name, region_name, entry_date, latitude, longitude')
            .eq('user_id', user.id)
            .order('entry_date', { ascending: false })
            .limit(1)
            .single();

          let isCityReturn = false;
          if (
            lastCityVisit &&
            lastCityVisit.city_name === currentCity.cityName &&
            lastCityVisit.region_name === currentCity.stateName
          ) {
            // Check distance and time
            const distance = this.calculateDistance(
              lastCityVisit.latitude,
              lastCityVisit.longitude,
              coordinates.latitude,
              coordinates.longitude
            );
            const timeDiff = Date.now() - new Date(lastCityVisit.entry_date).getTime();
            const THIRTY_MINUTES = 30 * 60 * 1000;

            if (distance > 50000 && timeDiff > THIRTY_MINUTES) {
              isCityReturn = true;
            }
          }

          // Send notification (only if app is in background)
          await locationChangeNotificationService.sendCityChangeNotification({
            cityName: currentCity.cityName,
            regionName: currentCity.stateName,
            countryName: currentCountry.countryName,
            countryFlag: currentCountry.countryFlag,
            isReturn: isCityReturn,
            timestamp: Date.now(),
          });

          // Update last detected city
          this.lastDetectedCity = cityIdentifier;
        }
      }
    } catch (error) {
      logger.error('❌ Error in background location change detection:', error);
    } finally {
      this.isDetectingChanges = false;
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @returns Distance in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Start tracking
   */
  public async startTracking(
    onLocation: LocationCallback,
    onError?: ErrorCallback
  ): Promise<boolean> {
    if (this.isTracking) {
      console.warn('⚠️ Already tracking');
      return true;
    }

    // Check permissions
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('❌ Location permissions not granted');
      return false;
    }

    // Request notification permissions for background detection
    await locationChangeNotificationService.requestPermissions();

    this.locationCallback = onLocation;
    this.errorCallback = onError || null;
    this.isTracking = true;

    await this.startWatching();

    console.log('🚀 Tracking started');
    return true;
  }

  /**
   * Stop tracking
   */
  public async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    await this.stopWatching();

    this.isTracking = false;
    this.locationCallback = null;
    this.errorCallback = null;
    this.currentEnergyMode = 'normal';

    console.log('🛑 Tracking stopped');
  }

  /**
   * Check if tracking
   */
  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Get current energy mode
   */
  public getCurrentEnergyMode(): EnergyMode {
    return this.currentEnergyMode;
  }

  /**
   * Get current app state
   */
  public getCurrentAppState(): 'foreground' | 'background' {
    return this.appState === 'active' ? 'foreground' : 'background';
  }

  /**
   * Get tracking info (for debugging)
   */
  public getTrackingInfo(): {
    isTracking: boolean;
    energyMode: EnergyMode;
    appState: string;
    interval: number;
  } {
    return {
      isTracking: this.isTracking,
      energyMode: this.currentEnergyMode,
      appState: this.appState,
      interval: this.calculateInterval(),
    };
  }
}

// Export singleton instance
export const backgroundTravelManager = BackgroundTravelManager.getInstance();
export default BackgroundTravelManager;
