import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '~/contexts/AuthContext';
import { router, useSegments, useRootNavigationState, Redirect } from 'expo-router';
// import { useOnboarding } from '~/hooks/useOnboarding';
// import WelcomeModal from './onboarding/WelcomeModal';
// import PersonalInfoModal from './onboarding/PersonalInfoModal';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Temporalmente desactivado el onboarding automático
  // const {
  //   showWelcome,
  //   showPersonalInfo,
  //   user: onboardingUser,
  //   profile,
  //   loading: onboardingLoading,
  //   completeWelcome,
  //   closePersonalInfo,
  // } = useOnboarding();

  const loading = authLoading; // || onboardingLoading;

  // Show loading screen while checking authentication
  if (loading || !navigationState?.key) {
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
          {authLoading ? 'Verificando autenticación...' : 'Preparando experiencia...'}
        </Text>
      </View>
    );
  }

  console.log('🛡️ AuthGuard: Checking authentication state');
  console.log('👤 User:', user?.email || 'Not authenticated');
  console.log('📍 Current segments:', segments);

  const inAuthGroup = segments[0] === 'auth';
  const inTabsGroup = segments[0] === '(tabs)';

  if (!user && !inAuthGroup) {
    // User is not authenticated and not in auth group
    console.log('🔒 User not authenticated, redirecting to auth with Redirect component');
    return <Redirect href="/auth" />;
  }

  if (user && inAuthGroup) {
    // User is authenticated but still in auth group
    console.log('🔄 User already authenticated, redirecting to main app with Redirect component');
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      {children}

      {/* Onboarding Modals - Temporalmente desactivados */}
      {/* <WelcomeModal 
        isOpen={showWelcome} 
        onClose={completeWelcome} 
      />
      
      <PersonalInfoModal 
        isOpen={showPersonalInfo} 
        onClose={closePersonalInfo} 
        user={onboardingUser || user}
      /> */}
    </>
  );
}
