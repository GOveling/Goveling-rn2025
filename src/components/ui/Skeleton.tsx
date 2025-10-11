
// src/components/ui/Skeleton.tsx
import React, { useRef, useEffect } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { useTheme } from '../../lib/theme';

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: ViewStyle }) {
  const { colors, radius } = useTheme();
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={[{ height, width: width as any, backgroundColor: colors.border, borderRadius: radius.md, opacity: o }, style]} />
  );
}
