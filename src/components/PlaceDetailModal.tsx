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
import { EnhancedPlace } from '../lib/placesSearch';
import { useRouter } from 'expo-router';
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
}

export default function PlaceDetailModal({ visible, place, onClose }: PlaceDetailModalProps) {
  const router = useRouter();
  const { isFavorite, toggleFavorite, loading: favLoading } = useFavorites();

  if (!place) return null;

  const handleCall = () => {
    if (place.phone) {
      const phoneNumber = place.phone.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Teléfono no disponible', 'No hay información de contacto para este lugar');
    }
  };

  const handleWebsite = () => {
    if (place.website) {
      Linking.openURL(place.website);
    } else {
      Alert.alert('Sitio web no disponible', 'No hay sitio web para este lugar');
    }
  };

  const handleDirections = () => {
    if (place.coordinates) {
      router.push(`/trips/directions?dest=${place.coordinates.lat},${place.coordinates.lng}&name=${encodeURIComponent(place.name)}`);
    } else {
      Alert.alert('Ubicación no disponible', 'No se puede obtener direcciones para este lugar');
    }
  };

  const handleSavePlace = async () => {
    const success = await toggleFavorite(place);
    if (!success) {
      Alert.alert('Error', 'No se pudo actualizar los favoritos');
    }
  };

  const handleAddToTrip = () => {
    router.push(`/explore/add-to-trip?placeId=${place.id}&name=${encodeURIComponent(place.name)}`);
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

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.photosContainer}
        contentContainerStyle={styles.photosContent}
      >
        {place.photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image 
              source={{ uri: photo }} 
              style={styles.photo}
              resizeMode="cover"
            />
            {index === 0 && (
              <View style={styles.photoLabel}>
                <Text style={styles.photoLabelText}>Foto principal</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header con foto y botón cerrar */}
        <View style={styles.header}>
          {place.photos && place.photos.length > 0 ? (
            <Image 
              source={{ uri: place.photos[0] }} 
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
              disabled={favLoading}
            >
              <View style={styles.saveButtonBlur}>
                <Text style={styles.saveButtonText}>
                  {isFavorite(place.id) ? '❤️' : '🤍'}
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
              <Text style={styles.sectionTitle}>Categoría</Text>
              <View style={styles.tagsContainer}>
                {place.category && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{place.category}</Text>
                  </View>
                )}
                {place.types?.slice(0, 3).map((type, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{type}</Text>
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
                <View style={styles.actionIcon}>
                  <Text style={styles.actionIconText}>🧭</Text>
                </View>
                <Text style={styles.actionText}>Cómo llegar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleCall}
                disabled={!place.phone}
              >
                <View style={[styles.actionIcon, !place.phone && styles.actionIconDisabled]}>
                  <Text style={styles.actionIconText}>📞</Text>
                </View>
                <Text style={[styles.actionText, !place.phone && styles.actionTextDisabled]}>
                  Llamar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleWebsite}
                disabled={!place.website}
              >
                <View style={[styles.actionIcon, !place.website && styles.actionIconDisabled]}>
                  <Text style={styles.actionIconText}>🌐</Text>
                </View>
                <Text style={[styles.actionText, !place.website && styles.actionTextDisabled]}>
                  Sitio web
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Compartir', 'Funcionalidad próximamente')}
              >
                <View style={styles.actionIcon}>
                  <Text style={styles.actionIconText}>📤</Text>
                </View>
                <Text style={styles.actionText}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Espacio inferior para evitar que se corte el contenido */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Botón principal flotante */}
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
              <Text style={styles.floatingButtonText}>Añadir al viaje</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
});
