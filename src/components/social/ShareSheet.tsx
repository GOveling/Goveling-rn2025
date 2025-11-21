import React from 'react';

import { View, Text, StyleSheet, TouchableOpacity, Modal, Share, Alert } from 'react-native';

import * as Clipboard from 'expo-clipboard';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postUrl?: string;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ visible, onClose, postId, postUrl }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const shareUrl = postUrl || `https://goveling.com/post/${postId}`;

  const handleShare = async (platform: 'native' | 'copy') => {
    try {
      if (platform === 'native') {
        await Share.share({
          message: `${t('social.share.check_out_post')}\n${shareUrl}`,
          url: shareUrl,
        });
      } else if (platform === 'copy') {
        await Clipboard.setStringAsync(shareUrl);
        Alert.alert(t('social.share.link_copied_title'), t('social.share.link_copied_message'));
      }
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert(t('common.error'), t('social.share.error'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />

          <Text style={[styles.title, { color: colors.text }]}>{t('social.share.title')}</Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.option} onPress={() => handleShare('native')}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                <Ionicons name="share-social" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                {t('social.share.share')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={() => handleShare('copy')}>
              <View style={[styles.iconContainer, { backgroundColor: colors.border }]}>
                <Ionicons name="copy" size={24} color={colors.text} />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                {t('social.share.copy_link')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, { borderTopColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#C4C4C4',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  option: {
    alignItems: 'center',
    width: 80,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 13,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
