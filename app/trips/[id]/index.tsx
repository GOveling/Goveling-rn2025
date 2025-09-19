import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/lib/theme';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const tabs = [
  { key:'overview', label:'Overview' },
  { key:'places', label:'Places' },
  { key:'route', label:'AI Smart Route' },
  { key:'stay', label:'Accommodation' },
  { key:'team', label:'Team' },
  { key:'settings', label:'Settings' },
];

export default function TripDetail(){
  const { t } = useTranslation();

  const { colors, spacing } = useTheme();

  const { id } = useLocalSearchParams<{ id:string }>();
  const router = useRouter();
  return (
    <View st{t('auto.Trip')}1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>Trip</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginVertical:8 }}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} onPress={()=>{
            const path = t.key==='overview' ? `/trips/${id}` :
              t.key==='places' ? `/trips/${id}/places` :
              t.key==='route' ? `/trips/${id}/route` :
              t.key==='stay' ? `/trips/${id}/accommodation` :
              t.key==='team' ? `/trips/${id}/team` : `/trips/${id}/settings`;
            router.push(path);
          }} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:'#ddd' }}>
            <Text>{t.label}</Text>
        {t('auto.Selecciona una pestaña')}))}
      </View>
      <Text style={{ opacity:0.7 }}>Selecciona una pestaña</Text>
    </View>
  );
}
