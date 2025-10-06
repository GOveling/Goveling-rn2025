/**
 * Configuración de URLs permitidas para Google OAuth
 * 
 * IMPORTANTE: Estas URLs deben estar configuradas en Google Cloud Console
 * en la sección "URIs de redirección autorizados"
 */

export const AUTHORIZED_REDIRECT_URLS = {
  // URL de Supabase (siempre funciona)
  supabase: 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/auth/v1/callback',
  
  // URLs de desarrollo local (requieren configuración en Google Console)
  localhost: [
    'http://localhost:8081/auth/callback',
    'http://127.0.0.1:8081/auth/callback',
    'http://localhost:19006/auth/callback', // Puerto alternativo de Expo
    'http://127.0.0.1:19006/auth/callback',
  ],
  
  // URLs de producción (configurar cuando tengas dominio)
  production: [
    'https://yourdomain.com/auth/callback',
    // Agregar otras URLs de producción aquí
  ],
  
  // Deep links para apps nativas
  deepLinks: [
    'com.goveling.app://auth/callback',
    'exp://192.168.1.100:8081/--/auth/callback', // IP local para Expo Go
  ]
};

/**
 * Obtiene la URL de redirección más segura y confiable
 */
export const getSafeRedirectUrl = (environment: 'development' | 'production' = 'development'): string => {
  if (environment === 'production') {
    return AUTHORIZED_REDIRECT_URLS.production[0] || AUTHORIZED_REDIRECT_URLS.supabase;
  }
  
  // Para desarrollo web local, usar localhost si estamos en web
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    console.log('🌐 Detected web environment, using:', `${currentOrigin}/auth/callback`);
    return `${currentOrigin}/auth/callback`;
  }
  
  // Para Expo Go y otros casos, usar Supabase (más confiable)
  return AUTHORIZED_REDIRECT_URLS.supabase;
};

/**
 * Instrucciones para configurar Google Cloud Console
 */
export const GOOGLE_CONSOLE_SETUP_INSTRUCTIONS = `
📋 CONFIGURACIÓN REQUERIDA EN GOOGLE CLOUD CONSOLE:

1. Ir a: https://console.cloud.google.com/apis/credentials
2. Seleccionar tu proyecto
3. Editar el Client ID OAuth 2.0
4. En "URIs de redirección autorizados", agregar:

   ✅ OBLIGATORIO (siempre funciona):
   https://iwsuyrlrbmnbfyfkqowl.supabase.co/auth/v1/callback

   🔧 OPCIONAL (para desarrollo local):
   http://localhost:8081/auth/callback
   http://127.0.0.1:8081/auth/callback
   http://localhost:19006/auth/callback
   http://127.0.0.1:19006/auth/callback

   🚀 PRODUCCIÓN (cuando tengas dominio):
   https://tudominio.com/auth/callback

5. Guardar cambios
6. Esperar 5-10 minutos para que se propaguen los cambios

❌ NOTA: Google OAuth no funciona confiablemente con localhost
✅ RECOMENDACIÓN: Usar siempre el callback de Supabase en desarrollo
`;
