import React from 'react';

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import MiniMap from '@/components/MiniMap';
import { useTheme } from '@/lib/theme';

interface PlaceMiniMapProps {
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  onPress?: () => void;
  onAddToTrip?: () => void;
}

export const PlaceMiniMap: React.FC<PlaceMiniMapProps> = ({
  placeName,
  latitude,
  longitude,
  onPress,
  onAddToTrip,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={1}>
            {placeName}
          </Text>
        </View>
        {onAddToTrip && (
          <TouchableOpacity style={styles.addButton} onPress={onAddToTrip}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={!onPress}>
        <MiniMap lat={latitude} lng={longitude} height={140} title={placeName} />
      </TouchableOpacity>

      {onPress && (
        <TouchableOpacity style={styles.viewMapButton} onPress={onPress}>
          <Text style={[styles.viewMapText, { color: colors.primary }]}>
            {t('social.maps.view_on_map')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  viewMapText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
