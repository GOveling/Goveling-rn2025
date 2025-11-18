import React, { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentRejectedModal } from '@/components/social/ContentRejectedModal';
import { ModerationAlert } from '@/components/social/ModerationAlert';
import { PlacePicker } from '@/components/social/PlacePicker';
import { UploadProgress } from '@/components/social/UploadProgress';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { getCurrentUser } from '@/lib/userUtils';
import { GlobalPlacesService } from '@/services/globalPlacesService';
import GooglePlacesService, { type NearbyPlace } from '@/services/googlePlacesService';
import { ImageService, type ProcessedImage } from '@/services/imageService';
import { ModerationService, type ModerationResponse } from '@/services/moderationService';
import type { PhotoLocation } from '@/utils/exifUtils';
import { extractPhotosLocations, getAverageLocation, getCurrentLocation } from '@/utils/exifUtils';

interface SelectedImage {
  id: string;
  uri: string;
  asset?: ImagePicker.ImagePickerAsset;
  processed?: ProcessedImage;
}

interface SelectedPlace {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  formatted_address: string;
  // Datos enriquecidos de Google Places
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{ photo_reference: string; height: number; width: number }>;
  types?: string[];
  price_level?: number;
}

export const CreatePostScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStage, setUploadStage] = useState<
    'compressing' | 'uploading' | 'moderating' | 'processing'
  >('compressing');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [moderationResult, setModerationResult] = useState<ModerationResponse | null>(null);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [showModerationAlert, setShowModerationAlert] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [photoLocation, setPhotoLocation] = useState<PhotoLocation | null>(null);
  const [currentDeviceLocation, setCurrentDeviceLocation] = useState<PhotoLocation | null>(null);

  const handlePickImages = useCallback(async () => {
    try {
      const hasPermission = await ImageService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(t('social.create.permission_required'), t('social.create.library_permission'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('social.create.grant_permission'),
            onPress: () => ImageService.requestPermissions(),
          },
        ]);
        return;
      }

      const assets = await ImageService.pickImage(true);
      if (assets.length === 0) return;

      const remainingSlots = 10 - images.length;
      const assetsToAdd = assets.slice(0, remainingSlots);

      const newImages: SelectedImage[] = assetsToAdd.map((asset) => ({
        id: Math.random().toString(36),
        uri: asset.uri,
        asset, // Guardar el asset original con EXIF metadata
      }));

      setImages((prev) => [...prev, ...newImages]);
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert(t('common.error'), t('social.create.error'));
    }
  }, [images.length, t]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const hasPermission = await ImageService.requestCameraPermissions();
      if (!hasPermission) {
        Alert.alert(t('social.create.permission_required'), t('social.create.camera_permission'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('social.create.grant_permission'),
            onPress: () => ImageService.requestCameraPermissions(),
          },
        ]);
        return;
      }

      const asset = await ImageService.takePhoto();
      if (!asset) return;

      if (images.length >= 10) {
        Alert.alert(t('common.error'), t('social.create.max_photos'));
        return;
      }

      const newImage: SelectedImage = {
        id: Math.random().toString(36),
        uri: asset.uri,
        asset, // Guardar el asset con EXIF metadata
      };

      setImages((prev) => [...prev, newImage]);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), t('social.create.error'));
    }
  }, [images.length, t]);

  const handleRemoveImage = useCallback((imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  // Cargar ubicación actual al montar el componente
  useEffect(() => {
    const loadCurrentLocation = async () => {
      const location = await getCurrentLocation();
      setCurrentDeviceLocation(location);
    };
    loadCurrentLocation();
  }, []);

  // Extraer ubicación de las fotos cuando se agregan imágenes
  // Y buscar automáticamente el lugar usando reverse geocoding híbrido
  useEffect(() => {
    const extractLocations = async () => {
      const assets = images
        .map((img) => img.asset)
        .filter((asset): asset is ImagePicker.ImagePickerAsset => asset !== undefined);

      console.log('🔍 Extract Locations - Total images:', images.length);
      console.log('🔍 Extract Locations - Assets with metadata:', assets.length);

      if (assets.length === 0) {
        setPhotoLocation(null);
        setSelectedPlace(null); // Limpiar lugar seleccionado
        return;
      }

      const locations = await extractPhotosLocations(assets);
      console.log('📍 Extract Locations - Found GPS coordinates:', locations.length);

      if (locations.length > 0) {
        const avgLocation = getAverageLocation(locations);
        console.log('📍 Extract Locations - Average location:', avgLocation);
        setPhotoLocation(avgLocation);

        // 🎯 NUEVO: Buscar automáticamente el lugar usando reverse geocoding híbrido
        console.log('🎯 Starting hybrid reverse geocoding...');
        const place = await GooglePlacesService.getPlaceFromCoordinates(
          avgLocation.latitude,
          avgLocation.longitude
        );

        if (place) {
          console.log('✅ Auto-detected place:', place.name);
          console.log('📋 Place details:', {
            place_id: place.place_id,
            id: place.id,
            rating: place.rating,
            photos: place.photos?.length || 0,
            types: place.types,
          });

          // Auto-seleccionar el lugar encontrado CON TODOS LOS DATOS ENRIQUECIDOS
          const placeToSet: SelectedPlace = {
            place_id: place.place_id || place.id,
            name: place.name,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            formatted_address: place.formatted_address || place.vicinity || '',
            // Datos enriquecidos de Google Places
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            photos: place.photos,
            types: place.types,
            price_level: place.price_level,
          };

          console.log('📌 Setting selected place:', placeToSet);
          setSelectedPlace(placeToSet);
        } else {
          console.log('⚠️ Could not find place for coordinates');
        }
      } else {
        console.log('⚠️ Extract Locations - No GPS data found in any photo');
        setPhotoLocation(null);
        setSelectedPlace(null);
      }
    };

    extractLocations();
  }, [images]);

  const handleSelectPlace = useCallback(() => {
    setShowPlacePicker(true);
  }, []);

  const handlePlaceSelected = useCallback((place: NearbyPlace) => {
    setSelectedPlace({
      place_id: place.place_id || place.id,
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      formatted_address: place.formatted_address || place.vicinity || '',
      // Datos enriquecidos de Google Places
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      photos: place.photos,
      types: place.types,
      price_level: place.price_level,
    });
  }, []);

  const validatePost = useCallback((): { valid: boolean; error?: string } => {
    if (images.length === 0) {
      return { valid: false, error: t('social.create.min_photos') };
    }

    if (!selectedPlace) {
      return { valid: false, error: t('social.create.place_required_error') };
    }

    const textValidation = ModerationService.preValidateText(caption);
    if (!textValidation.valid) {
      return { valid: false, error: textValidation.error };
    }

    return { valid: true };
  }, [images.length, selectedPlace, caption, t]);

  const processImages = useCallback(async (): Promise<ProcessedImage[]> => {
    setUploadStage('compressing');
    const processed: ProcessedImage[] = [];

    for (let i = 0; i < images.length; i++) {
      setCurrentProgress(i + 1);
      setTotalProgress(images.length);

      const processedImage = await ImageService.processImage(images[i].uri);
      processed.push(processedImage);

      setImages((prev) =>
        prev.map((img) => (img.id === images[i].id ? { ...img, processed: processedImage } : img))
      );
    }

    return processed;
  }, [images]);

  const uploadImages = useCallback(async (processedImages: ProcessedImage[]): Promise<string[]> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    setUploadStage('uploading');
    const uploadedUrls: string[] = [];

    for (let i = 0; i < processedImages.length; i++) {
      setCurrentProgress(i + 1);
      setTotalProgress(processedImages.length);

      const uploaded = await ImageService.uploadImage(processedImages[i], {
        userId: user.id,
        contentType: 'post',
      });

      uploadedUrls.push(uploaded.url);
    }

    return uploadedUrls;
  }, []);

  const moderateContent = useCallback(
    async (imageUrls: string[]): Promise<ModerationResponse> => {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      setUploadStage('moderating');
      setCurrentProgress(0);
      setTotalProgress(0);

      const result = await ModerationService.moderatePost(
        caption.trim() || undefined,
        imageUrls,
        user.id
      );

      return result;
    },
    [caption]
  );

  const createPost = useCallback(
    async (imageUrls: string[]): Promise<string> => {
      const user = await getCurrentUser();
      if (!user || !selectedPlace) throw new Error('Missing required data');

      setUploadStage('processing');

      console.log('🏗️ Creating post with selected place:', {
        name: selectedPlace.name,
        place_id: selectedPlace.place_id,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        address: selectedPlace.formatted_address,
      });

      // Primero, crear o encontrar el lugar global
      const globalPlaceId = await GlobalPlacesService.findOrCreatePlace({
        name: selectedPlace.name,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        google_place_id: selectedPlace.place_id,
        address: selectedPlace.formatted_address,
      });

      console.log('✅ Global place ID:', globalPlaceId);

      // Mover imágenes a storage permanente
      const permanentUrls: string[] = [];
      for (const tempUrl of imageUrls) {
        const permanentUrl = await ImageService.moveToSocialMedia(tempUrl, user.id);
        permanentUrls.push(permanentUrl);
      }

      // Crear el post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          place_id: globalPlaceId, // Usar el ID de global_places
          caption: caption.trim() || null,
        })
        .select('id')
        .single();

      if (postError || !post) {
        throw new Error('Failed to create post');
      }

      // Insertar imágenes
      const imageInserts = permanentUrls.map((url, index) => ({
        post_id: post.id,
        thumbnail_url: url, // Por ahora usar la misma URL
        main_url: url,
        order_index: index,
      }));

      const { error: imagesError } = await supabase.from('post_images').insert(imageInserts);

      if (imagesError) {
        throw new Error('Failed to save images');
      }

      return post.id;
    },
    [selectedPlace, caption]
  );

  const handlePublish = useCallback(async () => {
    const validation = validatePost();
    if (!validation.valid) {
      Alert.alert(t('common.error'), validation.error);
      return;
    }

    try {
      setIsProcessing(true);

      const processedImages = await processImages();

      const uploadedUrls = await uploadImages(processedImages);

      const modResult = await moderateContent(uploadedUrls);

      if (!modResult.approved) {
        setModerationResult(modResult);
        if (modResult.text_result && !modResult.text_result.is_clean) {
          setShowModerationAlert(true);
        } else {
          setShowModerationModal(true);
        }

        for (const url of uploadedUrls) {
          try {
            await ImageService.deleteImage(url, 'post');
          } catch (err) {
            console.error('Error cleaning up temp images:', err);
          }
        }

        setIsProcessing(false);
        return;
      }

      await createPost(uploadedUrls);

      setIsProcessing(false);

      Alert.alert(t('common.ok'), t('social.create.success'), [
        {
          text: t('common.ok'),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      setIsProcessing(false);
      Alert.alert(t('common.error'), t('social.create.error'));
    }
  }, [validatePost, processImages, uploadImages, moderateContent, createPost, router, t]);

  const handleEditAfterModeration = useCallback(() => {
    setShowModerationModal(false);
    setShowModerationAlert(false);
    setModerationResult(null);
  }, []);

  const handleCancelAfterModeration = useCallback(() => {
    setShowModerationModal(false);
    setShowModerationAlert(false);
    setModerationResult(null);
    setImages([]);
    setCaption('');
  }, []);

  const handleViewGuidelines = useCallback(() => {
    setShowModerationModal(false);
    Alert.alert(t('moderation.guidelines.title'), t('moderation.guidelines.subtitle'));
  }, [t]);

  const canPublish = images.length > 0 && selectedPlace !== null;
  const characterCount = caption.length;
  const maxCharacters = 2000;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('social.create.title')}
          </Text>
          <TouchableOpacity
            onPress={handlePublish}
            disabled={!canPublish || isProcessing}
            style={[
              styles.publishButton,
              { backgroundColor: canPublish && !isProcessing ? colors.primary : colors.border },
            ]}
          >
            <Text
              style={[
                styles.publishButtonText,
                { color: canPublish && !isProcessing ? colors.primaryText : colors.textMuted },
              ]}
            >
              {t('social.create.publish')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('social.create.select_photos')}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScroll}
            >
              <TouchableOpacity
                style={[
                  styles.addImageButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={handlePickImages}
              >
                <Ionicons name="images-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.addImageText, { color: colors.textMuted }]}>
                  {t('social.create.add_photos')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addImageButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.addImageText, { color: colors.textMuted }]}>
                  {t('social.create.take_photo')}
                </Text>
              </TouchableOpacity>

              {images.map((image) => (
                <View key={image.id} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(image.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {images.length > 0 && (
              <Text style={[styles.imageCount, { color: colors.textMuted }]}>
                {images.length}/10 {t('social.create.select_photos').toLowerCase()}
              </Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('social.create.place_required')}
            </Text>
            <TouchableOpacity
              style={[
                styles.placeButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={handleSelectPlace}
            >
              {selectedPlace ? (
                <View style={styles.placeSelectedContainer}>
                  <View style={styles.placeMainInfo}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                    <View style={styles.placeTextContainer}>
                      <Text style={[styles.placeText, { color: colors.text }]}>
                        {selectedPlace.name}
                      </Text>
                      {/* Rating y reseñas */}
                      {selectedPlace.rating && (
                        <View style={styles.placeMetaContainer}>
                          <Ionicons name="star" size={12} color="#FFB800" />
                          <Text style={[styles.placeMetaText, { color: colors.textMuted }]}>
                            {selectedPlace.rating.toFixed(1)}
                          </Text>
                          {selectedPlace.user_ratings_total && (
                            <Text style={[styles.placeMetaText, { color: colors.textMuted }]}>
                              ({selectedPlace.user_ratings_total.toLocaleString()})
                            </Text>
                          )}
                        </View>
                      )}
                      {/* Dirección */}
                      {selectedPlace.formatted_address && (
                        <Text
                          style={[styles.placeAddress, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {selectedPlace.formatted_address}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
                  {/* Badges de tipo de lugar */}
                  {selectedPlace.types && selectedPlace.types.length > 0 && (
                    <View style={styles.placeTypesContainer}>
                      {selectedPlace.types.slice(0, 3).map((type, index) => (
                        <View
                          key={index}
                          style={[styles.placeTypeBadge, { backgroundColor: colors.background }]}
                        >
                          <Text style={[styles.placeTypeText, { color: colors.textMuted }]}>
                            {type.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.placeEmpty}>
                  <Ionicons name="location-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.placePlaceholder, { color: colors.textMuted }]}>
                    {t('social.create.search_place')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('social.create.write_caption')}
            </Text>
            <TextInput
              style={[styles.captionInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t('social.create.caption_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={maxCharacters}
              textAlignVertical="top"
            />
            <Text
              style={[
                styles.characterCount,
                {
                  color:
                    characterCount > maxCharacters * 0.9 ? colors.social.error : colors.textMuted,
                },
              ]}
            >
              {t('social.create.character_limit', { count: characterCount, max: maxCharacters })}
            </Text>
          </View>
        </ScrollView>

        <UploadProgress
          visible={isProcessing}
          current={currentProgress}
          total={totalProgress}
          stage={uploadStage}
        />

        <ModerationAlert
          visible={showModerationAlert}
          type="text"
          detectedWords={moderationResult?.text_result?.detected_words}
          onEdit={handleEditAfterModeration}
          onCancel={handleCancelAfterModeration}
        />

        <ContentRejectedModal
          visible={showModerationModal}
          result={moderationResult}
          onEdit={handleEditAfterModeration}
          onCancel={handleCancelAfterModeration}
          onViewGuidelines={handleViewGuidelines}
        />

        <PlacePicker
          visible={showPlacePicker}
          onClose={() => setShowPlacePicker(false)}
          onSelectPlace={handlePlaceSelected}
          photoLocation={photoLocation}
          currentLocation={currentDeviceLocation}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  publishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagesScroll: {
    marginTop: 8,
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addImageText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#00000080', // 50% opacity black
    borderRadius: 12,
  },
  imageCount: {
    fontSize: 12,
    marginTop: 8,
  },
  divider: {
    height: 1,
  },
  placeButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  placeSelectedContainer: {
    gap: 12,
  },
  placeMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeTextContainer: {
    flex: 1,
    gap: 4,
  },
  placeMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeMetaText: {
    fontSize: 12,
  },
  placeAddress: {
    fontSize: 12,
  },
  placeTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  placeTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  placeTypeText: {
    fontSize: 10,
    textTransform: 'capitalize',
  },
  placeEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeText: {
    flex: 1,
    fontSize: 16,
  },
  placePlaceholder: {
    flex: 1,
    fontSize: 16,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
});
