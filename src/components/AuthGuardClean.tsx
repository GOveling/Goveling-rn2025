import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { router, useSegments, useRootNavigationState } from 'expo-router';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || authLoading) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/auth');
      }
    } else {
      if (inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [user, authLoading, segments, navigationState?.key]);

  if (authLoading || !navigationState?.key) {
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
