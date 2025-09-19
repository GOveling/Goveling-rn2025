/**
 * AI Routes Service — External ML integration with double fallback
 * Base URL from env: EXPO_PUBLIC_ML_API_BASE (e.g., https://goveling-ml.onrender.com/api)
 * Endpoints:
 *   V2: /v2/itinerary/generate-hybrid
 *   V1: /v1/itinerary/generate-hybrid
 * Local fallback: getRouteConfigurations()
 */

type LatLng = { lat:number; lng:number };

export type MLPlace = {
  id: string;              // place_id or internal id
  name: string;
  lat: number;
  lng: number;
  priority?: number;       // optional priority 1..n
  duration_min?: number;   // optional expected visit time
  category?: string;
  open_hours?: any;        // optional opening hours blob
};

export type MLRequest = {
  trip_id: string;
  start_date: string;          // YYYY-MM-DD
  end_date: string;            // YYYY-MM-DD
  mode?: 'walking'|'driving'|'bicycling'|'transit';
  daily_window?: { start: string; end: string }; // '09:00' - '18:00'
  accommodations?: { lat:number; lng:number; name?:string }[];
  places: MLPlace[];
};

export type MLDayPlan = {
  date: string;          // YYYY-MM-DD
  places: { id:string; name:string; lat:number; lng:number; eta?: string; etd?: string }[]; // ordered
  metrics?: { distance_m?: number; duration_s?: number };
};

export type MLResponse = {
  ok: boolean;
  days: MLDayPlan[];
  version: 'v2'|'v1'|'local';
  error?: string;
};

const BASE = process.env.EXPO_PUBLIC_ML_API_BASE || 'https://goveling-ml.onrender.com/api';
const PRIMARY = process.env.EXPO_PUBLIC_ML_PRIMARY_VERSION || 'v2';
const FALLBACK = process.env.EXPO_PUBLIC_ML_FALLBACK_VERSION || 'v1';

async function callML(version:'v2'|'v1', payload: MLRequest): Promise<MLResponse> {
  const url = `${BASE}/${version}/itinerary/generate-hybrid`;
  const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
  const j = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(j?.error || `ML ${version} error`);
  // Normalize expected shape { days: [...] }
  if (!j?.days || !Array.isArray(j.days)) throw new Error('Malformed ML response');
  return { ok:true, days: j.days as MLDayPlan[], version: version };
}

// Local static generator (greedy by proximity per day)
export function getRouteConfigurations(req: MLRequest): MLResponse {
  const start = new Date(req.start_date);
  const end = new Date(req.end_date);
  const days: MLDayPlan[] = [];
  const pool = req.places.slice();

  const toISO = (d:Date)=> d.toISOString().slice(0,10);
  const hav = (a:LatLng,b:LatLng)=>{
    const R=6371000; const toRad=(x:number)=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat), dLon=toRad(b.lng-a.lng);
    const s=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
  };

  let cursor = new Date(start);
  while (cursor <= end){
    if (!pool.length){ days.push({ date: toISO(cursor), places: [] }); cursor = new Date(cursor.getTime()+86400000); continue; }
    // pick a seed (highest priority or first), then greedily add nearest until ~6 items
    const dayArr: MLPlace[] = [];
    pool.sort((a,b)=> (b.priority||0) - (a.priority||0));
    const seed = pool.shift()!; dayArr.push(seed);
    while (pool.length && dayArr.length < 6){
      // nearest to last
      const last = dayArr[dayArr.length-1];
      let bestIdx = -1, bestD = 1e18;
      for (let i=0;i<pool.length;i++){
        const d = hav(last, pool[i]);
        if (d < bestD){ bestD=d; bestIdx=i; }
      }
      dayArr.push(pool.splice(bestIdx,1)[0]);
    }
    days.push({ date: toISO(cursor), places: dayArr.map(p=> ({ id:p.id, name:p.name, lat:p.lat, lng:p.lng })) });
    cursor = new Date(cursor.getTime()+86400000);
  }

  return { ok:true, days, version: 'local' };
}

export async function generateHybridItineraryV2(req: MLRequest): Promise<MLResponse> {
  try{
    if (PRIMARY !== 'v2') throw new Error('skip v2');
    return await callML('v2', req);
  }catch(e:any){
    // fallback to V1
    try{
      if (FALLBACK !== 'v1') throw new Error('skip v1');
      return await callML('v1', req);
    }catch(e2:any){
      // local fallback
      return getRouteConfigurations(req);
    }
  }
}

export async function generateHybridItineraryV1(req: MLRequest): Promise<MLResponse> {
  try{
    return await callML('v1', req);
  }catch(e:any){
    return getRouteConfigurations(req);
  }
}
