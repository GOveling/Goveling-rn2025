import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '~/lib/theme';

export default function BookingTab() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  const bookingOptions = [
    {
      title: 'Vuelos',
      icon: '✈️',
      description: 'Encuentra y compara vuelos',
      color: colors.primary
    },
    {
      title: 'Hoteles',
      icon: '🏨',
      description: 'Reserva alojamiento',
      color: '#10B981'
    },
    {
      title: 'eSIM',
      icon: '📱',
      description: 'Conectividad internacional',
      color: '#8B5CF6'
    }
  ];

  return (
    <ScrollView 
      style={{ 
        flex: 1, 
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'web' ? 20 : 0
      }}
      contentContainerStyle={{ 
        padding: spacing(2), 
        gap: spacing(1.5) 
      }}
    >
      <Text style={{ 
        fontSize: 28, 
        fontWeight: '900', 
        color: colors.text,
        marginBottom: spacing(1)
      }}>
        {t('booking.title')}
      </Text>

      <Text style={{ 
        fontSize: 16, 
        color: colors.textMuted,
        marginBottom: spacing(2)
      }}>
        Reserva todos los servicios para tu viaje en un solo lugar
      </Text>

      <View style={{ gap: spacing(1.5) }}>
        {bookingOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={{
              backgroundColor: colors.card,
              padding: spacing(2),
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <View style={{
              width: 60,
              height: 60,
              backgroundColor: option.color,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing(1.5)
            }}>
              <Text style={{ fontSize: 24 }}>{option.icon}</Text>
            </View>
            
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '700', 
                color: colors.text,
                marginBottom: 4
              }}>
                {option.title}
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: colors.textMuted 
              }}>
                {option.description}
              </Text>
            </View>
            
            <Text style={{ 
              fontSize: 18, 
              color: colors.textMuted 
            }}>
              →
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ 
        backgroundColor: colors.card, 
        padding: spacing(2), 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border
      }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: '700', 
          color: colors.text,
          marginBottom: spacing(1)
        }}>
          Ventajas de Reservar con Goveling
        </Text>
        <View style={{ gap: spacing(0.75) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: spacing(1) }}>💰</Text>
            <Text style={{ color: colors.textMuted, flex: 1 }}>
              Mejores precios garantizados
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: spacing(1) }}>🔒</Text>
            <Text style={{ color: colors.textMuted, flex: 1 }}>
              Reservas seguras y protegidas
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: spacing(1) }}>📞</Text>
            <Text style={{ color: colors.textMuted, flex: 1 }}>
              Soporte 24/7 en tu idioma
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: spacing(1) }}>🎯</Text>
            <Text style={{ color: colors.textMuted, flex: 1 }}>
              Integración con tu itinerario
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}