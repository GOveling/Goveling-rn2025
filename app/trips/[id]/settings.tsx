import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, Switch, TextInput, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function TripSettings(){
  const { t } = useTranslation();

  const { id } = useLocalSearchParams<{ id:string }>();
  const [sharing, setSharing] = React.useState(false);
  const [tz, setTz] = React.useState('');

  const load = async ()=>{
    const { data } = await supabase.from('trip_settings').select('*').eq('trip_id', id).maybeSingle();
    if (data){ setSharing(!!data.location_sharing); setTz(data.timezone || ''); }
  };
  React.useEffect(()=>{ load(); }, [id]);

  React.useEffect(()=>{
    (async()=>{
      await supabase.from('trip_settings').upsert({ trip_id: id, location_sharing: sharing, timezone: tz || null, updated_at: new Date().toISOString() });
    })();
  }, [sharing, tz]);

  return (
    <View style={{ f{t('auto.Trip Settings')}p:12 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>Trip Settings</Text>
      <View style={{ flexDir{t('auto.Compartir ubicación')}t:'space-between', alignItems:'center' }}>
        <Text>Compartir ubicación</Text>
    {t('auto.Zona horaria')}haring} onValueChange={setSharing} />
      </View>
      <Text>Zona horaria</Text>
      <TextInput placeholder="Ej. America/Santiago" value={tz} onChangeText={setTz} style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />
    </View>
  );
}
