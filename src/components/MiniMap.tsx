import React from 'react';
import { View } from 'react-native';
import MapLibreGL from 'react-native-maplibre-gl';
import { DEFAULT_STYLE_URL } from '~/lib/map';

type Props = { lat:number; lng:number; height?:number };

export default function MiniMap({ lat, lng, height=120 }: Props){
  const center:[number,number] = [lng, lat];
  return (
    <View style={{ height, borderRadius:10, overflow:'hidden', borderWidth:1, borderColor:'#eee' }}>
      <MapLibreGL.MapView style={{ flex:1 }} styleURL={DEFAULT_STYLE_URL}>
        <MapLibreGL.Camera zoomLevel={14} centerCoordinate={center} />
        <MapLibreGL.PointAnnotation id={`p-${lat}-${lng}`} coordinate={center} />
      </MapLibreGL.MapView>
    </View>
  );
}
