/**
 * Transport Detection Service
 * Detects the user's transportation mode based on speed and movement patterns
 */

import * as Location from 'expo-location';

export type TransportMode = 'stationary' | 'walking' | 'cycling' | 'driving' | 'transit';

export interface TransportContext {
  mode: TransportMode;
  speed: number; // m/s
  speedKmh: number; // km/h
  confidence: number; // 0-1
  detectionRadius: number; // metros para notificaciones
  updateInterval: number; // milisegundos entre actualizaciones GPS
  etaThreshold: number; // minutos para notificar antes de llegar
}

// Velocidades típicas (m/s)
const SPEED_THRESHOLDS = {
  STATIONARY_MAX: 0.5, // < 1.8 km/h
  WALKING_MAX: 2.5, // < 9 km/h
  CYCLING_MAX: 7, // < 25 km/h
  DRIVING_MAX: 30, // < 108 km/h
  TRANSIT_MAX: 20, // < 72 km/h (promedio buses/metro)
};

/**
 * Detecta el medio de transporte basado en velocidad y patrón de movimiento
 */
export class TransportDetector {
  private speedHistory: number[] = [];
  private readonly HISTORY_SIZE = 10; // Últimas 10 lecturas

  /**
   * Analiza velocidad actual y histórica para determinar medio de transporte
   */
  detectTransportMode(location: Location.LocationObject): TransportContext {
    // ✅ FIX: Asegurar que la velocidad sea siempre >= 0
    const rawSpeed = location.coords.speed ?? 0; // m/s
    const speed = Math.max(0, rawSpeed); // Nunca negativa

    // 🔍 DEBUG: Log de velocidad raw vs sanitized
    if (rawSpeed < 0) {
      console.warn(`⚠️ Negative speed detected! Raw: ${rawSpeed} m/s, Sanitized: ${speed} m/s`);
    }

    // Validación de seguridad
    if (isNaN(speed) || !isFinite(speed)) {
      console.warn('⚠️ Invalid speed detected, defaulting to 0');
      return this.getContextForMode('stationary', 0, 0, 0.5);
    }

    // Agregar a historial
    this.speedHistory.push(speed);
    if (this.speedHistory.length > this.HISTORY_SIZE) {
      this.speedHistory.shift();
    }

    // Calcular velocidad promedio (suavizar picos)
    const avgSpeed = Math.max(
      0,
      this.speedHistory.reduce((sum, s) => sum + s, 0) / this.speedHistory.length
    ); // ✅ Asegurar que avgSpeed sea >= 0

    // Calcular varianza para detectar patrones
    const variance = this.calculateVariance(this.speedHistory);
    const isErratic = variance > 5; // Alta varianza = movimiento errático

    // Determinar modo de transporte
    let mode: TransportMode;
    let confidence: number;

    if (avgSpeed < SPEED_THRESHOLDS.STATIONARY_MAX) {
      mode = 'stationary';
      confidence = 0.95;
    } else if (avgSpeed < SPEED_THRESHOLDS.WALKING_MAX) {
      mode = 'walking';
      confidence = isErratic ? 0.7 : 0.9; // Menor confianza si movimiento errático
    } else if (avgSpeed < SPEED_THRESHOLDS.CYCLING_MAX) {
      mode = isErratic ? 'transit' : 'cycling'; // Bus en tráfico vs bici
      confidence = 0.75;
    } else if (avgSpeed < SPEED_THRESHOLDS.DRIVING_MAX) {
      mode = isErratic ? 'transit' : 'driving'; // Tráfico pesado vs auto fluido
      confidence = 0.8;
    } else {
      mode = 'driving';
      confidence = 0.9;
    }

    // ✅ Asegurar que las velocidades sean no negativas
    const safeAvgSpeed = Math.max(0, avgSpeed);
    const safeSpeedKmh = Math.max(0, safeAvgSpeed * 3.6);

    // Configurar parámetros según modo (usar avgSpeed para más estabilidad)
    const context = this.getContextForMode(mode, safeAvgSpeed, safeSpeedKmh, confidence);

    console.log(
      `🚦 TransportMode: ${mode} (${safeSpeedKmh.toFixed(1)} km/h) - Confidence: ${(confidence * 100).toFixed(0)}%`
    );

    return context;
  }

  /**
   * Configura parámetros optimizados para cada modo de transporte
   */
  private getContextForMode(
    mode: TransportMode,
    speed: number,
    speedKmh: number,
    confidence: number
  ): TransportContext {
    // ✅ Doble verificación: asegurar que los parámetros sean no negativos
    const safeSpeed = Math.max(0, speed);
    const safeSpeedKmh = Math.max(0, speedKmh);

    switch (mode) {
      case 'stationary':
        return {
          mode,
          speed: safeSpeed,
          speedKmh: safeSpeedKmh,
          confidence,
          detectionRadius: 100, // 100m - Usuario parado, detectar solo muy cercanos
          updateInterval: 60000, // 60s - GPS lento para ahorrar batería
          etaThreshold: 0, // 0min - No calcular ETA si está parado
        };

      case 'walking':
        return {
          mode,
          speed: safeSpeed,
          speedKmh: safeSpeedKmh,
          confidence,
          detectionRadius: 300, // 300m - ~5min caminando a 4km/h
          updateInterval: 15000, // 15s - Balance precisión/batería
          etaThreshold: 5, // 5min - Notificar 5min antes
        };

      case 'cycling':
        return {
          mode,
          speed: safeSpeed,
          speedKmh: safeSpeedKmh,
          confidence,
          detectionRadius: 800, // 800m - ~3min pedaleando a 20km/h
          updateInterval: 10000, // 10s - Más frecuente por velocidad
          etaThreshold: 3, // 3min - Notificar antes por velocidad
        };

      case 'transit':
        return {
          mode,
          speed: safeSpeed,
          speedKmh: safeSpeedKmh,
          confidence,
          detectionRadius: 1000, // 1km - Bus/metro puede frenar antes
          updateInterval: 8000, // 8s - Frecuente por velocidad variable
          etaThreshold: 5, // 5min - Tiempo para prepararse para bajar
        };

      case 'driving':
        return {
          mode,
          speed: safeSpeed,
          speedKmh: safeSpeedKmh,
          confidence,
          detectionRadius: 1500, // 1.5km - ~2min conduciendo a 50km/h
          updateInterval: 5000, // 5s - Alta frecuencia por velocidad
          etaThreshold: 3, // 3min - Notificar antes para prepararse
        };

      default:
        return {
          mode: 'walking',
          speed: safeSpeed,
          speedKmh: safeSpeedKmh,
          confidence: 0.5,
          detectionRadius: 500,
          updateInterval: 15000,
          etaThreshold: 5,
        };
    }
  }

  /**
   * Calcula varianza de velocidades (detectar movimiento errático)
   */
  private calculateVariance(speeds: number[]): number {
    if (speeds.length < 2) return 0;

    const mean = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    const squareDiffs = speeds.map((s) => Math.pow(s - mean, 2));
    return squareDiffs.reduce((sum, diff) => sum + diff, 0) / speeds.length;
  }

  /**
   * Resetea historial (útil al cambiar de viaje)
   */
  reset(): void {
    this.speedHistory = [];
  }
}
