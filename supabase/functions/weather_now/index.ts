const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

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
    
    const tempUnit = units === 'f' ? 'fahrenheit' : 'celsius';
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`;
    
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      return json({ error: 'Weather API request failed' }, 500);
    }
    
    const weatherData = await weatherResponse.json();
    
    return json({ 
      ok: true, 
      temperature: weatherData?.current?.temperature_2m, 
      code: weatherData?.current?.weather_code 
    });
  } catch (error) {
    console.error('Weather function error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});