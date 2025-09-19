import { useTranslation } from 'react-i18next';

import React from 'react';
import { View, Text, Button, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import PolylineMap from '../components/map/PolylineMap';

function stripHtml(html:string){
  return html?.replace(/<[^>]+>/g, '') || '';
}

async function fetchDirections(origin:{lat:number;lng:number}, dest:{lat:number;lng:number}, mode:'walking'|'driving'|'transit'|'bicycling'='walking'){
  const url = process.env.EXPO_PUBLIC_DIRECTIONS_API || '/functions/v1/directions';
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ origin, dest, mode }) });
  return await res.json();
}

export default function Directions(){
  const { t } = useTranslation();

  const { dlat, dlng } = useLocalSearchParams<{ dlat:string; dlng:string }>();
  const [mode, setMode] = React.useState<'walking'|'driving'|'transit'|'bicycling'>('walking');
  const [eta, setEta] = React.useState<number|null>(null);
  const [dist, setDist] = React.useState<number|null>(null);
  const [coords, setCoords] = React.useState<Array<{lat:number;lng:number}>>([]);
  const [steps, setSteps] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [origin, setOrigin] = React.useState<{lat:number;lng:number}|null>(null);
  const dest = { lat: Number(dlat), lng: Number(dlng) };

  React.useEffect(()=>{
    navigator.geolocation.getCurrentPosition(async ({coords})=>{
      setOrigin({ lat: coords.latitude, lng: coords.longitude });
    });
  }, []);

  React.useEffect(()=>{
    (async ()=>{
      if (!origin) return;
      setLoading(true);
      const j = await fetchDirections(origin, dest, mode);
      setEta(j?.duration_s ?? null);
      setDist(j?.distance_m ?? null);
      setCoords(j?.coords ?? []);
      setSteps(j?.steps ?? []);
      setLoading(false);
    })();
  }, [origin, dlat, dlng, mode]);

  return (
    {t('auto.Direcciones')}ing:16, gap:8, flex:1 }}>
      <Text style={{fontWeight:'800'}}>Direcciones</Text>
      <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
        {(['walking','driving','transit','bicycling'] as const).map(m => (
          <Button key={m} title={m} onPress={()=> set{t('auto.ETA: {eta ? Math.round(eta/60)+' min' : '—'} | Distancia: {dist ? Math.round(dist/1000)+' km' : '—'}')}ta/60)+' min' : '—'} | Distancia: {dist ? Math.round(dist/1000)+' km' : '—'}</Text>}
      <PolylineMap coords={coords} origin={or{t('auto.Pasos')}ed} dest={dest} />
      <Text style={{fontWeight:'700', marginTop:8}}>Pasos</Text>
      <FlatList
        data={steps}
        keyExtractor={(_,i)=> String(i)}
        renderItem={({item, index})=> (
          <View style={{ paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#eee' }}>
            <Text style={{fontWeight:'700'}}>{index+1}. {stripHtml(item.instruction||'')}</Text>
            <Text style={{ opacity:0.7 }}>~{Math.round((item.duration_s||0)/60)} min, {(item.distance_m||0)} m</Text>
          </View>
        )}
        style={{ flex:1 }}
      />
    </View>
  );
}
