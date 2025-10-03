import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { getOAuthConfig, getPlatformInfo } from '../src/lib/google-oauth';

export default function OAuthDebug() {
  const testOAuth = async () => {
    console.log('=== OAuth Debug Test ===');
    
    const oauthConfig = getOAuthConfig();
    const platformInfo = getPlatformInfo();
    
    console.log('Platform Info:', platformInfo);
    console.log('OAuth Config:', oauthConfig);
    
    if (typeof window !== 'undefined') {
      console.log('Window location:', window.location?.href);
      console.log('Window origin:', window.location?.origin);
    }
    
    try {
      console.log('Using Client ID:', oauthConfig.clientId);
      console.log('Using Redirect URL:', oauthConfig.redirectUrl);
      console.log('Platform:', oauthConfig.platform);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthConfig.redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      console.log('OAuth response data:', data);
      console.log('OAuth response error:', error);
      
      if (error) {
        console.error('OAuth Error Details:', {
          message: error.message,
          status: error.status,
          details: error
        });
      }
    } catch (err) {
      console.error('OAuth Exception:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OAuth Debug</Text>
      <TouchableOpacity style={styles.button} onPress={testOAuth}>
        <Text style={styles.buttonText}>Test Google OAuth</Text>
      </TouchableOpacity>
      <Text style={styles.info}>Check browser console for logs</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  info: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
