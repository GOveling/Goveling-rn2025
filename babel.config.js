module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '~': './src',
            '@': './src',
          },
        },
      ],
      // Transform import.meta for all platforms
      './babel-plugin-transform-import-meta-custom.js',
      // Reanimated plugin MUST be listed last
      'react-native-reanimated/plugin',
    ],
    env: {
      web: {
        plugins: [['@babel/plugin-syntax-import-meta']],
      },
    },
  };
};
