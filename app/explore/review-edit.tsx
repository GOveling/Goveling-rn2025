import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function ReviewEditor(){
  const { t } = useTranslation();

  const router = useRouter();
  const { place_id, place_name, review_id } = useLocalSearchParams<{ place_id:string; place_name:string; review_id?:string }>();
  const [text,setText]=React.useState('');
  const [rating,setRating]=React.useState(5);

  React.useEffect(()=>{ (async()=>{
    if (review_id){
      const { data } = await supabase.from('place_reviews').select('*').eq('id', Number(review_id)).maybeSingle();
      if (data){ setText(data.text||''); setRating(data.rating||5); }
    }
  })(); }, [review_id]);

  const save = async ()=>{
    try{
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id; if (!uid) throw new Error('No auth');
      const row:any = { user_id: uid, place_id, place_name, rating, text };
      if (review_id) row.id = Number(review_id);
      const { error } = await supabase.from('place_reviews').upsert(row);
      if (error) throw error;
      Alert.alert('Listo', 'Tu reseña fue guardada');
      router.back();
    }catch(e:any){ Alert.alert('Error', e.message); }
  };

  const del = async ()=>{
    if (!review_id) return;
    await supabase.from('place_reviews').delete().eq('id', Number(review_id));
    Alert.alert('Eliminada', 'Reseña eliminada');
    router.back();
  };

  return (
    <View style={{ flex:1, padding:12, gap:10 }}>
      <Text style={{ fontSize:22, fontWeight:'900' }}>{place_name}</Text>
      <Text>Rating</Text>
      <View style={{ flexDirection:'row', gap:8 }}>
        {[1,2,3,4,5].map(n=> (
          <TouchableOpacity key={n} onPress={()=>setRating(n)} style={{ paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor: rating===n ? '#007aff':'#ddd', borderRadius:8 }}>
            <Text>★ {n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text>Reseña</Text>
      <TextInput multiline numberOfLines={6} value={text} onChangeText={setText} placeholder="Escribe tu reseña…" style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8, minHeight:120 }} />
      <TouchableOpacity onPress={save} style={{ backgroundColor:'#34c759', padding:12, borderRadius:8 }}>
        <Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Guardar</Text>
      </TouchableOpacity>
      {review_id ? (
        <TouchableOpacity onPress={del} style={{ backgroundColor:'#ff3b30', padding:12, borderRadius:8 }}>
          <Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Eliminar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
