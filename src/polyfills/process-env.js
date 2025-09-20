// Polyfill for process.env in web environments
(function() {
  'use strict';
  
  // Create process object if it doesn't exist
  if (typeof process === 'undefined') {
    var processEnv = {
      NODE_ENV: 'development',
      BABEL_ENV: 'development',
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS: '',
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID: '',
      EXPO_PUBLIC_PLACES_API: '',
      EXPO_PUBLIC_RESEND_API_URL: '',
      EXPO_PUBLIC_ML_API_BASE: '',
      EXPO_PUBLIC_ML_PRIMARY_VERSION: '',
      EXPO_PUBLIC_I18N_EDGE: ''
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

    console.log('✅ process.env polyfill loaded successfully');
  } else {
    // Process exists but env might be missing
    if (!process.env) {
      process.env = {
        NODE_ENV: 'development',
        BABEL_ENV: 'development'
      };
    }
    console.log('✅ process.env enhanced successfully');
  }
})();
