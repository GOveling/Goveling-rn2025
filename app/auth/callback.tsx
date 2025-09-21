import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL and extract the hash fragment
        const url = window.location.href;
        
        // Check if this is an OAuth callback with access_token
        if (url.includes('#access_token=') || url.includes('?access_token=')) {
          // Let Supabase handle the OAuth callback
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('OAuth callback error:', error);
            router.replace('/auth');
            return;
          }

          if (data.session) {
            // Successfully authenticated, redirect to main app
            router.replace('/(tabs)');
          } else {
            // No session found, redirect back to auth
            router.replace('/auth');
          }
        } else {
          // Not an OAuth callback, redirect to auth
          router.replace('/auth');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#F8F9FA'
    }}>
      <ActivityIndicator size="large" color="#007aff" />
      <Text style={{ 
        marginTop: 16, 
        fontSize: 16, 
        color: '#666',
        textAlign: 'center'
      }}>
        Completando autenticación con Google...
      </Text>
    </View>
  );
}