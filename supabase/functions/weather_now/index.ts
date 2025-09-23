const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Simple in-memory cache
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutos
const cache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(lat: number, lng: number, units: string): string {
  // Round coordinates to 3 decimal places (≈111m precision) for cache grouping
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `${roundedLat},${roundedLng},${units}`;
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION_MS;
  if (isExpired) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
  
  // Clean up expired entries (keep cache size reasonable)
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_DURATION_MS) {
        cache.delete(k);
      }
    }
  }
}

async function json(d: any, s = 200) { 
  return new Response(JSON.stringify(d), { 
    status: s, 
    headers: { 
      "Content-Type": "application/json",
      ...corsHeaders
    }
  }); 
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const body = await req.json();
    const { lat, lng, units } = body;
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return json({ error: 'Invalid lat/lng parameters' }, 400);
    }
    
    const cacheKey = getCacheKey(lat, lng, units || 'c');
    
    // Check cache first
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      return json({ ...cachedResult, cached: true });
    }
    
    const tempUnit = units === 'f' ? 'fahrenheit' : 'celsius';
    
    // Get weather data from Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`;
    
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      return json({ error: 'Weather API request failed' }, 500);
    }
    
    const weatherData = await weatherResponse.json();
    
    // Get location data from reverse geocoding API
    let locationData: { name: string; country: string; region: string; } | null = null;
    try {
      const geocodeUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`;
      const geocodeResponse = await fetch(geocodeUrl);
      
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        console.log('🌍 Geocode API response:', geocodeData);
        
        locationData = {
          name: geocodeData.city || geocodeData.locality || geocodeData.principalSubdivision || geocodeData.countryName || 'Ubicación desconocida',
          country: geocodeData.countryName || '',
          region: geocodeData.principalSubdivision || ''
        };
      }
    } catch (geocodeError) {
      console.error('🌍 Geocode error:', geocodeError);
      // Continue without location data
    }
    
    const result = { 
      ok: true, 
      temperature: weatherData?.current?.temperature_2m, 
      code: weatherData?.current?.weather_code,
      location: locationData,
      cached: false
    };
    
    // Cache the result
    setCachedData(cacheKey, result);
    
    return json(result);
  } catch (error) {
    console.error('Weather function error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});