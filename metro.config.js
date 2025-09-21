// Ensure global.process exists for Metro bundling
global.process = global.process || {};
global.process.env = global.process.env || {};

// Ensure process and process.env are available globally for Metro bundling
if (typeof global !== 'undefined') {
  if (typeof global.process === 'undefined') {
    global.process = {};
  }
  if (typeof global.process.env === 'undefined') {
    global.process.env = {};
  }
}
if (typeof process === 'undefined') {
  global.process = { env: {} };
} else if (typeof process.env === 'undefined') {
  process.env = {};
}

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure for web compatibility
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

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