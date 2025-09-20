
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin',
      ['module-resolver', {
        alias: { 
          '~': './src',
          '@': './src'
        }
      }],
      // Transform import.meta for all platforms
      './babel-plugin-transform-import-meta-custom.js'
    ],
    env: {
      web: {
        plugins: [
          ['@babel/plugin-syntax-import-meta']
        ]
      }
    }
  };
};
