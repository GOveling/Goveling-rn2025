import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { ToastProvider } from '../src/components/ui/Toast';
import { ThemeProvider } from '../src/lib/theme';
import { AuthProvider } from '../src/contexts/AuthContext';
import { AuthGuard } from '../src/components/AuthGuard';
import { Stack } from 'expo-router';
import { Platform } from 'react-native'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { StatusBar } from 'expo-status-bar';

export default function Root(){
  useFrameworkReady(); 
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AuthProvider>
          <AuthGuard>
            <ToastProvider>
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
            </ToastProvider>
          </AuthGuard>
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  ); 
}
