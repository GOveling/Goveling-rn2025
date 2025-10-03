const { withPlugins } = require('@expo/config-plugins');

const withReactNativeMaps = (config) => {
  // Configuración para iOS
  if (config.ios) {
    config.ios.infoPlist = config.ios.infoPlist || {};
  }

  // Configuración para Android
  if (config.android) {
    config.android.permissions = config.android.permissions || [];
    if (!config.android.permissions.includes('android.permission.ACCESS_FINE_LOCATION')) {
      config.android.permissions.push('android.permission.ACCESS_FINE_LOCATION');
    }
    if (!config.android.permissions.includes('android.permission.ACCESS_COARSE_LOCATION')) {
      config.android.permissions.push('android.permission.ACCESS_COARSE_LOCATION');
    }
  }

  return config;
};

module.exports = withReactNativeMaps;
