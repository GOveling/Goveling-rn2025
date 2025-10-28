/**
 * ArrivalDetectionService - Smart proximity detection for place arrivals
 * Optimized for large venues (airports, stadiums, parks) and small locations (restaurants, cafes)
 * Includes dwelling time logic to prevent false positives
 * iOS & Android native hardware optimized
 */

import { calculateHaversineDistance } from './geoUtils';
import { getAdaptiveRadius } from './VenueSizeHeuristics';

export interface PlaceArrival {
  placeId: string;
  placeName: string;
  distance: number; // meters
  enteredAt: Date;
  isWithinRadius: boolean;
  dwellingTimeSeconds: number; // time user has been within radius
}

interface PlaceProximityState {
  placeId: string;
  enteredAt: Date | null;
  lastDistance: number;
  consecutiveReadings: number; // How many consecutive readings within radius
}

interface ArrivalDetectionConfig {
  dwellingTimeThresholdSeconds: number; // Minimum time to confirm arrival
  consecutiveReadingsRequired: number; // Minimum consecutive readings within radius
  exitDistanceMultiplier: number; // Distance multiplier to consider user has left
}

const DEFAULT_CONFIG: ArrivalDetectionConfig = {
  dwellingTimeThresholdSeconds: 30, // 30 seconds minimum
  consecutiveReadingsRequired: 3, // 3 consecutive readings
  exitDistanceMultiplier: 1.5, // 1.5x radius to exit
};

export class ArrivalDetectionService {
  private proximityStates: Map<string, PlaceProximityState> = new Map();
  private arrivedPlaces: Set<string> = new Set(); // Places user has already arrived at
  private config: ArrivalDetectionConfig;

  constructor(config?: Partial<ArrivalDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if user has arrived at a place
   * Returns arrival event if conditions are met
   */
  checkArrival(
    placeId: string,
    placeName: string,
    placeCoordinates: { latitude: number; longitude: number },
    placeTypes: string[] | undefined,
    userCoordinates: { latitude: number; longitude: number },
    timestamp: Date = new Date()
  ): PlaceArrival | null {
    // Skip if user has already arrived at this place
    if (this.arrivedPlaces.has(placeId)) {
      return null;
    }

    // Calculate distance
    const distance = calculateHaversineDistance(userCoordinates, placeCoordinates);

    // Get adaptive radius for this place type
    const radius = getAdaptiveRadius(placeTypes);

    const isWithinRadius = distance <= radius;

    // Get or create proximity state
    let state = this.proximityStates.get(placeId);

    if (!state) {
      state = {
        placeId,
        enteredAt: null,
        lastDistance: distance,
        consecutiveReadings: 0,
      };
      this.proximityStates.set(placeId, state);
    }

    // Update state based on proximity
    if (isWithinRadius) {
      // User is within radius
      if (!state.enteredAt) {
        // First time entering radius
        state.enteredAt = timestamp;
        state.consecutiveReadings = 1;
        console.log(
          `🎯 ArrivalDetection: User entered radius for ${placeName} (${distance.toFixed(0)}m/${radius}m)`
        );
      } else {
        // Still within radius
        state.consecutiveReadings++;
      }

      state.lastDistance = distance;

      // Check if dwelling time and consecutive readings thresholds are met
      const dwellingTime = state.enteredAt
        ? (timestamp.getTime() - state.enteredAt.getTime()) / 1000
        : 0;

      if (
        dwellingTime >= this.config.dwellingTimeThresholdSeconds &&
        state.consecutiveReadings >= this.config.consecutiveReadingsRequired
      ) {
        // ARRIVAL CONFIRMED!
        console.log(
          `✅ ArrivalDetection: ARRIVAL CONFIRMED for ${placeName}\n` +
            `   Distance: ${distance.toFixed(0)}m (radius: ${radius}m)\n` +
            `   Dwelling time: ${dwellingTime.toFixed(0)}s\n` +
            `   Consecutive readings: ${state.consecutiveReadings}`
        );

        // Mark as arrived
        this.arrivedPlaces.add(placeId);

        return {
          placeId,
          placeName,
          distance,
          enteredAt: state.enteredAt,
          isWithinRadius: true,
          dwellingTimeSeconds: dwellingTime,
        };
      }

      // Still building up to arrival
      return null;
    } else {
      // User is outside radius
      const exitThreshold = radius * this.config.exitDistanceMultiplier;

      if (state.enteredAt && distance > exitThreshold) {
        // User has left the area, reset state
        console.log(
          `🚪 ArrivalDetection: User exited radius for ${placeName} (${distance.toFixed(0)}m > ${exitThreshold.toFixed(0)}m)`
        );
        state.enteredAt = null;
        state.consecutiveReadings = 0;
      }

      state.lastDistance = distance;
      return null;
    }
  }

  /**
   * Confirm user visit - marks place as permanently visited
   */
  confirmVisit(placeId: string): void {
    this.arrivedPlaces.add(placeId);
    this.proximityStates.delete(placeId);
    console.log(`✅ ArrivalDetection: Visit confirmed for ${placeId}`);
  }

  /**
   * Skip visit - user didn't actually visit but was nearby
   */
  skipVisit(placeId: string): void {
    this.proximityStates.delete(placeId);
    // Don't add to arrivedPlaces so user can still get notification later
    console.log(`⏭️ ArrivalDetection: Visit skipped for ${placeId}`);
  }

  /**
   * Reset arrival state for a place (useful if user visits again)
   */
  resetPlace(placeId: string): void {
    this.proximityStates.delete(placeId);
    this.arrivedPlaces.delete(placeId);
    console.log(`🔄 ArrivalDetection: Reset place ${placeId}`);
  }

  /**
   * Reset all arrival states
   */
  resetAll(): void {
    this.proximityStates.clear();
    this.arrivedPlaces.clear();
    console.log('🔄 ArrivalDetection: Reset all states');
  }

  /**
   * Get current proximity state for a place (for debugging)
   */
  getProximityState(placeId: string): PlaceProximityState | undefined {
    return this.proximityStates.get(placeId);
  }

  /**
   * Check if user has already arrived at a place
   */
  hasArrived(placeId: string): boolean {
    return this.arrivedPlaces.has(placeId);
  }

  /**
   * Get all places user has arrived at
   */
  getArrivedPlaces(): string[] {
    return Array.from(this.arrivedPlaces);
  }
}

// Singleton instance
export const arrivalDetectionService = new ArrivalDetectionService();
