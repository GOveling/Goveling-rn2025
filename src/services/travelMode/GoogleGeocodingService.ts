/**
 * Google Geocoding Service - OPTIONAL
 *
 * This service provides high-precision country detection using Google Geocoding API
 * Use this as a fallback when Nominatim fails or for premium features
 *
 * COST: $0 for first 100k requests/month, then $5/1k requests (100k-500k), $4/1k (500k+)
 * SETUP: Requires Google Cloud API key with Geocoding API enabled
 *
 * @see GOOGLE_GEOCODING_COST_ANALYSIS.md for detailed cost analysis
 */

import { Coordinates } from './geoUtils';

// Environment variable for API key
const GOOGLE_GEOCODING_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY;

export interface GoogleGeocodingResult {
  countryCode: string; // ISO 2-letter code (e.g., "CL", "US")
  countryName: string; // Full country name (e.g., "Chile", "United States")
  city?: string; // City name if available
  state?: string; // State/province if available
  formattedAddress: string; // Full formatted address
  placeId: string; // Google Place ID (useful for caching)
}

/**
 * OPTIONAL: Reverse geocode using Google Geocoding API
 * Only use this when Nominatim fails or for premium features
 *
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns GoogleGeocodingResult or null if failed
 */
export async function googleReverseGeocode(
  latitude: number,
  longitude: number
): Promise<GoogleGeocodingResult | null> {
  // Check if API key is configured
  if (!GOOGLE_GEOCODING_API_KEY) {
    console.warn('⚠️ Google Geocoding API key not configured. Skipping Google API call.');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_GEOCODING_API_KEY}&language=es`;

    console.log(`🌍 Calling Google Geocoding API for [${latitude}, ${longitude}]...`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Google API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`⚠️ Google API returned no results. Status: ${data.status}`);
      return null;
    }

    // Extract country from address components
    const result = data.results[0];
    let countryCode = '';
    let countryName = '';
    let city = '';
    let state = '';

    for (const component of result.address_components) {
      if (component.types.includes('country')) {
        countryCode = component.short_name; // e.g., "CL"
        countryName = component.long_name; // e.g., "Chile"
      }
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
    }

    if (!countryCode || !countryName) {
      console.warn('⚠️ Google API did not return country information');
      return null;
    }

    console.log(`✅ Google Geocoding: ${countryName} (${countryCode})`);

    return {
      countryCode,
      countryName,
      city: city || undefined,
      state: state || undefined,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    };
  } catch (error) {
    console.error('❌ Google Geocoding API error:', error);
    return null;
  }
}

/**
 * OPTIONAL: Check Google Geocoding API quota
 * Useful for monitoring usage and costs
 *
 * Note: This requires Google Cloud Console access to view actual quota
 * This function just provides a warning if approaching limits
 */
export function checkGoogleApiQuota(requestsThisMonth: number): void {
  const FREE_TIER_LIMIT = 100000; // 100k free requests per month
  const WARNING_THRESHOLD = 0.8; // Warn at 80% usage

  if (requestsThisMonth >= FREE_TIER_LIMIT) {
    console.warn(
      `⚠️ GOOGLE API: Exceeded free tier (${requestsThisMonth.toLocaleString()} requests). ` +
        `Now paying $5/1k requests.`
    );
  } else if (requestsThisMonth >= FREE_TIER_LIMIT * WARNING_THRESHOLD) {
    const remaining = FREE_TIER_LIMIT - requestsThisMonth;
    console.warn(
      `⚠️ GOOGLE API: Approaching free tier limit. ` +
        `${remaining.toLocaleString()} requests remaining this month.`
    );
  }
}

/**
 * OPTIONAL: Hybrid geocoding strategy
 * Try Nominatim first (free), fallback to Google if needed
 *
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param useGoogleFallback - Whether to use Google API as fallback (default: false)
 * @returns Geocoding result from either service
 */
export async function hybridReverseGeocode(
  latitude: number,
  longitude: number,
  useGoogleFallback: boolean = false
): Promise<GoogleGeocodingResult | null> {
  // 1. Try Nominatim first (FREE)
  try {
    const { reverseGeocode: nominatimGeocode } = await import('../../lib/geocoding');
    const nominatimResult = await nominatimGeocode(latitude, longitude);

    if (nominatimResult?.countryCode) {
      console.log('✅ Using Nominatim (FREE) - $0 cost');
      return {
        countryCode: nominatimResult.countryCode.toUpperCase(),
        countryName: nominatimResult.country || nominatimResult.countryCode,
        city: nominatimResult.city,
        state: nominatimResult.state,
        formattedAddress: nominatimResult.displayName || '',
        placeId: '', // Nominatim doesn't provide place IDs
      };
    }
  } catch (error) {
    console.warn('⚠️ Nominatim failed:', error);
  }

  // 2. Fallback to Google API if enabled
  if (useGoogleFallback) {
    console.log('🔄 Nominatim failed, trying Google API fallback...');
    return await googleReverseGeocode(latitude, longitude);
  }

  return null;
}

/**
 * OPTIONAL: Batch reverse geocoding for multiple coordinates
 * Useful for processing trip history or multiple places at once
 *
 * Note: Be mindful of costs - each coordinate = 1 API call
 * Recommended: Use cache and debouncing to minimize calls
 */
export async function batchReverseGeocode(
  coordinates: Coordinates[],
  delayMs: number = 100 // Delay between requests to avoid rate limiting
): Promise<(GoogleGeocodingResult | null)[]> {
  console.log(`🌍 Batch reverse geocoding ${coordinates.length} coordinates...`);

  const results: (GoogleGeocodingResult | null)[] = [];

  for (let i = 0; i < coordinates.length; i++) {
    const { latitude, longitude } = coordinates[i];

    const result = await googleReverseGeocode(latitude, longitude);
    results.push(result);

    // Add delay between requests to avoid rate limiting
    if (i < coordinates.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const successCount = results.filter((r) => r !== null).length;
  console.log(`✅ Batch geocoding complete: ${successCount}/${coordinates.length} successful`);

  return results;
}

/**
 * OPTIONAL: Get estimated cost for API usage
 * Useful for monitoring and budgeting
 */
export function estimateGoogleApiCost(requestsThisMonth: number): {
  tier: string;
  cost: number;
  perRequest: number;
} {
  if (requestsThisMonth <= 100000) {
    return {
      tier: 'Free Tier',
      cost: 0,
      perRequest: 0,
    };
  } else if (requestsThisMonth <= 500000) {
    const paidRequests = requestsThisMonth - 100000;
    return {
      tier: 'Tier 1',
      cost: (paidRequests / 1000) * 5,
      perRequest: 0.005,
    };
  } else {
    const tier1Requests = 400000; // 100k-500k
    const tier2Requests = requestsThisMonth - 500000;
    const tier1Cost = (tier1Requests / 1000) * 5;
    const tier2Cost = (tier2Requests / 1000) * 4;
    return {
      tier: 'Tier 2',
      cost: tier1Cost + tier2Cost,
      perRequest: 0.004,
    };
  }
}

// Export type for use in other services
export type { GoogleGeocodingResult };
