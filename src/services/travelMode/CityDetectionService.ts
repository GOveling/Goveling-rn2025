/**
 * CityDetectionService - City/State detection system
 *
 * STRATEGY:
 * - Uses Nominatim Reverse Geocoding API to detect city/state from coordinates
 * - Extracts: city, state, country_code, country_name
 * - Caches last detected city to prevent duplicate detections
 * - Anti-duplicate logic: different city OR 6+ hours since last visit to same city
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Coordinates } from './geoUtils';
import { reverseGeocode } from '../../lib/geocoding';

export interface CityInfo {
  cityName: string; // City name (e.g., "Santiago", "New York", "Tokyo")
  stateName?: string; // State/province name (e.g., "Región Metropolitana", "California")
  countryCode: string; // ISO 2-letter code (e.g., "CL", "US", "JP")
  countryName: string; // Full country name (e.g., "Chile", "United States")
  displayName: string; // Full formatted name (e.g., "Santiago, Región Metropolitana, Chile")
  description?: string; // Brief description of the city (optional)
  population?: string; // Population (formatted string, optional)
  timezone?: string; // Timezone (e.g., "America/Santiago", optional)
  rating?: number; // Google rating (e.g., 4.5, optional)
  currency?: string; // Local currency (e.g., "CLP", "USD", optional)
  currencySymbol?: string; // Currency symbol (e.g., "$", "€", optional)
  photos?: string[]; // Array of photo URLs from Wikipedia (optional, max 5)
}

export interface CityVisitEvent {
  cityInfo: CityInfo;
  coordinates: Coordinates;
  isReturn: boolean; // True if user is returning to a previously visited city
  previousCityName: string | null;
  previousCountryCode: string | null;
}

const CACHE_KEY = 'last_detected_city';
const CACHE_TIMESTAMP_KEY = 'last_detected_city_timestamp';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * City Detection Service
 * Detects city/state from GPS coordinates using Nominatim API
 */
class CityDetectionService {
  private lastCity: string | null = null;
  private lastCountryCode: string | null = null;
  private lastDetectionTime: number | null = null;
  private cacheLoaded = false;

  constructor() {
    // Don't load cache in constructor - do it lazily when needed
    // This prevents SSR issues with AsyncStorage
  }

  /**
   * Load cached city from AsyncStorage
   */
  private async loadCacheFromStorage(): Promise<void> {
    if (this.cacheLoaded) return;

    try {
      const cachedCity = await AsyncStorage.getItem(CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedCity && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();

        // Check if cache is still valid (< 6 hours)
        if (now - timestamp < CACHE_DURATION) {
          const parts = cachedCity.split('|');
          if (parts.length === 2) {
            this.lastCity = parts[0];
            this.lastCountryCode = parts[1];
            this.lastDetectionTime = timestamp;
            console.log(`🗺️ Loaded cached city: ${this.lastCity}, ${this.lastCountryCode}`);
          }
        } else {
          // Cache expired, clear it
          await this.clearCache();
        }
      }
      this.cacheLoaded = true;
    } catch (error) {
      console.error('❌ Error loading city cache:', error);
      this.cacheLoaded = true; // Mark as loaded even on error to prevent retry loops
    }
  }

  /**
   * Save detected city to cache (memory + AsyncStorage)
   */
  async setLastCity(cityName: string, countryCode: string): Promise<void> {
    this.lastCity = cityName;
    this.lastCountryCode = countryCode;
    this.lastDetectionTime = Date.now();

    try {
      await AsyncStorage.setItem(CACHE_KEY, `${cityName}|${countryCode}`);
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, this.lastDetectionTime.toString());
      console.log(`💾 Cached city: ${cityName}, ${countryCode}`);
    } catch (error) {
      console.error('❌ Error saving city cache:', error);
    }
  }

  /**
   * Get last detected city from cache
   */
  getLastCity(): { cityName: string; countryCode: string; timestamp: number } | null {
    if (this.lastCity && this.lastCountryCode && this.lastDetectionTime) {
      return {
        cityName: this.lastCity,
        countryCode: this.lastCountryCode,
        timestamp: this.lastDetectionTime,
      };
    }
    return null;
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.lastCity = null;
    this.lastCountryCode = null;
    this.lastDetectionTime = null;
    this.cacheLoaded = false; // Reset cache loaded flag

    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
      console.log('🗑️ City cache cleared (AsyncStorage + in-memory)');
    } catch (error) {
      console.error('❌ Error clearing city cache:', error);
    }
  }

  /**
   * Check if city should trigger a new detection
   * Returns TRUE if:
   * 1. City is different from cached city, OR
   * 2. Same city but 6+ hours have passed
   */
  async shouldDetectCity(cityName: string, countryCode: string): Promise<boolean> {
    // Ensure cache is loaded
    await this.loadCacheFromStorage();

    const cached = this.getLastCity();

    if (!cached) {
      // No cache, always detect
      return true;
    }

    // Different city? Always detect
    if (cached.cityName !== cityName || cached.countryCode !== countryCode) {
      console.log(`🔄 City changed: ${cached.cityName} → ${cityName} (detecting new city)`);
      return true;
    }

    // Same city, check time elapsed
    const timeElapsed = Date.now() - cached.timestamp;
    const hoursElapsed = timeElapsed / (60 * 60 * 1000);

    if (timeElapsed >= CACHE_DURATION) {
      console.log(
        `⏰ Same city (${cityName}) but ${hoursElapsed.toFixed(1)}h elapsed (> 6h threshold)`
      );
      return true;
    }

    console.log(
      `⏭️ Same city (${cityName}), only ${hoursElapsed.toFixed(1)}h elapsed (< 6h threshold), skipping`
    );
    return false;
  }

  /**
   * Detect city from coordinates using Nominatim API
   */
  async detectCity(coordinates: Coordinates): Promise<CityInfo | null> {
    try {
      console.log(
        `🌍 Detecting city from coordinates: [${coordinates.latitude}, ${coordinates.longitude}]`
      );

      // Use Nominatim reverse geocoding
      const result = await reverseGeocode(coordinates.latitude, coordinates.longitude);

      if (!result) {
        console.log('❌ Nominatim did not return city data');
        return null;
      }

      console.log('📍 Nominatim response:', JSON.stringify(result, null, 2));

      // Get city name from result
      const cityName = result.city || null;

      if (!cityName) {
        console.log('❌ Could not extract city name from Nominatim response');
        return null;
      }

      // Get state/province (if exists)
      const stateName = result.state || undefined;

      // Get country info
      const countryName = result.country || 'Unknown Country';
      const countryCode = result.countryCode?.toUpperCase() || 'XX';

      // Build display name
      let displayName = cityName;
      if (stateName) {
        displayName += `, ${stateName}`;
      }
      displayName += `, ${countryName}`;

      const cityInfo: CityInfo = {
        cityName,
        stateName,
        countryCode,
        countryName,
        displayName,
      };

      console.log(`✅ Detected city: ${cityInfo.displayName}`);

      return cityInfo;
    } catch (error) {
      console.error('❌ Error detecting city:', error);
      return null;
    }
  }

  /**
   * Detect city and check if it should trigger a visit event
   * Returns CityInfo only if:
   * 1. City is different from last detected, OR
   * 2. Same city but 6+ hours have passed
   */
  async detectCityChange(coordinates: Coordinates): Promise<CityInfo | null> {
    // Ensure cache is loaded before checking
    await this.loadCacheFromStorage();

    const cityInfo = await this.detectCity(coordinates);

    if (!cityInfo) {
      return null;
    }

    // Check if this city should trigger detection
    const shouldDetect = await this.shouldDetectCity(cityInfo.cityName, cityInfo.countryCode);
    if (!shouldDetect) {
      return null; // Same city, < 6h elapsed, skip
    }

    return cityInfo;
  }
}

// Export singleton instance
export const cityDetectionService = new CityDetectionService();
