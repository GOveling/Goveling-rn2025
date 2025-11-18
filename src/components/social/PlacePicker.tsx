import React, { useState, useCallback, useEffect, useMemo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';
import GooglePlacesService, { type NearbyPlace } from '@/services/googlePlacesService';
import type { PhotoLocation } from '@/utils/exifUtils';

interface PlacePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlace: (place: NearbyPlace) => void;
  photoLocation?: PhotoLocation | null;
  currentLocation?: PhotoLocation | null;
}

export const PlacePicker: React.FC<PlacePickerProps> = ({
  visible,
  onClose,
  onSelectPlace,
  photoLocation,
  currentLocation,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NearbyPlace[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Ubicación de referencia (priorizar foto, luego ubicación actual)
  const referenceLocation = useMemo(
    () => photoLocation || currentLocation,
    [photoLocation, currentLocation]
  );

  // Cargar lugares cercanos al abrir el modal
  useEffect(() => {
    if (visible && referenceLocation && nearbyPlaces.length === 0) {
      loadNearbyPlaces();
    }
  }, [visible, referenceLocation]);

  const loadNearbyPlaces = useCallback(async () => {
    if (!referenceLocation) return;

    try {
      setIsLoadingNearby(true);
      const places = await GooglePlacesService.searchNearbyPlaces(
        referenceLocation.latitude,
        referenceLocation.longitude,
        2000 // 2km de radio
      );
      setNearbyPlaces(places);
    } catch (error) {
      console.error('Error loading nearby places:', error);
    } finally {
      setIsLoadingNearby(false);
    }
  }, [referenceLocation]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await GooglePlacesService.searchPlaces(
          searchQuery,
          referenceLocation
            ? {
                latitude: referenceLocation.latitude,
                longitude: referenceLocation.longitude,
              }
            : undefined,
          referenceLocation ? 50000 : undefined // 50km si hay ubicación
        );
        setSuggestions(results);
      } catch (error) {
        console.error('Error searching places:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchQuery, referenceLocation]);

  const handleSelectPlace = useCallback(
    async (place: NearbyPlace) => {
      try {
        setSelectedPlaceId(place.id);
        onSelectPlace(place);
        onClose();

        // Limpiar estado para próxima vez
        setTimeout(() => {
          setSearchQuery('');
          setSuggestions([]);
          setSelectedPlaceId(null);
        }, 300);
      } catch (error) {
        console.error('Error selecting place:', error);
        setSelectedPlaceId(null);
      }
    },
    [onSelectPlace, onClose]
  );

  const renderSuggestion = useCallback(
    ({ item }: { item: NearbyPlace }) => {
      const isSelected = selectedPlaceId === item.id;

      return (
        <TouchableOpacity
          style={[styles.suggestionItem, { backgroundColor: colors.card }]}
          onPress={() => handleSelectPlace(item)}
          disabled={isSelected}
        >
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <View style={styles.suggestionText}>
            <Text style={[styles.suggestionMainText, { color: colors.text }]}>{item.name}</Text>
            <Text
              style={[styles.suggestionSecondaryText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.vicinity || item.formatted_address}
            </Text>
          </View>
          {isSelected && <ActivityIndicator size="small" color={colors.primary} />}
        </TouchableOpacity>
      );
    },
    [colors, selectedPlaceId, handleSelectPlace]
  );

  const renderNearbyPlace = useCallback(
    ({ item }: { item: NearbyPlace }) => {
      let distance: string | undefined;
      if (referenceLocation && item.distance) {
        distance = GooglePlacesService.formatDistance(item.distance);
      }

      return (
        <TouchableOpacity
          style={[styles.nearbyItem, { backgroundColor: colors.card }]}
          onPress={() => handleSelectPlace(item)}
        >
          <View style={[styles.nearbyIcon, { backgroundColor: colors.background }]}>
            <Ionicons name="location" size={20} color={colors.primary} />
          </View>
          <View style={styles.nearbyText}>
            <Text style={[styles.nearbyName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.nearbyDetails}>
              <Text style={[styles.nearbyAddress, { color: colors.textMuted }]} numberOfLines={1}>
                {item.formatted_address || item.vicinity}
              </Text>
              {distance && (
                <>
                  <Text style={[styles.nearbyDot, { color: colors.textMuted }]}> · </Text>
                  <Text style={[styles.nearbyDistance, { color: colors.textMuted }]}>
                    {distance}
                  </Text>
                </>
              )}
            </View>
            {item.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#FFB800" />
                <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                  {item.rating.toFixed(1)}
                </Text>
                {item.user_ratings_total && (
                  <Text style={[styles.ratingCount, { color: colors.textMuted }]}>
                    ({item.user_ratings_total})
                  </Text>
                )}
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [colors, referenceLocation, handleSelectPlace]
  );

  const showSuggestions = searchQuery.trim().length > 0;
  const showNearbyPlaces = !showSuggestions && nearbyPlaces.length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('social.create.select_place')}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('social.create.search_place_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Location Info */}
          {photoLocation && (
            <View style={[styles.locationInfo, { backgroundColor: colors.card }]}>
              <Ionicons name="images" size={16} color={colors.primary} />
              <Text style={[styles.locationInfoText, { color: colors.textMuted }]}>
                {t('social.create.photo_location_detected')}
              </Text>
            </View>
          )}

          {/* Results */}
          <View style={styles.resultsContainer}>
            {isSearching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {showSuggestions && !isSearching && suggestions.length > 0 && (
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item) => item.place_id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}

            {showSuggestions && !isSearching && suggestions.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('social.create.no_places_found')}
                </Text>
              </View>
            )}

            {showNearbyPlaces && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('social.create.nearby_places')}
                </Text>
                <FlatList
                  data={nearbyPlaces}
                  renderItem={renderNearbyPlace}
                  keyExtractor={(item) => item.place_id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                />
              </>
            )}

            {!showSuggestions && isLoadingNearby && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  {t('social.create.loading_nearby')}
                </Text>
              </View>
            )}

            {!showSuggestions && !isLoadingNearby && nearbyPlaces.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('social.create.no_nearby_places')}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  {t('social.create.try_searching')}
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 28,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  locationInfoText: {
    fontSize: 13,
  },
  resultsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 14,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  nearbyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyText: {
    flex: 1,
  },
  nearbyName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  nearbyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyAddress: {
    fontSize: 14,
    flex: 1,
  },
  nearbyDot: {
    fontSize: 14,
  },
  nearbyDistance: {
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
  },
  ratingCount: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
