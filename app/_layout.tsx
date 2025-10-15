import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { ToastProvider } from '../src/components/ui/Toast';
import { ThemeProvider } from '../src/lib/theme';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { Stack, useSegments, Redirect } from 'expo-router';
import { Platform, View, ActivityIndicator, Text } from 'react-native'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { StatusBar } from 'expo-status-bar';

// AuthGuard inline: ahora como componente lateral que solo hace Redirect y no bloquea el Stack
function InlineAuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'auth';

  console.log('DEBUG AuthGuard - user:', user);
  console.log('DEBUG AuthGuard - loading:', loading);
  console.log('DEBUG AuthGuard - segments:', segments);
  console.log('DEBUG AuthGuard - inAuthGroup:', inAuthGroup);

  // Mientras carga mostramos un indicador
  if (loading) {
    console.log('DEBUG AuthGuard - loading, showing spinner');
    return (
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: '#F7F7FA',
        justifyContent: 'center', 
        alignItems: 'center',
        zIndex: 9999
      }}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ marginTop: 16, color: '#666' }}>Cargando...</Text>
      </View>
    );
  }

  // Si no está autenticado y no está en la página de auth, redirigir a auth
  if (!user && !inAuthGroup) {
    console.log('DEBUG AuthGuard - redirecting to auth');
    return <Redirect href="/auth" />;
  }

  // Si está autenticado y está en la página de auth, redirigir a tabs
  if (user && inAuthGroup) {
    console.log('DEBUG AuthGuard - redirecting to tabs');
    return <Redirect href="/(tabs)" />;
  }

  // En cualquier otro caso no renderiza nada
  return null;
}

export default function Root() {
  useFrameworkReady();
  console.log('DEBUG Root Layout is mounting with INLINE AuthGuard!!!');
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <>
              {/* El Stack siempre está montado para que el router pueda renderizar rutas */}
              <Stack screenOptions={{
                headerShown: false,
                ...(Platform.OS === 'web' && {
                  contentStyle: { backgroundColor: '#F7F7FA' }
                })
              }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                {/* Use explicit routes to match actual files */}
                <Stack.Screen name="auth/index" options={{ headerShown: false }} />
                <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
                <Stack.Screen name="settings/index" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              {/* El guard se renderiza como hermano y solo hace Redirect cuando corresponde */}
              <InlineAuthGuard />
              <StatusBar style="auto" />
            </>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}