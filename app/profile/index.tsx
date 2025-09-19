import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '~/lib/supabase';

export default function ProfileScreen(){
  const { t } = useTranslation();

  const [fullName,setFullName]=React.useState('');
  const [countryCode,setCountryCode]=React.useState('');
  const [phone,setPhone]=React.useState('');
  const [avatarUrl,setAvatarUrl]=React.useState<string|undefined>();
  const [notifPush,setNotifPush]=React.useState(true);
  const [notifEmail,setNotifEmail]=React.useState(true);

  React.useEffect(()=>{ (async()=>{
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data){
      setFullName(data.full_name||''); setCountryCode(data.country_code||''); setPhone(data.phone||'');
      setAvatarUrl(data.avatar_url||undefined); setNotifPush(!!data.notif_push); setNotifEmail(!!data.notif_email);
    }
  })(); }, []);

  const pickAvatar = async ()=>{
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status!=='granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
    if (res.canceled) return;
    const asset = res.assets[0];
    const file = await fetch(asset.uri).then(r=>r.blob());
    const path = `avatars/${Date.now()}-${asset.fileName||'avatar'}.jpg`;
    const { data, error } = await supabase.storage.from('public').upload(path, file, { upsert: true, contentType: 'image/jpeg' });
    if (error){ Alert.alert('Error', error.message); return; }
    const { data: url } = supabase.storage.from('public').getPublicUrl(path);
    setAvatarUrl(url.publicUrl);
    await save();
  };

  const save = async ()=>{
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id; if (!uid) return;
    await supabase.from('profiles').upsert({
      id: uid, full_name: fullName, country_code: countryCode, phone, avatar_url: avatarUrl, notif_push: notifPush, notif_email: notifEmail, updated_at: new Date().toISOString()
    });
    Alert.alert('Guardado', 'Perfil actualizado');
  };

  const signOut = async ()=>{
    await supabase.auth.signOut();
  };

  return (
    <View style={{ f{t('auto.Perfil')}:16, gap:12 }}>
      <Text style={{ fontSize:24, fontWeight:'900' }}>Perfil</Text>
      <TouchableOpacity onPress={pickAvatar} style={{ alignSelf:'flex-start' }}>
        <Image source={ avatarUrl ? { uri: avatarUrl } : require('~/assets/avatar-placeholder.png') } style={{ width:80, height:80, borderRadius:40, backgroundColor:'#eee' }} />
      </TouchableOpacity>
      <TextInput placeholder="Nombre completo" value={fullName} onChangeText={setFullName} style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />
      <TextInput placeholder="Código país (ej. CL)" value={countryCode} onChangeText={setCountryCode} autoCapitalize="characters" style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />
      <TextInput placeholder="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} />

      <View style={{ flexDirecti{t('auto.Push')}p:8, alignItems:'center' }}>
        <Text style={{ fontWeight:'700' }}>Push</Text>
        <TouchableOpacity onPress={()=>setNotifPush(v=>!v)} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor: notifPush ? '#34c759':'#ddd', backgroundColor: notifPush ? '#e7f9ee':'#fff' }}><Text>{notifPush?'ON':'OFF'}<{t('auto.Email')}ableOpacity>
        <Text style={{ fontWeight:'700', marginLeft:12 }}>Email</Text>
        <TouchableOpacity onPress={()=>setNotifEmail(v=>!v)} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor: notifEmail ? '#34c759':'#ddd', backgroundColor: notifEmail ? '#e7f9ee':'#fff' }}><Text>{notifEmail?'ON':'OFF'}</Text></TouchableOpacity>
      </View>

      <TouchableOpacity onPress={save} style={{ backgroundColor:'#007aff', padding:12, bor{t('auto.Guardar')}<Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Guardar</Text></TouchableOpacity>

      <View style={{ marginTop:'auto' }} />
      <TouchableOpacity onPress={signOut} style={{ backgroundColor:'#ff3b30', padding:12, bor{t('auto.Cerrar sesión')}style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Cerrar sesión</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>router.push('/profile/documents{t('auto.Documentos cifrados')}rderWidth:1, borderColor:'#eee', borderRadius:8 }}><Text>Documentos cifrados</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>router.push('/profile/achievements{t('auto.Estadísticas y Logros')}erWidth:1, borderColor:'#eee', borderRadius:8 }}><Text>Estadísticas y Logros</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>router.push('/settings{t('auto.Configuración')}12, borderWidth:1, borderColor:'#eee', borderRadius:8 }}><Text>Configuración</Text></TouchableOpacity>
    </View>
  );
}
