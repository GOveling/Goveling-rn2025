// src/components/home/PopularPlacesCarousel.tsx
import React, { useState, useEffect, useRef } from 'react';

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { usePopularPlacesV2, type PopularPlace } from '~/hooks/usePopularPlacesV2';
import { useTheme } from '~/lib/theme';

const AUTO_ROTATE_INTERVAL = 8000; // 8 seconds

// Map emojis to Ionicons
const getIconForEmoji = (
  emoji: string
): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  // Remove variation selectors and normalize
  const normalizedEmoji = emoji.replace(/\uFE0F/g, '').trim();

  // Use includes for more flexible matching
  if (normalizedEmoji.includes('🗼')) return { name: 'business', color: '#8B5CF6' };
  if (normalizedEmoji.includes('⛰')) return { name: 'triangle', color: '#10B981' };
  if (normalizedEmoji.includes('🏯')) return { name: 'home', color: '#EF4444' };
  if (normalizedEmoji.includes('🏛')) return { name: 'library', color: '#F59E0B' };
  if (normalizedEmoji.includes('⛪')) return { name: 'business', color: '#3B82F6' };
  if (normalizedEmoji.includes('🌅')) return { name: 'sunny', color: '#F97316' };
  if (normalizedEmoji.includes('🕌')) return { name: 'moon', color: '#6366F1' };
  if (normalizedEmoji.includes('🎭')) return { name: 'musical-notes', color: '#EC4899' };
  if (normalizedEmoji.includes('🎡')) return { name: 'radio', color: '#EC4899' }; // Ferris wheel
  if (normalizedEmoji.includes('🍽')) return { name: 'restaurant', color: '#F59E0B' }; // Restaurant

  return { name: 'location', color: '#8B5CF6' };
};

// Map badge strings to icon and text
const getBadgeIcon = (badge: string): { icon: keyof typeof Ionicons.glyphMap; text: string } => {
  if (badge.includes('HOT NOW')) return { icon: 'flame', text: 'HOT NOW' };
  if (badge.includes('TRENDING')) return { icon: 'trending-up', text: 'TRENDING' };
  if (badge.includes('POPULAR')) return { icon: 'star', text: 'POPULAR' };
  if (badge.includes('RISING')) return { icon: 'sparkles', text: 'RISING' };
  return { icon: 'star', text: 'POPULAR' };
};

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
  const theme = useTheme();
  const { places, isLive, isLoading } = usePopularPlacesV2({
    userCountryCode,
    userContinent,
    maxResults: 5,
    enableAutoRefresh: true,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const autoRotateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation handlers
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? places.length - 1 : prev - 1));
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), AUTO_ROTATE_INTERVAL);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % places.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), AUTO_ROTATE_INTERVAL);
  };

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
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderWidth: theme.mode === 'dark' ? 1 : 0,
            borderColor: theme.mode === 'dark' ? '#60a5fa' : 'transparent',
          },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('home.popular_places')}
            </Text>
            <Text style={[styles.titleLine2, { color: theme.colors.text }]}>
              {t('home.globally')}
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            {t('home.loading_popular_places')}
          </Text>
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
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderWidth: theme.mode === 'dark' ? 1 : 0,
          borderColor: theme.mode === 'dark' ? '#60a5fa' : 'transparent',
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('home.popular_places')}
            </Text>
          </View>
          <View style={styles.titleRow}>
            <Text style={[styles.titleLine2, { color: theme.colors.text }]}>
              {t('home.globally')}
            </Text>
            {isLive && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>{t('home.live')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Place Card */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPlacePress?.(currentPlace)}
        onPressIn={() => setIsPaused(true)}
        onPressOut={() => setIsPaused(false)}
        style={[
          styles.placeCard,
          { backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB' },
        ]}
      >
        {/* Emoji/Photo */}
        <View
          style={[
            styles.placeImage,
            { backgroundColor: theme.mode === 'dark' ? 'rgba(254, 243, 199, 0.2)' : '#FEF3C7' },
          ]}
        >
          {currentPlace.emoji ? (
            <Ionicons
              name={getIconForEmoji(currentPlace.emoji).name}
              size={32}
              color={getIconForEmoji(currentPlace.emoji).color}
            />
          ) : (
            <Ionicons name="location" size={32} color="#8B5CF6" />
          )}
        </View>

        {/* Content */}
        <View style={styles.placeContent}>
          <View style={styles.placeTitleRow}>
            <Text style={[styles.placeName, { color: theme.colors.text }]} numberOfLines={1}>
              {currentPlace.name}
            </Text>
            {isLive && currentPlace.badge && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.mode === 'dark' ? 'rgba(254, 226, 226, 0.2)' : '#FEE2E2',
                  },
                ]}
              >
                <Ionicons
                  name={getBadgeIcon(currentPlace.badge).icon}
                  size={10}
                  color={theme.mode === 'dark' ? '#fca5a5' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.badgeText,
                    { color: theme.mode === 'dark' ? '#fca5a5' : '#DC2626' },
                  ]}
                >
                  {getBadgeIcon(currentPlace.badge).text}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
            <Text
              style={[styles.placeLocation, { color: theme.colors.textMuted }]}
              numberOfLines={1}
            >
              {currentPlace.location_display}
            </Text>
          </View>

          <Text
            style={[styles.placeDescription, { color: theme.colors.textMuted }]}
            numberOfLines={2}
          >
            {currentPlace.description || t('home.popular_place_fallback')}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons
              name="heart"
              size={14}
              color={theme.mode === 'dark' ? '#a78bfa' : '#8B5CF6'}
            />
            <Text
              style={[styles.placeStats, { color: theme.mode === 'dark' ? '#a78bfa' : '#8B5CF6' }]}
              numberOfLines={1}
            >
              {getSavesText()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Pagination with Navigation Arrows */}
      {places.length > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            onPress={goToPrevious}
            style={[
              styles.arrowButton,
              { backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6' },
            ]}
          >
            <Text style={[styles.arrowText, { color: theme.colors.text }]}>‹</Text>
          </TouchableOpacity>

          <View style={styles.pagination}>
            {places.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setCurrentIndex(index);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 3000);
                }}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentIndex
                        ? theme.mode === 'dark'
                          ? '#a78bfa'
                          : '#8B5CF6'
                        : theme.mode === 'dark'
                          ? 'rgba(209, 213, 219, 0.3)'
                          : '#D1D5DB',
                  },
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={goToNext}
            style={[
              styles.arrowButton,
              { backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6' },
            ]}
          >
            <Text style={[styles.arrowText, { color: theme.colors.text }]}>›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleLine2: {
    fontSize: 18,
    fontWeight: '700',
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
  placeCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  placeImage: {
    width: 60,
    height: 60,
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
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  placeLocation: {
    fontSize: 12,
  },
  placeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  placeStats: {
    fontSize: 11,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 24,
  },
});
