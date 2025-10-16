import React, { useState, useEffect, useRef } from 'react';

import { View, Text, Modal, Animated, Dimensions, StyleSheet } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Step {
  title: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
}

const steps: Step[] = [
  {
    title: '¡Bienvenido a Go Travel Connect!',
    color: '#8B5CF6',
    icon: 'sparkles',
    gradient: ['#8B5CF6', '#A855F7'],
  },
  {
    title: 'Explora el Mundo',
    color: '#3B82F6',
    icon: 'location',
    gradient: ['#3B82F6', '#6366F1'],
  },
  {
    title: 'Conecta con Viajeros',
    color: '#10B981',
    icon: 'people',
    gradient: ['#10B981', '#059669'],
  },
  {
    title: 'Planifica tu Próxima Aventura',
    color: '#F59E0B',
    icon: 'calendar',
    gradient: ['#F59E0B', '#D97706'],
  },
];

// Confetti Particle Component
const ConfettiParticle: React.FC<{
  index: number;
  isActive: boolean;
}> = ({ index, isActive }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      const delay = index * 100;

      Animated.parallel([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 5000,
          delay,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.timing(rotationValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          { iterations: -1 }
        ),
      ]).start();
    }
  }, [isActive, index]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height],
  });

  const translateX = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, (Math.random() - 0.5) * width * 0.8, (Math.random() - 0.5) * width],
  });

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const color = colors[index % colors.length];

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          transform: [{ translateX }, { translateY }, { rotate: rotation }],
        },
      ]}
    />
  );
};

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setShowConfetti(true);

      // Start entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Step progression timer
      const stepTimer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1200); // 1.2 seconds per step

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      }).start();

      // Auto-close timer
      const closeTimer = setTimeout(() => {
        setShowConfetti(false);

        // Exit animation
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
        });
      }, 5000);

      return () => {
        clearInterval(stepTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [isOpen]);

  const currentStepData = steps[currentStep];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Confetti Particles */}
        {showConfetti && (
          <View style={styles.confettiContainer}>
            {Array.from({ length: 12 }, (_, index) => (
              <ConfettiParticle key={index} index={index} isActive={showConfetti} />
            ))}
          </View>
        )}

        {/* Main Content */}
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={currentStepData.gradient as [string, string]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name={currentStepData.icon} size={80} color="white" style={styles.icon} />
            </View>

            {/* Title */}
            <Text style={styles.title}>{currentStepData.title}</Text>

            {/* Step Indicators */}
            <View style={styles.dotsContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: index === currentStep ? 'white' : 'rgba(255,255,255,0.3)',
                      transform: [{ scale: index === currentStep ? 1.2 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  confettiContainer: {
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  confettiParticle: {
    borderRadius: 4,
    height: 8,
    left: width / 2,
    position: 'absolute',
    top: height + 50,
    width: 8,
  },
  container: {
    borderRadius: 24,
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.3)',
    elevation: 20,
    elevation: 20,
    height: height * 0.6,
    overflow: 'hidden',
    width: width * 0.85,
  },
  dot: {
    borderRadius: 6,
    height: 12,
    marginHorizontal: 6,
    width: 12,
  },
  dotsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  gradient: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 40,
  },
  icon: {
    textShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    marginBottom: 30,
    padding: 20,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flex: 1,
    justifyContent: 'center',
  },
  progressBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
  },
  progressBar: {
    backgroundColor: 'white',
    borderRadius: 2,
    height: '100%',
  },
  progressContainer: {
    marginTop: 20,
    width: '100%',
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    marginBottom: 40,
    textAlign: 'center',
    textShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
  },
});
