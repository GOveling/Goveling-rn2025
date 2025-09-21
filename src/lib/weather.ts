export async function getWeather(lat:number, lng:number, units:'c'|'f'){
  try {
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
    const url = `${base}/functions/v1/weather_now`;
    
    const res = await fetch(url, { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg'}`,
        'Accept': 'application/json'
      }, 
      body: JSON.stringify({ lat, lng, units }),
      mode: 'cors'
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${res.status}` };
      }
      throw new Error(errorData?.error || `Weather request failed with status ${res.status}`);
    }
    
    const j = await res.json();
    console.log('🌡️ Weather API response:', j);
    const temperature = typeof j.temperature === 'number' ? j.temperature : null;
    
    // Map the location data
    const location = j.location ? {
      city: j.location.name,  // ← Mapeo: API name → city
      country: j.location.country,
      region: j.location.region,
    } : null;
    
    return { 
      temp: temperature, 
      code: j.code,
      location: location
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to connect to weather service. Please check your internet connection.');
    }
    console.error('🌡️ Weather API error:', error);
    throw error;
  }
}
