import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function PlaceReviews(){
  const { t } = useTranslation();

  const { place_id } = useLocalSearchParams<{ place_id:string }>();
  const [items,setItems]=React.useState<any[]>([]);
  const [loading,setLoading]=React.useState(false);

  const load = async ()=>{
    setLoading(true);
    const { data, error } = await supabase.from('place_reviews').select('*').eq('place_id', String(place_id)).order('created_at', { ascending:false });
    setItems(data||[]);
    setLoading(false);
  };
  React.useEffect(()=>{ load(); }, [place_id]);

  return (
    <View st{t('auto.Reseñas')}padding:12 }}>
      <Text style={{ fontSize:22, fontWeight:'900' }}>Reseñas</Text>
      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={items}
        keyExtractor={(i)=>String(i.id)}
        renderItem={({ item })=> (
          <View style={{ paddingVertical:10, borderBott{t('auto.★ {item.rating} — {item.place_name||''}')}  <Text style={{ fontWeight:'700' }}>★ {item.rating} — {item.place_name||''}</Text>
            <Text style={{ opacity:0.8 }}>{item.text||''}</Text>
            <Text style={{ opacity:0.5, fontSize:12 }}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>{t('auto.Sin reseñas aún')}tEmptyComponent={<Text style={{ opacity:0.6, marginTop:12 }}>Sin reseñas aún</Text>}
      />
    </View>
  );
}
