/**
 * Local cache for geo detection results using AsyncStorage
 * TTL: 30 days (same as server cache)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { encode as geohashEncode } from './geohash';

const CACHE_PREFIX = 'geo:gh:5:';
const TTL_SECONDS = 2592000; // 30 días

export interface CacheValue {
  country: string;
  region: string | null;
}

interface CacheEntry {
  value: CacheValue;
  timestamp: number;
  ttl: number;
}

/**
 * Get cached geo result for coordinates
 */
export async function getCachedGeoResult(lat: number, lng: number): Promise<CacheValue | null> {
  try {
    const geohash = geohashEncode(lat, lng, 5);
    const cacheKey = `${CACHE_PREFIX}${geohash}`;

    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) {
      return null;
    }

    const entry: CacheEntry = JSON.parse(cached);

    // Check if expired
    const now = Date.now();
    const expiresAt = entry.timestamp + entry.ttl * 1000;

    if (now > expiresAt) {
      // Expired, delete and return null
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return entry.value;
  } catch (error) {
    console.error('Error reading geo cache:', error);
    return null;
  }
}

/**
 * Set cached geo result for coordinates
 */
export async function setCachedGeoResult(
  lat: number,
  lng: number,
  value: CacheValue,
  ttl: number = TTL_SECONDS
): Promise<void> {
  try {
    const geohash = geohashEncode(lat, lng, 5);
    const cacheKey = `${CACHE_PREFIX}${geohash}`;

    const entry: CacheEntry = {
      value,
      timestamp: Date.now(),
      ttl,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing geo cache:', error);
  }
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const geoKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    const now = Date.now();
    const toDelete: string[] = [];

    for (const key of geoKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (!cached) continue;

        const entry: CacheEntry = JSON.parse(cached);
        const expiresAt = entry.timestamp + entry.ttl * 1000;

        if (now > expiresAt) {
          toDelete.push(key);
        }
      } catch (e) {
        // Invalid entry, delete it
        toDelete.push(key);
      }
    }

    if (toDelete.length > 0) {
      await AsyncStorage.multiRemove(toDelete);
      console.log(`🧹 Cleared ${toDelete.length} expired geo cache entries`);
    }
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
}

/**
 * Clear ALL geo cache (for debugging)
 */
export async function clearAllGeoCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const geoKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(geoKeys);
    console.log(`🧹 Cleared all geo cache (${geoKeys.length} entries)`);
  } catch (error) {
    console.error('Error clearing all geo cache:', error);
  }
}

/**
 * Get cache statistics (for debugging)
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  totalSizeKB: number;
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const geoKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const key of geoKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (!cached) continue;

        totalSize += cached.length;

        const entry: CacheEntry = JSON.parse(cached);
        const expiresAt = entry.timestamp + entry.ttl * 1000;

        if (now > expiresAt) {
          expiredEntries++;
        } else {
          validEntries++;
        }
      } catch (e) {
        expiredEntries++;
      }
    }

    return {
      totalEntries: geoKeys.length,
      validEntries,
      expiredEntries,
      totalSizeKB: Math.round(totalSize / 1024),
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      totalSizeKB: 0,
    };
  }
}
