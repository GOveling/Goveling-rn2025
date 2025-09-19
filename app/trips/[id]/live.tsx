import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { sendPush } from '~/lib/push_send';
import {MapView, Camera, PointAnnotation, ShapeSource, LineLayer, SymbolLayer, UserLocation} from '@maplibre/maplibre-react-native';
import { DEFAULT_STYLE_URL } from '~/lib/map';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { loadRouteCache } from '~/lib/routes';
import { useDirections, fetchBestMode } from '~/lib/useDirections';
import { haversine } from '~/lib/home';

type Place = { id:string|number; name:string; lat:number; lng:number };

function parseHM(dayISO:string, hm?:string){
  if (!hm) return null;
  const dt = new Date(dayISO + 'T' + hm + ':00');
  return dt;
}


function dynamicRadius(speed_mps:number|null, place?:Place){
  // Base radius 80 m; expand if moving rápido (auto) o grandes POIs
  let r = 80;
  if (speed_mps!=null){
    if (speed_mps < 1.5) r = 70;           // caminando
    else if (speed_mps < 6) r = 90;        // bici / scooter
    else if (speed_mps < 15) r = 110;      // auto lento / ciudad
    else r = 140;                          // vía rápida
  }
  // Si el lugar es potencialmente grande (si tuvieses metadata), podrías aumentar r (+30m)
  return r;
}
function bearingBetween(lat1:number, lon1:number, lat2:number, lon2:number){
  const toRad = (d:number)=> d*Math.PI/180;
  const y = Math.sin(toRad(lon2-lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
  const brng = Math.atan2(y, x) * 180/Math.PI;
  return (brng + 360) % 360;
}
function headingAligned(userHeading:number|null, toBearing:number){
  if (userHeading==null) return true; // si no hay heading, no bloquea
  let diff = Math.abs(userHeading - toBearing);
  diff = diff>180 ? 360-diff : diff;
  return diff <= 60; // dentro de un cono de 60° hacia el destino
}


function withinArrival(distance_m:number){
  // Arrival radius heuristic: 50–120m
  return distance_m <= 100;
}

export default function TravelGuided(){
  const { t } = useTranslation();

  const { id } = useLocalSearchParams<{ id:string }>(); // trip id
  const [dayISO, setDayISO] = React.useState<string>(new Date().toISOString().slice(0,10));
  const [order, setOrder] = React.useState<Place[]>([]);
  const [pos, setPos] = React.useState<{lat:number;lng:number}|null>(null);
  const [targetIdx, setTargetIdx] = React.useState<number>(0);
  const { result, fetchDirections } = useDirections();
  const [arrived, setArrived] = React.useState<boolean>(false);
  const [segMode, setSegMode] = React.useState<'walking'|'driving'|'bicycling'|'transit'>('walking');
  const [autoNext, setAutoNext] = React.useState<boolean>(true);
  const [respectSchedule, setRespectSchedule] = React.useState<boolean>(true);
  const [autoSkip, setAutoSkip] = React.useState<boolean>(true);
  const [heading, setHeading] = React.useState<number|null>(null);

  // Load order from route_cache
  React.useEffect(()=>{
    (async()=>{
      const cached = await loadRouteCache(id!, dayISO);
      let arr = Array.isArray(cached?.places) ? cached.places : [];
      // keep only 'place' items (ignore free/transfer blocks)
      arr = arr.filter((p:any)=> (p.type||'place')==='place');
      // filter already visited today
      const { data: visits } = await supabase.from('trip_place_visits').select('place_id, visited_at').eq('trip_id', id);
      const visitedSet = new Set((visits||[]).map((v:any)=> String(v.place_id)));
      const pending = arr.filter((p:any)=> !visitedSet.has(String(p.id)) );
      setOrder(pending);
      setTargetIdx(0);
    })();
  }, [id, dayISO]);

  // Track position
  React.useEffect(()=>{
    (async()=>{
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 5 }, (loc)=>{
        setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      });

      // heading (brújula)
      try{
        Location.watchHeadingAsync((h)=>{
          if (typeof h?.trueHeading === 'number' && !Number.isNaN(h.trueHeading)){
            setHeading(h.trueHeading);
          }
        });
      }catch{}

    })();
  }, []);

  // If respecting schedule and current target has ETA/ETD windows, we can skip/hold
  React.useEffect(()=>{
    if (!order[targetIdx]) return;
    if (!respectSchedule) return;
    const tgt:any = order[targetIdx];
    const eta = parseHM(dayISO, tgt.eta);
    const etd = parseHM(dayISO, tgt.etd);
    const now = new Date();
    if (eta && now < eta){
      // too early
      if (autoSkip){
        setTargetIdx(i => Math.min(i+1, Math.max(0, order.length-1)));
      }
    } else if (etd && now > etd){
      // too late: also skip forward
      if (autoSkip){
        setTargetIdx(i => Math.min(i+1, Math.max(0, order.length-1)));
      }
    }
  }, [order, targetIdx, respectSchedule, autoSkip, dayISO]);


  // Fetch directions to current target (auto‑modo por tramo)
  React.useEffect(()=>{
    (async()=>{
      if (!pos || !order[targetIdx]) return;
      try{
        const best = await fetchBestMode({ lat: pos.lat, lng: pos.lng }, { lat: order[targetIdx].lat, lng: order[targetIdx].lng }, ['transit','walking','bicycling','driving']);
        setSegMode(best.mode);
        // also set result via local state path: we'll just call fetchDirections for consistency
        await fetchDirections({ lat: pos.lat, lng: pos.lng }, { lat: order[targetIdx].lat, lng: order[targetIdx].lng }, best.mode, best.mode==='transit'? Math.floor(Date.now()/1000): undefined);
      }catch(e){ /* ignore */ }
    })();
  }, [pos, order, targetIdx]);

  // Arrival detection (radio dinámico + orientación)
  React.useEffect(()=>{
    if (!pos || !order[targetIdx]) return;
    const tgt = order[targetIdx];
    const d = haversine(pos.lat, pos.lng, tgt.lat, tgt.lng);
    const br = bearingBetween(pos.lat, pos.lng, tgt.lat, tgt.lng);
    const r = dynamicRadius((pos as any)?.speed ?? null, tgt);
    if (d <= r && headingAligned(heading, br)){
      setArrived(true);
    } else {
      setArrived(false);
    }
  }, [pos, order, targetIdx, heading]);

  const confirmArrival = async ()=>{
    const p = order[targetIdx];
    // Mark visit
    await supabase.from('trip_place_visits').insert({ trip_id: id, place_id: String(p.id), lat: p.lat, lng: p.lng, source:'travel_mode' });

    // Notify collaborators
    try{
      const { data: collabs } = await supabase.from('trip_collaborators').select('user_id').eq('trip_id', id);
      const { data: u } = await supabase.auth.getUser();
      const me = u?.user?.id;
      const ids = (collabs||[]).map((c:any)=>c.user_id).filter((x:string)=> x && x!==me);
      if (ids.length){
        await sendPush(ids, 'Lugar visitado', `Tu compañero llegó a ${p.name}`, { type:'arrival', trip_id: id, place_id: String(p.id) });
      }
    }catch{}

    // Remove from pending
    const pending = order.slice(); pending.splice(targetIdx, 1);
    setOrder(pending);
    setArrived(false);
    if (autoNext){
      // Mantiene el índice actual (ahora apunta al siguiente) si existe
      setTargetIdx((prev)=> Math.min(prev, Math.max(0, pending.length-1)));
    } else {
      // Volver al inicio de la lista
      setTargetIdx(0);
    }
    Alert.alert('Marcado como visitado', `${p.name} visitado`);
  };

  const next = ()=>{
    setTargetIdx(i => Math.min(i+1, Math.max(0, order.length-1)));
  };
  const prev = ()=>{
    setTargetIdx(i => Math.max(i-1, 0));
  };

  const modeColor: Record<string,string> = { walking:'#34c759', bicycling:'#16a085', driving:'#007aff', transit:'#8e44ad' };
  const target = order[targetIdx];
  const center = pos ? [pos.lng, pos.lat] : (target ? [target.lng, target.lat] : [-70.6483, -33.4569]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize:20, fontWeight:'800' }}>Travel Mode (Guiado)</Text>
      <Text style={{ opacity:0.7 }}>{dayISO}</Text>


      {/* Schedule banner */}
      {target && respectSchedule && (()=>{
        const eta = (target as any).eta; const etd = (target as any).etd;
        if (!eta && !etd) return null;
        const now = new Date();
        const etaDt = parseHM(dayISO, eta); const etdDt = parseHM(dayISO, etd);
        const tooEarly = etaDt && now < etaDt; const tooLate = etdDt && now > etdDt;
        if (tooEarly) return (<View style={{ padding:10, backgroundColor:'#fff3cd' }}><Text>{t(`auto.⏳ Demasiado pronto para este lugar (ETA ${eta}). ${autoSkip? 'Saltando al siguiente…':'Puedes saltar manualmente.'}`)}</Text></View>);
        if (tooLate) return (<View style={{ padding:10, backgroundColor:'#f8d7da' }}><Text>{t(`auto.⏰ Ya pasó la ventana sugerida (ETD ${etd}). ${autoSkip? 'Saltando al siguiente…':'Puedes saltar manualmente.'}`)}</Text></View>);
        return (<View style={{ padding:10, backgroundColor:'#d4edda' }}><Text>{t(`auto.✅ Dentro de la ventana sugerida ${eta? 'desde '+eta:''}${etd? ' hasta '+etd:''}.`)}</Text></View>);
      })()}


      {target ? (
        <View style={{ marginTop:8 }}>
          <Text style={{ fontWeight:'700' }}>{t('auto.Siguiente destino:')}</Text>
          <Text>{target.name}</Text>
        </View>
      ) : (
        <Text style={{ marginTop:8, opacity:0.7 }}>{t('auto.No hay destinos pendientes hoy 🎉')}</Text>
      )}


      {/* Auto-siguiente toggle */}
      <View style={{ flexDirection:'row', alignItems:'center', marginTop:8 }}>
        <Text style={{ fontWeight:'700' }}>{t('auto.Auto‑siguiente')}</Text>
        <TouchableOpacity onPress={()=>setAutoNext(v=>!v)} style={{ marginLeft:8, paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor: autoNext ? '#34c759':'#ddd', backgroundColor: autoNext ? '#e7f9ee':'#fff' }}>
          <Text>{autoNext ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>


      <View style={{ height:320, borderRadius:12, overflow:'hidden', marginTop:8 }}>
        <MapView style={{ flex:1 }} styleURL={DEFAULT_STYLE_URL}>
          <Camera zoomLevel={13} centerCoordinate={center} />
          <UserLocation visible={true} />
          {pos && <PointAnnotation id="pos" coordinate={[pos.lng, pos.lat]} />}
          {target && <PointAnnotation id="tgt" coordinate={[target.lng, target.lat]} />}
          {result?.overview_polyline && (
            <ShapeSource id="route" shape={{ type:'Feature', geometry:{ type:'LineString', coordinates: result.overview_polyline } }}>
              <LineLayer id="route-line" style={{ lineWidth:4, lineColor: modeColor[segMode]||'#333' }} />
            </ShapeSource>
          )}
        </MapView>
      </View>

      <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
        <TouchableOpacity onPress={prev} style={{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, borderWidth:1, borderColor:'#ddd' }}><Text>{t('auto.◀︎ Anterior')}</Text></TouchableOpacity>
        <TouchableOpacity onPress={next} style={{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, borderWidth:1, borderColor:'#ddd' }}><Text>{t('auto.Siguiente ▶︎')}</Text></TouchableOpacity>
        {arrived && <TouchableOpacity onPress={confirmArrival} style={{ marginLeft:'auto', backgroundColor:'#34c759', paddingHorizontal:12, paddingVertical:8, borderRadius:8 }}><Text style={{ color:'#fff', fontWeight:'800' }}>{t('auto.Marcar visitado')}</Text></TouchableOpacity>}
      </View>

      <View style={{ marginTop:12 }}>
        <Text style={{ fontWeight:'700' }}>{t('auto.Pasos')}</Text>
        {(result?.steps||[]).map((s, i)=>(
          <View key={i} style={{ paddingVertical:6, borderBottomWidth:1, borderColor:'#f2f2f2' }}>
            <Text style={{ fontWeight:'600' }}>{s.transit?.line?.short_name ? `[${s.transit.line.short_name}] `:''}{s.transit?.line?.name || (s.travel_mode||'').replace(/[A-Z]/g,\' $&').trim()}</Text>
            <Text numberOfLines={3}>{(s.instruction||'').replace(/<[^>]+>/g,'')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
