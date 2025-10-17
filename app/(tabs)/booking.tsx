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

import { COLORS } from '~/constants/colors';
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
  const { colors: _colors, spacing: _spacing } = useTheme();
  const _router = useRouter();

  const bookingOptions: BookingOption[] = [
    {
      title: 'Vuelos',
      icon: '✈️',
      description: 'Encuentra las mejores ofertas',
      color: '#007AFF',
      route: '/booking/flights',
    },
    {
      title: 'Hoteles',
      icon: '🏨',
      description: 'Estadías cómodas',
      color: '#34C759',
      route: '/booking/hotels',
    },
    {
      title: 'Transporte',
      icon: '�',
      description: 'Múltiples opciones de viaje',
      color: '#8B5CF6',
      route: '/booking/transport',
    },
    {
      title: 'Tours y Actividades',
      icon: '📍',
      description: 'Experiencias guiadas',
      color: '#FF9500',
      route: '/booking/tours',
    },
    {
      title: 'eSIMs',
      icon: '📱',
      description: 'Mantente conectado',
      color: '#EC4899',
      route: '/booking/esim',
    },
    {
      title: 'Restaurantes',
      icon: '🍴',
      description: 'Reservar mesas',
      color: '#DC2626',
      route: '/booking/restaurants',
    },
  ];

  const handleBookingPress = (option: BookingOption) => {
    // Show alert for now since booking sections are coming soon
    Alert.alert(
      option.title,
      `Funcionalidad de ${option.title.toLowerCase()} próximamente disponible`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('bookingTab.title')}</Text>
          <Text style={styles.headerSubtitle}>Reserva lo esencial para tu viaje</Text>
        </View>

        {/* Booking Options Grid */}
        <View style={styles.grid}>
          {bookingOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleBookingPress(option)}
              style={styles.card}
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
              <Text style={styles.cardTitle}>{option.title}</Text>

              {/* Description */}
              <Text style={styles.cardDescription}>{option.description}</Text>
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
    backgroundColor: COLORS.background.secondary,
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
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
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
    backgroundColor: COLORS.background.primary,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    shadowColor: COLORS.utility.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border.opacity,
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
    color: COLORS.text.white,
  },

  // Card Text
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Spacing
  bottomSpacing: {
    height: 100,
  },
});
