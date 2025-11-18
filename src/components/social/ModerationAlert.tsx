import React from 'react';

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';

interface ModerationAlertProps {
  visible: boolean;
  type: 'text' | 'image';
  detectedWords?: string[];
  onEdit: () => void;
  onCancel: () => void;
}

export const ModerationAlert: React.FC<ModerationAlertProps> = ({
  visible,
  type,
  detectedWords,
  onEdit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.social.error }]}>
          <Ionicons name="alert-circle" size={32} color="#FFFFFF" />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {type === 'text' ? t('moderation.text.title') : t('moderation.image.title')}
        </Text>

        <Text style={[styles.message, { color: colors.textMuted }]}>
          {type === 'text' ? t('moderation.text.message') : t('moderation.image.message')}
        </Text>

        {type === 'text' && detectedWords && detectedWords.length > 0 && (
          <View style={styles.wordsContainer}>
            <Text style={[styles.wordsLabel, { color: colors.textMuted }]}>
              {t('moderation.text.detected')}:
            </Text>
            <View style={styles.wordsList}>
              {detectedWords.map((word, index) => (
                <View
                  key={index}
                  style={[styles.wordChip, { backgroundColor: colors.social.error + '20' }]}
                >
                  <Text style={[styles.wordText, { color: colors.social.error }]}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              {t('moderation.actions.cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.editButton, { backgroundColor: colors.primary }]}
            onPress={onEdit}
          >
            <Text style={[styles.editButtonText, { color: colors.primaryText }]}>
              {t('moderation.actions.edit')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  wordsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  wordsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  wordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  wordText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  editButton: {
    // backgroundColor set from colors.primary
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
