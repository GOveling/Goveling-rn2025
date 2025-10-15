import React from 'react';
import { View, Animated, Easing } from 'react-native';

interface PullToRefreshAnimationProps {
  refreshing: boolean;
  size?: number;
  color?: string;
}

const PullToRefreshAnimation: React.FC<PullToRefreshAnimationProps> = ({ 
  refreshing, 
  size = 24, 
  color = '#4A90E2' 
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (refreshing) {
      // Start spinning animation
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      return () => {
        spinAnimation.stop();
        spinValue.setValue(0);
      };
    } else {
      // Reset animation when not refreshing
      spinValue.setValue(0);
    }
  }, [refreshing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!refreshing) return null;

  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          borderTopColor: 'transparent',
          transform: [{ rotate: spin }],
        }}
      />
    </View>
  );
};

export default PullToRefreshAnimation;