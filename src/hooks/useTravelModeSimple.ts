/**
 * useTravelModeSimple - Main hook for Travel Mode functionality
 * Integrates all travel mode services and provides unified business logic
 * Optimized for native hardware (iOS/Android)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import {
  arrivalDetectionService,
  PlaceArrival,
} from '~/services/travelMode/ArrivalDetectionService';
import {
  backgroundTravelManager,
  LocationUpdate,
} from '~/services/travelMode/BackgroundTravelManager';
import {
  deviationDetectionService,
  DeviationAnalysis,
} from '~/services/travelMode/DeviationDetectionService';
import { calculateHaversineDistance } from '~/services/travelMode/geoUtils';
import {
  navigationService,
  NavigationRoute,
  WaypointPlace,
  TravelMode,
} from '~/services/travelMode/NavigationService';
import { TrackingOptimizer } from '~/services/travelMode/trackingOptimizer';
import { TransportMode } from '~/services/travelMode/transportDetector';
import { travelNotificationService } from '~/services/travelMode/TravelNotificationService';
import { unifiedSpeedTracker, EnergyMode } from '~/services/travelMode/UnifiedSpeedTracker';
import { getAdaptiveRadius } from '~/services/travelMode/VenueSizeHeuristics';

// ✅ Instancia global del optimizador
const trackingOptimizer = new TrackingOptimizer();

export interface SavedPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  types?: string[];
  tripId: string;
  tripName: string;
  visited?: boolean;
}

export interface NearbyPlace extends SavedPlace {
  distance: number; // meters
  notifiedThresholds: number[]; // thresholds that have been notified
}

export interface TravelModeState {
  isTracking: boolean;
  isActive: boolean;
  currentLocation: LocationUpdate | null;
  nearbyPlaces: NearbyPlace[];
  savedPlaces: SavedPlace[];
  energyMode: EnergyMode;
  activeRoute: NavigationRoute | null;
  deviation: DeviationAnalysis | null;
  permissionsGranted: boolean;
  error: string | null;
  transportMode: TransportMode | null; // ✅ Modo de transporte detectado
  currentSpeed: number | null; // ✅ Velocidad actual en km/h
  pendingArrival: PlaceArrival | null; // ✅ NUEVO: Lugar detectado esperando confirmación
}

export interface TravelModeActions {
  startTravelMode: () => Promise<boolean>;
  stopTravelMode: () => Promise<void>;
  setEnergyMode: (mode: EnergyMode) => void;
  setSavedPlaces: (places: SavedPlace[]) => void;
  startNavigation: (waypoints: WaypointPlace[], travelMode?: TravelMode) => Promise<void>;
  stopNavigation: () => void;
  recalculateRoute: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  confirmArrival: (placeId: string) => void; // ✅ NUEVO: Confirmar llegada
  skipArrival: (placeId: string) => void; // ✅ NUEVO: Saltar llegada
}

const DEFAULT_PROXIMITY_RADIUS = 5000; // 5km

export function useTravelModeSimple(): [TravelModeState, TravelModeActions] {
  // State
  const [state, setState] = useState<TravelModeState>({
    isTracking: false,
    isActive: false,
    currentLocation: null,
    nearbyPlaces: [],
    savedPlaces: [],
    energyMode: 'normal',
    activeRoute: null,
    deviation: null,
    permissionsGranted: false,
    error: null,
    transportMode: null, // ✅ NUEVO
    currentSpeed: null, // ✅ NUEVO
    pendingArrival: null, // ✅ NUEVO: Llegada pendiente de confirmación
  });

  // Refs for stable references
  const savedPlacesRef = useRef<SavedPlace[]>([]);
  const notifiedPlacesRef = useRef<Map<string, Set<number>>>(new Map());
  const activeRouteRef = useRef<NavigationRoute | null>(null);

  /**
   * Handle location update from background manager
   */
  const handleLocationUpdate = useCallback(
    (location: LocationUpdate) => {
      console.log(
        `📍 Location update: ${location.coordinates.latitude}, ${location.coordinates.longitude} (±${location.accuracy}m)`
      );

      // ✅ FIX: Asegurar que la velocidad sea válida y no negativa
      const rawSpeed = location.speed ?? 0;
      const safeSpeed = Math.max(0, rawSpeed); // Nunca negativa

      // ✅ Convertir LocationUpdate a Location.LocationObject para el optimizador
      const locationObject = {
        coords: {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
          altitude: null,
          accuracy: location.accuracy,
          altitudeAccuracy: null,
          heading: null,
          speed: safeSpeed, // Usar velocidad segura
        },
        timestamp: location.timestamp,
      };

      // ✅ Detectar modo de transporte y velocidad
      const transportContext = trackingOptimizer.getTransportContext(locationObject);

      // ✅ Validar que speedKmh no sea negativa
      const validSpeed = Math.max(0, transportContext.speedKmh);

      setState((prev) => ({
        ...prev,
        currentLocation: location,
        transportMode: transportContext.mode,
        currentSpeed: validSpeed, // Siempre >= 0
      }));

      // Add to speed tracker
      unifiedSpeedTracker.addReading(location.coordinates, location.accuracy);

      // Get movement analysis
      const analysis = unifiedSpeedTracker.getMovementAnalysis();

      // Auto-adjust energy mode based on movement
      const suggestedMode = analysis.suggestedEnergyMode;
      if (suggestedMode !== state.energyMode) {
        console.log(`🔋 Auto-adjusting energy mode to: ${suggestedMode}`);
        backgroundTravelManager.setEnergyMode(suggestedMode);
        setState((prev) => ({ ...prev, energyMode: suggestedMode }));
      }

      // ✅ Usar TrackingOptimizer para calcular ETAs y detectar lugares cercanos
      const places = savedPlacesRef.current;
      const placesForETA = places.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      const etaNotifications = trackingOptimizer.calculateETAsForPlaces(
        locationObject,
        placesForETA
      );

      // ✅ Enviar notificaciones para lugares que requieren notificación
      etaNotifications.forEach((notification) => {
        const notifiedSet =
          notifiedPlacesRef.current.get(notification.placeId) || new Set<number>();

        // Usar distancia como threshold para evitar duplicados
        const distanceThreshold = Math.round(notification.eta.distanceMeters / 100) * 100;

        if (!notifiedSet.has(distanceThreshold)) {
          travelNotificationService.sendProximityNotification({
            placeId: notification.placeId,
            placeName: notification.placeName,
            distance: notification.eta.distanceMeters,
            threshold: distanceThreshold,
            tripId: places.find((p) => p.id === notification.placeId)?.tripId || '',
            tripName: places.find((p) => p.id === notification.placeId)?.tripName || '',
          });

          notifiedSet.add(distanceThreshold);
          notifiedPlacesRef.current.set(notification.placeId, notifiedSet);
        }
      });

      // Calculate distances to ALL saved places (for display)
      const nearby: NearbyPlace[] = [];

      places.forEach((place) => {
        const distance = calculateHaversineDistance(location.coordinates, {
          latitude: place.latitude,
          longitude: place.longitude,
        });

        // Debug logging
        console.log(
          `📏 Distance calc: ${place.name}\n` +
            `   Current: [${location.coordinates.latitude.toFixed(6)}, ${location.coordinates.longitude.toFixed(6)}]\n` +
            `   Place: [${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}]\n` +
            `   Distance: ${(distance / 1000).toFixed(2)} km (${Math.round(distance)} m)`
        );

        // Get adaptive radius for this place type
        const radius = getAdaptiveRadius(place.types);
        const maxRadius = Math.max(radius, DEFAULT_PROXIMITY_RADIUS);

        if (distance <= maxRadius) {
          const notifiedSet = notifiedPlacesRef.current.get(place.id) || new Set<number>();

          nearby.push({
            ...place,
            distance,
            notifiedThresholds: Array.from(notifiedSet),
          });
        }
      });

      // Sort by distance (closest first)
      nearby.sort((a, b) => a.distance - b.distance);

      setState((prev) => ({ ...prev, nearbyPlaces: nearby }));

      // ✅ NUEVO: Check for arrival detection
      places.forEach((place) => {
        const arrival = arrivalDetectionService.checkArrival(
          place.id,
          place.name,
          { latitude: place.latitude, longitude: place.longitude },
          place.types,
          location.coordinates,
          new Date(location.timestamp)
        );

        if (arrival) {
          console.log(
            `🎉 ARRIVAL DETECTED: ${arrival.placeName}\n` +
              `   Distance: ${arrival.distance.toFixed(0)}m\n` +
              `   Dwelling time: ${arrival.dwellingTimeSeconds.toFixed(0)}s`
          );

          // Trigger arrival modal
          setState((prev) => ({ ...prev, pendingArrival: arrival }));
        }
      });

      // Handle navigation deviation if active
      if (activeRouteRef.current) {
        deviationDetectionService.addLocationReading({
          coordinates: location.coordinates,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        });

        const deviation = deviationDetectionService.analyzeDeviation(
          activeRouteRef.current.polyline,
          activeRouteRef.current.travelMode
        );

        setState((prev) => ({ ...prev, deviation }));

        // Suggest recalculation if needed
        if (deviation.shouldSuggestRecalculation) {
          travelNotificationService.sendDeviationNotification();
        }
      }
    },
    [state.energyMode]
  );

  /**
   * Handle location error
   */
  const handleLocationError = useCallback((error: Error) => {
    console.error('❌ Location error:', error);
    setState((prev) => ({ ...prev, error: error.message }));
  }, []);

  /**
   * Request permissions
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Request location permissions
      const locationGranted = await backgroundTravelManager.requestPermissions();
      if (!locationGranted) {
        setState((prev) => ({ ...prev, error: 'Location permissions not granted' }));
        return false;
      }

      // Request notification permissions
      const notificationGranted = await travelNotificationService.requestPermissions();
      if (!notificationGranted) {
        console.warn('⚠️ Notification permissions not granted');
        // We continue anyway
      }

      setState((prev) => ({ ...prev, permissionsGranted: true, error: null }));
      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      setState((prev) => ({ ...prev, error: 'Failed to request permissions' }));
      return false;
    }
  }, []);

  /**
   * Start Travel Mode
   */
  const startTravelMode = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🚀 Starting Travel Mode...');

      // Check permissions
      if (!state.permissionsGranted) {
        const granted = await requestPermissions();
        if (!granted) {
          return false;
        }
      }

      // Start background tracking
      const started = await backgroundTravelManager.startTracking(
        handleLocationUpdate,
        handleLocationError
      );

      if (!started) {
        setState((prev) => ({ ...prev, error: 'Failed to start tracking' }));
        return false;
      }

      // Send welcome notification
      if (state.savedPlaces.length > 0) {
        const tripName = state.savedPlaces[0].tripName || 'tu viaje';
        await travelNotificationService.sendWelcomeNotification(tripName);
      }

      setState((prev) => ({ ...prev, isTracking: true, isActive: true, error: null }));

      console.log('✅ Travel Mode started');
      return true;
    } catch (error) {
      console.error('❌ Error starting Travel Mode:', error);
      setState((prev) => ({ ...prev, error: 'Failed to start Travel Mode' }));
      return false;
    }
  }, [
    state.permissionsGranted,
    state.savedPlaces,
    requestPermissions,
    handleLocationUpdate,
    handleLocationError,
  ]);

  /**
   * Stop Travel Mode
   */
  const stopTravelMode = useCallback(async (): Promise<void> => {
    try {
      console.log('🛑 Stopping Travel Mode...');

      // Stop background tracking
      await backgroundTravelManager.stopTracking();

      // Reset tracking optimizer
      trackingOptimizer.reset();

      // Reset deviation detection
      deviationDetectionService.reset();

      // Reset arrival detection
      arrivalDetectionService.resetAll();

      // Reset navigation
      if (activeRouteRef.current) {
        activeRouteRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        isTracking: false,
        isActive: false,
        currentLocation: null,
        activeRoute: null,
        deviation: null,
        nearbyPlaces: [],
        pendingArrival: null, // Reset pending arrival
        transportMode: null,
        currentSpeed: null,
      }));

      console.log('✅ Travel Mode stopped');
    } catch (error) {
      console.error('❌ Error stopping Travel Mode:', error);
    }
  }, []);

  /**
   * Set energy mode
   */
  const setEnergyMode = useCallback((mode: EnergyMode) => {
    console.log(`🔋 Setting energy mode: ${mode}`);
    backgroundTravelManager.setEnergyMode(mode);
    setState((prev) => ({ ...prev, energyMode: mode }));
  }, []);

  /**
   * Set saved places
   */
  const setSavedPlaces = useCallback((places: SavedPlace[]) => {
    console.log(`📍 Setting saved places: ${places.length} places`);
    savedPlacesRef.current = places;
    setState((prev) => ({ ...prev, savedPlaces: places }));
  }, []);

  /**
   * Start navigation
   */
  const startNavigation = useCallback(
    async (waypoints: WaypointPlace[], travelMode: TravelMode = 'walking'): Promise<void> => {
      try {
        console.log(`🧭 Starting navigation to ${waypoints.length} waypoints (${travelMode})`);

        const route = await navigationService.getEnhancedDirections(waypoints, travelMode);

        if (!route) {
          setState((prev) => ({ ...prev, error: 'Failed to get directions' }));
          return;
        }

        activeRouteRef.current = route;
        deviationDetectionService.reset();

        setState((prev) => ({ ...prev, activeRoute: route, deviation: null, error: null }));

        console.log('✅ Navigation started');
      } catch (error) {
        console.error('❌ Error starting navigation:', error);
        setState((prev) => ({ ...prev, error: 'Failed to start navigation' }));
      }
    },
    []
  );

  /**
   * Stop navigation
   */
  const stopNavigation = useCallback(() => {
    console.log('🛑 Stopping navigation');
    activeRouteRef.current = null;
    deviationDetectionService.reset();
    setState((prev) => ({ ...prev, activeRoute: null, deviation: null }));
  }, []);

  /**
   * Recalculate route
   */
  const recalculateRoute = useCallback(async (): Promise<void> => {
    if (!activeRouteRef.current || !state.currentLocation) {
      return;
    }

    try {
      console.log('🔄 Recalculating route...');

      const route = activeRouteRef.current;
      const currentLeg = route.legs[route.currentLegIndex];

      if (!currentLeg) {
        return;
      }

      // Get remaining waypoints
      const remainingWaypoints: WaypointPlace[] = [
        {
          id: 'current',
          name: 'Tu ubicación',
          location: state.currentLocation.coordinates,
        },
        ...route.legs.slice(route.currentLegIndex).map((leg) => ({
          id: leg.endAddress,
          name: leg.endAddress,
          location: leg.endLocation,
        })),
      ];

      const newRoute = await navigationService.getEnhancedDirections(
        remainingWaypoints,
        route.travelMode
      );

      if (newRoute) {
        activeRouteRef.current = newRoute;
        deviationDetectionService.reset();
        setState((prev) => ({ ...prev, activeRoute: newRoute, deviation: null }));
        console.log('✅ Route recalculated');
      }
    } catch (error) {
      console.error('❌ Error recalculating route:', error);
    }
  }, [state.currentLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isTracking) {
        stopTravelMode();
      }
    };
  }, [state.isTracking, stopTravelMode]);

  /**
   * Confirm arrival at a place
   */
  const confirmArrival = useCallback((placeId: string) => {
    console.log(`✅ Confirming arrival at place: ${placeId}`);
    arrivalDetectionService.confirmVisit(placeId);
    setState((prev) => ({ ...prev, pendingArrival: null }));
  }, []);

  /**
   * Skip arrival notification
   */
  const skipArrival = useCallback((placeId: string) => {
    console.log(`⏭️ Skipping arrival at place: ${placeId}`);
    arrivalDetectionService.skipVisit(placeId);
    setState((prev) => ({ ...prev, pendingArrival: null }));
  }, []);

  // Actions
  const actions: TravelModeActions = {
    startTravelMode,
    stopTravelMode,
    setEnergyMode,
    setSavedPlaces,
    startNavigation,
    stopNavigation,
    recalculateRoute,
    requestPermissions,
    confirmArrival,
    skipArrival,
  };

  return [state, actions];
}
