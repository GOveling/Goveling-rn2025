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
}

module.exports = config;
