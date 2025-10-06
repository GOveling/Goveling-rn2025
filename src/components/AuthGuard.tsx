import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { router, useSegments, useRootNavigationState } from 'expo-router';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || loading) {
      // Wait for navigation to be ready and auth loading to complete
      return;
    }

    console.log('🛡️ AuthGuard: Checking authentication state');
    console.log('👤 User:', user?.email || 'Not authenticated');
    console.log('📍 Current segments:', segments);

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user) {
      // User is not authenticated
      console.log('🔒 User not authenticated, redirecting to auth');
      if (!inAuthGroup) {
        router.replace('/auth');
      }
    } else {
      // User is authenticated
      console.log('✅ User authenticated, ensuring access to main app');
      if (inAuthGroup) {
        // User is on auth screen but already authenticated, redirect to main app
        console.log('🔄 User already authenticated, redirecting to main app');
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, segments, navigationState?.key]);

  // Show loading screen while checking authentication
  if (loading || !navigationState?.key) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA'
      }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{
          marginTop: 16,
          fontSize: 16,
          color: '#666',
          textAlign: 'center'
        }}>
          Verificando autenticación...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
