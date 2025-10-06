import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'r  return (
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
  );ort { useAuth } from '~/contexts/AuthContext';
import { router, useSegments, useRootNavigationState } from 'expo-router';
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

  useEffect(() => {
    if (!navigationState?.key || loading) {
      // Wait for navigation to be ready and auth loading to complete
      return;
    }

    console.log('🛡️ AuthGuard: Checking authentication state');
    console.log('👤 User:', user?.email || 'Not authenticated');
    console.log('📍 Current segments:', segments);
    // console.log('🎯 Onboarding state:', { showWelcome, showPersonalInfo });

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
      console.log('✅ User authenticated, checking onboarding status');
      
      // If showing onboarding modals, don't redirect
      // if (showWelcome || showPersonalInfo) {
      //   console.log('🎉 Showing onboarding modals, staying in place');
      //   return;
      // }
      
      if (inAuthGroup) {
        // User is on auth screen but already authenticated, redirect to main app
        console.log('🔄 User already authenticated, redirecting to main app');
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, segments, navigationState?.key]); // showWelcome, showPersonalInfo

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
          {authLoading ? 'Verificando autenticación...' : 'Preparando experiencia...'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {children}
      
      {/* Onboarding Modals */}
      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={completeWelcome} 
      />
      
      <PersonalInfoModal 
        isOpen={showPersonalInfo} 
        onClose={closePersonalInfo}
        user={onboardingUser || user}
      />
    </>
  );
}
