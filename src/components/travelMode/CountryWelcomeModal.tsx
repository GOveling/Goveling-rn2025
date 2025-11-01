/**
 * CountryWelcomeModal - Modal de bienvenida al llegar a un nuevo país
 * Muestra confeti, bandera, descripción del país, y lugares guardados
 * Optimizado para iOS y Android
 */

import React, { useEffect, useRef } from 'react';

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';

import { CountryInfo } from '~/services/travelMode/CountryDetectionService';

import { PhotoCarousel } from './PhotoCarousel';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SavedPlace {
  id: string;
  name: string;
  city?: string;
  type?: string;
}

interface CountryWelcomeModalProps {
  visible: boolean;
  countryInfo: CountryInfo;
  isReturn: boolean;
  savedPlaces: SavedPlace[]; // Lugares guardados en este país (max 5 mostrados)
  onClose: () => void;
}

export function CountryWelcomeModal({
  visible,
  countryInfo,
  isReturn,
  savedPlaces,
  onClose,
}: CountryWelcomeModalProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current; // Cambiado de 0 a 1 temporalmente
  const fadeAnim = useRef(new Animated.Value(1)).current; // Cambiado de 0 a 1 temporalmente
  const confettiRef = useRef<any>(null);

  // Debug: Log datos recibidos para diagnosticar
  useEffect(() => {
    if (visible && countryInfo) {
      console.log('🎭 CountryWelcomeModal - Datos recibidos:', {
        visible,
        countryCode: countryInfo.countryCode,
        countryName: countryInfo.countryName,
        countryFlag: countryInfo.countryFlag,
        continent: countryInfo.continent,
        capital: countryInfo.capital,
        population: countryInfo.population,
        language: countryInfo.language,
        descriptionLength: countryInfo.description?.length || 0,
        isReturn,
        savedPlacesCount: savedPlaces?.length || 0,
      });

      // DEBUG PHOTOS
      console.log('🖼️ CountryWelcomeModal - PHOTO DEBUG:', {
        hasPhotos: !!countryInfo.photos,
        photosLength: countryInfo.photos?.length || 0,
        photosArray: countryInfo.photos,
        willRenderCarousel: !!(countryInfo.photos && countryInfo.photos.length > 0),
      });
    }
  }, [visible, countryInfo, isReturn, savedPlaces]);

  useEffect(() => {
    if (visible) {
      // Trigger confetti
      if (confettiRef.current) {
        confettiRef.current.start();
      }

      // Animate modal entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
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
  }, [visible, scaleAnim, fadeAnim]);

  // Validación: No renderizar si no hay countryInfo
  if (!visible || !countryInfo) {
    console.log('🎭 CountryWelcomeModal - No renderizando:', {
      visible,
      hasCountryInfo: !!countryInfo,
    });
    return null;
  }

  console.log('🎭 CountryWelcomeModal - RENDERIZANDO MODAL con datos:', {
    countryName: countryInfo.countryName,
    capital: countryInfo.capital,
    population: countryInfo.population,
  });

  return (
    <Modal visible={true} transparent animationType="none" onRequestClose={onClose}>
      {/* Overlay */}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose} />

        {/* Modal Content - SIN animaciones por ahora */}
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{isReturn ? '¡Bienvenido de vuelta!' : '¡Bienvenido!'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Country Flag & Name */}
            <View style={styles.countrySection}>
              <Text style={styles.flag}>{countryInfo.countryFlag}</Text>
              <Text style={styles.countryName}>{countryInfo.countryName}</Text>
              <Text style={styles.continent}>{countryInfo.continent}</Text>
            </View>

            {/* Return Badge (if applicable) */}
            {isReturn && (
              <View style={styles.returnBadge}>
                <Ionicons name="repeat" size={18} color="#fff" />
                <Text style={styles.returnText}>Regreso a este país</Text>
              </View>
            )}

            {/* Country Stats */}
            {(countryInfo.capital ||
              countryInfo.population ||
              countryInfo.language ||
              countryInfo.currency) && (
              <View style={styles.statsSection}>
                {countryInfo.capital && (
                  <View style={styles.statRow}>
                    <Ionicons name="business" size={20} color="#007AFF" />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Capital</Text>
                      <Text style={styles.statValue}>{countryInfo.capital}</Text>
                    </View>
                  </View>
                )}

                {countryInfo.population && (
                  <View style={styles.statRow}>
                    <Ionicons name="people" size={20} color="#007AFF" />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Población</Text>
                      <Text style={styles.statValue}>{countryInfo.population}</Text>
                    </View>
                  </View>
                )}

                {countryInfo.language && (
                  <View style={styles.statRow}>
                    <Ionicons name="chatbubbles" size={20} color="#007AFF" />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Idioma</Text>
                      <Text style={styles.statValue}>{countryInfo.language}</Text>
                    </View>
                  </View>
                )}

                {countryInfo.currency && (
                  <View style={styles.statRow}>
                    <Ionicons name="cash-outline" size={20} color="#007AFF" />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Moneda</Text>
                      <Text style={styles.statValue}>
                        {countryInfo.currencySymbol} {countryInfo.currency}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Country Description */}
            {countryInfo.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionTitle}>Sobre {countryInfo.countryName}</Text>
                <Text style={styles.description}>{countryInfo.description}</Text>
              </View>
            )}

            {/* Photo Carousel */}
            {countryInfo.photos && countryInfo.photos.length > 0 && (
              <PhotoCarousel photos={countryInfo.photos} placeName={countryInfo.countryName} />
            )}

            {/* Saved Places (if any) - Máximo 5 lugares */}
            {savedPlaces.length > 0 && (
              <View style={styles.placesSection}>
                <Text style={styles.placesTitle}>
                  Lugares guardados en {countryInfo.countryName}
                </Text>
                <Text style={styles.placesSubtitle}>
                  {savedPlaces.length} {savedPlaces.length === 1 ? 'lugar' : 'lugares'} que vas a
                  visitar
                </Text>

                {savedPlaces.slice(0, 5).map((place) => (
                  <View key={place.id} style={styles.placeCard}>
                    <View style={styles.placeIconContainer}>
                      <Ionicons
                        name={getPlaceIcon(place.type || 'place')}
                        size={20}
                        color="#007AFF"
                      />
                    </View>
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {place.name}
                      </Text>
                      {place.city && (
                        <Text style={styles.placeCity} numberOfLines={1}>
                          {place.city}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}

                {savedPlaces.length > 5 && (
                  <Text style={styles.morePlaces}>
                    +{savedPlaces.length - 5} {savedPlaces.length - 5 === 1 ? 'lugar' : 'lugares'}{' '}
                    más
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer with close button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.continueButton} onPress={onClose}>
              <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Confetti - AL FINAL para que esté al frente */}
      <ConfettiCannon
        ref={confettiRef}
        count={150}
        origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
        fadeOut
        fallSpeed={2500}
        explosionSpeed={350}
      />
    </Modal>
  );
}

/**
 * Get icon for place type
 */
function getPlaceIcon(type: string): any {
  const iconMap: Record<string, any> = {
    restaurant: 'restaurant',
    cafe: 'cafe',
    bar: 'beer',
    hotel: 'bed',
    airport: 'airplane',
    park: 'leaf',
    museum: 'business',
    beach: 'water',
    mountain: 'triangle',
    landmark: 'flag',
    shopping: 'cart',
    default: 'location',
  };

  return iconMap[type.toLowerCase()] || iconMap.default;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.8, // Cambiado de maxHeight a height fija
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden', // Restaurado a 'hidden' para el border radius
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  countrySection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  flag: {
    fontSize: 80,
    marginBottom: 12,
  },
  countryName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  continent: {
    fontSize: 16,
    color: '#666',
  },
  statsSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  returnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  placesSection: {
    marginBottom: 24,
  },
  placesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  placesSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  placeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  placeCity: {
    fontSize: 13,
    color: '#666',
  },
  morePlaces: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
