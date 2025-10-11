import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { ToastProvider } from '../src/components/ui/Toast';
import { ThemeProvider } from '../src/lib/theme';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { Stack, useSegments, Redirect, router, useRouter } from 'expo-router';
import { Platform, View, ActivityIndicator, Text } from 'react-native'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

// AuthGuard inline para evitar problemas de caché
function InlineAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'auth';

  console.log('🔍 Inline AuthGuard - user:', user);
  console.log('🔍 Inline AuthGuard - loading:', loading);
  console.log('🔍 Inline AuthGuard - segments:', segments);
  console.log('🔍 Inline AuthGuard - inAuthGroup:', inAuthGroup);

  // Forzar navegación inmediata sin useEffect
  if (!loading) {
    if (!user && !inAuthGroup) {
      console.log('� FORCE Redirecting to auth/index...');
      router.replace('/auth/index');
    } else if (user && inAuthGroup) {
      console.log('� FORCE Redirecting to (tabs)...');
      router.replace('/(tabs)');
    }
  }

  console.log('🔍 Inline AuthGuard - rendering children');
  return <>{children}</>;
}

// @ts-nocheck
export default function Root() {
  useFrameworkReady();
  console.log('📱 Root Layout is mounting with INLINE AuthGuard!!!');
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AuthProvider>
          <InlineAuthGuard>
            <ToastProvider>
              <>
                <Stack screenOptions={{
                  headerShown: false,
                  ...(Platform.OS === 'web' && {
                    contentStyle: { backgroundColor: '#F7F7FA' }
                  })
                }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="settings" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </>
            </ToastProvider>
          </InlineAuthGuard>
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
