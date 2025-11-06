import React, { useRef, useEffect, useState, useMemo } from 'react';

import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

import LottieView, { type AnimationObject } from 'lottie-react-native';

import { COLORS } from '~/constants/colors';
import { useTheme } from '~/lib/theme';
import { colorizeLottie } from '~/utils/lottieColorizer';

interface AnimatedTabIconProps {
  focused: boolean;
  source: string | { uri: string } | AnimationObject;
  label: string;
  size?: number;
}

export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  focused,
  source,
  label,
  size = 32,
}) => {
  const animationRef = useRef<LottieView>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const lastFocusTimeRef = useRef(0);
  const theme = useTheme();

  // Colorizar la animación según el tema usando la utilidad
  const themedSource = useMemo(() => {
    // Si source es un AnimationObject, colorizarlo
    if (typeof source === 'object' && 'v' in source) {
      return colorizeLottie(
        source as AnimationObject,
        theme.mode === 'dark' ? '#E5E7EB' : '#000000'
      );
    }
    return source;
  }, [source, theme.mode]);

  useEffect(() => {
    if (focused) {
      const now = Date.now();
      // Si han pasado más de 100ms desde el último focus, es un nuevo click
      if (now - lastFocusTimeRef.current > 100) {
        setAnimationKey((prev) => prev + 1);
        lastFocusTimeRef.current = now;
      }
    }
  }, [focused]);

  // Forzar re-render cuando cambia el tema
  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [theme.mode]);

  // Efecto separado para reproducir la animación cuando cambia el key
  useEffect(() => {
    if (focused && animationRef.current) {
      setTimeout(() => {
        animationRef.current?.reset();
        animationRef.current?.play();
      }, 10);
    }
  }, [animationKey, focused]);

  return (
    <View style={styles.container}>
      <View style={[styles.animationContainer, { width: size, height: size }]}>
        <LottieView
          key={`${animationKey}-${theme.mode}`}
          ref={animationRef}
          source={themedSource}
          style={styles.animation}
          loop={false}
          autoPlay={false}
          speed={1}
          resizeMode="contain"
        />
      </View>
      <Text
        style={[
          styles.label,
          focused
            ? { color: theme.mode === 'dark' ? '#60a5fa' : COLORS.border.indigo }
            : { color: theme.mode === 'dark' ? 'rgba(229, 231, 235, 0.6)' : COLORS.text.tertiary },
        ]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create<{
  animation: ViewStyle;
  animationContainer: ViewStyle;
  container: ViewStyle;
  label: TextStyle;
}>({
  animation: {
    height: '100%',
    width: '100%',
  },
  animationContainer: {
    marginBottom: 2,
    overflow: 'hidden',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 60,
    // Force single line on all platforms
    lineHeight: 12,
    height: 12,
  },
});

export default AnimatedTabIcon;
