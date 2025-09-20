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
  
  if (definePlugin) {
    // Add import.meta to existing definitions
    definePlugin.definitions['import.meta'] = {
      env: {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        MODE: JSON.stringify(process.env.NODE_ENV || 'development')
      },
      url: 'typeof window !== "undefined" ? window.location.href : "http://localhost"'
    };
  } else {
    // Create new DefinePlugin
    config.plugins.push(
      new webpack.DefinePlugin({
        'import.meta': {
          env: {
            NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
            MODE: JSON.stringify(process.env.NODE_ENV || 'development')
          },
          url: 'typeof window !== "undefined" ? window.location.href : "http://localhost"'
        }
      })
    );
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
