import { useState, useEffect, useCallback, useRef } from 'react';

import * as Location from 'expo-location';

import { recalculateRoute, RouteResult, TransportMode } from '@/lib/useDirections';

/**
 * Hook para navegación con recalculación automática de rutas
 *
 * Características:
 * - Tracking GPS en tiempo real
 * - Detección automática de desviación
 * - Recalculación inteligente usando OSRM (gratis para walking/cycling)
 * - Notificaciones cuando encuentra rutas más cortas
 */

interface UseRouteNavigationProps {
  initialRoute: RouteResult;
  destination: { lat: number; lng: number };
  mode: TransportMode;
  language?: string;
  onRouteUpdate?: (newRoute: RouteResult) => void;
  onDeviation?: (distanceMeters: number) => void;
  onArrival?: () => void;
}

interface NavigationState {
  route: RouteResult;
  userLocation: { lat: number; lng: number } | null;
  isRecalculating: boolean;
  distanceToDestination: number | null;
  isOffRoute: boolean;
  recalculationCount: number;
}

// Configuración por modo de transporte
const THRESHOLDS = {
  walking: {
    deviationMeters: 50,
    recalculationInterval: 180000, // 3 minutos
    arrivalRadius: 20,
  },
  cycling: {
    deviationMeters: 75,
    recalculationInterval: 120000, // 2 minutos
    arrivalRadius: 30,
  },
  driving: {
    deviationMeters: 100,
    recalculationInterval: 60000, // 1 minuto
    arrivalRadius: 50,
  },
  transit: {
    deviationMeters: 100,
    recalculationInterval: 300000, // 5 minutos
    arrivalRadius: 50,
  },
};

export function useRouteNavigation({
  initialRoute,
  destination,
  mode,
  language = 'es',
  onRouteUpdate,
  onDeviation,
  onArrival,
}: UseRouteNavigationProps) {
  const [state, setState] = useState<NavigationState>({
    route: initialRoute,
    userLocation: null,
    isRecalculating: false,
    distanceToDestination: null,
    isOffRoute: false,
    recalculationCount: 0,
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const recalculationTimer = useRef<NodeJS.Timeout | null>(null);
  const lastRecalculationTime = useRef<number>(Date.now());
  const startedTrackingRef = useRef<boolean>(false);

  // Refs para evitar que cambie la identidad de callbacks y efectos
  const stateRef = useRef(state);
  const destinationRef = useRef(destination);
  const modeRef = useRef(mode);
  const languageRef = useRef(language);
  const onRouteUpdateRef = useRef(onRouteUpdate);
  const onDeviationRef = useRef(onDeviation);
  const onArrivalRef = useRef(onArrival);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  useEffect(() => {
    onRouteUpdateRef.current = onRouteUpdate;
  }, [onRouteUpdate]);
  useEffect(() => {
    onDeviationRef.current = onDeviation;
  }, [onDeviation]);
  useEffect(() => {
    onArrivalRef.current = onArrival;
  }, [onArrival]);

  // Calcular distancia Haversine entre dos puntos
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371000; // Radio de la Tierra en metros
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Calcular distancia mínima a la ruta (línea)
  const distanceToRoute = useCallback(
    (userLat: number, userLng: number, routeCoords: [number, number][]): number => {
      let minDistance = Infinity;

      for (let i = 0; i < routeCoords.length - 1; i++) {
        const [lng1, lat1] = routeCoords[i];

        // Distancia aproximada del punto al vértice (suficiente para detección)
        const distance = calculateDistance(userLat, userLng, lat1, lng1);
        minDistance = Math.min(minDistance, distance);
      }

      return minDistance;
    },
    [calculateDistance]
  );

  // Ejecutar recalculación de ruta
  const performRecalculation = useCallback(async () => {
    const s = stateRef.current;
    const dest = destinationRef.current;
    const m = modeRef.current;
    const lang = languageRef.current;

    if (s.isRecalculating || !s.userLocation) return;

    console.log('🔄 [Navigation] Starting route recalculation...', {
      mode: m,
      userLocation: s.userLocation,
      destination: dest,
      previousDistance: `${(s.route.distance_m / 1000).toFixed(2)}km`,
    });

    setState((prev) => ({ ...prev, isRecalculating: true }));
    lastRecalculationTime.current = Date.now();

    try {
      const newRoute = await recalculateRoute(s.userLocation, dest, m, lang);

      if (newRoute) {
        const improvement = s.route.distance_m - newRoute.distance_m;

        console.log('✅ [Navigation] Route recalculated:', {
          oldDistance: `${(s.route.distance_m / 1000).toFixed(2)}km`,
          newDistance: `${(newRoute.distance_m / 1000).toFixed(2)}km`,
          improvement:
            improvement > 0 ? `${(improvement / 1000).toFixed(2)}km shorter` : 'no improvement',
          source: newRoute.source,
          cached: newRoute.cached,
        });

        setState((prev) => ({
          ...prev,
          route: newRoute,
          isOffRoute: false,
          recalculationCount: prev.recalculationCount + 1,
        }));

        onRouteUpdateRef.current?.(newRoute);
      } else {
        console.warn('⚠️ [Navigation] Recalculation returned null, keeping current route');
      }
    } catch (error) {
      console.error('❌ [Navigation] Recalculation failed:', error);
    } finally {
      setState((prev) => ({ ...prev, isRecalculating: false }));
    }
  }, []);

  // Verificar llegada al destino
  const checkArrival = useCallback(() => {
    const s = stateRef.current;
    if (!s.userLocation) return false;

    const dest = destinationRef.current;
    const m = modeRef.current;

    const distance = calculateDistance(s.userLocation.lat, s.userLocation.lng, dest.lat, dest.lng);

    const threshold = THRESHOLDS[m].arrivalRadius;

    if (distance <= threshold) {
      console.log('🎉 [Navigation] Arrived at destination!', {
        distance: `${distance.toFixed(1)}m`,
        threshold: `${threshold}m`,
      });
      onArrivalRef.current?.();
      return true;
    }

    return false;
  }, [calculateDistance]);

  // Procesar actualización de ubicación
  const handleLocationUpdate = useCallback(
    (location: Location.LocationObject) => {
      const s = stateRef.current;
      const dest = destinationRef.current;
      const m = modeRef.current;

      const userLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      // Calcular distancia al destino
      const distanceToDest = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        dest.lat,
        dest.lng
      );

      // Verificar llegada
      if (checkArrival()) {
        return;
      }

      // Calcular si está fuera de ruta
      const deviationDistance = distanceToRoute(userLocation.lat, userLocation.lng, s.route.coords);

      const threshold = THRESHOLDS[m].deviationMeters;
      const isOffRoute = deviationDistance > threshold;

      // Actualizar estado
      setState((prev) => ({
        ...prev,
        userLocation,
        distanceToDestination: distanceToDest,
        isOffRoute,
      }));

      // Notificar desviación
      if (isOffRoute && !s.isOffRoute) {
        console.log('⚠️ [Navigation] User is off route:', {
          deviation: `${deviationDistance.toFixed(1)}m`,
          threshold: `${threshold}m`,
        });
        onDeviationRef.current?.(deviationDistance);
      }

      // Recalcular si está fuera de ruta y no se está recalculando
      if (isOffRoute && !s.isRecalculating) {
        const timeSinceLastRecalc = Date.now() - lastRecalculationTime.current;
        const minInterval = 30000; // Mínimo 30 segundos entre recalculaciones

        if (timeSinceLastRecalc > minInterval) {
          console.log('🔄 [Navigation] Off route detected, triggering recalculation...');
          performRecalculation();
        }
      }
    },
    [calculateDistance, distanceToRoute, checkArrival, performRecalculation]
  );

  // Iniciar tracking de ubicación
  useEffect(() => {
    let mounted = true;

    const startTracking = async () => {
      try {
        if (startedTrackingRef.current) return; // ya iniciado

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('❌ [Navigation] Location permission denied');
          return;
        }

        if (!mounted) return;

        startedTrackingRef.current = true;
        console.log('🎯 [Navigation] Starting location tracking...', { mode: modeRef.current });

        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Actualizar cada 5 segundos
            distanceInterval: 20, // O cada 20 metros
          },
          handleLocationUpdate
        );
      } catch (error) {
        console.error('❌ [Navigation] Error starting location tracking:', error);
      }
    };

    startTracking();

    return () => {
      mounted = false;
      locationSubscription.current?.remove();
      locationSubscription.current = null;
      startedTrackingRef.current = false;
      if (recalculationTimer.current) {
        clearInterval(recalculationTimer.current);
        recalculationTimer.current = null;
      }
    };
  }, [handleLocationUpdate]);

  // Recalculación periódica DESACTIVADA por defecto (solo recalcula al desviarse o manualmente)
  // Si quieres activarla, descomenta el código de abajo
  /*
  useEffect(() => {
    const m = modeRef.current;
    if (m === 'transit') return; // No recalcular en tránsito

    const interval = THRESHOLDS[m].recalculationInterval;

    // Limpiar previo si existiera
    if (recalculationTimer.current) {
      clearInterval(recalculationTimer.current);
      recalculationTimer.current = null;
    }

    recalculationTimer.current = setInterval(() => {
      const s = stateRef.current;
      if (!s.isOffRoute && !s.isRecalculating && s.userLocation) {
        console.log('⏰ [Navigation] Periodic recalculation triggered');
        performRecalculation();
      }
    }, interval);

    return () => {
      if (recalculationTimer.current) {
        clearInterval(recalculationTimer.current);
        recalculationTimer.current = null;
      }
    };
  }, [performRecalculation]);
  */

  // Método manual para forzar recalculación
  const forceRecalculation = useCallback(async () => {
    console.log('🔄 [Navigation] Manual recalculation triggered');
    await performRecalculation();
  }, [performRecalculation]);

  return {
    route: state.route,
    userLocation: state.userLocation,
    isRecalculating: state.isRecalculating,
    distanceToDestination: state.distanceToDestination,
    isOffRoute: state.isOffRoute,
    recalculationCount: state.recalculationCount,
    forceRecalculation,
  };
}
