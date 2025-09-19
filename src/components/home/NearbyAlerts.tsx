import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, Switch, FlatList } from 'react-native';
import {MapView, Camera, PointAnnotation, ShapeSource, LineLayer, SymbolLayer, UserLocation} from '@maplibre/maplibre-react-native';
import { DEFAULT_STYLE_URL } from '~/lib/map';
import { useTravel } from '~/lib/travelStore';
import { getCurrentPosition, getTripPlaces, getSavedPlaces, haversine } from '~/lib/home';
import * as Notifications from 'expo-notifications';
import { supabase } from '~/lib/supabase';
import { sendPush } from '~/lib/push_send';

interface NearbyAlertsProps {
  tripId?: string;
}

const NearbyAlerts = React.memo(function NearbyAlerts({ tripId }: NearbyAlertsProps) {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useTravel();
  const [pos, setPos] = React.useState<{lat:number;lng:number}|null>(null);
  const [list, setList] = React.useState<any[]>([]);

  React.useEffect(()=>{
    (async()=>{
      const p = await getCurrentPosition();
      setPos(p);
    })();
  }, []);

  React.useEffect(()=>{
    (async()=>{
      if (!enabled) { setList([]); return; }
      let places:any[] = [];
      if (tripId){
        places = await getTripPlaces(tripId);
      } else {
        places = await getSavedPlaces();
      }
      if (pos){
        places = places.map(pl => ({ ...pl, distance_m: haversine(pos.lat, pos.lng, pl.lat, pl.lng) }))
                       .filter(pl => pl.lat && pl.lng && Math.abs(pl.lat)>0.001 && Math.abs(pl.lng)>0.001)
                       .sort((a,b)=>a.distance_m-b.distance_m)
                       .slice(0,20);
      }
      setList(places);
    })();
  }, [enabled, pos, tripId]);


  // Notify when closest place is under dynamic arrival radius (simple heuristic 60-150m)
  React.useEffect(()=>{
    if (!enabled || !pos || !list.length) return;
    const nearest = list[0];
    const r = Math.max(60, Math.min(150, Math.round((nearest.distance_m||200)/3)));
    if ((nearest.distance_m||1e9) <= r){
      Notifications.scheduleNotificationAsync({ content:{ title:'Estás cerca', body: `Llegando a ${nearest.name}` }, trigger: null });
      // Optional: notify collaborators (best‑effort)
      (async()=>{
        try{
          const { data: u } = await supabase.auth.getUser();
          const uid = u?.user?.id;
          if (!uid) return;
          // fetch collaborators for active trip if provided
          // NOTE: if you want this always, pass tripId a NearbyAlerts
          // We keep the call guarded
          // const { data: collabs } = await supabase.from('trip_collaborators').select('user_id').eq('trip_id', tripId||'null');
          // const ids = (collabs||[]).map((c:any)=>c.user_id).filter((x:string)=>x!==uid);
          const ids:string[] = [];
          if (ids.length) await sendPush(ids, 'Cerca de un lugar', `Tu compañero está llegando a ${nearest.name}`, { type:'nearby', place_id: nearest.place_id });
        }catch{}
      })();
    }
  }, [enabled, pos, list]);

  return (
    <View style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:14, gap:12 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text style={{ fontWeight:'800' }}>{t('Nearby Alerts')}</Text>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <Text style={{ opacity:0.7 }}>{enabled ? 'ON':'OFF'}</Text>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>
      </View>

      {enabled && (
        <>
          <View style={{ height:220, borderRadius:12, overflow:'hidden' }}>
            <MapView style={{ flex:1 }} styleURL={DEFAULT_STYLE_URL}>
              <Camera zoomLevel={13} centerCoordinate={pos ? [pos.lng, pos.lat] : [-70.6483, -33.4569]} />
              <UserLocation visible={true} />
              <ShapeSource id="nearby" shape={{
                type:'FeatureCollection',
                features: list.map((p, idx)=>({ type:'Feature', geometry:{ type:'Point', coordinates:[p.lng, p.lat] }, properties:{ idx: idx+1 } }))
              }}>
                <SymbolLayer id="nearby-symbol" style={{ textField:['to-string',['get','idx']], textSize:14, textColor:'#fff', textHaloColor:'#007aff', textHaloWidth:2, textAllowOverlap:true, iconImage:['literal','marker-15'] }} />
              </ShapeSource>
            </MapView>
          </View>

          <FlatList
            data={list}
            keyExtractor={(i)=>String(i.id||i.place_id)}
            renderItem={({ item, index }) => (
              <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#f2f2f2' }}>
                <Text style={{ fontWeight:'700' }}>{index+1}. {item.name}</Text>
                {typeof item.distance_m === 'number' ? <Text style={{ opacity:0.7 }}>{(item.distance_m/1000).toFixed(2)} km</Text> : null}
              </View>
            )}
          />
        </>
      )}
    </View>
  );
});

export default NearbyAlerts;
