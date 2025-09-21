import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { getPlatformInfo } from '../src/lib/google-oauth';

export default function SupabaseConfig() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        // Get Supabase config
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        const platformInfo = getPlatformInfo();
        
        const configInfo = {
          supabaseUrl,
          supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Not found',
          currentUrl: typeof window !== 'undefined' ? window.location.href : 'Native app',
          currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'Native app',
          platform: platformInfo.platform,
          currentClientId: platformInfo.clientId,
          allClientIds: platformInfo.allClientIds
        };
        
        setConfig(configInfo);
      } catch (error) {
        console.error('Config check error:', error);
      }
    };

    checkConfig();
  }, []);

  if (!config) {
    return <Text>Loading config...</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Supabase & OAuth Config</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Info:</Text>
        <Text style={styles.item}>Current Platform: {config.platform}</Text>
        <Text style={styles.item}>Current Client ID: {config.currentClientId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Client IDs:</Text>
        <Text style={styles.item}>Web: {config.allClientIds.web}</Text>
        <Text style={styles.item}>iOS: {config.allClientIds.ios}</Text>
        <Text style={styles.item}>Android: {config.allClientIds.android}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environment:</Text>
        <Text style={styles.item}>Supabase URL: {config.supabaseUrl}</Text>
        <Text style={styles.item}>Supabase Key: {config.supabaseKey}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Location:</Text>
        <Text style={styles.item}>URL: {config.currentUrl}</Text>
        <Text style={styles.item}>Origin: {config.currentOrigin}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    margin: 10,
    borderRadius: 8,
    maxHeight: 200,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  item: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});
