import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPlatformInfo } from '~/lib/google-oauth';

interface ExpoGoOAuthInfoProps {
  isDark?: boolean;
}

export default function ExpoGoOAuthInfo({ isDark = false }: ExpoGoOAuthInfoProps) {
  const platformInfo = getPlatformInfo();
  
  if (!platformInfo.inExpoGo) {
    return null; // Solo mostrar en Expo Go
  }
  
  const showInfo = () => {
    Alert.alert(
      "Autenticación en Expo Go",
      "Estás usando Expo Go, por lo que Google OAuth se ejecutará en el navegador web. Esto es normal y seguro.\n\n" +
      "Para autenticación nativa (sin navegador), necesitarías compilar una versión standalone de la app.\n\n" +
      "La autenticación funcionará correctamente, solo que se abrirá en el navegador.",
      [{ text: "Entendido", style: "default" }]
    );
  };

  const textColor = isDark ? '#FFFFFF' : '#333333';
  const backgroundColor = isDark ? '#1F2937' : '#F3F4F6';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <Ionicons 
        name="information-circle-outline" 
        size={20} 
        color={isDark ? '#60A5FA' : '#3B82F6'} 
      />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: textColor }]}>
          Modo Expo Go
        </Text>
        <Text style={[styles.subtitle, { color: textColor, opacity: 0.7 }]}>
          OAuth se ejecutará en navegador web
        </Text>
      </View>
      <Ionicons 
        name="help-circle-outline" 
        size={20} 
        color={isDark ? '#9CA3AF' : '#6B7280'}
        onPress={showInfo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
