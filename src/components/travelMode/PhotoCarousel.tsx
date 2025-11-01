/**
 * PhotoCarousel - Carrusel interactivo de fotos con zoom
 * - Muestra hasta 5 fotos en carrusel horizontal
 * - Tap para ver en fullscreen con zoom
 * - Gestos de pinch-to-zoom y pan
 */

import React, { useState } from 'react';

import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhotoCarouselProps {
  photos: string[];
  placeName: string;
}

export function PhotoCarousel({ photos, placeName }: PhotoCarouselProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return null;
  }

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (SCREEN_WIDTH * 0.7));
    setActiveIndex(index);
  };

  return (
    <>
      {/* Carousel Container */}
      <View style={styles.carouselContainer}>
        <Text style={styles.carouselTitle}>Fotos de {placeName}</Text>

        <ScrollView
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH * 0.7 + 12}
          snapToAlignment="start"
          contentContainerStyle={styles.carouselContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedPhoto(photo)}
              activeOpacity={0.9}
            >
              <View style={styles.photoCard}>
                <Image source={{ uri: photo }} style={styles.photoImage} resizeMode="cover" />
                <View style={styles.photoOverlay}>
                  <Ionicons name="expand" size={24} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Photo Indicators */}
        {photos.length > 1 && (
          <View style={styles.indicators}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[styles.indicator, index === activeIndex && styles.indicatorActive]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Fullscreen Photo Modal */}
      {selectedPhoto && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalBackground}
              onPress={() => setSelectedPhoto(null)}
              activeOpacity={1}
            />

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedPhoto(null)}>
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Fullscreen Image */}
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.zoomContainer}
            >
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            </ScrollView>

            {/* Attribution */}
            <View style={styles.attribution}>
              <Ionicons name="information-circle" size={16} color="#fff" />
              <Text style={styles.attributionText}>Imagen de Wikipedia</Text>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginBottom: 20,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  carouselContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  photoCard: {
    width: SCREEN_WIDTH * 0.7,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ddd',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#007AFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  attribution: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  attributionText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
});
