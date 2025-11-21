import React, { useEffect } from 'react';

import { TouchableOpacity } from 'react-native';

import * as Haptics from 'expo-haptics';

import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { useTheme } from '@/lib/theme';

interface LikeButtonProps {
  isLiked: boolean;
  onPress: () => void;
  size?: number;
}

export const LikeButton: React.FC<LikeButtonProps> = ({ isLiked, onPress, size = 24 }) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isLiked) {
      scale.value = withSequence(withSpring(1.2), withSpring(1));
    } else {
      scale.value = 1;
    }
  }, [isLiked, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics might not be available on all devices
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isLiked ? 'Unlike post' : 'Like post'}
      accessibilityHint={isLiked ? 'Remove like from this post' : 'Add like to this post'}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={size}
          color={isLiked ? '#FF3B30' : colors.text}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};
