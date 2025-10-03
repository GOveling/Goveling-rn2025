import { Platform } from 'react-native';

// Client IDs por plataforma
const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_WEB || '695125246048-7jm5ad05vpmmv748rreh3e9s6gt608dh.apps.googleusercontent.com',
  ios: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS || '695125246048-87e6oflphl34arcqo9ulbk4jmqldpoe4.apps.googleusercontent.com',
  android: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID || '695125246048-q9tafnn7tk2thnkgbni8jnjj859nndh9.apps.googleusercontent.com'
};

/**
 * Obtiene el Client ID de Google OAuth correcto según la plataforma actual
 */
export const getGoogleClientId = (): string => {
  // En web, usamos el Client ID web
  if (typeof window !== 'undefined') {
    return GOOGLE_CLIENT_IDS.web;
  }
  
  // En móvil, usamos Platform de React Native
  switch (Platform.OS) {
    case 'ios':
      return GOOGLE_CLIENT_IDS.ios;
    case 'android':
      return GOOGLE_CLIENT_IDS.android;
    case 'web':
      return GOOGLE_CLIENT_IDS.web;
    default:
      // Fallback al web client
      return GOOGLE_CLIENT_IDS.web;
  }
};

/**
 * Obtiene información de la plataforma actual
 */
export const getPlatformInfo = () => {
  const isWeb = typeof window !== 'undefined';
  const platform = isWeb ? 'web' : Platform.OS;
  const clientId = getGoogleClientId();
  
  return {
    platform,
    isWeb,
    clientId,
    allClientIds: GOOGLE_CLIENT_IDS
  };
};

/**
 * Configuración OAuth específica por plataforma
 */
export const getOAuthConfig = () => {
  const platformInfo = getPlatformInfo();
  
  return {
    clientId: platformInfo.clientId,
    redirectUrl: platformInfo.isWeb 
      ? `${window.location?.origin || 'http://localhost:8081'}/auth/callback`
      : 'com.goveling.app://auth/callback', // Deep link para móvil
    platform: platformInfo.platform
  };
};
