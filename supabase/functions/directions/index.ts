import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;

type Payload = {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
  mode?: 'walking' | 'driving' | 'transit' | 'bicycling';
  language?: string;
  units?: 'metric' | 'imperial';
};

function decodePolyline(str: string) {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates: any[] = [];
  while (index < str.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coordinates;
}

serve(async (req) => {
  try {
    const body = (await req.json()) as Payload;
    const mode = body.mode || 'walking';
    const lang = body.language || 'en';
    const units = body.units || 'metric';
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${body.origin.lat},${body.origin.lng}`);
    url.searchParams.set('destination', `${body.dest.lat},${body.dest.lng}`);
    url.searchParams.set('mode', mode);
    url.searchParams.set('language', lang);
    url.searchParams.set('units', units);
    url.searchParams.set('key', KEY);

    const res = await fetch(url.toString());
    const j = await res.json();
    if (j.status !== 'OK') {
      return new Response(
        JSON.stringify({ ok: false, error: j.status, details: j.error_message }),
        { status: 400 }
      );
    }
    const route = j.routes?.[0];
    const leg = route?.legs?.[0];
    const poly = route?.overview_polyline?.points ?? null;
    const decoded = poly ? decodePolyline(poly) : [];

    const out = {
      ok: true,
      distance_m: leg?.distance?.value ?? null,
      duration_s: leg?.duration?.value ?? null,
      polyline: poly,
      coords: decoded,
      steps:
        leg?.steps?.map((s: any) => ({
          distance_m: s.distance?.value,
          duration_s: s.duration?.value,
          html_instructions: s.html_instructions,
          travel_mode: s.travel_mode,
          start_location: s.start_location,
          end_location: s.end_location,
        })) ?? [],
    };
    return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 400 });
  }
});
