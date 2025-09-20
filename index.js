// Inline polyfills that MUST execute before any imports
// Process.env polyfill
if (typeof process === 'undefined') {
  globalThis.process = {
    env: {
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
    },
    platform: 'web',
    version: '18.0.0',
    versions: { node: '18.0.0' },
    browser: true
  };
  if (typeof window !== 'undefined') window.process = globalThis.process;
}

// Import.meta polyfill
if (typeof globalThis !== 'undefined' && !globalThis['import']) {
  const importMeta = {
    env: {
      NODE_ENV: 'development',
      MODE: 'development',
      DEV: true,
      PROD: false
    },
    url: typeof window !== 'undefined' ? window.location.href : 'http://localhost'
  };
  globalThis['import'] = { meta: importMeta };
  if (typeof window !== 'undefined') window['import'] = { meta: importMeta };
}

// Now import the polyfill files for additional safety
import './src/polyfills/process-env.js';
import './src/polyfills/import-meta.js';

// Re-export everything from expo-router/entry
export * from 'expo-router/entry';
