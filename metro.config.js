const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Performance optimizations
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

// Bundle splitting configuration
config.serializer = {
  ...config.serializer,
};

// Resolver optimizations
config.resolver = {
  ...config.resolver,
  alias: {
    '~': './src',
    '@': './src',
  },
};

// Transformer optimizations
config.transformer = {
  ...config.transformer,
  allowOptionalDependencies: true,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
};

module.exports = config;
