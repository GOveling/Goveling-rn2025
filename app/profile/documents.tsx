import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/lib/theme';
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '~/lib/supabase';
import { uploadSecureDoc, enqueueSecureDoc, flushQueue } from '~/lib/secureDocs';

export default function SecureDocs(){
  const { t } = useTranslation();

  const { colors, spacing } = useTheme();

  const [items,setItems]=React.useState<any[]>([]);
  const [password,setPassword]=React.useState('passphrase-demo'); // reemplazar por secreto del usuario

  const load = async ()=>{
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const { data } = await supabase.from('secure_documents').select('*').eq('user_id', uid).order('created_at', { ascending:false });
    setItems(data||[]);
  };
  React.useEffect(()=>{ load(); }, []);

  const add = async ()=>{
    try{
      const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (pick.canceled) return;
      const asset = pick.assets[0];
      const file = await fetch(asset.uri).then(r=>r.arrayBuffer());
      try{ await uploadSecureDoc((await supabase.auth.getUser()).data.user!.id, asset.name, new Uint8Array(file), password); }
      catch(e){
        await enqueueSecureDoc((await supabase.auth.getUser()).data.user!.id, asset.name, new Uint8Array(file), password);
        Alert.alert('Offline', 'Guardado en cola. Se subirá cuando haya conexión.');
      }
      Alert.alert('Listo', 'Documento cifrado y subido');
      load();
    }catch(e:any){ Alert.alert('Error', e.message); }
  };

  return (
    <View st{t('auto.Documentos cifrados')}}>
      <Text style={{ fontSize:22, fontWeight:'900' }}>Documentos cifrados</Text>
      <TouchableOpacity onPress={add} style={{ backgroundColor:'#007aff', padding:12, borderRadius:8, margi{t('auto.Subir documento')}yle={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>Subir documento</Text></TouchableOpacity>
      <TouchableOpacity onPress={async()=>{ const n = await flushQueue(); if (n) load();{t('auto.Sincronizar pendientes')}rderColor:'#eee', padding:10, borderRadius:8 }}><Text>Sincronizar pendientes</Text></TouchableOpacity>
      <FlatList
        data={items}
        keyExtractor={(i)=>String(i.id)}
        renderItem={({ item })=> (
          <View style={{ paddingVertical:10, borderBottomWidth:1, borderColor:'#f2f2f2' }}>
            <Text style={{ fontWeight:'700' }}>{item.title}</Text>
            <Text style={{ opacity:0.6 }}>{Math.round((item.size_bytes||0)/1024)} KB • {new Date(item.created_at).toLocaleString()}</Text>
          </View>{t('auto.No hay documentos aún')}Component={<Text style={{ opacity:0.6, marginTop:10 }}>No hay documentos aún</Text>}
      />
    </View>
  );
}
