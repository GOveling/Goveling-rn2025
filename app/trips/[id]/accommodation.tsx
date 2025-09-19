import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function Accommodation(){
  const { t } = useTranslation();

  const { id } = useLocalSearchParams<{ id:string }>();
  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [checkin, setCheckin] = React.useState<Date|null>(new Date());
  const [checkout, setCheckout] = React.useState<Date|null>(new Date(Date.now()+86400000));
  const [list, setList] = React.useState<any[]>([]);

  const load = async ()=>{
    const { data } = await supabase.from('accommodations').select('*').eq('trip_id', id).order('checkin_date', { ascending:true });
    setList((data||[]) as any);
  };
  React.useEffect(()=>{ load(); }, [id]);

  const add = async ()=>{
    if (!name.trim()) return Alert.alert('Falta nombre');
    const row = { trip_id: id, name: name.trim(), address: address||null, checkin_date: checkin?.toISOString().slice(0,10), checkout_date: checkout?.toISOString().slice(0,10) };
    const { error } = await supabase.from('accommodations').insert(row);
    if (error) return Alert.alert('Error', error.message);
    setName(''); setAddress(''); load();
  };

  const del = async (aid:number)=>{
    await supabase.from('accommodations').delete().eq('id', aid);
    load();
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>{t('Accommodation')}</Text>
      <TextInput placeholder="Nombre" value={name} onChangeText={setName} style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8, marginTop:8 }} />
      <TextInput placeholder="Dirección" value={address} onChangeText={setAddress} style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />

      <Text>{t('Check-in')}</Text>
      <DateTimePicker value={checkin||new Date()} mode="date" onChange={(e,d)=> d&&setCheckin(d)} />
      <Text>{t('Check-out')}</Text>
      <DateTimePicker value={checkout||new Date()} mode="date" onChange={(e,d)=> d&&setCheckout(d)} />

      <TouchableOpacity onPress={add} style={{ backgroundColor:'#007aff', paddingVertical:10, borderRadius:8, marginTop:12 }}>
        <Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>{t('Agregar')}</Text>
      </TouchableOpacity>

      <FlatList
        data={list}
        keyExtractor={(i)=>String(i.id)}
        renderItem={({ item }) => (
          <View style={{ paddingVertical:10, borderBottomWidth:1, borderColor:'#f2f2f2', flexDirection:'row', justifyContent:'space-between' }}>
            <View>
              <Text style={{ fontWeight:'700' }}>{item.name}</Text>
              <Text style={{ opacity:0.7 }}>{item.address || '—'}</Text>
              <Text style={{ opacity:0.7 }}>{item.checkin_date} → {item.checkout_date}</Text>
            </View>
            <TouchableOpacity onPress={()=>del(item.id)}>
              <Text style={{ color:'#ff3b30' }}>{t('Eliminar')}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign:'center', opacity:0.6, marginTop:16 }}>{t('No hay alojamientos')}</Text>}
      />
    </View>
  );
}
