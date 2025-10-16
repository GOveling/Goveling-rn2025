import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import LottieView from 'lottie-react-native';

interface AnimatedTabIconProps {
  focused: boolean;
  source: any;
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
          key={animationKey}
          ref={animationRef}
          source={source}
          style={styles.animation}
          loop={false}
          autoPlay={false}
          speed={1}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.label, { color: focused ? '#4F46E5' : '#6B7280' }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  animationContainer: {
    marginBottom: 2,
    overflow: 'hidden',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AnimatedTabIcon;
