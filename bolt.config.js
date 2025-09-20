// Bolt configuration for Expo React Native project
module.exports = {
  // Project type
  type: 'expo',
  framework: 'expo',
  
  // Commands override - force Bolt to use these
  commands: {
    dev: 'expo start --web',
    start: 'expo start --web',
    build: 'expo export --platform web',
    preview: 'expo start --web'
  },
  
  // Package manager
  packageManager: 'npm',
  
  // Main entry points
  entry: {
    web: './App.tsx',
    native: 'expo-router/entry'
  },
  
  // Development server configuration
  devServer: {
    command: 'expo start --web',
    port: 19006,
    host: '0.0.0.0'
  },
  
  // Build configuration
  build: {
    web: {
      bundler: 'metro',
      command: 'expo export --platform web'
    }
  },
  
  // Platform-specific settings
  platforms: ['web', 'ios', 'android'],
  
  // Environment variables
  env: {
    NODE_ENV: 'development',
    EXPO_USE_FAST_RESOLVER: 'true',
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  }
};
