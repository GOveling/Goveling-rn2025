import { useTranslation } from 'react-i18next';
import { useTheme } from '~/lib/theme';
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
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>{t('Trip')}</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginVertical:8 }}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} onPress={()=>{
            const path = tab.key==='overview' ? `/trips/${id}` :
              tab.key==='places' ? `/trips/${id}/places` :
              tab.key==='route' ? `/trips/${id}/route` :
              tab.key==='stay' ? `/trips/${id}/accommodation` :
              tab.key==='team' ? `/trips/${id}/team` : `/trips/${id}/settings`;
            router.push(path);
          }} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:'#ddd' }}>
            <Text>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={{ opacity:0.7 }}>{t('Selecciona una pestaña')}</Text>
    </View>
  );
}
