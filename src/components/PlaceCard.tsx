// src/components/PlaceCard.tsx
import React from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import { translateDynamic } from '../i18n';
import { EnhancedPlace } from '../lib/placesSearch';
import { useTheme } from '../lib/theme';
import { useFavorites } from '../lib/useFavorites';

interface PlaceCardProps {
  place: EnhancedPlace;
  onPress: (place: EnhancedPlace) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export default function PlaceCard({ place, onPress, style, compact = false }: PlaceCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  const [aboutText, setAboutText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const src = (place.description || '').trim();
      if (!src) {
        setAboutText(null);
        return;
      }
      try {
        const tr = await translateDynamic(src, i18n.language);
        if (!cancelled) setAboutText(tr);
      } catch {
        if (!cancelled) setAboutText(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [place.description, i18n.language]);

  const handleFavoritePress = async (e: GestureResponderEvent) => {
    e.stopPropagation();
    const success = await toggleFavorite(place);
    if (!success) {
      Alert.alert(t('explore.modal.error_title'), t('explore.card.error_favorites'));
    }
  };
  const renderPhoto = () => {
    console.log(`[PlaceCard] ${place.name} renderPhoto called`);
    console.log(`[PlaceCard] ${place.name} place.photos:`, place.photos);
    console.log(`[PlaceCard] ${place.name} photos length:`, place.photos?.length);

    if (place.photos && place.photos.length > 0) {
      console.log(`[PlaceCard] ${place.name} showing photo:`, place.photos[0]);
      return (
        <Image
          source={{ uri: place.photos[0] }}
          style={styles.photo}
          resizeMode="cover"
          onLoad={() => console.log(`[PlaceCard] ${place.name} Image loaded successfully`)}
          onError={(error) => console.log(`[PlaceCard] ${place.name} Image failed to load:`, error)}
        />
      );
    }

    console.log(`[PlaceCard] ${place.name} NO PHOTOS - showing fallback`);
    // Fallback placeholder
    return (
      <View style={[styles.photo, styles.placeholderPhoto]}>
        <Text style={styles.placeholderIcon}>🏞</Text>
      </View>
    );
  };
  const renderPriceLevel = () => {
    if (place.priceLevel === undefined || place.priceLevel === null) return null;

    // Convert Google price string to number if needed
    const priceLevelNum =
      typeof place.priceLevel === 'string'
        ? ({
            PRICE_LEVEL_FREE: 0,
            PRICE_LEVEL_INEXPENSIVE: 1,
            PRICE_LEVEL_MODERATE: 2,
            PRICE_LEVEL_EXPENSIVE: 3,
            PRICE_LEVEL_VERY_EXPENSIVE: 4,
          }[place.priceLevel] ?? null)
        : place.priceLevel;

    if (priceLevelNum === null) return null;

    // Convertir nivel de precio (0-4) a símbolo de dólar
    const priceSymbols = [t('explore.card.free'), '$', '$$', '$$$', '$$$$'];
    const priceLabel = priceSymbols[priceLevelNum] || '';

    if (!priceLabel) return null;

    return (
      <View style={styles.priceBadge}>
        <Text style={styles.priceText}>{priceLabel}</Text>
      </View>
    );
  };

  const renderStatus = () => {
    if (place.openNow === undefined) return null;

    const bgColor = place.openNow ? '#D1FAE5' : '#FEE2E2';
    const textColor = place.openNow ? '#065F46' : '#991B1B';

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>
          {place.openNow ? t('explore.card.open') : t('explore.card.closed')}
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        compact && styles.containerCompact,
        { backgroundColor: theme.colors.card },
        style,
      ]}
      onPress={() => onPress(place)}
      activeOpacity={0.7}
    >
      <View style={[styles.photoContainer, compact && styles.photoContainerCompact]}>
        {renderPhoto()}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.placeName,
              compact && styles.placeNameCompact,
              { color: theme.colors.text },
            ]}
            numberOfLines={compact ? 1 : 2}
          >
            {place.name}
          </Text>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
            disabled={loading}
          >
            <Text style={styles.favoriteIcon}>{isFavorite(place.id) ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        {place.address && (
          <View style={styles.addressRow}>
            <Text style={[styles.addressIcon, { color: theme.colors.textMuted }]}>📍</Text>
            <Text
              style={[
                styles.addressText,
                compact && styles.addressTextCompact,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={compact ? 1 : 2}
            >
              {place.address}
            </Text>
          </View>
        )}

        {/* Editorial Summary / About */}
        {place.description && !compact && (
          <Text style={[styles.editorialText, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {aboutText ?? place.description}
          </Text>
        )}

        {typeof place.distance_km === 'number' && (
          <Text
            style={[
              styles.distanceText,
              compact && styles.distanceTextCompact,
              { color: theme.colors.textMuted },
            ]}
          >
            {place.distance_km.toFixed(2)} km
          </Text>
        )}

        <View style={styles.bottomRow}>
          {place.rating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text
                style={[
                  styles.ratingText,
                  compact && styles.ratingTextCompact,
                  { color: theme.colors.text },
                ]}
              >
                {place.rating}
              </Text>
              {place.reviews_count && (
                <Text
                  style={[
                    styles.reviewsText,
                    compact && styles.reviewsTextCompact,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  ({place.reviews_count})
                </Text>
              )}
            </View>
          )}

          {renderPriceLevel()}

          {renderStatus()}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addressIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
  },
  addressTextCompact: {
    fontSize: 13,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: {
    borderRadius: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    marginBottom: 12,
    padding: 16,
  },
  containerCompact: {
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
  },
  content: {
    flex: 1,
  },
  distanceText: {
    fontSize: 12,
    marginBottom: 8,
  },
  distanceTextCompact: {
    fontSize: 11,
    marginBottom: 6,
  },
  editorialText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 8,
    marginTop: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  photo: {
    height: '100%',
    width: '100%',
  },
  photoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    height: 160,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoContainerCompact: {
    borderRadius: 8,
    height: 120,
    marginBottom: 8,
  },
  placeName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  placeNameCompact: {
    fontSize: 16,
    marginBottom: 4,
  },
  placeholderIcon: {
    color: '#CCCCCC',
    fontSize: 32,
  },
  placeholderPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  ratingTextCompact: {
    fontSize: 13,
  },
  reviewsText: {
    fontSize: 14,
  },
  reviewsTextCompact: {
    fontSize: 13,
  },
  starIcon: {
    color: '#F59E0B',
    fontSize: 14,
    marginRight: 2,
  },
  priceBadge: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
