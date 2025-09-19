
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
const KEY = Deno.env.get("GOOGLE_MAPS_API_KEY")!;

/**
 * Body:
 * { q, lat, lng, radius, categories: string[], open_now?: boolean, min_rating?: number, order?: 'relevance'|'distance'|'rating' }
 */
serve(async (req)=>{
  try {
    const { q, lat, lng, radius=1000, categories=[], open_now=false, min_rating=0, order='distance' } = await req.json();

    const params = new URLSearchParams();
    params.set('key', KEY);
    if (lat && lng) params.set('location', `${lat},${lng}`);
    if (radius) params.set('radius', String(radius));
    if (q) params.set('keyword', q);
    if (open_now) params.set('opennow', 'true');
    // ordering per Places Nearby only allows 'prominence' (default) or 'distance'; for 'rating' we'll sort client-side
    if (order === 'distance') params.set('rankby', 'distance');

    // Categories: for NearbySearch we can pass as 'type' (one type). If multiple, we'll do multiple calls and merge.
    async function fetchType(type?:string){
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}${type?`&type=${type}`:''}`;
      const r = await fetch(url);
      return await r.json();
    }

    let aggregated:any[] = [];
    if (categories && categories.length>0){
      // Aggregate across types
      for (const c of categories.slice(0,5)){ // limit to avoid quota spikes
        const jr = await fetchType(c);
        if (jr.results) aggregated = aggregated.concat(jr.results);
      }
    } else {
      const jr = await fetchType();
      aggregated = jr.results || [];
    }

    // Deduplicate by place_id
    const seen = new Set<string>();
    const dedup = [];
    for (const it of aggregated){
      const id = it.place_id || it.reference || Math.random().toString(36).slice(2);
      if (!seen.has(id)){
        seen.add(id);
        dedup.push(it);
      }
    }

    // Filter by rating if provided
    let results = dedup;
    if (min_rating>0) results = results.filter((r:any)=> (r.rating||0) >= min_rating);

    // Sort by rating if requested
    if (order === 'rating'){
      results.sort((a:any,b:any)=> (b.rating||0) - (a.rating||0));
    }

    return new Response(JSON.stringify({ results }), { headers:{ "Content-Type":"application/json" } });
  } catch (e){
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers:{ "Content-Type":"application/json" } });
  }
});
