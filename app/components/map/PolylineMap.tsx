import { useTranslation } from 'react-i18next';

import React, { useRef, useEffect } from 'react';
import { View, Text } from 'react-native';

let MapboxGL:any = null;
try { MapboxGL = require('@rnmapbox/maps'); } catch(e){}

type Coord = { lat:number; lng:number };

function computeBounds(coords:Coord[]){
  if (!coords || !coords.length) return null;
  let minLat=coords[0].lat, maxLat=coords[0].lat, minLng=coords[0].lng, maxLng=coords[0].lng;
  for (const c of coords){
    if (c.lat<minLat) minLat=c.lat; if (c.lat>maxLat) maxLat=c.lat;
    if (c.lng<minLng) minLng=c.lng; if (c.lng>maxLng) maxLng=c.lng;
  }
  return { sw:[minLng, minLat] as [number,number], ne:[maxLng, maxLat] as [number,number] };
}

export default function PolylineMap({ coords, origin, dest, refitKey }:{ coords: Coord[]; origin?:Coord; dest?:Coord; refitKey?: any }){
  const height = 300;
  if (!MapboxGL){
    return (<View style={{ height, backgroundColor:'#eef2ff', borderRadius:12, alignItems:'center', justifyContent:{t('auto.Instala @rnmapbox/maps para visualizar la ruta.')}a @rnmapbox/maps para visualizar la ruta.</Text>
    </View>);
  }
  const line = coords?.map(c=> [c.lng, c.lat]) || [];
  const bounds = computeBounds([...(coords||[]), ...(origin?[origin]:[]), ...(dest?[dest]:[])]);
  const cameraRef = useRef<any>(null);

  useEffect(()=>{
    if (cameraRef.current && bounds){
      try {
        cameraRef.current.fitBounds(bounds.ne, bounds.sw, 50, 800);
      } catch {}
    }
  }, [JSON.stringify(bounds), refitKey]);

  return (
    <View style={{ height, borderRadius:12, overflow:'hidden' }}>
      <MapboxGL.MapView style={{ flex:1 }}>
        <MapboxGL.Camera ref={cameraRef} />
        {origin && <MapboxGL.PointAnnotation id="origin" coordinate={[origin.lng, origin.lat]} />}
        {dest && <MapboxGL.PointAnnotation id="dest" coordinate={[dest.lng, dest.lat]} />}
        {line.length>1 && (
          <MapboxGL.ShapeSource id="route" shape={{
            type:'Feature',
            geometry:{ type:'LineString', coordinates: line }
          }}>
            <MapboxGL.LineLayer id="routeLine" style={{ lineWidth: 4 }} />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
    </View>
  );
}
