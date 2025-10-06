import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { analyzeOAuthCallback, waitForSession, logOAuthDebugInfo } from '~/lib/oauth-callback-utils';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 Auth callback started');
        console.log('📍 Current URL:', window.location.href);
        
        // Check for OAuth errors first
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        const errorCode = urlParams.get('error_code');
        const errorDescription = urlParams.get('error_description');
        
        if (errorParam) {
          console.error('❌ OAuth error detected:', { errorParam, errorCode, errorDescription });
          
          // Handle specific error cases
          if (errorCode === 'bad_oauth_callback' || errorParam === 'invalid_request') {
            console.log('🔧 OAuth callback error - trying session recovery...');
            
            // Wait a bit and check if session was actually created despite error
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionData.session) {
              console.log('🎉 Session found despite callback error!');
              router.replace('/(tabs)');
              return;
            }
          }
          
          // Redirect with error
          router.replace(`/auth?error=${errorParam}&description=${errorDescription || ''}`);
          return;
        }
        
        // Check if we have OAuth success indicators
        const url = window.location.href;
        const hashFragment = window.location.hash;
        const searchParams = window.location.search;
        
        console.log('🔗 URL parts:', { url, hashFragment, searchParams });
        
        if (hashFragment.includes('access_token') || searchParams.includes('code')) {
          console.log('✅ OAuth callback detected, processing...');
          
          // Process successful OAuth callback
          console.log('� Processing OAuth callback with code exchange...');
          
          // Give Supabase time to process the callback
          await new Promise(resolve => setTimeout(resolve, 1000));
          
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
            router.replace('/(tabs)');
          } else {
            console.log('⚠️ No session found, trying refresh...');
            // Try multiple times to get session
            let retryCount = 0;
            const maxRetries = 5;
            
            const checkSession = async () => {
              retryCount++;
              console.log(`🔄 Checking session attempt ${retryCount}/${maxRetries}...`);
              
              const { data: retryData, error: retryError } = await supabase.auth.getSession();
              
              if (retryData.session) {
                console.log('🔄 Session found on retry', retryCount);
                router.replace('/(tabs)');
              } else if (retryCount < maxRetries) {
                setTimeout(checkSession, 1500);
              } else {
                console.log('❌ Max retries reached, no session created');
                router.replace('/auth?error=no_session_created');
              }
            };
            
            setTimeout(checkSession, 1500);
          }
        } else {
          console.log('❓ Not an OAuth callback, checking session anyway...');
          
          // Even if no OAuth params, check if we have a session
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData.session) {
            console.log('🎉 Existing session found, redirecting to app');
            router.replace('/(tabs)');
          } else {
            console.log('📍 No session, redirecting to auth');
            router.replace('/auth');
          }
        }
      } catch (error) {
        console.error('💥 Auth callback error:', error);
        router.replace('/auth?error=callback_failed');
      }
    };

    // Add a small delay to ensure URL is fully loaded
    const timer = setTimeout(handleAuthCallback, 200);
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