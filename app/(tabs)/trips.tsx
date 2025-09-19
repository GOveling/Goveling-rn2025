import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '~/lib/theme';

export default function TripsTab() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

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
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing(1)
      }}>
        <Text style={{ 
          fontSize: 28, 
          fontWeight: '900', 
          color: colors.text
        }}>
          {t('trips.title')}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: spacing(1.5),
            paddingVertical: spacing(1),
            borderRadius: 12
          }}
        >
          <Text style={{ 
            color: colors.primaryText, 
            fontWeight: '700' 
          }}>
            + Nuevo Viaje
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: spacing(1.5) }}>
        {[
          {
            name: 'Viaje a Europa',
            dates: '15 Mar - 30 Mar 2024',
            status: 'Próximo',
            places: 8
          },
          {
            name: 'Escapada de Fin de Semana',
            dates: '2 Feb - 4 Feb 2024',
            status: 'Completado',
            places: 5
          }
        ].map((trip, index) => (
          <View key={index} style={{
            backgroundColor: colors.card,
            padding: spacing(2),
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: spacing(1)
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: '700', 
                  color: colors.text,
                  marginBottom: 4
                }}>
                  {trip.name}
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  color: colors.textMuted 
                }}>
                  {trip.dates}
                </Text>
              </View>
              <View style={{
                backgroundColor: trip.status === 'Próximo' ? colors.primary : colors.border,
                paddingHorizontal: spacing(1),
                paddingVertical: spacing(0.5),
                borderRadius: 8
              }}>
                <Text style={{ 
                  color: trip.status === 'Próximo' ? colors.primaryText : colors.textMuted,
                  fontSize: 12,
                  fontWeight: '600'
                }}>
                  {trip.status}
                </Text>
              </View>
            </View>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text style={{ 
                fontSize: 14, 
                color: colors.textMuted 
              }}>
                {trip.places} lugares planificados
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.background,
                  paddingHorizontal: spacing(1.5),
                  paddingVertical: spacing(0.75),
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border
                }}
              >
                <Text style={{ 
                  color: colors.text, 
                  fontWeight: '600',
                  fontSize: 14
                }}>
                  Ver Detalles
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={{ 
        backgroundColor: colors.card, 
        padding: spacing(2), 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center'
      }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: '700', 
          color: colors.text,
          marginBottom: spacing(1)
        }}>
          Funciones de Viaje
        </Text>
        <View style={{ gap: spacing(0.5), alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>🤖 Planificación inteligente con IA</Text>
          <Text style={{ color: colors.textMuted }}>🗺️ Rutas optimizadas automáticamente</Text>
          <Text style={{ color: colors.textMuted }}>👥 Colaboración en tiempo real</Text>
          <Text style={{ color: colors.textMuted }}>📱 Modo viaje con navegación</Text>
        </View>
      </View>
    </ScrollView>
  );
}