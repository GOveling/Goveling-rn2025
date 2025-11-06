/**
 * PlaceVisitModal - Congratulations modal when user arrives at a place
 * Shows place details and allows user to confirm or skip visit
 * Optimized for iOS & Android native hardware
 */

import React, { useEffect, useRef } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

import { processPlaceCategories } from '~/lib/categoryProcessor';
import { useTheme } from '~/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlaceVisitModalProps {
  visible: boolean;
  placeName: string;
  placeTypes?: string[];
  distance: number; // meters
  dwellingTime: number; // seconds
  onConfirm: () => void;
  onSkip: () => void;
}

export function PlaceVisitModal({
  visible,
  placeName,
  placeTypes = [],
  distance,
  dwellingTime,
  onConfirm,
  onSkip,
}: PlaceVisitModalProps) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      // Play confetti animation
      confettiRef.current?.play();

      // Animate modal entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const getPlaceIcon = (): string => {
    if (!placeTypes || placeTypes.length === 0) return '📍';

    const type = placeTypes[0]?.toLowerCase();

    if (type.includes('airport')) return '✈️';
    if (type.includes('stadium')) return '🏟️';
    if (type.includes('park')) return '🌳';
    if (type.includes('museum')) return '🏛️';
    if (type.includes('restaurant')) return '🍽️';
    if (type.includes('cafe') || type.includes('coffee')) return '☕';
    if (type.includes('hotel') || type.includes('lodging')) return '🏨';
    if (type.includes('shopping') || type.includes('mall')) return '🛍️';
    if (type.includes('beach')) return '🏖️';
    if (type.includes('mountain')) return '⛰️';
    if (type.includes('church') || type.includes('temple')) return '⛪';
    if (type.includes('tourist')) return '🗺️';

    return '📍';
  };

  const getPlaceCategory = (): string => {
    if (!placeTypes || placeTypes.length === 0) return 'Lugar';

    // Usar processPlaceCategories para obtener la categoría formateada correctamente
    const processed = processPlaceCategories(placeTypes, undefined, 1);
    return processed[0] || 'Lugar de Interés';
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Confetti Animation - Full Screen */}
        <LottieView
          ref={confettiRef}
          source={require('../../../assets/animations/confetti.json')}
          style={styles.confetti}
          loop={false}
          autoPlay={false}
        />

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>{getPlaceIcon()}</Text>
              </View>
              <View style={styles.checkmarkBadge}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>¡Has Llegado!</Text>

            {/* Place Info Card */}
            <View
              style={[
                styles.placeCard,
                {
                  backgroundColor:
                    theme.mode === 'dark' ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                },
              ]}
            >
              <Text style={[styles.placeName, { color: theme.colors.text }]} numberOfLines={2}>
                {placeName}
              </Text>
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor: theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
                  },
                ]}
              >
                <Text style={styles.categoryText}>{getPlaceCategory()}</Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="location" size={16} color="#6366F1" />
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>
                    {distance.toFixed(0)}m
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                    Distancia
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

                <View style={styles.statItem}>
                  <Ionicons name="time" size={16} color="#6366F1" />
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>
                    {Math.round(dwellingTime)}s
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Tiempo</Text>
                </View>
              </View>
            </View>

            {/* Subtitle */}
            <Text style={styles.subtitle}>¿Confirmas tu visita?</Text>
            <Text style={styles.description}>
              Tu visita se guardará en tus estadísticas de viaje
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Confirmar Visita</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
                onPress={onSkip}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>Saltar</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confetti: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: '100%',
    zIndex: 0,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 40,
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  placeCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  placeName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
