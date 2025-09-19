import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, Switch, TextInput, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';

const TripSettings = React.memo(function TripSettings() {
  const { t } = useTranslation();

  const { id } = useLocalSearchParams<{ id:string }>();
  const [sharing, setSharing] = React.useState(false);
  const [tz, setTz] = React.useState('');

  const load = React.useCallback(async () => {
    const { data } = await supabase.from('trip_settings').select('*').eq('trip_id', id).maybeSingle();
    if (data){ setSharing(!!data.location_sharing); setTz(data.timezone || ''); }
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const saveSettings = React.useCallback(async () => {
    await supabase.from('trip_settings').upsert({ 
      trip_id: id, 
      location_sharing: sharing, 
      timezone: tz || null, 
      updated_at: new Date().toISOString() 
    });
  }, [id, sharing, tz]);

  React.useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  const memoizedContent = React.useMemo(() => (
    <View style={{ flex:1, padding:12 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>{t('Trip Settings')}</Text>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text>{t('Compartir ubicación')}</Text>
        <Switch value={sharing} onValueChange={setSharing} />
      </View>
      <Text>{t('Zona horaria')}</Text>
      <TextInput 
        placeholder="Ej. America/Santiago" 
        value={tz} 
        onChangeText={setTz} 
        style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} 
      />
    </View>
  ), [t, sharing, tz, setSharing, setTz]);

  return memoizedContent;
});

export default TripSettings;
