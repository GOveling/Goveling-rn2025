import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Safe environment variable access for Expo Go compatibility
function getEnvVar(key: string): string | undefined {
  try {
    // Try Constants first (works best in Expo Go)
    const expoConfig = Constants.expoConfig;
    if (expoConfig?.extra?.[key]) {
      return expoConfig.extra[key];
    }
    
    // Fallback to process.env if available
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    console.warn(`[supabase] Could not access env var ${key}:`, e);
  }
  return undefined;
}

const url = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const anon = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// Fallback hardcoded values for Expo Go (desde tu .env)
const SUPABASE_URL = url || 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SUPABASE_ANON_KEY = anon || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[supabase] Missing Supabase configuration');
  throw new Error('Supabase configuration missing');
}

console.log('[supabase] Initializing with URL:', SUPABASE_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: false // Desactivar logs de debug en producción
  }
});
