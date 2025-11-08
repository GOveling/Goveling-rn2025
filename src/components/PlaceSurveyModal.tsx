import React, { useState } from 'react';

import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import { useTheme } from '~/lib/theme';
import { InterestLevel, PlaceSurveyData, INTEREST_LEVEL_CONFIG } from '~/types/place';

interface PlaceSurveyModalProps {
  visible: boolean;
  placeName: string;
  onSubmit: (data: PlaceSurveyData) => void;
  onCancel: () => void;
}

const PlaceSurveyModal: React.FC<PlaceSurveyModalProps> = ({
  visible,
  placeName,
  onSubmit,
  onCancel,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [selectedLevel, setSelectedLevel] = useState<InterestLevel>('maybe');
  const [note, setNote] = useState('');

  console.log('🔍 PlaceSurveyModal render:', { visible, placeName });

  const interestLevels: InterestLevel[] = ['must_see', 'maybe', 'just_in_case'];

  const handleSubmit = () => {
    onSubmit({
      interest_level: selectedLevel,
      user_note: note.trim() || undefined,
    });
    // Reset state
    setNote('');
    setSelectedLevel('maybe');
  };

  const handleCancel = () => {
    setNote('');
    setSelectedLevel('maybe');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'overFullScreen'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              {/* Title */}
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('placeSurvey.title')}
              </Text>

              {/* Place Name */}
              <Text style={[styles.placeName, { color: theme.colors.primary }]}>{placeName}</Text>

              {/* Interest Level Label */}
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('placeSurvey.interestLevel')}
              </Text>

              {/* Interest Level Buttons */}
              <View style={styles.levelsContainer}>
                {interestLevels.map((level) => {
                  const config = INTEREST_LEVEL_CONFIG[level];
                  const isSelected = selectedLevel === level;

                  return (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.levelButton,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setSelectedLevel(level)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.levelIcon}>{config.icon}</Text>
                      <Text
                        style={[
                          styles.levelText,
                          {
                            color: isSelected ? '#fff' : theme.colors.text,
                          },
                        ]}
                      >
                        {t(`placeSurvey.levels.${level}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Note Label */}
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('placeSurvey.note')}{' '}
                <Text style={styles.optional}>({t('placeSurvey.optional')})</Text>
              </Text>

              {/* Note Input */}
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder={t('placeSurvey.notePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                value={note}
                onChangeText={setNote}
                maxLength={150}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: theme.colors.textMuted }]}>
                {note.length}/150
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, { borderColor: theme.colors.border }]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={handleSubmit}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submitButtonText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  optional: {
    fontWeight: '400',
    fontSize: 12,
    opacity: 0.7,
  },
  levelsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  levelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  levelIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlaceSurveyModal;
