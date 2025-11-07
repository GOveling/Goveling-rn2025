// src/components/RouteMapModal.tsx
import React, { useState, useEffect, useRef } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  Linking,
  Alert,
} from 'react-native';

import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';

import { useTheme } from '../lib/theme';
import { useDistanceUnit } from '../utils/units';

const { height } = Dimensions.get('window');

interface RouteMapModalProps {
  visible: boolean;
  onClose: () => void;
  polyline: string; // Encoded polyline
  coordinates: [number, number][]; // Decoded coordinates [lng, lat]
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  distance_m: number;
  duration_s: number;
  mode: 'walking' | 'cycling' | 'driving';
  steps: Array<{
    instruction: string;
    distance_m: number;
    duration_s: number;
    type?: string;
    name?: string;
  }>;
  destinationName: string;
}

export default function RouteMapModal({
  visible,
  onClose,
  coordinates,
  bbox,
  distance_m,
  duration_s,
  mode,
  steps,
  destinationName,
}: RouteMapModalProps) {
  console.log(
    '🗺️🗺️🗺️ [RouteMapModal] RENDER - visible:',
    visible,
    'coordinates:',
    coordinates?.length
  );

  const { t } = useTranslation();
  const theme = useTheme();
  const distance = useDistanceUnit();

  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number;
  } | null>(null);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null);

  const bottomSheetHeight = useRef(new Animated.Value(120)).current;
  const mapOpacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(mapOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(bottomSheetHeight, {
          toValue: 120,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      mapOpacity.setValue(0);
      bottomSheetHeight.setValue(120);
      setShowSteps(false);
      setSelectedStep(null);
    }
  }, [visible]);

  const toggleSteps = () => {
    const newShowSteps = !showSteps;
    setShowSteps(newShowSteps);

    Animated.spring(bottomSheetHeight, {
      toValue: newShowSteps ? height * 0.6 : 120,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'walking':
        return 'walk';
      case 'cycling':
        return 'bicycle';
      case 'driving':
        return 'car';
      default:
        return 'navigate';
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'walking':
        return '#10B981';
      case 'cycling':
        return '#F59E0B';
      case 'driving':
        return '#3B82F6';
      default:
        return '#6366F1';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const handleOpenInMaps = () => {
    const destination = coordinates[coordinates.length - 1];
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${destination[1]},${destination[0]}`
        : `https://www.google.com/maps/dir/?api=1&destination=${destination[1]},${destination[0]}`;

    Linking.openURL(url);
  };

  // Función para calcular distancia entre dos puntos (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  };

  // Función para encontrar el punto más cercano en la ruta
  const findClosestPointOnRoute = (
    userLat: number,
    userLon: number
  ): { index: number; distance: number } => {
    let closestIndex = 0;
    let minDistance = Infinity;

    coordinates.forEach((coord, index) => {
      const dist = calculateDistance(userLat, userLon, coord[1], coord[0]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    return { index: closestIndex, distance: minDistance };
  };

  // Iniciar navegación turn-by-turn
  const startNavigation = async () => {
    try {
      // Solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('route.navigation_permission_title'),
          t('route.navigation_permission_message')
        );
        return;
      }

      setIsNavigating(true);
      setCurrentStepIndex(0);
      setShowSteps(false);

      // Contraer bottom sheet para modo navegación
      Animated.spring(bottomSheetHeight, {
        toValue: 180,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();

      // Obtener ubicación actual y hacer zoom inmediato
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const { latitude, longitude, heading } = currentLocation.coords;

      // Zoom inmediato a la ubicación actual con vista de navegación
      if (mapRef.current) {
        mapRef.current.animateCamera(
          {
            center: { latitude, longitude },
            heading: heading || 0,
            pitch: 60,
            zoom: 19, // Zoom muy cercano para navegación
          },
          { duration: 1000 }
        );
      }

      // Iniciar tracking de ubicación en tiempo real
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Actualizar cada segundo
          distanceInterval: 5, // O cada 5 metros
        },
        (location) => {
          const { latitude, longitude, heading } = location.coords;

          setUserLocation({
            latitude,
            longitude,
            heading: heading || 0,
          });

          // Encontrar posición en la ruta
          const closest = findClosestPointOnRoute(latitude, longitude);

          // Determinar el paso actual basado en la posición
          let accumulatedDistance = 0;
          let stepIndex = 0;

          for (let i = 0; i < steps.length; i++) {
            accumulatedDistance += steps[i].distance_m;
            // Si estamos cerca de esta parte de la ruta, es nuestro paso actual
            if (closest.index * 10 < accumulatedDistance) {
              stepIndex = i;
              break;
            }
          }

          setCurrentStepIndex(stepIndex);

          // Calcular distancia al próximo paso
          if (stepIndex < steps.length) {
            let distToStep = 0;
            for (let i = stepIndex; i < steps.length; i++) {
              distToStep += steps[i].distance_m;
            }
            setDistanceToNextStep(distToStep - closest.distance);
          }

          // Animar la cámara para seguir al usuario con heading
          if (mapRef.current) {
            mapRef.current.animateCamera(
              {
                center: { latitude, longitude },
                heading: heading || 0,
                pitch: 60, // Vista 3D inclinada
                zoom: 19, // Zoom muy cercano para navegación
              },
              { duration: 500 }
            );
          }
        }
      );
    } catch (error) {
      console.error('Error starting navigation:', error);
      Alert.alert(t('route.navigation_error'), t('route.navigation_error_message'));
    }
  };

  // Detener navegación
  const stopNavigation = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsNavigating(false);
    setUserLocation(null);
    setCurrentStepIndex(0);
    setDistanceToNextStep(null);

    // Restaurar vista del mapa
    if (mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: { latitude: center[1], longitude: center[0] },
          heading: 0,
          pitch: 0,
          zoom: 12,
        },
        { duration: 800 }
      );
    }

    // Restaurar bottom sheet
    Animated.spring(bottomSheetHeight, {
      toValue: 120,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  // Limpiar al cerrar el modal
  useEffect(() => {
    if (!visible && locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
      setIsNavigating(false);
      setUserLocation(null);
    }
  }, [visible]);

  const getStepIcon = (type?: string) => {
    if (!type) return 'arrow-forward';

    const typeNum = parseInt(type, 10);
    if (isNaN(typeNum)) return 'arrow-forward';

    // ORS step types
    switch (typeNum) {
      case 0:
        return 'arrow-up'; // straight
      case 1:
        return 'arrow-forward'; // right
      case 2:
        return 'arrow-back'; // left
      case 3:
        return 'chevron-forward'; // sharp right
      case 4:
        return 'chevron-back'; // sharp left
      case 5:
        return 'arrow-forward'; // slight right
      case 6:
        return 'arrow-back'; // slight left
      case 7:
        return 'arrow-up'; // continue
      case 8:
        return 'enter'; // enter roundabout
      case 9:
        return 'exit'; // exit roundabout
      case 10:
        return 'flag'; // destination
      case 11:
        return 'compass'; // start
      case 12:
        return 'arrow-forward'; // keep left
      case 13:
        return 'arrow-forward'; // keep right
      default:
        return 'arrow-forward';
    }
  };

  // Calcular el centro basado en bbox
  const center: [number, number] = [
    (bbox[0] + bbox[2]) / 2, // lng
    (bbox[1] + bbox[3]) / 2, // lat
  ];

  const startPoint = coordinates[0];
  const endPoint = coordinates[coordinates.length - 1];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={false}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Mapa */}
        <Animated.View style={[styles.mapContainer, { opacity: mapOpacity }]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: center[1],
              longitude: center[0],
              latitudeDelta: Math.abs(bbox[3] - bbox[1]) * 1.5,
              longitudeDelta: Math.abs(bbox[2] - bbox[0]) * 1.5,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={!isNavigating}
            pitchEnabled={true}
            rotateEnabled={true}
            followsUserLocation={isNavigating}
          >
            {/* Línea de ruta */}
            <Polyline
              coordinates={coordinates.map((coord) => ({
                latitude: coord[1],
                longitude: coord[0],
              }))}
              strokeColor={getModeColor()}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />

            {/* Marcador de inicio */}
            <Marker
              coordinate={{
                latitude: startPoint[1],
                longitude: startPoint[0],
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: getModeColor(),
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 5,
                }}
              >
                <Ionicons name="location" size={20} color="#FFFFFF" />
              </View>
            </Marker>

            {/* Marcador de destino */}
            <Marker
              coordinate={{
                latitude: endPoint[1],
                longitude: endPoint[0],
              }}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#EF4444',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 5,
                }}
              >
                <Ionicons name="flag" size={20} color="#FFFFFF" />
              </View>
            </Marker>
          </MapView>

          {/* Botón de cerrar flotante con blur */}
          <View style={styles.closeButtonContainer}>
            <BlurView intensity={80} tint={theme.mode} style={styles.blurView}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Info del destino flotante */}
          <View style={styles.destinationInfoContainer}>
            <BlurView intensity={90} tint={theme.mode} style={styles.blurView}>
              <View style={styles.destinationInfo}>
                <View style={styles.destinationIconContainer}>
                  <Ionicons name="flag" size={20} color="#EF4444" />
                </View>
                <Text
                  style={[styles.destinationName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {destinationName}
                </Text>
              </View>
            </BlurView>
          </View>
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: bottomSheetHeight,
              backgroundColor: theme.colors.card,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          {/* Handle */}
          <TouchableOpacity onPress={toggleSteps} style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </TouchableOpacity>

          {/* Resumen de ruta */}
          <View style={styles.summaryContainer}>
            {!isNavigating ? (
              <View style={styles.summaryLeft}>
                <View
                  style={[styles.modeIconContainer, { backgroundColor: getModeColor() + '20' }]}
                >
                  <Ionicons name={getModeIcon()} size={24} color={getModeColor()} />
                </View>
                <View style={styles.summaryText}>
                  <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                    {distance.format(distance_m / 1000, 2)}
                  </Text>
                  <Text style={[styles.summarySubtitle, { color: theme.colors.textMuted }]}>
                    {formatDuration(duration_s)} • {steps.length}{' '}
                    {steps.length === 1 ? t('route.step') : t('route.steps')}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.navigationLeft}>
                <View style={[styles.navigationIconContainer, { backgroundColor: getModeColor() }]}>
                  <Ionicons
                    name={getStepIcon(steps[currentStepIndex]?.type)}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.navigationText}>
                  <Text
                    style={[styles.navigationInstruction, { color: theme.colors.text }]}
                    numberOfLines={2}
                  >
                    {steps[currentStepIndex]?.instruction || t('route.continue')}
                  </Text>
                  {distanceToNextStep !== null && distanceToNextStep > 0 && (
                    <Text style={[styles.navigationDistance, { color: theme.colors.textMuted }]}>
                      {t('route.in')} {distance.format(distanceToNextStep / 1000, 1)}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.summaryActions}>
              {!isNavigating ? (
                <>
                  <TouchableOpacity
                    onPress={startNavigation}
                    style={[styles.actionButtonSmall, { backgroundColor: getModeColor() }]}
                  >
                    <Ionicons name="navigate" size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={toggleSteps}
                    style={[
                      styles.actionButtonSmall,
                      {
                        backgroundColor:
                          theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                      },
                    ]}
                  >
                    <Ionicons
                      name={showSteps ? 'chevron-down' : 'list'}
                      size={20}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={stopNavigation}
                  style={[styles.actionButtonSmall, { backgroundColor: '#EF4444' }]}
                >
                  <Ionicons name="stop" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Lista de pasos */}
          {showSteps && (
            <ScrollView
              style={styles.stepsContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepsContent}
            >
              {steps.map((step, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.stepItem,
                    {
                      backgroundColor:
                        selectedStep === index
                          ? getModeColor() + '15'
                          : theme.mode === 'dark'
                            ? 'rgba(255,255,255,0.05)'
                            : '#F9FAFB',
                      borderLeftColor: getModeColor(),
                      borderLeftWidth: selectedStep === index ? 4 : 0,
                    },
                  ]}
                  onPress={() => setSelectedStep(selectedStep === index ? null : index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.stepLeft}>
                    <View
                      style={[
                        styles.stepNumber,
                        {
                          backgroundColor:
                            theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                        },
                      ]}
                    >
                      <Text style={[styles.stepNumberText, { color: theme.colors.text }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.stepIconContainer,
                        {
                          backgroundColor:
                            theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                        },
                      ]}
                    >
                      <Ionicons name={getStepIcon(step.type)} size={20} color={getModeColor()} />
                    </View>
                  </View>

                  <View style={styles.stepContent}>
                    <Text style={[styles.stepInstruction, { color: theme.colors.text }]}>
                      {step.instruction}
                    </Text>
                    {step.name && step.name !== '-' && (
                      <Text style={[styles.stepName, { color: getModeColor() }]} numberOfLines={1}>
                        {step.name}
                      </Text>
                    )}
                    <View style={styles.stepMeta}>
                      <Text style={[styles.stepMetaText, { color: theme.colors.textMuted }]}>
                        {distance.format(step.distance_m / 1000, 2)} •{' '}
                        {formatDuration(step.duration_s)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Paso final - Llegada */}
              <View
                style={[
                  styles.stepItem,
                  styles.finalStep,
                  {
                    backgroundColor: '#EF444420',
                    borderLeftColor: '#EF4444',
                  },
                ]}
              >
                <View style={styles.stepLeft}>
                  <View style={[styles.stepIconContainer, { backgroundColor: '#EF4444' }]}>
                    <Ionicons name="flag" size={20} color="#FFFFFF" />
                  </View>
                </View>

                <View style={styles.stepContent}>
                  <Text
                    style={[styles.stepInstruction, styles.finalStepText, { color: '#EF4444' }]}
                  >
                    {t('route.arrive_at')}
                  </Text>
                  <Text style={[styles.stepName, { color: theme.colors.text }]} numberOfLines={1}>
                    {destinationName}
                  </Text>
                </View>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurView: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationInfoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 16,
    left: 72,
    borderRadius: 16,
    overflow: 'hidden',
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  destinationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF444420',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  destinationName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  actionButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsContainer: {
    flex: 1,
  },
  stepsContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  finalStep: {
    borderLeftWidth: 4,
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  finalStepText: {
    fontWeight: '700',
  },
  stepName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  navigationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  navigationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  navigationText: {
    flex: 1,
  },
  navigationInstruction: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  navigationDistance: {
    fontSize: 14,
    fontWeight: '600',
  },
});
