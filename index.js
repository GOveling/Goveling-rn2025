// Load essential polyfills before any other imports
import './src/polyfills/process-env.js';
import './src/polyfills/import-meta.js';

// Re-export everything from expo-router/entry
export * from 'expo-router/entry';