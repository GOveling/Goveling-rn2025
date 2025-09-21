const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure for web compatibility
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

// Inject polyfills at the top of the bundle for web
if (config.serializer) {
  const originalSerializer = config.serializer.customSerializer;
  config.serializer.customSerializer = (entryPoint, preModules, graph, options) => {
    if (options.platform === 'web') {
      // Create a polyfill module that gets executed first
      const polyfillCode = `
        // Critical polyfills for web environment
        if (typeof process === 'undefined') {
          globalThis.process = {
            env: {
              NODE_ENV: 'development',
              BABEL_ENV: 'development',
              EXPO_PUBLIC_SUPABASE_URL: '',
              EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
              EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: '',
              EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: '',
              EXPO_PUBLIC_OPENWEATHER_API_KEY: '',
              EXPO_PUBLIC_RESEND_API_KEY: '',
              EXPO_PUBLIC_AFFILIATE_ID: '',
              EXPO_PUBLIC_BOOKING_AFFILIATE_ID: '',
              EXPO_PUBLIC_SKYSCANNER_AFFILIATE_ID: '',
              EXPO_PUBLIC_ESIM_GO_AFFILIATE_ID: '',
              EXPO_PUBLIC_SENTRY_DSN: '',
              EXPO_PUBLIC_MIXPANEL_TOKEN: '',
              EXPO_PUBLIC_AMPLITUDE_API_KEY: '',
              EXPO_PUBLIC_POSTHOG_API_KEY: '',
              EXPO_PUBLIC_POSTHOG_HOST: '',
              EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
              EXPO_PUBLIC_FIREBASE_API_KEY: '',
              EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: '',
              EXPO_PUBLIC_FIREBASE_PROJECT_ID: '',
              EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: '',
              EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '',
              EXPO_PUBLIC_FIREBASE_APP_ID: '',
              EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: ''
            },
            platform: 'web',
            browser: true
          };
          if (typeof window !== 'undefined') window.process = globalThis.process;
        }
        // Ensure process.env exists even if process is already defined
        if (typeof process !== 'undefined' && (!process.env || typeof process.env !== 'object')) {
          process.env = {
            NODE_ENV: 'development',
            BABEL_ENV: 'development',
            EXPO_PUBLIC_SUPABASE_URL: '',
            EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
            EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: '',
            EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: '',
            EXPO_PUBLIC_OPENWEATHER_API_KEY: '',
            EXPO_PUBLIC_RESEND_API_KEY: '',
            EXPO_PUBLIC_AFFILIATE_ID: '',
            EXPO_PUBLIC_BOOKING_AFFILIATE_ID: '',
            EXPO_PUBLIC_SKYSCANNER_AFFILIATE_ID: '',
            EXPO_PUBLIC_ESIM_GO_AFFILIATE_ID: '',
            EXPO_PUBLIC_SENTRY_DSN: '',
            EXPO_PUBLIC_MIXPANEL_TOKEN: '',
            EXPO_PUBLIC_AMPLITUDE_API_KEY: '',
            EXPO_PUBLIC_POSTHOG_API_KEY: '',
            EXPO_PUBLIC_POSTHOG_HOST: '',
            EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
            EXPO_PUBLIC_FIREBASE_API_KEY: '',
            EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: '',
            EXPO_PUBLIC_FIREBASE_PROJECT_ID: '',
            EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: '',
            EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '',
            EXPO_PUBLIC_FIREBASE_APP_ID: '',
            EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: ''
          };
        }
        if (typeof globalThis !== 'undefined' && !globalThis.importMeta) {
          globalThis.importMeta = { env: { NODE_ENV: 'development' }, url: 'http://localhost' };
          globalThis['import'] = { meta: globalThis.importMeta };
        }
      `;
      
      // Add polyfill as the first module
      preModules.unshift({
        path: '__polyfills__',
        dependencies: new Map(),
        getSource: () => ({ code: polyfillCode, map: null }),
        output: [{
          type: 'js/module',
          data: { code: polyfillCode, lineCount: polyfillCode.split('\n').length, map: [] }
        }]
      });
    }
    
    if (originalSerializer) {
      return originalSerializer(entryPoint, preModules, graph, options);
    }
    
    return require('metro/src/DeltaBundler/Serializers/baseJSBundle')(
      entryPoint, preModules, graph, options
    );
  };
}

// Performance optimizations (compatible with Bolt)
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_keys: true,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    warnings: false,
  };
}

module.exports = config;