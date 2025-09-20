const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    // Use custom HTML template
    template: path.resolve(__dirname, 'web/index.html'),
  }, argv);
  
  // Handle import.meta compatibility with DefinePlugin
  const webpack = require('webpack');
  
  // Find existing DefinePlugin or create new one
  let definePlugin = config.plugins.find(plugin => plugin instanceof webpack.DefinePlugin);
  
  const definitions = {
    // Define process.env for web compatibility
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      BABEL_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      EXPO_PUBLIC_SUPABASE_URL: JSON.stringify(process.env.EXPO_PUBLIC_SUPABASE_URL || ''),
      EXPO_PUBLIC_SUPABASE_ANON_KEY: JSON.stringify(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''),
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS: JSON.stringify(process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_IOS || ''),
      EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID: JSON.stringify(process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ANDROID || ''),
      EXPO_PUBLIC_PLACES_API: JSON.stringify(process.env.EXPO_PUBLIC_PLACES_API || ''),
      EXPO_PUBLIC_RESEND_API_URL: JSON.stringify(process.env.EXPO_PUBLIC_RESEND_API_URL || ''),
      EXPO_PUBLIC_ML_API_BASE: JSON.stringify(process.env.EXPO_PUBLIC_ML_API_BASE || ''),
      EXPO_PUBLIC_ML_PRIMARY_VERSION: JSON.stringify(process.env.EXPO_PUBLIC_ML_PRIMARY_VERSION || ''),
      EXPO_PUBLIC_I18N_EDGE: JSON.stringify(process.env.EXPO_PUBLIC_I18N_EDGE || '')
    },
    // Define import.meta for web compatibility
    'import.meta': {
      env: {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        MODE: JSON.stringify(process.env.NODE_ENV || 'development')
      },
      url: 'typeof window !== "undefined" ? window.location.href : "http://localhost"'
    }
  };
  
  if (definePlugin) {
    // Add to existing definitions
    Object.assign(definePlugin.definitions, definitions);
  } else {
    // Create new DefinePlugin
    config.plugins.push(new webpack.DefinePlugin(definitions));
  }

  // Handle ES modules properly
  config.module.rules.push({
    test: /\.m?js$/,
    resolve: {
      fullySpecified: false,
    },
  });

  // Configure for cloud environments like Bolt.new
  if (process.env.NODE_ENV !== 'production') {
    config.devServer = {
      ...config.devServer,
      host: '0.0.0.0',
      port: 19006,
      allowedHosts: 'all',
    };
  }

  return config;
};
