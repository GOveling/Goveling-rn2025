const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolver optimizations for path aliases
config.resolver = {
  ...config.resolver,
  alias: {
    '~': './src',
    '@': './src',
  },
};

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

  // Use esbuild serializer for production builds only
  try {
    config.serializer = {
      ...config.serializer,
      customSerializer: require('@rnx-kit/metro-serializer-esbuild'),
    };
  } catch (error) {
    console.warn('ESBuild serializer not available, using default serializer');
  }
}

module.exports = config;
