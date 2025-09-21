export async function getWeather(lat:number, lng:number, units:'c'|'f'){
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
  const res = await fetch(`${base}/functions/v1/weather_now`, { 
    method:'POST', 
    headers:{ 
      'Content-Type':'application/json',
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg'}`
    }, 
    body: JSON.stringify({ lat, lng, units }) 
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error||'weather failed');
  return { temp: j.temperature, code: j.code };
}
