import React, { useState } from 'react';

import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';

interface CommentInputProps {
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
}

export const CommentInput: React.FC<CommentInputProps> = ({ onSubmit, placeholder }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = text.length;
  const maxCharacters = 500;
  const showCounter = characterCount > 400;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      {showCounter && (
        <Text style={[styles.counter, { color: isOverLimit ? '#FF3B30' : colors.textMuted }]}>
          {characterCount}/{maxCharacters}
        </Text>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          placeholder={placeholder || t('social.add_comment')}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={maxCharacters}
          editable={!isSubmitting}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: text.trim() && !isOverLimit ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSubmit}
          disabled={!text.trim() || isSubmitting || isOverLimit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={text.trim() && !isOverLimit ? '#FFFFFF' : colors.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  counter: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1,
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
