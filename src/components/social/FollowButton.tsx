import React, { useState } from 'react';

import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

import * as Haptics from 'expo-haptics';

import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';

interface FollowButtonProps {
  isFollowing: boolean;
  onPress: () => Promise<void>;
  compact?: boolean;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  isFollowing,
  onPress,
  compact = false,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics might not be available
    }

    setIsLoading(true);
    try {
      await onPress();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        compact && styles.compactButton,
        isFollowing
          ? { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 }
          : { backgroundColor: colors.primary },
      ]}
      onPress={handlePress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? 'Unfollow user' : 'Follow user'}
      accessibilityHint={isFollowing ? 'Stop following this user' : 'Start following this user'}
      accessibilityState={{ disabled: isLoading, busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isFollowing ? colors.text : '#FFFFFF'} />
      ) : (
        <Text
          style={[
            styles.text,
            compact && styles.compactText,
            isFollowing ? { color: colors.text } : { color: '#FFFFFF' },
          ]}
        >
          {isFollowing ? t('social.following') : t('social.follow')}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  compactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
  },
  text: {
    fontWeight: '600',
    fontSize: 14,
  },
  compactText: {
    fontSize: 12,
  },
});
