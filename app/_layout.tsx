import React, { useEffect } from 'react';

import { Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import { Stack, useSegments, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';

import { store, persistor } from '~/store';
import { logger } from '~/utils/logger';

import { ToastProvider } from '../src/components/ui/Toast';
import { AppSettingsProvider } from '../src/contexts/AppSettingsContext';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { TravelModeProvider } from '../src/contexts/TravelModeContext';
import i18n from '../src/i18n';
import { ThemeProvider } from '../src/lib/theme';
import { setupGlobalErrorHandlers, setupProductionLogging } from '../src/utils/globalErrorConfig';

// Error Boundary para capturar errores
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('🚨 Error Boundary caught:', error);
    logger.error('🚨 Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error al cargar la app</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
          <Text style={styles.errorHint}>Por favor, cierra y vuelve a abrir la app</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// AuthGuard inline: ahora como componente lateral que solo hace Redirect y no bloquea el Stack
function InlineAuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'auth';

  logger.debug('DEBUG AuthGuard - user:', user);
  logger.debug('DEBUG AuthGuard - loading:', loading);
  logger.debug('DEBUG AuthGuard - segments:', segments);
  logger.debug('DEBUG AuthGuard - inAuthGroup:', inAuthGroup);

  // Mientras carga mostramos un indicador
  if (loading) {
    logger.debug('DEBUG AuthGuard - loading, showing spinner');
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#F7F7FA',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}
      >
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ marginTop: 16, color: '#666' }}>Cargando...</Text>
      </View>
    );
  }

  // Si no está autenticado y no está en la página de auth, redirigir a auth
  if (!user && !inAuthGroup) {
    logger.debug('DEBUG AuthGuard - redirecting to auth');
    return <Redirect href="/auth" />;
  }

  // Si está autenticado y está en la página de auth, redirigir a tabs
  if (user && inAuthGroup) {
    logger.debug('DEBUG AuthGuard - redirecting to tabs');
    return <Redirect href="/(tabs)" />;
  }

  // En cualquier otro caso no renderiza nada
  return null;
}

export default function Root() {
  useFrameworkReady();
  logger.debug('🚀 Root Layout mounting...');

  // Setup global error handlers on mount
  useEffect(() => {
    setupGlobalErrorHandlers();
    setupProductionLogging();
    logger.debug('✅ Global error handlers initialized');
  }, []);

  // ✅ Listener para forzar re-mount cuando cambie el idioma
  const [i18nKey, setI18nKey] = React.useState(0);

  React.useEffect(() => {
    const handleLanguageChange = () => {
      logger.debug('🌐 Language changed, forcing re-mount...');
      setI18nKey((prev) => prev + 1);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<ActivityIndicator size="large" />} persistor={persistor}>
          <I18nextProvider i18n={i18n} key={i18nKey}>
            <ThemeProvider>
              <AppSettingsProvider>
                <AuthProvider>
                  <TravelModeProvider>
                    <ToastProvider>
                      <>
                        {/* El Stack siempre está montado para que el router pueda renderizar rutas */}
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            ...(Platform.OS === 'web' && {
                              contentStyle: { backgroundColor: '#F7F7FA' },
                            }),
                          }}
                        >
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
                  </TravelModeProvider>
                </AuthProvider>
              </AppSettingsProvider>
            </ThemeProvider>
          </I18nextProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: 'center',
    backgroundColor: '#F7F7FA',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorHint: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#FF3B30',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
});
