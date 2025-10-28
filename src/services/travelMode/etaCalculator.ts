/**
 * ETA Calculator Service
 * Calculates estimated time of arrival without using Google Directions API
 * Uses realistic speed averages and route correction factors
 */

import { haversineDistance } from './geoUtils';
import { TransportMode } from './transportDetector';

export interface ETAResult {
  distanceMeters: number;
  durationMinutes: number;
  arrivalTime: Date;
  shouldNotify: boolean; // ¿Enviar notificación ahora?
  message: string; // Mensaje para la notificación
}

/**
 * Calcula ETA sin usar Google Directions API
 * Usa velocidades promedio y ajusta por topografía/contexto
 */
export class ETACalculator {
  /**
   * Velocidades promedio realistas por modo (m/s)
   */
  private readonly AVG_SPEEDS = {
    stationary: 0,
    walking: 1.4, // 5 km/h (considera paradas en semáforos)
    cycling: 5.5, // 20 km/h (considera tráfico)
    transit: 8.3, // 30 km/h (promedio con paradas)
    driving: 11.1, // 40 km/h (considera tráfico urbano)
  };

  /**
   * Calcula ETA y determina si debe notificar
   */
  calculateETA(
    userLat: number,
    userLng: number,
    placeLat: number,
    placeLng: number,
    transportMode: TransportMode,
    currentSpeed: number, // m/s (velocidad actual real)
    etaThreshold: number // minutos antes de llegar para notificar
  ): ETAResult {
    // 1. Calcular distancia en línea recta
    const straightDistance = haversineDistance(
      { latitude: userLat, longitude: userLng },
      { latitude: placeLat, longitude: placeLng }
    );

    // 2. Aplicar factor de corrección por rutas reales (no línea recta)
    const routeFactor = this.getRouteFactor(transportMode, straightDistance);
    const estimatedDistance = straightDistance * routeFactor;

    // 3. Determinar velocidad a usar
    let effectiveSpeed: number;

    if (currentSpeed > 0.5 && transportMode !== 'stationary') {
      // Usar velocidad actual si está en movimiento
      effectiveSpeed = currentSpeed;
    } else {
      // Usar velocidad promedio del modo si está parado o sin datos
      effectiveSpeed = this.AVG_SPEEDS[transportMode];
    }

    // 4. Calcular duración
    const durationSeconds = effectiveSpeed > 0 ? estimatedDistance / effectiveSpeed : Infinity;
    const durationMinutes = durationSeconds / 60;

    // 5. Calcular hora de llegada estimada
    const arrivalTime = new Date(Date.now() + durationSeconds * 1000);

    // 6. Determinar si debe notificar
    const shouldNotify = this.shouldNotifyNow(
      durationMinutes,
      etaThreshold,
      transportMode,
      estimatedDistance
    );

    // 7. Generar mensaje
    const message = this.generateMessage(transportMode, durationMinutes, estimatedDistance);

    return {
      distanceMeters: Math.round(estimatedDistance),
      durationMinutes: Math.round(durationMinutes),
      arrivalTime,
      shouldNotify,
      message,
    };
  }

  /**
   * Factor de corrección para convertir distancia recta a distancia real
   * (calles no son líneas rectas, hay curvas, desvíos, etc.)
   */
  private getRouteFactor(mode: TransportMode, distance: number): number {
    // Distancias cortas: factor mayor (más curvas proporcionales)
    // Distancias largas: factor menor (más rectas)

    const baseFactors = {
      stationary: 1.0,
      walking: 1.3, // +30% (atajos, cruces de calle)
      cycling: 1.25, // +25% (más directo que caminando)
      transit: 1.4, // +40% (rutas fijas con paradas)
      driving: 1.35, // +35% (debe seguir calles)
    };

    let factor = baseFactors[mode];

    // Ajustar por distancia
    if (distance < 500) {
      factor *= 1.1; // +10% extra en distancias cortas
    } else if (distance > 2000) {
      factor *= 0.95; // -5% en distancias largas
    }

    return factor;
  }

  /**
   * Determina si debe enviar notificación ahora
   */
  private shouldNotifyNow(
    etaMinutes: number,
    threshold: number,
    mode: TransportMode,
    distance: number
  ): boolean {
    // No notificar si está muy lejos
    if (etaMinutes > 30) return false;

    // No notificar si está estacionario y lejos
    if (mode === 'stationary' && distance > 100) return false;

    // Notificar si está dentro del umbral
    if (etaMinutes <= threshold) return true;

    // Notificar si está MUY cerca (override threshold)
    if (distance < 50) return true;

    return false;
  }

  /**
   * Genera mensaje inteligente según contexto
   */
  private generateMessage(mode: TransportMode, etaMinutes: number, distance: number): string {
    const distanceKm = (distance / 1000).toFixed(1);
    const etaRounded = Math.ceil(etaMinutes);

    // Mensajes según modo de transporte
    const modeEmoji = {
      stationary: '🧍',
      walking: '🚶',
      cycling: '🚴',
      transit: '🚌',
      driving: '🚗',
    };

    const emoji = modeEmoji[mode];

    if (distance < 50) {
      return `${emoji} ¡Ya llegaste! (${Math.round(distance)}m)`;
    } else if (distance < 200) {
      return `${emoji} Muy cerca - ${Math.round(distance)}m`;
    } else if (etaMinutes < 1) {
      return `${emoji} Llegarás en menos de 1 minuto`;
    } else if (etaMinutes < 5) {
      return `${emoji} Llegarás en ${etaRounded} minutos (${distanceKm}km)`;
    } else if (etaMinutes < 15) {
      return `${emoji} ${etaRounded} minutos para llegar (${distanceKm}km)`;
    } else {
      return `${emoji} A ${distanceKm}km de distancia (~${etaRounded}min)`;
    }
  }
}
