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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { EnhancedPlace } from '../lib/placesSearch';
import { useRouter } from 'expo-router';
import { useFavorites } from '../lib/useFavorites';
import MapModal from './MapModal';
import MiniMapModal from './MiniMapModal';
import { processPlaceCategories } from '../lib/categoryProcessor';

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
  onRemoveFromTrip
}: PlaceDetailModalProps) {
  const router = useRouter();
  const { isFavorite, toggleFavorite, loading: favLoading } = useFavorites();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);
  const [showMapModal, setShowMapModal] = React.useState(false);
  const [showMiniMap, setShowMiniMap] = React.useState(false);
  const [tempHideMainModal, setTempHideMainModal] = React.useState(false);

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
      lng: place.coordinates?.lng
    });

    if (place.coordinates && place.coordinates.lat && place.coordinates.lng) {
      console.log('Setting showMiniMap to true and hiding main modal');
      setTempHideMainModal(true);
      setShowMiniMap(true);
    } else {
      console.log('No valid coordinates found');
      Alert.alert('Ubicación no disponible', 'No hay coordenadas para mostrar este lugar en el mapa');
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
      place: place
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
      place: place
    });

    let scheduleText = '';

    // Intentar obtener horarios de diferentes fuentes
    if (place.openingHours && Array.isArray(place.openingHours) && place.openingHours.length > 0) {
      scheduleText = place.openingHours.join('\n');
    } else if (place.opening_hours_raw) {
      if (typeof place.opening_hours_raw === 'string') {
        scheduleText = place.opening_hours_raw;
      } else if (place.opening_hours_raw.weekday_text && Array.isArray(place.opening_hours_raw.weekday_text)) {
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
      Alert.alert(
        'Horarios de funcionamiento',
        scheduleText,
        [{ text: 'Cerrar', style: 'default' }]
      );
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
      [
        { text: 'Entendido', style: 'default' }
      ]
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
      // Si venimos del explore general, ir a la pantalla de selección de trip
      router.push(`/explore/add-to-trip?placeId=${place.id}&name=${encodeURIComponent(place.name)}`);
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
              style={[
                styles.photo,
                selectedPhotoIndex === index && styles.photoSelected
              ]}
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
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.headerImage}
              >
                <Text style={styles.headerPlaceholder}>📍</Text>
              </LinearGradient>
            )}

            {/* Blur overlay con controles o fallback */}
            <View style={styles.headerOverlay}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
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
                    {isAlreadyInTrip ? '❤️' : (isFavorite(place.id) ? '❤️' : '🤍')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contenido principal */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
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
                      <Text style={styles.distanceText}>
                        {place.distance_km.toFixed(2)} km
                      </Text>
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
                  {processPlaceCategories(place.types || [], place.category, 4).map((category, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{category}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Acciones rápidas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDirections}
                >
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
                  <Text style={[styles.actionText, !place.coordinates && styles.actionTextDisabled]}>
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
              <TouchableOpacity
                style={styles.floatingButton}
                onPress={handleAddToTrip}
              >
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    height: SCREEN_HEIGHT * 0.3,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholder: {
    fontSize: 48,
    color: '#9CA3AF',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  basicInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  placeName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
  },
  separator: {
    fontSize: 16,
    color: '#D1D5DB',
    marginRight: 8,
  },
  distanceText: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
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
    width: 120,
    height: 80,
    borderRadius: 12,
  },
  placeholderImage: {
    width: 120,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  photoLabel: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoLabelText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  tagText: {
    fontSize: 14,
    color: '#3730A3',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    width: '22%',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.5,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  floatingButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  floatingButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  floatingButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // New styles for photo selection
  photoSelected: {
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  photoSelectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoSelectedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
