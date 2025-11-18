import React from 'react';

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';

interface UploadProgressProps {
  current: number;
  total: number;
  stage: 'compressing' | 'uploading' | 'moderating' | 'processing';
  visible: boolean;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  current,
  total,
  stage,
  visible,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!visible) return null;

  const getStageMessage = (): string => {
    switch (stage) {
      case 'compressing':
        return t('social.create.compressing_image', { current, total });
      case 'uploading':
        return t('social.create.uploading_progress', { current, total });
      case 'moderating':
        return t('social.create.moderating');
      case 'processing':
        return t('social.create.processing');
      default:
        return t('common.loading');
    }
  };

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.message, { color: colors.text }]}>{getStageMessage()}</Text>
        {stage !== 'moderating' && stage !== 'processing' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    minWidth: 200,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
});
