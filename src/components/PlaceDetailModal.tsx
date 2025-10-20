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
import { useRouter } from 'expo-router';

import LottieView from 'lottie-react-native';

import AddToTripModal from './AddToTripModal';
import MapModal from './MapModal';
import MiniMapModal from './MiniMapModal';
import cycleAnimation from '../../assets/animations/cycle.json';
import globeAnimation from '../../assets/animations/globe.json';
import locationCircleAnimation from '../../assets/animations/location-circle.json';
import { COLORS } from '../constants/colors';
import { processPlaceCategories } from '../lib/categoryProcessor';
import { EnhancedPlace } from '../lib/placesSearch';
import { useFavorites } from '../lib/useFavorites';

// Conditional BlurView import
let BlurView: any = View;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  // Fallback to regular View if expo-blur is not available
  console.log('expo-blur not available, using fallback');
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const router = useRouter();
  const { isFavorite, toggleFavorite, loading: favLoading } = useFavorites();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);
  const [showMapModal, setShowMapModal] = React.useState(false);
  const [showMiniMap, setShowMiniMap] = React.useState(false);
  const [tempHideMainModal, setTempHideMainModal] = React.useState(false);
  const [showAddToTrip, setShowAddToTrip] = React.useState(false);

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

  // Debug logging para showMiniMap
  React.useEffect(() => {
    console.log('showMiniMap state changed:', showMiniMap);
  }, [showMiniMap]);

  // Resetear estados de error y reproducir animaciones cuando el modal se abre
  React.useEffect(() => {
    if (visible) {
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
  }, [visible]);

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
        'Ubicación no disponible',
        'No hay coordenadas para mostrar este lugar en el mapa'
      );
    }
  };

  const handleWebsite = () => {
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
      console.log('Opening URL:', url);
      Linking.openURL(url);
    } else {
      Alert.alert('Sitio web no disponible', 'No hay sitio web para este lugar');
    }
  };

  const handleDirections = () => {
    // Reproducir animación al hacer clic
    directionsLottieRef.current?.play();

    // Mostrar notificación de funcionalidad próximamente
    Alert.alert(
      'Funcionalidad próxima',
      'Las direcciones paso a paso llegarán pronto a Goveling. Por ahora puedes usar tu app de mapas favorita.',
      [{ text: 'Entendido', style: 'default' }]
    );

    // Código original comentado para futuro uso
    /*
    if (place.coordinates) {
      router.push(`/trips/directions?dest=${place.coordinates.lat},${place.coordinates.lng}&name=${encodeURIComponent(place.name)}`);
    } else {
      Alert.alert('Ubicación no disponible', 'No se puede obtener direcciones para este lugar');
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
    animationSource: any,
    fallbackEmoji: string,
    errorState: boolean,
    setErrorState: (error: boolean) => void,
    disabled: boolean = false
  ) => {
    const handleAnimationFailure = (error: any) => {
      console.log('Lottie animation failed:', error);
      setErrorState(true);
    };

    return (
      <View style={[styles.actionIcon, disabled && styles.actionIconDisabled]}>
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

    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: place.openNow ? COLORS.status.successLight : COLORS.status.errorLight,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: place.openNow ? COLORS.status.successDark : COLORS.status.errorDark },
          ]}
        >
          {place.openNow ? 'Abierto' : 'Cerrado'}
        </Text>
      </View>
    );
  };

  const renderPhotos = () => {
    if (!place.photos || place.photos.length === 0) {
      return (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>📷</Text>
          <Text style={styles.photoLabel}>Sin fotos</Text>
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
                <Text style={styles.photoLabelText}>Principal</Text>
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
              <LinearGradient
                colors={[COLORS.background.gray, COLORS.border.dark]}
                style={styles.headerImage}
              >
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
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
            {/* Información básica */}
            <View style={styles.basicInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.placeName}>{place.name}</Text>
                {renderStatusBadge()}
              </View>

              {place.address && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressIcon}>📍</Text>
                  <Text style={styles.addressText}>{place.address}</Text>
                </View>
              )}

              {/* Rating y reviews */}
              {place.rating && (
                <View style={styles.ratingRow}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ratingText}>{place.rating}</Text>
                  {place.reviews_count && (
                    <Text style={styles.reviewsText}>({place.reviews_count})</Text>
                  )}
                  {place.distance_km && (
                    <>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.distanceText}>{place.distance_km.toFixed(2)} km</Text>
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

                  const priceSymbols = ['Gratis', '$', '$$', '$$$', '$$$$'];
                  const priceLabel = priceLevelNum !== null ? priceSymbols[priceLevelNum] : '';

                  return priceLabel ? (
                    <View style={styles.priceLevelRow}>
                      <Text style={styles.priceLevelLabel}>Precio: </Text>
                      <Text style={styles.priceLevelValue}>{priceLabel}</Text>
                    </View>
                  ) : null;
                })()}
            </View>

            {/* Fotos adicionales */}
            {place.photos && place.photos.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fotos</Text>
                {renderPhotos()}
              </View>
            )}

            {/* About - Editorial Summary */}
            {place.description && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>ℹ️</Text>
                  <Text style={styles.sectionTitle}>About</Text>
                </View>
                <Text style={styles.aboutText}>{place.description}</Text>
              </View>
            )}

            {/* Horarios de Apertura */}
            {place.openingHours && place.openingHours.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>🕐</Text>
                  <Text style={styles.sectionTitle}>Horarios</Text>
                </View>
                <View style={styles.hoursContainer}>
                  {place.openingHours.map((hour, index) => {
                    const [day, time] = hour.split(': ');
                    return (
                      <View key={index} style={styles.hourRow}>
                        <Text style={styles.hourDay}>{day}</Text>
                        <Text style={styles.hourTime}>{time || 'Cerrado'}</Text>
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
                  <Text style={styles.sectionTitle}>Tipo de Lugar</Text>
                </View>
                <View style={styles.typeTag}>
                  <Text style={styles.typeTagText}>{place.primaryTypeDisplayName}</Text>
                </View>
              </View>
            )}

            {/* Información Adicional - OCULTO */}
            {false && (place.shortFormattedAddress || place.plusCode) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📋</Text>
                  <Text style={styles.sectionTitle}>Información Adicional</Text>
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
                  <Text style={styles.sectionTitle}>Accesibilidad</Text>
                </View>
                <View style={styles.accessibilityContainer}>
                  {place.accessibilityOptions.wheelchairAccessibleEntrance && (
                    <View style={styles.accessibilityItem}>
                      <Text style={styles.accessibilityIcon}>✓</Text>
                      <Text style={styles.accessibilityText}>Entrada accesible</Text>
                    </View>
                  )}
                  {place.accessibilityOptions.wheelchairAccessibleParking && (
                    <View style={styles.accessibilityItem}>
                      <Text style={styles.accessibilityIcon}>✓</Text>
                      <Text style={styles.accessibilityText}>Estacionamiento accesible</Text>
                    </View>
                  )}
                  {place.accessibilityOptions.wheelchairAccessibleRestroom && (
                    <View style={styles.accessibilityItem}>
                      <Text style={styles.accessibilityIcon}>✓</Text>
                      <Text style={styles.accessibilityText}>Baños accesibles</Text>
                    </View>
                  )}
                  {place.accessibilityOptions.wheelchairAccessibleSeating && (
                    <View style={styles.accessibilityItem}>
                      <Text style={styles.accessibilityIcon}>✓</Text>
                      <Text style={styles.accessibilityText}>Asientos accesibles</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Descripción OLD - removida ya que usamos About arriba */}

            {/* Información adicional */}
            {(place.category || place.types) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Categorías</Text>
                <View style={styles.tagsContainer}>
                  {processPlaceCategories(place.types || [], place.category, 4).map(
                    (category, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{category}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}

            {/* Acciones rápidas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
                  {renderActionIcon(
                    directionsLottieRef,
                    cycleAnimation,
                    '🚴‍♂️', // Emoji de fallback para direcciones
                    directionsLottieError,
                    setDirectionsLottieError
                  )}
                  <Text style={styles.actionText}>Cómo llegar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
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
                    style={[styles.actionText, !place.coordinates && styles.actionTextDisabled]}
                  >
                    Ubicación
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
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
                  <Text style={[styles.actionText, !place.website && styles.actionTextDisabled]}>
                    Sitio web
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
                  colors={[COLORS.primary.main, COLORS.primary.light]}
                  style={styles.floatingButtonGradient}
                >
                  <Text style={styles.floatingButtonIcon}>➕</Text>
                  <Text style={styles.floatingButtonText}>
                    {tripId ? `Agregar a ${tripTitle || 'viaje'}` : 'Añadir al viaje'}
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
        title={`Ubicación de ${place.name}`}
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
    backgroundColor: COLORS.background.secondary,
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
    color: COLORS.text.lightGray,
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
    backgroundColor: COLORS.background.whiteOpacity.strong,
    borderRadius: 20,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeButtonText: {
    color: COLORS.text.darkGray,
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButtonBlur: {
    alignItems: 'center',
    backgroundColor: COLORS.background.whiteOpacity.strong,
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
    backgroundColor: COLORS.utility.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    marginTop: -24,
  },
  basicInfo: {
    borderBottomColor: COLORS.background.gray,
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
    color: COLORS.text.darkGray,
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
    color: COLORS.text.tertiary,
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
    color: COLORS.text.darkGray,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  reviewsText: {
    color: COLORS.text.tertiary,
    fontSize: 16,
    marginRight: 8,
  },
  priceLevelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  priceLevelLabel: {
    color: COLORS.text.tertiary,
    fontSize: 16,
    fontWeight: '600',
  },
  priceLevelValue: {
    color: COLORS.status.success,
    fontSize: 16,
    fontWeight: '700',
  },
  separator: {
    color: COLORS.border.gray,
    fontSize: 16,
    marginRight: 8,
  },
  distanceText: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },
  section: {
    borderBottomColor: COLORS.background.gray,
    borderBottomWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.text.darkGray,
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
    backgroundColor: COLORS.background.gray,
    borderRadius: 12,
    height: 80,
    justifyContent: 'center',
    width: 120,
  },
  placeholderText: {
    color: COLORS.text.lightGray,
    fontSize: 24,
  },
  photoLabel: {
    backgroundColor: COLORS.background.blackOpacity.strong,
    borderRadius: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    top: 6,
  },
  photoLabelText: {
    color: COLORS.text.white,
    fontSize: 10,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.background.purple.ultraLight,
    borderColor: COLORS.border.purpleLight,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: COLORS.primary.deepIndigo,
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
    backgroundColor: COLORS.background.gray,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 8,
    width: 56,
  },
  actionIconDisabled: {
    backgroundColor: COLORS.background.tertiary,
    opacity: 0.5,
  },
  actionText: {
    color: COLORS.text.darkGray,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionTextDisabled: {
    color: COLORS.text.lightGray,
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
    backgroundColor: COLORS.utility.white,
    borderTopColor: COLORS.background.gray,
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
    color: COLORS.text.white,
    fontSize: 18,
    fontWeight: '700',
  },
  // New styles for photo selection
  photoSelected: {
    borderColor: COLORS.status.info,
    borderWidth: 3,
  },
  photoSelectedOverlay: {
    alignItems: 'center',
    backgroundColor: COLORS.status.info,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
  },
  photoSelectedText: {
    color: COLORS.text.white,
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
    color: COLORS.text.slateGray,
    fontSize: 16,
    lineHeight: 24,
  },
  // Hours Section
  hoursContainer: {
    backgroundColor: COLORS.background.tertiary,
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
    color: COLORS.text.darkGray,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  hourTime: {
    color: COLORS.text.tertiary,
    fontSize: 15,
  },
  // Type Tag
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background.purple.ultraLight,
    borderColor: COLORS.border.purpleLight,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typeTagText: {
    color: COLORS.primary.deepIndigo,
    fontSize: 15,
    fontWeight: '600',
  },
  // Info Rows
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    color: COLORS.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    color: COLORS.text.darkGray,
    fontSize: 15,
    lineHeight: 22,
  },
  infoValueMono: {
    color: COLORS.text.darkGray,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 15,
    lineHeight: 22,
  },
  // Accessibility
  accessibilityContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 12,
  },
  accessibilityItem: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
  },
  accessibilityIcon: {
    color: COLORS.status.success,
    fontSize: 18,
    marginRight: 12,
  },
  accessibilityText: {
    color: COLORS.text.darkGray,
    flex: 1,
    fontSize: 15,
  },
});
