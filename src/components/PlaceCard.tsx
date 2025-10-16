// src/components/PlaceCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { EnhancedPlace } from '../lib/placesSearch';
import { useFavorites } from '../lib/useFavorites';

interface PlaceCardProps {
  place: EnhancedPlace;
  onPress: (place: EnhancedPlace) => void;
  style?: any;
  compact?: boolean;
}

export default function PlaceCard({ place, onPress, style, compact = false }: PlaceCardProps) {
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  
  const handleFavoritePress = async (e: any) => {
    e.stopPropagation();
    const success = await toggleFavorite(place);
    if (!success) {
      Alert.alert('Error', 'No se pudo actualizar los favoritos');
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
  };  const renderStatus = () => {
    if (place.openNow === undefined) return null;
    
    return (
      <View style={[
        styles.statusBadge,
        { backgroundColor: place.openNow ? '#D1FAE5' : '#FEE2E2' }
      ]}>
        <Text style={[
          styles.statusText,
          { color: place.openNow ? '#065F46' : '#991B1B' }
        ]}>
          {place.openNow ? 'Abierto' : 'Cerrado'}
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact, style]}
      onPress={() => onPress(place)}
      activeOpacity={0.7}
    >
      <View style={[styles.photoContainer, compact && styles.photoContainerCompact]}>
        {renderPhoto()}
      </View>
      
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.placeName, compact && styles.placeNameCompact]} numberOfLines={compact ? 1 : 2}>
            {place.name}
          </Text>
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={handleFavoritePress}
            disabled={loading}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorite(place.id) ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>

        {place.address && (
          <View style={styles.addressRow}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={[styles.addressText, compact && styles.addressTextCompact]} numberOfLines={compact ? 1 : 2}>
              {place.address}
            </Text>
          </View>
        )}

        {typeof place.distance_km === 'number' && (
          <Text style={[styles.distanceText, compact && styles.distanceTextCompact]}>
            {place.distance_km.toFixed(2)} km
          </Text>
        )}

        <View style={styles.bottomRow}>
          {place.rating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={[styles.ratingText, compact && styles.ratingTextCompact]}>
                {place.rating}
              </Text>
              {place.reviews_count && (
                <Text style={[styles.reviewsText, compact && styles.reviewsTextCompact]}>
                  ({place.reviews_count})
                </Text>
              )}
            </View>
          )}
          
          {renderStatus()}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  containerCompact: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  photoContainer: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    height: 160,
    position: 'relative',
  },
  photoContainerCompact: {
    height: 120,
    marginBottom: 8,
    borderRadius: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoCompact: {
    height: 120,
  },
  placeholderPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
    color: '#9CA3AF',
  },
  photoLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  photoLabelText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  placeNameCompact: {
    fontSize: 16,
    marginBottom: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressIcon: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  addressTextCompact: {
    fontSize: 13,
  },
  distanceText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  distanceTextCompact: {
    fontSize: 11,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 14,
    color: '#F59E0B',
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 4,
  },
  ratingTextCompact: {
    fontSize: 13,
  },
  reviewsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewsTextCompact: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
