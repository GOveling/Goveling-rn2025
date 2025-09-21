import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 Auth callback started');
        console.log('📍 Current URL:', window.location.href);
        
        // Check if we have URL fragments or query params that indicate OAuth callback
        const url = window.location.href;
        const hashFragment = window.location.hash;
        const searchParams = window.location.search;
        
        console.log('🔗 URL parts:', { url, hashFragment, searchParams });
        
        // Decode and log the state parameter for debugging
        const urlParams = new URLSearchParams(searchParams);
        const stateParam = urlParams.get('state');
        if (stateParam) {
          try {
            const decodedState = JSON.parse(atob(stateParam.split('.')[1]));
            console.log('🔍 Decoded state:', decodedState);
          } catch (e) {
            console.log('⚠️ Could not decode state parameter');
          }
        }
        
        if (hashFragment.includes('access_token') || searchParams.includes('code') || hashFragment.includes('error')) {
          console.log('✅ OAuth callback detected, processing...');
          
          // Handle OAuth error first
          if (hashFragment.includes('error') || searchParams.includes('error')) {
            const urlParams = new URLSearchParams(hashFragment.replace('#', '') || searchParams);
            const error = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');
            console.error('❌ OAuth error:', error, errorDescription);
            router.replace(`/auth?error=${error}&description=${errorDescription}`);
            return;
          }
          
          // Process successful OAuth callback
          console.log('🔄 Processing OAuth callback with code exchange...');
          
          // First, try to exchange the code for tokens manually if needed
          const urlParams = new URLSearchParams(searchParams);
          const code = urlParams.get('code');
          const state = urlParams.get('state');
          
          if (code) {
            console.log('📝 Found authorization code, initiating session...');
            // Let Supabase handle the code exchange automatically
            // by checking for session after a short delay
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Check for session
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('❌ OAuth session error:', sessionError);
            router.replace('/auth?error=oauth_session_failed');
            return;
          }

          if (sessionData.session) {
            console.log('🎉 Authentication successful!', {
              user: sessionData.session.user.email,
              provider: sessionData.session.user.app_metadata.provider
            });
            // Small delay to ensure the auth context picks up the session
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 100);
          } else {
            console.log('⚠️ No session found, trying refresh...');
            // Try refreshing the session or waiting for auth state change
            let retryCount = 0;
            const maxRetries = 3;
            
            const checkSession = async () => {
              retryCount++;
              const { data: retryData, error: retryError } = await supabase.auth.getSession();
              
              if (retryData.session) {
                console.log('🔄 Session found on retry', retryCount);
                router.replace('/(tabs)');
              } else if (retryCount < maxRetries) {
                console.log(`⏳ Retry ${retryCount}/${maxRetries}...`);
                setTimeout(checkSession, 1000);
              } else {
                console.log('❌ Max retries reached, no session created');
                router.replace('/auth?error=no_session_created');
              }
            };
            
            setTimeout(checkSession, 1000);
          }
        } else {
          console.log('❓ Not an OAuth callback, redirecting to auth');
          router.replace('/auth');
        }
      } catch (error) {
        console.error('💥 Auth callback error:', error);
        router.replace('/auth?error=callback_failed');
      }
    };

    // Add a small delay to ensure URL is fully loaded
    const timer = setTimeout(handleAuthCallback, 100);
    return () => clearTimeout(timer);
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