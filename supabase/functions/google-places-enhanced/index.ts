// @ts-ignore Deno global placeholder for type checker
declare const Deno: any;

// @ts-ignore Deno environment for edge function
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getCachedResults,
  saveCachedResults,
  generateCacheKey,
  calculateDynamicTTL,
} from '../_shared/cacheHelper.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Edge Function: google-places-enhanced
 * Paso 1: Sólo integración con Google Places API (v1 Text Search) + normalización.
 * (Fallback Gemini se añadirá en pasos posteriores.)
 *
 * Request body (JSON):
 * {
 *   input: string;                    // texto de búsqueda
 *   selectedCategories?: string[];    // categorías internas
 *   userLocation?: { lat:number; lng:number }; // ubicación del usuario (opcional)
 *   locale?: string;                  // ej: 'es', 'en', 'fr'
 * }
 *
 * Respuesta:
 * {
 *   predictions: EnhancedPlace[];
 *   status: 'OK'|'ERROR';
 *   source: 'google_places_enhanced';
 *   fallbackUsed?: boolean;
 *   error?: string;
 * }
 */

// Mapeo interno de categorías a tipos de Google (primer tipo usado en includedType)
const CATEGORY_TO_GOOGLE_TYPES: Record<string, string[]> = {
  restaurant: ['restaurant', 'food'],
  hotel: ['lodging'],
  attraction: ['tourist_attraction', 'museum', 'amusement_park', 'zoo'],
  shopping: ['shopping_mall', 'store'],
  entertainment: ['night_club', 'movie_theater', 'casino'],
  bar: ['bar'],
  cafe: ['cafe'],
  park: ['park'],
  museum: ['museum'],
  beach: ['tourist_attraction', 'natural_feature'],
};

interface IncomingBody {
  input: string;
  selectedCategories?: string[];
  userLocation?: { lat: number; lng: number };
  locale?: string;
}

interface EnhancedPlace {
  // extend with optional richer fields
  id: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  rating?: number;
  reviews_count?: number;
  category?: string; // categoría interna primaria que disparó la búsqueda
  types?: string[];
  priceLevel?: number;
  openNow?: boolean;
  business_status?: string;
  distance_km?: number;
  photos?: string[];
  source: string; // 'google'
  score?: number;
  description?: string;
  phone?: string;
  website?: string;
  confidence_score?: number;
  geocoded?: boolean;
  opening_hours_raw?: any;
  // Nuevos campos
  openingHours?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: string;
  viewport?: any;
  plusCode?: string;
  shortFormattedAddress?: string;
  accessibilityOptions?: any;
  // Geographic information from Google Places API
  country_code?: string;
  country?: string;
  city?: string;
}

// Distancia Haversine en km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const GOOGLE_PLACES_KEY =
  Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

let supabase: any = null;
if (SUPABASE_URL && SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

if (!GOOGLE_PLACES_KEY) {
  console.warn('[google-places-enhanced] Falta GOOGLE_PLACES_API_KEY o GOOGLE_MAPS_API_KEY');
}

async function textSearchGoogle(params: {
  query: string;
  includedType?: string;
  userLocation?: { lat: number; lng: number };
  locale?: string;
  maxResultCount?: number;
}): Promise<any[]> {
  const { query, includedType, userLocation, locale = 'en', maxResultCount = 20 } = params;

  console.log('[textSearchGoogle] Starting with params:', {
    query,
    includedType,
    userLocation,
    locale,
    maxResultCount,
  });

  const body: any = {
    textQuery: query,
    languageCode: locale,
    maxResultCount,
  };

  if (includedType) body.includedType = includedType; // Nuevo Places API v1 (un solo tipo)

  if (userLocation) {
    body.locationBias = {
      circle: {
        center: { latitude: userLocation.lat, longitude: userLocation.lng },
        radius: 5000, // 5km
      },
    };
  }

  // ✅ Optimización Fase 1: Fields básicos (gratis) + photos (premium pero necesario para UX)
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.types',
    'places.priceLevel',
    'places.businessStatus',
    // ⚠️ Premium fields necesarios para UX
    'places.photos', // $0.007 - Necesario para mostrar imágenes
    // 'places.currentOpeningHours',  // $0.003 - Comentado, usamos regularOpeningHours
    // Campos básicos/avanzados GRATIS
    'places.editorialSummary',
    'places.websiteUri',
    'places.regularOpeningHours.weekdayDescriptions',
    'places.primaryType',
    'places.primaryTypeDisplayName',
    'places.viewport',
    'places.plusCode',
    'places.shortFormattedAddress',
    'places.accessibilityOptions',
    // Geographic components for country/city detection
    'places.addressComponents',
  ].join(',');

  console.log('[textSearchGoogle] Request body:', JSON.stringify(body, null, 2));
  console.log('[textSearchGoogle] Field mask:', fieldMask);

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_KEY || '',
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  console.log('[textSearchGoogle] Response status:', resp.status, resp.statusText);

  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[textSearchGoogle] Google error', resp.status, txt);
    return [];
  }

  const data = await resp.json();
  console.log('[textSearchGoogle] Response data:', JSON.stringify(data, null, 2));

  return data.places || [];
}

/**
 * ✅ Optimización Fase 1: Nearby Search API
 * Más eficiente para búsquedas basadas en ubicación + tipos
 */
async function nearbySearchGoogle(params: {
  location: { lat: number; lng: number };
  radius?: number;
  includedTypes?: string[];
  locale?: string;
  maxResultCount?: number;
}): Promise<any[]> {
  const {
    location,
    radius = 5000,
    includedTypes = [],
    locale = 'en',
    maxResultCount = 20,
  } = params;

  console.log('[nearbySearchGoogle] Starting with params:', {
    location,
    radius,
    includedTypes,
    locale,
    maxResultCount,
  });

  const body: any = {
    languageCode: locale,
    maxResultCount,
    rankPreference: 'DISTANCE', // ✅ Ordenar por distancia
    locationRestriction: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius,
      },
    },
  };

  // Solo agregar includedTypes si hay tipos especificados
  if (includedTypes.length > 0) {
    body.includedTypes = includedTypes;
  }

  // Mismo fieldMask optimizado que Text Search
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.types',
    'places.priceLevel',
    'places.businessStatus',
    'places.photos', // $0.007 - Necesario para mostrar imágenes
    'places.editorialSummary',
    'places.websiteUri',
    'places.regularOpeningHours.weekdayDescriptions',
    'places.primaryType',
    'places.primaryTypeDisplayName',
    'places.viewport',
    'places.plusCode',
    'places.shortFormattedAddress',
    'places.accessibilityOptions',
    'places.addressComponents',
  ].join(',');

  console.log('[nearbySearchGoogle] Request body:', JSON.stringify(body, null, 2));

  const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_KEY || '',
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  console.log('[nearbySearchGoogle] Response status:', resp.status, resp.statusText);

  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[nearbySearchGoogle] Google error', resp.status, txt);
    return [];
  }

  const data = await resp.json();
  console.log('[nearbySearchGoogle] Found places:', data.places?.length || 0);

  return data.places || [];
}

function normalizePlace(
  raw: any,
  category?: string,
  userLocation?: { lat: number; lng: number }
): EnhancedPlace | null {
  try {
    const id = raw.id || raw.name || crypto.randomUUID();
    const coords = raw.location
      ? { lat: raw.location.latitude, lng: raw.location.longitude }
      : undefined;
    let distance_km: number | undefined;
    if (coords && userLocation) {
      distance_km = haversine(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
    }

    // Extract geographic information from addressComponents
    let country_code: string | undefined;
    let country: string | undefined;
    let city: string | undefined;

    if (raw.addressComponents && Array.isArray(raw.addressComponents)) {
      for (const component of raw.addressComponents) {
        const types = component.types || [];

        // Extract country
        if (types.includes('country')) {
          country_code = component.shortText; // ISO code (e.g., "CL", "US")
          country = component.longText; // Full name (e.g., "Chile", "United States")
        }

        // Extract city (locality is the most specific city level)
        if (types.includes('locality')) {
          city = component.longText;
        }
        // Fallback to administrative_area_level_3 if locality not found
        else if (!city && types.includes('administrative_area_level_3')) {
          city = component.longText;
        }
      }
    }

    // Limitar fotos (máx 5) construyendo URL media endpoint
    const photos: string[] = [];
    if (raw.photos && Array.isArray(raw.photos)) {
      console.log(
        `[normalizePlace] Processing ${raw.photos.length} photos for place: ${raw.displayName?.text}`
      );
      for (const p of raw.photos.slice(0, 5)) {
        if (p.name) {
          // p.name ej: "places/XXX/photos/YYY"
          const photoUrl = `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=400&key=${GOOGLE_PLACES_KEY}`;
          photos.push(photoUrl);
          console.log(`[normalizePlace] Added photo: ${p.name}`);
        }
      }
    } else {
      console.log(
        `[normalizePlace] No photos found for place: ${raw.displayName?.text}, raw.photos:`,
        raw.photos
      );
    }

    return {
      id,
      name: raw.displayName?.text || raw.displayName || 'Unnamed Place',
      address: raw.formattedAddress,
      coordinates: coords,
      rating: raw.rating,
      reviews_count: raw.userRatingCount,
      category,
      types: raw.types,
      priceLevel: raw.priceLevel,
      openNow: raw.currentOpeningHours?.openNow ?? undefined,
      business_status: raw.businessStatus,
      distance_km,
      photos,
      source: 'google',
      // Nuevos campos
      description: raw.editorialSummary?.text || undefined,
      website: raw.websiteUri || undefined,
      openingHours: raw.regularOpeningHours?.weekdayDescriptions || undefined,
      primaryType: raw.primaryType || undefined,
      primaryTypeDisplayName: raw.primaryTypeDisplayName?.text || undefined,
      viewport: raw.viewport || undefined,
      plusCode: raw.plusCode?.globalCode || raw.plusCode?.compoundCode || undefined,
      shortFormattedAddress: raw.shortFormattedAddress || undefined,
      accessibilityOptions: raw.accessibilityOptions || undefined,
      // Geographic information
      country_code,
      country,
      city,
    };
  } catch (e) {
    console.warn('normalizePlace error', e);
    return null;
  }
}

// Robust JSON extraction helper
function extractJson(text: string): any | null {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Invalid JSON, continue to extraction
  }
  // Find first '{' and last '}'
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // Invalid JSON slice, continue
    }
  }
  // Try bracket matching for array
  const arrFirst = text.indexOf('[');
  const arrLast = text.lastIndexOf(']');
  if (arrFirst !== -1 && arrLast !== -1 && arrLast > arrFirst) {
    const arrSlice = text.slice(arrFirst, arrLast + 1);
    try {
      return JSON.parse(arrSlice);
    } catch {
      // Invalid JSON array, continue
    }
  }
  // Remove markdown fences
  const fence = text.replace(/```json|```/gi, '');
  try {
    return JSON.parse(fence);
  } catch {
    // All parsing attempts failed
  }
  return null;
}

async function rateLimitedGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  // Simple delay to respect Nominatim usage (<=1 req/sec recommended)
  await new Promise((r) => setTimeout(r, 850));
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(address)}`,
      {
        headers: { 'User-Agent': 'GovelingApp/1.0 (search-fallback@goveling.example)' },
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (Array.isArray(data) && data.length) {
      const d = data[0];
      const lat = parseFloat(d.lat);
      const lng = parseFloat(d.lon);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  } catch {
    // Geocoding failed
  }
  return null;
}

async function geminiFallback(
  query: string,
  locale: string,
  context: { userLocation?: { lat: number; lng: number }; categories?: string[] }
) {
  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_KEY) return [];
  const categories =
    context.categories && context.categories.length
      ? context.categories.join(', ')
      : 'general travel interest';
  const locSnippet = context.userLocation
    ? `User approximate coordinates: ${context.userLocation.lat.toFixed(3)}, ${context.userLocation.lng.toFixed(3)}.`
    : 'No user coordinates provided.';
  const prompt = `You are a travel places search assistant. Task: Suggest real existing places that match the user intent.\nInput query: "${query}"\nFocus categories: ${categories}\n${locSnippet}\nReturn ONLY valid JSON with this exact schema: {\n  "predictions": [ {\n    "place_id": "string",\n    "main_text": "Place primary name",\n    "secondary_text": "City, Country or concise locality",\n    "full_address": "Formatted full address",\n    "types": ["type1","type2"],\n    "confidence_score": 0,\n    "phone": "+123456789" ,\n    "website": "https://...",\n    "description": "Short description"\n  } ],\n  "status": "OK"\n}\nRules:\n1. Max 5 items.\n2. confidence_score 0-100 (use 90+ only if very certain).\n3. Use plausible Google Places types (restaurant, lodging, tourist_attraction, museum, park, shopping_mall, cafe, bar, etc).\n4. Only real places (avoid fictional).\n5. If unsure or no data, return {"predictions":[],"status":"OK"}.\n6. NO extra commentary; ONLY JSON.\nLanguage: ${locale}.`;
  try {
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
        GEMINI_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, topK: 40, topP: 0.95, maxOutputTokens: 1200 },
        }),
      }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.predictions)) return [];
    const out: EnhancedPlace[] = [];
    for (const raw of parsed.predictions.slice(0, 5)) {
      if (!raw) continue;
      const id = raw.place_id || crypto.randomUUID();
      const name = raw.main_text || raw.name || 'Lugar';
      const address = raw.full_address || raw.secondary_text || raw.address;
      let coords: { lat: number; lng: number } | undefined = undefined;
      if (address) {
        const ge = await rateLimitedGeocode(address);
        if (ge) coords = ge;
      }
      out.push({
        id,
        name,
        address,
        category: raw.types && Array.isArray(raw.types) ? raw.types[0] : undefined,
        types: raw.types,
        description: raw.description,
        phone: raw.phone,
        website: raw.website,
        confidence_score:
          typeof raw.confidence_score === 'number' ? raw.confidence_score : undefined,
        geocoded: !!coords,
        coordinates: coords,
        source: 'gemini',
      } as EnhancedPlace);
    }
    return out;
  } catch {
    return [];
  }
}

serve(async (req: Request) => {
  console.log('[google-places-enhanced] Request received:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: IncomingBody;
  try {
    body = await req.json();
    console.log('[google-places-enhanced] Request body:', JSON.stringify(body, null, 2));
  } catch {
    console.error('[google-places-enhanced] Invalid JSON body');
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { input, selectedCategories = [], userLocation, locale = 'en' } = body;

  console.log('[google-places-enhanced] Parsed params:', {
    input,
    selectedCategories,
    userLocation,
    locale,
    inputLength: input?.length,
  });

  if (!input || typeof input !== 'string' || input.trim().length < 2) {
    console.log('[google-places-enhanced] Input validation failed, returning empty');
    return new Response(
      JSON.stringify({ predictions: [], status: 'OK', source: 'google_places_enhanced' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!GOOGLE_PLACES_KEY) {
    console.error('[google-places-enhanced] Missing Google Places API key!');
    return new Response(
      JSON.stringify({
        predictions: [],
        status: 'ERROR',
        source: 'google_places_enhanced',
        error: 'Missing Google Places API key',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('[google-places-enhanced] Google Places API key present:', !!GOOGLE_PLACES_KEY);
  console.log('[google-places-enhanced] Starting search with categories:', selectedCategories);

  // ============================================================================
  // L2 CACHE: Check shared cache in Supabase DB
  // ============================================================================
  const cacheKey = generateCacheKey({ input, selectedCategories, userLocation, locale });
  console.log('[google-places-enhanced] Cache key:', cacheKey);

  if (supabase) {
    const cachedResult = await getCachedResults(supabase, cacheKey);

    if (cachedResult.hit && cachedResult.data) {
      console.log('[google-places-enhanced] ✅ L2 Cache HIT - Returning cached results');
      const cachedResponse = {
        ...cachedResult.data,
        source: 'google_places_enhanced_cached',
        cached: true,
        cache_level: 'l2',
      };

      return new Response(JSON.stringify(cachedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[google-places-enhanced] ❌ L2 Cache MISS - Will call Google API');
  } else {
    console.warn('[google-places-enhanced] Supabase client not available, skipping L2 cache');
  }

  // ============================================================================
  // L3: Google Places API (Cache miss - need to fetch fresh data)
  // ============================================================================
  const start = Date.now();
  const aggregated: EnhancedPlace[] = [];
  const seen = new Set<string>();

  async function runCategorySearch(cat: string) {
    console.log('[google-places-enhanced] Running category search for:', cat);
    const types = CATEGORY_TO_GOOGLE_TYPES[cat];
    const primaryType = types?.[0];
    console.log('[google-places-enhanced] Primary type for category:', primaryType);

    // Estrategia mejorada: combinar categoría con ubicación del input
    let query = input;

    // Si el input parece ser solo una localidad (pocas palabras, sin términos específicos de lugares)
    // entonces enriquecer la búsqueda con el término de categoría
    const inputWords = input.trim().toLowerCase().split(/\s+/);
    const categoryTerms = {
      restaurant: ['restaurante', 'restaurant', 'comida', 'food'],
      hotel: ['hotel', 'alojamiento', 'lodging'],
      shopping: ['tienda', 'shop', 'compras', 'shopping'],
      entertainment: ['entretenimiento', 'entertainment', 'diversión'],
      museum: ['museo', 'museum'],
      park: ['parque', 'park'],
      beach: ['playa', 'beach'],
      attraction: ['atracción', 'attraction', 'turístico'],
    };

    const catTerms = categoryTerms[cat] || [];
    const hasSpecificTerms = inputWords.some((word) =>
      catTerms.some((term) => word.includes(term.toLowerCase()))
    );

    // Si no tiene términos específicos de la categoría y es una búsqueda corta,
    // enriquecer con el término principal de la categoría
    if (!hasSpecificTerms && inputWords.length <= 3) {
      const categoryEnhancer = {
        restaurant: 'restaurantes',
        hotel: 'hoteles',
        shopping: 'tiendas',
        entertainment: 'entretenimiento',
        museum: 'museos',
        park: 'parques',
        beach: 'playas',
        attraction: 'atracciones turísticas',
      };
      const enhancer = categoryEnhancer[cat];
      if (enhancer) {
        query = `${enhancer} ${input}`;
        console.log('[google-places-enhanced] Enhanced query for location-only search:', query);
      }
    }

    const places = await textSearchGoogle({
      query,
      includedType: primaryType,
      userLocation,
      locale,
      maxResultCount: 6,
    });
    console.log('[google-places-enhanced] Category search results for', cat, ':', places.length);

    for (const p of places) {
      const norm = normalizePlace(p, cat, userLocation);
      if (norm && !seen.has(norm.id)) {
        seen.add(norm.id);
        aggregated.push(norm);
      }
    }
  }

  // ✅ Optimización Fase 1: Usar Nearby Search cuando es apropiado
  const isNearbySearch = selectedCategories.length > 0 && userLocation && input.trim().length < 5;

  if (isNearbySearch) {
    console.log('[google-places-enhanced] ✨ Using optimized Nearby Search API');

    // Mapear categorías a tipos de Google
    const includedTypes: string[] = [];
    for (const cat of selectedCategories.slice(0, 5)) {
      const types = CATEGORY_TO_GOOGLE_TYPES[cat];
      if (types && types[0]) {
        includedTypes.push(types[0]);
      }
    }

    console.log('[google-places-enhanced] Nearby search types:', includedTypes);

    const nearbyPlaces = await nearbySearchGoogle({
      location: userLocation,
      radius: 5000, // 5km
      includedTypes,
      locale,
      maxResultCount: 20,
    });

    console.log('[google-places-enhanced] Nearby search results:', nearbyPlaces.length);

    for (const p of nearbyPlaces) {
      const norm = normalizePlace(p, selectedCategories[0], userLocation);
      if (norm && !seen.has(norm.id)) {
        seen.add(norm.id);
        aggregated.push(norm);
      }
    }
  } else if (selectedCategories.length > 0) {
    console.log('[google-places-enhanced] Running category-based search (PARALLEL)');

    // Execute all category searches in parallel for better performance
    const categorySearchPromises = selectedCategories
      .slice(0, 5) // límite preventivo
      .map((cat) => runCategorySearch(cat));

    await Promise.all(categorySearchPromises);

    console.log('[google-places-enhanced] All parallel category searches completed');
  } else {
    console.log('[google-places-enhanced] Running general search');
    // ✅ Optimización Fase 1: Aumentar resultados generales
    const generalPlaces = await textSearchGoogle({
      query: input,
      userLocation,
      locale,
      maxResultCount: 20, // ⬆️ De 12 a 20
    });
    console.log('[google-places-enhanced] General search results:', generalPlaces.length);

    for (const p of generalPlaces) {
      const norm = normalizePlace(p, undefined, userLocation);
      if (norm && !seen.has(norm.id)) {
        seen.add(norm.id);
        aggregated.push(norm);
      }
    }
  }

  console.log(
    '[google-places-enhanced] Total aggregated results before filtering:',
    aggregated.length
  );

  // Filtrar coordenadas inválidas
  let results = aggregated.filter(
    (p) =>
      !p.coordinates ||
      (p.coordinates.lat <= 90 &&
        p.coordinates.lat >= -90 &&
        p.coordinates.lng <= 180 &&
        p.coordinates.lng >= -180)
  );

  // ✅ Optimización Fase 1: Filtrar por radio más amplio
  if (userLocation) {
    results = results.filter(
      (p) => (typeof p.distance_km === 'number' ? (p.distance_km as number) <= 8 : true) // ⬆️ 5km → 8km
    );
  }

  // ✅ Optimización Fase 1: Scoring mejorado
  if (userLocation) {
    // Scoring basado en: distancia (30%), rating (40%), reviews (20%), business_status (10%)
    for (const p of results) {
      if (p.source === 'gemini') continue; // sin score para fallback simple

      // Distancia: 0-8km, cercano = mejor score
      const dist = typeof p.distance_km === 'number' ? p.distance_km : 8;
      const distNorm = 1 - Math.min(dist, 8) / 8; // 1 muy cercano, 0 muy lejos

      // Rating: 0-5 estrellas
      const rating = p.rating ?? 0;
      const ratingNorm = Math.min(rating, 5) / 5;

      // Reviews: log scale para normalizar (0-1000+)
      const reviews = p.reviews_count ?? 0;
      const reviewsNorm = Math.min(Math.log10(1 + reviews) / Math.log10(1 + 1000), 1);

      // Business status: operacional = boost
      const statusBonus = p.business_status === 'OPERATIONAL' ? 0.1 : 0;

      // Cerrado ahora = penalización
      const openPenalty = p.openNow === false ? -0.15 : 0;

      // Score ponderado
      const score =
        0.3 * distNorm + // 30% distancia
        0.4 * ratingNorm + // 40% rating
        0.2 * reviewsNorm + // 20% popularidad
        statusBonus + // 10% operacional
        openPenalty; // -15% si cerrado

      p.score = Number(Math.max(0, Math.min(1, score)).toFixed(4));
    }

    // Ordenar por score descendente
    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else {
    // Sin ubicación: ordenar por rating y reviews
    results.sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
    );
  }

  // ✅ Optimización Fase 1: Aumentar límite de resultados
  results = results.slice(0, 15); // ⬆️ De 10 a 15

  const durationMs = Date.now() - start;
  const response = {
    predictions: results,
    status: 'OK' as const,
    source: 'google_places_enhanced',
    took_ms: durationMs,
    count: results.length,
    fallbackUsed: false,
  };

  // ============================================================================
  // SAVE TO L2 CACHE: Save results to shared cache for other users
  // ============================================================================
  if (supabase) {
    const ttl = calculateDynamicTTL(input);
    console.log(
      '[google-places-enhanced] Saving to L2 cache with TTL:',
      ttl / (60 * 60 * 1000),
      'hours'
    );

    saveCachedResults(
      supabase,
      cacheKey,
      { input, selectedCategories, userLocation, locale },
      response,
      ttl
    ).catch((err) => {
      console.error('[google-places-enhanced] Failed to save to cache:', err);
    });
  }

  // Async log (fire and forget)
  if (supabase) {
    const cats = selectedCategories.length ? selectedCategories : null;
    supabase
      .from('search_logs')
      .insert({
        query: input,
        categories: cats,
        locale,
        took_ms: durationMs,
        results_count: results.length,
        used_location: !!userLocation,
        source: 'google',
        fallback_used: false,
        error: null,
        user_lat: userLocation?.lat ?? null,
        user_lng: userLocation?.lng ?? null,
      })
      .then(() => {})
      .catch(() => {});
  }

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
