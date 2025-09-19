import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type Place = { id:string|number; name:string; lat:number; lng:number };

function haversine(a:Place, b:Place){
  const R = 6371000;
  const toRad = (d:number)=> d*Math.PI/180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const sa = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(sa), Math.sqrt(1-sa));
}

function totalDistance(path:Place[]){
  let d=0; for(let i=0;i<path.length-1;i++) d+=haversine(path[i], path[i+1]);
  return d;
}

function nearestNeighbor(points:Place[], startIndex=0){
  const used = new Set<number>();
  let order:number[] = [];
  let current = startIndex;
  order.push(current); used.add(current);
  for(let step=1; step<points.length; step++){
    let best=-1, bestD=1e18;
    for(let j=0;j<points.length;j++){
      if(used.has(j)) continue;
      const dist = haversine(points[current], points[j]);
      if(dist<bestD){ bestD=dist; best=j; }
    }
    order.push(best); used.add(best); current=best;
  }
  return order.map(i=>points[i]);
}

function twoOpt(path:Place[]){
  // one pass 2-opt light
  let best = path.slice();
  let bestD = totalDistance(best);
  for(let i=1;i<best.length-2;i++){
    for(let k=i+1;k<best.length-1;k++){
      const newPath = best.slice(0,i).concat(best.slice(i,k+1).reverse(), best.slice(k+1));
      const d = totalDistance(newPath);
      if (d < bestD){ best = newPath; bestD = d; }
    }
  }
  return best;
}

async function json(d:any, s=200){ return new Response(JSON.stringify(d), { status:s, headers:{ "Content-Type":"application/json" }}); }

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try{
    const { places, startIndex } = await req.json();
    if (!Array.isArray(places) || places.length < 2) return json({ ok:true, order: places||[] });
    const nn = nearestNeighbor(places, typeof startIndex==='number'?startIndex:0);
    const opt = twoOpt(nn);
    return json({ ok:true, order: opt });
  }catch(e){
    return json({ error: String(e) }, 500);
  }
});
