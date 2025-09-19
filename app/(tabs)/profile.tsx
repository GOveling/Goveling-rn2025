import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '~/lib/theme';

export default function ProfileTab() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  const profileOptions = [
    { title: 'Información Personal', icon: '👤', description: 'Edita tu perfil' },
    { title: 'Documentos de Viaje', icon: '📄', description: 'Almacenamiento seguro' },
    { title: 'Estadísticas', icon: '📊', description: 'Tus logros de viaje' },
    { title: 'Configuración', icon: '⚙️', description: 'Preferencias de la app' },
    { title: 'Idioma', icon: '🌐', description: 'Cambiar idioma' },
    { title: 'Tema', icon: '🎨', description: 'Claro u oscuro' }
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
        {t('profile.title')}
      </Text>

      {/* User Info Card */}
      <View style={{
        backgroundColor: colors.card,
        padding: spacing(2),
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center'
      }}>
        <View style={{
          width: 80,
          height: 80,
          backgroundColor: colors.primary,
          borderRadius: 40,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing(1)
        }}>
          <Text style={{ fontSize: 32, color: colors.primaryText }}>👤</Text>
        </View>
        <Text style={{ 
          fontSize: 20, 
          fontWeight: '700', 
          color: colors.text,
          marginBottom: 4
        }}>
          Usuario Demo
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: colors.textMuted 
        }}>
          demo@goveling.com
        </Text>
      </View>

      {/* Travel Stats */}
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
          Estadísticas de Viaje
        </Text>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-around' 
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 24, 
              fontWeight: '900', 
              color: colors.primary 
            }}>
              12
            </Text>
            <Text style={{ 
              fontSize: 12, 
              color: colors.textMuted 
            }}>
              Países
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 24, 
              fontWeight: '900', 
              color: colors.primary 
            }}>
              45
            </Text>
            <Text style={{ 
              fontSize: 12, 
              color: colors.textMuted 
            }}>
              Ciudades
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 24, 
              fontWeight: '900', 
              color: colors.primary 
            }}>
              128
            </Text>
            <Text style={{ 
              fontSize: 12, 
              color: colors.textMuted 
            }}>
              Lugares
            </Text>
          </View>
        </View>
      </View>

      {/* Profile Options */}
      <View style={{ gap: spacing(1) }}>
        {profileOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={{
              backgroundColor: colors.card,
              padding: spacing(1.5),
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Text style={{ 
              fontSize: 20, 
              marginRight: spacing(1.5) 
            }}>
              {option.icon}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: colors.text 
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
              fontSize: 16, 
              color: colors.textMuted 
            }}>
              →
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={{
          backgroundColor: '#EF4444',
          padding: spacing(1.5),
          borderRadius: 12,
          alignItems: 'center',
          marginTop: spacing(1)
        }}
      >
        <Text style={{ 
          color: '#FFFFFF', 
          fontWeight: '700',
          fontSize: 16
        }}>
          Cerrar Sesión
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}