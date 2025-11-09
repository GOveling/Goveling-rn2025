/**
 * ImageViewer Compatibility Layer
 * Provides a wrapper around react-native-image-viewing that works on all platforms
 */
import React from 'react';

import { Platform, Modal, View, Image, TouchableOpacity, StyleSheet } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import NativeImageViewing from 'react-native-image-viewing';

interface ImageViewerProps {
  images: Array<{ uri: string }>;
  imageIndex: number;
  visible: boolean;
  onRequestClose: () => void;
}

/**
 * Web fallback image viewer
 */
function WebImageViewer({ images, visible, onRequestClose }: ImageViewerProps) {
  if (!visible || images.length === 0) return null;

  return (
    <Modal visible={visible} transparent onRequestClose={onRequestClose}>
      <View style={styles.webContainer}>
        <TouchableOpacity style={styles.webOverlay} activeOpacity={1} onPress={onRequestClose}>
          <View style={styles.webContent}>
            <TouchableOpacity style={styles.webCloseButton} onPress={onRequestClose}>
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: images[0].uri }} style={styles.webImage} resizeMode="contain" />
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/**
 * Cross-platform ImageViewer component
 */
export default function ImageViewerCompat(props: ImageViewerProps) {
  // Use native viewer on iOS/Android
  if (Platform.OS !== 'web') {
    return <NativeImageViewing {...props} />;
  }

  // Fallback to web viewer
  return <WebImageViewer {...props} />;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  webOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webContent: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  webImage: {
    width: '100%',
    height: '100%',
  },
});
