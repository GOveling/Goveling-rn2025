const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withReactNativeVectorIcons = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // Copy fonts to android assets
      const fontsDir = path.join(
        config.modRequest.projectRoot,
        'node_modules/react-native-vector-icons/Fonts'
      );
      const androidAssetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/assets/fonts'
      );

      if (fs.existsSync(fontsDir)) {
        if (!fs.existsSync(androidAssetsDir)) {
          fs.mkdirSync(androidAssetsDir, { recursive: true });
        }

        const fonts = fs.readdirSync(fontsDir);
        fonts.forEach((font) => {
          const src = path.join(fontsDir, font);
          const dest = path.join(androidAssetsDir, font);
          if (!fs.existsSync(dest)) {
            fs.copyFileSync(src, dest);
          }
        });
      }

      return config;
    },
  ]);
};

module.exports = withReactNativeVectorIcons;
