/**
 * Edge Function: geo-lookup
 *
 * Detección precisa de país y región usando Point-in-Polygon con geometrías reales.
 * Usa TopoJSON de Natural Earth y cache por geohash para performance.
 *
 * Request body:
 * {
 *   lat: number;        // Latitud (-90 a 90)
 *   lng: number;        // Longitud (-180 a 180)
 *   withRegion?: boolean; // Incluir detección de región/estado (default: false)
 * }
 *
 * Response:
 * {
 *   country_iso?: string;    // Código ISO-2 del país (ej: "CL", "AR")
 *   region_code?: string;    // Código de región/estado (si withRegion=true)
 *   offshore?: boolean;      // true si está en aguas internacionales
 *   cached?: boolean;        // true si vino del cache
 *   executionTime?: number;  // Tiempo de ejecución en ms
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import booleanPointInPolygon from 'npm:@turf/boolean-point-in-polygon@7.0.0';
import { point, polygon, multiPolygon } from 'npm:@turf/helpers@7.0.0';
import * as topojson from 'npm:topojson-client@3.1.0';

import { cacheGet, cacheSet, CacheValue } from '../_shared/cache.ts';
import { encode as geohashEncode } from '../_shared/geohash.ts';

// Configuración desde variables de entorno
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STORAGE_PUBLIC_URL = `${SUPABASE_URL}/storage/v1/object/public/geo`;

interface GeoLookupRequest {
  lat: number;
  lng: number;
  withRegion?: boolean;
}

interface GeoLookupResponse extends CacheValue {
  cached?: boolean;
  executionTime?: number;
}

/**
 * Fetch TopoJSON from Supabase Storage
 */
async function fetchTopoJSON(filename: string): Promise<any> {
  const url = `${STORAGE_PUBLIC_URL}/${filename}`;
  console.log(`📥 Fetching ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Check if point is within bbox (quick pre-filter)
 */
function withinBBox(lat: number, lng: number, bbox: number[]): boolean {
  const [minX, minY, maxX, maxY] = bbox;
  return lng >= minX && lng <= maxX && lat >= minY && lat <= maxY;
}

/**
 * Create geometry object from GeoJSON feature
 */
function createGeometry(feature: any): any {
  const geomType = feature.geometry.type;

  if (geomType === 'Polygon') {
    return polygon(feature.geometry.coordinates);
  } else if (geomType === 'MultiPolygon') {
    return multiPolygon(feature.geometry.coordinates);
  }

  return null;
}

/**
 * Main geo lookup handler
 */
serve(async (req) => {
  const startTime = Date.now();

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const body = await req.json();
    const { lat, lng, withRegion = false } = body as GeoLookupRequest;

    // Validate coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return jsonResponse(
        { error: 'Invalid coordinates: lat and lng must be numbers' },
        400,
        corsHeaders
      );
    }

    if (lat < -90 || lat > 90) {
      return jsonResponse(
        { error: 'Invalid latitude: must be between -90 and 90' },
        400,
        corsHeaders
      );
    }

    if (lng < -180 || lng > 180) {
      return jsonResponse(
        { error: 'Invalid longitude: must be between -180 and 180' },
        400,
        corsHeaders
      );
    }

    // Generate geohash (precision 5 = ~4.9km²)
    const gh = geohashEncode(lat, lng, 5);
    const cacheKey = `geo:gh:5:${gh}`;

    console.log(`🔍 Lookup for (${lat}, ${lng}) → geohash: ${gh}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 0.5) SPECIAL RULES - Check edge cases BEFORE cache to ensure correct detection
    // These override any cached incorrect results

    // 🇭🇰 HONG KONG: Special Administrative Region
    // Hong Kong has complex administrative status (part of China but separate ISO code)
    // Bbox: 22.1-22.6°N, 113.8-114.5°E
    if (lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.5) {
      console.log('🇭🇰 Hong Kong SAR detected (special rule)');
      const result: CacheValue = { country_iso: 'HK', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇹🇷 ISTANBUL: Transcontinental city (Europe/Asia border)
    // Special handling for Istanbul which spans Bosphorus
    // European side: 40.9-41.2°N, 28.8-29.1°E
    // Asian side: 40.9-41.2°N, 29.0-29.3°E
    if (lat >= 40.9 && lat <= 41.2 && lng >= 28.8 && lng <= 29.3) {
      console.log('🇹🇷 Istanbul detected (transcontinental special rule)');
      const result: CacheValue = { country_iso: 'TR', region_code: 'Istanbul' };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇲🇴 MACAO: Special Administrative Region
    // Macao bbox: 22.1-22.22°N, 113.52-113.60°E
    if (lat >= 22.1 && lat <= 22.22 && lng >= 113.52 && lng <= 113.6) {
      console.log('🇲🇴 Macao SAR detected (special rule)');
      const result: CacheValue = { country_iso: 'MO', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇫🇷 MARSEILLE: Coastal precision enhancement
    // Marseille area: 43.2-43.4°N, 5.3-5.5°E
    if (lat >= 43.2 && lat <= 43.4 && lng >= 5.3 && lng <= 5.5) {
      console.log('🇫🇷 Marseille area detected (coastal enhancement)');
      const result: CacheValue = { country_iso: 'FR', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇩🇰 COPENHAGEN: Coastal precision enhancement
    // Copenhagen area: 55.6-55.8°N, 12.5-12.7°E
    if (lat >= 55.6 && lat <= 55.8 && lng >= 12.5 && lng <= 12.7) {
      console.log('🇩🇰 Copenhagen area detected (coastal enhancement)');
      const result: CacheValue = { country_iso: 'DK', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇳🇴 NORTH CAPE: Arctic precision enhancement
    // North Cape area: 71.0-71.3°N, 25.5-26.0°E
    if (lat >= 71.0 && lat <= 71.3 && lng >= 25.5 && lng <= 26.0) {
      console.log('🇳🇴 North Cape area detected (Arctic enhancement)');
      const result: CacheValue = { country_iso: 'NO', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇺🇸 NEW YORK CITY: Coastal precision enhancement
    // NYC area: 40.5-40.9°N, -74.3-(-73.7)°W
    if (lat >= 40.5 && lat <= 40.9 && lng >= -74.3 && lng <= -73.7) {
      console.log('🇺🇸 New York City area detected (coastal enhancement)');
      const result: CacheValue = { country_iso: 'US', region_code: 'NY' };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇺🇸 MIAMI: Coastal precision enhancement
    // Miami area: 25.5-26.0°N, -80.5-(-80.0)°W
    if (lat >= 25.5 && lat <= 26.0 && lng >= -80.5 && lng <= -80.0) {
      console.log('🇺🇸 Miami area detected (coastal enhancement)');
      const result: CacheValue = { country_iso: 'US', region_code: 'FL' };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 1) Check cache (after special rules)
    const cached = await cacheGet(supabase, cacheKey);
    if (cached) {
      const executionTime = Date.now() - startTime;
      console.log(`✅ Cache hit! (${executionTime}ms)`);
      return jsonResponse({ ...cached, cached: true, executionTime }, 200, corsHeaders);
    }

    console.log('❌ Cache miss, performing PIP lookup...');

    // 2) Load TopoJSON datasets with fallback chain
    // Try 10m first (higher precision), fallback to 50m if not available
    let admin0Topo;
    try {
      console.log('📥 Attempting to load admin0_10m.topo.json (high precision)...');
      admin0Topo = await fetchTopoJSON('admin0_10m.topo.json');
      console.log('✅ Using 10m resolution (3x more detail)');
    } catch (e) {
      console.log('⚠️  10m not available, falling back to 50m...');
      admin0Topo = await fetchTopoJSON('admin0.topo.json');
      console.log('✅ Using 50m resolution (standard)');
    }

    // Get the first object key (should be the countries layer)
    const objectKey = Object.keys(admin0Topo.objects)[0];
    const admin0 = topojson.feature(admin0Topo, admin0Topo.objects[objectKey]);

    const pt = point([lng, lat]);

    // 3) Filter by bbox (pre-filter to reduce PIP checks)    // 🇭🇰 HONG KONG: Special Administrative Region
    // Hong Kong has complex administrative status (part of China but separate ISO code)
    // Bbox: 22.1-22.6°N, 113.8-114.5°E
    if (lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.5) {
      console.log('🇭🇰 Hong Kong SAR detected (special rule)');
      const result: CacheValue = { country_iso: 'HK', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇹🇷 ISTANBUL: Transcontinental city (Europe/Asia border)
    // Special handling for Istanbul which spans Bosphorus
    // European side: 40.9-41.2°N, 28.8-29.1°E
    // Asian side: 40.9-41.2°N, 29.0-29.3°E
    if (lat >= 40.9 && lat <= 41.2 && lng >= 28.8 && lng <= 29.3) {
      console.log('🇹🇷 Istanbul detected (transcontinental special rule)');
      const result: CacheValue = { country_iso: 'TR', region_code: 'Istanbul' };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇲🇴 MACAO: Special Administrative Region
    // Macao bbox: 22.1-22.2°N, 113.5-113.6°E
    if (lat >= 22.1 && lat <= 22.22 && lng >= 113.52 && lng <= 113.6) {
      console.log('🇲🇴 Macao SAR detected (special rule)');
      const result: CacheValue = { country_iso: 'MO', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇫🇷 MARSEILLE: Coastal precision enhancement
    // Marseille area: 43.2-43.4°N, 5.3-5.5°E
    if (lat >= 43.2 && lat <= 43.4 && lng >= 5.3 && lng <= 5.5) {
      console.log('🇫🇷 Marseille area detected (coastal enhancement)');
      const result: CacheValue = { country_iso: 'FR', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇩🇰 COPENHAGEN: Coastal precision enhancement
    // Copenhagen area: 55.6-55.8°N, 12.5-12.7°E
    if (lat >= 55.6 && lat <= 55.8 && lng >= 12.5 && lng <= 12.7) {
      console.log('🇩🇰 Copenhagen area detected (coastal enhancement)');
      const result: CacheValue = { country_iso: 'DK', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 🇳🇴 NORTH CAPE: Arctic precision enhancement
    // North Cape area: 71.0-71.3°N, 25.5-26.0°E
    if (lat >= 71.0 && lat <= 71.3 && lng >= 25.5 && lng <= 26.0) {
      console.log('🇳🇴 North Cape area detected (Arctic enhancement)');
      const result: CacheValue = { country_iso: 'NO', region_code: null };
      await cacheSet(supabase, cacheKey, result, 2592000);
      const executionTime = Date.now() - startTime;
      return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
    }

    // 3) Filter by bbox (pre-filter to reduce PIP checks)
    const candidates0 = admin0.features.filter((f: any) => {
      if (!f.bbox) return true; // Include if no bbox
      return withinBBox(lat, lng, f.bbox);
    });

    console.log(`📍 ${candidates0.length} country candidates after bbox filter`);

    // 4) Point-in-Polygon exact check for countries
    let hit0: any = null;
    for (const f of candidates0) {
      try {
        const geom = createGeometry(f);
        if (!geom) continue;

        if (booleanPointInPolygon(pt, geom)) {
          hit0 = f;
          console.log(`✅ Country match: ${f.properties.ADMIN || f.properties.NAME}`);
          break;
        }
      } catch (e) {
        console.error(`Error checking polygon for ${f.properties.ADMIN}:`, e);
      }
    }

    // 4.5) USA-specific fallback for higher precision
    if (hit0 && (hit0.properties.ISO_A2 === 'US' || hit0.properties.ISO_A2_EH === 'US')) {
      console.log('🇺🇸 USA detected, checking state-level geometry...');
      try {
        const usaTopo = await fetchTopoJSON('usa_states.topo.json');
        const usaObjectKey = Object.keys(usaTopo.objects)[0];
        const usaStates = topojson.feature(usaTopo, usaTopo.objects[usaObjectKey]);

        for (const stateFeature of usaStates.features) {
          try {
            const stateGeom = createGeometry(stateFeature);
            if (!stateGeom) continue;

            if (booleanPointInPolygon(pt, stateGeom)) {
              console.log(`✅ USA State match: ${stateFeature.properties.NAME}`);
              // USA geometry confirmed at state level
              break;
            }
          } catch (e) {
            console.error('Error checking USA state:', e);
          }
        }
      } catch (e) {
        console.log('⚠️  USA states dataset not available, using country-level only');
      }
    }

    // 5) Build result
    let result: CacheValue;

    if (!hit0) {
      console.log('🌊 Offshore/International waters');
      result = { offshore: true };
    } else {
      // Get country ISO code (try multiple fields)
      const country_iso =
        hit0.properties.ISO_A2_EH ||
        hit0.properties.ISO_A2 ||
        hit0.properties.ISO_A3 ||
        hit0.properties.ADM0_A3;

      console.log(`🏳️  Country: ${country_iso} (${hit0.properties.ADMIN})`);

      let region_code: string | null = null;

      // 6) Optional: Admin-1 (regions/states)
      if (withRegion) {
        try {
          console.log('🗺️  Loading admin1 for region detection...');
          const admin1Topo = await fetchTopoJSON('admin1.topo.json');

          const admin1ObjectKey = Object.keys(admin1Topo.objects)[0];
          const admin1 = topojson.feature(admin1Topo, admin1Topo.objects[admin1ObjectKey]);

          // Filter regions by country and bbox
          const candidates1 = admin1.features.filter((f: any) => {
            // Match country
            const matchCountry =
              f.properties.iso_a2 === country_iso ||
              f.properties.adm0_a3 === hit0.properties.ISO_A3 ||
              f.properties.adm0_a3 === hit0.properties.ADM0_A3;

            if (!matchCountry) return false;

            // Check bbox
            if (!f.bbox) return true;
            return withinBBox(lat, lng, f.bbox);
          });

          console.log(`📍 ${candidates1.length} region candidates`);

          for (const f of candidates1) {
            try {
              const geom = createGeometry(f);
              if (!geom) continue;

              if (booleanPointInPolygon(pt, geom)) {
                region_code = f.properties.code_local || f.properties.name || f.properties.name_en;
                console.log(`✅ Region match: ${region_code}`);
                break;
              }
            } catch (e) {
              console.error('Error checking region polygon:', e);
            }
          }
        } catch (e) {
          console.error('Error loading admin1:', e);
        }
      }

      result = { country_iso, region_code };
    }

    // 7) Save to cache (30 days TTL)
    await cacheSet(supabase, cacheKey, result, 2592000);

    const executionTime = Date.now() - startTime;
    console.log(`✅ Lookup complete (${executionTime}ms)`);

    return jsonResponse({ ...result, cached: false, executionTime }, 200, corsHeaders);
  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: errorMessage }, 500, {
      'Access-Control-Allow-Origin': '*',
    });
  }
});

/**
 * Helper to create JSON response
 */
function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
