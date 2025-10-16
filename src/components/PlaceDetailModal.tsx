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
import { processPlaceCategories } from '../lib/categoryProcessor';
import { EnhancedPlace } from '../lib/placesSearch';
import { useFavorites } from '../lib/useFavorites';

// Conditional BlurView import
let BlurView: any = View;
try {
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
  const [callLottieError, setCallLottieError] = React.useState(false);

  // Referencias para controlar las animaciones Lottie
  const directionsLottieRef = React.useRef<LottieView>(null);
  const callLottieRef = React.useRef<LottieView>(null);
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
      setCallLottieError(false);

      // Resetear estados de modales
      setShowMiniMap(false);
      setTempHideMainModal(false);

      // Pequeño delay para asegurar que los componentes estén montados
      setTimeout(() => {
        directionsLottieRef.current?.play();
        callLottieRef.current?.play();
        websiteLottieRef.current?.play();
        scheduleLottieRef.current?.play();
      }, 300);
    }
  }, [visible]);

  if (!place) return null;

  const handleCall = () => {
    // Reproducir animación al hacer clic
    callLottieRef.current?.play();

    if (place.phone) {
      const phoneNumber = place.phone.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Teléfono no disponible', 'No hay información de contacto para este lugar');
    }
  };

  const handleLocation = () => {
    // Reproducir animación al hacer clic
    callLottieRef.current?.play();

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

  const handleSchedule = () => {
    // Reproducir animación al hacer clic
    scheduleLottieRef.current?.play();

    console.log('Schedule data:', {
      openingHours: place.openingHours,
      opening_hours_raw: place.opening_hours_raw,
      openNow: place.openNow,
      hasOpeningHours: !!place.openingHours,
      hasOpeningHoursRaw: !!place.opening_hours_raw,
      openingHoursType: typeof place.openingHours,
      openingHoursRawType: typeof place.opening_hours_raw,
      placeKeys: Object.keys(place),
      place: place,
    });

    let scheduleText = '';

    // Intentar obtener horarios de diferentes fuentes
    if (place.openingHours && Array.isArray(place.openingHours) && place.openingHours.length > 0) {
      scheduleText = place.openingHours.join('\n');
    } else if (place.opening_hours_raw) {
      if (typeof place.opening_hours_raw === 'string') {
        scheduleText = place.opening_hours_raw;
      } else if (
        place.opening_hours_raw.weekday_text &&
        Array.isArray(place.opening_hours_raw.weekday_text)
      ) {
        scheduleText = place.opening_hours_raw.weekday_text.join('\n');
      } else if (place.opening_hours_raw.periods) {
        scheduleText = 'Horarios disponibles (ver detalles en el lugar)';
      } else {
        scheduleText = JSON.stringify(place.opening_hours_raw, null, 2);
      }
    } else if (place.openNow !== undefined) {
      scheduleText = `Estado actual: ${place.openNow ? 'Abierto' : 'Cerrado'}`;
    }

    if (scheduleText.trim()) {
      Alert.alert('Horarios de funcionamiento', scheduleText, [
        { text: 'Cerrar', style: 'default' },
      ]);
    } else {
      Alert.alert('Horarios no disponibles', 'No hay información de horarios para este lugar');
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
        style={[styles.statusBadge, { backgroundColor: place.openNow ? '#D1FAE5' : '#FEE2E2' }]}
      >
        <Text style={[styles.statusText, { color: place.openNow ? '#065F46' : '#991B1B' }]}>
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
              <LinearGradient colors={['#F3F4F6', '#E5E7EB']} style={styles.headerImage}>
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
            </View>

            {/* Fotos adicionales */}
            {place.photos && place.photos.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fotos</Text>
                {renderPhotos()}
              </View>
            )}

            {/* Descripción */}
            {place.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Text style={styles.description}>{place.description}</Text>
              </View>
            )}

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
                    require('../../assets/animations/cycle.json'),
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
                    callLottieRef,
                    require('../../assets/animations/location-circle.json'),
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
                    require('../../assets/animations/globe.json'),
                    '🌐', // Emoji de fallback para sitio web
                    websiteLottieError,
                    setWebsiteLottieError,
                    !place.website
                  )}
                  <Text style={[styles.actionText, !place.website && styles.actionTextDisabled]}>
                    Sitio web
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCall}
                  disabled={!place.phone}
                >
                  {renderActionIcon(
                    scheduleLottieRef,
                    require('../../assets/animations/clock.json'),
                    '📞', // Emoji de fallback para llamar
                    callLottieError,
                    setCallLottieError,
                    !place.phone
                  )}
                  <Text style={[styles.actionText, !place.phone && styles.actionTextDisabled]}>
                    Llamar
                  </Text>
                </TouchableOpacity>
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
                  colors={['#8B5CF6', '#EC4899']}
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
    backgroundColor: '#F8F9FA',
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
    color: '#9CA3AF',
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
    color: '#1F2937',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    marginTop: -24,
  },
  basicInfo: {
    borderBottomColor: '#F3F4F6',
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
    color: '#1F2937',
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
    color: '#6B7280',
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
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  reviewsText: {
    color: '#6B7280',
    fontSize: 16,
    marginRight: 8,
  },
  separator: {
    color: '#D1D5DB',
    fontSize: 16,
    marginRight: 8,
  },
  distanceText: {
    color: '#6B7280',
    fontSize: 14,
  },
  section: {
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    color: '#1F2937',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 80,
    justifyContent: 'center',
    width: 120,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 24,
  },
  photoLabel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  description: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#3730A3',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 8,
    width: 56,
  },
  actionIconDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.5,
  },
  actionText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionTextDisabled: {
    color: '#9CA3AF',
  },
  lottieIcon: {
    width: 32, // Tamaño optimizado para que quepa bien centrado
    height: 32,
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
    borderTopColor: '#F3F4F6',
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
    borderColor: '#3B82F6',
    borderWidth: 3,
  },
  photoSelectedOverlay: {
    alignItems: 'center',
    backgroundColor: '#3B82F6',
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
});
