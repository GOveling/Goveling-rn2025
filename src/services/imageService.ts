import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../lib/supabase';

export interface ImageUploadOptions {
  userId: string;
  contentType: 'post' | 'avatar' | 'story';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
  type: string;
}

export interface UploadedImage {
  url: string;
  thumbnailUrl?: string;
  blurhash?: string;
  width: number;
  height: number;
  size: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1080;
const QUALITY = 0.8;

export class ImageService {
  /**
   * Request camera roll permissions
   */
  static async requestPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request camera permissions
   */
  static async requestCameraPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Pick image from library
   */
  static async pickImage(allowsMultiple: boolean = false): Promise<ImagePicker.ImagePickerAsset[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Permission to access camera roll is required');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: !allowsMultiple,
      allowsMultipleSelection: allowsMultiple,
      quality: 1,
      aspect: allowsMultiple ? undefined : [1, 1],
      exif: true, // ← IMPORTANTE: Extraer metadata EXIF con GPS
    });

    if (result.canceled) {
      return [];
    }

    return result.assets;
  }

  /**
   * Take photo with camera
   */
  static async takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
    const hasPermission = await this.requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Permission to access camera is required');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      exif: true, // ← IMPORTANTE: Extraer metadata EXIF con GPS
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  }

  /**
   * Compress and resize image
   */
  static async processImage(
    uri: string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    } = {}
  ): Promise<ProcessedImage> {
    const maxWidth = options.maxWidth || MAX_WIDTH;
    const maxHeight = options.maxHeight || MAX_HEIGHT;
    const quality = options.quality || QUALITY;

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Get file size
    const response = await fetch(result.uri);
    const blob = await response.blob();
    const size = blob.size;

    if (size > MAX_FILE_SIZE) {
      throw new Error('Image size exceeds maximum allowed (5MB)');
    }

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      size,
      type: 'image/jpeg',
    };
  }

  /**
   * Upload image to Supabase Storage
   */
  static async uploadImage(
    image: ProcessedImage,
    options: ImageUploadOptions
  ): Promise<UploadedImage> {
    const { userId, contentType, maxWidth, maxHeight, quality } = options;

    // Determine bucket
    const bucket = contentType === 'avatar' ? 'avatars' : 'social-temp';

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const filename = `${userId}/${timestamp}-${random}.jpg`;

    // Convert URI to blob
    const response = await fetch(image.uri);
    const blob = await response.blob();

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError || !uploadData) {
      throw new Error(`Upload failed: ${uploadError?.message || 'Unknown error'}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);

    // Process image with Edge Function
    try {
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'process-image',
        {
          body: {
            image_url: urlData.publicUrl,
            user_id: userId,
            content_type: contentType,
            max_width: maxWidth || MAX_WIDTH,
            max_height: maxHeight || MAX_HEIGHT,
            quality: quality || QUALITY,
          },
        }
      );

      if (processError) {
        console.warn('Image processing failed:', processError);
      }

      return {
        url: urlData.publicUrl,
        thumbnailUrl: processData?.thumbnail_url,
        blurhash: processData?.blurhash,
        width: image.width,
        height: image.height,
        size: image.size,
      };
    } catch (error) {
      console.warn('Image processing failed:', error);
      // Return basic info even if processing fails
      return {
        url: urlData.publicUrl,
        width: image.width,
        height: image.height,
        size: image.size,
      };
    }
  }

  /**
   * Delete image from storage
   */
  static async deleteImage(
    imageUrl: string,
    contentType: 'post' | 'avatar' | 'story'
  ): Promise<void> {
    const bucket = contentType === 'avatar' ? 'avatars' : 'social-temp';
    const path = imageUrl.split(`${bucket}/`)[1];

    if (!path) {
      throw new Error('Invalid image URL');
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Move image from temp to permanent storage
   */
  static async moveToSocialMedia(tempUrl: string, userId: string): Promise<string> {
    const tempPath = tempUrl.split('social-temp/')[1];
    if (!tempPath) {
      throw new Error('Invalid temp URL');
    }

    // Download from temp
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('social-temp')
      .download(tempPath);

    if (downloadError || !fileData) {
      throw new Error(`Download failed: ${downloadError?.message}`);
    }

    // Generate new filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const newPath = `${userId}/${timestamp}-${random}.jpg`;

    // Upload to social-media
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('social-media')
      .upload(newPath, fileData, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError || !uploadData) {
      throw new Error(`Upload failed: ${uploadError?.message}`);
    }

    // Delete from temp
    await supabase.storage.from('social-temp').remove([tempPath]);

    // Get public URL
    const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(uploadData.path);

    return urlData.publicUrl;
  }

  /**
   * Validate image
   */
  static validateImage(asset: ImagePicker.ImagePickerAsset): { valid: boolean; error?: string } {
    if (!asset.uri) {
      return { valid: false, error: 'Invalid image' };
    }

    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      return { valid: false, error: 'Image size exceeds 5MB' };
    }

    return { valid: true };
  }

  /**
   * Batch upload images for posts
   */
  static async uploadMultipleImages(
    images: ProcessedImage[],
    options: ImageUploadOptions
  ): Promise<UploadedImage[]> {
    const uploadPromises = images.map((image) => this.uploadImage(image, options));
    return Promise.all(uploadPromises);
  }
}
