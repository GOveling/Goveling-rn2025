import React from 'react';

import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '~/lib/theme';
import { InterestLevel, INTEREST_LEVEL_CONFIG } from '~/types/place';

interface InterestLevelInfoModalProps {
  visible: boolean;
  onClose: () => void;
  level: InterestLevel;
  userNote?: string;
}

const InterestLevelInfoModal: React.FC<InterestLevelInfoModalProps> = ({
  visible,
  onClose,
  level,
  userNote,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const config = INTEREST_LEVEL_CONFIG[level];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.content, { backgroundColor: theme.colors.card }]}>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>

              {/* Icon and Title */}
              <View style={styles.header}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${config.color}20`, borderColor: config.color },
                  ]}
                >
                  <Text style={styles.icon}>{config.icon}</Text>
                </View>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  {t('placeInfo.savedAs')}
                </Text>
                <Text style={[styles.levelLabel, { color: config.color }]}>
                  {t(`placeSurvey.levels.${level}`)}
                </Text>
              </View>

              {/* User Note */}
              {userNote && (
                <View style={styles.noteContainer}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteEmoji}>💭</Text>
                    <Text style={[styles.noteTitle, { color: theme.colors.text }]}>
                      {t('placeInfo.yourNote')}
                    </Text>
                  </View>
                  <Text style={[styles.noteText, { color: theme.colors.textMuted }]}>
                    {userNote}
                  </Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  levelLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  noteContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 24,
  },
});

export default InterestLevelInfoModal;
