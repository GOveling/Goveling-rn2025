/**
 * Cache utilities for Edge Functions
 * Uses geo_cache table in Supabase
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CacheValue {
  country_iso?: string;
  region_code?: string | null;
  offshore?: boolean;
}

/**
 * Get value from cache (geo_cache table)
 */
export async function cacheGet(supabase: SupabaseClient, key: string): Promise<CacheValue | null> {
  try {
    const { data, error } = await supabase
      .from('geo_cache')
      .select('value, expires_at')
      .eq('geokey', key)
      .maybeSingle();

    if (error) {
      console.error('Cache get error:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Verificar si expiró
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Expirado, eliminar en background (no await)
      supabase.from('geo_cache').delete().eq('geokey', key).then();
      return null;
    }

    return data.value as CacheValue;
  } catch (e) {
    console.error('Cache get exception:', e);
    return null;
  }
}

/**
 * Set cache value
 */
export async function cacheSet(
  supabase: SupabaseClient,
  key: string,
  value: CacheValue,
  ttlSeconds: number = 2592000 // 30 días
): Promise<void> {
  try {
    const { error } = await supabase.from('geo_cache').upsert(
      {
        geokey: key,
        value,
        ttl_seconds: ttlSeconds,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'geokey',
      }
    );

    if (error) {
      console.error('Cache set error:', error);
    }
  } catch (e) {
    console.error('Cache set exception:', e);
  }
}
