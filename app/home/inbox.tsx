import { useTranslation } from 'react-i18next';
import { EmptyState } from '~/components/ui/EmptyState';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { supabase } from '~/lib/supabase';

function ActionButton({ title, onPress }:{title:string; onPress:()=>void}){
  return (<TouchableOpacity onPress={onPress} style={{ backgroundColor:'#111827', paddingVertical:8, paddingHorizontal:12, borderRadius:8, marginRight:8 }}>
    <Text style={{ color:'#fff', fontWeight:'700' }}>{title}</Text>
        {/* ACTIONS_BAR */}
        <View style={{ flexDirection:'row', marginTop:6, flexWrap:'wrap' }}>
          {item.data?.trip_id && item.title?.includes('invitación') ? (
            <>
              <ActionButton title="Aceptar" onPress={()=> AcceptInvite(item, user)} />
              <ActionButton title="Declinar" onPress={()=> DeclineInvite(item)} />
            </>
          ) : null}
          {item.data?.trip_id ? (
            <ActionButton title="Abrir Trip" onPress={()=> router.push({ pathname:`/trips/${item.data.trip_id}` })} />
          ) : null}
          {item.data?.place_id && item.data?.lat && item.data?.lng ? (
            <ActionButton title="Ver lugar" onPress={()=> router.push({ pathname:'/trips/directions', params:{ dlat: String(item.data.lat), dlng: String(item.data.lng) } })} />
          ) : null}
        
{/* v153 Empty state fallback */}
{(Array.isArray(items) && items.length===0) ? (
  <EmptyState title="Sin notificaciones" subtitle="Tus invitaciones y avisos aparecerán aquí" />
): null}
</View>

  </TouchableOpacity>);
}

async function AcceptInvite(n:any, user:any){
  const trip_id = n.data?.trip_id;
  const role = n.data?.role || 'viewer';
  const email = n.data?.email;
  if (!trip_id) return Alert.alert('Error','Invitación inválida');
  // security: confirm email matches current user
  if (email && user?.email && email.toLowerCase() !== user.email.toLowerCase()){
    return Alert.alert('Error','Esta invitación no corresponde a tu email.');
  }
  const { data: profile } = await supabase.auth.getUser();
  const uid = profile?.user?.id;
  if (!uid) return;
  await supabase.from('trip_collaborators').insert({ trip_id, user_id: uid, role });
  // (opcional) borrar invitación del inbox
  await supabase.from('notifications_inbox').update({ read_at: new Date().toISOString() }).eq('id', n.id);
  Alert.alert('Listo','Te uniste al trip.');
}

async function DeclineInvite(n:any){
  await supabase.from('notifications_inbox').update({ read_at: new Date().toISOString() }).eq('id', n.id);
  Alert.alert('Invitación','Has declinado la invitación.');
}



type Item = { id:number; title:string; body:string; data?:any; created_at:string; read_at?:string|null };

export default function Inbox(){
  const { t } = useTranslation();

  const [list, setList] = React.useState<Item[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = async ()=>{
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const { data } = await supabase.from('notifications_inbox').select('*').eq('user_id', uid).order('created_at', { ascending:false });
    setList((data||[]) as any);
  };

  React.useEffect(()=>{ load(); }, []);

  const markRead = async (id:number)=>{
    await supabase.from('notifications_inbox').update({ read_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>{t('Inbox')}</Text>
      <FlatList
        data={list}
        keyExtractor={(i)=>String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{ setRefreshing(true); load().finally(()=>setRefreshing(false)); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={()=>markRead(item.id)} style={{ paddingVertical:10, borderBottomWidth:1, borderColor:'#f2f2f2', opacity: item.read_at ? 0.6 : 1 }}>
            <Text style={{ fontWeight:'700' }}>{item.title}</Text>
            <Text>{item.body}</Text>
            <Text style={{ opacity:0.6, fontSize:12 }}>{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign:'center', opacity:0.6, marginTop:16 }}>{t('No tienes notificaciones')}</Text>}
      />
    </View>
  );
}
