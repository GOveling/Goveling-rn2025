// Only load polyfills in web environment
// Expo Go doesn't need these and they can cause issues
if (typeof window !== 'undefined' && !window.ExpoModules) {
  // We're in a web browser (not Expo Go)
  try {
    require('./src/polyfills/process-env.js');
  } catch (e) {
    console.warn('Could not load process-env polyfill:', e);
  }
}

// Re-export everything from expo-router/entry
export * from 'expo-router/entry';
