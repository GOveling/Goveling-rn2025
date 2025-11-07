import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const ORS_API_KEY = Deno.env.get('ORS_API_KEY');

type Payload = {
  origin: [number, number]; // [lng, lat]
  destination: [number, number]; // [lng, lat]
  mode: 'driving' | 'cycling' | 'walking' | 'transit';
  language?: string;
};

type ORSProfile = 'driving-car' | 'cycling-regular' | 'foot-walking';

// Map mode to ORS profile
function modeToProfile(mode: string): ORSProfile {
  const map: Record<string, ORSProfile> = {
    driving: 'driving-car',
    cycling: 'cycling-regular',
    walking: 'foot-walking',
  };
  return map[mode] || 'foot-walking';
}

// Encode polyline (ORS uses encoded polylines like Google)
function encodePolyline(coords: number[][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lng, lat] of coords) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    const dLat = latE5 - prevLat;
    const dLng = lngE5 - prevLng;

    encoded += encodeValue(dLat) + encodeValue(dLng);

    prevLat = latE5;
    prevLng = lngE5;
  }

  return encoded;
}

function encodeValue(value: number): string {
  value = value < 0 ? ~(value << 1) : value << 1;
  let encoded = '';

  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }
  encoded += String.fromCharCode(value + 63);

  return encoded;
}

// Cache simple usando Map (en producción podrías usar Supabase KV o Redis)
const cache = new Map<string, any>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Validar API key
    if (!ORS_API_KEY) {
      console.error('❌ ORS_API_KEY not configured');
      return new Response(JSON.stringify({ ok: false, error: 'ORS_API_KEY_NOT_CONFIGURED' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const body = (await req.json()) as Payload;

    // Validar inputs
    if (
      !body.origin ||
      !body.destination ||
      !Array.isArray(body.origin) ||
      !Array.isArray(body.destination)
    ) {
      return new Response(JSON.stringify({ ok: false, error: 'INVALID_INPUT' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const mode = body.mode || 'walking';

    // ===== MANEJO DE TRANSIT =====
    if (mode === 'transit') {
      const [destLng, destLat] = body.destination;

      const deepLinks = {
        apple: `http://maps.apple.com/?daddr=${destLat},${destLng}&dirflg=r`,
        google: `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=transit`,
      };

      return new Response(
        JSON.stringify({
          ok: true,
          mode: 'transit',
          deepLinks,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ===== CACHE CHECK =====
    const cacheKey = `directions:${mode}:${body.origin.join(',')}:${body.destination.join(',')}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Cache hit:', cacheKey);
      return new Response(JSON.stringify({ ...cached.data, cached: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // ===== LLAMADA A ORS =====
    const profile = modeToProfile(mode);
    const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

    const orsBody = {
      coordinates: [body.origin, body.destination],
      language: body.language || 'en',
      units: 'm', // ORS siempre devuelve en metros
      instructions: true,
    };

    console.log('🚀 Calling ORS:', { profile, orsUrl });

    const orsResponse = await fetch(orsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ORS_API_KEY,
      },
      body: JSON.stringify(orsBody),
    });

    if (!orsResponse.ok) {
      const errorText = await orsResponse.text();
      console.error('❌ ORS Error:', orsResponse.status, errorText);

      return new Response(
        JSON.stringify({
          ok: false,
          error: 'ORS_ERROR',
          details: errorText,
          status: orsResponse.status,
        }),
        { status: orsResponse.status, headers: corsHeaders }
      );
    }

    const orsData = await orsResponse.json();

    if (!orsData.features || orsData.features.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'ROUTE_NOT_FOUND' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const feature = orsData.features[0];
    const properties = feature.properties;
    const geometry = feature.geometry;

    // Extraer coordenadas de la geometría GeoJSON
    let coordinates: number[][];

    if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates)) {
      coordinates = geometry.coordinates;
    } else {
      throw new Error('Invalid geometry format from ORS');
    }

    // Obtener summary del primer segmento
    const segment = properties.segments[0];
    const summary = segment.summary || {
      distance: segment.distance,
      duration: segment.duration,
    };

    // Calcular bbox
    const allLngs = coordinates.map((c: number[]) => c[0]);
    const allLats = coordinates.map((c: number[]) => c[1]);
    const bbox: [number, number, number, number] = [
      Math.min(...allLngs),
      Math.min(...allLats),
      Math.max(...allLngs),
      Math.max(...allLats),
    ];

    // Codificar polyline
    const polylineEncoded = encodePolyline(coordinates);

    // Extraer pasos de navegación
    const steps =
      segment.steps?.map((step: any) => ({
        instruction: step.instruction || '',
        distance_m: step.distance || 0,
        duration_s: step.duration || 0,
        type: step.type || '',
        name: step.name || '',
      })) || [];

    const result = {
      ok: true,
      mode,
      distance_m: summary.distance || 0,
      duration_s: summary.duration || 0,
      polyline: polylineEncoded,
      bbox,
      steps,
      cached: false,
    };

    // Guardar en cache
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    console.log('✅ Route calculated:', {
      mode,
      distance_km: (summary.distance / 1000).toFixed(2),
      duration_min: (summary.duration / 60).toFixed(1),
    });

    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error('❌ Unexpected error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'INTERNAL_ERROR', details: String(e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
