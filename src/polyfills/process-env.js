// Minimal polyfill for process.env in web environments
(function() {
  'use strict';
  
  // Create process object if it doesn't exist
  if (typeof process === 'undefined') {
    var processEnv = {
      NODE_ENV: 'development',
      BABEL_ENV: 'development',
      EXPO_PUBLIC_SUPABASE_URL: 'https://iwsuyrlrbmnbfyfkqowl.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg',
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_WEB: '695125246048-7jm5ad05vpmmv748rreh3e9s6gt608dh.apps.googleusercontent.com',
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS: '695125246048-87e6oflphl34arcqo9ulbk4jmqldpoe4.apps.googleusercontent.com',
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID: '695125246048-q9tafnn7tk2thnkgbni8jnjj859nndh9.apps.googleusercontent.com',
      EXPO_PUBLIC_PLACES_API: '/functions/v1/places-search',
      EXPO_PUBLIC_RESEND_API_URL: '/functions/v1/resend-otp',
      EXPO_PUBLIC_ML_API_BASE: 'https://goveling-ml.onrender.com/api',
      EXPO_PUBLIC_ML_PRIMARY_VERSION: 'v2',
      EXPO_PUBLIC_I18N_EDGE: 'your_i18n_edge_url'
    };

    var processObj = {
      env: processEnv,
      platform: 'web',
      version: '18.0.0',
      versions: {
        node: '18.0.0'
      },
      browser: true
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
        BABEL_ENV: 'development'
      };
    }
    console.log('✅ Process.env enhanced');
  }
})();
