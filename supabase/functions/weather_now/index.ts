import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

async function json(d, s=200){ return new Response(JSON.stringify(d), { status:s, headers:{ "Content-Type":"application/json" }}); }

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const { lat, lng, units } = await req.json();
  if (typeof lat !== 'number' || typeof lng !== 'number') return json({ error: 'Missing lat/lng' }, 400);
  const tempUnit = units === 'f' ? 'fahrenheit' : 'celsius';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`;
  const r = await fetch(url);
  if (!r.ok) return json({ error:'weather_failed' }, 500);
  const j = await r.json();
  return json({ ok:true, temperature: j?.current?.temperature_2m, code: j?.current?.weather_code });
});
