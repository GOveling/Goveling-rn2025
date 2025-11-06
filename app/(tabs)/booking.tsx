import React from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';

import { useRouter } from 'expo-router';

import { useTranslation } from 'react-i18next';

import { useTheme } from '~/lib/theme';

interface BookingOption {
  title: string;
  icon: string;
  description: string;
  color: string;
  route: string;
}

export default function BookingTab() {
  const { t } = useTranslation();
  const theme = useTheme();
  const _router = useRouter();

  const bookingOptions: BookingOption[] = [
    {
      title: t('bookingTab.options.flights.title'),
      icon: '✈️',
      description: t('bookingTab.options.flights.description'),
      color: '#007AFF',
      route: '/booking/flights',
    },
    {
      title: t('bookingTab.options.hotels.title'),
      icon: '🏨',
      description: t('bookingTab.options.hotels.description'),
      color: '#34C759',
      route: '/booking/hotels',
    },
    {
      title: t('bookingTab.options.transport.title'),
      icon: '🚗',
      description: t('bookingTab.options.transport.description'),
      color: '#8B5CF6',
      route: '/booking/transport',
    },
    {
      title: t('bookingTab.options.tours.title'),
      icon: '📍',
      description: t('bookingTab.options.tours.description'),
      color: '#FF9500',
      route: '/booking/tours',
    },
    {
      title: t('bookingTab.options.esim.title'),
      icon: '📱',
      description: t('bookingTab.options.esim.description'),
      color: '#EC4899',
      route: '/booking/esim',
    },
    {
      title: t('bookingTab.options.restaurants.title'),
      icon: '🍴',
      description: t('bookingTab.options.restaurants.description'),
      color: '#DC2626',
      route: '/booking/restaurants',
    },
  ];

  const handleBookingPress = (option: BookingOption) => {
    // Show alert for now since booking sections are coming soon
    Alert.alert(option.title, t('bookingTab.comingSoon', { service: option.title.toLowerCase() }), [
      { text: t('common.ok') },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t('bookingTab.title')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
            {t('bookingTab.subtitle')}
          </Text>
        </View>

        {/* Booking Options Grid */}
        <View style={styles.grid}>
          {bookingOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleBookingPress(option)}
              style={[
                styles.card,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              {/* Icon Circle */}
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: option.color,
                    shadowColor: option.color,
                  },
                ]}
              >
                <Text style={styles.iconText}>{option.icon}</Text>
              </View>

              {/* Title */}
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{option.title}</Text>

              {/* Description */}
              <Text style={[styles.cardDescription, { color: theme.colors.textMuted }]}>
                {option.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },

  // Header
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  // Booking Card
  card: {
    width: '47%',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
  },

  // Icon
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  iconText: {
    fontSize: 28,
    color: '#FFFFFF',
  },

  // Card Text
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Spacing
  bottomSpacing: {
    height: 100,
  },
});
