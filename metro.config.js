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
              BABEL_ENV: 'development'
            },
            platform: 'web',
            browser: true
          };
          if (typeof window !== 'undefined') window.process = globalThis.process;
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
