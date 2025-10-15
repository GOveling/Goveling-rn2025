/**
 * 🔐 API Keys Configuration
 * Configuración centralizada y validación de API keys
 */

import Constants from 'expo-constants';

// Safe environment variable access for Expo Go compatibility
function getEnvVar(key: string): string | undefined {
  try {
    // Try Constants first (works best in Expo Go)
    const expoConfig = Constants.expoConfig;
    if (expoConfig?.extra?.[key]) {
      return expoConfig.extra[key];
    }
    
    // Fallback to process.env if available
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    console.warn(`Could not access env var ${key}:`, e);
  }
  return undefined;
}

// Validación de variables de entorno requeridas
function validateEnvVar(key: string, name: string): string | null {
  const value = getEnvVar(key);
  
  if (!value || value.trim() === '' || value === 'your_new_api_key_here') {
    console.warn(`⚠️ ${name} no configurada: ${key}`);
    return null;
  }
  
  return value.trim();
}

// API Keys Configuration
export const API_KEYS = {
  // Supabase (REQUERIDO - sin esto la app no funciona)
  supabase: {
    url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL') || '',
    anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY') || '',
  },
  
  // Google Maps (OPCIONAL - funcionalidad de mapas avanzada)
  googleMaps: validateEnvVar('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'Google Maps API'),
  
  // Maptiler (OPCIONAL - mapas alternativos)
  maptiler: validateEnvVar('EXPO_PUBLIC_MAPTILER_API_KEY', 'Maptiler API'),
  
  // Weather (NO REQUERIDO - usa APIs gratuitas en Edge Function)
  weather: validateEnvVar('EXPO_PUBLIC_WEATHER_API_KEY', 'Weather API'),
  
  // OAuth Google (REQUERIDO para login con Google)
  googleOAuth: {
    web: getEnvVar('EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_WEB') || '',
    ios: getEnvVar('EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS') || '',
    android: getEnvVar('EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID') || '',
  }
} as const;

// Validadores específicos
export const API_VALIDATORS = {
  isSupabaseConfigured(): boolean {
    return !!(API_KEYS.supabase.url && API_KEYS.supabase.anonKey);
  },
  
  isGoogleMapsConfigured(): boolean {
    return !!API_KEYS.googleMaps;
  },
  
  isMaptilerConfigured(): boolean {
    return !!API_KEYS.maptiler;
  },
  
  isGoogleOAuthConfigured(): boolean {
    return !!(API_KEYS.googleOAuth.web && API_KEYS.googleOAuth.ios && API_KEYS.googleOAuth.android);
  },
  
  // Función de diagnóstico completo
  diagnoseConfiguration(): {
    core: boolean;
    optional: string[];
    missing: string[];
  } {
    const missing: string[] = [];
    const optional: string[] = [];
    
    // Core functionality check
    if (!this.isSupabaseConfigured()) {
      missing.push('Supabase (CRÍTICO)');
    }
    
    if (!this.isGoogleOAuthConfigured()) {
      missing.push('Google OAuth (CRÍTICO para login)');
    }
    
    // Optional functionality check
    if (!this.isGoogleMapsConfigured()) {
      optional.push('Google Maps (mapas avanzados)');
    }
    
    if (!this.isMaptilerConfigured()) {
      optional.push('Maptiler (mapas alternativos)');
    }
    
    const core = missing.length === 0;
    
    return { core, optional, missing };
  }
} as const;

// Log de estado al cargar
const diagnosis = API_VALIDATORS.diagnoseConfiguration();
if (diagnosis.core) {
  console.log('✅ APIs core configuradas correctamente');
  if (diagnosis.optional.length > 0) {
    console.log('⚠️ APIs opcionales no configuradas:', diagnosis.optional);
  }
} else {
  console.error('❌ APIs críticas faltantes:', diagnosis.missing);
}
