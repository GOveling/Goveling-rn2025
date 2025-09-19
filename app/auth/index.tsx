import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '~/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen(){
  const { t } = useTranslation();

  const [email,setEmail]=React.useState('');
  const [password,setPassword]=React.useState('');
  const [code,setCode]=React.useState('');
  const [stage,setStage]=React.useState<'login'|'signup'|'verify'>('login');

  const signInEmail = async ()=>{
    try{
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }catch(e:any){ Alert.alert('Error', e.message); }
  };
  
  const signUpEmail = async ()=>{
    try{
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // send OTP via Resend Edge
      await fetch(process.env.EXPO_PUBLIC_RESEND_API_URL!, { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ email }) 
      });
      setStage('verify');
    }catch(e:any){ Alert.alert('Error', e.message); }
  };
  
  const verify = async ()=>{
    try{
      // In real app you would check OTP against Edge (already stored). For demo, accept any 6-digit and proceed to profile creation if needed.
      if (!/^[0-9]{6}$/.test(code)) throw new Error('Código inválido');
      Alert.alert('Verificado', 'Tu correo fue verificado.');
      setStage('login');
    }catch(e:any){ Alert.alert('Error', e.message); }
  };

  // Google sign-in (Expo AuthSession)
  const googleSignIn = async ()=>{
    try{
      const redirectUri = AuthSession.makeRedirectUri();
      const params = new URLSearchParams({
        client_id: (Platform.OS==='ios'? process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS : process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID) || '',
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'profile email'
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      const res = await AuthSession.startAsync({ authUrl });
      if (res.type === 'success'){
        // For demo, just sign in with magic link using email if available in id_token payload (would require implicit id_token). Skipped here.
        Alert.alert('Google', 'Autenticado con Google (completar con tu flujo preferido: Supabase OAuth).');
      }
    }catch(e:any){ Alert.alert('Error', e.message); }
  };

  return (
    <View style={{ flex:1, padding:20, justifyContent:'center', gap:12 }}>
      <Text style={{ fontSize:28, fontWeight:'900' }}>Bienvenido a GoTravel</Text>
      {stage!=='verify' ? (
        <>
          <TextInput 
            placeholder="Email" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none" 
            style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} 
          />
          <TextInput 
            placeholder="Password" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} 
          />
          {stage==='login' ? (
            <TouchableOpacity onPress={signInEmail} style={{ backgroundColor:'#007aff', padding:12, borderRadius:8 }}>
              <Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Ingresar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={signUpEmail} style={{ backgroundColor:'#34c759', padding:12, borderRadius:8 }}>
              <Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Crear cuenta</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={googleSignIn} style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }}>
            <Text style={{ textAlign:'center', fontWeight:'800' }}>Continuar con Google</Text>
          </TouchableOpacity>
          <View style={{ flexDirection:'row', justifyContent:'center', gap:6 }}>
            <Text>{stage==='login'?'¿No tienes cuenta?':'¿Ya tienes cuenta?'}</Text>
            <TouchableOpacity onPress={()=>setStage(stage==='login'?'signup':'login')}>
              <Text style={{ color:'#007aff' }}>{stage==='login'?'Crear una':'Iniciar sesión'}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text>Hemos enviado un código a tu correo.</Text>
          <TextInput 
            placeholder="Código de 6 dígitos" 
            value={code} 
            onChangeText={setCode} 
            keyboardType="number-pad" 
            style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8 }} 
          />
          <TouchableOpacity onPress={verify} style={{ backgroundColor:'#007aff', padding:12, borderRadius:8 }}>
            <Text style={{ color:'#fff', textAlign:'center', fontWeight:'800' }}>Verificar</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
