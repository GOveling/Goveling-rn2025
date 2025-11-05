import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';

import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface ProfileData {
  full_name: string;
  description: string;
  avatar_url: string;
  email: string;
}

export const ProfileEditModal: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    description: '',
    avatar_url: '',
    email: user?.email || '',
  });

  useEffect(() => {
    console.log('🎭 ProfileEditModal: visible prop changed to:', visible);
    if (visible && user) {
      console.log('📋 Loading profile for user:', user.id);
      loadProfile();
    }
  }, [visible, user]);

  const loadProfile = async () => {
    if (!user) {
      console.log('❌ loadProfile: No user found');
      return;
    }

    console.log('📋 loadProfile: Loading profile for user ID:', user.id);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, description, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          description: data.description || '',
          avatar_url: data.avatar_url || '',
          email: user.email || '',
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const selectImage = () => {
    Alert.alert(t('profile.edit_modal.avatar_section.select_image'), '', [
      {
        text: t('profile.edit_modal.avatar_section.camera'),
        onPress: () => openCamera(),
      },
      {
        text: t('profile.edit_modal.avatar_section.gallery'),
        onPress: () => openGallery(),
      },
      {
        text: t('profile.edit_modal.cancel'),
        style: 'cancel',
      },
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('profile.edit_modal.permissions.camera_needed'),
        t('profile.edit_modal.permissions.camera_message')
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await compressAndUploadImage(asset.uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('profile.edit_modal.permissions.gallery_needed'),
        t('profile.edit_modal.permissions.gallery_message')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await compressAndUploadImage(asset.uri);
    }
  };

  const compressAndUploadImage = async (uri: string) => {
    try {
      setUploading(true);
      console.log('🖼️ Iniciando compresión de imagen:', uri);

      // Verificar que el archivo existe y obtener información
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('El archivo no existe');
      }

      console.log('📊 Archivo original:', {
        size: 'size' in fileInfo ? `${(fileInfo.size / 1024).toFixed(2)}KB` : 'unknown',
        uri: fileInfo.uri,
      });

      // Función recursiva para comprimir hasta llegar al tamaño deseado
      const compressImageToTarget = async (imageUri: string, quality = 0.8): Promise<string> => {
        try {
          console.log(`🔄 Comprimiendo con calidad: ${quality}`);

          // Comprimir la imagen
          const compressedImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [
              { resize: { width: 800, height: 800 } }, // Redimensionar a máximo 800x800
            ],
            {
              compress: quality,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

          console.log('✅ Imagen comprimida exitosamente:', compressedImage.uri);

          // Verificar el tamaño del archivo
          const compressedFileInfo = await FileSystem.getInfoAsync(compressedImage.uri);
          const fileSizeKB =
            compressedFileInfo.exists && 'size' in compressedFileInfo
              ? compressedFileInfo.size / 1024
              : 0;

          console.log(
            `� Imagen comprimida - Calidad: ${quality}, Tamaño: ${fileSizeKB.toFixed(2)}KB`
          );

          // Si es menor a 500KB o la calidad ya es muy baja, devolvemos esta versión
          if (fileSizeKB <= 500 || quality <= 0.1) {
            return compressedImage.uri;
          }

          // Si aún es muy grande, reducir más la calidad
          return compressImageToTarget(compressedImage.uri, quality - 0.1);
        } catch (error) {
          console.error('❌ Error en compresión recursiva:', error);
          throw error;
        }
      };

      // Comprimir la imagen hasta el tamaño objetivo
      const finalUri = await compressImageToTarget(uri);

      // Verificar tamaño final
      const finalInfo = await FileSystem.getInfoAsync(finalUri);
      const finalSizeKB = finalInfo.exists && 'size' in finalInfo ? finalInfo.size / 1024 : 0;

      console.log(`✅ Imagen final - Tamaño: ${finalSizeKB.toFixed(2)}KB, URI: ${finalUri}`);

      // Subir la imagen comprimida
      await uploadImage(finalUri);
    } catch (error) {
      console.error('❌ Error completo en compresión:', error);
      Alert.alert(
        'Error',
        `No se pudo procesar la imagen: ${error.message || 'Error desconocido'}`
      );
      setUploading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) {
      console.error('❌ No user found for upload');
      return;
    }

    try {
      console.log('📤 Iniciando upload de imagen:', uri);
      setUploading(true);

      // Verificar que el archivo existe antes de leerlo
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('El archivo comprimido no existe');
      }

      console.log('📂 Leyendo archivo como base64...');
      // Leer el archivo como base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      if (!base64) {
        throw new Error('No se pudo leer el archivo como base64');
      }

      console.log('📊 Base64 length:', base64.length);

      // Crear un nombre único para el archivo
      const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`; // Agregar carpeta de usuario

      console.log('📝 Archivo a subir:', filePath);

      // Convertir base64 a Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('🔄 Subiendo a Supabase Storage...');

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage.from('avatars').upload(filePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

      if (error) {
        console.error('❌ Error en Supabase upload:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        console.error('❌ File path used:', filePath);
        console.error('❌ User ID:', user.id);
        throw new Error(`Error de Supabase: ${error.message || 'Error desconocido'}`);
      }

      console.log('✅ Upload exitoso:', data);

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      console.log('🔗 URL pública generada:', publicUrl);

      setProfileData((prev) => ({ ...prev, avatar_url: publicUrl }));

      console.log('✅ Avatar actualizado en el estado');
    } catch (error) {
      console.error('❌ Error completo en upload:', error);
      Alert.alert('Error', `No se pudo subir la imagen: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    if (!profileData.full_name.trim()) {
      Alert.alert(
        t('profile.edit_modal.errors.title'),
        t('profile.edit_modal.errors.full_name_required')
      );
      return;
    }

    if (profileData.description.length > 70) {
      Alert.alert(
        t('profile.edit_modal.errors.title'),
        t('profile.edit_modal.errors.description_too_long')
      );
      return;
    }

    try {
      setLoading(true);

      const updateData: any = {
        full_name: profileData.full_name.trim(),
        description: profileData.description.trim(),
        updated_at: new Date().toISOString(),
      };

      if (profileData.avatar_url) {
        updateData.avatar_url = profileData.avatar_url;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        ...updateData,
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        t('profile.edit_modal.success.title'),
        t('profile.edit_modal.success.profile_updated'),
        [
          {
            text: 'OK',
            onPress: () => {
              onSaved?.();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(t('profile.edit_modal.errors.title'), t('profile.edit_modal.errors.save_failed'));
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (!visible) {
    console.log('🚫 ProfileEditModal: not visible, returning null');
    return null;
  }

  console.log('✅ ProfileEditModal: rendering modal with visible =', visible);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{t('profile.edit_modal.title')}</Text>

            <TouchableOpacity onPress={saveProfile} disabled={loading} style={styles.saveButton}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{t('profile.edit_modal.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView}>
          <View style={styles.contentContainer}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={selectImage}
                disabled={uploading}
                style={styles.avatarTouchable}
              >
                {profileData.avatar_url ? (
                  <Image source={{ uri: profileData.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient
                    colors={['#4F8EF7', '#FF8C42']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.avatarInitials}>
                      {getInitials(profileData.full_name || 'GO')}
                    </Text>
                  </LinearGradient>
                )}

                {/* Edit Icon */}
                <View style={styles.editIconContainer}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={20} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>

              <Text style={styles.changePhotoText}>
                {uploading
                  ? t('profile.edit_modal.avatar_section.uploading')
                  : t('profile.edit_modal.avatar_section.change_photo')}
              </Text>
            </View>

            {/* Nombre Completo */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('profile.edit_modal.fields.full_name')}</Text>
              <TextInput
                value={profileData.full_name}
                onChangeText={(text) => setProfileData((prev) => ({ ...prev, full_name: text }))}
                placeholder={t('profile.edit_modal.fields.full_name_placeholder')}
                style={styles.textInput}
                placeholderTextColor="#666"
              />
            </View>

            {/* Descripción */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('profile.edit_modal.fields.description')}</Text>
              <TextInput
                value={profileData.description}
                onChangeText={(text) => {
                  if (text.length <= 70) {
                    setProfileData((prev) => ({ ...prev, description: text }));
                  }
                }}
                placeholder={t('profile.edit_modal.fields.description_placeholder')}
                multiline
                maxLength={70}
                style={[styles.textInput, styles.textInputMultiline]}
                placeholderTextColor="#666"
              />
              <Text style={styles.characterCount}>
                {t('profile.edit_modal.fields.character_count', {
                  count: profileData.description.length,
                })}
              </Text>
            </View>

            {/* Email (solo lectura) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('profile.edit_modal.fields.email')}</Text>
              <View style={styles.emailContainer}>
                <Text style={styles.emailText}>{profileData.email}</Text>
              </View>
              <Text style={styles.emailHelperText}>
                {t('profile.edit_modal.fields.email_readonly')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ProfileEditModal;

const styles = StyleSheet.create({
  // Modal & Container
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.9)',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 20,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 8,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 8,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4F8EF7',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },

  // Form Fields
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  textInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    marginTop: 6,
    fontSize: 12,
    color: '#6366F1',
    textAlign: 'right',
  },

  // Email Field
  emailContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emailText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emailHelperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
});
