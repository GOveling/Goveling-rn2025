// EJEMPLO DE IMPLEMENTACIÓN: Sistema de Recalculación Dinámica
// Archivo: src/hooks/useRouteNavigation.ts

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
    deviationMeters: 50, // Detectar desviación a 50m
    recalculationInterval: 180000, // Recalcular cada 3 minutos
    arrivalRadius: 20, // Considerar llegada a 20m
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
        const [lng2, lat2] = routeCoords[i + 1];

        // Distancia del punto al segmento de línea
        const distance = calculateDistance(userLat, userLng, lat1, lng1);
        minDistance = Math.min(minDistance, distance);
      }

      return minDistance;
    },
    [calculateDistance]
  );

  // Ejecutar recalculación de ruta
  const performRecalculation = useCallback(async () => {
    if (state.isRecalculating || !state.userLocation) return;

    console.log('🔄 [Navigation] Starting route recalculation...', {
      mode,
      userLocation: state.userLocation,
      destination,
      previousDistance: `${(state.route.distance_m / 1000).toFixed(2)}km`,
    });

    setState((prev) => ({ ...prev, isRecalculating: true }));
    lastRecalculationTime.current = Date.now();

    try {
      const newRoute = await recalculateRoute(state.userLocation, destination, mode, language);

      if (newRoute) {
        const improvement = state.route.distance_m - newRoute.distance_m;

        console.log('✅ [Navigation] Route recalculated:', {
          oldDistance: `${(state.route.distance_m / 1000).toFixed(2)}km`,
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

        onRouteUpdate?.(newRoute);
      } else {
        console.warn('⚠️ [Navigation] Recalculation returned null, keeping current route');
      }
    } catch (error) {
      console.error('❌ [Navigation] Recalculation failed:', error);
    } finally {
      setState((prev) => ({ ...prev, isRecalculating: false }));
    }
  }, [
    state.userLocation,
    state.isRecalculating,
    state.route,
    destination,
    mode,
    language,
    onRouteUpdate,
  ]);

  // Verificar llegada al destino
  const checkArrival = useCallback(() => {
    if (!state.userLocation) return false;

    const distance = calculateDistance(
      state.userLocation.lat,
      state.userLocation.lng,
      destination.lat,
      destination.lng
    );

    const threshold = THRESHOLDS[mode].arrivalRadius;

    if (distance <= threshold) {
      console.log('🎉 [Navigation] Arrived at destination!', {
        distance: `${distance.toFixed(1)}m`,
        threshold: `${threshold}m`,
      });
      onArrival?.();
      return true;
    }

    return false;
  }, [state.userLocation, destination, mode, calculateDistance, onArrival]);

  // Procesar actualización de ubicación
  const handleLocationUpdate = useCallback(
    (location: Location.LocationObject) => {
      const userLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      // Calcular distancia al destino
      const distanceToDestination = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        destination.lat,
        destination.lng
      );

      // Verificar llegada
      if (checkArrival()) {
        return;
      }

      // Calcular si está fuera de ruta
      const deviationDistance = distanceToRoute(
        userLocation.lat,
        userLocation.lng,
        state.route.coords
      );

      const threshold = THRESHOLDS[mode].deviationMeters;
      const isOffRoute = deviationDistance > threshold;

      // Actualizar estado
      setState((prev) => ({
        ...prev,
        userLocation,
        distanceToDestination,
        isOffRoute,
      }));

      // Notificar desviación
      if (isOffRoute && !state.isOffRoute) {
        console.log('⚠️ [Navigation] User is off route:', {
          deviation: `${deviationDistance.toFixed(1)}m`,
          threshold: `${threshold}m`,
        });
        onDeviation?.(deviationDistance);
      }

      // Recalcular si está fuera de ruta y no se está recalculando
      if (isOffRoute && !state.isRecalculating) {
        const timeSinceLastRecalc = Date.now() - lastRecalculationTime.current;
        const minInterval = 30000; // Mínimo 30 segundos entre recalculaciones

        if (timeSinceLastRecalc > minInterval) {
          console.log('🔄 [Navigation] Off route detected, triggering recalculation...');
          performRecalculation();
        }
      }
    },
    [
      state.route.coords,
      state.isOffRoute,
      state.isRecalculating,
      destination,
      mode,
      calculateDistance,
      distanceToRoute,
      checkArrival,
      onDeviation,
      performRecalculation,
    ]
  );

  // Iniciar tracking de ubicación
  useEffect(() => {
    let mounted = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('❌ [Navigation] Location permission denied');
          return;
        }

        if (!mounted) return;

        console.log('🎯 [Navigation] Starting location tracking...', { mode });

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
      if (recalculationTimer.current) {
        clearInterval(recalculationTimer.current);
      }
    };
  }, [handleLocationUpdate, mode]);

  // Recalculación periódica (opcional, solo si no está en modo desviación)
  useEffect(() => {
    if (mode === 'transit') return; // No recalcular en tránsito

    const interval = THRESHOLDS[mode].recalculationInterval;

    recalculationTimer.current = setInterval(() => {
      if (!state.isOffRoute && !state.isRecalculating && state.userLocation) {
        console.log('⏰ [Navigation] Periodic recalculation triggered');
        performRecalculation();
      }
    }, interval);

    return () => {
      if (recalculationTimer.current) {
        clearInterval(recalculationTimer.current);
      }
    };
  }, [mode, state.isOffRoute, state.isRecalculating, state.userLocation, performRecalculation]);

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

// ============================================================================
// EJEMPLO DE USO EN COMPONENTE
// ============================================================================

/*

import { useRouteNavigation } from '@/hooks/useRouteNavigation';

export function RouteMapModal({ route, destination, mode, onClose }) {
  const {
    route: currentRoute,
    userLocation,
    isRecalculating,
    distanceToDestination,
    isOffRoute,
    recalculationCount,
    forceRecalculation,
  } = useRouteNavigation({
    initialRoute: route,
    destination,
    mode,
    language: i18n.language,
    onRouteUpdate: (newRoute) => {
      console.log('🔄 Route updated:', newRoute);
      // Actualizar UI con nueva ruta
    },
    onDeviation: (distance) => {
      Alert.alert(
        'Fuera de ruta',
        `Te has desviado ${distance.toFixed(0)}m. Recalculando...`
      );
    },
    onArrival: () => {
      Alert.alert('¡Has llegado!', 'Has alcanzado tu destino');
      onClose();
    },
  });

  return (
    <View>
      <MapView route={currentRoute} userLocation={userLocation} />
      
      {isOffRoute && (
        <View style={styles.warningBanner}>
          <Text>⚠️ Fuera de ruta - Recalculando...</Text>
        </View>
      )}
      
      {isRecalculating && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator />
          <Text>Buscando mejor ruta...</Text>
        </View>
      )}
      
      <Button
        title="Buscar ruta más corta"
        onPress={forceRecalculation}
        disabled={isRecalculating}
      />
      
      <Text>Distancia restante: {(distanceToDestination / 1000).toFixed(2)}km</Text>
      <Text>Recalculaciones: {recalculationCount}</Text>
      <Text>Motor: {currentRoute.source === 'osrm' ? 'OSRM (gratis)' : 'ORS'}</Text>
    </View>
  );
}

*/
