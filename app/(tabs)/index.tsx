import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useTheme } from '~/lib/theme';

export default function HomeTab() {
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
        backgroundColor: colors.card, 
        padding: spacing(2), 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border
      }}>
        <Text style={{ 
          fontSize: 28, 
          fontWeight: '900', 
          color: colors.text,
          marginBottom: spacing(1)
        }}>
          {t('appName')}
        </Text>
        <Text style={{ 
          fontSize: 16, 
          color: colors.textMuted,
          marginBottom: spacing(2)
        }}>
          Tu compañero de viaje inteligente
        </Text>
        
        <View style={{ gap: spacing(1) }}>
          <FeatureCard 
            title="🌤️ Clima Local"
            description="Información meteorológica actualizada"
            colors={colors}
            spacing={spacing}
          />
          <FeatureCard 
            title="🗺️ Viajes Activos"
            description="Gestiona tus itinerarios actuales"
            colors={colors}
            spacing={spacing}
          />
          <FeatureCard 
            title="📍 Alertas Cercanas"
            description="Descubre lugares interesantes cerca de ti"
            colors={colors}
            spacing={spacing}
          />
        </View>
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
          Funcionalidades Principales
        </Text>
        <View style={{ gap: spacing(0.5) }}>
          <Text style={{ color: colors.textMuted }}>• Exploración de lugares con filtros avanzados</Text>
          <Text style={{ color: colors.textMuted }}>• Planificación inteligente de rutas con IA</Text>
          <Text style={{ color: colors.textMuted }}>• Reservas de vuelos, hoteles y eSIM</Text>
          <Text style={{ color: colors.textMuted }}>• Colaboración en tiempo real</Text>
          <Text style={{ color: colors.textMuted }}>• Documentos seguros cifrados</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function FeatureCard({ title, description, colors, spacing }: {
  title: string;
  description: string;
  colors: any;
  spacing: (n: number) => number;
}) {
  return (
    <View style={{ 
      backgroundColor: colors.background, 
      padding: spacing(1.5), 
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border
    }}>
      <Text style={{ 
        fontSize: 16, 
        fontWeight: '600', 
        color: colors.text,
        marginBottom: 4
      }}>
        {title}
      </Text>
      <Text style={{ 
        fontSize: 14, 
        color: colors.textMuted
      }}>
        {description}
      </Text>
    </View>
  );
}