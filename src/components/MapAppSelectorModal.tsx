// src/components/MapAppSelectorModal.tsx
import React from 'react';

import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';

import { BlurView } from 'expo-blur';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../lib/theme';

interface MapAppSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  appleUrl: string;
  googleUrl: string;
  wazeUrl: string;
  destinationName?: string;
}

export default function MapAppSelectorModal({
  visible,
  onClose,
  appleUrl,
  googleUrl,
  wazeUrl,
  destinationName,
}: MapAppSelectorModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleSelectApp = async (url: string | undefined) => {
    try {
      if (!url) {
        console.error('URL is undefined or null');
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening map app:', error);
    } finally {
      onClose();
    }
  };

  if (Platform.OS !== 'ios') {
    // En Android, abrir directamente Google Maps y no mostrar el modal
    if (visible) {
      handleSelectApp(googleUrl);
    }
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.container}>
          <BlurView intensity={100} tint={theme.mode} style={styles.blurContainer}>
            <View style={[styles.content, { backgroundColor: theme.colors.card }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <Ionicons name="map" size={24} color={theme.colors.primary} />
                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    {t('transit.select_map_app') || 'Abrir en Maps'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {destinationName && (
                <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                  {t('transit.directions_to') || 'Direcciones a'} {destinationName}
                </Text>
              )}

              {/* Map Apps Options */}
              <View style={styles.options}>
                {/* Apple Maps */}
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                    },
                  ]}
                  onPress={() => handleSelectApp(appleUrl)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
                      },
                    ]}
                  >
                    <Ionicons name="map" size={28} color="#007AFF" />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                      {t('transit.apple_maps') || 'Apple Maps'}
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: theme.colors.textMuted }]}>
                      {t('transit.apple_maps_desc') || 'Predeterminado de iOS'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>

                {/* Google Maps */}
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                    },
                  ]}
                  onPress={() => handleSelectApp(googleUrl)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
                      },
                    ]}
                  >
                    <Ionicons name="navigate" size={28} color="#4285F4" />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                      {t('transit.google_maps') || 'Google Maps'}
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: theme.colors.textMuted }]}>
                      {t('transit.google_maps_desc') ||
                        'Con información de tránsito en tiempo real'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>

                {/* Waze */}
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                    },
                  ]}
                  onPress={() => handleSelectApp(wazeUrl)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
                      },
                    ]}
                  >
                    <Ionicons name="navigate-circle" size={28} color="#33CCFF" />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                      {t('transit.waze') || 'Waze'}
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: theme.colors.textMuted }]}>
                      {t('transit.waze_desc') || 'Navegación comunitaria con alertas de tráfico'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    marginLeft: 36,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
  },
});
