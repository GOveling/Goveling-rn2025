import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '~/lib/theme';

export default function ExploreTab() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const [search, setSearch] = React.useState('');

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
        {t('explore.title')}
      </Text>

      <TextInput
        placeholder={t('common.search') || 'Buscar lugares...'}
        value={search}
        onChangeText={setSearch}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: spacing(1.5),
          fontSize: 16,
          color: colors.text
        }}
        placeholderTextColor={colors.textMuted}
      />

      <View style={{ flexDirection: 'row', gap: spacing(1), flexWrap: 'wrap' }}>
        {['Restaurantes', 'Museos', 'Parques', 'Cafeterías'].map(category => (
          <TouchableOpacity
            key={category}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing(1.5),
              paddingVertical: spacing(0.75),
              borderRadius: 20
            }}
          >
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
              {category}
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
          Lugares Populares
        </Text>
        <View style={{ gap: spacing(1) }}>
          {[
            { name: 'Plaza de Armas', type: 'Histórico', rating: '4.5' },
            { name: 'Cerro San Cristóbal', type: 'Naturaleza', rating: '4.7' },
            { name: 'Mercado Central', type: 'Gastronomía', rating: '4.3' }
          ].map((place, index) => (
            <View key={index} style={{
              backgroundColor: colors.background,
              padding: spacing(1.5),
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: colors.text 
              }}>
                {place.name}
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: colors.textMuted,
                marginTop: 4
              }}>
                {place.type} • ⭐ {place.rating}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}