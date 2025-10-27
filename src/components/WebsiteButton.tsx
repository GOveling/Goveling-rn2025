// src/components/WebsiteButton.tsx
import React from 'react';

import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';

import * as WebBrowser from 'expo-web-browser';

import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';

interface WebsiteButtonProps {
  url?: string | null;
  title?: string;
  style?: object;
  disabled?: boolean;
}

export default function WebsiteButton({
  url,
  title = 'Visitar sitio web',
  style,
  disabled = false,
}: WebsiteButtonProps) {
  const handlePress = async () => {
    if (!url || !url.trim()) {
      Alert.alert('Sitio web no disponible', 'No hay sitio web para mostrar');
      return;
    }

    try {
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      console.log('🌐 Opening website in in-app browser:', normalizedUrl);

      await WebBrowser.openBrowserAsync(normalizedUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.OVER_FULL_SCREEN,
        controlsColor: COLORS.primary.main,
        toolbarColor: COLORS.background.primary,
        showTitle: true,
        enableBarCollapsing: false,
      });
    } catch (error) {
      console.error('Error opening in-app browser:', error);
      Alert.alert('Error', 'No se pudo abrir el sitio web');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled || !url}
      activeOpacity={0.8}
    >
      <Ionicons
        name="globe-outline"
        size={20}
        color={disabled ? COLORS.text.secondary : COLORS.text.primary}
        style={styles.icon}
      />
      <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary.main,
  },
  disabled: {
    backgroundColor: COLORS.background.secondary,
    opacity: 0.6,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.background.primary,
  },
  textDisabled: {
    color: COLORS.text.secondary,
  },
  icon: {
    marginRight: 8,
  },
});
