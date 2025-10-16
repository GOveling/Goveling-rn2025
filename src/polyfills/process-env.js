// Minimal polyfill for process.env in web environments
(function () {
  'use strict';

  // Create process object if it doesn't exist
  if (typeof process === 'undefined') {
    var processEnv = {
      NODE_ENV: 'development',
      BABEL_ENV: 'development',
      EXPO_PUBLIC_SUPABASE_URL: 'https://iwsuyrlrbmnbfyfkqowl.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '', // Debe ser configurado por variable de entorno
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_WEB: '', // Debe ser configurado por variable de entorno
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS: '', // Debe ser configurado por variable de entorno
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID: '', // Debe ser configurado por variable de entorno
      EXPO_PUBLIC_PLACES_API: '/functions/v1/places-search',
      EXPO_PUBLIC_RESEND_API_URL: '/functions/v1/resend-otp',
      EXPO_PUBLIC_ML_API_BASE: 'https://goveling-ml.onrender.com/api',
      EXPO_PUBLIC_ML_PRIMARY_VERSION: 'v2',
      EXPO_PUBLIC_I18N_EDGE: 'your_i18n_edge_url',
    };

    var processObj = {
      env: processEnv,
      platform: 'web',
      version: '18.0.0',
      versions: {
        node: '18.0.0',
      },
      browser: true,
    };

    // Set on globalThis
    if (typeof globalThis !== 'undefined') {
      globalThis.process = processObj;
    }

    // Set on window
    if (typeof window !== 'undefined') {
      window.process = processObj;
    }

    // Set on global (Node.js compatibility)
    if (typeof global !== 'undefined') {
      global.process = processObj;
    }

    console.log('✅ Minimal process.env polyfill loaded');
  } else {
    // Process exists but env might be missing
    if (!process.env) {
      process.env = {
        NODE_ENV: 'development',
        BABEL_ENV: 'development',
      };
    }
    console.log('✅ Process.env enhanced');
  }
})();
