import { useTranslation } from 'react-i18next';
import PolylineMap from '../../components/map/PolylineMap';
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, ScrollView, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {MapView, Camera, PointAnnotation, ShapeSource, LineLayer, SymbolLayer, UserLocation} from '@maplibre/maplibre-react-native';
import MiniMap from '~/components/MiniMap';
import { DEFAULT_STYLE_URL } from '~/lib/map';
import { supabase } from '~/lib/supabase';
import { useDirections, Step, fetchBestMode } from '~/lib/useDirections';
import { loadRouteCache, saveRouteCache } from '~/lib/routes';
import { generateHybridItineraryV2 } from '~/lib/aiRoutesService';

type Place = { id:string|number; name:string; lat:number; lng:number };

const MODES = ['walking','driving','bicycling','transit'] as const;
type Mode = typeof MODES[number];

function ModeBars({ summary }:{ summary?: Record<string, number> }){
  const total = Object.values(summary||{}).reduce((a,b)=>a+b,0) || 0;
  const modes:(keyof typeof summary)[] = ['walking','bicycling','driving','transit'] as any;

  return (
    <View style={{ gap:6 }}>
      {modes.map(m=> (
        <View key={String(m)} style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <View style={{ width:60 }}><Text>{String(m)}</Text></View>
          <View style={{ flex:1, height:8, backgroundColor:'#eee', borderRadius:4, overflow:'hidden' }}>
            <View style={{ width: `${total? ((summary?.[m]||0)/total*100):0}%`, height:8, backgroundColor: m==='walking'? '#34c759' : m==='bicycling'? '#16a085' : m==='driving'? '#007aff' : '#8e44ad' }} />
          </View>
          <Text style={{ width:40, textAlign:'right' }}>{summary?.[m]||0}</Text>
        </View>
      ))}
    </View>
  );
}

function fmtHM(s?:string){ return s||''; }

function ModeBars({ summary }:{ summary?: Record<string, number> }){
  const total = Object.values(summary||{}).reduce((a,b)=>a+b,0) || 0;
  const modes:(keyof typeof summary)[] = ['walking','bicycling','driving','transit'] as any;

  return (
    <View style={{ gap:6 }}>
      {modes.map(m=> (
        <View key={String(m)} style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <View style={{ width:60 }}><Text>{String(m)}</Text></View>
          <View style={{ flex:1, height:8, backgroundColor:'#eee', borderRadius:4, overflow:'hidden' }}>
            <View style={{ width: `${total? ((summary?.[m]||0)/total*100):0}%`, height:8, backgroundColor: m==='walking'? '#34c759' : m==='bicycling'? '#16a085' : m==='driving'? '#007aff' : '#8e44ad' }} />
          </View>
          <Text style={{ width:40, textAlign:'right' }}>{summary?.[m]||0}</Text>
  // Day selection
  const [day, setDay] = React.useState<Date>(new Date()); // defaults to today; could be trip start by fetching metadata
  const dayISO = React.useMemo(()=> day.toISOString().slice(0,10), [day]);

  // Full-day state
  const [buildingAll, setBuildingAll] = React.useState(false);
  const [allResults, setAllResults] = React.useState<{ pair:[Place,Place], result:any, segMode:'walking'|'driving'|'bicycling'|'transit' }[] | null>(null);

  const [routeCoords, setRouteCoords] = React.useState<Array<{lat:number;lng:number}>>([]);
  const [refitKey, setRefitKey] = React.useState(0);

  const pair = React.useMemo(()=>{
    if (places.length < 2) return null;
    const i = Math.min(pairIdx, places.length-2);
    return { a: places[i], b: places[i+1] };
  }, [places, pairIdx]);

  const load = async ()=>{
    const { data } = await supabase.from('trip_places').select('id, name, lat, lng, created_at').eq('trip_id', id).order('created_at', { ascending:true });
    const p = (data||[]).filter((x:any)=> x.lat && x.lng && Math.abs(x.lat)>0.001 && Math.abs(x.lng)>0.001);
    setPlaces(p as any);

    // Try load cache for the selected day
    const cachedDay = await loadRouteCache(id!, dayISO);
    if (cachedDay?.places?.length){
      // Reorder according to cache if ids match
      const order = cachedDay.places.map((pl:any)=> p.find((x:any)=> String(x.id)===String(pl.id))).filter(Boolean);
      if (order.length >= 2) setPlaces(order as any);
    }
  };
  React.useEffect(()=>{ load(); }, [id, dayISO]);

  React.useEffect(()=>{
    if (!pair) return;
    const departure_time = mode==='transit' ? Math.floor(Date.now()/1000) : undefined;
    fetchDirections({ lat: pair.a.lat, lng: pair.a.lng }, { lat: pair.b.lat, lng: pair.b.lng }, mode, departure_time);
  }, [pairIdx, mode, pair]);

  const totalDistance = (steps:Step[]) => steps.reduce((s,x)=> s + (x.distance_m||0), 0);
  const totalDuration = (steps:Step[]) => steps.reduce((s,x)=> s + (x.duration_s||0), 0);

  const fmtKm = (m?:number)=> typeof m==='number' ? (m/1000).toFixed(2)+' km' : '—';
  const fmtMin = (s?:number)=> typeof s==='number' ? Math.round(s/60)+' min' : '—';

  // Build full day directions for all consecutive pairs
  const buildAll = async ()=>{
    if (places.length < 2) return Alert.alert('Agrega al menos 2 lugares');
    setBuildingAll(true);
    const currentSummaryModes: Record<string, number> = {};
    try{
      const out: { pair:[Place,Place], result:any, segMode:'walking'|'driving'|'bicycling'|'transit' }[] = [];
      for (let i=0;i<places.length-1;i++){
        const a = places[i], b = places[i+1];
        const best = await fetchBestMode({ lat:a.lat, lng:a.lng }, { lat:b.lat, lng:b.lng }, ['transit','walking','bicycling','driving']);
        out.push({ pair:[a,b], result: best.result, segMode: best.mode });
        currentSummaryModes[best.mode] = (currentSummaryModes[best.mode]||0)+1;
      }
      setAllResults(out);
      setSummaryModes(currentSummaryModes);
      // persist histogram in route_cache.summary
      try{ await saveRouteCache(id!, dayISO, places, { ...(cached?.summary||{}), modes: currentSummaryModes, version: (cached?.summary?.version)||'segments' }); }catch{}
    }catch(e:any){
      Alert.alert('Error', e.message||'Error al calcular la ruta completa');
    }finally{
      setBuildingAll(false);
    }
  };

  // Save order to route_cache for the selected day
  const saveDay = async ()=>{
    try{
      const payload = places.map(p=> ({ id:p.id, name:p.name, lat:p.lat, lng:p.lng }));
      await saveRouteCache(id!, dayISO, payload, null);
      Alert.alert('Guardado', 'Ruta del día guardada');
    }catch(e:any){
      Alert.alert('Error', e.message||'No se pudo guardar');
    }
  };

  // Combined metrics/polylines
  const overviewCoordinates = React.useMemo(()=>{
    if (!allResults) return null;
    const coords: number[][] = [];
    allResults.forEach(seg => {
      (seg.result?.overview_polyline || []).forEach((pt:number[]) => coords.push(pt));
    });
    return coords.length ? coords : null;
  }, [allResults]);

  const modeColor: Record<string,string> = { walking:'#34c759', bicycling:'#16a085', driving:'#007aff', transit:'#8e44ad' };

  const totals = React.useMemo(()=>{
    if (!allResults) return { dist: 0, dur: 0 };
    let dist=0, dur=0;
    allResults.forEach(seg => { dist += seg.result?.distance_m||0; dur += seg.result?.duration_s||0; });
    return { dist, dur };
  }, [allResults]);

  // Center camera
  const center = (()=>{
    if (places.length >= 2){
      const a = places[0], b = places[places.length-1];
      return [ (a.lng+b.lng)/2, (a.lat+b.lat)/2 ];
    }
    return [-70.6483, -33.4569];
  })();

  return (
    <View style={{ flex:1, padding:8 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>{t('AI Smart Route')}</Text>

      {/* Day picker */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginTop:4 }}>
        <Text style={{ fontWeight:'700' }}>Día</Text>
        <DateTimePicker value={day} mode="date" display={Platform.OS==='ios'?'compact':'default'} onChange={(e,d)=> d && setDay(d)} />
        <TouchableOpacity onPress={saveDay} style={{ marginLeft:'auto', paddingHorizontal:12, paddingVertical:6, borderRadius:8, backgroundColor:'#007aff' }}>
          <Text style={{ color:'#fff', fontWeight:'800' }}>{t('Guardar día')}</Text>
        </TouchableOpacity>
      </View>

      {/* Mode selector */}
      <View style={{ flexDirection:'row', gap:8, marginVertical:6, flexWrap:'wrap' }}>
        {MODES.map(m => (
          <TouchableOpacity key={m} onPress={()=>setMode(m)} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor: mode===m ? '#007aff':'#ddd', backgroundColor: mode===m ? '#e8f0fe':'#fff' }}>
            <Text>{m}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={buildAll} disabled={buildingAll} style={{ backgroundColor:'#007aff', paddingHorizontal:12, paddingVertical:6, borderRadius:8 }}>
          <Text style={{ color:'#fff', fontWeight:'800' }}>{buildingAll ? 'Calculando…' : 'Ruta completa'}</Text>
        </TouchableOpacity>

        {/* Planificar con IA (ML externa con doble fallback) */}
        <TouchableOpacity onPress={async ()=>{
          try{
            // Collect trip metadata
            const { data: trip } = await supabase.from('trips').select('id, start_date, end_date').eq('id', id).single();
            const { data: acc } = await supabase.from('accommodations').select('lat, lng, name').eq('trip_id', id);
            const { data: rawPlaces } = await supabase.from('trip_places').select('place_id, name, lat, lng, priority').eq('trip_id', id);

            const req = {
              trip_id: id,
              start_date: trip?.start_date || dayISO,
              end_date: trip?.end_date || dayISO,
              mode: (mode as any),
              daily_window: { start: '09:00', end: '18:00' },
              accommodations: (acc||[]).filter((a:any)=> a?.lat && a?.lng),
              places: (rawPlaces||[]).filter((p:any)=> p.lat && p.lng).map((p:any)=> ({
                id: String(p.place_id || p.id), name: p.name, lat: p.lat, lng: p.lng, priority: p.priority || 0
              }))
            };

            const ml = await generateHybridItineraryV2(req as any);
            if (!ml?.ok || !ml.days?.length) throw new Error(ml?.error || 'ML no devolvió plan');

            // Persist each day's order in route_cache
            for (const dayPlan of ml.days){
              const ordered = dayPlan.places.map(p=> ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, eta: p.eta, etd: p.etd, type: p.type||'place', note: p.note }));
              await saveRouteCache(id!, dayPlan.date, ordered, { metrics: dayPlan.metrics, version: ml.version });
            }

            Alert.alert('Itinerario listo', `Se planificó con IA (${ml.version}). Abre el día para ver la ruta.`);
            // Update UI to current day if it exists in plan
            const todayPlan = ml.days.find(d => d.date === dayISO);
            if (todayPlan){
              setPlaces(todayPlan.places as any);
              setAllResults(null); // reset full-day results to rebuild con Directions si quieres
            }
          }catch(e:any){
            Alert.alert('Error', e.message||'No se pudo planificar con IA');
          }
        }} style={{ backgroundColor:'#8e44ad', paddingHorizontal:12, paddingVertical:6, borderRadius:8 }}>
          <Text style={{ color:'#fff', fontWeight:'800' }}>{t('Planificar con IA')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={buildAll} style={{ backgroundColor:'#007aff', paddingHorizontal:12, paddingVertical:6, borderRadius:8 }}>
          <Text style={{ color:'#fff', fontWeight:'800' }}>{buildingAll ? 'Calculando…' : 'Ruta completa'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>router.push(`/trips/${id}/live`)} style={{ marginLeft:'auto', backgroundColor:'#34c759', paddingHorizontal:12, paddingVertical:6, borderRadius:8 }}>
          <Text style={{ color:'#fff', fontWeight:'800' }}>{t('Iniciar Travel Mode')}</Text>
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <View style={{ flexDirection:'row', gap:8 }}>
          {places.slice(0, Math.max(0, places.length-1)).map((p, i) => (
            <TouchableOpacity key={String(i)} onPress={()=>setPairIdx(i)} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:12, borderWidth:1, borderColor: pairIdx===i ? '#007aff':'#ddd' }}>
              <Text>{i+1}→{i+2}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <Text style={{ fontWeight:'700' }}>{t('Mostrar minimapas')}</Text>
          <TouchableOpacity onPress={()=>setShowMiniMaps(v=>!v)} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor: showMiniMaps ? '#34c759':'#ddd', backgroundColor: showMiniMaps ? '#e7f9ee':'#fff' }}>
            <Text>{showMiniMaps ? 'ON':'OFF'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection:'row', gap:8 }}>
        {(['itinerary','map','analytics'] as const).map(t => (
          <TouchableOpacity key={t} onPress={()=>setTab(t)} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor: tab===t ? '#007aff':'#ddd' }}>
            <Text>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(loading || buildingAll) && <View style={{ paddingVertical:16, alignItems:'center' }}><ActivityIndicator/></View>}
      {error && <Text style={{ color:'#ff3b30' }}>{t('auto.Agrega al menos 2 lugares al trip.')}</Text>}
      <Text style={{ opacity:0.7, marginTop:8 }}>Agrega al menos 2 lugares al trip.</Text>

      {tab==='itinerary' && (
        (()=>{
          // If route_cache has structured places (with blocks and eta/etd), prefer that
          const structured = places && places.length && (places[0] as any).type !== undefined;
          if (structured){
            return (
              <FlatList
                style={{ marginTop:8 }}
                data={places as any}
                keyExtractor={(_,i)=>String(i)}
                renderItem={({ item, index }) => (
                  item.type==='free_block' ? (
                    <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#f2f2f2', backgroundColor:'#f8f8fb' }}>
                      <Text style={{ fontWeight:'700' }}>🕒 Free time</Text>
                      <Text style={{ opacity:0.7 }}>{fmtHM(item.eta)}–{fmtHM(item.etd)} {item.note? '• '+item.note : ''}</Text>
                    </View>
                  ) : item.type==='transfer_block' ? (
                    <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#f2f2f2', backgroundColor:'#f8f8fe' }}>
                      <Text style={{ fontWeight:'700' }}>↔︎ Transfer</Text>
                      <Text style={{ opacity:0.7 }}>{fmtHM(item.eta)}–{fmtHM(item.etd)} {item.note? '• '+item.note : ''}</Text>
                    </View>
                  ) : (
                    <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#f2f2f2', gap:6 }}>
                      <Text style={{ fontWeight:'700' }}>{index+1}. {item.name}</Text>
                      <Text style={{ opacity:0.7 }}>{fmtHM(item.eta)}–{fmtHM(item.etd)}</Text>
                      {showMiniMaps && typeof item.lat==='number' && typeof item.lng==='number' && (
                        <MiniMap lat={item.lat} lng={item.lng} />
                      )}
                    </View>
                  )
                )}
                ListEmptyComponent={<View style={{ paddingVertical:6 }}><Text style={{ opacity:0.7 }}>Plan (ML)</Text></View>}
              />
            );
          }
          // Fallback to Directions (single pair) or full-day segments
          return (
            allResults ? (
              <FlatList
                style={{ marginTop:8 }}
                data={allResults}
                keyExtractor={(_,i)=>String(i)}
                renderItem={({ item, index }) => (
                  <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#f2f2f2' }}>
                    <Text style={{ fontWeight:'700' }}>{index+1}. {item.pair[0].name} → {item.pair[1].name}</Text>
                    <Text style={{ opacity:0.7 }}>{(item.result?.summary || '').toString()} • {Math.round((item.result?.duration_s||0)/60)} min • {((item.result?.distance_m||0)/1000).toFixed(2)} km</Text>
                    <View style={{ marginTop:6 }}>
                      {(item.result?.steps||[]).map((step:any, si:number)=> (
                        <View key={si} style={{ marginBottom:6 }}>
                          <Text style={{ fontWeight:'600' }}>{step.transit?.line?.short_name ? `[${step.transit.line.short_name}] `:''}{step.transit?.line?.name || (step.travel_mode||'')}</Text>
                          {step.transit ? (
                            <Text>{step.transit.departure_stop} → {step.transit.arrival_stop} • {step.transit.num_stops||0} stops • {step.transit.headsign||''} ({step.transit?.line?.agency||''})</Text>
                          ) : (
                            <Text numberOfLines={3}>{(step.instruction||'').replace(/<[^>]+>/g,'')}</Text>
                          )}
                          <Text style={{ opacity:0.7 }}>{Math.round((step.duration_s||0)/60)} min • {((step.distance_m||0)/1000).toFixed(2)} km</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                ListFooterComponent={() => (
                  <View style={{ padding:12 }}>
                    <Text style={{ opacity:0.7 }}>Resumen del día {dayISO}: {Math.round(totals.dur/60)} min • {(totals.dist/1000).toFixed(2)} km</Text>
                  </View>
                )}
              />
            ) : (
              result && (
                <FlatList
                  style={{ marginTop:8 }}
                  data={result.steps}
                  keyExtractor={(_,i)=>String(i)}
                  renderItem={({ item, index }) => (
                    <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#f2f2f2' }}>
                      <Text style={{ fontWeight:'700' }}>{index+1}. {item.transit?.line?.short_name ? `[${item.transit.line.short_name}] `: ''}{item.transit?.line?.name || (item.travel_mode || '')}</Text>
                      {item.transit ? (
                        <Text>{item.transit.departure_stop} → {item.transit.arrival_stop} • {item.transit.num_stops||0} stops • {item.transit.headsign||''} ({item.transit?.line?.agency||''})</Text>
                      ) : (
                        <Text numberOfLines={3}>{item.instruction?.replace(/<[^>]+>/g,'')||''}</Text>
                      )}
                      <Text style={{ opacity:0.7 }}>{((item.distance_m||0)/1000).toFixed(2)} km • {Math.round((item.duration_s||0)/60)} min</Text>
                    </View>
                  )}
                  ListHeaderComponent={<View style={{ paddingVertical:6 }}><Text style={{ opacity:0.7 }}>{(result.summary? ' — '+result.summary : '')}</Text></View>}
                />
              )
            )
          );
        })()
      )}

      {tab==='map' && (
        <View style={{ height:360, borderRadius:12, overflow:'hidden', marginTop:8 }}>
          <MapLibreGL.MapView style={{ flex:1 }} styleURL={DEFAULT_STYLE_URL}>
            <MapLibreGL.Camera zoomLevel={12} centerCoordinate={center} />
            {/* markers for all places */}
            {places.map((p,i)=>(<MapLibreGL.PointAnnotation key={String(p.id)} id={String(p.id)} coordinate={[p.lng, p.lat]} />))}
            {/* full-day polyline */}
            {allResults && allResults.map((seg, i)=> (
              seg.result?.overview_polyline ? (
                <MapLibreGL.ShapeSource key={`seg-${i}`} id={`route-seg-${i}`} shape={{ type:'Feature', geometry:{ type:'LineString', coordinates: seg.result.overview_polyline } }}>
                  <MapLibreGL.LineLayer id={`route-seg-line-${i}`} style={{ lineWidth:4, lineColor: modeColor[seg.segMode]||'#333' }} />
                </MapLibreGL.ShapeSource>
              ) : null
            ))}
            {/* fallback single pair polyline */}
            {!overviewCoordinates && (result?.overview_polyline) && (
              <MapLibreGL.ShapeSource id="route" shape={{ type:'Feature', geometry:{ type:'LineString', coordinates: result.overview_polyline } }}>
                <MapLibreGL.LineLayer id="route-line" style={{ lineWidth:4 }} />
              </MapLibreGL.ShapeSource>
            )}
          
            {/* Legend */}
            <View style={{ position:'absolute', right:10, top:10, backgroundColor:'rgba(255,255,255,0.9)', borderRadius:8, padding:8, gap:4 }}>
              {(['walking','bicycling','driving','transit'] as const).map(m => (
                <View key={m} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                  <View style={{ width:14, height:4, backgroundColor: modeColor[m] }} />
                  <Text style={{ fontSize:12 }}>{m}</Text>
                </View>
              ))}
            </View>

          </MapLibreGL.MapView>
        </View>
      )}

      {tab==='analytics' && (
        allResults ? (
          <View style={{ marginTop:8 }}>
            <Text style={{ fontWeight:'700' }}>{t('auto.Resumen día')} {dayISO}</Text>
            <Text>{t('auto.Distancia total')}: {(totals.dist/1000).toFixed(2)} km</Text>
            <Text>{t('auto.Duración total')}: {Math.round(totals.dur/60)} min</Text>
            <Text style={{ fontWeight:'700', marginTop:8 }}>{t('auto.Segmentos')}</Text>
            <FlatList
              data={allResults}
              keyExtractor={(_,i)=>String(i)}
              renderItem={({ item, index }) => (
                <View style={{ paddingVertical:6, borderBottomWidth:1, borderColor:'#f2f2f2' }}>
                  <Text>{index+1}. {item.pair[0].name} → {item.pair[1].name}</Text>
                  <Text style={{ opacity:0.7 }}>{Math.round((item.result?.duration_s||0)/60)} min • {((item.result?.distance_m||0)/1000).toFixed(2)} km</Text>
                </View>
              )}
            />
          </View>
        ) : (
          result && (
            <View style={{ marginTop:8 }}>
              <Text style={{ fontWeight:'700' }}>{t('auto.Resumen tramo')} {pairIdx+1}</Text>
              <Text>{t('auto.Distancia')}: {((result.distance_m||0)/1000).toFixed(2)} km</Text>
              <Text>{t('auto.Duración')}: {Math.round((result.duration_s||0)/60)} min</Text>
            </View>
          )
        )
      )}
    </View>
  );
}
