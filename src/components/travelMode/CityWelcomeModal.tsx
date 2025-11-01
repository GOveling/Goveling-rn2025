/**
 * CityWelcomeModal - Modal de bienvenida al llegar a una nueva ciudad/estado
 * Muestra confeti, icono de ciudad, descripción, y lugares guardados
 * Similar a CountryWelcomeModal pero para ciudades
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
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';

import { CityInfo } from '~/services/travelMode/CityDetectionService';

import { PhotoCarousel } from './PhotoCarousel';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SavedPlace {
  id: string;
  name: string;
  city?: string;
  type?: string;
  address?: string;
}

interface CityWelcomeModalProps {
  visible: boolean;
  cityInfo: CityInfo;
  isReturn: boolean;
  savedPlaces: SavedPlace[];
  onClose: () => void;
}

export function CityWelcomeModal({
  visible,
  cityInfo,
  isReturn,
  savedPlaces,
  onClose,
}: CityWelcomeModalProps) {
  const confettiRef = useRef<any>(null);

  // Debug: Log datos recibidos
  useEffect(() => {
    if (visible && cityInfo) {
      console.log('🏙️ CityWelcomeModal - RENDERING with data:', {
        visible,
        cityName: cityInfo.cityName,
        stateName: cityInfo.stateName,
        description: cityInfo.description?.substring(0, 100) + '...',
        population: cityInfo.population,
        timezone: cityInfo.timezone,
        isReturn,
        savedPlacesCount: savedPlaces?.length || 0,
      });
      console.log('🏙️ CityWelcomeModal - CONDITIONS CHECK:', {
        hasDescription: !!cityInfo.description,
        hasPopulation: !!cityInfo.population,
        hasTimezone: !!cityInfo.timezone,
        showStatsGrid: !!(cityInfo.population || cityInfo.timezone),
        hasSavedPlaces: savedPlaces && savedPlaces.length > 0,
      });

      // DEBUG PHOTOS
      console.log('🖼️ CityWelcomeModal - PHOTO DEBUG:', {
        hasPhotos: !!cityInfo.photos,
        photosLength: cityInfo.photos?.length || 0,
        photosArray: cityInfo.photos,
        willRenderCarousel: !!(cityInfo.photos && cityInfo.photos.length > 0),
      });
    }
  }, [visible, cityInfo, isReturn, savedPlaces]);

  useEffect(() => {
    if (visible && confettiRef.current) {
      confettiRef.current.start();
    }
  }, [visible]);

  const getPlaceIcon = (type?: string): keyof typeof Ionicons.glyphMap => {
    if (!type) return 'location';
    const t = type.toLowerCase();
    if (t.includes('restaurant') || t.includes('food')) return 'restaurant';
    if (t.includes('hotel') || t.includes('lodging')) return 'bed';
    if (t.includes('museum') || t.includes('gallery')) return 'images';
    if (t.includes('park') || t.includes('nature')) return 'leaf';
    if (t.includes('shopping') || t.includes('store')) return 'cart';
    if (t.includes('bar') || t.includes('cafe') || t.includes('coffee')) return 'cafe';
    return 'location';
  };

  if (!visible || !cityInfo) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      {/* Modal Overlay */}
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close Button - OUTSIDE ScrollView */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* City Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="business" size={60} color="#4F8EF7" />
              </View>
            </View>

            {/* Return Badge */}
            {isReturn && (
              <View style={styles.returnBadge}>
                <Ionicons name="repeat" size={16} color="#FF8C42" />
                <Text style={styles.returnBadgeText}>Retorno</Text>
              </View>
            )}

            {/* Title */}
            <Text style={styles.title}>{isReturn ? '¡Bienvenido de vuelta!' : '¡Bienvenido!'}</Text>

            {/* City Name */}
            <Text style={styles.cityName}>{cityInfo.cityName}</Text>

            {/* State + Country */}
            <Text style={styles.subtitle}>
              {cityInfo.stateName && `${cityInfo.stateName}, `}
              {cityInfo.countryName}
            </Text>

            {/* Description Card */}
            {cityInfo.description && (
              <View style={styles.descriptionCard}>
                <View style={styles.descriptionHeader}>
                  <Ionicons name="information-circle" size={20} color="#4F8EF7" />
                  <Text style={styles.descriptionTitle}>Acerca de {cityInfo.cityName}</Text>
                </View>
                <Text style={styles.descriptionText}>{cityInfo.description}</Text>
              </View>
            )}

            {/* Photo Carousel */}
            {cityInfo.photos && cityInfo.photos.length > 0 && (
              <PhotoCarousel photos={cityInfo.photos} placeName={cityInfo.cityName} />
            )}

            {/* Stats Grid */}
            {(cityInfo.population || cityInfo.timezone || cityInfo.rating || cityInfo.currency) && (
              <View style={styles.statsGrid}>
                {cityInfo.population && (
                  <View style={styles.statCard}>
                    <Ionicons name="people-outline" size={28} color="#4F8EF7" />
                    <Text style={styles.statLabel}>Población</Text>
                    <Text style={styles.statValue}>{cityInfo.population}</Text>
                  </View>
                )}
                {cityInfo.timezone && (
                  <View style={styles.statCard}>
                    <Ionicons name="time-outline" size={28} color="#4F8EF7" />
                    <Text style={styles.statLabel}>Zona Horaria</Text>
                    <Text style={styles.statValue}>{cityInfo.timezone}</Text>
                  </View>
                )}
                {cityInfo.rating && (
                  <View style={styles.statCard}>
                    <Ionicons name="star" size={28} color="#FFD700" />
                    <Text style={styles.statLabel}>Rating</Text>
                    <Text style={styles.statValue}>⭐ {cityInfo.rating.toFixed(1)}/5</Text>
                  </View>
                )}
                {cityInfo.currency && (
                  <View style={styles.statCard}>
                    <Ionicons name="cash-outline" size={28} color="#4F8EF7" />
                    <Text style={styles.statLabel}>Moneda</Text>
                    <Text style={styles.statValue}>
                      {cityInfo.currencySymbol} {cityInfo.currency}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Saved Places */}
            {savedPlaces && savedPlaces.length > 0 && (
              <View style={styles.savedPlacesSection}>
                <View style={styles.savedPlacesHeader}>
                  <Ionicons name="bookmark" size={20} color="#4F8EF7" />
                  <Text style={styles.savedPlacesTitle}>Lugares guardados aquí</Text>
                </View>
                <Text style={styles.savedPlacesSubtitle}>
                  {savedPlaces.length}{' '}
                  {savedPlaces.length === 1 ? 'lugar guardado' : 'lugares guardados'} en tus viajes
                </Text>
                {savedPlaces.slice(0, 5).map((place) => (
                  <View key={place.id} style={styles.placeCard}>
                    <View style={styles.placeIconWrapper}>
                      <Ionicons name={getPlaceIcon(place.type)} size={18} color="#4F8EF7" />
                    </View>
                    <View style={styles.placeDetails}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {place.name}
                      </Text>
                      {place.address && (
                        <Text style={styles.placeAddress} numberOfLines={1}>
                          {place.address}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />

            {/* Footer Button */}
            <TouchableOpacity style={styles.continueButton} onPress={onClose}>
              <Text style={styles.continueButtonText}>Continuar explorando</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Confetti - AL FINAL para que esté al frente */}
      <ConfettiCannon
        ref={confettiRef}
        count={100}
        origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
        autoStart={false}
        fadeOut
        colors={['#4F8EF7', '#FF8C42', '#00D4AA', '#FFC947']}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4F8EF7',
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4E8',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
    gap: 6,
  },
  returnBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  cityName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F8EF7',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  descriptionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  savedPlacesSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  savedPlacesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  savedPlacesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  savedPlacesSubtitle: {
    fontSize: 13,
    color: '#0369A1',
    marginBottom: 16,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  placeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeDetails: {
    flex: 1,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 12,
    color: '#64748B',
  },
  bottomSpacing: {
    height: 20,
  },
  continueButton: {
    backgroundColor: '#4F8EF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 20,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
