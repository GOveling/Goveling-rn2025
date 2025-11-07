import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const ORS_API_KEY = Deno.env.get('ORS_API_KEY');

// OSRM public server (gratuito, sin límites)
const OSRM_BASE_URL = 'https://router.project-osrm.org';

type Payload = {
  origin: [number, number]; // [lng, lat]
  destination: [number, number]; // [lng, lat]
  mode: 'driving' | 'cycling' | 'walking' | 'transit';
  language?: string;
};

type ORSProfile = 'driving-car' | 'cycling-regular' | 'foot-walking';
type OSRMProfile = 'car' | 'bike' | 'foot';

// Map mode to ORS profile
function modeToProfile(mode: string): ORSProfile {
  const map: Record<string, ORSProfile> = {
    driving: 'driving-car',
    cycling: 'cycling-regular',
    walking: 'foot-walking',
  };
  return map[mode] || 'foot-walking';
}

// Map mode to OSRM profile
function modeToOSRMProfile(mode: string): OSRMProfile {
  const map: Record<string, OSRMProfile> = {
    driving: 'car',
    cycling: 'bike',
    walking: 'foot',
  };
  return map[mode] || 'foot';
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

// Función para obtener ruta de OSRM (gratuito)
async function getRouteFromOSRM(
  origin: [number, number],
  destination: [number, number],
  mode: string
) {
  const profile = modeToOSRMProfile(mode);
  const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;

  // Parámetros optimizados para mejor calidad:
  // - overview=full: geometría completa (mejor precisión)
  // - geometries=geojson: formato GeoJSON nativo
  // - steps=true: instrucciones turn-by-turn
  // - alternatives=true: obtener rutas alternativas
  // - continue_straight=default: permitir giros naturales
  // - annotations=true: datos adicionales de velocidad/duración
  const osrmUrl = `${OSRM_BASE_URL}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=true&continue_straight=default&annotations=true`;

  console.log('🆓 Trying OSRM (free):', { profile, mode, url: osrmUrl });

  try {
    const response = await fetch(osrmUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('❌ OSRM HTTP error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('📦 OSRM response:', {
      code: data.code,
      hasRoutes: !!data.routes,
      routesCount: data.routes?.length || 0,
    });

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.log('❌ OSRM no route found - code:', data.code, 'message:', data.message);
      return null;
    }

    // Seleccionar la mejor ruta entre las alternativas
    // Prioridad: menor duración con distancia razonable
    const route = data.routes.reduce((best: any, current: any) => {
      if (!best) return current;

      // Preferir ruta con mejor balance duración/distancia
      const currentScore = current.duration + current.distance / 100; // menor es mejor
      const bestScore = best.duration + best.distance / 100;

      return currentScore < bestScore ? current : best;
    }, null);

    if (!route) {
      console.log('❌ OSRM no valid route found');
      return null;
    }

    const coordinates = route.geometry.coordinates;

    // Calcular bbox
    const allLngs = coordinates.map((c: number[]) => c[0]);
    const allLats = coordinates.map((c: number[]) => c[1]);
    const bbox: [number, number, number, number] = [
      Math.min(...allLngs),
      Math.min(...allLats),
      Math.max(...allLngs),
      Math.max(...allLats),
    ];

    // Función helper para generar instrucciones más claras en español
    const generateInstruction = (step: any): string => {
      const maneuver = step.maneuver;
      const name = step.name || '';
      const modifier = maneuver?.modifier || '';
      const type = maneuver?.type || '';

      // Mapeo de tipos de maniobra a instrucciones claras
      const instructions: { [key: string]: string } = {
        'turn-sharp-right': `Gira bruscamente a la derecha${name ? ` hacia ${name}` : ''}`,
        'turn-right': `Gira a la derecha${name ? ` hacia ${name}` : ''}`,
        'turn-slight-right': `Gira ligeramente a la derecha${name ? ` hacia ${name}` : ''}`,
        'turn-sharp-left': `Gira bruscamente a la izquierda${name ? ` hacia ${name}` : ''}`,
        'turn-left': `Gira a la izquierda${name ? ` hacia ${name}` : ''}`,
        'turn-slight-left': `Gira ligeramente a la izquierda${name ? ` hacia ${name}` : ''}`,
        uturn: 'Da la vuelta en U',
        arrive: 'Has llegado a tu destino',
        depart: `Dirígete${name ? ` por ${name}` : ''}`,
        continue: `Continúa${name ? ` por ${name}` : ''}`,
        roundabout: `Toma la rotonda${name ? ` y sal hacia ${name}` : ''}`,
        merge: `Incorpórate${name ? ` a ${name}` : ''}`,
        fork: `Mantente${modifier.includes('right') ? ' a la derecha' : ' a la izquierda'}${name ? ` hacia ${name}` : ''}`,
      };

      // Construir clave de búsqueda
      const key = modifier ? `${type}-${modifier}` : type;

      return (
        instructions[key] || instructions[type] || step.maneuver?.instruction || name || 'Continúa'
      );
    };

    // Extraer pasos con instrucciones mejoradas
    const steps =
      route.legs[0]?.steps?.map((step: any) => ({
        instruction: generateInstruction(step),
        distance_m: Math.round(step.distance || 0),
        duration_s: Math.round(step.duration || 0),
        type: String(step.maneuver?.type || ''),
        name: step.name || '',
      })) || [];

    console.log('✅ OSRM success:', {
      distance_km: (route.distance / 1000).toFixed(2),
      duration_min: (route.duration / 60).toFixed(1),
      steps_count: steps.length,
      source: 'OSRM (free, optimized)',
    });

    return {
      ok: true,
      mode,
      distance_m: route.distance,
      duration_s: route.duration,
      coords: coordinates, // OSRM ya devuelve coordenadas decodificadas
      bbox,
      steps,
      cached: false,
      source: 'osrm',
    };
  } catch (error) {
    console.log('❌ OSRM error:', error);
    return null;
  }
}

// Cache simple usando Map (en producción podrías usar Supabase KV o Redis)
const cache = new Map<string, any>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora - Las rutas no cambian frecuentemente

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

    // ===== ESTRATEGIA: OSRM PRIMERO (GRATIS), ORS COMO FALLBACK INTELIGENTE =====

    // Calcular distancia directa (haversine) para decidir estrategia
    const R = 6371; // Radio de la Tierra en km
    const lat1 = body.origin[1] * (Math.PI / 180);
    const lat2 = body.destination[1] * (Math.PI / 180);
    const deltaLat = (body.destination[1] - body.origin[1]) * (Math.PI / 180);
    const deltaLon = (body.destination[0] - body.origin[0]) * (Math.PI / 180);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c; // distancia en km

    console.log('📏 Straight-line distance:', straightDistance.toFixed(2), 'km');

    // 1. Intentar OSRM (gratuito, sin límites)
    const osrmResult = await getRouteFromOSRM(body.origin, body.destination, mode);

    if (osrmResult) {
      const routeDistance = osrmResult.distance_m / 1000; // convertir a km
      const detourFactor = routeDistance / straightDistance;

      console.log('📊 Route quality check:', {
        straight_km: straightDistance.toFixed(2),
        route_km: routeDistance.toFixed(2),
        detour_factor: detourFactor.toFixed(2),
      });

      // Validar calidad de la ruta OSRM
      // Para rutas MUY CORTAS (<1km), siempre usar OSRM (el detour factor puede ser engañoso)
      // Para rutas medianas/largas, validar si el desvío es razonable
      const needsBetterRoute =
        routeDistance > 1 && // Solo validar si la ruta es >1km
        ((straightDistance > 10 && detourFactor > 3) || // Ruta larga con desvío alto
          detourFactor > 5); // Desvío extremo

      if (needsBetterRoute) {
        console.log(
          '⚠️ OSRM route quality questionable (detour factor too high), trying ORS for better accuracy...'
        );
        // NO hacer return aquí - continuar al fallback ORS abajo
      } else {
        // OSRM es buena calidad (o muy corta), guardar en cache y retornar
        console.log('✅ OSRM route quality is good, using it');
        cache.set(cacheKey, {
          data: osrmResult,
          timestamp: Date.now(),
        });

        return new Response(JSON.stringify(osrmResult), {
          status: 200,
          headers: corsHeaders,
        });
      }
    } else {
      console.log('⚠️ OSRM failed to return a route');
    }

    // 2. Si OSRM falla o la calidad no es buena, intentar ORS (con API key, tiene límites)
    console.log('⚠️ Falling back to ORS for better route quality...');

    if (!ORS_API_KEY) {
      console.error('❌ ORS_API_KEY not configured and OSRM failed');
      return new Response(JSON.stringify({ ok: false, error: 'ROUTING_SERVICE_UNAVAILABLE' }), {
        status: 503,
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
      coords: coordinates, // Coordenadas decodificadas
      bbox,
      steps,
      cached: false,
      source: 'ors', // Indicar que vino de ORS (fallback)
    };

    // Guardar en cache
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    console.log('✅ Route calculated from ORS (fallback):', {
      mode,
      distance_km: (summary.distance / 1000).toFixed(2),
      duration_min: (summary.duration / 60).toFixed(1),
      source: 'ORS (paid)',
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
