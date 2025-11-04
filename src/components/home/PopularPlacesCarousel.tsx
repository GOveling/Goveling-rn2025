// src/components/home/PopularPlacesCarousel.tsx
import React, { useState, useEffect, useRef } from 'react';

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useTranslation } from 'react-i18next';

import { usePopularPlacesV2, type PopularPlace } from '~/hooks/usePopularPlacesV2';

const AUTO_ROTATE_INTERVAL = 8000; // 8 seconds

interface Props {
  userCountryCode?: string;
  userContinent?: string;
  onPlacePress?: (place: PopularPlace) => void;
}

export default function PopularPlacesCarousel({
  userCountryCode,
  userContinent,
  onPlacePress,
}: Props) {
  const { t } = useTranslation();
  const { places, isLive, isLoading, refresh } = usePopularPlacesV2({
    userCountryCode,
    userContinent,
    maxResults: 8,
    enableAutoRefresh: true,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const autoRotateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-rotate logic
  useEffect(() => {
    if (isPaused || isLoading || places.length === 0) return;

    autoRotateTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % places.length);
    }, AUTO_ROTATE_INTERVAL);

    return () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
      }
    };
  }, [isPaused, isLoading, places.length]);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('home.popular_places')}</Text>
            <Text style={styles.titleLine2}>{t('home.globally')}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('home.loading_popular_places')}</Text>
        </View>
      </View>
    );
  }

  const currentPlace = places[currentIndex];

  // Format saves count
  const getSavesText = () => {
    if (!isLive) return t('home.iconic_destination');

    const totalSaves = currentPlace.saves_1h + currentPlace.saves_6h + currentPlace.saves_24h;
    if (totalSaves === 0) return t('home.iconic_destination');

    if (currentPlace.saves_1h > 0) {
      const savedText =
        currentPlace.saves_1h === 1 ? t('home.traveler_saved_it') : t('home.travelers_saved_it');
      return `${currentPlace.saves_1h} ${savedText} ${t('home.in_last_hour')}`;
    }

    if (currentPlace.saves_6h > 0) {
      const savedText =
        currentPlace.saves_6h === 1 ? t('home.traveler_saved_it') : t('home.travelers_saved_it');
      return `${currentPlace.saves_6h} ${savedText} ${t('home.in_last_6_hours')}`;
    }

    const savedText =
      currentPlace.saves_24h === 1 ? t('home.traveler_saved_it') : t('home.travelers_saved_it');
    return `${currentPlace.saves_24h} ${savedText} ${t('home.today')}`;
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('home.popular_places')}</Text>
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.titleLine2}>{t('home.globally')}</Text>
            {isLive && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>{t('home.live')}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>{t('home.refresh')}</Text>
        </TouchableOpacity>
      </View>

      {/* Place Card */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPlacePress?.(currentPlace)}
        onPressIn={() => setIsPaused(true)}
        onPressOut={() => setIsPaused(false)}
        style={styles.placeCard}
      >
        {/* Emoji/Photo */}
        <View style={styles.placeImage}>
          <Text style={styles.placeEmoji}>{currentPlace.emoji}</Text>
        </View>

        {/* Content */}
        <View style={styles.placeContent}>
          <View style={styles.placeTitleRow}>
            <Text style={styles.placeName} numberOfLines={1}>
              {currentPlace.name}
            </Text>
            {isLive && currentPlace.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{currentPlace.badge}</Text>
              </View>
            )}
          </View>

          <Text style={styles.placeLocation} numberOfLines={1}>
            📍 {currentPlace.location_display}
          </Text>

          <Text style={styles.placeDescription} numberOfLines={2}>
            {currentPlace.description || t('home.popular_place_fallback')}
          </Text>

          <Text style={styles.placeStats} numberOfLines={1}>
            ❤️ {getSavesText()}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Pagination Dots */}
      {places.length > 1 && (
        <View style={styles.pagination}>
          {places.slice(0, Math.min(places.length, 5)).map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setCurrentIndex(index);
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 3000);
              }}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
            />
          ))}
          {places.length > 5 && <Text style={styles.moreIndicator}>...</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleLine2: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  liveBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  refreshButton: {
    padding: 4,
  },
  refreshText: {
    fontSize: 14,
    color: '#8B5CF6',
  },
  placeCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  placeImage: {
    width: 60,
    height: 60,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeEmoji: {
    fontSize: 32,
  },
  placeContent: {
    flex: 1,
    gap: 6,
  },
  placeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  placeLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  placeDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  placeStats: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#8B5CF6',
  },
  moreIndicator: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 2,
  },
});
