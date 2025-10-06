import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSafeRedirectUrl } from './oauth-urls';
import { API_KEYS, API_VALIDATORS } from '../config/apiKeys';

// Configuración segura de Client IDs
const getGoogleClientIds = () => {
  if (!API_VALIDATORS.isGoogleOAuthConfigured()) {
    console.error('❌ Google OAuth no configurado correctamente');
    return null;
  }
  
  return API_KEYS.googleOAuth;
};

/**
 * Detecta si estamos corriendo en Expo Go
 */
const isExpoGo = (): boolean => {
  if (typeof window !== 'undefined') {
    return false; // Estamos en web
  }
  
  // Verificar si estamos en Expo Go usando Constants
  try {
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
};

/**
 * Obtiene el Client ID de Google OAuth correcto según la plataforma actual
 */
export const getGoogleClientId = (): string => {
  const clientIds = getGoogleClientIds();
  
  if (!clientIds) {
    throw new Error('Google OAuth no configurado - verifica las variables de entorno');
  }
  
  // En web, usamos el Client ID web
  if (typeof window !== 'undefined') {
    return clientIds.web;
  }
  
  // Si estamos en Expo Go, usar siempre web client
  if (isExpoGo()) {
    console.log('🔧 Detectado Expo Go - Usando autenticación web');
    return clientIds.web;
  }
  
  // En móvil nativo, usamos Platform de React Native
  switch (Platform.OS) {
    case 'ios':
      return clientIds.ios;
    case 'android':
      return clientIds.android;
    case 'web':
      return clientIds.web;
    default:
      // Fallback al web client
      return clientIds.web;
  }
};

/**
 * Obtiene información de la plataforma actual
 */
export const getPlatformInfo = () => {
  const isWeb = typeof window !== 'undefined';
  const inExpoGo = isExpoGo();
  const platform = isWeb ? 'web' : (inExpoGo ? 'expo-go' : Platform.OS);
  const clientId = getGoogleClientId();
  const clientIds = getGoogleClientIds();
  
  return {
    platform,
    isWeb,
    inExpoGo,
    clientId,
    allClientIds: clientIds,
    shouldUseWebAuth: isWeb || inExpoGo
  };
};

/**
 * Configuración OAuth específica por plataforma
 */
export const getOAuthConfig = () => {
  const platformInfo = getPlatformInfo();
  
  // Usar siempre la URL más segura (Supabase) para desarrollo
  const redirectUrl = getSafeRedirectUrl('development');
  
  return {
    clientId: platformInfo.clientId,
    redirectUrl,
    platform: platformInfo.platform,
    useWebAuth: true, // Siempre usar web auth en desarrollo
    inExpoGo: platformInfo.inExpoGo,
    isSecure: true // Indicar que usamos URL segura
  };
};
