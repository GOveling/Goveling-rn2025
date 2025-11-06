// src/components/PlaceDetailModal.tsx
import React from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';

import LottieView, { type AnimationObject } from 'lottie-react-native';
import { useTranslation } from 'react-i18next';

import AddToTripModal from './AddToTripModal';
import MapModal from './MapModal';
import MiniMapModal from './MiniMapModal';
import cycleAnimation from '../../assets/animations/cycle.json';
import globeAnimation from '../../assets/animations/globe.json';
import locationCircleAnimation from '../../assets/animations/location-circle.json';
import { translateDynamic } from '../i18n';
import { processPlaceCategories } from '../lib/categoryProcessor';
import { EnhancedPlace } from '../lib/placesSearch';
import { useTheme } from '../lib/theme';
import { useFavorites } from '../lib/useFavorites';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlaceDetailModalProps {
  visible: boolean;
  place: EnhancedPlace | null;
  onClose: () => void;
  tripId?: string;
  tripTitle?: string;
  onAddToTrip?: (place: EnhancedPlace) => void;
  isAlreadyInTrip?: boolean;
  onRemoveFromTrip?: () => void;
}

export default function PlaceDetailModal({
  visible,
  place,
  onClose,
  tripId,
  tripTitle,
  onAddToTrip,
  isAlreadyInTrip = false,
  onRemoveFromTrip,
}: PlaceDetailModalProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { isFavorite, toggleFavorite, loading: favLoading } = useFavorites();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);
  const [showMapModal, setShowMapModal] = React.useState(false);
  const [showMiniMap, setShowMiniMap] = React.useState(false);
  const [tempHideMainModal, setTempHideMainModal] = React.useState(false);
  const [showAddToTrip, setShowAddToTrip] = React.useState(false);
  const [aboutText, setAboutText] = React.useState<string | null>(null);

  // Estados para controlar errores de Lottie
  const [directionsLottieError, setDirectionsLottieError] = React.useState(false);
  const [locationLottieError, setLocationLottieError] = React.useState(false);
  const [websiteLottieError, setWebsiteLottieError] = React.useState(false);

  // Referencias para controlar las animaciones Lottie
  const directionsLottieRef = React.useRef<LottieView>(null);
  const locationLottieRef = React.useRef<LottieView>(null);
  const websiteLottieRef = React.useRef<LottieView>(null);
  const scheduleLottieRef = React.useRef<LottieView>(null);

  // Reset selected photo when place changes
  React.useEffect(() => {
    setSelectedPhotoIndex(0);
  }, [place?.id]);

  // Translate About/description dynamically when place or language changes
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const src = (place?.description || '').trim();
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
  }, [place?.description, i18n.language]);

  // Debug logging para showMiniMap
  React.useEffect(() => {
    console.log('showMiniMap state changed:', showMiniMap);
  }, [showMiniMap]);

  // Resetear estados de error y reproducir animaciones cuando el modal se abre
  React.useEffect(() => {
    if (visible) {
      console.log('[PlaceDetailModal] Opening with place:', {
        name: place?.name,
        description: place?.description,
        hasDescription: !!place?.description,
      });
      // Resetear estados de error
      setDirectionsLottieError(false);
      setLocationLottieError(false);
      setWebsiteLottieError(false);

      // Resetear estados de modales
      setShowMiniMap(false);
      setTempHideMainModal(false);

      // Pequeño delay para asegurar que los componentes estén montados
      setTimeout(() => {
        directionsLottieRef.current?.play();
        locationLottieRef.current?.play();
        websiteLottieRef.current?.play();
        scheduleLottieRef.current?.play();
      }, 300);
    }
  }, [visible, place?.name, place?.description]);

  if (!place) return null;

  console.log('[PlaceDetailModal] place.priceLevel:', place.priceLevel);
  console.log('[PlaceDetailModal] place.name:', place.name);

  const handleLocation = () => {
    // Reproducir animación al hacer clic
    locationLottieRef.current?.play();

    console.log('Opening location modal for place:', {
      name: place.name,
      coordinates: place.coordinates,
      hasCoordinates: !!place.coordinates,
      lat: place.coordinates?.lat,
      lng: place.coordinates?.lng,
    });

    if (place.coordinates && place.coordinates.lat && place.coordinates.lng) {
      console.log('Setting showMiniMap to true and hiding main modal');
      setTempHideMainModal(true);
      setShowMiniMap(true);
    } else {
      console.log('No valid coordinates found');
      Alert.alert(
        t('explore.modal.location_unavailable_title'),
        t('explore.modal.location_unavailable_message')
      );
    }
  };

  const handleWebsite = async () => {
    // Reproducir animación al hacer clic
    websiteLottieRef.current?.play();

    console.log('Website data:', {
      website: place.website,
      hasWebsite: !!place.website,
      websiteType: typeof place.website,
      placeKeys: Object.keys(place),
      place: place,
    });

    if (place.website && place.website.trim()) {
      let url = place.website.trim();
      // Asegurar que la URL tenga protocolo
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      console.log('Opening URL in in-app browser:', url);

      try {
        // Abrir en navegador integrado
        await WebBrowser.openBrowserAsync(url, {
          // Opciones de configuración del navegador
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.OVER_FULL_SCREEN,
          controlsColor: '#DE3D00', // Primary color
          toolbarColor: theme.colors.card, // Toolbar adapts to theme
          // Mostrar título de la página
          showTitle: true,
          // Permitir navegación hacia atrás/adelante
          enableBarCollapsing: false,
        });
      } catch (error) {
        console.error('Error opening in-app browser:', error);
        // Fallback a navegador externo si hay error
        Alert.alert(
          t('explore.modal.error_title'),
          'No se pudo abrir el navegador integrado. ¿Abrir en navegador externo?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir externamente',
              onPress: () => Linking.openURL(url),
            },
          ]
        );
      }
    } else {
      Alert.alert(
        t('explore.modal.website_unavailable_title'),
        t('explore.modal.website_unavailable_message')
      );
    }
  };

  const handleDirections = () => {
    // Reproducir animación al hacer clic
    directionsLottieRef.current?.play();

    // Mostrar notificación de funcionalidad próximamente
    Alert.alert(
      t('explore.modal.directions_coming_soon_title'),
      t('explore.modal.directions_coming_soon_message'),
      [{ text: 'Entendido', style: 'default' }]
    );

    // Código original comentado para futuro uso
    /*
    if (place.coordinates) {
      router.push(`/trips/directions?dest=${place.coordinates.lat},${place.coordinates.lng}&name=${encodeURIComponent(place.name)}`);
    } else {
      Alert.alert(
        t('explore.modal.directions_unavailable_title'),
        t('explore.modal.directions_unavailable_message')
      );
    }
    */
  };

  const handleSavePlace = async () => {
    // If this place is already in a trip and we have a remove function, use it
    if (isAlreadyInTrip && onRemoveFromTrip) {
      onRemoveFromTrip();
      return;
    }

    // Otherwise, handle normal favorite toggle
    const success = await toggleFavorite(place);
    if (!success) {
      Alert.alert('Error', 'No se pudo actualizar los favoritos');
    }
  };

  const handleAddToTrip = () => {
    if (tripId && onAddToTrip) {
      // Si venimos de un trip específico, agregar directamente
      onAddToTrip(place);
    } else {
      // Abrir modal superior para seleccionar/crear viaje
      setTempHideMainModal(true);
      setShowAddToTrip(true);
    }
  };

  // Componente para renderizar icono Lottie centrado con fallback
  const renderActionIcon = (
    lottieRef: React.RefObject<LottieView>,
    animationSource: string | AnimationObject | { uri: string },
    fallbackEmoji: string,
    errorState: boolean,
    setErrorState: (error: boolean) => void,
    disabled: boolean = false
  ) => {
    const handleAnimationFailure = (error: unknown) => {
      console.log('Lottie animation failed:', error);
      setErrorState(true);
    };

    return (
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: 'transparent' },
          disabled && styles.actionIconDisabled,
        ]}
      >
        {!errorState ? (
          <LottieView
            ref={lottieRef}
            source={animationSource}
            style={[styles.lottieIcon, disabled && styles.lottieIconDisabled]}
            loop={false}
            autoPlay={false}
            resizeMode="contain"
            onAnimationFailure={handleAnimationFailure}
          />
        ) : (
          <Text style={[styles.fallbackEmoji, disabled && styles.fallbackEmojiDisabled]}>
            {fallbackEmoji}
          </Text>
        )}
      </View>
    );
  };

  const renderStatusBadge = () => {
    if (place.openNow === undefined) return null;

    const bgColor = place.openNow ? '#D1FAE5' : '#FEE2E2';
    const textColor = place.openNow ? '#065F46' : '#991B1B';

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>
          {place.openNow ? t('explore.modal.open') : t('explore.modal.closed')}
        </Text>
      </View>
    );
  };

  const renderPhotos = () => {
    if (!place.photos || place.photos.length === 0) {
      return (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>📷</Text>
          <Text style={styles.photoLabel}>{t('explore.modal.no_photos')}</Text>
        </View>
      );
    }

    // Show up to 5 photos
    const photosToShow = place.photos.slice(0, 5);

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photosContainer}
        contentContainerStyle={styles.photosContent}
      >
        {photosToShow.map((photo, index) => (
          <TouchableOpacity
            key={index}
            style={styles.photoContainer}
            onPress={() => setSelectedPhotoIndex(index)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: photo }}
              style={[styles.photo, selectedPhotoIndex === index && styles.photoSelected]}
              resizeMode="cover"
            />
            {index === 0 && (
              <View style={styles.photoLabel}>
                <Text style={styles.photoLabelText}>{t('explore.modal.main_photo')}</Text>
              </View>
            )}
            {selectedPhotoIndex === index && (
              <View style={styles.photoSelectedOverlay}>
                <Text style={styles.photoSelectedText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <>
      <Modal
        visible={visible && !tempHideMainModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header con foto y botón cerrar */}
          <View style={styles.header}>
            {place.photos && place.photos.length > 0 ? (
              <Image
                source={{ uri: place.photos[selectedPhotoIndex] || place.photos[0] }}
                style={styles.headerImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient colors={['#F5F5F5', '#E5E5E5']} style={styles.headerImage}>
                <Text style={styles.headerPlaceholder}>📍</Text>
              </LinearGradient>
            )}

            {/* Blur overlay con controles o fallback */}
            <View style={styles.headerOverlay}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <View style={styles.closeButtonBlur}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePlace}
                disabled={favLoading || (!isAlreadyInTrip && !isFavorite(place.id))}
              >
                <View style={styles.saveButtonBlur}>
                  <Text style={styles.saveButtonText}>
                    {isAlreadyInTrip ? '❤️' : isFavorite(place.id) ? '❤️' : '🤍'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contenido principal */}
          <ScrollView
            style={[styles.content, { backgroundColor: theme.colors.background }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Información básica */}
            <View style={styles.basicInfo}>
              <View style={styles.titleRow}>
                <Text style={[styles.placeName, { color: theme.colors.text }]}>{place.name}</Text>
                {renderStatusBadge()}
              </View>

              {place.address && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressIcon}>📍</Text>
                  <Text style={[styles.addressText, { color: theme.colors.textMuted }]}>
                    {place.address}
                  </Text>
                </View>
              )}

              {/* Rating y reviews */}
              {place.rating && (
                <View style={styles.ratingRow}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={[styles.ratingText, { color: theme.colors.text }]}>
                    {place.rating}
                  </Text>
                  {place.reviews_count && (
                    <Text style={[styles.reviewsText, { color: theme.colors.textMuted }]}>
                      ({place.reviews_count})
                    </Text>
                  )}
                  {place.distance_km && (
                    <>
                      <Text style={[styles.separator, { color: theme.colors.textMuted }]}>•</Text>
                      <Text style={[styles.distanceText, { color: theme.colors.textMuted }]}>
                        {place.distance_km.toFixed(2)} km
                      </Text>
                    </>
                  )}
                </View>
              )}

              {/* Price Level */}
              {place.priceLevel !== undefined &&
                place.priceLevel !== null &&
                (() => {
                  // Convert Google price string to number
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

                  const priceSymbols = [t('explore.modal.price.free'), '$', '$$', '$$$', '$$$$'];
                  const priceLabel = priceLevelNum !== null ? priceSymbols[priceLevelNum] : '';

                  return priceLabel ? (
                    <View style={styles.priceLevelRow}>
                      <Text style={[styles.priceLevelLabel, { color: theme.colors.textMuted }]}>
                        {t('explore.modal.price.label')}
                      </Text>
                      <Text style={[styles.priceLevelValue, { color: '#10B981' }]}>
                        {priceLabel}
                      </Text>
                    </View>
                  ) : null;
                })()}
            </View>

            {/* Fotos adicionales */}
            {place.photos && place.photos.length > 1 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t('explore.modal.sections.photos')}
                </Text>
                {renderPhotos()}
              </View>
            )}

            {/* About - Editorial Summary */}
            {place.description && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>ℹ️</Text>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('explore.modal.sections.about')}
                  </Text>
                </View>
                <Text style={[styles.aboutText, { color: theme.colors.textMuted }]}>
                  {aboutText ?? place.description}
                </Text>
              </View>
            )}

            {/* Horarios de Apertura */}
            {place.openingHours && place.openingHours.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>🕐</Text>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('explore.modal.sections.hours')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.hoursContainer,
                    {
                      backgroundColor:
                        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5',
                    },
                  ]}
                >
                  {place.openingHours.map((hour, index) => {
                    const [day, time] = hour.split(': ');
                    return (
                      <View key={index} style={styles.hourRow}>
                        <Text style={[styles.hourDay, { color: theme.colors.text }]}>{day}</Text>
                        <Text style={[styles.hourTime, { color: theme.colors.textMuted }]}>
                          {time || t('explore.modal.closed')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Tipo de Lugar - OCULTO */}
            {false && place.primaryTypeDisplayName && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>🏷️</Text>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('explore.modal.sections.place_type')}
                  </Text>
                </View>
                <View style={styles.typeTag}>
                  <Text style={[styles.typeTagText, { color: theme.colors.text }]}>
                    {place.primaryTypeDisplayName}
                  </Text>
                </View>
              </View>
            )}

            {/* Información Adicional - OCULTO */}
            {false && (place.shortFormattedAddress || place.plusCode) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📋</Text>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Información Adicional
                  </Text>
                </View>
                {place.shortFormattedAddress && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Dirección corta:</Text>
                    <Text style={styles.infoValue}>{place.shortFormattedAddress}</Text>
                  </View>
                )}
                {place.plusCode && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Plus Code:</Text>
                    <Text style={styles.infoValueMono}>{place.plusCode}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Accesibilidad */}
            {place.accessibilityOptions && Object.keys(place.accessibilityOptions).length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>♿</Text>
                  <Text style={styles.sectionTitle}>
                    {t('explore.modal.sections.accessibility')}
                  </Text>
                </View>
                <View style={styles.accessibilityContainer}>
                  {place.accessibilityOptions.wheelchairAccessibleEntrance && (
                    <View style={styles.accessibilityItem}>
                      <Text style={styles.accessibilityIcon}>✓</Text>
                      <Text style={styles.accessibilityText}>
                        {t('explore.modal.accessibility.entrance')}
                      </Text>
                    </View>
                  )}
                  {place.accessibilityOptions.wheelchairAccessibleParking && (
                    <View style={styles.accessibilityItem}>
                      <Text style={styles.accessibilityIcon}>✓</Text>
                      <Text style={styles.accessibilityText}>
                        {t('explore.modal.accessibility.parking')}
                      </Text>
                    </View>
                  )}
                  {place.accessibilityOptions.wheelchairAccessibleRestroom && (
                    <View style={styles.accessibilityItem}>
                      <Text style={styles.accessibilityIcon}>✓</Text>
                      <Text style={styles.accessibilityText}>
                        {t('explore.modal.accessibility.restroom')}
                      </Text>
                    </View>
                  )}
                  {place.accessibilityOptions.wheelchairAccessibleSeating && (
                    <View style={styles.accessibilityItem}>
                      <Text style={styles.accessibilityIcon}>✓</Text>
                      <Text style={[styles.accessibilityText, { color: theme.colors.textMuted }]}>
                        {t('explore.modal.accessibility.seating')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Descripción OLD - removida ya que usamos About arriba */}

            {/* Información adicional */}
            {(place.category || place.types) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t('explore.modal.sections.categories')}
                </Text>
                <View style={styles.tagsContainer}>
                  {processPlaceCategories(place.types || [], place.category, 4, t).map(
                    (category, index) => (
                      <View
                        key={index}
                        style={[
                          styles.tag,
                          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        ]}
                      >
                        <Text style={[styles.tagText, { color: theme.colors.text }]}>
                          {category}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}

            {/* Acciones rápidas */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('explore.modal.sections.actions')}
              </Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: 'transparent', borderColor: 'transparent' },
                  ]}
                  onPress={handleDirections}
                >
                  {renderActionIcon(
                    directionsLottieRef,
                    cycleAnimation,
                    '🚴‍♂️', // Emoji de fallback para direcciones
                    directionsLottieError,
                    setDirectionsLottieError
                  )}
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>
                    {t('explore.modal.actions.directions')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: 'transparent', borderColor: 'transparent' },
                  ]}
                  onPress={handleLocation}
                  disabled={!place.coordinates}
                >
                  {renderActionIcon(
                    locationLottieRef,
                    locationCircleAnimation,
                    '📍', // Emoji de fallback para ubicación
                    locationLottieError,
                    setLocationLottieError,
                    !place.coordinates
                  )}
                  <Text
                    style={[
                      styles.actionText,
                      { color: !place.coordinates ? theme.colors.textMuted : theme.colors.text },
                      !place.coordinates && styles.actionTextDisabled,
                    ]}
                  >
                    {t('explore.modal.actions.location')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: 'transparent', borderColor: 'transparent' },
                  ]}
                  onPress={handleWebsite}
                  disabled={!place.website}
                >
                  {renderActionIcon(
                    websiteLottieRef,
                    globeAnimation,
                    '🌐', // Emoji de fallback para sitio web
                    websiteLottieError,
                    setWebsiteLottieError,
                    !place.website
                  )}
                  <Text
                    style={[
                      styles.actionText,
                      { color: !place.website ? theme.colors.textMuted : theme.colors.text },
                      !place.website && styles.actionTextDisabled,
                    ]}
                  >
                    {t('explore.modal.actions.website')}
                  </Text>
                </TouchableOpacity>

                {/* Botón Llamar - ELIMINADO */}
              </View>
            </View>

            {/* Espacio inferior para evitar que se corte el contenido */}
            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Botón principal flotante - Solo mostrar si no está ya en un viaje */}
          {!isAlreadyInTrip && (
            <View style={styles.floatingButtonContainer}>
              <TouchableOpacity style={styles.floatingButton} onPress={handleAddToTrip}>
                <LinearGradient
                  colors={['#DE3D00', '#FF6B35']}
                  style={styles.floatingButtonGradient}
                >
                  <Text style={styles.floatingButtonIcon}>➕</Text>
                  <Text style={styles.floatingButtonText}>
                    {tripId
                      ? t('explore.modal.add_to', { trip: tripTitle || t('explore.modal.trip') })
                      : t('explore.modal.add_to_trip')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal del mapa para mostrar la ubicación */}
      <MapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        places={[place]}
        title={t('explore.modal.location_of', { name: place.name })}
      />

      {/* Mini mapa modal para mostrar ubicación específica */}
      <MiniMapModal
        visible={showMiniMap}
        onClose={() => {
          console.log('Closing MiniMapModal and restoring main modal');
          setShowMiniMap(false);
          setTempHideMainModal(false);
        }}
        placeName={place.name}
        latitude={place.coordinates?.lat || 0}
        longitude={place.coordinates?.lng || 0}
      />

      {/* Add To Trip stacked modal */}
      <AddToTripModal
        visible={showAddToTrip}
        place={place}
        onClose={() => {
          setShowAddToTrip(false);
          setTempHideMainModal(false);
        }}
        onAdded={() => {
          setShowAddToTrip(false);
          setTempHideMainModal(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F7FA',
    flex: 1,
  },
  header: {
    height: SCREEN_HEIGHT * 0.3,
    position: 'relative',
  },
  headerImage: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  headerPlaceholder: {
    color: '#CCCCCC',
    fontSize: 48,
  },
  headerOverlay: {
    alignItems: 'flex-start',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  closeButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeButtonText: {
    color: '#333333',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButtonBlur: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  saveButtonText: {
    fontSize: 20,
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    marginTop: -24,
  },
  basicInfo: {
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: 1,
    padding: 20,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  placeName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    marginRight: 12,
  },
  statusBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  addressIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  starIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 16,
    marginRight: 8,
  },
  priceLevelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  priceLevelLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceLevelValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  separator: {
    color: '#CCCCCC',
    fontSize: 16,
    marginRight: 8,
  },
  distanceText: {
    fontSize: 14,
  },
  section: {
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  photosContainer: {
    marginHorizontal: -20,
  },
  photosContent: {
    paddingHorizontal: 20,
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photo: {
    borderRadius: 12,
    height: 80,
    width: 120,
  },
  placeholderImage: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    height: 80,
    justifyContent: 'center',
    width: 120,
  },
  placeholderText: {
    color: '#CCCCCC',
    fontSize: 24,
  },
  photoLabel: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    top: 6,
  },
  photoLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: '22%',
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 8,
    width: 56,
  },
  actionIconDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionTextDisabled: {
    opacity: 0.5,
  },
  lottieIcon: {
    width: 40, // Aumentado para mayor presencia visual
    height: 40,
  },
  lottieIconDisabled: {
    opacity: 0.5,
  },
  fallbackEmoji: {
    fontSize: 24,
    textAlign: 'center',
  },
  fallbackEmojiDisabled: {
    opacity: 0.5,
  },
  bottomSpacing: {
    height: 100,
  },
  floatingButtonContainer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E5E5',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    position: 'absolute',
    right: 0,
  },
  floatingButton: {
    borderRadius: 16,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 8,
    overflow: 'hidden',
  },
  floatingButtonGradient: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  floatingButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // New styles for photo selection
  photoSelected: {
    borderColor: '#4F8EF7',
    borderWidth: 3,
  },
  photoSelectedOverlay: {
    alignItems: 'center',
    backgroundColor: '#4F8EF7',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
  },
  photoSelectedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // About Section
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
  },
  // Hours Section
  hoursContainer: {
    borderRadius: 12,
    padding: 12,
  },
  hourRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  hourDay: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  hourTime: {
    fontSize: 15,
  },
  // Type Tag
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0E6FF',
    borderColor: '#C4B5FD',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typeTagText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Info Rows
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoValueMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 15,
    lineHeight: 22,
  },
  // Accessibility
  accessibilityContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  accessibilityItem: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
  },
  accessibilityIcon: {
    color: '#10B981',
    fontSize: 18,
    marginRight: 12,
  },
  accessibilityText: {
    flex: 1,
    fontSize: 15,
  },
});
