import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { getOAuthConfig, getPlatformInfo } from '../src/lib/google-oauth';

export default function AuthDebugger() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  const testSupabaseConfig = async () => {
    try {
      addLog('🔍 Testing Supabase configuration...');
      
      // Test 1: Check environment variables
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      addLog(`📍 Supabase URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
      addLog(`🔑 Supabase Key: ${supabaseKey ? 'Set' : 'Missing'}`);
      
      // Test 2: Check Google OAuth config
      const oauthConfig = getOAuthConfig();
      const platformInfo = getPlatformInfo();
      
      addLog(`🔧 Platform: ${platformInfo.platform}`);
      addLog(`🎯 Client ID: ${platformInfo.clientId.substring(0, 20)}...`);
      addLog(`🔗 Redirect URL: ${oauthConfig.redirectUrl}`);
      
      // Test 3: Check Supabase connection
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        addLog(`❌ Supabase connection error: ${error.message}`);
      } else {
        addLog(`✅ Supabase connection successful`);
        addLog(`📊 Current session: ${data.session ? 'Authenticated' : 'Not authenticated'}`);
      }
      
      // Test 4: Check Google OAuth provider configuration
      addLog('🔍 Testing OAuth providers...');
      // This is a mock test since we can't directly query Supabase providers
      addLog('📋 Note: Verify in Supabase Dashboard > Authentication > Providers');
      addLog('📋 Google OAuth should be enabled with correct Client ID and Secret');
      
    } catch (error: any) {
      addLog(`💥 Test failed: ${error.message}`);
    }
  };

  const testOAuthFlow = async () => {
    setTesting(true);
    try {
      addLog('🚀 Testing OAuth flow...');
      
      const oauthConfig = getOAuthConfig();
      addLog(`📍 Using redirect URL: ${oauthConfig.redirectUrl}`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthConfig.redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          scopes: 'openid email profile'
        }
      });

      if (error) {
        addLog(`❌ OAuth setup failed: ${error.message}`);
      } else {
        addLog(`✅ OAuth setup successful`);
        if (data?.url) {
          addLog(`🔗 OAuth URL generated: ${data.url.substring(0, 50)}...`);
        }
      }
      
    } catch (error: any) {
      addLog(`💥 OAuth test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Auth Debugger</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testSupabaseConfig}>
          <Text style={styles.buttonText}>Test Config</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: testing ? '#ccc' : '#34D399' }]} 
          onPress={testOAuthFlow}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? 'Testing...' : 'Test OAuth'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, { backgroundColor: '#EF4444' }]} onPress={clearLogs}>
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.logContainer} showsVerticalScrollIndicator={false}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
        {logs.length === 0 && (
          <Text style={styles.emptyText}>No logs yet. Click "Test Config" to start.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    margin: 8,
    borderRadius: 12,
    padding: 16,
    maxHeight: 300,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logContainer: {
    maxHeight: 180,
  },
  logText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
