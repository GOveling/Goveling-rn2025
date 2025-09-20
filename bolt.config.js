// Bolt configuration for Expo React Native project
module.exports = {
  // Project type
  type: 'expo',
  
  // Main entry points
  entry: {
    web: './App.tsx',
    native: 'expo-router/entry'
  },
  
  // Development server configuration
  devServer: {
    port: 8081,
    host: '0.0.0.0'
  },
  
  // Build configuration
  build: {
    web: {
      bundler: 'metro'
    }
  },
  
  // Platform-specific settings
  platforms: ['web', 'ios', 'android'],
  
  // Environment variables
  env: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  }
};
