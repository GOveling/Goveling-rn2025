import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { Redirect } from 'expo-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F8F9FA',
        }}
      >
        <ActivityIndicator size="large" color="#6366F1" />
        <Text
          style={{
            marginTop: 16,
            fontSize: 16,
            color: '#666',
            textAlign: 'center',
          }}
        >
          Cargando...
        </Text>
      </View>
    );
  }

  if (!user) {
    // User is not authenticated, redirect to auth
    return <Redirect href="/auth" />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
