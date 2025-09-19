import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function NewTrip(){
  const { t } = useTranslation();

  const router = useRouter();
  const [name, setName] = React.useState('');
  const [start, setStart] = React.useState<Date|null>(new Date());
  const [end, setEnd] = React.useState<Date|null>(new Date(Date.now()+86400000));
  const [tz, setTz] = React.useState<string>('UTC');

  const save = async ()=>{
    if (!name.trim()) return Alert.alert('Falta nombre');
    if (!start || !end || end < start) return Alert.alert('Rango de fechas inválido');
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const { data, error } = await supabase.from('trips').insert({ name: name.trim(), owner_id: uid, start_date: start.toISOString().slice(0,10), end_date: end.toISOString().slice(0,10) }).select('id').single();
    if (error) return Alert.alert('Error', error.message);
    await supabase.from('trip_settings').upsert({ trip_id: data.id, timezone: tz });
    router.replace(`/trips/${data.id}`);
  };

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>{t('Nuevo Trip')}</Text>
      <TextInput placeholder="Nombre del viaje" value={name} onChangeText={setName} style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />

      <Text>{t('Fecha inicio')}</Text>
      <DateTimePicker value={start||new Date()} mode="date" display={Platform.OS==='ios'?'compact':'default'} onChange={(e, d)=> d && setStart(d)} />
      <Text>{t('Fecha fin')}</Text>
      <DateTimePicker value={end||new Date()} mode="date" display={Platform.OS==='ios'?'compact':'default'} onChange={(e, d)=> d && setEnd(d)} />

      <Text>{t('Zona horaria')}</Text>
      <TextInput placeholder="Ej. America/Santiago" value={tz} onChangeText={setTz} style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />

      <TouchableOpacity onPress={save} style={{ backgroundColor:'#007aff', paddingVertical:10, borderRadius:8 }}>
        <Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>{t('Crear')}</Text>
      </TouchableOpacity>
    </View>
  );
}
