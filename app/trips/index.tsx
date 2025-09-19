import { useTranslation } from 'react-i18next';
export const options = { headerLargeTitle: true, headerTitle: 'My Trips', headerTransparent: true };
import { EmptyState } from '~/components/ui/EmptyState';
import { useTheme } from '~/lib/theme';
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';

type Trip = { id:string; name:string; start_date?:string|null; end_date?:string|null };

export default function TripsIndex(){
  const { t } = useTranslation();

  const { colors, spacing } = useTheme();

  const router = useRouter();
  const [list, setList] = React.useState<Trip[]>([]);

  const load = async ()=>{
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const { data } = await supabase.from('trips').select('id,name,start_date,end_date').or(`owner_id.eq.${uid},trip_collaborators.user_id.eq.${uid}`).order('start_date', { ascending:true });
    setList((data||[]) as any);
  };
  React.useEffect(()=>{ load(); }, []);

  const del = async (id:string)=>{
    Alert.alert('Eliminar trip','¿Confirmas?', [
      { text:'Cancelar', style:'cancel' },
      { text:'Eliminar', style:'destructive', onPress: async ()=>{ await supabase.from('trips').delete().eq('id', id); load(); } }
    ]);
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <Text style={{ fontSize:22, fontWeight:'600' }}>{t('trips.title')}</Text>
        <TouchableOpacity onPress={()=>router.push('/trips/new')} style={{ backgroundColor:'#007aff', paddingVertical:8, paddingHorizontal:12, borderRadius:8 }}>
          <Text style={{ color:'#fff', fontWeight:'600' }}>{t('+ New Trip')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i)=>i.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={()=>router.push(`/trips/${item.id}`)} style={{ paddingVertical:10, borderBottomWidth:1, borderColor:'#f2f2f2' }}>
            <Text style={{ fontWeight:'700' }}>{item.name}</Text>
            <Text style={{ opacity:0.7 }}>{item.start_date || '—'} → {item.end_date || '—'}</Text>
            <View style={{ flexDirection:'row', gap:12, marginTop:6 }}>
              <TouchableOpacity onPress={()=>router.push(`/trips/${item.id}/edit`)}>
                <Text style={{ color:'#007aff' }}>{t('Editar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>del(item.id)}>
                <Text style={{ color:'#ff3b30' }}>{t('Eliminar')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign:'center', opacity:0.6, marginTop:16 }}>{t('No tienes trips')}</Text>}
      />
    </View>
  );
}
