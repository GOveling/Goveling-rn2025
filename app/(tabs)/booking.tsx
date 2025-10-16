import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useTheme } from '~/lib/theme';
import { useRouter } from 'expo-router';

export default function BookingTab() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const bookingOptions = [
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

  const handleBookingPress = (option: any) => {
    // Show alert for now since booking sections are coming soon
    Alert.alert(
      option.title,
      `Funcionalidad de ${option.title.toLowerCase()} próximamente disponible`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: Platform.OS === 'ios' ? 60 : 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '900',
              color: '#1A1A1A',
              marginBottom: 8,
            }}
          >
            Reservas
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: '#666666',
              fontWeight: '500',
            }}
          >
            Reserva lo esencial para tu viaje
          </Text>
        </View>

        {/* Booking Options Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {bookingOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleBookingPress(option)}
              style={{
                width: '47%', // This ensures 2 columns with proper spacing
                backgroundColor: '#FFFFFF',
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
                borderColor: 'rgba(0,0,0,0.05)',
              }}
            >
              {/* Icon Circle */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: option.color,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  shadowColor: option.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    color: '#FFFFFF',
                  }}
                >
                  {option.icon}
                </Text>
              </View>

              {/* Title */}
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1A1A1A',
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                {option.title}
              </Text>

              {/* Description */}
              <Text
                style={{
                  fontSize: 14,
                  color: '#666666',
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {option.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
