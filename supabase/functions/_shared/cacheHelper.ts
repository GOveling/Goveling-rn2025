// @ts-ignore Deno global placeholder for type checker
declare const Deno: any;

/**
 * Shared Cache Helper for Edge Functions
 *
 * Provides L2 (Supabase DB) caching layer for Google Places API results.
 * Works in conjunction with L1 (local memory) cache in client apps.
 *
 * Architecture:
 * L1: Client memory (1h TTL) → L2: Supabase DB (24h TTL) → L3: Google API
 */

interface CacheEntry {
  cache_key: string;
  search_params: any;
  results: any;
  expires_at: string;
  hit_count?: number;
}

interface CacheGetResult {
  data: any | null;
  hit: boolean;
  source: 'l2-cache' | 'miss';
}

/**
 * Get cache entry from Supabase DB (L2 cache)
 *
 * @param supabase - Supabase client instance
 * @param cacheKey - Unique cache key
 * @returns Cache hit result or null
 */
export async function getCachedResults(supabase: any, cacheKey: string): Promise<CacheGetResult> {
  try {
    console.log('[L2-Cache] Checking shared cache for key:', cacheKey);

    const { data, error } = await supabase
      .from('places_search_cache')
      .select('results, created_at, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      // Not found or expired - this is normal
      if (error.code === 'PGRST116') {
        console.log('[L2-Cache] MISS - No valid cache entry found');
        return { data: null, hit: false, source: 'miss' };
      }

      // Other errors
      console.warn('[L2-Cache] Error querying cache:', error);
      return { data: null, hit: false, source: 'miss' };
    }

    if (!data || !data.results) {
      console.log('[L2-Cache] MISS - Empty data');
      return { data: null, hit: false, source: 'miss' };
    }

    console.log('[L2-Cache] HIT ✅ - Cache entry found, hits:', data.hit_count || 0);

    // Increment hit count asynchronously (don't wait)
    incrementHitCount(supabase, cacheKey).catch((err) =>
      console.warn('[L2-Cache] Failed to increment hit count:', err)
    );

    return {
      data: data.results,
      hit: true,
      source: 'l2-cache',
    };
  } catch (error) {
    console.error('[L2-Cache] Exception in getCachedResults:', error);
    return { data: null, hit: false, source: 'miss' };
  }
}

/**
 * Save results to shared cache (L2)
 *
 * @param supabase - Supabase client instance
 * @param cacheKey - Unique cache key
 * @param searchParams - Original search parameters
 * @param results - API results to cache
 * @param ttlMs - Time to live in milliseconds (default 24h)
 */
export async function saveCachedResults(
  supabase: any,
  cacheKey: string,
  searchParams: any,
  results: any,
  ttlMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<boolean> {
  try {
    console.log('[L2-Cache] Saving to shared cache, key:', cacheKey);

    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    const { error } = await supabase.from('places_search_cache').insert({
      cache_key: cacheKey,
      search_params: searchParams,
      results: results,
      expires_at: expiresAt,
      hit_count: 0,
    });

    if (error) {
      // Duplicate key is OK (race condition - another request cached it first)
      if (error.code === '23505') {
        console.log('[L2-Cache] Entry already exists (race condition) - OK');
        return true;
      }

      console.error('[L2-Cache] Error saving to cache:', error);
      return false;
    }

    console.log('[L2-Cache] Saved successfully ✅, expires:', expiresAt);
    return true;
  } catch (error) {
    console.error('[L2-Cache] Exception in saveCachedResults:', error);
    return false;
  }
}

/**
 * Increment hit count for cache entry (analytics)
 *
 * @param supabase - Supabase client instance
 * @param cacheKey - Unique cache key
 */
async function incrementHitCount(supabase: any, cacheKey: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_cache_hit', {
      p_cache_key: cacheKey,
    });

    if (error) {
      console.warn('[L2-Cache] Failed to increment hit count:', error);
    }
  } catch (error) {
    console.warn('[L2-Cache] Exception incrementing hit count:', error);
  }
}

/**
 * Generate deterministic cache key from search parameters
 * Same logic as in client (placesSearch.ts)
 *
 * @param params - Search parameters
 * @returns Deterministic cache key
 */
export function generateCacheKey(params: {
  input: string;
  selectedCategories?: string[];
  userLocation?: { lat: number; lng: number };
  locale?: string;
}): string {
  const normalized = {
    i: params.input.trim().toLowerCase(),
    c: (params.selectedCategories || []).sort(),
    u: params.userLocation
      ? [params.userLocation.lat.toFixed(3), params.userLocation.lng.toFixed(3)]
      : null,
    l: params.locale || 'en',
  };

  return JSON.stringify(normalized);
}

/**
 * Get cache statistics (for monitoring)
 *
 * @param supabase - Supabase client instance
 * @returns Cache statistics
 */
export async function getCacheStats(supabase: any): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_cache_stats');

    if (error) {
      console.error('[L2-Cache] Error getting stats:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('[L2-Cache] Exception getting stats:', error);
    return null;
  }
}

/**
 * Clean expired cache entries
 * Should be called periodically (e.g., daily cron job)
 *
 * @param supabase - Supabase client instance
 * @returns Number of deleted entries
 */
export async function cleanExpiredCache(supabase: any): Promise<number> {
  try {
    console.log('[L2-Cache] Cleaning expired cache entries...');

    const { data, error } = await supabase.rpc('clean_expired_cache');

    if (error) {
      console.error('[L2-Cache] Error cleaning cache:', error);
      return 0;
    }

    const deletedCount = data?.[0]?.deleted_count || 0;
    console.log(`[L2-Cache] Cleaned ${deletedCount} expired entries`);

    return deletedCount;
  } catch (error) {
    console.error('[L2-Cache] Exception cleaning cache:', error);
    return 0;
  }
}

/**
 * Calculate dynamic TTL based on search popularity
 * Popular destinations get longer cache (less likely to change)
 *
 * @param searchInput - Search query
 * @returns TTL in milliseconds
 */
export function calculateDynamicTTL(searchInput: string): number {
  const input = searchInput.toLowerCase();

  // Popular tourist destinations - longer cache (48h)
  const popularDestinations = [
    'paris',
    'parís',
    'barcelona',
    'rome',
    'roma',
    'london',
    'londres',
    'new york',
    'nueva york',
    'tokyo',
    'tokio',
    'madrid',
    'amsterdam',
    'berlin',
    'berlín',
    'vienna',
    'viena',
    'prague',
    'praga',
    'lisbon',
    'lisboa',
    'dubai',
    'singapore',
    'singapur',
  ];

  const isPopular = popularDestinations.some((dest) => input.includes(dest));

  if (isPopular) {
    console.log('[L2-Cache] Popular destination detected, TTL: 48h');
    return 48 * 60 * 60 * 1000; // 48 hours
  }

  // Default TTL (24h)
  return 24 * 60 * 60 * 1000; // 24 hours
}
