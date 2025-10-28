/**
 * DeviationDetectionService - Detects when user deviates from navigation route
 * Uses location buffering and smoothing to reduce GPS jitter
 * Optimized for native hardware
 */

import {
  Coordinates,
  calculateHaversineDistance,
  projectPointToLineSegment,
  smoothCoordinates,
  decodePolyline,
} from './geoUtils';
import { TravelMode } from './NavigationService';

export interface LocationReading {
  coordinates: Coordinates;
  accuracy: number; // meters
  timestamp: number;
}

export interface DeviationAnalysis {
  isOffRoute: boolean;
  deviationDistance: number; // meters
  consecutiveDeviations: number;
  shouldSuggestRecalculation: boolean;
  closestPointOnRoute: Coordinates | null;
}

class DeviationDetectionService {
  private locationBuffer: LocationReading[] = [];
  private readonly MAX_BUFFER_SIZE = 10;
  private readonly MIN_ACCURACY_THRESHOLD = 50; // meters
  private consecutiveOffRouteCount = 0;
  private offRouteSince: number | null = null;
  private readonly OFF_ROUTE_DURATION_THRESHOLD = 30000; // 30 seconds
  private readonly CONSECUTIVE_OFF_ROUTE_THRESHOLD = 5;

  /**
   * Get deviation threshold based on travel mode
   * @param travelMode Travel mode
   * @returns Threshold in meters
   */
  private getDeviationThreshold(travelMode: TravelMode): number {
    switch (travelMode) {
      case 'walking':
        return 50; // 50m for walking
      case 'bicycling':
        return 75; // 75m for bicycling
      case 'driving':
        return 100; // 100m for driving
      case 'transit':
        return 200; // 200m for transit
      default:
        return 50;
    }
  }

  /**
   * Add location reading to buffer
   * @param reading Location reading
   */
  addLocationReading(reading: LocationReading): void {
    // Filter out low-accuracy readings
    if (reading.accuracy > this.MIN_ACCURACY_THRESHOLD) {
      console.log(`⚠️ Skipping low-accuracy reading: ${reading.accuracy}m`);
      return;
    }

    this.locationBuffer.push(reading);

    // Keep buffer size manageable
    if (this.locationBuffer.length > this.MAX_BUFFER_SIZE) {
      this.locationBuffer.shift();
    }
  }

  /**
   * Get smoothed current location using weighted average
   * @returns Smoothed coordinates
   */
  private getSmoothedLocation(): Coordinates | null {
    if (this.locationBuffer.length === 0) {
      return null;
    }

    const coordinates = this.locationBuffer.map((reading) => reading.coordinates);
    const smoothed = smoothCoordinates(coordinates, 3);

    return smoothed[smoothed.length - 1];
  }

  /**
   * Find closest point on route polyline
   * @param currentLocation Current location
   * @param polyline Encoded polyline string
   * @returns Object with closest point and distance
   */
  private findClosestPointOnRoute(
    currentLocation: Coordinates,
    polyline: string
  ): { point: Coordinates; distance: number } | null {
    if (!polyline) {
      return null;
    }

    try {
      const routePoints = decodePolyline(polyline);

      if (routePoints.length === 0) {
        return null;
      }

      let minDistance = Infinity;
      let closestPoint: Coordinates | null = null;

      // Check each segment of the route
      for (let i = 0; i < routePoints.length - 1; i++) {
        const segmentStart = routePoints[i];
        const segmentEnd = routePoints[i + 1];

        // Project current location onto this segment
        const projectedPoint = projectPointToLineSegment(currentLocation, segmentStart, segmentEnd);

        // Calculate distance to projected point
        const distance = calculateHaversineDistance(currentLocation, projectedPoint);

        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = projectedPoint;
        }
      }

      if (closestPoint === null) {
        return null;
      }

      return {
        point: closestPoint,
        distance: minDistance,
      };
    } catch (error) {
      console.error('❌ Error finding closest point on route:', error);
      return null;
    }
  }

  /**
   * Analyze deviation from route
   * @param polyline Encoded polyline string
   * @param travelMode Travel mode
   * @returns Deviation analysis
   */
  analyzeDeviation(polyline: string, travelMode: TravelMode): DeviationAnalysis {
    const smoothedLocation = this.getSmoothedLocation();

    if (!smoothedLocation) {
      return {
        isOffRoute: false,
        deviationDistance: 0,
        consecutiveDeviations: 0,
        shouldSuggestRecalculation: false,
        closestPointOnRoute: null,
      };
    }

    // Find closest point on route
    const closestPoint = this.findClosestPointOnRoute(smoothedLocation, polyline);

    if (!closestPoint) {
      return {
        isOffRoute: false,
        deviationDistance: 0,
        consecutiveDeviations: 0,
        shouldSuggestRecalculation: false,
        closestPointOnRoute: null,
      };
    }

    const threshold = this.getDeviationThreshold(travelMode);
    const deviationDistance = closestPoint.distance;
    const isOffRoute = deviationDistance > threshold;

    // Track consecutive off-route readings
    if (isOffRoute) {
      this.consecutiveOffRouteCount++;
      if (this.offRouteSince === null) {
        this.offRouteSince = Date.now();
      }
    } else {
      this.consecutiveOffRouteCount = 0;
      this.offRouteSince = null;
    }

    // Calculate time off route
    const timeOffRoute = this.offRouteSince !== null ? Date.now() - this.offRouteSince : 0;

    // Determine if we should suggest recalculation
    const shouldSuggestRecalculation =
      // Significant deviation (3x threshold)
      deviationDistance > threshold * 3 ||
      // Sustained deviation (30+ seconds)
      (isOffRoute && timeOffRoute > this.OFF_ROUTE_DURATION_THRESHOLD) ||
      // Multiple consecutive deviations
      this.consecutiveOffRouteCount >= this.CONSECUTIVE_OFF_ROUTE_THRESHOLD;

    return {
      isOffRoute,
      deviationDistance,
      consecutiveDeviations: this.consecutiveOffRouteCount,
      shouldSuggestRecalculation,
      closestPointOnRoute: closestPoint.point,
    };
  }

  /**
   * Reset deviation tracking
   */
  reset(): void {
    this.locationBuffer = [];
    this.consecutiveOffRouteCount = 0;
    this.offRouteSince = null;
    console.log('🔄 Deviation tracking reset');
  }

  /**
   * Get location buffer (for debugging)
   */
  getLocationBuffer(): LocationReading[] {
    return [...this.locationBuffer];
  }

  /**
   * Get deviation summary (for debugging)
   */
  getDeviationSummary(): string {
    if (this.consecutiveOffRouteCount === 0) {
      return 'En ruta';
    }

    const timeOffRoute = this.offRouteSince !== null ? Date.now() - this.offRouteSince : 0;
    const seconds = Math.floor(timeOffRoute / 1000);

    return `Fuera de ruta: ${this.consecutiveOffRouteCount} lecturas, ${seconds}s`;
  }
}

// Export singleton instance
export const deviationDetectionService = new DeviationDetectionService();
export default DeviationDetectionService;
