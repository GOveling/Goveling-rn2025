import React from 'react';

import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '~/lib/theme';
import type { TransportMode } from '~/lib/useDirections';

interface DirectionsModeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectMode: (mode: TransportMode) => void;
  loading?: boolean;
}

interface ModeOption {
  mode: TransportMode;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function DirectionsModeSelector({
  visible,
  onClose,
  onSelectMode,
  loading = false,
}: DirectionsModeSelectorProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // DEBUG LOG
  console.log('🚦 [DirectionsModeSelector] RENDER - visible:', visible, 'loading:', loading);

  const modes: ModeOption[] = [
    {
      mode: 'walking',
      icon: 'walk',
      color: '#10B981',
    },
    {
      mode: 'cycling',
      icon: 'bicycle',
      color: '#3B82F6',
    },
    {
      mode: 'driving',
      icon: 'car',
      color: '#8B5CF6',
    },
    {
      mode: 'transit',
      icon: 'bus',
      color: '#F59E0B',
    },
  ];

  const handleSelectMode = (mode: TransportMode) => {
    if (!loading) {
      onSelectMode(mode);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={loading ? undefined : onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('explore.modal.directions_mode_selector_title')}
              </Text>
              {!loading && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={28} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              {t('explore.modal.directions_mode_selector_subtitle')}
            </Text>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                  {t('explore.modal.directions_calculating')}
                </Text>
              </View>
            )}

            {/* Mode Options */}
            {!loading && (
              <View style={styles.modesContainer}>
                {modes.map((modeOption) => (
                  <TouchableOpacity
                    key={modeOption.mode}
                    style={[
                      styles.modeButton,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => handleSelectMode(modeOption.mode)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.iconContainer, { backgroundColor: `${modeOption.color}20` }]}
                    >
                      <Ionicons name={modeOption.icon} size={26} color={modeOption.color} />
                    </View>
                    <View style={styles.modeTextContainer}>
                      <Text style={[styles.modeTitle, { color: theme.colors.text }]}>
                        {t(`explore.modal.transport_mode.${modeOption.mode}`)}
                      </Text>
                      <Text style={[styles.modeDescription, { color: theme.colors.textMuted }]}>
                        {t(`explore.modal.transport_mode.${modeOption.mode}_desc`)}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textMuted}
                      style={styles.chevron}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  container: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 20,
    lineHeight: 20,
  },
  closeButton: {
    padding: 0,
    marginLeft: 12,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  modesContainer: {
    gap: 10,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  modeDescription: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  chevron: {
    marginLeft: 8,
  },
});
