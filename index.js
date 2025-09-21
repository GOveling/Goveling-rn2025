// Inline polyfills that MUST execute before any imports
// Process.env polyfill
// Ensure process object exists
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {};
}

// Ensure process.env exists and is an object
if (typeof globalThis.process.env === 'undefined' || globalThis.process.env === null) {
  globalThis.process.env = {};
}

// Set default environment variables
Object.assign(globalThis.process.env, {
  NODE_ENV: globalThis.process.env.NODE_ENV || 'development',
  BABEL_ENV: globalThis.process.env.BABEL_ENV || 'development',
  EXPO_PUBLIC_SUPABASE_URL: globalThis.process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: globalThis.process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS: globalThis.process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS || '',
  EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID: globalThis.process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID || '',
  EXPO_PUBLIC_PLACES_API: globalThis.process.env.EXPO_PUBLIC_PLACES_API || '',
  EXPO_PUBLIC_RESEND_API_URL: globalThis.process.env.EXPO_PUBLIC_RESEND_API_URL || '',
  EXPO_PUBLIC_ML_API_BASE: globalThis.process.env.EXPO_PUBLIC_ML_API_BASE || '',
  EXPO_PUBLIC_ML_PRIMARY_VERSION: globalThis.process.env.EXPO_PUBLIC_ML_PRIMARY_VERSION || '',
  EXPO_PUBLIC_I18N_EDGE: globalThis.process.env.EXPO_PUBLIC_I18N_EDGE || ''
});

// Set additional process properties if they don't exist
if (!globalThis.process.platform) globalThis.process.platform = 'web';
if (!globalThis.process.version) globalThis.process.version = '18.0.0';
if (!globalThis.process.versions) globalThis.process.versions = { node: '18.0.0' };
if (!globalThis.process.browser) globalThis.process.browser = true;

// Ensure window.process is also available in browser environments
if (typeof window !== 'undefined') {
  window.process = globalThis.process;
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
