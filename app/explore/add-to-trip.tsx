import { useTranslation } from 'react-i18next';
import { Sheet } from '../../src/components/ui/BottomSheet';
import React from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function AddToTripFromExplore(){
  const { t } = useTranslation();

  const router = useRouter();
  const { place_id, name, lat, lng } = useLocalSearchParams<{ place_id:string; name:string; lat:string; lng:string }>();

  const [trips, setTrips] = React.useState<any[]>([]);
  const [tripId, setTripId] = React.useState<string|undefined>(undefined);
  const [newTripName, setNewTripName] = React.useState('');
  const [tentativeDate, setTentativeDate] = React.useState<string>(''); // opcional, no requerida

  const load = async ()=>{
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const { data } = await supabase.from('trips').select('id,name,start_date,end_date').or(`owner_id.eq.${uid},trip_collaborators.user_id.eq.${uid}`).order('start_date', { ascending:true });
    setTrips(data||[]);
  };
  React.useEffect(()=>{ load(); }, []);

  const ensureTrip = async ()=>{
    if (tripId) return tripId;
    if (!newTripName.trim()) throw new Error('Ingresa nombre de viaje o elige uno existente');
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const { data, error } = await supabase.from('trips').insert({ name: newTripName.trim(), owner_id: uid }).select('id').single();
    if (error) throw error;
    return data.id;
  };

  const add = async ()=>{
    try{
      const tid = await ensureTrip();
      const row:any = { trip_id: tid, place_id, name, lat: Number(lat), lng: Number(lng) };
      if (tentativeDate) row.tentative_date = tentativeDate; // si existe la columna en tu esquema; si no, se ignora en inserción
      await supabase.from('trip_places').insert(row);
      Alert.alert('Agregado', 'Lugar agregado al trip');
      router.replace(`/trips/${tid}/route`);
    }catch(e:any){
      Alert.alert('Error', e.message||'No se pudo agregar');
    }
  };

  return (
    <View style={{ f{t('auto.Agregar a Trip')}:12 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>Agregar a Trip</Text>
      <Text style={{ {t('auto.Elige un viaje')}/Text>

      <Text style={{ marginTop:8, fontWeight:'700' }}>Elige un viaje</Text>
      <FlatList
        data={trips}
        keyExtractor={(i)=>i.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={()=>setTripId(item.id)} style={{ paddingVertical:10, borderBottomWidth:1, borderColor:'#f2f2f2' }}>
            <Text style={{ fontWeight:'700', color: tripId===item.id ? '#007aff':'#111' }}>{item.name}</Text>
            <Text style={{ opacity:0.6 }}>{item.start_date || '—'} → {item.end_date || '—'}</Text>
          </Tou{t('auto.No hay trips aún')}}
        ListEmptyComponent={<Text style={{ opacity:0.6 }}>No hay trips aún</Text>}
        style={t('auto.…o crea uno nuevo')} />

      <Text style={{ marginTop:8, fontWeight:'700' }}>…o crea uno nuevo</Text>
      <TextInput placeholder="Nombre del viaje" value={newTripName} onChangeText={setNewTripName} style={{ borderWidth:1, borderColor:'#ddd', padd{t('auto.Fecha tentativa (opcional, ML decidirá el día real)')}p:8, fontWeight:'700' }}>Fecha tentativa (opcional, ML decidirá el día real)</Text>
      <TextInput placeholder="YYYY-MM-DD (opcional)" value={tentativeDate} onChangeText={setTentativeDate} style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />

      <TouchableOpacity onPress={add} style={{ backgroundColor:'#007aff', paddingVertical:10, borderRadius:8, marginTop{t('auto.Guardar')}<Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Guardar</Text>
      </TouchableOpacity>
    </View>
  );
}

// v154: Usar <Sheet> en lugar de modal nativo. Ejemplo:
// return (<Sheet><YourAddToTripForm/></Sheet>);
