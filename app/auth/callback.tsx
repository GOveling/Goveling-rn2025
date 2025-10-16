import React, { useEffect } from 'react';

import { View, Text, ActivityIndicator } from 'react-native';

import { useRouter } from 'expo-router';

import {
  analyzeOAuthCallback,
  waitForSession,
  logOAuthDebugInfo,
} from '~/lib/oauth-callback-utils';
import { supabase } from '~/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 Enhanced Auth callback started');
        logOAuthDebugInfo();

        // Analyze the callback
        const callbackResult = analyzeOAuthCallback();
        console.log('📊 Callback analysis:', callbackResult);

        if (callbackResult.hasError) {
          console.error(
            '❌ OAuth error detected:',
            callbackResult.errorType,
            callbackResult.errorDescription
          );

          // Even if there's a callback error, check if session was created
          if (callbackResult.needsSessionCheck) {
            console.log('🔧 Checking session despite callback error...');

            const { session } = await waitForSession(
              () => supabase.auth.getSession(),
              3, // Fewer attempts for error cases
              1500
            );

            if (session) {
              console.log('🎉 Session found despite callback error!');
              router.replace('/(tabs)');
              return;
            }
          }

          // Redirect with error
          router.replace(
            `/auth?error=${callbackResult.errorType}&description=${callbackResult.errorDescription || ''}`
          );
          return;
        }

        if (callbackResult.success || callbackResult.needsSessionCheck) {
          console.log('✅ OAuth callback detected, processing...');

          // Wait for session to be established
          const { session, attempts } = await waitForSession(
            () => supabase.auth.getSession(),
            8, // More attempts for success cases
            1200
          );

          if (session) {
            console.log(`🎉 Authentication successful after ${attempts} attempts!`, {
              user: session.user.email,
              provider: session.user.app_metadata.provider,
            });
            router.replace('/(tabs)');
          } else {
            console.log('❌ No session created after OAuth callback');
            router.replace('/auth?error=no_session_created');
          }
        } else {
          console.log('❓ Not an OAuth callback, checking existing session...');

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
    const timer = setTimeout(handleAuthCallback, 300);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
      }}
    >
      <ActivityIndicator size="large" color="#007aff" />
      <Text
        style={{
          marginTop: 16,
          fontSize: 16,
          color: '#666',
          textAlign: 'center',
        }}
      >
        Completando autenticación con Google...
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 12,
          color: '#999',
          textAlign: 'center',
        }}
      >
        Procesando callback OAuth...
      </Text>
    </View>
  );
}
