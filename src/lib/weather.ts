export async function getWeather(lat:number, lng:number, units:'c'|'f'){
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
  const res = await fetch(`${base}/functions/v1/weather_now`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ lat, lng, units }) });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error||'weather failed');
  return { temp: j.temperature, code: j.code };
}
