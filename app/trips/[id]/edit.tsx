import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function EditTrip(){
  const { t } = useTranslation();

  const { id } = useLocalSearchParams<{ id:string }>();
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [start, setStart] = React.useState<Date|null>(null);
  const [end, setEnd] = React.useState<Date|null>(null);

  const load = async ()=>{
    const { data } = await supabase.from('trips').select('name,start_date,end_date').eq('id', id).single();
    setName(data?.name || '');
    setStart(data?.start_date ? new Date(data.start_date) : new Date());
    setEnd(data?.end_date ? new Date(data.end_date) : new Date(Date.now()+86400000));
  };
  React.useEffect(()=>{ load(); }, [id]);

  const save = async ()=>{
    if (!name.trim()) return Alert.alert('Falta nombre');
    if (!start || !end || end < start) return Alert.alert('Rango de fechas inválido');
    const { error } = await supabase.from('trips').update({ name: name.trim(), start_date: start.toISOString().slice(0,10), end_date: end.toISOString().slice(0,10) }).eq('id', id);
    if (error) return Alert.alert('Error', error.message);
    router.back();
  };

  return (
    <View style={{ f{t('auto.Editar Trip')}gap:12 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>Editar Trip</Text>
      <TextInput placeholder="Nombre del viaje" value={name} onChangeText={setName} style{t('auto.Fecha inicio')}orderColor:'#ddd', padding:12, borderRadius:8 }} />
      <Text>Fecha inicio</Text>
      <DateTimePicker value={start||new Date()} mode="date" display={Platfo{t('auto.Fecha fin')}mpact':'default'} onChange={(e,d)=> d&&setStart(d)} />
      <Text>Fecha fin</Text>
      <DateTimePicker value={end||new Date()} mode="date" display={Platform.OS==='ios'?'compact':'default'} onChange={(e,d)=> d&&setEnd(d)} />
      <TouchableOpacity onPress={save} style={{ backgroundColor:'#007aff', paddingVertical:10, borderRadius{t('auto.Guardar')}<Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Guardar</Text>
      </TouchableOpacity>
    </View>
  );
}
