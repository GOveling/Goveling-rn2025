import React from 'react';

import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';
import type { ModerationResponse } from '@/services/moderationService';

interface ContentRejectedModalProps {
  visible: boolean;
  result: ModerationResponse | null;
  onEdit: () => void;
  onCancel: () => void;
  onViewGuidelines: () => void;
}

export const ContentRejectedModal: React.FC<ContentRejectedModalProps> = ({
  visible,
  result,
  onEdit,
  onCancel,
  onViewGuidelines,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!result || result.approved) return null;

  const hasTextIssue = result.text_result && !result.text_result.is_clean;
  const hasImageIssue = result.image_result && !result.image_result.is_safe;
  const detectedWords = result.text_result?.detected_words || [];
  const cleanedText = result.text_result?.cleaned_text;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.iconContainer, { backgroundColor: colors.social.error }]}>
              <Ionicons name="alert-circle" size={48} color="#FFFFFF" />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {t('moderation.content_rejected')}
            </Text>

            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('moderation.inappropriate_content')}
            </Text>

            {hasTextIssue && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="text" size={20} color={colors.social.error} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('moderation.text.title')}
                  </Text>
                </View>

                <Text style={[styles.sectionText, { color: colors.textMuted }]}>
                  {t('moderation.text.message')}
                </Text>

                {detectedWords.length > 0 && (
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
                          <Text style={[styles.wordText, { color: colors.social.error }]}>
                            {word}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {cleanedText && (
                  <View
                    style={[styles.cleanedTextContainer, { backgroundColor: colors.background }]}
                  >
                    <Text style={[styles.cleanedLabel, { color: colors.textMuted }]}>
                      {t('moderation.text.clean_text')}:
                    </Text>
                    <Text style={[styles.cleanedText, { color: colors.text }]}>{cleanedText}</Text>
                  </View>
                )}

                <Text style={[styles.suggestion, { color: colors.textMuted }]}>
                  {t('moderation.text.suggestion')}
                </Text>
              </View>
            )}

            {hasImageIssue && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="image" size={20} color={colors.social.error} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('moderation.image.title')}
                  </Text>
                </View>

                <Text style={[styles.sectionText, { color: colors.textMuted }]}>
                  {t('moderation.image.message')}
                </Text>

                {result.image_result?.labels && result.image_result.labels.length > 0 && (
                  <View style={styles.labelsContainer}>
                    {result.image_result.labels.map((label, index) => (
                      <View key={index} style={styles.labelRow}>
                        <Ionicons name="warning" size={16} color={colors.social.error} />
                        <Text style={[styles.labelText, { color: colors.text }]}>
                          {t(`moderation.image.categories.${label.name}`, label.name)}
                        </Text>
                        <Text style={[styles.confidenceText, { color: colors.textMuted }]}>
                          {Math.round(label.confidence)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={[styles.suggestion, { color: colors.textMuted }]}>
                  {t('moderation.image.suggestion')}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.guidelinesButton} onPress={onViewGuidelines}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.guidelinesText, { color: colors.primary }]}>
                {t('moderation.actions.view_guidelines')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

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
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  wordsContainer: {
    marginVertical: 12,
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
  cleanedTextContainer: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
  },
  cleanedLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  cleanedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  suggestion: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  labelsContainer: {
    marginVertical: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  labelText: {
    flex: 1,
    fontSize: 14,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guidelinesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  guidelinesText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
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
    // backgroundColor from colors.primary
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
