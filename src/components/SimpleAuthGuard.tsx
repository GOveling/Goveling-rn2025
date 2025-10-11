import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSegments, Redirect } from 'expo-router';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const segments = useSegments();

  console.log('🔍 AuthGuard - user:', user?.email || 'null');
  console.log('🔍 AuthGuard - loading:', loading);
  console.log('🔍 AuthGuard - segments:', segments);

  // Si estamos cargando, mostrar loading
  if (loading) {
    console.log('🔍 AuthGuard - showing loading screen (loading=true)');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666', textAlign: 'center' }}>
          Verificando autenticación...
        </Text>
      </View>
    );
  }

  const inAuthGroup = segments[0] === 'auth';
  console.log('🔍 AuthGuard - inAuthGroup:', inAuthGroup);

  // Usar Redirect en lugar de router.replace() para navegar
  if (!user && !inAuthGroup) {
    console.log('🔍 AuthGuard - redirecting to auth with Redirect component');
    return <Redirect href="/auth" />;
  }

  if (user && inAuthGroup) {
    console.log('🔍 AuthGuard - redirecting to tabs with Redirect component');
    return <Redirect href="/(tabs)" />;
  }

  console.log('🔍 AuthGuard - rendering children');
  return <>{children}</>;
}
