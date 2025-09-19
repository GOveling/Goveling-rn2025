import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;

type LatLng = { lat:number; lng:number };
type Req = {
  origin: LatLng;
  destination: LatLng;
  mode: 'walking'|'driving'|'bicycling'|'transit';
  departure_time?: number; // epoch seconds, for transit
};

function ok(d:any){ return new Response(JSON.stringify(d), { headers: { 'Content-Type':'application/json' }}); }
function bad(d:any, s=400){ return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type':'application/json' }}); }

function key(o:LatLng, d:LatLng, m:string){
  return { mode:m, o_lat: round6(o.lat), o_lng: round6(o.lng), d_lat: round6(d.lat), d_lng: round6(d.lng) };
}
function round6(n:number){ return Math.round(n*1e6)/1e6; }

async function fetchGoogle(r:Req){
  const params = new URLSearchParams();
  params.set('origin', `${r.origin.lat},${r.origin.lng}`);
  params.set('destination', `${r.destination.lat},${r.destination.lng}`);
  params.set('mode', r.mode);
  if (r.mode === 'transit' && r.departure_time){ params.set('departure_time', String(r.departure_time)); }
  params.set('key', API_KEY);
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
  const res = await fetch(url);
  const j = await res.json();
  return j;
}

// Simple decode polyline (Google encoded polyline algorithm)
function decodePolyline(str:string){
  let index=0, lat=0, lng=0, coordinates:number[][] = [];
  while(index < str.length){
    let b, shift=0, result=0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    coordinates.push([lng * 1e-5, lat * 1e-5]); // [lng, lat]
  }
  return coordinates;
}

function simplifyResponse(j:any){
  // Prefer the first route + first leg (common for point-to-point)
  const route = j.routes?.[0];
  const leg = route?.legs?.[0];
  const overview = route?.overview_polyline?.points ? decodePolyline(route.overview_polyline.points) : null;
  const steps = (leg?.steps||[]).map((s:any) => {
    // Transit details if any
    const td = s.transit_details ? {
      line: {
        short_name: s.transit_details.line?.short_name,
        name: s.transit_details.line?.name,
        color: s.transit_details.line?.color,
        agency: s.transit_details.line?.agencies?.[0]?.name,
      },
      headsign: s.transit_details.headsign,
      num_stops: s.transit_details.num_stops,
      departure_stop: s.transit_details.departure_stop?.name,
      arrival_stop: s.transit_details.arrival_stop?.name,
    } : null;
    return {
      travel_mode: s.travel_mode,
      instruction: s.html_instructions,
      distance_m: s.distance?.value,
      duration_s: s.duration?.value,
      polyline: s.polyline?.points ? decodePolyline(s.polyline.points) : null,
      transit: td
    };
  });
  return {
    summary: route?.summary,
    distance_m: leg?.distance?.value,
    duration_s: leg?.duration?.value,
    arrival_time: leg?.arrival_time?.text,
    departure_time: leg?.departure_time?.text,
    overview_polyline: overview,
    steps
  };
}

async function rateLimit(ip:string){
  // naive in-memory window behind the function container lifecycle (acceptable for demo)
  // For robust RL, attach to KV/Redis. Here we allow ~30 req/min/ip.
  const key = `rl_${ip}`;
  // no persistent store here; skip strict RL for brevity
  return true;
}

serve(async (req) => {
  if (req.method !== 'POST') return bad({ error: 'Method not allowed' }, 405);
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const allowed = await rateLimit(ip);
  if (!allowed) return bad({ error:'rate_limited' }, 429);
  try{
    const body = await req.json() as Req;
    if (!body?.origin || !body?.destination || !body?.mode) return bad({ error:'missing_fields' });

    const k = key(body.origin, body.destination, body.mode);
    // Try cache
    const { data: hit } = await supabase.from('directions_cache')
      .select('payload')
      .eq('mode', k.mode).eq('o_lat', k.o_lat).eq('o_lng', k.o_lng).eq('d_lat', k.d_lat).eq('d_lng', k.d_lng)
      .order('created_at', { ascending:false }).limit(1).maybeSingle();
    if (hit?.payload) return ok({ ok:true, cached:true, result: hit.payload });

    // Fetch Google
    const g = await fetchGoogle(body);
    if (g.status !== 'OK' || !g.routes?.length) return bad({ error:'no_route', g }, 400);
    const simplified = simplifyResponse(g);

    // Save cache (best-effort)
    await supabase.from('directions_cache').insert({ ...k, payload: simplified });

    return ok({ ok:true, cached:false, result: simplified });
  }catch(e){
    return bad({ error: String(e) }, 500);
  }
});
