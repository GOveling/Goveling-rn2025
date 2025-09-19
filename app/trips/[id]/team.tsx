import { useTranslation } from 'react-i18next';
import { Sheet } from '../~/components/ui/BottomSheet';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { inviteToTrip, removeCollaborator } from '~/lib/team';

type Collab = { user_id:string; role:'viewer'|'editor'; profiles?: { display_name?:string|null, email?:string|null } };

export default function ManageTeam(){
  const { t } = useTranslation();

  const { id } = useLocalSearchParams<{ id:string }>();
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'viewer'|'editor'>('viewer');
  const [list, setList] = React.useState<Collab[]>([]);

  const load = async ()=>{
    const { data } = await supabase.from('trip_collaborators').select('user_id, role, profiles ( display_name, email )').eq('trip_id', id);
    setList((data||[]) as any);
  };
  React.useEffect(()=>{ load(); }, [id]);

  const invite = async ()=>{
    try{
      await inviteToTrip(id!, email.trim(), role);
      Alert.alert('Invitación enviada');
      setEmail('');
    }catch(e:any){ Alert.alert('Error', e.message||''); }
  };

  const remove = async (uid:string)=>{
    try{ await removeCollaborator(id!, uid); load(); }catch(e:any){ Alert.alert('Error', e.message||''); }
  };

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>{t('Manage Team')}</Text>
      <View style={{ flexDirection:'row', gap:8 }}>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ flex:1, borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />
        <TouchableOpacity onPress={()=>setRole(r=>r==='viewer'?'editor':'viewer')} style={{ paddingHorizontal:12, justifyContent:'center', borderWidth:1, borderColor:'#ddd', borderRadius:8 }}>
          <Text>{role}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={invite} style={{ paddingHorizontal:12, justifyContent:'center', backgroundColor:'#007aff', borderRadius:8 }}>
          <Text style={{ color:'#fff', fontWeight:'800' }}>{t('Invitar')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i)=>i.user_id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical:10, borderBottomWidth:1, borderColor:'#f2f2f2', flexDirection:'row', justifyContent:'space-between' }}>
            <View>
              <Text style={{ fontWeight:'700' }}>{item.profiles?.display_name || item.profiles?.email || item.user_id}</Text>
              <Text style={{ opacity:0.7 }}>{item.role}</Text>
            </View>
            <TouchableOpacity onPress={()=>remove(item.user_id)}>
              <Text style={{ color:'#ff3b30' }}>{t('Eliminar')}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign:'center', opacity:0.6, marginTop:12 }}>{t('No hay colaboradores')}</Text>}
      />
    </View>
  );
}

// v154: Encapsula la UI de invitados/roles dentro de <Sheet> para estilo iOS.
