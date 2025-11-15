/**
 * Tracking Optimizer Service
 * Optimizes GPS tracking configuration based on user's transportation context
 */

import * as Location from 'expo-location';

import { ETACalculator, ETAResult } from './etaCalculator';
import { TransportDetector, TransportContext, TransportMode } from './transportDetector';

export interface OptimizedTrackingConfig {
  accuracy: Location.LocationAccuracy;
  distanceInterval: number; // metros
  timeInterval: number; // milisegundos
  showsBackgroundLocationIndicator: boolean;
  foregroundService?: {
    notificationTitle: string;
    notificationBody: string;
  };
}

export interface PlaceForETA {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface ETANotification {
  placeId: string;
  placeName: string;
  eta: ETAResult;
}

/**
 * Optimiza configuración de tracking GPS según contexto
 */
export class TrackingOptimizer {
  private transportDetector = new TransportDetector();
  private etaCalculator = new ETACalculator();

  /**
   * Genera configuración óptima de GPS según velocidad actual
   */
  getOptimizedConfig(location: Location.LocationObject): OptimizedTrackingConfig {
    // Detectar modo de transporte
    const context = this.transportDetector.detectTransportMode(location);

    // Configurar precisión GPS
    const accuracy = this.getAccuracyForMode(context.mode);

    // Configurar intervalos
    const config: OptimizedTrackingConfig = {
      accuracy,
      distanceInterval: this.getDistanceInterval(context.mode),
      timeInterval: context.updateInterval,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Modo Travel Activo',
        notificationBody: `Rastreando (${this.getModeName(context.mode)}) - ${context.speedKmh.toFixed(0)} km/h`,
      },
    };

    console.log(`⚙️ TrackingConfig: ${JSON.stringify(config, null, 2)}`);

    return config;
  }

  /**
   * Obtiene el contexto de transporte actual
   */
  getTransportContext(location: Location.LocationObject): TransportContext {
    return this.transportDetector.detectTransportMode(location);
  }

  /**
   * Precisión GPS según modo (balance precisión vs batería)
   */
  private getAccuracyForMode(mode: TransportMode): Location.LocationAccuracy {
    switch (mode) {
      case 'stationary':
        return Location.LocationAccuracy.Lowest; // Máximo ahorro batería
      case 'walking':
        return Location.LocationAccuracy.Balanced; // Balance
      case 'cycling':
        return Location.LocationAccuracy.High; // Alta precisión
      case 'transit':
      case 'driving':
        return Location.LocationAccuracy.BestForNavigation; // Máxima precisión
      default:
        return Location.LocationAccuracy.Balanced;
    }
  }

  /**
   * Intervalo de distancia para actualizar (metros)
   */
  private getDistanceInterval(mode: TransportMode): number {
    switch (mode) {
      case 'stationary':
        return 50; // Solo actualizar si se mueve >50m
      case 'walking':
        return 20; // Actualizar cada 20m
      case 'cycling':
        return 30; // Actualizar cada 30m
      case 'transit':
      case 'driving':
        return 50; // Actualizar cada 50m (velocidad alta)
      default:
        return 25;
    }
  }

  /**
   * Calcula ETA a todos los lugares y retorna los que requieren notificación
   */
  calculateETAsForPlaces(
    userLocation: Location.LocationObject,
    places: PlaceForETA[]
  ): ETANotification[] {
    const context = this.transportDetector.detectTransportMode(userLocation);
    const results: ETANotification[] = [];

    for (const place of places) {
      const eta = this.etaCalculator.calculateETA(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        place.latitude,
        place.longitude,
        context.mode,
        userLocation.coords.speed ?? 0,
        context.etaThreshold
      );

      if (eta.shouldNotify) {
        results.push({
          placeId: place.id,
          placeName: place.name,
          eta,
        });
      }
    }

    return results;
  }

  /**
   * Calcula ETA para un lugar específico
   */
  calculateETAForPlace(
    userLocation: Location.LocationObject,
    place: PlaceForETA
  ): ETAResult | null {
    try {
      const context = this.transportDetector.detectTransportMode(userLocation);

      return this.etaCalculator.calculateETA(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        place.latitude,
        place.longitude,
        context.mode,
        userLocation.coords.speed ?? 0,
        context.etaThreshold
      );
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  }

  /**
   * Resetea detector (útil al cambiar de viaje)
   */
  reset(): void {
    this.transportDetector.reset();
  }

  /**
   * Obtiene nombre legible del modo de transporte
   */
  private getModeName(mode: TransportMode): string {
    switch (mode) {
      case 'stationary':
        return 'Parado';
      case 'walking':
        return 'Caminando';
      case 'cycling':
        return 'Bicicleta';
      case 'transit':
        return 'Transporte';
      case 'driving':
        return 'Conduciendo';
      default:
        return 'Desconocido';
    }
  }
}
