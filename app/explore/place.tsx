import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MapLibreGL from 'react-native-maplibre-gl';
import { DEFAULT_STYLE_URL } from '~/lib/map';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function PlaceSheet(){
  const { t } = useTranslation();

  const router = useRouter();
  const { id, name, lat, lng } = useLocalSearchParams<{ id:string; name:string; lat:string; lng:string }>();
  const center:[number,number]=[Number(lng), Number(lat)];
  return (
    <View style={{ flex:1, padding:12, gap:8 }}>
      <Text style={{ fontSize:22, fontWeight:'900' }}>{name}</Text>
      <View style={{ height:180, borderRadius:10, overflow:'hidden' }}>
        <MapLibreGL.MapView style={{ flex:1 }} styleURL={DEFAULT_STYLE_URL}>
          <MapLibreGL.Camera zoomLevel={14} centerCoordinate={center} />
          <MapLibreGL.PointAnnotation id={"p"} coordinate={center} />
        </MapLibreGL.MapView>
      
      <TouchableOpacity onPress={()=> router.push({ pathname:'/trips/directions', params:{ dlat: String(point?.lat), dlng: String(point?.lng) } })} style={{ backgroundColor:'#0ea5e9', paddi{t('auto.Cómo llegar')}:10 }}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>Cómo llegar</Text>
      </TouchableOpacity>

    </View>
      <TouchableOpacity onPress={()=> router.push({ pathname:'/explore/add-to-trip', params:{ place_id:id, name, lat, lng } }) } style={{ backgroundColor:'#34c759', padding:12, borderRadius{t('auto.Agregar a Trip')}tyle={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Agregar a Trip</Text>
      </TouchableOpacity>
          <View style={{ flexDirection:'row', gap:10 }}>
        <TouchableOpacity onPress={()=> router.push({ pathname:'/explore/reviews', params:{ place_id:id } }{t('auto.Ver reseñas')}g:10, borderWidth:1, borderColor:'#eee', borderRadius:8 }}><Text>Ver reseñas</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=> router.push({ pathname:'/explore/review-edit', params:{ place_id:id, place_name:name } }{t('auto.Escribir reseña')}, borderWidth:1, borderColor:'#eee', borderRadius:8 }}><Text>Escribir reseña</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// v148: CTA hacia /trips/directions con params dlat/dlng
// Ejemplo en tu JSX: onPress={()=> router.push({ pathname:'/trips/directions', params:{ dlat: String(point?.lat), dlng: String(point?.lng) } })}
